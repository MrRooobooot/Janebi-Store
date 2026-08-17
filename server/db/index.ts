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

export const isPostgres = env.NODE_ENV === 'test'
  ? (process.env.TEST_DIALECT === 'postgres' && (env.DATABASE_URL.startsWith('postgres://') || env.DATABASE_URL.startsWith('postgresql://')))
  : (env.DATABASE_URL.startsWith('postgres://') || env.DATABASE_URL.startsWith('postgresql://'));

let dbInstance: any;
let poolInstance: pkg.Pool | null = null;
let sqliteInstance: Database.Database | null = null;

if (isPostgres) {
  poolInstance = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  dbInstance = drizzlePg(poolInstance, { schema: pgSchema });
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

  // Auto-apply sqlite migrations on init
  try {
    const sqliteMigrationDir = path.resolve(process.cwd(), 'drizzle/sqlite');
    if (fs.existsSync(sqliteMigrationDir)) {
      const files = fs.readdirSync(sqliteMigrationDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of files) {
        const sqlContent = fs.readFileSync(path.join(sqliteMigrationDir, file), 'utf-8');
        const statements = sqlContent.split('--> statement-breakpoint');
        for (const statement of statements) {
          const trimmed = statement.trim();
          if (trimmed) {
            try {
              sqliteInstance.exec(trimmed);
            } catch (err: any) {
              if (!err.message?.includes('already exists') && !err.message?.includes('duplicate column')) {
                // ignore already exists errors
              }
            }
          }
        }
      }
    }
  } catch (migErr) {
    // ignore migration discovery errors
  }

  const rawSqliteDb = drizzleSqlite(sqliteInstance, { schema: sqliteSchema });

  let txDepth = 0;
  function createTransaction(callback: (tx: any) => any) {
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
        return createTransaction;
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}

export const pool = poolInstance;
export const sqlite = sqliteInstance;
export const db: BetterSQLite3Database<typeof sqliteSchema> = dbInstance;

export async function closeDb(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
  }
  if (sqliteInstance) {
    sqliteInstance.close();
  }
}

