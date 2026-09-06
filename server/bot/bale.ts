/**
 * Bale (بله) Bot — Full-featured Store & Website Management Cockpit
 * Bale Bot API is Telegram-compatible at https://tapi.bale.ai (Grammy framework).
 *
 * Capabilities:
 * 📱 100% Inline Keyboards (دکمه‌های شیشه‌ای) across all sections
 * 📦 Products & Inventory:
 *    - Interactive multi-step creation wizard (category picker, direct photo download from Bale, skip buttons)
 *    - Fast stock +/- adjustments (+1, +5, -1)
 *    - Price & discount percentage editing
 *    - Category browsing & real-time search by title/SKU
 *    - Low stock inventory refill alerts
 * 🛍 Orders Management:
 *    - Paginated order history with buyer details, address, payment method, items list
 *    - One-tap status updates (processing, shipped, delivered, cancelled)
 *    - Financial integrity: transactional restock & VIP points refund on cancellation
 * 🏷 Coupons & Marketing:
 *    - List active/inactive discount codes
 *    - One-tap active/deactivate toggle and coupon deletion
 *    - Quick coupon creation wizard (code, percent/amount, min order)
 * 💬 Reviews & Contact Messages:
 *    - Moderation of product reviews: approve (recomputes product rating + cache invalidation), reject, delete
 *    - Contact form submissions: view details, mark as read, archive
 * 👥 Customers & VIP:
 *    - Customer lookup by phone number
 *    - View order history & give loyalty VIP bonus points
 * ⚙️ Website Settings:
 *    - Announcement bar toggle (ON/OFF) & text edit
 *    - Free shipping threshold adjustment
 * 📊 Live Store Analytics:
 *    - Revenue, total inventory, out-of-stock count, pending orders
 */

import { Bot, GrammyError, InlineKeyboard, type Context } from 'grammy';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { eq, desc, sql, and, like } from 'drizzle-orm';
import { db } from '../db/index.js';
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
} from '../db/schema.js';
import { appCache } from '../utils/cache.js';
import { restockItemsAndRefundPoints } from '../lib/orderLifecycle.js';

export const BALE_API_ROOT = 'https://tapi.bale.ai';
const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'images', 'products');

export interface BaleBotConfig {
  token: string;
  adminChatIds: number[];
}

export interface WizardDraft {
  step:
    | 'title'
    | 'category'
    | 'price'
    | 'stock'
    | 'brand'
    | 'warranty'
    | 'description'
    | 'photo'
    | 'confirm';
  title?: string;
  category?: string;
  price?: number;
  stock?: number;
  brand?: string;
  warranty?: string;
  description?: string;
  photoUrl?: string;
  catPage: number;
}

export interface CouponDraft {
  step: 'code' | 'percent' | 'minTotal' | 'confirm';
  code?: string;
  percent?: number;
  minTotal?: number;
}

export interface UserSession {
  mode:
    | 'idle'
    | 'wizard'
    | 'edit_price'
    | 'edit_discount'
    | 'search'
    | 'search_user'
    | 'coupon_wizard'
    | 'edit_announcement'
    | 'edit_free_shipping';
  wizard?: WizardDraft;
  couponWizard?: CouponDraft;
  editingProductId?: number;
  lastActive: number;
}

export const sessions = new Map<number, UserSession>();

// Cleanup stale sessions older than 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.lastActive > 30 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 10 * 60 * 1000);

export function getSession(userId: number): UserSession {
  let s = sessions.get(userId);
  if (!s) {
    s = { mode: 'idle', lastActive: Date.now() };
    sessions.set(userId, s);
  }
  s.lastActive = Date.now();
  return s;
}

export function clearSession(userId: number): void {
  sessions.delete(userId);
}

// -------------------------------------------------------------
// Helpers & Persian Utilities
// -------------------------------------------------------------
export const fmt = (n: number) => n.toLocaleString('fa-IR');

export function fa2en(s: string): string {
  return s
    .replace(/[۰-۹]/g, (ch) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch)))
    .replace(/[٠-٩]/g, (ch) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(ch)));
}

export function parsePrice(text: string): number {
  const clean = fa2en(text).replace(/[^\d]/g, '');
  return parseInt(clean, 10);
}

export function isAdmin(ctx: Context, cfg: BaleBotConfig): boolean {
  const id = ctx.from?.id;
  return !!id && cfg.adminChatIds.includes(id);
}

function logAudit(action: string, adminUserId: string, entityId: string, meta: Record<string, unknown> = {}): void {
  db.insert(auditLogs).values({
    id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    adminUserId,
    action,
    entity: 'store',
    entityId,
    meta,
    createdAt: new Date().toISOString(),
  }).catch((err) => console.error('[bale-bot] Audit log write failed:', err));
}

// -------------------------------------------------------------
// Image Storage from Bale CDN
// -------------------------------------------------------------
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
// -------------------------------------------------------------
export const DEFAULT_CATEGORIES = [
  'قاب و کاور موبایل',
  'گلس و محافظ صفحه',
  'کابل و سیم',
  'شارژر و آداپتور',
  'هندزفری و ایرباد',
  'پاوربانک',
  'هولدر و نگهدارنده',
  'هدفون و هدست',
  'تبدیل و مبدل',
  'لوازم جانبی ساعت هوشمند',
  'لوازم گیمینگ موبایل',
  'لوازم جانبی خودرو',
];

export async function getStoreCategories(): Promise<string[]> {
  try {
    const rows = await db.selectDistinct({ category: products.category }).from(products);
    const fromDb = rows.map((r) => r.category).filter(Boolean) as string[];
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...fromDb]));
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

// -------------------------------------------------------------
// Order Status Mapping
// -------------------------------------------------------------
export const ORDER_STATUS_MAP: Record<string, { label: string; text: string; icon: string }> = {
  pending_payment: { label: 'در انتظار پرداخت', text: 'در انتظار پرداخت', icon: '⏳' },
  processing: { label: 'در حال پردازش', text: 'در حال پردازش', icon: '🔄' },
  shipped: { label: 'ارسال شده', text: 'ارسال شده', icon: '🚚' },
  delivered: { label: 'تحویل داده شده', text: 'تحویل داده شده', icon: '✅' },
  cancelled: { label: 'لغو شده', text: 'لغو شده', icon: '❌' },
};

// -------------------------------------------------------------
// Review Rating Recomputation
// -------------------------------------------------------------
async function setReviewApproval(reviewId: string, approved: boolean): Promise<boolean> {
  const review = await db.query.reviews.findFirst({ where: eq(reviews.id, reviewId) });
  if (!review) return false;

  await db.update(reviews).set({ approved }).where(eq(reviews.id, reviewId));

  if (review.productId) {
    const agg = await db
      .select({
        avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(reviews)
      .where(and(eq(reviews.productId, review.productId), eq(reviews.approved, true)));
    const newRating = Math.round(Number(agg[0]?.avg) * 10) / 10;
    await db.update(products)
      .set({ rating: newRating, reviewsCount: Number(agg[0]?.count) || 0 })
      .where(eq(products.id, review.productId));
    appCache.invalidate(`reviews:${review.productId}`);
    appCache.invalidate(`product:${review.productId}`);
    appCache.invalidate('products');
  }
  appCache.invalidate('reviews:latest');
  return true;
}

// -------------------------------------------------------------
// Inline Keyboards
// -------------------------------------------------------------
export function makeMainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📦 مدیریت کالاها', 'm:sec_prod')
    .text('🛍 سفارشات فروشگاه', 'm:sec_ord')
    .row()
    .text('🏷 کدهای تخفیف', 'm:sec_coup')
    .text('💬 نظرات و پیام‌ها', 'm:sec_msg')
    .row()
    .text('👥 مشتریان و VIP', 'm:sec_user')
    .text('⚙️ تنظیمات سایت', 'm:sec_set')
    .row()
    .text('📊 آمار و هشدارهای انبار', 'm:stat')
    .text('❓ راهنما', 'm:help');
}

export function makeProductsSectionKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('➕ ثبت کالای جدید', 'm:new')
    .row()
    .text('📋 لیست تمام کالاها', 'm:p:0')
    .text('🔍 جستجوی کالا', 'm:srch')
    .row()
    .text('📁 انتخاب بر اساس دسته', 'm:cat_pick:0')
    .text('⚠️ کالاهای رو به اتمام', 'm:alert')
    .row()
    .text('🏠 بازگشت به منوی اصلی', 'm:menu');
}

export function makeOrdersSectionKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🛍 همه سفارش‌ها', 'm:o:0')
    .text('⏳ در انتظار پرداخت', 'm:of:pending_payment:0')
    .row()
    .text('🔄 در حال پردازش', 'm:of:processing:0')
    .text('🚚 ارسال شده‌ها', 'm:of:shipped:0')
    .row()
    .text('🏠 بازگشت به منوی اصلی', 'm:menu');
}

export function makeCouponsSectionKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📋 فهرست کوپن‌ها', 'm:cp_list:0')
    .text('➕ ساخت کد تخفیف', 'm:cp_new')
    .row()
    .text('🏠 بازگشت به منوی اصلی', 'm:menu');
}

export function makeMessagesSectionKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('⭐ مدیریت نظرات کاربران', 'm:rv_list:0')
    .row()
    .text('📩 پیام‌های فرم تماس با ما', 'm:cm_list:0')
    .row()
    .text('🏠 بازگشت به منوی اصلی', 'm:menu');
}

export function makeUsersSectionKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🔍 استعلام مشتری با شماره تلفن', 'm:usr_srch')
    .row()
    .text('🏠 بازگشت به منوی اصلی', 'm:menu');
}

export function makeSettingsSectionKeyboard(barEnabled: boolean): InlineKeyboard {
  return new InlineKeyboard()
    .text(barEnabled ? '📢 نوار اعلان: [روشن ✅]' : '📢 نوار اعلان: [خاموش ❌]', 'st:bar_tog')
    .row()
    .text('✏️ تغییر متن نوار اعلان', 'st:bar_txt')
    .row()
    .text('🚚 تنظیم سقف ارسال رایگان', 'st:ship_th')
    .row()
    .text('🏠 بازگشت به منوی اصلی', 'm:menu');
}

export function makeCancelKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('❌ انصراف و بازگشت', 'm:cancel');
}

export function makeCategoriesKeyboard(cats: string[], page: number, prefix: string = 'c:cat:'): InlineKeyboard {
  const pageSize = 6;
  const totalPages = Math.ceil(cats.length / pageSize) || 1;
  const curPage = Math.max(0, Math.min(page, totalPages - 1));
  const slice = cats.slice(curPage * pageSize, (curPage + 1) * pageSize);

  const kb = new InlineKeyboard();
  for (let i = 0; i < slice.length; i += 2) {
    const idx1 = curPage * pageSize + i;
    kb.text(slice[i], `${prefix}${idx1}`);
    if (i + 1 < slice.length) {
      const idx2 = curPage * pageSize + i + 1;
      kb.text(slice[i + 1], `${prefix}${idx2}`);
    }
    kb.row();
  }

  const navPrefix = prefix === 'c:cat:' ? 'c:pg:' : 'cpk:pg:';
  const navRow: { text: string; data: string }[] = [];
  if (curPage > 0) {
    navRow.push({ text: '⬅️ صفحه قبل', data: `${navPrefix}${curPage - 1}` });
  }
  if (curPage < totalPages - 1) {
    navRow.push({ text: 'صفحه بعد ➡️', data: `${navPrefix}${curPage + 1}` });
  }

  if (navRow.length > 0) {
    for (const b of navRow) kb.text(b.text, b.data);
    kb.row();
  }

  kb.text('❌ انصراف', 'm:cancel');
  return kb;
}

export function makeStockQuickKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('۵ عدد', 'w:stk:5')
    .text('۱۰ عدد', 'w:stk:10')
    .text('۲۰ عدد', 'w:stk:20')
    .text('۵۰ عدد', 'w:stk:50')
    .row()
    .text('❌ انصراف', 'm:cancel');
}

export function makeBrandQuickKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('متفرقه', 'w:brd:متفرقه')
    .text('سامسونگ', 'w:brd:سامسونگ')
    .text('اپل', 'w:brd:اپل')
    .row()
    .text('شیائومی', 'w:brd:شیائومی')
    .text('انکر', 'w:brd:انکر')
    .text('باسئوس', 'w:brd:باسئوس')
    .row()
    .text('⏩ رد شدن (متفرقه)', 'w:skip:brand')
    .text('❌ انصراف', 'm:cancel');
}

export function makeWarrantyQuickKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('اصالت و سلامت فیزیکی', 'w:war:اصالت و سلامت فیزیکی')
    .row()
    .text('گارانتی ۱۸ ماهه شرکتی', 'w:war:گارانتی ۱۸ ماهه شرکتی')
    .row()
    .text('بدون گارانتی', 'w:war:بدون گارانتی')
    .text('⏩ رد شدن', 'w:skip:warranty')
    .row()
    .text('❌ انصراف', 'm:cancel');
}

export function makeDescriptionQuickKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('⏩ رد شدن (بدون توضیحات)', 'w:skip:desc')
    .row()
    .text('❌ انصراف', 'm:cancel');
}

export function makePhotoQuickKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📷 تصویر پیش‌فرض (رد شدن)', 'w:skip:photo')
    .row()
    .text('❌ انصراف', 'm:cancel');
}

export function makeConfirmWizardKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ تأیید و انتشار در سایت', 'w:ok')
    .row()
    .text('❌ انصراف', 'm:cancel');
}

export function makeProductDetailKeyboard(productId: number, stock: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('➕ ۱ موجودی', `p:s:${productId}:1`)
    .text('➕ ۵ موجودی', `p:s:${productId}:5`)
    .text('➖ ۱ موجودی', `p:s:${productId}:-1`)
    .row()
    .text('💰 تغییر قیمت', `p:prc:${productId}`)
    .text('🏷 درصد تخفیف', `p:dsc:${productId}`)
    .row()
    .url('🔗 مشاهده در سایت', `https://janebiarena.ir/products/${productId}`)
    .text('🗑 حذف کالا', `p:del:${productId}`)
    .row()
    .text('⬅️ لیست کالاها', 'm:p:0');
}

export function makeProductDeleteConfirmKeyboard(productId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('⚠️ بله، کالا حذف شود', `p:dely:${productId}`)
    .text('❌ انصراف', `p:v:${productId}`);
}

export function makeOrderDetailKeyboard(orderId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('🔄 در حال پردازش', `o:s:${orderId}:processing`)
    .text('🚚 ارسال شد', `o:s:${orderId}:shipped`)
    .text('✅ تحویل شد', `o:s:${orderId}:delivered`)
    .row()
    .text('🔴 لغو سفارش', `o:s:${orderId}:cancelled`)
    .row()
    .text('⬅️ بازگشت به سفارش‌ها', 'm:o:0');
}

// -------------------------------------------------------------
// Message Edit or Reply Fallback
// -------------------------------------------------------------
async function editOrReply(ctx: Context, text: string, replyMarkup?: InlineKeyboard): Promise<void> {
  const safeText = text.length > 4000 ? text.slice(0, 3990) + '...' : text;
  try {
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
      await ctx.editMessageText(safeText, { reply_markup: replyMarkup });
      return;
    }
  } catch (err: any) {
    if (err.message?.includes('message is not modified')) {
      return;
    }
  }
  await ctx.reply(safeText, { reply_markup: replyMarkup });
}

// -------------------------------------------------------------
// Core Bot Controller
// -------------------------------------------------------------
export async function startBaleBot(token: string, adminChatIds: number[]) {
  const bot = new Bot(token, { client: { apiRoot: BALE_API_ROOT } });
  const cfg: BaleBotConfig = { token, adminChatIds };

  bot.catch((err) => {
    console.error('[bale-bot] error:', err instanceof GrammyError ? `${err.message} (${err.method})` : err);
  });

  // --- Main Menu Commands ---
  bot.command(['start', 'menu'], async (ctx) => {
    if (!isAdmin(ctx, cfg)) return ctx.reply('⛔ دسترسی فقط برای مدیران فروشگاه.');
    clearSession(ctx.from!.id);
    await ctx.reply(
      '🛍 *سامانه مدیریت هوشمند Janebi Arena*\n\n' +
      'از دکمه‌های شیشه‌ای زیر جهت دسترسی سریع به بخش‌های فروشگاه استفاده کنید:',
      { reply_markup: makeMainMenuKeyboard() }
    );
  });

  bot.command('new', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return ctx.reply('⛔ دسترسی فقط برای مدیران فروشگاه.');
    const s = getSession(ctx.from!.id);
    s.mode = 'wizard';
    s.wizard = { step: 'title', catPage: 0 };
    await ctx.reply('🏷 لطفاً *نام محصول جدید* را ارسال کنید:', { reply_markup: makeCancelKeyboard() });
  });

  bot.command('cancel', async (ctx) => {
    clearSession(ctx.from!.id);
    await ctx.reply('عملیات لغو شد.', { reply_markup: makeMainMenuKeyboard() });
  });

  bot.command('stats', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    await showStoreStats(ctx);
  });

  bot.command('alerts', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    await showLowStockAlerts(ctx);
  });

  bot.command('orders', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    await showOrdersList(ctx, 0);
  });

  bot.command('list', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    await showProductsList(ctx, 0);
  });

  bot.command('help', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    await showHelp(ctx);
  });

  // --- Callback Query Router ---
  bot.on('callback_query:data', async (ctx) => {
    if (!isAdmin(ctx, cfg)) {
      await ctx.answerCallbackQuery({ text: '⛔ دسترسی غیرمجاز', show_alert: true }).catch(() => {});
      return;
    }

    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    const session = getSession(userId);

    // Bale docs: answerCallbackQuery is mandatory to dismiss loading spinner
    await ctx.answerCallbackQuery().catch(() => {});

    // 1. Navigation Sections
    if (data === 'm:menu') {
      clearSession(userId);
      await editOrReply(
        ctx,
        '🛍 *سامانه مدیریت هوشمند Janebi Arena*\n\n' +
        'از دکمه‌های شیشه‌ای زیر جهت دسترسی به بخش‌های فروشگاه استفاده کنید:',
        makeMainMenuKeyboard()
      );
      return;
    }

    if (data === 'm:sec_prod') {
      await editOrReply(ctx, '📦 *مدیریت کالاها و انبار:*\nیکی از گزینه‌های زیر را انتخاب کنید:', makeProductsSectionKeyboard());
      return;
    }

    if (data === 'm:sec_ord') {
      await editOrReply(ctx, '🛍 *مدیریت سفارشات فروشگاه:*\nفیلتر مورد نظر را انتخاب کنید:', makeOrdersSectionKeyboard());
      return;
    }

    if (data === 'm:sec_coup') {
      await editOrReply(ctx, '🏷 *کدهای تخفیف و کوپن‌ها:*\nجهت مشاهده یا ساخت کد تخفیف انتخاب کنید:', makeCouponsSectionKeyboard());
      return;
    }

    if (data === 'm:sec_msg') {
      await editOrReply(ctx, '💬 *نظرات کاربران و فرم‌های تماس:*\nبخش مورد نظر را انتخاب نمایید:', makeMessagesSectionKeyboard());
      return;
    }

    if (data === 'm:sec_user') {
      await editOrReply(ctx, '👥 *مدیریت مشتریان و امتیازات VIP:*\nجهت استعلام مشتری دکمه زیر را لمس کنید:', makeUsersSectionKeyboard());
      return;
    }

    if (data === 'm:sec_set') {
      await showSettingsMenu(ctx);
      return;
    }

    if (data === 'm:cancel') {
      clearSession(userId);
      await editOrReply(ctx, 'عملیات لغو شد و به منوی اصلی بازگشتید.', makeMainMenuKeyboard());
      return;
    }

    if (data === 'm:help') {
      await showHelp(ctx);
      return;
    }

    if (data === 'm:alert') {
      await showLowStockAlerts(ctx);
      return;
    }

    if (data === 'm:stat') {
      await showStoreStats(ctx);
      return;
    }

    // 2. Product Management
    if (data === 'm:new') {
      session.mode = 'wizard';
      session.wizard = { step: 'title', catPage: 0 };
      await editOrReply(ctx, '🏷 لطفاً *نام محصول جدید* را بفرستید:', makeCancelKeyboard());
      return;
    }

    if (data.startsWith('m:p:')) {
      const page = parseInt(data.replace('m:p:', ''), 10) || 0;
      await showProductsList(ctx, page);
      return;
    }

    if (data.startsWith('m:cat_pick:')) {
      const page = parseInt(data.replace('m:cat_pick:', ''), 10) || 0;
      const cats = await getStoreCategories();
      await editOrReply(ctx, '📁 *دسته‌بندی مورد نظر را برای مشاهده کالاها انتخاب کنید:*', makeCategoriesKeyboard(cats, page, 'cpk:cat:'));
      return;
    }

    if (data.startsWith('cpk:pg:')) {
      const page = parseInt(data.replace('cpk:pg:', ''), 10) || 0;
      const cats = await getStoreCategories();
      await editOrReply(ctx, '📁 *دسته‌بندی مورد نظر را انتخاب کنید:*', makeCategoriesKeyboard(cats, page, 'cpk:cat:'));
      return;
    }

    if (data.startsWith('cpk:cat:')) {
      const idx = parseInt(data.replace('cpk:cat:', ''), 10);
      const cats = await getStoreCategories();
      const chosen = cats[idx];
      if (!chosen) return;
      await showProductsByCategory(ctx, chosen, 0);
      return;
    }

    if (data.startsWith('cpk:list:')) {
      const [, , catIdxStr, pageStr] = data.split(':');
      const cats = await getStoreCategories();
      const chosen = cats[parseInt(catIdxStr, 10)];
      if (!chosen) return;
      await showProductsByCategory(ctx, chosen, parseInt(pageStr, 10) || 0);
      return;
    }

    if (data === 'm:srch') {
      session.mode = 'search';
      await editOrReply(ctx, '🔍 لطفاً *نام یا کد کالای (SKU)* مورد نظر را ارسال کنید:', makeCancelKeyboard());
      return;
    }

    // Wizard Flow
    if (data.startsWith('c:cat:')) {
      if (!session.wizard || session.wizard.step !== 'category') return;
      const idx = parseInt(data.replace('c:cat:', ''), 10);
      const cats = await getStoreCategories();
      const chosenCat = cats[idx] || cats[0];
      session.wizard.category = chosenCat;
      session.wizard.step = 'price';
      await editOrReply(
        ctx,
        `📁 دسته انتخاب شد: *${chosenCat}*\n\n💰 حالا *قیمت محصول (تومان)* را ارسال کنید (مثلاً ۲۵۰۰۰۰ یا 250,000):`,
        makeCancelKeyboard()
      );
      return;
    }

    if (data.startsWith('c:pg:')) {
      if (!session.wizard || session.wizard.step !== 'category') return;
      const page = parseInt(data.replace('c:pg:', ''), 10) || 0;
      session.wizard.catPage = page;
      const cats = await getStoreCategories();
      await editOrReply(ctx, '📁 *دسته‌بندی محصول* را انتخاب کنید:', makeCategoriesKeyboard(cats, page));
      return;
    }

    if (data.startsWith('w:stk:')) {
      if (!session.wizard || session.wizard.step !== 'stock') return;
      session.wizard.stock = parseInt(data.replace('w:stk:', ''), 10);
      session.wizard.step = 'brand';
      await editOrReply(
        ctx,
        `📦 موجودی: *${session.wizard.stock} عدد*\n\n🏭 *برند محصول* را انتخاب کنید یا نام آن را بفرستید:`,
        makeBrandQuickKeyboard()
      );
      return;
    }

    if (data.startsWith('w:brd:')) {
      if (!session.wizard || session.wizard.step !== 'brand') return;
      session.wizard.brand = data.replace('w:brd:', '');
      session.wizard.step = 'warranty';
      await editOrReply(
        ctx,
        `🏭 برند: *${session.wizard.brand}*\n\n🛡 *نوع گارانتی* را انتخاب کنید یا بنویسید:`,
        makeWarrantyQuickKeyboard()
      );
      return;
    }

    if (data.startsWith('w:war:')) {
      if (!session.wizard || session.wizard.step !== 'warranty') return;
      session.wizard.warranty = data.replace('w:war:', '');
      session.wizard.step = 'description';
      await editOrReply(
        ctx,
        `🛡 گارانتی: *${session.wizard.warranty}*\n\n📝 *توضیحات یا نکات کلیدی کالا* را ارسال کنید (یا دکمه رد شدن):`,
        makeDescriptionQuickKeyboard()
      );
      return;
    }

    if (data.startsWith('w:skip:')) {
      if (!session.wizard) return;
      const step = data.replace('w:skip:', '');
      if (step === 'brand') {
        session.wizard.brand = 'متفرقه';
        session.wizard.step = 'warranty';
        await editOrReply(ctx, '🏭 برند: *متفرقه*\n\n🛡 *نوع گارانتی* را انتخاب کنید یا بنویسید:', makeWarrantyQuickKeyboard());
        return;
      }
      if (step === 'warranty') {
        session.wizard.warranty = 'اصالت و سلامت فیزیکی';
        session.wizard.step = 'description';
        await editOrReply(ctx, '🛡 گارانتی: *اصالت و سلامت فیزیکی*\n\n📝 *توضیحات کالا* را بفرستید (یا رد شدن):', makeDescriptionQuickKeyboard());
        return;
      }
      if (step === 'desc') {
        session.wizard.description = undefined;
        session.wizard.step = 'photo';
        await editOrReply(ctx, '📝 توضیحات رد شد.\n\n🖼 حالا *عکس کالا* را مستقیماً در همین چت بفرستید (یا لینک عکس را بفرستید):', makePhotoQuickKeyboard());
        return;
      }
      if (step === 'photo') {
        session.wizard.photoUrl = '/placeholder-product.svg';
        session.wizard.step = 'confirm';
        await showProductConfirmation(ctx, session.wizard);
        return;
      }
    }

    if (data === 'w:ok') {
      if (!session.wizard || session.wizard.step !== 'confirm') {
        await ctx.reply('پیش‌نویسی برای ثبت یافت نشد.', { reply_markup: makeMainMenuKeyboard() });
        return;
      }
      const d = session.wizard;
      try {
        const sku = `SKU-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const [inserted] = await db.insert(products).values({
          title: d.title!,
          category: d.category!,
          price: d.price!,
          originalPrice: d.price!,
          discount: 0,
          image: d.photoUrl || '/placeholder-product.svg',
          brand: d.brand || 'متفرقه',
          warranty: d.warranty,
          description: d.description,
          stockQuantity: d.stock || 10,
          sku,
        }).returning();

        appCache.invalidate('products');
        appCache.invalidate('categories');
        logAudit('product.create', `bale-${userId}`, String(inserted.id), {
          title: inserted.title,
          price: inserted.price,
          stock: inserted.stockQuantity,
        });

        clearSession(userId);

        const doneKb = new InlineKeyboard()
          .url('🔗 مشاهده در سایت', `https://janebiarena.ir/products/${inserted.id}`)
          .row()
          .text('➕ ثبت کالای دیگر', 'm:new')
          .text('🏠 منوی اصلی', 'm:menu');

        await editOrReply(
          ctx,
          `🎉 *کالا با موفقیت ثبت و در فروشگاه منتشر شد!*\n\n` +
          `▫️ *شناسه:* ${inserted.id}\n` +
          `▫️ *نام:* ${inserted.title}\n` +
          `▫️ *قیمت:* ${fmt(inserted.price)} تومان\n` +
          `▫️ *موجودی:* ${fmt(inserted.stockQuantity)} عدد\n` +
          `▫️ *کد کالا:* \`${inserted.sku}\``,
          doneKb
        );
      } catch (err: any) {
        await ctx.reply(`❌ خطا در ذخیره‌سازی کالا: ${err.message}`, { reply_markup: makeMainMenuKeyboard() });
      }
      return;
    }

    // Product actions
    if (data.startsWith('p:v:')) {
      const prodId = parseInt(data.replace('p:v:', ''), 10);
      await showProductDetail(ctx, prodId);
      return;
    }

    if (data.startsWith('p:s:')) {
      const [, , idStr, deltaStr] = data.split(':');
      const prodId = parseInt(idStr, 10);
      const delta = parseInt(deltaStr, 10);

      const existing = await db.query.products.findFirst({ where: eq(products.id, prodId) });
      if (!existing) {
        await ctx.reply('کالای مورد نظر یافت نشد.', { reply_markup: makeMainMenuKeyboard() });
        return;
      }

      const newStock = Math.max(0, existing.stockQuantity + delta);
      await db.update(products).set({ stockQuantity: newStock }).where(eq(products.id, prodId));
      appCache.invalidate('products');
      logAudit('product.stock.update', `bale-${userId}`, String(prodId), { from: existing.stockQuantity, to: newStock, delta });

      await ctx.answerCallbackQuery({ text: `✅ موجودی جدید: ${newStock} عدد` }).catch(() => {});
      await showProductDetail(ctx, prodId);
      return;
    }

    if (data.startsWith('p:prc:')) {
      const prodId = parseInt(data.replace('p:prc:', ''), 10);
      session.mode = 'edit_price';
      session.editingProductId = prodId;
      const p = await db.query.products.findFirst({ where: eq(products.id, prodId) });
      await editOrReply(
        ctx,
        `💰 *ویرایش قیمت کالا*\n\nکالا: *${p?.title || prodId}*\nقیمت فعلی: *${fmt(p?.price || 0)} تومان*\n\nلطفاً *قیمت جدید (تومان)* را بفرستید:`,
        makeCancelKeyboard()
      );
      return;
    }

    if (data.startsWith('p:dsc:')) {
      const prodId = parseInt(data.replace('p:dsc:', ''), 10);
      session.mode = 'edit_discount';
      session.editingProductId = prodId;
      const p = await db.query.products.findFirst({ where: eq(products.id, prodId) });
      await editOrReply(
        ctx,
        `🏷 *تنظیم تخفیف کالا*\n\nکالا: *${p?.title || prodId}*\nتخفیف فعلی: *${fmt(p?.discount || 0)}%*\n\nلطفاً *درصد تخفیف جدید (عدد ۰ تا ۹۰)* را ارسال کنید:`,
        makeCancelKeyboard()
      );
      return;
    }

    if (data.startsWith('p:del:')) {
      const prodId = parseInt(data.replace('p:del:', ''), 10);
      const p = await db.query.products.findFirst({ where: eq(products.id, prodId) });
      await editOrReply(
        ctx,
        `⚠️ *آیا از حذف محصول زیر اطمینان دارید؟*\n\n▫️ *نام:* ${p?.title}\n▫️ *شناسه:* ${prodId}\n\nعملیات غیرقابل بازگشت است.`,
        makeProductDeleteConfirmKeyboard(prodId)
      );
      return;
    }

    if (data.startsWith('p:dely:')) {
      const prodId = parseInt(data.replace('p:dely:', ''), 10);
      try {
        await db.transaction(async (tx) => {
          await tx.delete(cartItems).where(eq(cartItems.productId, prodId));
          await tx.delete(wishlistItems).where(eq(wishlistItems.productId, prodId));
          await tx.delete(reviews).where(eq(reviews.productId, prodId));
          await tx.delete(productFeatures).where(eq(productFeatures.productId, prodId));
          await tx.delete(products).where(eq(products.id, prodId));
        });
        appCache.invalidate('products');
        appCache.invalidate('categories');
        logAudit('product.delete', `bale-${userId}`, String(prodId));

        const backKb = new InlineKeyboard().text('⬅️ لیست محصولات', 'm:p:0').text('🏠 منوی اصلی', 'm:menu');
        await editOrReply(ctx, `🗑 کالا با شناسه ${prodId} با موفقیت حذف شد.`, backKb);
      } catch (err: any) {
        await ctx.reply(`❌ خطا در حذف کالا: ${err.message}`);
      }
      return;
    }

    // 3. Orders Management
    if (data.startsWith('m:o:')) {
      const page = parseInt(data.replace('m:o:', ''), 10) || 0;
      await showOrdersList(ctx, page);
      return;
    }

    if (data.startsWith('m:of:')) {
      const [, , status, pageStr] = data.split(':');
      const page = parseInt(pageStr, 10) || 0;
      await showOrdersList(ctx, page, status);
      return;
    }

    if (data.startsWith('o:v:')) {
      const orderId = data.replace('o:v:', '');
      await showOrderDetail(ctx, orderId);
      return;
    }

    if (data.startsWith('o:s:')) {
      const [, , orderId, nextStatus] = data.split(':');
      await updateOrderStatus(ctx, orderId, nextStatus);
      return;
    }

    // 4. Coupons Management
    if (data.startsWith('m:cp_list:')) {
      const page = parseInt(data.replace('m:cp_list:', ''), 10) || 0;
      await showCouponsList(ctx, page);
      return;
    }

    if (data === 'm:cp_new') {
      session.mode = 'coupon_wizard';
      session.couponWizard = { step: 'code' };
      await editOrReply(ctx, '🏷 لطفاً *کد تخفیف انگلیسی* (مانند NOROOZ یا VIP20) را ارسال کنید:', makeCancelKeyboard());
      return;
    }

    if (data.startsWith('cp:tog:')) {
      const code = data.replace('cp:tog:', '');
      const existing = await db.query.coupons.findFirst({ where: eq(coupons.code, code) });
      if (existing) {
        const nextActive = !existing.active;
        await db.update(coupons).set({ active: nextActive }).where(eq(coupons.code, code));
        appCache.invalidate('coupons');
        logAudit('coupon.toggle', `bale-${userId}`, code, { active: nextActive });
        await ctx.answerCallbackQuery({ text: `وضعیت کوپن: ${nextActive ? 'فعال شد' : 'غیرفعال شد'}` }).catch(() => {});
        await showCouponsList(ctx, 0);
      }
      return;
    }

    if (data.startsWith('cp:del:')) {
      const code = data.replace('cp:del:', '');
      await db.delete(coupons).where(eq(coupons.code, code));
      appCache.invalidate('coupons');
      logAudit('coupon.delete', `bale-${userId}`, code);
      await ctx.answerCallbackQuery({ text: `کوپن ${code} حذف شد` }).catch(() => {});
      await showCouponsList(ctx, 0);
      return;
    }

    // 5. Reviews Moderation
    if (data.startsWith('m:rv_list:')) {
      const page = parseInt(data.replace('m:rv_list:', ''), 10) || 0;
      await showReviewsList(ctx, page);
      return;
    }

    if (data.startsWith('rv:app:')) {
      const revId = data.replace('rv:app:', '');
      await setReviewApproval(revId, true);
      logAudit('review.approve', `bale-${userId}`, revId);
      await ctx.answerCallbackQuery({ text: '✅ نظر تأیید و امتیاز محصول بازمحاسبه شد' }).catch(() => {});
      await showReviewsList(ctx, 0);
      return;
    }

    if (data.startsWith('rv:rej:')) {
      const revId = data.replace('rv:rej:', '');
      await setReviewApproval(revId, false);
      logAudit('review.reject', `bale-${userId}`, revId);
      await ctx.answerCallbackQuery({ text: '❌ نظر رد شد و از نمایش خارج گردید' }).catch(() => {});
      await showReviewsList(ctx, 0);
      return;
    }

    if (data.startsWith('rv:del:')) {
      const revId = data.replace('rv:del:', '');
      await setReviewApproval(revId, false);
      await db.delete(reviews).where(eq(reviews.id, revId));
      logAudit('review.delete', `bale-${userId}`, revId);
      await ctx.answerCallbackQuery({ text: '🗑 نظر با موفقیت حذف شد' }).catch(() => {});
      await showReviewsList(ctx, 0);
      return;
    }

    // 6. Contact Form Messages
    if (data.startsWith('m:cm_list:')) {
      const page = parseInt(data.replace('m:cm_list:', ''), 10) || 0;
      await showContactMessagesList(ctx, page);
      return;
    }

    if (data.startsWith('cm:read:')) {
      const msgId = data.replace('cm:read:', '');
      await db.update(contactMessages).set({ status: 'read' }).where(eq(contactMessages.id, msgId));
      await ctx.answerCallbackQuery({ text: 'پیام به عنوان خوانده‌شده علامت خورد' }).catch(() => {});
      await showContactMessagesList(ctx, 0);
      return;
    }

    if (data.startsWith('cm:arc:')) {
      const msgId = data.replace('cm:arc:', '');
      await db.update(contactMessages).set({ status: 'archived' }).where(eq(contactMessages.id, msgId));
      await ctx.answerCallbackQuery({ text: 'پیام به آرشیو منتقل شد' }).catch(() => {});
      await showContactMessagesList(ctx, 0);
      return;
    }

    // 7. Users & Loyalty
    if (data === 'm:usr_srch') {
      session.mode = 'search_user';
      await editOrReply(ctx, '🔍 شماره موبایل مشتری (مثلاً 09121234567) را ارسال فرمایید:', makeCancelKeyboard());
      return;
    }

    if (data.startsWith('u:vip:')) {
      const [, , uId, ptsStr] = data.split(':');
      const pts = parseInt(ptsStr, 10);
      const usr = await db.query.users.findFirst({ where: eq(users.id, uId) });
      if (usr) {
        const newPts = (usr.vipPoints || 0) + pts;
        await db.update(users).set({ vipPoints: newPts }).where(eq(users.id, uId));
        logAudit('user.vip.gift', `bale-${userId}`, uId, { added: pts, total: newPts });
        await ctx.answerCallbackQuery({ text: `🎉 ${pts} امتیاز VIP اضافه شد. کل: ${newPts}` }).catch(() => {});
        await showUserDetail(ctx, uId);
      }
      return;
    }

    // 8. Website Settings
    if (data === 'st:bar_tog') {
      const cur = (await db.query.storeSettings.findFirst({ where: eq(storeSettings.key, 'announcementBarEnabled') }))?.value === 'true';
      const nxt = !cur;
      await db.insert(storeSettings).values({ key: 'announcementBarEnabled', value: String(nxt) })
        .onConflictDoUpdate({ target: storeSettings.key, set: { value: String(nxt) } });
      appCache.invalidate('settings');
      logAudit('settings.announcement.toggle', `bale-${userId}`, 'announcementBarEnabled', { enabled: nxt });
      await ctx.answerCallbackQuery({ text: nxt ? '📢 نوار اعلان فعال شد' : 'نوار اعلان خاموش شد' }).catch(() => {});
      await showSettingsMenu(ctx);
      return;
    }

    if (data === 'st:bar_txt') {
      session.mode = 'edit_announcement';
      const curTxt = (await db.query.storeSettings.findFirst({ where: eq(storeSettings.key, 'announcementBarText') }))?.value || '';
      await editOrReply(ctx, `📢 متن فعلی نوار اعلان:\n«${curTxt}»\n\nمتن جدید را بفرستید:`, makeCancelKeyboard());
      return;
    }

    if (data === 'st:ship_th') {
      session.mode = 'edit_free_shipping';
      const curTh = (await db.query.storeSettings.findFirst({ where: eq(storeSettings.key, 'freeShippingThreshold') }))?.value || '500000';
      await editOrReply(ctx, `🚚 سقف فعلی ارسال رایگان: *${fmt(parseInt(curTh, 10) || 0)} تومان*\n\nمبلغ جدید (تومان) را ارسال نمایید:`, makeCancelKeyboard());
      return;
    }
  });

  // --- Text Messages Handler ---
  bot.on('message:text', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    const userId = ctx.from.id;
    const session = getSession(userId);
    const text = ctx.message.text.trim();

    // 1. Search Product
    if (session.mode === 'search') {
      session.mode = 'idle';
      const term = text.toLowerCase();
      const results = await db
        .select()
        .from(products)
        .where(sql`lower(${products.title}) LIKE lower(${'%' + term + '%'}) OR lower(${products.sku}) LIKE lower(${'%' + term + '%'})`)
        .limit(6);

      if (results.length === 0) {
        const kb = new InlineKeyboard().text('🔍 جستجوی مجدد', 'm:srch').text('🏠 منوی اصلی', 'm:menu');
        await ctx.reply(`❌ کالایی با عبارت «${text}» یافت نشد.`, { reply_markup: kb });
        return;
      }

      const kb = new InlineKeyboard();
      for (const p of results) {
        kb.text(`📦 ${p.title.slice(0, 24)} (${fmt(p.stockQuantity)} عدد)`, `p:v:${p.id}`).row();
      }
      kb.text('🔍 جستجوی دیگر', 'm:srch').text('🏠 منوی اصلی', 'm:menu');
      await ctx.reply(`🔍 نتایج جستجو برای «${text}» (${results.length} مورد):`, { reply_markup: kb });
      return;
    }

    // 2. Search Customer
    if (session.mode === 'search_user') {
      session.mode = 'idle';
      const phoneClean = fa2en(text).replace(/[^\d]/g, '');
      const u = await db.query.users.findFirst({
        where: sql`phone LIKE ${'%' + phoneClean + '%'}`,
      });

      if (!u) {
        const kb = new InlineKeyboard().text('🔍 جستجوی مجدد', 'm:usr_srch').text('🏠 منوی اصلی', 'm:menu');
        await ctx.reply(`❌ کاربری با شماره «${text}» یافت نشد.`, { reply_markup: kb });
        return;
      }
      await showUserDetail(ctx, u.id);
      return;
    }

    // 3. Edit Price
    if (session.mode === 'edit_price' && session.editingProductId) {
      const newPrice = parsePrice(text);
      const prodId = session.editingProductId;
      if (!Number.isFinite(newPrice) || newPrice <= 0) {
        await ctx.reply('❌ مبلغ نامعتبر است. عدد به تومان وارد کنید:', { reply_markup: makeCancelKeyboard() });
        return;
      }

      await db.update(products).set({ price: newPrice }).where(eq(products.id, prodId));
      appCache.invalidate('products');
      logAudit('product.price.update', `bale-${userId}`, String(prodId), { price: newPrice });

      clearSession(userId);
      await ctx.reply(`✅ قیمت کالا به *${fmt(newPrice)} تومان* به‌روزرسانی شد.`);
      await showProductDetail(ctx, prodId);
      return;
    }

    // 4. Edit Discount Percent
    if (session.mode === 'edit_discount' && session.editingProductId) {
      const rawDisc = parsePrice(text);
      const prodId = session.editingProductId;
      if (!Number.isFinite(rawDisc) || rawDisc < 0 || rawDisc > 99) {
        await ctx.reply('❌ درصد نامعتبر است. عددی بین ۰ تا ۹۹ بفرستید:', { reply_markup: makeCancelKeyboard() });
        return;
      }

      await db.update(products).set({ discount: rawDisc }).where(eq(products.id, prodId));
      appCache.invalidate('products');
      logAudit('product.discount.update', `bale-${userId}`, String(prodId), { discount: rawDisc });

      clearSession(userId);
      await ctx.reply(`✅ تخفیف کالا به *${fmt(rawDisc)}%* تنظیم شد.`);
      await showProductDetail(ctx, prodId);
      return;
    }

    // 5. Coupon Creation Wizard
    if (session.mode === 'coupon_wizard' && session.couponWizard) {
      const cw = session.couponWizard;
      if (cw.step === 'code') {
        cw.code = text.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        if (!cw.code) {
          await ctx.reply('کد نامعتبر است. فقط حروف انگلیسی و اعداد وارد کنید:');
          return;
        }
        cw.step = 'percent';
        await ctx.reply(`کد تخفیف: *${cw.code}*\n\nدرصد تخفیف (عدد ۱ تا ۹۰) را بفرستید:`, { reply_markup: makeCancelKeyboard() });
        return;
      }
      if (cw.step === 'percent') {
        const p = parsePrice(text);
        if (!Number.isFinite(p) || p <= 0 || p > 90) {
          await ctx.reply('درصد نامعتبر است. عددی بین ۱ تا ۹۰ بفرستید:');
          return;
        }
        cw.percent = p;
        cw.step = 'minTotal';
        await ctx.reply(`درصد: *${cw.percent}%*\n\nحداقل مبلغ خرید (تومان) برای این کوپن را وارد کنید (مثلاً ۱۰۰۰۰۰):`, { reply_markup: makeCancelKeyboard() });
        return;
      }
      if (cw.step === 'minTotal') {
        const mt = parsePrice(text);
        cw.minTotal = Number.isFinite(mt) && mt >= 0 ? mt : 0;
        try {
          await db.insert(coupons).values({
            code: cw.code!,
            percent: cw.percent!,
            minTotal: cw.minTotal,
            label: `${cw.percent}% تخفیف ویژه`,
            active: true,
            usedCount: 0,
          });
          appCache.invalidate('coupons');
          logAudit('coupon.create', `bale-${userId}`, cw.code!, { percent: cw.percent, minTotal: cw.minTotal });
          clearSession(userId);
          await ctx.reply(`🎉 کد تخفیف *${cw.code}* با موفقیت ایجاد و فعال گردید!`);
          await showCouponsList(ctx, 0);
        } catch (err: any) {
          await ctx.reply(`❌ خطا در ساخت کوپن: ${err.message}`, { reply_markup: makeMainMenuKeyboard() });
        }
        return;
      }
    }

    // 6. Announcement Bar Text
    if (session.mode === 'edit_announcement') {
      await db.insert(storeSettings).values({ key: 'announcementBarText', value: text })
        .onConflictDoUpdate({ target: storeSettings.key, set: { value: text } });
      appCache.invalidate('settings');
      clearSession(userId);
      await ctx.reply('✅ متن نوار اعلان با موفقیت به‌روزرسانی شد.');
      await showSettingsMenu(ctx);
      return;
    }

    // 7. Free Shipping Threshold
    if (session.mode === 'edit_free_shipping') {
      const th = parsePrice(text);
      if (!Number.isFinite(th) || th <= 0) {
        await ctx.reply('مبلغ نامعتبر است. عدد به تومان بفرستید:');
        return;
      }
      await db.insert(storeSettings).values({ key: 'freeShippingThreshold', value: String(th) })
        .onConflictDoUpdate({ target: storeSettings.key, set: { value: String(th) } });
      appCache.invalidate('settings');
      clearSession(userId);
      await ctx.reply(`✅ سقف ارسال رایگان به *${fmt(th)} تومان* تغییر یافت.`);
      await showSettingsMenu(ctx);
      return;
    }

    // 8. Product Wizard
    if (session.mode === 'wizard' && session.wizard) {
      const d = session.wizard;
      switch (d.step) {
        case 'title': {
          d.title = text;
          d.step = 'category';
          d.catPage = 0;
          const cats = await getStoreCategories();
          await ctx.reply(`🏷 نام: *${d.title}*\n\n📁 لطفاً *دسته‌بندی محصول* را انتخاب کنید:`, {
            reply_markup: makeCategoriesKeyboard(cats, 0),
          });
          break;
        }

        case 'price': {
          const p = parsePrice(text);
          if (!Number.isFinite(p) || p <= 0) {
            await ctx.reply('❌ قیمت نامعتبر است. عدد به تومان وارد کنید (مثلاً: ۲۵۰,۰۰۰):', {
              reply_markup: makeCancelKeyboard(),
            });
            return;
          }
          d.price = p;
          d.step = 'stock';
          await ctx.reply(`💰 قیمت: *${fmt(p)} تومان*\n\n📦 *تعداد موجودی اولیه* را ارسال کنید یا انتخاب نمایید:`, {
            reply_markup: makeStockQuickKeyboard(),
          });
          break;
        }

        case 'stock': {
          const s = parsePrice(text);
          if (!Number.isFinite(s) || s < 0) {
            await ctx.reply('❌ موجودی نامعتبر است. عدد مثبت وارد کنید:', { reply_markup: makeStockQuickKeyboard() });
            return;
          }
          d.stock = s;
          d.step = 'brand';
          await ctx.reply(`📦 موجودی: *${fmt(s)} عدد*\n\n🏭 *برند کالا* را وارد کنید یا انتخاب نمایید:`, {
            reply_markup: makeBrandQuickKeyboard(),
          });
          break;
        }

        case 'brand': {
          d.brand = text || 'متفرقه';
          d.step = 'warranty';
          await ctx.reply(`🏭 برند: *${d.brand}*\n\n🛡 *نوع گارانتی* را ارسال کنید یا انتخاب نمایید:`, {
            reply_markup: makeWarrantyQuickKeyboard(),
          });
          break;
        }

        case 'warranty': {
          d.warranty = text || 'اصالت و سلامت فیزیکی';
          d.step = 'description';
          await ctx.reply(`🛡 گارانتی: *${d.warranty}*\n\n📝 *توضیحات کالا* را ارسال کنید (یا دکمه رد شدن):`, {
            reply_markup: makeDescriptionQuickKeyboard(),
          });
          break;
        }

        case 'description': {
          d.description = text;
          d.step = 'photo';
          await ctx.reply(
            '📝 توضیحات ذخیره شد.\n\n' +
            '🖼 *تصویر محصول* را بفرستید:\n' +
            'عکس را مستقیماً در همین چت ارسال کنید، یا آدرس اینترنتی (URL) آن را بفرستید، یا دکمه تصویر پیش‌فرض را بزنید:',
            { reply_markup: makePhotoQuickKeyboard() }
          );
          break;
        }

        case 'photo': {
          if (!/^https?:\/\//i.test(text)) {
            await ctx.reply('❌ لینک نامعتبر است. آدرس اینترنتی معتبر بفرستید یا عکس را مستقیماً ارسال کنید:', {
              reply_markup: makePhotoQuickKeyboard(),
            });
            return;
          }
          d.photoUrl = text;
          d.step = 'confirm';
          await showProductConfirmation(ctx, d);
          break;
        }

        default:
          await ctx.reply('برای شروع از /menu استفاده نمایید.', { reply_markup: makeMainMenuKeyboard() });
          break;
      }
      return;
    }

    await ctx.reply('دستور نامشخص. از دکمه‌های زیر استفاده نمایید:', { reply_markup: makeMainMenuKeyboard() });
  });

  // --- Photo Upload Handler ---
  bot.on('message:photo', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    const session = getSession(ctx.from.id);
    if (session.mode !== 'wizard' || !session.wizard || session.wizard.step !== 'photo') {
      await ctx.reply('در این مرحله نیازی به ارسال عکس نیست.', { reply_markup: makeMainMenuKeyboard() });
      return;
    }

    const waitMsg = await ctx.reply('⏳ در حال دریافت و فشرده‌سازی تصویر...');
    try {
      const photos = ctx.message.photo;
      const best = photos[photos.length - 1];
      const fileInfo = await bot.api.getFile(best.file_id);
      if (!fileInfo.file_path) throw new Error('مسیر فایل از سرور بله دریافت نشد');

      const localUrl = await downloadAndSaveBalePhoto(token, fileInfo.file_path);
      session.wizard.photoUrl = localUrl;
      session.wizard.step = 'confirm';

      try {
        await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id);
      } catch {}

      await showProductConfirmation(ctx, session.wizard);
    } catch (err: any) {
      await ctx.reply(`❌ خطا در ذخیره عکس: ${err.message}\nمی‌توانید دوباره تلاش کنید یا دکمه تصویر پیش‌فرض را بزنید:`, {
        reply_markup: makePhotoQuickKeyboard(),
      });
    }
  });

  bot.on('message:document', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    await ctx.reply('لطفاً عکس را به صورت تصویر (Photo) ارسال کنید، نه فایل Document.', {
      reply_markup: makePhotoQuickKeyboard(),
    });
  });

  // --- Sub-view Renderers ---
  async function showProductConfirmation(ctx: Context, d: WizardDraft): Promise<void> {
    const summary =
      '📋 *پیش‌نمایش ثبت محصول جدید*\n\n' +
      `▫️ *عنوان:* ${d.title}\n` +
      `▫️ *دسته‌بندی:* ${d.category}\n` +
      `▫️ *قیمت:* ${fmt(d.price!)} تومان\n` +
      `▫️ *موجودی:* ${fmt(d.stock!)} عدد\n` +
      `▫️ *برند:* ${d.brand}\n` +
      `▫️ *گارانتی:* ${d.warranty || '—'}\n` +
      `▫️ *توضیحات:* ${d.description || '—'}\n` +
      `▫️ *تصویر:* ${d.photoUrl}\n\n` +
      'جهت انتشار فوری در وب‌سایت تأیید کنید:';

    await ctx.reply(summary, { reply_markup: makeConfirmWizardKeyboard() });
  }

  async function showProductsList(ctx: Context, page: number): Promise<void> {
    const pageSize = 5;
    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(products);
    const total = Number(countRow?.count ?? 0);
    const totalPages = Math.ceil(total / pageSize) || 1;
    const curPage = Math.max(0, Math.min(page, totalPages - 1));

    const rows = await db.select().from(products).orderBy(desc(products.id)).limit(pageSize).offset(curPage * pageSize);

    if (rows.length === 0) {
      const kb = new InlineKeyboard().text('➕ ثبت محصول جدید', 'm:new').text('🏠 منوی اصلی', 'm:menu');
      await editOrReply(ctx, '📦 هیچ محصولی در فروشگاه ثبت نشده است.', kb);
      return;
    }

    const kb = new InlineKeyboard();
    for (const p of rows) {
      kb.text(`📦 ${p.title.slice(0, 24)}... | ${fmt(p.price)} ت`, `p:v:${p.id}`).row();
    }

    const navRow: { text: string; data: string }[] = [];
    if (curPage > 0) navRow.push({ text: '⬅️ قبل', data: `m:p:${curPage - 1}` });
    if (curPage < totalPages - 1) navRow.push({ text: 'بعد ➡️', data: `m:p:${curPage + 1}` });

    if (navRow.length > 0) {
      for (const b of navRow) kb.text(b.text, b.data);
      kb.row();
    }
    kb.text('➕ ثبت محصول', 'm:new').text('📁 دسته‌ها', 'm:cat_pick:0').row().text('🏠 منوی اصلی', 'm:menu');

    await editOrReply(ctx, `📦 *فهرست کالاهای فروشگاه* (صفحه ${curPage + 1} از ${totalPages} — مجموع: ${total}):`, kb);
  }

  async function showProductsByCategory(ctx: Context, categoryName: string, page: number): Promise<void> {
    const pageSize = 5;
    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.category, categoryName));
    const total = Number(countRow?.count ?? 0);
    const totalPages = Math.ceil(total / pageSize) || 1;
    const curPage = Math.max(0, Math.min(page, totalPages - 1));

    const rows = await db.select().from(products).where(eq(products.category, categoryName)).orderBy(desc(products.id)).limit(pageSize).offset(curPage * pageSize);

    const kb = new InlineKeyboard();
    for (const p of rows) {
      kb.text(`📦 ${p.title.slice(0, 22)}... | ${fmt(p.price)} ت`, `p:v:${p.id}`).row();
    }

    const cats = await getStoreCategories();
    const catIdx = cats.indexOf(categoryName);

    const navRow: { text: string; data: string }[] = [];
    if (curPage > 0) navRow.push({ text: '⬅️ قبل', data: `cpk:list:${catIdx}:${curPage - 1}` });
    if (curPage < totalPages - 1) navRow.push({ text: 'بعد ➡️', data: `cpk:list:${catIdx}:${curPage + 1}` });

    if (navRow.length > 0) {
      for (const b of navRow) kb.text(b.text, b.data);
      kb.row();
    }
    kb.text('📁 انتخاب دسته دیگر', 'm:cat_pick:0').text('🏠 منوی اصلی', 'm:menu');

    await editOrReply(ctx, `📁 *کالاهای دسته «${categoryName}»* (${total} محصول):`, kb);
  }

  async function showProductDetail(ctx: Context, prodId: number): Promise<void> {
    const p = await db.query.products.findFirst({ where: eq(products.id, prodId) });
    if (!p) {
      await ctx.reply('کالای مورد نظر یافت نشد.', { reply_markup: makeMainMenuKeyboard() });
      return;
    }

    const text =
      `📦 *مشخصات و مدیریت کالا*\n\n` +
      `▫️ *نام کالا:* ${p.title}\n` +
      `▫️ *شناسه:* ${p.id}\n` +
      `▫️ *دسته‌بندی:* ${p.category}\n` +
      `▫️ *قیمت اصلی:* *${fmt(p.price)} تومان*\n` +
      `▫️ *تخفیف:* ${p.discount ? `🔥 *${fmt(p.discount)}%*` : 'ندارد'}\n` +
      `▫️ *موجودی انبار:* *${p.stockQuantity > 0 ? `${fmt(p.stockQuantity)} عدد` : '🔴 ناموجود'}*\n` +
      `▫️ *برند:* ${p.brand || 'متفرقه'}\n` +
      `▫️ *گارانتی:* ${p.warranty || '—'}\n` +
      `▫️ *کد کالا (SKU):* \`${p.sku || '—'}\`\n\n` +
      `جهت ویرایش موجودی، قیمت یا تخفیف از دکمه‌های زیر استفاده فرمایید:`;

    await editOrReply(ctx, text, makeProductDetailKeyboard(p.id, p.stockQuantity));
  }

  async function showOrdersList(ctx: Context, page: number, statusFilter?: string): Promise<void> {
    const pageSize = 5;
    const condition = statusFilter ? eq(orders.status, statusFilter) : undefined;
    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(condition);
    const total = Number(countRow?.count ?? 0);
    const totalPages = Math.ceil(total / pageSize) || 1;
    const curPage = Math.max(0, Math.min(page, totalPages - 1));

    const rows = await db.select().from(orders).where(condition).orderBy(desc(orders.date)).limit(pageSize).offset(curPage * pageSize);

    if (rows.length === 0) {
      const kb = new InlineKeyboard().text('🛍 بازگشت به سفارش‌ها', 'm:sec_ord').text('🏠 منوی اصلی', 'm:menu');
      await editOrReply(ctx, '🛍 هیچ سفارشی در این وضعیت یافت نشد.', kb);
      return;
    }

    const kb = new InlineKeyboard();
    for (const o of rows) {
      const st = ORDER_STATUS_MAP[o.status] || { icon: '▫️', label: o.statusText };
      const shortId = o.id.length > 12 ? o.id.slice(0, 10) + '..' : o.id;
      kb.text(`${st.icon} ${shortId} | ${o.recipientName} | ${fmt(o.total)} ت`, `o:v:${o.id}`).row();
    }

    const navRow: { text: string; data: string }[] = [];
    const navBase = statusFilter ? `m:of:${statusFilter}:` : 'm:o:';
    if (curPage > 0) navRow.push({ text: '⬅️ قبل', data: `${navBase}${curPage - 1}` });
    if (curPage < totalPages - 1) navRow.push({ text: 'بعد ➡️', data: `${navBase}${curPage + 1}` });

    if (navRow.length > 0) {
      for (const b of navRow) kb.text(b.text, b.data);
      kb.row();
    }
    kb.text('🛍 منوی سفارشات', 'm:sec_ord').text('🏠 منوی اصلی', 'm:menu');

    const filterText = statusFilter ? ` (فیلتر: ${ORDER_STATUS_MAP[statusFilter]?.label || statusFilter})` : '';
    await editOrReply(ctx, `🛍 *سفارش‌های فروشگاه*${filterText} (صفحه ${curPage + 1} از ${totalPages} — مجموع: ${total}):`, kb);
  }

  async function showOrderDetail(ctx: Context, orderId: string): Promise<void> {
    const o = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { items: true },
    });

    if (!o) {
      await ctx.reply('سفارش مورد نظر یافت نشد.', { reply_markup: makeMainMenuKeyboard() });
      return;
    }

    const st = ORDER_STATUS_MAP[o.status] || { icon: '▫️', label: o.statusText };
    const itemsList =
      (o as any).items?.map((it: any, idx: number) => `  ${fmt(idx + 1)}. ${it.title} (تعداد: ${fmt(it.qty)}) — ${fmt(it.price)} تومان`).join('\n') || '  (بدون اقلام)';

    const text =
      `🛍 *جزئیات سفارش:* \`${o.id}\`\n\n` +
      `👤 *مشتری:* ${o.recipientName}\n` +
      `📞 *شماره تماس:* \`${o.recipientPhone}\`\n` +
      `📍 *آدرس:* ${o.recipientAddress}\n` +
      `💳 *روش پرداخت:* ${o.paymentMethod === 'online' ? 'درگاه آنلاین' : o.paymentMethod}\n` +
      `📊 *وضعیت فعلی:* ${st.icon} *${st.label}*\n` +
      `💰 *مبلغ نهایی:* *${fmt(o.total)} تومان*\n` +
      `🗓 *تاریخ ثبت:* ${o.date}\n\n` +
      `📦 *اقلام سفارش:*\n${itemsList}\n\n` +
      `جهت تغییر وضعیت روی یکی از گزینه‌ها بزنید:`;

    await editOrReply(ctx, text, makeOrderDetailKeyboard(o.id));
  }

  async function updateOrderStatus(ctx: Context, orderId: string, nextStatus: string): Promise<void> {
    const stConfig = ORDER_STATUS_MAP[nextStatus];
    if (!stConfig) return;

    if (nextStatus === 'cancelled') {
      await db.transaction(async (tx) => {
        const orderList = await tx.select().from(orders).where(eq(orders.id, orderId));
        const order = orderList[0];
        if (!order || order.status === 'cancelled') return;

        await restockItemsAndRefundPoints(tx, orderId, order.userId, order.vipPointsUsed);
        await tx.update(orders).set({ status: 'cancelled', statusText: stConfig.text }).where(eq(orders.id, orderId));
      });
      appCache.invalidate('products');
    } else {
      await db.update(orders).set({ status: nextStatus, statusText: stConfig.text }).where(eq(orders.id, orderId));
    }

    logAudit('order.status.update', `bale-${ctx.from?.id}`, orderId, { status: nextStatus });
    await ctx.answerCallbackQuery({ text: `✅ وضعیت سفارش به «${stConfig.label}» تغییر یافت` }).catch(() => {});
    await showOrderDetail(ctx, orderId);
  }

  async function showCouponsList(ctx: Context, page: number): Promise<void> {
    const pageSize = 5;
    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(coupons);
    const total = Number(countRow?.count ?? 0);
    const totalPages = Math.ceil(total / pageSize) || 1;
    const curPage = Math.max(0, Math.min(page, totalPages - 1));

    const rows = await db.select().from(coupons).limit(pageSize).offset(curPage * pageSize);

    if (rows.length === 0) {
      const kb = new InlineKeyboard().text('➕ ساخت اولین کوپن', 'm:cp_new').text('🏠 منوی اصلی', 'm:menu');
      await editOrReply(ctx, '🏷 هیچ کد تخفیفی ثبت نشده است.', kb);
      return;
    }

    const kb = new InlineKeyboard();
    let text = `🏷 *فهرست کدهای تخفیف* (صفحه ${curPage + 1} از ${totalPages}):\n\n`;
    for (const c of rows) {
      const statusIcon = c.active ? '🟢' : '🔴';
      text += `▫️ *${c.code}* (${c.percent ? `${fmt(c.percent)}%` : `${fmt(c.amount || 0)} ت`}) — ${statusIcon}\n`;
      text += `   حداقل سفارش: ${fmt(c.minTotal)} ت | مصرف: ${fmt(c.usedCount)}\n`;
      kb.text(`${statusIcon} فعال/غیرفعال ${c.code}`, `cp:tog:${c.code}`)
        .text(`🗑 حذف`, `cp:del:${c.code}`)
        .row();
    }

    const navRow: { text: string; data: string }[] = [];
    if (curPage > 0) navRow.push({ text: '⬅️ قبل', data: `m:cp_list:${curPage - 1}` });
    if (curPage < totalPages - 1) navRow.push({ text: 'بعد ➡️', data: `m:cp_list:${curPage + 1}` });

    if (navRow.length > 0) {
      for (const b of navRow) kb.text(b.text, b.data);
      kb.row();
    }
    kb.text('➕ کد جدید', 'm:cp_new').text('🏠 منوی اصلی', 'm:menu');

    await editOrReply(ctx, text, kb);
  }

  async function showReviewsList(ctx: Context, page: number): Promise<void> {
    const pageSize = 4;
    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(reviews);
    const total = Number(countRow?.count ?? 0);
    const totalPages = Math.ceil(total / pageSize) || 1;
    const curPage = Math.max(0, Math.min(page, totalPages - 1));

    const rows = await db.select().from(reviews).orderBy(desc(reviews.date)).limit(pageSize).offset(curPage * pageSize);

    if (rows.length === 0) {
      const kb = new InlineKeyboard().text('🏠 منوی اصلی', 'm:menu');
      await editOrReply(ctx, '⭐ هیچ نظری ثبت نشده است.', kb);
      return;
    }

    const kb = new InlineKeyboard();
    let text = `⭐ *نظرات ثبت‌شده کاربران* (صفحه ${curPage + 1} از ${totalPages}):\n\n`;

    for (const r of rows) {
      const st = r.approved ? '✅ تأیید شده' : '⏳ در انتظار / رد';
      text += `▫️ *${r.userName}* (${'⭐'.repeat(r.rating)}) [${st}]\n`;
      text += `«${r.comment.slice(0, 70)}${r.comment.length > 70 ? '...' : ''}»\n`;

      if (!r.approved) {
        kb.text(`✅ تأیید نظر`, `rv:app:${r.id}`);
      } else {
        kb.text(`❌ رد نظر`, `rv:rej:${r.id}`);
      }
      kb.text(`🗑 حذف`, `rv:del:${r.id}`).row();
    }

    const navRow: { text: string; data: string }[] = [];
    if (curPage > 0) navRow.push({ text: '⬅️ قبل', data: `m:rv_list:${curPage - 1}` });
    if (curPage < totalPages - 1) navRow.push({ text: 'بعد ➡️', data: `m:rv_list:${curPage + 1}` });

    if (navRow.length > 0) {
      for (const b of navRow) kb.text(b.text, b.data);
      kb.row();
    }
    kb.text('💬 نظرات و پیام‌ها', 'm:sec_msg').text('🏠 منوی اصلی', 'm:menu');

    await editOrReply(ctx, text, kb);
  }

  async function showContactMessagesList(ctx: Context, page: number): Promise<void> {
    const pageSize = 4;
    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(contactMessages);
    const total = Number(countRow?.count ?? 0);
    const totalPages = Math.ceil(total / pageSize) || 1;
    const curPage = Math.max(0, Math.min(page, totalPages - 1));

    const rows = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(pageSize).offset(curPage * pageSize);

    if (rows.length === 0) {
      const kb = new InlineKeyboard().text('🏠 منوی اصلی', 'm:menu');
      await editOrReply(ctx, '📩 پیامی در فرم تماس با ما ثبت نشده است.', kb);
      return;
    }

    const kb = new InlineKeyboard();
    let text = `📩 *پیام‌های دریافتی فرم تماس* (صفحه ${curPage + 1} از ${totalPages}):\n\n`;

    for (const m of rows) {
      const isUnread = m.status === 'unread';
      text += `${isUnread ? '🔴' : '⚪'} *${m.name}* (${m.phone || m.email})\n`;
      text += `موضوع: *${m.subject || 'بدون موضوع'}*\n`;
      text += `«${m.message.slice(0, 80)}...»\n`;

      if (isUnread) {
        kb.text(`✔️ خوانده شد`, `cm:read:${m.id}`);
      }
      kb.text(`🗄️ آرشیو`, `cm:arc:${m.id}`).row();
    }

    const navRow: { text: string; data: string }[] = [];
    if (curPage > 0) navRow.push({ text: '⬅️ قبل', data: `m:cm_list:${curPage - 1}` });
    if (curPage < totalPages - 1) navRow.push({ text: 'بعد ➡️', data: `m:cm_list:${curPage + 1}` });

    if (navRow.length > 0) {
      for (const b of navRow) kb.text(b.text, b.data);
      kb.row();
    }
    kb.text('💬 نظرات و پیام‌ها', 'm:sec_msg').text('🏠 منوی اصلی', 'm:menu');

    await editOrReply(ctx, text, kb);
  }

  async function showUserDetail(ctx: Context, uId: string): Promise<void> {
    const u = await db.query.users.findFirst({ where: eq(users.id, uId) });
    if (!u) {
      await ctx.reply('مشتری یافت نشد.', { reply_markup: makeMainMenuKeyboard() });
      return;
    }

    const [orderCountRow] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.userId, u.id));
    const totalUserOrders = Number(orderCountRow?.count ?? 0);

    const text =
      `👤 *مشخصات مشتری*\n\n` +
      `▫️ *نام:* ${u.name}\n` +
      `▫️ *شماره موبایل:* \`${u.phone}\`\n` +
      `▫️ *نقش کاربری:* ${u.role === 'admin' ? '🛡 مدیر' : 'کاربر عادی'}\n` +
      `▫️ *امتیاز باشگاه مشتریان (VIP):* 🔥 *${fmt(u.vipPoints || 0)} امتیاز*\n` +
      `▫️ *تعداد سفارشات:* ${fmt(totalUserOrders)} سفارش\n\n` +
      `جهت تشویق و وفادارسازی مشتری، می‌توانید امتیاز هدیه اعطا کنید:`;

    const kb = new InlineKeyboard()
      .text('🎁 +۵۰ امتیاز', `u:vip:${u.id}:50`)
      .text('🎁 +۱۰۰ امتیاز', `u:vip:${u.id}:100`)
      .row()
      .text('🔍 جستجوی مشتری دیگر', 'm:usr_srch')
      .text('🏠 منوی اصلی', 'm:menu');

    await editOrReply(ctx, text, kb);
  }

  async function showSettingsMenu(ctx: Context): Promise<void> {
    const isBarOn = (await db.query.storeSettings.findFirst({ where: eq(storeSettings.key, 'announcementBarEnabled') }))?.value === 'true';
    const barTxt = (await db.query.storeSettings.findFirst({ where: eq(storeSettings.key, 'announcementBarText') }))?.value || '—';
    const freeTh = (await db.query.storeSettings.findFirst({ where: eq(storeSettings.key, 'freeShippingThreshold') }))?.value || '500000';

    const text =
      `⚙️ *تنظیمات فروشگاه و وب‌سایت*\n\n` +
      `📢 *وضعیت نوار اعلان:* ${isBarOn ? '🟢 فعال' : '🔴 غیرفعال'}\n` +
      `📝 *متن اعلان:* «${barTxt}»\n` +
      `🚚 *حداقل مبلغ ارسال رایگان:* *${fmt(parseInt(freeTh, 10) || 0)} تومان*\n\n` +
      `برای تغییر هر یک از تنظیمات دکمه‌های زیر را لمس نمایید:`;

    await editOrReply(ctx, text, makeSettingsSectionKeyboard(isBarOn));
  }

  async function showLowStockAlerts(ctx: Context): Promise<void> {
    const rows = await db.select().from(products).where(sql`${products.stockQuantity} <= 5`).orderBy(products.stockQuantity).limit(8);

    if (rows.length === 0) {
      const kb = new InlineKeyboard().text('🏠 منوی اصلی', 'm:menu');
      await editOrReply(ctx, '✅ موجودی تمام کالاها کافی است (هیچ کالایی با ۵ عدد یا کمتر وجود ندارد).', kb);
      return;
    }

    const kb = new InlineKeyboard();
    let text = '⚠️ *هشدارهای انبار (کالاهای ۵ عدد یا کمتر):*\n\n';

    for (const p of rows) {
      const isZero = p.stockQuantity === 0;
      text += `▫️ ${p.title} — موجودی: *${isZero ? '🔴 ناموجود' : `${fmt(p.stockQuantity)} عدد`}*\n`;
      kb.text(`➕۵ به «${p.title.slice(0, 16)}...»`, `p:s:${p.id}:5`).row();
    }

    kb.text('🔄 به‌روزرسانی', 'm:alert').text('🏠 منوی اصلی', 'm:menu');
    await editOrReply(ctx, text, kb);
  }

  async function showStoreStats(ctx: Context): Promise<void> {
    const [pCount] = await db.select({ count: sql<number>`count(*)` }).from(products);
    const [oCount] = await db.select({ count: sql<number>`count(*)` }).from(orders);

    const revRow = await db.select({ total: sql<number>`sum(total)` }).from(orders).where(sql`status IN ('processing', 'shipped', 'delivered')`);
    const totalRevenue = revRow[0]?.total || 0;

    const [stockSum] = await db.select({ sum: sql<number>`sum(stockQuantity)` }).from(products);
    const [zeroStock] = await db.select({ count: sql<number>`count(*)` }).from(products).where(sql`${products.stockQuantity} = 0`);
    const [lowStock] = await db.select({ count: sql<number>`count(*)` }).from(products).where(sql`${products.stockQuantity} <= 5`);
    const [pendingOrders] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(sql`status IN ('pending_payment', 'processing')`);
    const [unreadMsgs] = await db.select({ count: sql<number>`count(*)` }).from(contactMessages).where(eq(contactMessages.status, 'unread'));

    const text =
      '📊 *داشبورد عملکرد و وضعیت زنده فروشگاه*\n\n' +
      `📦 *تنوع محصولات:* ${fmt(Number(pCount?.count ?? 0))} کالا\n` +
      `🔢 *مجموع موجودی انبار:* ${fmt(Number(stockSum?.sum ?? 0))} قلم کالا\n` +
      `🔴 *کالاهای ناموجود:* ${fmt(Number(zeroStock?.count ?? 0))} مورد\n` +
      `⚠️ *کالاهای کم‌موجودی:* ${fmt(Number(lowStock?.count ?? 0))} مورد\n\n` +
      `🛒 *مجموع کل سفارش‌ها:* ${fmt(Number(oCount?.count ?? 0))} سفارش\n` +
      `⏳ *سفارش‌های در جریان:* ${fmt(Number(pendingOrders?.count ?? 0))} سفارش\n` +
      `💳 *کل فروش موفق:* *${fmt(totalRevenue)} تومان*\n` +
      `📩 *پیام‌های خوانده‌نشده:* ${fmt(Number(unreadMsgs?.count ?? 0))} پیام`;

    const kb = new InlineKeyboard().text('🔄 به‌روزرسانی آمار', 'm:stat').text('🏠 منوی اصلی', 'm:menu');
    await editOrReply(ctx, text, kb);
  }

  async function showHelp(ctx: Context): Promise<void> {
    const text =
      '❓ *راهنمای داشبورد مدیریت فروشگاه Janebi Arena*\n\n' +
      'این ربات یک پنل کامل مدیریت فروشگاهی بر بستر دکمه‌های شیشه‌ای است:\n\n' +
      '📦 *کالاها:* ثبت جدید، مرور بر اساس دسته‌بندی، تغییر فوری موجودی با +/-، تغییر قیمت و درصد تخفیف.\n' +
      '🛍 *سفارش‌ها:* مشاهده فیلترشده سفارشات، جزئیات آدرس و تغییر وضعیت به پردازش/ارسال/تحویل یا لغو با بازگشت موجودی.\n' +
      '🏷 *کوپن‌ها:* ساخت سریع کد تخفیف درصدی، فعال و غیرفعال‌سازی با یک کلیک.\n' +
      '💬 *نظرات و پیام‌ها:* تأیید و رد نظرات کاربران (با به‌روزرسانی زنده ستاره‌های کالا) و مشاهده فرم‌های تماس.\n' +
      '👥 *مشتریان:* استعلام مشتری با شماره موبایل و اعطای امتیازات باشگاه وفاداری (VIP).\n' +
      '⚙️ *تنظیمات:* مدیریت پیام نوار بالای سایت و سقف ارسال رایگان.';

    const kb = new InlineKeyboard().text('🏠 بازگشت به منوی اصلی', 'm:menu');
    await editOrReply(ctx, text, kb);
  }

  // Polling initialization
  await bot.api.deleteWebhook({ drop_pending_updates: false });
  bot.start({ onStart: () => console.log('✅ Bale bot polling @janebiarenabot with full inline controls') });

  return bot;
}
