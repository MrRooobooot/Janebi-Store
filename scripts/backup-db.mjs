#!/usr/bin/env node
// Timestamped, consistent SQLite backup via `VACUUM INTO` (safe under WAL).
// Keeps the last 7 backups in ./backups/ (gitignored) or $BACKUP_DIR.
// Exits non-zero on any failure. Usage: npm run db:backup
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";

const KEEP = 7;

const dbPath = resolve(process.env.DATABASE_URL || "./data/janebi.db");
if (!existsSync(dbPath)) {
  console.error(`[db:backup] Database not found: ${dbPath}`);
  process.exit(1);
}

const backupDir = resolve(process.env.BACKUP_DIR || "./backups");
mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = join(backupDir, `janebi-${stamp}.db`);

try {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    // VACUUM INTO produces a fully compacted, transaction-consistent copy.
    db.prepare(`VACUUM INTO ?`).run(target);
  } finally {
    db.close();
  }
} catch (err) {
  console.error(`[db:backup] Backup failed:`, err.message);
  try { if (existsSync(target)) unlinkSync(target); } catch { /* ignore */ }
  process.exit(1);
}

const size = statSync(target).size;
console.log(`[db:backup] OK: ${target} (${(size / 1024).toFixed(1)} KiB)`);

// Prune old backups, keep the newest KEEP files.
const backups = readdirSync(backupDir)
  .filter((f) => /^janebi-.*\.db$/.test(f))
  .sort()
  .reverse();
for (const old of backups.slice(KEEP)) {
  try {
    unlinkSync(join(backupDir, old));
    console.log(`[db:backup] Pruned old backup: ${old}`);
  } catch (err) {
    console.warn(`[db:backup] Could not prune ${old}: ${err.message}`);
  }
}
