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
          .map((it, idx) => `  ▫️ ${fmt(idx + 1)}. ${it.title} (${fmt(it.qty)} عدد)`)
          .join('\n');

        const message =
          `🛍 *سفارش جدید پرداخت‌شده!*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `▫️ شماره سفارش: ${event.orderId}\n` +
          `▫️ خریدار: ${event.recipientName}\n` +
          `▫️ تلفن همراه: ${event.recipientPhone}\n` +
          `▫️ روش پرداخت: ${event.paymentMethod}\n` +
          `▫️ مبلغ کل: ${fmt(event.total)} تومان\n\n` +
          `📦 *اقلام خریداری‌شده:*\n${itemsText || '  (بدون اقلام)'}`;

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
          `⚠️ *هشدار موجودی انبار!*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `▫️ کالا: ${event.title}\n` +
          `▫️ وضعیت: ${isZero ? '🔴 کاملاً ناموجود شد' : `🟡 رو به اتمام (${fmt(event.remainingStock)} عدد)`}\n` +
          `▫️ شناسه کالا: ${event.productId}\n` +
          `▫️ کد (SKU): ${event.sku || '—'}`;

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
          `⭐ *دیدگاه جدید ثبت شد!*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `▫️ کالا: ${event.productTitle || `کد ${event.productId}`}\n` +
          `▫️ کاربر: ${event.userName} | امتیاز: ${stars}\n\n` +
          `📝 *متن دیدگاه:*\n«${commentSnippet}»`;

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
          `📩 *پیام جدید در فرم تماس با ما!*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `▫️ فرستنده: ${event.name}\n` +
          `▫️ شماره/ایمیل: ${event.phone || event.email || '—'}\n` +
          `▫️ موضوع: ${event.subject || 'بدون موضوع'}\n\n` +
          `«${msgSnippet}»`;

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
