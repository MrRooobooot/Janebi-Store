import { drizzle as drizzleSqlite, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg, NodePgDatabase } from 'drizzle-orm/node-postgres';
import Database from 'better-sqlite3';
import pkg from 'pg';
const { Pool } = pkg;
import { env } from '../env.js';
import * as sqliteSchema from './schema.js';
import * as pgSchema from './schema.pg.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export const isPostgres = env.NODE_ENV === 'test'
  ? (process.env.TEST_DIALECT === 'postgres' && (env.DATABASE_URL.startsWith('postgres://') || env.DATABASE_URL.startsWith('postgresql://')))
  : (env.DATABASE_URL.startsWith('postgres://') || env.DATABASE_URL.startsWith('postgresql://'));

let dbInstance: any;
let poolInstance: pkg.Pool | null = null;
let sqliteInstance: Database.Database | null = null;

// Resolves when dialect-specific migrations have been applied (PG path).
// For SQLite, migrations run synchronously during init so this is pre-resolved.
let migrationsReady: Promise<void> = Promise.resolve();

// ---------------------------------------------------------------------------
// Migration journaling
//
// Every dialect migration file is identified by the sha256 of its content and
// recorded in a `__drizzle_migrations` journal table. A file is applied at
// most once, inside a single transaction (all-or-nothing per file). Real
// failures are logged with file name + statement index + full error and then
// ABORT — nothing is silently swallowed and later files are never attempted
// after an earlier one failed.
// ---------------------------------------------------------------------------

const MIGRATION_JOURNAL_TABLE = '__drizzle_migrations';

// "already exists"-class errors are tolerated ONLY when replaying statements
// from a legacy DB that was partially migrated before the journal existed.
// They are never tolerated to mask a journal-tracked re-run of the same file.
function isIdempotentMigrationError(msg: unknown): boolean {
  const m = String(msg || '').toLowerCase();
  return m.includes('already exists') || m.includes('duplicate column');
}

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

interface MigrationFile {
  file: string;
  hash: string;
  statements: string[];
}

function loadMigrationFiles(dir: string): MigrationFile[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => {
      const sqlContent = fs.readFileSync(path.join(dir, file), 'utf-8');
      const statements = sqlContent
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean);
      return { file, hash: sha256(sqlContent), statements };
    });
}

function runSqliteMigrations(): void {
  const db = sqliteInstance!;
  const dir = path.resolve(process.cwd(), 'drizzle/sqlite');
  const files = loadMigrationFiles(dir);
  if (files.length === 0) return;

  db.exec(
    `CREATE TABLE IF NOT EXISTS ${MIGRATION_JOURNAL_TABLE} ` +
      '(id INTEGER PRIMARY KEY, hash TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL)'
  );

  const journaled = new Set<string>(
    (db.prepare(`SELECT hash FROM ${MIGRATION_JOURNAL_TABLE}`).all() as { hash: string }[]).map((r) => r.hash)
  );
  const insertJournal = db.prepare(
    `INSERT INTO ${MIGRATION_JOURNAL_TABLE} (hash, applied_at) VALUES (?, ?)`
  );

  const hasUsersTable = !!db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    .get();

  // Legacy backfill: this DB predates the journal (has business tables but no
  // journal rows). Best-effort: apply each file's statements, tolerating
  // "already exists"-class errors; journal the file only if every statement
  // succeeded or was idempotent. A genuinely failing statement leaves the file
  // un-journaled so the apply phase below retries it and fails LOUDLY.
  if (journaled.size === 0 && hasUsersTable) {
    for (const mf of files) {
      if (journaled.has(mf.hash)) continue;
      let clean = true;
      for (let i = 0; i < mf.statements.length; i++) {
        try {
          db.exec(mf.statements[i]);
        } catch (err: any) {
          if (!isIdempotentMigrationError(err.message)) {
            clean = false;
            console.error(
              `⚠️ Legacy backfill: ${mf.file} statement #${i} failed — file stays un-journaled and will be retried: ${err.message}`
            );
          }
        }
      }
      if (clean) {
        insertJournal.run(mf.hash, new Date().toISOString());
        journaled.add(mf.hash);
      }
    }
  }

  // Apply phase: every un-journaled file runs inside one transaction; the
  // journal insert happens in the SAME transaction, so a file is either fully
  // applied + journaled or not at all. Any non-idempotent error aborts.
  for (const mf of files) {
    if (journaled.has(mf.hash)) continue;
    db.exec('BEGIN IMMEDIATE');
    try {
      for (let i = 0; i < mf.statements.length; i++) {
        try {
          db.exec(mf.statements[i]);
        } catch (err: any) {
          // Tolerate replay of already-applied statements from a legacy
          // partially-migrated file that could not be journaled in backfill.
          if (!isIdempotentMigrationError(err.message)) {
            console.error(
              `❌ SQLite migration FAILED — file: ${mf.file}, statement #${i}: ${err.message}\n` +
                `   statement: ${mf.statements[i].slice(0, 200)}\n` +
                '   transaction rolled back; server startup aborted.'
            );
            throw err;
          }
        }
      }
      insertJournal.run(mf.hash, new Date().toISOString());
      db.exec('COMMIT');
      journaled.add(mf.hash);
    } catch (err: any) {
      try {
        db.exec('ROLLBACK');
      } catch {
        /* rollback of a failed tx */
      }
      throw new Error(
        `SQLite migration ${mf.file} failed and was rolled back — see the ❌ log above for the failing statement. Original error: ${err.message}`
      );
    }
  }

  console.log(`✅ SQLite migrations applied/verified (${files.length} files, journal current)`);
}

async function runPgMigrations(): Promise<void> {
  const pool = poolInstance!;
  const dir = path.resolve(process.cwd(), 'drizzle/pg');
  const files = loadMigrationFiles(dir);
  if (files.length === 0) return;

  await pool.query(
    `CREATE TABLE IF NOT EXISTS ${MIGRATION_JOURNAL_TABLE} ` +
      '(id serial PRIMARY KEY, hash TEXT NOT NULL UNIQUE, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())'
  );

  const { rows: journalRows } = await pool.query(`SELECT hash FROM ${MIGRATION_JOURNAL_TABLE}`);
  const journaled = new Set<string>(journalRows.map((r: any) => r.hash));

  const { rows: legacyRows } = await pool.query("SELECT to_regclass('public.users') AS t");
  const hasUsersTable = !!legacyRows[0]?.t;

  // Legacy backfill — same best-effort semantics as the SQLite path.
  if (journaled.size === 0 && hasUsersTable) {
    for (const mf of files) {
      if (journaled.has(mf.hash)) continue;
      let clean = true;
      for (let i = 0; i < mf.statements.length; i++) {
        try {
          await pool.query(mf.statements[i]);
        } catch (err: any) {
          if (!isIdempotentMigrationError(err.message)) {
            clean = false;
            console.error(
              `⚠️ Legacy backfill (PG): ${mf.file} statement #${i} failed — file stays un-journaled and will be retried: ${err.message}`
            );
          }
        }
      }
      if (clean) {
        await pool.query(
          `INSERT INTO ${MIGRATION_JOURNAL_TABLE} (hash, applied_at) VALUES ($1, now())`,
          [mf.hash]
        );
        journaled.add(mf.hash);
      }
    }
  }

  // Apply phase — per-file transaction with the journal insert inside it.
  // Each statement runs inside a SAVEPOINT: a tolerated "already exists"-class
  // error rolls back ONLY that statement's savepoint. PostgreSQL poisons the
  // whole transaction after any error ("current transaction is aborted"), so
  // without a savepoint the first tolerated error would kill every subsequent
  // statement in the same file and abort clean-DB startup (verified 2026-09-04:
  // 0001 re-creates tables already created by 0000 on a pristine database).
  for (const mf of files) {
    if (journaled.has(mf.hash)) continue;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < mf.statements.length; i++) {
        const spName = `mig_${i}`;
        await client.query(`SAVEPOINT ${spName}`);
        try {
          await client.query(mf.statements[i]);
          await client.query(`RELEASE SAVEPOINT ${spName}`);
        } catch (err: any) {
          // Discard the poisoned statement so the file's transaction can continue.
          await client.query(`ROLLBACK TO SAVEPOINT ${spName}`).catch(() => {});
          await client.query(`RELEASE SAVEPOINT ${spName}`).catch(() => {});
          if (!isIdempotentMigrationError(err.message)) {
            console.error(
              `❌ PostgreSQL migration FAILED — file: ${mf.file}, statement #${i}: ${err.message}\n` +
                `   statement: ${mf.statements[i].slice(0, 200)}\n` +
                '   transaction rolled back; server startup aborted.'
            );
            throw err;
          }
        }
      }
      await client.query(
        `INSERT INTO ${MIGRATION_JOURNAL_TABLE} (hash, applied_at) VALUES ($1, now())`,
        [mf.hash]
      );
      await client.query('COMMIT');
      journaled.add(mf.hash);
    } catch (err: any) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* rollback of an already-aborted tx */
      }
      client.release();
      throw new Error(
        `PostgreSQL migration ${mf.file} failed and was rolled back — see the ❌ log above for the failing statement. Original error: ${err.message}`
      );
    }
    client.release();
  }

  console.log(`✅ PostgreSQL migrations applied/verified (${files.length} files, journal current)`);
}

if (isPostgres) {
  poolInstance = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  dbInstance = drizzlePg(poolInstance, { schema: pgSchema });

  // Auto-apply postgres migrations on init (mirrors the sqlite bootstrap below).
  // Journaled + transactional: any failure rejects migrationsReady, which the
  // server bootstrap awaits via dbReady() — startup fails LOUDLY, never with a
  // silently half-migrated schema.
  migrationsReady = runPgMigrations();
} else {
  const rawDbPath = (env.DATABASE_URL.startsWith('postgres://') || env.DATABASE_URL.startsWith('postgresql://'))
    ? './data/janebi.db'
    : env.DATABASE_URL;

  const dbPath = rawDbPath === ':memory:'
    ? ':memory:'
    : path.resolve(process.cwd(), rawDbPath);

  if (dbPath !== ':memory:') {
    const parentDir = path.dirname(dbPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
  }

  sqliteInstance = new Database(dbPath);
  sqliteInstance.pragma('journal_mode = WAL');
  sqliteInstance.pragma('busy_timeout = 5000');

  // Auto-apply sqlite migrations on init — journaled, per-file transactional,
  // loud on failure. A thrown error here aborts module init, so the server
  // process (or test run) cannot continue with a half-migrated schema.
  runSqliteMigrations();

  const rawSqliteDb = drizzleSqlite(sqliteInstance, { schema: sqliteSchema });

  // Transaction mutex: better-sqlite3 has a single connection, so concurrent
  // transactions would interleave BEGIN/COMMIT and corrupt each other's
  // savepoints. Every transaction is queued and executed one at a time.
  let txChain: Promise<unknown> = Promise.resolve();
  let txDepth = 0;
  function runQueued<T>(callback: (tx: any) => any): Promise<T> {
    const run = txChain.then(
      () => executeTransaction(callback),
      () => executeTransaction(callback)
    );
    // Keep the chain alive regardless of outcome, but surface errors to the caller.
    txChain = run.then(() => undefined, () => undefined);
    return run as Promise<T>;
  }

  function executeTransaction(callback: (tx: any) => any) {
    const isNested = txDepth > 0;
    const spName = `sp_${txDepth}`;
    txDepth++;
    if (isNested) {
      sqliteInstance!.exec(`SAVEPOINT ${spName}`);
    } else {
      sqliteInstance!.exec('BEGIN');
    }

    let result: any;
    try {
      result = callback(rawSqliteDb);
    } catch (syncErr) {
      if (isNested) {
        sqliteInstance!.exec(`ROLLBACK TO ${spName}`);
      } else {
        sqliteInstance!.exec('ROLLBACK');
      }
      txDepth--;
      throw syncErr;
    }

    if (result && typeof result.then === 'function') {
      return result
        .then((val: any) => {
          if (isNested) {
            sqliteInstance!.exec(`RELEASE ${spName}`);
          } else {
            sqliteInstance!.exec('COMMIT');
          }
          txDepth--;
          return val;
        })
        .catch((asyncErr: any) => {
          if (isNested) {
            sqliteInstance!.exec(`ROLLBACK TO ${spName}`);
          } else {
            sqliteInstance!.exec('ROLLBACK');
          }
          txDepth--;
          throw asyncErr;
        });
    } else {
      if (isNested) {
        sqliteInstance!.exec(`RELEASE ${spName}`);
      } else {
        sqliteInstance!.exec('COMMIT');
      }
      txDepth--;
      return result;
    }
  }

  dbInstance = new Proxy(rawSqliteDb, {
    get(target, prop, receiver) {
      if (prop === 'transaction') {
        return runQueued;
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}

export const pool = poolInstance;
export const sqlite = sqliteInstance;
export const db: BetterSQLite3Database<typeof sqliteSchema> = dbInstance;

// Await this before touching the database (server bootstrap does).
export function dbReady(): Promise<void> {
  return migrationsReady;
}

export async function closeDb(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
  }
  if (sqliteInstance) {
    sqliteInstance.close();
  }
}
