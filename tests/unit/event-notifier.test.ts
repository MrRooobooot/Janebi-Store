import { describe, it, expect, vi } from 'vitest';
import { storeEvents } from '../../server/services/events.js';
import { escapeHtml, initBaleNotifier } from '../../server/bot/notifier.js';

describe('Event Notifier & Proactive Alerts Suite', () => {
  describe('HTML escaping', () => {
    it('escapes dangerous characters for Telegram/Bale HTML mode', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B');
      expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(escapeHtml('"quoted" and \'single\'')).toBe('&quot;quoted&quot; and &#039;single&#039;');
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('Event Bus Subscription & Dispatch', () => {
    it('emits order:paid event to listeners', async () => {
      const spy = vi.fn();
      storeEvents.on('order:paid', spy);

      const payload = {
        orderId: 'ORD-TEST-1234',
        total: 550000,
        recipientName: 'علی رضایی',
        recipientPhone: '09121234567',
        items: [{ title: 'قاب آیفون', qty: 2, price: 275000 }],
        paymentMethod: 'درگاه آنلاین',
      };

      storeEvents.emit('order:paid', payload);
      expect(spy).toHaveBeenCalledWith(payload);
    });

    it('emits stock:low event to listeners', () => {
      const spy = vi.fn();
      storeEvents.on('stock:low', spy);

      const payload = {
        productId: 101,
        title: 'کابل شارژر تایپ سی',
        remainingStock: 2,
        sku: 'SKU-TYPE-C',
      };

      storeEvents.emit('stock:low', payload);
      expect(spy).toHaveBeenCalledWith(payload);
    });

    it('emits review:created event to listeners', () => {
      const spy = vi.fn();
      storeEvents.on('review:created', spy);

      const payload = {
        reviewId: 'rev-999',
        productId: 101,
        productTitle: 'کابل شارژر تایپ سی',
        userName: 'رضا',
        rating: 5,
        comment: 'عالی بود و خیلی سریع شارژ میکنه',
      };

      storeEvents.emit('review:created', payload);
      expect(spy).toHaveBeenCalledWith(payload);
    });

    it('emits contact:created event to listeners', () => {
      const spy = vi.fn();
      storeEvents.on('contact:created', spy);

      const payload = {
        messageId: 'msg-888',
        name: 'مریم',
        phone: '09351234567',
        email: 'maryam@test.com',
        subject: 'پیگیری سفارش',
        message: 'سفارش من کی ارسال میشه؟',
      };

      storeEvents.emit('contact:created', payload);
      expect(spy).toHaveBeenCalledWith(payload);
    });
  });

  describe('Proactive Notification Bot Callbacks Byte Budget', () => {
    it('all interactive callback_data in notification buttons satisfy <= 64 bytes', () => {
      const orderId = 'ORD-XYZ12345-AB';
      const prodId = 99999;
      const revId = 'rev-1788901234567';
      const msgId = 'msg-1788901234567-abcdef';

      const callbacks = [
        `o:s:${orderId}:processing`,
        `o:v:${orderId}`,
        `p:s:${prodId}:5`,
        `p:stk:${prodId}`,
        `p:v:${prodId}`,
        `rv:app:${revId}`,
        `rv:rej:${revId}`,
        `cm:read:${msgId}`,
        `cm:arc:${msgId}`,
      ];

      for (const cb of callbacks) {
        const byteLen = Buffer.byteLength(cb, 'utf8');
        expect(byteLen).toBeLessThanOrEqual(64);
      }
    });

    it('handles Bot broadcast safely when initialized', async () => {
      const mockSendMessage = vi.fn().mockResolvedValue(true);
      const mockBot = {
        api: {
          sendMessage: mockSendMessage,
        },
      } as any;

      initBaleNotifier(mockBot, [123456, 789012]);

      // Emit an event to trigger broadcast
      storeEvents.emit('order:paid', {
        orderId: 'ORD-NOTIF-TEST',
        total: 120000,
        recipientName: 'تست کننده',
        recipientPhone: '09120000000',
        items: [{ title: 'ایرباد', qty: 1, price: 120000 }],
        paymentMethod: 'کارت',
      });

      // Wait for setImmediate
      await new Promise((r) => setTimeout(r, 50));

      expect(mockSendMessage).toHaveBeenCalledTimes(2);
      expect(mockSendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('سفارش جدید پرداخت‌شده'),
        expect.objectContaining({ parse_mode: 'HTML' })
      );
    });
  });
});
