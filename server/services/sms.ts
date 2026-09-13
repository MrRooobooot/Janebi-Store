// Customer-facing order SMS (order receipt). Bale alerts go to the operator; this
// goes to the buyer's own phone.
//
// Provider: SMS.ir (same account/key as the OTP flow).
//   - template path: SMS_ORDER_TEMPLATE_ID set → /v1/send/verify with the two
//     named parameters a receipt template must declare: OrderCode, Amount.
//     Panel template text: «سفارش #OrderCode# ثبت شد. مبلغ: #Amount# تومان»
//   - free-text path: SMS_LINE_NUMBER set → /v1/send/bulk with the composed text.
//   - neither configured → log once and skip. A missing SMS config must never
//     fail an order.
import { env } from '../env.js';

export interface OrderReceiptInput {
  orderId: string;
  total: number;
  recipientPhone: string;
}

const fa = (v: string | number) =>
  String(v).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]).replace(/,/g, '٬');
const configured = () => Boolean(env.SMS_API_KEY) && Boolean(env.SMS_ORDER_TEMPLATE_ID || env.SMS_LINE_NUMBER);

/** Compose the free-text receipt (used by the bulk/line path). */
export function receiptText(orderId: string, total: number): string {
  return `سفارش ${orderId} ثبت شد. مبلغ: ${fa(total.toLocaleString('en-US'))} تومان — جانبی آرنا`;
}

export async function sendOrderReceiptSms(input: OrderReceiptInput): Promise<boolean> {
  const phone = String(input?.recipientPhone || '').replace(/\D/g, '');
  if (!configured() || phone.length < 10) return false;
  const mobile = phone.replace(/^0/, ''); // sms.ir expects 9xxxxxxxxx

  const url = env.SMS_ORDER_TEMPLATE_ID ? 'https://api.sms.ir/v1/send/verify' : 'https://api.sms.ir/v1/send/bulk';
  const body = env.SMS_ORDER_TEMPLATE_ID
    ? {
        mobile,
        templateId: Number(env.SMS_ORDER_TEMPLATE_ID),
        parameters: [
          { name: 'OrderCode', value: input.orderId },
          { name: 'Amount', value: fa(input.total.toLocaleString('en-US')) },
        ],
      }
    : { lineNumber: env.SMS_LINE_NUMBER, messageText: receiptText(input.orderId, input.total), mobiles: [mobile] };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': String(env.SMS_API_KEY) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { status?: number; message?: string };
    if (!res.ok || data?.status !== 1) {
      console.error(`[SMS.ir] order receipt failed: ${data?.status} ${data?.message}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[SMS.ir] order receipt error:', err);
    return false;
  }
}
