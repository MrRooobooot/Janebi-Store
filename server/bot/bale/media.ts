/**
 * Download a photo from Bale into public/images/products.
 * Split out of server/bot/bale.ts (body moved verbatim).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  products,
  productFeatures,
  orders,
  orderItems,
  cartItems,
  wishlistItems,
  reviews,
  coupons,
  contactMessages,
  storeSettings,
  users,
  auditLogs,
  newsletterSubscribers,
} from '../../db/schema.js';
import { BALE_API_ROOT, UPLOAD_DIR } from './constants.js';

export async function downloadAndSaveBalePhoto(token: string, filePath: string): Promise<string> {
  const url = `${BALE_API_ROOT}/file/bot${token}/${filePath}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`دریافت عکس از بله ناموفق بود (کد ${res.status})`);
  }
  const arrayBuf = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuf);

  if (buf.length > 10 * 1024 * 1024) {
    throw new Error('حجم تصویر بیشتر از ۱۰ مگابایت است');
  }

  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const isWebp = buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP';

  if (!isJpeg && !isPng && !isWebp) {
    throw new Error('فرمت عکس مجاز نیست — فقط JPG، PNG یا WebP');
  }

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const ext = isJpeg ? 'jpg' : isPng ? 'png' : 'webp';
  const name = `bale-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return `/images/products/${name}`;
}

// -------------------------------------------------------------
// Categories
