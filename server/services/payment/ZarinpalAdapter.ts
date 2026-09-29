import { IPaymentGateway, PaymentRequestOptions, PaymentRequestResult, PaymentVerifyOptions, PaymentVerifyResult, GatewayProvider } from './types.js';
import { env } from '../../env.js';

// Zarinpal's StartPay page renders only when the request carries a Referer from a
// domain registered for the merchant terminal; a pasted / history / in-app-browser
// entry carries none and gets «دسترسی از این دامنه مجاز نمی باشد». `/pay/:authority`
// (server/app.ts) hands the browser off from our own origin so the hop always does,
// so both the adapter and that route must agree on the host: one source of truth here.
export function zarinpalStartPayBase(): string {
  return `${env.ZARINPAL_SANDBOX ? 'https://sandbox.zarinpal.com' : 'https://www.zarinpal.com'}/pg/StartPay/`;
}

export function zarinpalStartPayUrl(authority: string): string {
  return `${zarinpalStartPayBase()}${authority}`;
}

export class ZarinpalAdapter implements IPaymentGateway {
  readonly provider: GatewayProvider = 'zarinpal';
  private merchantId: string;
  private sandbox: boolean;

  private readonly REQUEST_URL: string;
  private readonly VERIFY_URL: string;
  private readonly STARTPAY_URL: string;

  constructor() {
    this.merchantId = env.ZARINPAL_MERCHANT_ID || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    this.sandbox = Boolean(env.ZARINPAL_SANDBOX);

    const baseDomain = this.sandbox ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';
    this.REQUEST_URL = `${baseDomain}/pg/v4/payment/request.json`;
    this.VERIFY_URL = `${baseDomain}/pg/v4/payment/verify.json`;
    this.STARTPAY_URL = zarinpalStartPayBase();
  }

  get isHealthy(): boolean {
    return true;
  }

  async checkHealth(): Promise<boolean> {
    try {
      // Basic ping/readiness check with short timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('https://api.zarinpal.com/pg/v4/payment/request.json', {
        method: 'OPTIONS',
        signal: controller.signal
      });
      clearTimeout(timeout);
      return res.ok || res.status < 500;
    } catch {
      return false;
    }
  }

  async requestPayment(options: PaymentRequestOptions): Promise<PaymentRequestResult> {
    const isDummyMerchant =
      !this.merchantId ||
      this.merchantId === 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' ||
      this.merchantId.startsWith('00000000') ||
      env.NODE_ENV === 'test';

    if (isDummyMerchant) {
      if (env.NODE_ENV === 'production') {
        throw new Error('Zarinpal dummy gateway not permitted in production environment');
      }
      const authority = `DUMMY_AUTH_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        success: true,
        provider: this.provider,
        authority,
        paymentUrl: `/api/payment/verify?Status=OK&Authority=${authority}`,
      };
    }

    const payload = {
      merchant_id: this.merchantId,
      amount: options.amountTomans, // Send as Tomans with explicit currency
      currency: 'IRT',
      description: options.description || `سفارش شماره ${options.orderId}`,
      callback_url: options.callbackUrl,
      metadata: {
        mobile: options.mobile,
        email: options.email,
        order_id: options.orderId
      }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout trigger

    try {
      const response = await fetch(this.REQUEST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const data = await response.json();
      if (data?.data?.code === 100 && data?.data?.authority) {
        const authority = data.data.authority;
        return {
          success: true,
          provider: this.provider,
          authority,
          paymentUrl: `${this.STARTPAY_URL}${authority}`,
          rawResponse: data
        };
      }

      return {
        success: false,
        provider: this.provider,
        authority: '',
        paymentUrl: '',
        error: data?.errors?.message || 'Zarinpal request failed',
        rawResponse: data
      };
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Zarinpal gateway unreachable or timed out: ${err.message}`);
    }
  }

  async verifyPayment(options: PaymentVerifyOptions): Promise<PaymentVerifyResult> {
    if (options.authority.startsWith('ZP_DEV_') || options.authority.startsWith('DUMMY_')) {
      return {
        success: true,
        provider: this.provider,
        refId: `REF_${Date.now()}`,
        cardPan: '603799******1234',
        code: 100
      };
    }

    const payload = {
      merchant_id: this.merchantId,
      amount: options.amountTomans, // Must match request currency (Tomans)
      authority: options.authority
    };

    const response = await fetch(this.VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data?.data?.code === 100 || data?.data?.code === 101) {
      return {
        success: true,
        provider: this.provider,
        refId: data.data.ref_id ? String(data.data.ref_id) : `ZP_${Date.now()}`,
        cardPan: data.data.card_pan,
        code: data.data.code,
        rawResponse: data
      };
    }

    return {
      success: false,
      provider: this.provider,
      error: data?.errors?.message || 'Zarinpal verification failed',
      code: data?.errors?.code || data?.data?.code,
      rawResponse: data
    };
  }
}
