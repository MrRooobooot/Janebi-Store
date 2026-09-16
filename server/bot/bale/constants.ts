import path from 'path';

/**
 * Bale API root + product upload dir (shared by bot modules).
 * Split out of server/bot/bale.ts (body moved verbatim).
 */

export const BALE_API_ROOT = 'https://tapi.bale.ai';
export const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'images', 'products');
