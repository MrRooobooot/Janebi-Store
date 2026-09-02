/**
 * Bale bot on Cloudflare Workers — webhook receiver + product uploader.
 * Grammy (MIT) pointed at tapi.bale.ai; each update handled in the request,
 * then worker responds 200 immediately (no polling, no persistent process).
 *
 * Product upload calls the existing store admin API on janebiarena.ir —
 * validation, audit log, and cache invalidation stay server-side.
 *
 * Draft state per chat lives in DO-free KV (short TTL) — the flow is a
 * single-user admin conversation so eventual consistency is fine.
 */
import { Bot, GrammyError, type Context, type BotError } from 'grammy';

interface Env {
  BALE_BOT_TOKEN: string;
  WEBHOOK_SECRET: string;
  STORE_ADMIN_TOKEN: string;
  STORE_API: string;
  BALE_ADMIN_CHAT_IDS: string;
  DRAFTS: KVNamespace;
}

const CATEGORIES = [
  'قاب و کاور موبایل', 'گلس و محافظ صفحه', 'کابل و سیم', 'شارژر و آداپتور',
  'هندزفری و ایرباد', 'پاوربانک', 'هولدر و نگهدارنده', 'هدفون و هدست',
  'تبدیل و مبدل', 'دانگل و تجهیزات اتصال', 'شارژر', 'قاب و کاور',
  'لوازم جانبی خودرو', 'لوازم جانبی ساعت هوشمند', 'لوازم گیمینگ موبایل',
  'محافظ کابل', 'هندزفری', 'هولدر و پایه', 'کابل', 'گلس',
];

const fmt = (n: number) => n.toLocaleString('fa-IR');
const fa2en = (s: string) => s.replace(/[۰-۹]/g, (ch) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch)));

async function createProduct(env: Env, body: Record<string, unknown>): Promise<{ id: number }> {
  const res = await fetch(`${env.STORE_API}/admin/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.STORE_ADMIN_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Store API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function botFor(env: Env): Bot {
  const bot = new Bot(env.BALE_BOT_TOKEN, { client: { apiRoot: 'https://tapi.bale.ai' } });
  const adminIds = env.BALE_ADMIN_CHAT_IDS.split(',').map((s) => parseInt(s.trim(), 10)).filter(Number.isFinite);
  const isAdmin = (ctx: Context) => !!ctx.from?.id && adminIds.includes(ctx.from.id);

  bot.catch((err: BotError) => {
    console.error('[bale-worker]', err instanceof GrammyError ? `${err.message} (${err.method})` : err);
  });

  bot.command('start', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('⛔ دسترسی فقط برای مدیران فروشگاه.');
    await ctx.reply(
      '🛍 ربات بارگذاری محصول Janebi Arena\n\n' +
      '/new — ثبت محصول جدید\n/cancel — لغو\n/categories — فهرست دسته‌ها'
    );
  });

  bot.command('categories', async (ctx) => {
    if (!isAdmin(ctx)) return;
    await ctx.reply('دسته‌های مجاز:\n' + CATEGORIES.map((c, i) => `${fmt(i + 1)}. ${c}`).join('\n'));
  });

  bot.command('cancel', async (ctx) => {
    await env.DRAFTS.delete(String(ctx.from!.id));
    await ctx.reply('لغو شد.');
  });

  bot.command('new', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('⛔ دسترسی فقط برای مدیران فروشگاه.');
    await env.DRAFTS.put(String(ctx.from!.id), JSON.stringify({ step: 'title' }), { expirationTtl: 3600 });
    await ctx.reply('🏷 نام محصول را بفرست:');
  });

  bot.on('message:text', async (ctx) => {
    if (!isAdmin(ctx)) return;
    const key = String(ctx.from!.id);
    const raw = await env.DRAFTS.get(key);
    if (!raw) { await ctx.reply('برای شروع /new را بفرست.'); return; }
    const d = JSON.parse(raw) as Record<string, any>;
    const t = ctx.message.text.trim();

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
        await ctx.reply('🖼 لینک عکس محصول را بفرست (یا /skip):');
        break;
      case 'photo':
        if (t !== '/skip' && !/^https?:\/\//.test(t)) { await ctx.reply('لینک نامعتبر. آدرس http(s) عکس یا /skip:'); return; }
        d.photoUrl = t === '/skip' ? '/placeholder-product.svg' : t;
        d.step = 'confirm';
        await ctx.reply(
          '✅ تأیید؟\n' +
          `نام: ${d.title}\nدسته: ${d.category}\nقیمت: ${fmt(d.price)} تومان\n` +
          `موجودی: ${d.stock}\nبرند: ${d.brand}\nگارانتی: ${d.warranty || '—'}\n` +
          `توضیحات: ${d.description || '—'}\nعکس: ${d.photoUrl}\n\n/yes ثبت — /cancel لغو`
        );
        break;
      case 'confirm':
        if (t === '/yes') {
          try {
            const inserted = await createProduct(env, {
              title: d.title, category: d.category, price: d.price,
              image: d.photoUrl, brand: d.brand || 'متفرقه',
              warranty: d.warranty, description: d.description,
              stockQuantity: d.stock,
            });
            await env.DRAFTS.delete(key);
            await ctx.reply(`🎉 ثبت شد — id: ${inserted.id}\nhttps://janebiarena.ir/products/${inserted.id}`);
          } catch (e: any) {
            await ctx.reply(`❌ خطای ثبت: ${e.message}`);
          }
        } else {
          await ctx.reply('/yes برای ثبت یا /cancel برای لغو.');
        }
        break;
    }
    await env.DRAFTS.put(key, JSON.stringify(d), { expirationTtl: 3600 });
  });

  bot.on('message:photo', async (ctx) => {
    if (isAdmin(ctx)) await ctx.reply('فعلاً فقط لینک عکس. آپلود مستقیم فایل در نسخه بعد.');
  });

  return bot;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') return new Response('ok');
    const url = new URL(request.url);
    if (url.pathname !== '/webhook') return new Response('not found', { status: 404 });

    // Telegram/Bale secret-token header check
    if (env.WEBHOOK_SECRET && request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) {
      return new Response('forbidden', { status: 403 });
    }

    const update = await request.json();
    console.log('[bale-worker] update received:', JSON.stringify(update).slice(0, 200));
    const bot = botFor(env);
    try {
      // Webhook mode never calls bot.start(), so init explicitly (cached getMe).
      await bot.init();
      await bot.handleUpdate(update as any);
      console.log('[bale-worker] update handled ok');
    } catch (e: any) {
      console.error('[bale-worker] handleUpdate failed:', e.message, e.stack?.slice(0, 400));
    }
    // Always 200 fast — Bale retries on non-2xx.
    return new Response('ok');
  },

  // One-shot setup: `wrangler dev --test-scheduled` or curl the route once.
  async scheduled(_event: any, env: Env): Promise<void> {
    const bot = botFor(env);
    await bot.api.setWebhook(`${env.STORE_API.replace('/api', '')}/bale-webhook`, { secret_token: env.WEBHOOK_SECRET });
  },
};
