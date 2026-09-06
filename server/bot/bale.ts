/**
 * Bale (بله) Bot — Full-featured Store & Inventory Management Assistant
 * Bale Bot API is Telegram-compatible at https://tapi.bale.ai (Grammy framework).
 *
 * Capabilities:
 * - 📱 100% Inline Keyboards (دکمه‌های شیشه‌ای) for all navigation and flows
 * - ➕ Interactive product creation wizard with category buttons, skip actions, and direct photo uploads
 * - 🖼 Native photo support: downloads images from Bale server, verifies magic bytes, and saves locally
 * - 📦 Inventory & stock management: quick +/- stock increments, price edits, site links, deletion
 * - 🔍 Instant product search by name or keyword
 * - 🛍 Recent orders inspection and one-tap status updates (processing, shipped, delivered, cancelled)
 * - ⚠️ Real-time low-stock inventory alerts
 * - 📊 Live store performance & revenue analytics
 * - 🛡 Financial integrity: transactional restock & point refund on order cancellation
 */

import { Bot, GrammyError, InlineKeyboard, type Context } from 'grammy';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  products,
  productFeatures,
  orders,
  orderItems,
  cartItems,
  wishlistItems,
  reviews,
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

export interface UserSession {
  mode: 'idle' | 'wizard' | 'edit_price' | 'search';
  wizard?: WizardDraft;
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
    entity: 'product',
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
// Category Provider
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
// Inline Keyboard Builders
// -------------------------------------------------------------
export function makeMainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('➕ ثبت محصول جدید', 'm:new')
    .row()
    .text('📦 لیست کالاها', 'm:p:0')
    .text('🔍 جستجوی کالا', 'm:srch')
    .row()
    .text('🛍 آخرین سفارش‌ها', 'm:o:0')
    .text('⚠️ هشدارهای انبار', 'm:alert')
    .row()
    .text('📊 آمار فروشگاه', 'm:stat')
    .text('❓ راهنما', 'm:help');
}

export function makeCancelKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('❌ انصراف و بازگشت', 'm:cancel');
}

export function makeCategoriesKeyboard(cats: string[], page: number): InlineKeyboard {
  const pageSize = 6;
  const totalPages = Math.ceil(cats.length / pageSize) || 1;
  const curPage = Math.max(0, Math.min(page, totalPages - 1));
  const slice = cats.slice(curPage * pageSize, (curPage + 1) * pageSize);

  const kb = new InlineKeyboard();
  for (let i = 0; i < slice.length; i += 2) {
    const idx1 = curPage * pageSize + i;
    kb.text(slice[i], `c:cat:${idx1}`);
    if (i + 1 < slice.length) {
      const idx2 = curPage * pageSize + i + 1;
      kb.text(slice[i + 1], `c:cat:${idx2}`);
    }
    kb.row();
  }

  const navRow: { text: string; data: string }[] = [];
  if (curPage > 0) {
    navRow.push({ text: '⬅️ صفحه قبل', data: `c:pg:${curPage - 1}` });
  }
  if (curPage < totalPages - 1) {
    navRow.push({ text: 'صفحه بعد ➡️', data: `c:pg:${curPage + 1}` });
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
    .url('🔗 مشاهده در سایت', `https://janebiarena.ir/products/${productId}`)
    .row()
    .text('🗑 حذف کالا', `p:del:${productId}`)
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
  try {
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
      await ctx.editMessageText(text, { reply_markup: replyMarkup });
      return;
    }
  } catch (err: any) {
    if (err.message?.includes('message is not modified')) {
      return;
    }
  }
  await ctx.reply(text, { reply_markup: replyMarkup });
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

  // --- Commands ---
  bot.command(['start', 'menu'], async (ctx) => {
    if (!isAdmin(ctx, cfg)) return ctx.reply('⛔ دسترسی فقط برای مدیران فروشگاه.');
    clearSession(ctx.from!.id);
    await ctx.reply(
      '🛍 *سامانه مدیریت و بارگذاری محصولات Janebi Arena*\n\n' +
      'از دکمه‌های شیشه‌ای زیر برای مدیریت فروشگاه، کالاها، سفارش‌ها و انبار استفاده کنید:',
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

    // Bale docs: answerCallbackQuery is mandatory to dismiss button loading state
    await ctx.answerCallbackQuery().catch(() => {});

    // 1. Menu Navigation
    if (data === 'm:menu') {
      clearSession(userId);
      await editOrReply(
        ctx,
        '🛍 *سامانه مدیریت و بارگذاری محصولات Janebi Arena*\n\n' +
        'از دکمه‌های شیشه‌ای زیر برای مدیریت فروشگاه استفاده کنید:',
        makeMainMenuKeyboard()
      );
      return;
    }

    if (data === 'm:cancel') {
      clearSession(userId);
      await editOrReply(ctx, 'عملیات لغو شد و به منوی اصلی بازگشتید.', makeMainMenuKeyboard());
      return;
    }

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

    if (data.startsWith('m:o:')) {
      const page = parseInt(data.replace('m:o:', ''), 10) || 0;
      await showOrdersList(ctx, page);
      return;
    }

    if (data === 'm:srch') {
      session.mode = 'search';
      await editOrReply(ctx, '🔍 لطفاً *نام یا کد کالای (SKU)* مورد نظر را ارسال کنید:', makeCancelKeyboard());
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

    if (data === 'm:help') {
      await showHelp(ctx);
      return;
    }

    // 2. Wizard Flow: Category Selection & Pagination
    if (data.startsWith('c:cat:')) {
      if (!session.wizard || session.wizard.step !== 'category') {
        await ctx.reply('مرحله منقضی شده است. لطفا دوباره شروع کنید.', { reply_markup: makeMainMenuKeyboard() });
        return;
      }
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
      await editOrReply(
        ctx,
        '📁 *دسته‌بندی محصول* را از دکمه‌های زیر انتخاب کنید:',
        makeCategoriesKeyboard(cats, page)
      );
      return;
    }

    // Wizard Quick Choices
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

    // Wizard Skip Buttons
    if (data.startsWith('w:skip:')) {
      if (!session.wizard) return;
      const step = data.replace('w:skip:', '');
      if (step === 'brand') {
        session.wizard.brand = 'متفرقه';
        session.wizard.step = 'warranty';
        await editOrReply(
          ctx,
          '🏭 برند: *متفرقه*\n\n🛡 *نوع گارانتی* را انتخاب کنید یا بنویسید:',
          makeWarrantyQuickKeyboard()
        );
        return;
      }
      if (step === 'warranty') {
        session.wizard.warranty = 'اصالت و سلامت فیزیکی';
        session.wizard.step = 'description';
        await editOrReply(
          ctx,
          '🛡 گارانتی: *اصالت و سلامت فیزیکی*\n\n📝 *توضیحات کالا* را بفرستید (یا رد شدن):',
          makeDescriptionQuickKeyboard()
        );
        return;
      }
      if (step === 'desc') {
        session.wizard.description = undefined;
        session.wizard.step = 'photo';
        await editOrReply(
          ctx,
          '📝 توضیحات رد شد.\n\n🖼 حالا *عکس کالا* را مستقیماً در همین چت بفرستید (یا لینک عکس را ارسال کنید):',
          makePhotoQuickKeyboard()
        );
        return;
      }
      if (step === 'photo') {
        session.wizard.photoUrl = '/placeholder-product.svg';
        session.wizard.step = 'confirm';
        await showProductConfirmation(ctx, session.wizard);
        return;
      }
    }

    // Wizard Final Confirmation
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

    // 3. Product Details & Stock Actions
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
      logAudit('product.stock.quick_update', `bale-${userId}`, String(prodId), {
        from: existing.stockQuantity,
        to: newStock,
        delta,
      });

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
        `💰 *ویرایش قیمت کالا*\n\n` +
        `کالا: *${p?.title || prodId}*\n` +
        `قیمت فعلی: *${fmt(p?.price || 0)} تومان*\n\n` +
        `لطفاً *قیمت جدید (تومان)* را بفرستید:`,
        makeCancelKeyboard()
      );
      return;
    }

    if (data.startsWith('p:del:')) {
      const prodId = parseInt(data.replace('p:del:', ''), 10);
      const p = await db.query.products.findFirst({ where: eq(products.id, prodId) });
      await editOrReply(
        ctx,
        `⚠️ *آیا از حذف محصول زیر اطمینان دارید؟*\n\n` +
        `▫️ *نام:* ${p?.title}\n` +
        `▫️ *شناسه:* ${prodId}\n\n` +
        `توجه: این عملیات قابل بازگشت نیست.`,
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

    // 4. Order Details & Status Actions
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
  });

  // --- Text Messages Handler ---
  bot.on('message:text', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    const userId = ctx.from.id;
    const session = getSession(userId);
    const text = ctx.message.text.trim();

    // 1. Search Mode
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
        kb.text(`📦 ${p.title.slice(0, 26)} (${fmt(p.stockQuantity)} عدد)`, `p:v:${p.id}`).row();
      }
      kb.text('🔍 جستجوی دیگر', 'm:srch').text('🏠 منوی اصلی', 'm:menu');

      await ctx.reply(`🔍 نتایج جستجو برای «${text}» (${results.length} مورد):`, { reply_markup: kb });
      return;
    }

    // 2. Editing Price Mode
    if (session.mode === 'edit_price' && session.editingProductId) {
      const newPrice = parsePrice(text);
      const prodId = session.editingProductId;
      if (!Number.isFinite(newPrice) || newPrice <= 0) {
        await ctx.reply('❌ مبلغ نامعتبر است. لطفاً عدد به تومان وارد کنید:', { reply_markup: makeCancelKeyboard() });
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

    // 3. Product Wizard
    if (session.mode === 'wizard' && session.wizard) {
      const d = session.wizard;

      switch (d.step) {
        case 'title': {
          d.title = text;
          d.step = 'category';
          d.catPage = 0;
          const cats = await getStoreCategories();
          await ctx.reply(
            `🏷 نام: *${d.title}*\n\n📁 لطفاً *دسته‌بندی محصول* را انتخاب کنید:`,
            { reply_markup: makeCategoriesKeyboard(cats, 0) }
          );
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
          await ctx.reply(
            `💰 قیمت: *${fmt(p)} تومان*\n\n📦 *تعداد موجودی اولیه* را ارسال کنید یا از دکمه‌های زیر انتخاب کنید:`,
            { reply_markup: makeStockQuickKeyboard() }
          );
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
          await ctx.reply(
            `📦 موجودی: *${fmt(s)} عدد*\n\n🏭 *برند کالا* را وارد کنید یا از گزینه‌های زیر انتخاب کنید:`,
            { reply_markup: makeBrandQuickKeyboard() }
          );
          break;
        }

        case 'brand': {
          d.brand = text || 'متفرقه';
          d.step = 'warranty';
          await ctx.reply(
            `🏭 برند: *${d.brand}*\n\n🛡 *نوع گارانتی* را ارسال کنید یا انتخاب نمایید:`,
            { reply_markup: makeWarrantyQuickKeyboard() }
          );
          break;
        }

        case 'warranty': {
          d.warranty = text || 'اصالت و سلامت فیزیکی';
          d.step = 'description';
          await ctx.reply(
            `🛡 گارانتی: *${d.warranty}*\n\n📝 *توضیحات کالا* را ارسال کنید (یا دکمه رد شدن):`,
            { reply_markup: makeDescriptionQuickKeyboard() }
          );
          break;
        }

        case 'description': {
          d.description = text;
          d.step = 'photo';
          await ctx.reply(
            '📝 توضیحات ذخیره شد.\n\n' +
            '🖼 *تصویر محصول* را بفرستید:\n' +
            'می‌توانید عکس را مستقیماً در همین چت ارسال کنید، یا آدرس اینترنتی (URL) آن را بفرستید، یا دکمه تصویر پیش‌فرض را بزنید:',
            { reply_markup: makePhotoQuickKeyboard() }
          );
          break;
        }

        case 'photo': {
          if (!/^https?:\/\//i.test(text)) {
            await ctx.reply('❌ لینک نامعتبر است. آدرس اینترنتی عکس معتبر بفرستید یا عکس را مستقیماً آپلود کنید:', {
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
          await ctx.reply('برای شروع از /new یا منوی اصلی استفاده کنید.', { reply_markup: makeMainMenuKeyboard() });
          break;
      }
      return;
    }

    // Default message when idle
    await ctx.reply('دستور نامشخص. برای شروع از دکمه‌های زیر استفاده کنید:', { reply_markup: makeMainMenuKeyboard() });
  });

  // --- Direct Photo Upload Handler ---
  bot.on('message:photo', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    const session = getSession(ctx.from.id);
    if (session.mode !== 'wizard' || !session.wizard || session.wizard.step !== 'photo') {
      await ctx.reply('در این مرحله نیازی به ارسال عکس نیست. مراحل را با منو دنبال کنید.', {
        reply_markup: makeMainMenuKeyboard(),
      });
      return;
    }

    const waitMsg = await ctx.reply('⏳ در حال دریافت و ذخیره تصویر از بله...');
    try {
      const photos = ctx.message.photo;
      const best = photos[photos.length - 1];
      const fileInfo = await bot.api.getFile(best.file_id);
      if (!fileInfo.file_path) {
        throw new Error('مسیر فایل از سرور بله دریافت نشد');
      }

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
    await ctx.reply('لطفاً تصویر را به‌صورت عکس (Photo) ارسال کنید، نه فایل سندی.', {
      reply_markup: makePhotoQuickKeyboard(),
    });
  });

  // --- Sub-views Implementation ---
  async function showProductConfirmation(ctx: Context, d: WizardDraft): Promise<void> {
    const summary =
      '📋 *پیش‌نمایش مشخصات محصول جدید*\n\n' +
      `▫️ *عنوان:* ${d.title}\n` +
      `▫️ *دسته‌بندی:* ${d.category}\n` +
      `▫️ *قیمت:* ${fmt(d.price!)} تومان\n` +
      `▫️ *موجودی:* ${fmt(d.stock!)} عدد\n` +
      `▫️ *برند:* ${d.brand}\n` +
      `▫️ *گارانتی:* ${d.warranty || '—'}\n` +
      `▫️ *توضیحات:* ${d.description || '—'}\n` +
      `▫️ *تصویر:* ${d.photoUrl}\n\n` +
      'جهت ثبت نهایی و انتشار در وب‌سایت دکمه تأیید را بزنید:';

    await ctx.reply(summary, { reply_markup: makeConfirmWizardKeyboard() });
  }

  async function showProductsList(ctx: Context, page: number): Promise<void> {
    const pageSize = 5;
    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(products);
    const total = Number(countRow?.count ?? 0);
    const totalPages = Math.ceil(total / pageSize) || 1;
    const curPage = Math.max(0, Math.min(page, totalPages - 1));

    const rows = await db
      .select()
      .from(products)
      .orderBy(desc(products.id))
      .limit(pageSize)
      .offset(curPage * pageSize);

    if (rows.length === 0) {
      const kb = new InlineKeyboard().text('➕ ثبت محصول جدید', 'm:new').text('🏠 منوی اصلی', 'm:menu');
      await editOrReply(ctx, '📦 هیچ محصولی در فروشگاه ثبت نشده است.', kb);
      return;
    }

    const kb = new InlineKeyboard();
    for (const p of rows) {
      kb.text(`📦 ${p.title.slice(0, 24)}... | ${fmt(p.price)} تومان`, `p:v:${p.id}`).row();
    }

    const navRow: { text: string; data: string }[] = [];
    if (curPage > 0) navRow.push({ text: '⬅️ صفحه قبل', data: `m:p:${curPage - 1}` });
    if (curPage < totalPages - 1) navRow.push({ text: 'صفحه بعد ➡️', data: `m:p:${curPage + 1}` });

    if (navRow.length > 0) {
      for (const b of navRow) kb.text(b.text, b.data);
      kb.row();
    }
    kb.text('➕ ثبت محصول جدید', 'm:new').text('🏠 منوی اصلی', 'm:menu');

    const message = `📦 *فهرست کالاهای فروشگاه* (صفحه ${curPage + 1} از ${totalPages} — مجموع: ${total} کالا):`;
    await editOrReply(ctx, message, kb);
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
      `▫️ *قیمت:* *${fmt(p.price)} تومان*\n` +
      `▫️ *موجودی انبار:* *${p.stockQuantity > 0 ? `${fmt(p.stockQuantity)} عدد` : '🔴 ناموجود'}*\n` +
      `▫️ *برند:* ${p.brand || 'متفرقه'}\n` +
      `▫️ *گارانتی:* ${p.warranty || '—'}\n` +
      `▫️ *کد کالا (SKU):* \`${p.sku || '—'}\`\n\n` +
      `از دکمه‌های شیشه‌ای زیر برای تغییر فوری موجودی یا قیمت استفاده کنید:`;

    await editOrReply(ctx, text, makeProductDetailKeyboard(p.id, p.stockQuantity));
  }

  async function showOrdersList(ctx: Context, page: number): Promise<void> {
    const pageSize = 5;
    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const total = Number(countRow?.count ?? 0);
    const totalPages = Math.ceil(total / pageSize) || 1;
    const curPage = Math.max(0, Math.min(page, totalPages - 1));

    const rows = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.date))
      .limit(pageSize)
      .offset(curPage * pageSize);

    if (rows.length === 0) {
      const kb = new InlineKeyboard().text('🏠 منوی اصلی', 'm:menu');
      await editOrReply(ctx, '🛍 هنوز سفارشی در سیستم ثبت نشده است.', kb);
      return;
    }

    const kb = new InlineKeyboard();
    for (const o of rows) {
      const st = ORDER_STATUS_MAP[o.status] || { icon: '▫️', label: o.statusText };
      const shortId = o.id.length > 12 ? o.id.slice(0, 10) + '..' : o.id;
      kb.text(`${st.icon} ${shortId} | ${o.recipientName} | ${fmt(o.total)} ت`, `o:v:${o.id}`).row();
    }

    const navRow: { text: string; data: string }[] = [];
    if (curPage > 0) navRow.push({ text: '⬅️ صفحه قبل', data: `m:o:${curPage - 1}` });
    if (curPage < totalPages - 1) navRow.push({ text: 'صفحه بعد ➡️', data: `m:o:${curPage + 1}` });

    if (navRow.length > 0) {
      for (const b of navRow) kb.text(b.text, b.data);
      kb.row();
    }
    kb.text('🏠 منوی اصلی', 'm:menu');

    const msg = `🛍 *آخرین سفارش‌های ثبت‌شده* (صفحه ${curPage + 1} از ${totalPages} — مجموع: ${total}):\nبرای مشاهده جزییات و تغییر وضعیت هر سفارش، روی آن کلیک کنید:`;
    await editOrReply(ctx, msg, kb);
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
      `📍 *آدرس تحویل:* ${o.recipientAddress}\n` +
      `💳 *روش پرداخت:* ${o.paymentMethod === 'online' ? 'درگاه آنلاین' : o.paymentMethod}\n` +
      `📊 *وضعیت فعلی:* ${st.icon} *${st.label}*\n` +
      `💰 *مبلغ نهایی:* *${fmt(o.total)} تومان*\n` +
      `🗓 *تاریخ:* ${o.date}\n\n` +
      `📦 *اقلام سفارش:*\n${itemsList}\n\n` +
      `تغییر وضعیت سفارش:`;

    await editOrReply(ctx, text, makeOrderDetailKeyboard(o.id));
  }

  async function updateOrderStatus(ctx: Context, orderId: string, nextStatus: string): Promise<void> {
    const stConfig = ORDER_STATUS_MAP[nextStatus];
    if (!stConfig) return;

    if (nextStatus === 'cancelled') {
      await db.transaction(async (tx) => {
        const orderList = await tx.select().from(orders).where(eq(orders.id, orderId));
        const order = orderList[0];
        if (!order) return;
        if (order.status === 'cancelled') return;

        await restockItemsAndRefundPoints(tx, orderId, order.userId, order.vipPointsUsed);
        await tx.update(orders)
          .set({ status: 'cancelled', statusText: stConfig.text })
          .where(eq(orders.id, orderId));
      });
      appCache.invalidate('products');
    } else {
      await db.update(orders)
        .set({ status: nextStatus, statusText: stConfig.text })
        .where(eq(orders.id, orderId));
    }

    logAudit('order.status.update', `bale-${ctx.from?.id}`, orderId, { status: nextStatus });
    await ctx.answerCallbackQuery({ text: `✅ وضعیت سفارش به «${stConfig.label}» تغییر یافت` }).catch(() => {});
    await showOrderDetail(ctx, orderId);
  }

  async function showLowStockAlerts(ctx: Context): Promise<void> {
    const rows = await db
      .select()
      .from(products)
      .where(sql`${products.stockQuantity} <= 5`)
      .orderBy(products.stockQuantity)
      .limit(8);

    if (rows.length === 0) {
      const kb = new InlineKeyboard().text('🏠 منوی اصلی', 'm:menu');
      await editOrReply(ctx, '✅ موجودی تمام کالاها کافی است (هیچ کالایی با موجودی ۵ یا کمتر وجود ندارد).', kb);
      return;
    }

    const kb = new InlineKeyboard();
    let text = '⚠️ *هشدارهای موجودی انبار (کالاهای ۵ عدد یا کمتر):*\n\n';

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

    const revRow = await db.select({ total: sql<number>`sum(total)` }).from(orders).where(
      sql`status IN ('processing', 'shipped', 'delivered')`
    );
    const totalRevenue = revRow[0]?.total || 0;

    const [stockSum] = await db.select({ sum: sql<number>`sum(stockQuantity)` }).from(products);
    const [zeroStock] = await db.select({ count: sql<number>`count(*)` }).from(products).where(sql`${products.stockQuantity} = 0`);
    const [lowStock] = await db.select({ count: sql<number>`count(*)` }).from(products).where(sql`${products.stockQuantity} <= 5`);
    const [pendingOrders] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(
      sql`status IN ('pending_payment', 'processing')`
    );

    const text =
      '📊 *داشبورد آماری فروشگاه Janebi Arena*\n\n' +
      `📦 *تنوع کل کالاها:* ${fmt(Number(pCount?.count ?? 0))} محصول\n` +
      `🔢 *مجموع موجودی انبار:* ${fmt(Number(stockSum?.sum ?? 0))} قلم کالا\n` +
      `🔴 *کالاهای ناموجود:* ${fmt(Number(zeroStock?.count ?? 0))} کالا\n` +
      `⚠️ *کالاهای کم‌موجودی:* ${fmt(Number(lowStock?.count ?? 0))} کالا\n\n` +
      `🛒 *مجموع کل سفارش‌ها:* ${fmt(Number(oCount?.count ?? 0))} سفارش\n` +
      `⏳ *سفارش‌های در جریان:* ${fmt(Number(pendingOrders?.count ?? 0))} سفارش\n` +
      `💳 *کل فروش موفق:* *${fmt(totalRevenue)} تومان*`;

    const kb = new InlineKeyboard().text('🔄 به‌روزرسانی آمار', 'm:stat').text('🏠 منوی اصلی', 'm:menu');
    await editOrReply(ctx, text, kb);
  }

  async function showHelp(ctx: Context): Promise<void> {
    const text =
      '❓ *راهنمای استفاده از ربات بله Janebi Arena*\n\n' +
      'این ربات تماماً بر پایه دکمه‌های شیشه‌ای (Inline) طراحی شده است:\n\n' +
      '🔹 *ثبت محصول جدید:* نام، دسته، قیمت، موجودی، برند، گارانتی، توضیحات و آپلود مستقیم عکس با چند کلیک ساده.\n' +
      '🔹 *مدیریت کالاها:* مشاهده مشخصات، تغییر فوری موجودی با دکمه‌های +/-، ویرایش قیمت و حذف کالا.\n' +
      '🔹 *جستجو:* یافتن سریع هر محصول با ارسال نام یا کد SKU.\n' +
      '🔹 *سفارشات:* مشاهده لیست آخرین سفارشات، اقلام، مشتری و تغییر وضعیت به پردازش/ارسال/تحویل/لغو.\n' +
      '🔹 *هشدارهای انبار:* کالاهای رو به اتمام با امکان شارژ سریع موجودی.\n\n' +
      'فرمان‌های متنی پشتیبانی‌شده:\n' +
      '/start یا /menu — باز کردن منوی اصلی\n' +
      '/new — ثبت سریع کالا\n' +
      '/list — فهرست کالاها\n' +
      '/orders — آخرین سفارش‌ها\n' +
      '/alerts — هشدارهای انبار\n' +
      '/stats — آمار فروشگاه\n' +
      '/cancel — انصراف از عملیات جاری';

    const kb = new InlineKeyboard().text('🏠 بازگشت به منوی اصلی', 'm:menu');
    await editOrReply(ctx, text, kb);
  }

  // Polling initialization
  await bot.api.deleteWebhook({ drop_pending_updates: false });
  bot.start({ onStart: () => console.log('✅ Bale bot polling @janebiarenabot with full inline controls') });

  return bot;
}
