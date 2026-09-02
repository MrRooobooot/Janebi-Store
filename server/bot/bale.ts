/**
 * Bale (بله) bot — product upload for Janebi Arena.
 * Bale's bot API is Telegram-compatible at https://tapi.bale.ai — we use the
 * open-source Grammy framework (MIT) pointed at Bale's apiRoot.
 *
 * Flow: /start → admin check → /new → guided conversation (title → category →
 * price → stock → brand → warranty → description → photo) → insert via Drizzle
 * + appCache.invalidate — same write path as POST /api/admin/products.
 */
import { Bot, GrammyError, type Context } from 'grammy';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products, productFeatures, auditLogs } from '../db/schema.js';
import { appCache } from '../utils/cache.js';

const BALE_API_ROOT = 'https://tapi.bale.ai';

function logAudit(action: string, adminUserId: string, entityId: string, meta: Record<string, unknown> = {}): void {
  db.insert(auditLogs).values({
    id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    adminUserId,
    action,
    entity: 'product',
    entityId,
    meta,
    createdAt: new Date().toISOString()
  }).catch((err) => console.error('Audit log write failed:', err));
}

export interface BaleBotConfig {
  token: string;
  adminChatIds: number[]; // Bale numeric chat ids allowed to upload
}

interface Draft {
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
  originalPrice?: number;
  stock?: number;
  brand?: string;
  warranty?: string;
  description?: string;
  photoUrl?: string;
}

const CATEGORIES = [
  'قاب و کاور موبایل', 'گلس و محافظ صفحه', 'کابل و سیم', 'شارژر و آداپتور',
  'هندزفری و ایرباد', 'پاوربانک', 'هولدر و نگهدارنده', 'هدفون و هدست',
  'تبدیل و مبدل', 'دانگل و تجهیزات اتصال', 'شارژر', 'قاب و کاور',
  'لوازم جانبی خودرو', 'لوازم جانبی ساعت هوشمند', 'لوازم گیمینگ موبایل',
  'محافظ کابل', 'هندزفری', 'هولدر و پایه', 'کابل', 'گلس',
];

const drafts = new Map<number, Draft>();
const fmt = (n: number) => n.toLocaleString('fa-IR');

function isAdmin(ctx: Context, cfg: BaleBotConfig): boolean {
  const id = ctx.from?.id;
  return !!id && cfg.adminChatIds.includes(id);
}

async function loadAdminChatIds(db: any): Promise<number[]> {
  // Admin chat ids come from store settings key `bale_admin_chat_ids`
  // (comma-separated numeric ids) managed via the admin panel settings API.
  try {
    const { storeSettings } = await import('../db/schema.js');
    const row = await db.select().from(storeSettings).where(eq(storeSettings.key, 'bale_admin_chat_ids')).limit(1);
    if (row[0]?.value) {
      return row[0].value.split(',').map((s: string) => parseInt(s.trim(), 10)).filter(Number.isFinite);
    }
  } catch { /* settings table may be absent in some environments */ }
  return [];
}

export async function startBaleBot(token: string, adminChatIds: number[]) {
  const bot = new Bot(token, { client: { apiRoot: BALE_API_ROOT } });
  const cfg: BaleBotConfig = { token, adminChatIds };

  bot.catch((err) => {
    console.error('[bale-bot] error:', err instanceof GrammyError ? `${err.message} (${err.method})` : err);
  });

  bot.command('start', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return ctx.reply('⛔ دسترسی فقط برای مدیران فروشگاه.');
    await ctx.reply(
      '🛍 ربات بارگذاری محصول Janebi Arena\n\n' +
      '/new — ثبت محصول جدید\n/cancel — لغو\n/categories — فهرست دسته‌ها\n/list — آخرین ۵ محصول'
    );
  });

  bot.command('categories', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    await ctx.reply('دسته‌های مجاز:\n' + CATEGORIES.map((c, i) => `${fmt(i + 1)}. ${c}`).join('\n'));
  });

  bot.command('cancel', async (ctx) => {
    drafts.delete(ctx.from!.id);
    await ctx.reply('لغو شد.');
  });

  bot.command('list', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    const rows = await db.select().from(products).orderBy(products.id).limit(200);
    const last = rows.slice(-5).reverse();
    await ctx.reply(last.map((p) => `${p.title}\n${fmt(p.price)} تومان — دسته: ${p.category} — موجودی: ${p.stockQuantity} — id: ${p.id}`).join('\n———\n') || 'محصولی نیست.');
  });

  bot.command('new', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return ctx.reply('⛔ دسترسی فقط برای مدیران فروشگاه.');
    drafts.set(ctx.from!.id, { step: 'title' });
    await ctx.reply('🏷 نام محصول را بفرست:');
  });

  bot.on('message:text', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    const id = ctx.from!.id;
    const d = drafts.get(id);
    if (!d) {
      await ctx.reply('برای شروع /new را بفرست.');
      return;
    }
    const t = ctx.message.text.trim();
    const fa2en = (s: string) => s.replace(/[۰-۹]/g, (ch) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch)));
    switch (d.step) {
      case 'title':
        d.title = t; d.step = 'category';
        await ctx.reply('📁 دسته (عدد از /categories یا نام دقیق):');
        break;
      case 'category': {
        const n = parseInt(fa2en(t), 10);
        const cat = Number.isFinite(n) && CATEGORIES[n - 1] ? CATEGORIES[n - 1] : CATEGORIES.find((c) => c === t);
        if (!cat) { await ctx.reply('دسته نامعتبر. عدد یا نام دقیق از /categories:'); return; }
        d.category = cat; d.step = 'price';
        await ctx.reply('💰 قیمت (تومان):');
        break;
      }
      case 'price': {
        const p = parseInt(fa2en(t).replace(/[^\d]/g, ''), 10);
        if (!Number.isFinite(p) || p <= 0) { await ctx.reply('قیمت نامعتبر. عدد به تومان:'); return; }
        d.price = p; d.step = 'stock';
        await ctx.reply('📦 موجودی (عدد):');
        break;
      }
      case 'stock': {
        const s = parseInt(fa2en(t).replace(/[^\d]/g, ''), 10);
        if (!Number.isFinite(s) || s < 0) { await ctx.reply('موجودی نامعتبر:'); return; }
        d.stock = s; d.step = 'brand';
        await ctx.reply('🏭 برند (Enter برای «متفرقه»):');
        break;
      }
      case 'brand':
        d.brand = t || 'متفرقه'; d.step = 'warranty';
        await ctx.reply('🛡 گارانتی (Enter برای «بدون گارانتی»):');
        break;
      case 'warranty':
        d.warranty = t || undefined; d.step = 'description';
        await ctx.reply('📝 توضیحات (Enter برای رد شدن):');
        break;
      case 'description':
        d.description = t || undefined; d.step = 'photo';
        await ctx.reply(
          '🖼 لینک عکس محصول را بفرست (یا /skip برای بدون عکس):\n' +
          `${d.title}\nدسته: ${d.category} — ${fmt(d.price!)} تومان — موجودی: ${d.stock}`
        );
        break;
      case 'photo':
        if (t !== '/skip' && !/^https?:\/\//.test(t)) {
          await ctx.reply('لینک نامعتبر. آدرس http(s) عکس یا /skip:');
          return;
        }
        d.photoUrl = t === '/skip' ? '/placeholder-product.svg' : t;
        d.step = 'confirm';
        await ctx.reply(
          '✅ تأیید؟\n' +
          `نام: ${d.title}\nدسته: ${d.category}\nقیمت: ${fmt(d.price!)} تومان\n` +
          `موجودی: ${d.stock}\nبرند: ${d.brand}\nگارانتی: ${d.warranty || '—'}\n` +
          `توضیحات: ${d.description || '—'}\nعکس: ${d.photoUrl}\n\n/yes ثبت — /cancel لغو`
        );
        break;
      case 'confirm':
        if (t === '/yes') {
          try {
            const [inserted] = await db.insert(products).values({
              title: d.title!,
              category: d.category!,
              price: d.price!,
              originalPrice: d.originalPrice ?? null,
              discount: 0,
              image: d.photoUrl!,
              brand: d.brand || 'متفرقه',
              warranty: d.warranty,
              description: d.description,
              stockQuantity: d.stock!,
              sku: `SKU-${Date.now()}`
            }).returning();
            appCache.invalidate('products');
            appCache.invalidate('categories');
            logAudit('product.create', `bale-${id}`, String(inserted.id), { title: inserted.title });
            drafts.delete(id);
            await ctx.reply(`🎉 ثبت شد — id: ${inserted.id}\nhttps://janebiarena.ir/products/${inserted.id}`);
          } catch (e: any) {
            await ctx.reply(`❌ خطای ثبت: ${e.message}`);
          }
        } else {
          await ctx.reply('/yes برای ثبت یا /cancel برای لغو.');
        }
        break;
    }
  });

  // Photo uploads: not supported in v1 — point the admin at URL or /skip
  bot.on('message:photo', async (ctx) => {
    if (!isAdmin(ctx, cfg)) return;
    await ctx.reply('فعلاً فقط لینک عکس. آپلود مستقیم فایل در نسخه بعد.');
  });

  // Long-polling — Bale supports getUpdates; deleteWebhook first to be safe.
  await bot.api.deleteWebhook({ drop_pending_updates: false });
  bot.start({ onStart: () => console.log('✅ Bale bot polling @janebiarenabot') });
  return bot;
}
