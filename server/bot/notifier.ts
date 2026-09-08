import { Bot, InlineKeyboard } from 'grammy';
import {
  storeEvents,
  OrderPaidEvent,
  LowStockEvent,
  ReviewCreatedEvent,
  ContactCreatedEvent,
} from '../services/events.js';

export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const fmt = (n: number) => n.toLocaleString('fa-IR');

// 30-minute cooldown cache to prevent spamming admins with repeated low stock alerts
const lowStockCooldown = new Map<number, number>();
const COOLDOWN_MS = 30 * 60 * 1000;

export function initBaleNotifier(bot: Bot, adminChatIds: number[]) {
  if (!adminChatIds || adminChatIds.length === 0) return;

  async function broadcast(text: string, replyMarkup?: InlineKeyboard): Promise<void> {
    const promises = adminChatIds.map(async (chatId) => {
      try {
        await bot.api.sendMessage(chatId, text, {
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        });
      } catch (err: any) {
        console.error(`[bale-notifier] Failed to notify admin ${chatId}:`, err?.message || err);
      }
    });

    await Promise.allSettled(promises);
  }

  // 1. Order Paid Notification
  storeEvents.on('order:paid', (event: OrderPaidEvent) => {
    setImmediate(async () => {
      try {
        const itemsText = event.items
          .map((it, idx) => `  ▫️ ${fmt(idx + 1)}. ${escapeHtml(it.title)} (${fmt(it.qty)} عدد)`)
          .join('\n');

        const message =
          `🛍 <b>سفارش جدید پرداخت‌شده!</b>\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `▫️ شماره سفارش: <code>${event.orderId}</code>\n` +
          `▫️ خریدار: <b>${escapeHtml(event.recipientName)}</b>\n` +
          `▫️ تلفن همراه: <code>${event.recipientPhone}</code>\n` +
          `▫️ روش پرداخت: ${escapeHtml(event.paymentMethod)}\n` +
          `▫️ مبلغ کل: <b>${fmt(event.total)} تومان</b>\n\n` +
          `📦 <b>اقلام خریداری‌شده:</b>\n${itemsText || '  (بدون اقلام)'}`;

        const kb = new InlineKeyboard()
          .text('🔄 شروع پردازش', `o:s:${event.orderId}:processing`)
          .text('📍 مشاهده جزئیات', `o:v:${event.orderId}`);

        await broadcast(message, kb);
      } catch (err) {
        console.error('[bale-notifier] Error dispatching order:paid:', err);
      }
    });
  });

  // 2. Low Stock Alert
  storeEvents.on('stock:low', (event: LowStockEvent) => {
    setImmediate(async () => {
      try {
        const now = Date.now();
        const lastSent = lowStockCooldown.get(event.productId) || 0;
        if (now - lastSent < COOLDOWN_MS) {
          return;
        }
        lowStockCooldown.set(event.productId, now);

        const isZero = event.remainingStock === 0;
        const message =
          `⚠️ <b>هشدار موجودی انبار!</b>\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `▫️ کالا: <b>${escapeHtml(event.title)}</b>\n` +
          `▫️ وضعیت: ${isZero ? '🔴 <b>کاملاً ناموجود شد</b>' : `🟡 <b>رو به اتمام (${fmt(event.remainingStock)} عدد)</b>`}\n` +
          `▫️ شناسه کالا: <code>${event.productId}</code>\n` +
          `▫️ کد (SKU): <code>${event.sku || '—'}</code>`;

        const kb = new InlineKeyboard()
          .text('➕۵ شارژ فوری', `p:s:${event.productId}:5`)
          .text('📦 تنظیم دقیق', `p:stk:${event.productId}`)
          .row()
          .text('📱 کارت کالا', `p:v:${event.productId}`);

        await broadcast(message, kb);
      } catch (err) {
        console.error('[bale-notifier] Error dispatching stock:low:', err);
      }
    });
  });

  // 3. New Review Notification
  storeEvents.on('review:created', (event: ReviewCreatedEvent) => {
    setImmediate(async () => {
      try {
        const stars = '⭐'.repeat(Math.min(5, Math.max(1, event.rating)));
        const commentSnippet = event.comment.length > 200 ? event.comment.slice(0, 195) + '...' : event.comment;

        const message =
          `⭐ <b>دیدگاه جدید ثبت شد!</b>\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `▫️ کالا: <b>${escapeHtml(event.productTitle || `کد ${event.productId}`)}</b>\n` +
          `▫️ کاربر: ${escapeHtml(event.userName)} | امتیاز: ${stars}\n\n` +
          `📝 <b>متن دیدگاه:</b>\n«${escapeHtml(commentSnippet)}»`;

        const kb = new InlineKeyboard()
          .text('✅ تأیید انتشار', `rv:app:${event.reviewId}`)
          .text('❌ رد دیدگاه', `rv:rej:${event.reviewId}`);

        await broadcast(message, kb);
      } catch (err) {
        console.error('[bale-notifier] Error dispatching review:created:', err);
      }
    });
  });

  // 4. Contact Form Submission
  storeEvents.on('contact:created', (event: ContactCreatedEvent) => {
    setImmediate(async () => {
      try {
        const msgSnippet = event.message.length > 200 ? event.message.slice(0, 195) + '...' : event.message;

        const message =
          `📩 <b>پیام جدید در فرم تماس با ما!</b>\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `▫️ فرستنده: <b>${escapeHtml(event.name)}</b>\n` +
          `▫️ شماره/ایمیل: <code>${escapeHtml(event.phone || event.email || '—')}</code>\n` +
          `▫️ موضوع: <b>${escapeHtml(event.subject || 'بدون موضوع')}</b>\n\n` +
          `«${escapeHtml(msgSnippet)}»`;

        const kb = new InlineKeyboard()
          .text('✔️ خوانده شد', `cm:read:${event.messageId}`)
          .text('🗄️ آرشیو', `cm:arc:${event.messageId}`);

        await broadcast(message, kb);
      } catch (err) {
        console.error('[bale-notifier] Error dispatching contact:created:', err);
      }
    });
  });
}
