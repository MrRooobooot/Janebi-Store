/**
 * Admin sub-router — Consistent SQLite backup download (VACUUM INTO).
 * Mounted by server/routes/admin.ts after the router-wide authenticate+requireAdmin guard.
 */
import { Router } from 'express';
import { db, isPostgres } from '../../db/index.js';

const router = Router();

// ---------------------------------------------------------
// DATABASE BACKUP DOWNLOAD — consistent snapshot via VACUUM INTO
// (raw file streaming under active WAL can produce torn backups)
// ---------------------------------------------------------
router.get('/backup', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const dbPath = path.resolve(process.cwd(), 'data', 'janebi.db');

    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'فایل پایگاه داده یافت نشد' });
    }

    if (isPostgres) {
      return res.status(400).json({ error: 'بک‌آپ VACUUM فقط برای دیتابیس SQLite پشتیبانی می‌شود' });
    }

    // VACUUM INTO writes a compact, fully-consistent snapshot even while
    // WAL readers/writers are active. A temp file avoids holding the
    // connection open for the whole HTTP stream.
    const { sqlite } = await import('../../db/index.js');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tmpPath = path.join(os.tmpdir(), `janebi-backup-${timestamp}.db`);

    try {
      sqlite!.prepare(`VACUUM INTO ?`).run(tmpPath);

      res.setHeader('Content-Disposition', `attachment; filename="janebi-backup-${timestamp}.db"`);
      res.setHeader('Content-Type', 'application/x-sqlite3');

      const filestream = fs.createReadStream(tmpPath);
      filestream.on('close', () => fs.unlink(tmpPath, () => {}));
      filestream.on('error', () => fs.unlink(tmpPath, () => {}));
      filestream.pipe(res);
    } catch (vacuumErr) {
      try { fs.unlinkSync(tmpPath); } catch { /* already gone */ }
      throw vacuumErr;
    }
  } catch (error) {
    console.error('Backup download error:', error);
    res.status(500).json({ message: 'خطا در ایجاد خروجی بک‌آپ' });
  }
});

export default router;
