import { describe, it, expect, vi } from 'vitest';
import { PaymentFailoverRouter } from '../../server/services/payment/PaymentFailoverRouter.js';
import { IPaymentGateway, PaymentRequestOptions, PaymentRequestResult, PaymentVerifyOptions, PaymentVerifyResult } from '../../server/services/payment/types.js';

class MockFailingGateway implements IPaymentGateway {
  readonly provider = 'zarinpal' as const;
  get isHealthy() { return false; }
  async checkHealth() { return false; }
  async requestPayment(_options: PaymentRequestOptions): Promise<PaymentRequestResult> {
    throw new Error('Connection timeout to Zarinpal banking switch');
  }
  async verifyPayment(_options: PaymentVerifyOptions): Promise<PaymentVerifyResult> {
    return { success: false, provider: 'zarinpal', error: 'Gateway unavailable' };
  }
}

class MockHealthyBackupGateway implements IPaymentGateway {
  readonly provider = 'saman' as const;
  get isHealthy() { return true; }
  async checkHealth() { return true; }
  async requestPayment(options: PaymentRequestOptions): Promise<PaymentRequestResult> {
    return {
      success: true,
      provider: 'saman',
      authority: `SEP_TOKEN_${options.orderId}`,
      paymentUrl: `https://sep.shaparak.ir/OnlinePG?token=SEP_TOKEN_${options.orderId}`
    };
  }
  async verifyPayment(_options: PaymentVerifyOptions): Promise<PaymentVerifyResult> {
    return {
      success: true,
      provider: 'saman',
      refId: 'SEP_RRN_99887766',
      cardPan: '589210******1122',
      code: 0
    };
  }
}

describe('PaymentFailoverRouter (Circuit Breaker & Fallback Switch)', () => {
  it('automatically routes to backup Saman gateway when primary Zarinpal fails', async () => {
    const failingPrimary = new MockFailingGateway();
    const backupGateway = new MockHealthyBackupGateway();
    const router = new PaymentFailoverRouter(failingPrimary, backupGateway);

    const result = await router.requestPaymentWithFailover({
      orderId: 'ORD-FAILOVER-TEST-1',
      amountTomans: 250000,
      callbackUrl: 'http://localhost:3000/api/payment/verify'
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('saman');
    expect(result.authority).toBe('SEP_TOKEN_ORD-FAILOVER-TEST-1');
    expect(result.paymentUrl).toContain('sep.shaparak.ir');
  });

  it('verifies SEP authorities seamlessly with the backup provider', async () => {
    const failingPrimary = new MockFailingGateway();
    const backupGateway = new MockHealthyBackupGateway();
    const router = new PaymentFailoverRouter(failingPrimary, backupGateway);

    const verifyResult = await router.verifyPayment({
      authority: 'SEP_TOKEN_ORD-FAILOVER-TEST-1',
      status: 'OK',
      amountTomans: 250000
    });

    expect(verifyResult.success).toBe(true);
    expect(verifyResult.provider).toBe('saman');
    expect(verifyResult.refId).toBe('SEP_RRN_99887766');
  });

  it('tracks failure counts and reflects Circuit Breaker health status', async () => {
    const failingPrimary = new MockFailingGateway();
    const backupGateway = new MockHealthyBackupGateway();
    const router = new PaymentFailoverRouter(failingPrimary, backupGateway);

    await router.requestPaymentWithFailover({
      orderId: 'ORD-CB-1',
      amountTomans: 100000,
      callbackUrl: 'http://localhost:3000/api/payment/verify'
    });

    const status = router.getHealthStatus();
    expect(status[0].provider).toBe('zarinpal');
    expect(status[0].failureCount).toBeGreaterThan(0);
    expect(status[1].provider).toBe('saman');
    expect(status[1].healthy).toBe(true);
  });
});
