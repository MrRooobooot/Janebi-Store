import { drizzle as drizzleSqlite, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { env } from '../env.js';
import * as sqliteSchema from './schema.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// SQLite is the only supported database. A PostgreSQL URL is a configuration
// error, not something to silently reinterpret as a file path.
if (env.DATABASE_URL.startsWith('postgres://') || env.DATABASE_URL.startsWith('postgresql://')) {
  throw new Error('DATABASE_URL points to PostgreSQL, which is no longer supported. Use the SQLite file path (e.g. ./data/janebi.db).');
}

let dbInstance: any;
let sqliteInstance: Database.Database | null = null;

// ---------------------------------------------------------------------------
// Migration journaling
//
// Every migration file is identified by the sha256 of its content and
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

const dbPath = env.DATABASE_URL === ':memory:'
  ? ':memory:'
  : path.resolve(process.cwd(), env.DATABASE_URL);

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

export const sqlite = sqliteInstance;
export const db: BetterSQLite3Database<typeof sqliteSchema> = dbInstance;

// FTS5 feature detection. The products search route falls back to
// LIKE when FTS5 is unavailable (e.g. a better-sqlite3 build compiled without FTS5).
export const fts5Available: boolean = (() => {
  if (!sqliteInstance) return false;
  try {
    sqliteInstance.exec("SELECT 1 FROM products_fts LIMIT 1");
    return true;
  } catch {
    return false;
  }
})();

// Migrations run synchronously during module init, so the database is ready
// as soon as this module has loaded. Kept so the server bootstrap can await it.
export function dbReady(): Promise<void> {
  return Promise.resolve();
}

export async function closeDb(): Promise<void> {
  if (sqliteInstance) {
    sqliteInstance.close();
  }
}
