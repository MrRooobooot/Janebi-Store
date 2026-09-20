// Prepare the isolated E2E database BEFORE the dev server starts.
//
// Why this is not in globalSetup: Playwright launches webServer first, then runs
// globalSetup. Doing unlink + VACUUM INTO there pulled the DB file out from under
// the already-running server, which kept its open handle on the orphaned inode —
// rows specs inserted directly (gated-admin seeding) were invisible to the server
// (login 401) and rows the server committed never appeared on disk afterwards.
// Running the snapshot as part of the webServer command fixes the ordering.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const ROOT = process.cwd();
const SRC_DB = path.join(ROOT, 'data/janebi.db');
const E2E_DB = path.join(ROOT, 'data/janebi.e2e.db');
const ADMIN_PHONE = '09390000001';
const ADMIN_PASS = 'E2eAdmin@123';

if (!fs.existsSync(SRC_DB)) throw new Error(`source DB missing: ${SRC_DB}`);
for (const f of [E2E_DB, E2E_DB + '-wal', E2E_DB + '-shm']) if (fs.existsSync(f)) fs.unlinkSync(f);

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

// WAL-safe snapshot copy (a plain file copy can miss -wal contents)
const src = new Database(SRC_DB, { readonly: true });
src.exec(`VACUUM INTO '${E2E_DB.replace(/'/g, "''")}'`);
src.close();

const db = new Database(E2E_DB);
db.prepare(
  'INSERT OR REPLACE INTO users (id, name, phone, password, role, vip_points, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?)',
).run('usr-e2e-admin-' + Date.now(), 'ادمین تست E2E', ADMIN_PHONE, bcrypt.hashSync(ADMIN_PASS, 10), 'admin', 0, 0);
db.close();

console.log(`[e2e] prepared ${E2E_DB} (admin ${ADMIN_PHONE})`);
