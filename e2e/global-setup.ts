import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

/**
 * Runs ONCE before all workers (config file is loaded per-worker — preparing
 * the DB there races and hits UNIQUE constraint on users.phone).
 */
const ROOT = process.cwd();
const SRC_DB = path.join(ROOT, 'data/janebi.db');
const E2E_DB = path.join(ROOT, 'data/janebi.e2e.db');
export const ADMIN_PHONE = '09390000001';
export const ADMIN_PASS = 'E2eAdmin@123';

export default async function globalSetup() {
  if (!fs.existsSync(SRC_DB)) throw new Error(`source DB missing: ${SRC_DB}`);
  for (const f of [E2E_DB, E2E_DB + '-wal', E2E_DB + '-shm']) if (fs.existsSync(f)) fs.unlinkSync(f);
  const require = createRequire(import.meta.url);
  const Database = require('better-sqlite3');
  const bcrypt = require('bcrypt');
  // WAL-safe snapshot copy (plain file copy can miss -wal contents)
  const src = new Database(SRC_DB, { readonly: true });
  src.exec(`VACUUM INTO '${E2E_DB.replace(/'/g, "''")}'`);
  src.close();
  const db = new Database(E2E_DB);
  const hash = bcrypt.hashSync(ADMIN_PASS, 10);
  const id = 'usr-e2e-admin-' + Date.now();
  db.prepare(
    'INSERT OR REPLACE INTO users (id, name, phone, password, role, vip_points, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, 'ادمین تست E2E', ADMIN_PHONE, hash, 'admin', 0, 0);
  db.close();
}
