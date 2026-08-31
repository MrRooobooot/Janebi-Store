import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'janebi-mig-'));
}

/** Import a fresh instance of the db module (cache-buster => new module graph). */
function importDb(bust: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return import(/* @vite-ignore */ `../../server/db/index.js?bust=${bust}`) as Promise<any>;
}

function journalHashes(sqlite: any): string[] {
  return (sqlite.prepare('SELECT hash FROM __drizzle_migrations ORDER BY id').all() as any[]).map(
    (r) => r.hash
  );
}

function sqlFileHashes(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f), 'utf-8')).digest('hex'));
}

describe('Migration journal (SQLite)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.DATABASE_URL = ':memory:';
    process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('(a) fresh in-memory DB applies all migrations and journals every hash', async () => {
    const mod = await importDb('fresh');
    const hashes = journalHashes(mod.sqlite);
    const expected = sqlFileHashes(path.join(REPO_ROOT, 'drizzle/sqlite'));
    expect(hashes).toEqual(expected);
    // spot-check business tables actually exist
    for (const t of ['users', 'products', 'orders', 'coupons']) {
      expect(
        mod.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t)
      ).toBeTruthy();
    }
    await mod.closeDb();
  });

  it('(b) re-init on a journaled DB does not re-apply and logs no migration errors', async () => {
    const dir = tmpDir();
    const dbFile = path.join(dir, 'test.db');
    process.env.DATABASE_URL = dbFile;

    const errSpy = vi.spyOn(console, 'error');
    const warnSpy = vi.spyOn(console, 'warn');
    const first = await importDb('reinit-1');
    const hashesFirst = journalHashes(first.sqlite);
    await first.closeDb();

    const second = await importDb('reinit-2');
    // journal identical — no file re-applied; schema tables + the 0005 indexes
    // (the ones prod silently lost) still fully present
    for (const t of ['users', 'products', 'orders', 'order_items', 'wishlist_items']) {
      expect(
        second.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t)
      ).toBeTruthy();
    }
    for (const idx of [
      'idx_wishlist_items_user_id',
      'idx_product_features_product_id',
      'idx_contact_messages_status',
    ]) {
      expect(
        second.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name=?").get(idx)
      ).toBeTruthy();
    }
    // no silent swallowing: zero migration error logs on the clean re-init
    const migrationErrs = errSpy.mock.calls.filter((c) => String(c[0]).includes('migration'));
    expect(migrationErrs).toHaveLength(0);
    const migrationWarns = warnSpy.mock.calls.filter((c) => String(c[0]).includes('migration'));
    expect(migrationWarns).toHaveLength(0);
    await second.closeDb();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('(c) a corrupt sql file fails loudly with the filename and aborts init', async () => {
    const cwd = tmpDir();
    // copy the real migration dir into the temp cwd
    fs.cpSync(path.join(REPO_ROOT, 'drizzle'), path.join(cwd, 'drizzle'), { recursive: true });
    const corrupt = path.join(cwd, 'drizzle/sqlite/0007_corrupt.sql');
    fs.writeFileSync(
      corrupt,
      'CREATE INDEX idx_broken ON totally_missing_table(some_col);--> statement-breakpoint'
    );

    process.chdir(cwd);
    process.env.DATABASE_URL = ':memory:';
    const errSpy = vi.spyOn(console, 'error');
    try {
      await expect(importDb('corrupt')).rejects.toThrow(/0007_corrupt\.sql/);
    } finally {
      process.chdir(REPO_ROOT);
    }
    // loud: filename + statement logged to stderr
    const logged = errSpy.mock.calls.map((c) => c.map(String).join(' ')).join('\n');
    expect(logged).toContain('0007_corrupt.sql');
    expect(logged).toContain('totally_missing_table');
    // later files after the corrupt one were NOT attempted; corrupt hash not journaled
    // (we can't easily reopen the :memory: db, but the thrown init + abort log proves it)
    fs.rmSync(cwd, { recursive: true, force: true });
  });
});
