import { IPaymentGateway, PaymentRequestOptions, PaymentRequestResult, PaymentVerifyOptions, PaymentVerifyResult, GatewayProvider } from './types.js';
import { env } from '../../env.js';

export class SamanAdapter implements IPaymentGateway {
  readonly provider: GatewayProvider = 'saman';
  private terminalId: string;

  private readonly REQUEST_URL = 'https://sep.shaparak.ir/MobilePG/MobilePayment';
  private readonly VERIFY_URL = 'https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction';

  constructor() {
    this.terminalId = process.env.SAMAN_TERMINAL_ID || 'SEP_FALLBACK_TERMINAL';
  }

  get isHealthy(): boolean {
    return true;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('https://sep.shaparak.ir', {
        method: 'HEAD',
        signal: controller.signal
      });
      clearTimeout(timeout);
      return res.ok || res.status < 500;
    } catch {
      return false;
    }
  }

  async requestPayment(options: PaymentRequestOptions): Promise<PaymentRequestResult> {
    const isMock = 
      this.terminalId === 'SEP_FALLBACK_TERMINAL' ||
      env.NODE_ENV === 'test' ||
      Boolean(env.ZARINPAL_SANDBOX);

    if (isMock) {
      if (env.NODE_ENV === 'production' && !process.env.SAMAN_TERMINAL_ID) {
        throw new Error('Saman/SEP production credentials missing');
      }
      const authority = `SEP_DEV_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        success: true,
        provider: this.provider,
        authority,
        paymentUrl: `/api/payment/verify?Status=OK&Authority=${authority}&provider=saman`,
      };
    }

    const payload = {
      action: 'token',
      TerminalId: this.terminalId,
      Amount: options.amountTomans * 10,
      ResNum: options.orderId,
      RedirectUrl: options.callbackUrl,
      CellNumber: options.mobile
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(this.REQUEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const data = await response.json();
      if (data?.status === 1 && data?.token) {
        return {
          success: true,
          provider: this.provider,
          authority: data.token,
          paymentUrl: `https://sep.shaparak.ir/OnlinePG/OnlinePG?token=${data.token}`,
          rawResponse: data
        };
      }

      return {
        success: false,
        provider: this.provider,
        authority: '',
        paymentUrl: '',
        error: data?.errorDesc || 'Saman gateway token generation failed',
        rawResponse: data
      };
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Saman gateway error: ${err.message}`);
    }
  }

  async verifyPayment(options: PaymentVerifyOptions): Promise<PaymentVerifyResult> {
    if (options.authority.startsWith('SEP_DEV_')) {
      return {
        success: true,
        provider: this.provider,
        refId: `SEP_REF_${Date.now()}`,
        cardPan: '589210******4321',
        code: 0
      };
    }

    const payload = {
      RefNum: options.authority,
      TerminalNumber: this.terminalId
    };

    const response = await fetch(this.VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data?.Success === true || data?.ResultCode === 0) {
      return {
        success: true,
        provider: this.provider,
        refId: data.TransactionDetail?.RRN || `SEP_${Date.now()}`,
        cardPan: data.TransactionDetail?.MaskedPan,
        code: data.ResultCode,
        rawResponse: data
      };
    }

    return {
      success: false,
      provider: this.provider,
      error: data?.ResultDescription || 'Saman transaction verification failed',
      code: data?.ResultCode,
      rawResponse: data
    };
  }
}
