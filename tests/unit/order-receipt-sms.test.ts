import { describe, it, expect, afterEach, vi } from 'vitest';
import { env } from '../../server/env.js';
import { sendOrderReceiptSms, receiptText } from '../../server/services/sms.js';

// Order receipt SMS: buyer-facing, provider = SMS.ir. Two dispatch shapes
// (template verify vs. dedicated-line bulk) and an unconfigured no-op. A missing
// or failing SMS config must never surface as an order failure.
const snapshot = {
  SMS_API_KEY: env.SMS_API_KEY,
  SMS_ORDER_TEMPLATE_ID: (env as any).SMS_ORDER_TEMPLATE_ID,
  SMS_LINE_NUMBER: (env as any).SMS_LINE_NUMBER,
};

afterEach(() => {
  Object.assign(env as any, snapshot);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('order receipt SMS', () => {
  const input = { orderId: 'ORD-TEST-1A2B', total: 310000, recipientPhone: '09125373830' };

  it('sends through the verify template with Persian-digit params', async () => {
    (env as any).SMS_API_KEY = 'test-key';
    (env as any).SMS_ORDER_TEMPLATE_ID = '401811';
    (env as any).SMS_LINE_NUMBER = '';
    const calls: Array<{ url: string; body: any }> = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: any) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return { ok: true, json: async () => ({ status: 1 }) } as any;
    }));

    expect(await sendOrderReceiptSms(input)).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('/v1/send/verify');
    expect(calls[0].body.mobile).toBe('9125373830'); // no leading zero for sms.ir
    expect(calls[0].body.templateId).toBe(401811);
    expect(calls[0].body.parameters).toEqual([
      { name: 'OrderCode', value: 'ORD-TEST-1A2B' },
      { name: 'Amount', value: '۳۱۰٬۰۰۰' },
    ]);
  });

  it('falls back to the dedicated-line bulk send with composed Persian text', async () => {
    (env as any).SMS_API_KEY = 'test-key';
    (env as any).SMS_ORDER_TEMPLATE_ID = '';
    (env as any).SMS_LINE_NUMBER = '30007732';
    const calls: Array<{ url: string; body: any }> = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: any) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return { ok: true, json: async () => ({ status: 1 }) } as any;
    }));

    expect(await sendOrderReceiptSms(input)).toBe(true);
    expect(calls[0].url).toContain('/v1/send/bulk');
    expect(calls[0].body.lineNumber).toBe('30007732');
    expect(calls[0].body.mobiles).toEqual(['9125373830']);
    expect(calls[0].body.messageText).toContain('ORD-TEST-1A2B');
    expect(calls[0].body.messageText).toContain('۳۱۰٬۰۰۰');
  });

  it('is a silent no-op when neither template nor line is configured', async () => {
    (env as any).SMS_API_KEY = 'test-key';
    (env as any).SMS_ORDER_TEMPLATE_ID = '';
    (env as any).SMS_LINE_NUMBER = '';
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);

    expect(await sendOrderReceiptSms(input)).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns false (never throws) when the provider rejects', async () => {
    (env as any).SMS_API_KEY = 'test-key';
    (env as any).SMS_ORDER_TEMPLATE_ID = '401811';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ status: 0, message: 'no credit' }) }) as any));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await sendOrderReceiptSms(input)).toBe(false);
  });

  it('composes a receipt text with the order id and Persian amount', () => {
    const text = receiptText('ORD-X-9', 260000);
    expect(text).toContain('ORD-X-9');
    expect(text).toContain('۲۶۰٬۰۰۰');
  });
});
