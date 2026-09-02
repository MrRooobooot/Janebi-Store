/**
 * Product image upload — admin-only.
 * POST /api/admin/upload/product-image (multipart field "image", JPEG/PNG/WebP ≤ 5MB)
 * Stores under public/images/products/<nanoid>.<ext>, returns { url }.
 * The store serves public/ statically, so /images/products/... is immediately live.
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'images', 'products');
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req: unknown, file: { mimetype: string }, cb: (error: Error | null, accept?: boolean) => void) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    cb(new Error('فرمت عکس مجاز نیست — فقط JPEG/PNG/WebP'));
  },
});

router.use(authenticate, requireAdmin);

router.post('/product-image', upload.single('image'), ((req: any, res) => {
  if (!req.file) return res.status(400).json({ message: 'فایلی ارسال نشد' });
  // Defense-in-depth: verify magic bytes, not just mimetype
  const buf = req.file.buffer;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const isWebp = buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP';
  if (!isJpeg && !isPng && !isWebp) {
    return res.status(400).json({ message: 'محتوای فایل معتبر نیست' });
  }
  const ext = isJpeg ? 'jpg' : isPng ? 'png' : 'webp';
  const name = `p-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  res.status(201).json({ url: `/images/products/${name}` });
}) as import('express').RequestHandler);

export default router;
