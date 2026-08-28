import { IPaymentGateway, PaymentRequestOptions, PaymentRequestResult, PaymentVerifyOptions, PaymentVerifyResult, GatewayProvider, GatewayHealthStatus } from './types.js';
import { ZarinpalAdapter } from './ZarinpalAdapter.js';
import { SamanAdapter } from './SamanAdapter.js';

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

/**
 * PaymentFailoverRouter
 * Implements resilient multi-gateway routing, Circuit Breaker pattern,
 * and seamless fallback across Iranian domestic banking gateways.
 */
export class PaymentFailoverRouter {
  private primaryGateway: IPaymentGateway;
  private secondaryGateway: IPaymentGateway;
  
  private circuitBreakers: Record<GatewayProvider, CircuitBreakerState> = {
    zarinpal: { failures: 0, lastFailure: 0, state: 'CLOSED' },
    saman: { failures: 0, lastFailure: 0, state: 'CLOSED' },
    dummy: { failures: 0, lastFailure: 0, state: 'CLOSED' }
  };

  private readonly FAILURE_THRESHOLD = 3;
  private readonly RESET_TIMEOUT_MS = 60 * 1000; // 60s cooldown

  constructor(
    primary: IPaymentGateway = new ZarinpalAdapter(),
    secondary: IPaymentGateway = new SamanAdapter()
  ) {
    this.primaryGateway = primary;
    this.secondaryGateway = secondary;
  }

  private isCircuitOpen(provider: GatewayProvider): boolean {
    const cb = this.circuitBreakers[provider];
    if (cb.state === 'OPEN') {
      if (Date.now() - cb.lastFailure > this.RESET_TIMEOUT_MS) {
        cb.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    return false;
  }

  private recordSuccess(provider: GatewayProvider): void {
    const cb = this.circuitBreakers[provider];
    cb.failures = 0;
    cb.state = 'CLOSED';
  }

  private recordFailure(provider: GatewayProvider): void {
    const cb = this.circuitBreakers[provider];
    cb.failures += 1;
    cb.lastFailure = Date.now();
    if (cb.failures >= this.FAILURE_THRESHOLD) {
      cb.state = 'OPEN';
      console.warn(`[Payment Gateway Circuit Breaker] Provider ${provider} state changed to OPEN due to ${cb.failures} consecutive failures.`);
    }
  }

  /**
   * Request payment with automatic failover to backup gateway
   */
  async requestPaymentWithFailover(options: PaymentRequestOptions): Promise<PaymentRequestResult> {
    const gateways: IPaymentGateway[] = [];

    // Order gateways based on circuit status
    if (!this.isCircuitOpen(this.primaryGateway.provider)) {
      gateways.push(this.primaryGateway);
      gateways.push(this.secondaryGateway);
    } else {
      console.info(`[Payment Failover] Primary gateway (${this.primaryGateway.provider}) circuit is OPEN. Routing directly to secondary (${this.secondaryGateway.provider}).`);
      gateways.push(this.secondaryGateway);
      gateways.push(this.primaryGateway);
    }

    let lastError: any;

    for (const gateway of gateways) {
      try {
        console.log(`[Payment Router] Attempting payment request with ${gateway.provider} for order ${options.orderId}`);
        const result = await gateway.requestPayment(options);
        
        if (result.success) {
          this.recordSuccess(gateway.provider);
          return result;
        }

        this.recordFailure(gateway.provider);
        lastError = result.error;
      } catch (err: any) {
        console.error(`[Payment Failover Triggered] Error with gateway ${gateway.provider}: ${err.message}`);
        this.recordFailure(gateway.provider);
        lastError = err.message;
      }
    }

    return {
      success: false,
      provider: this.primaryGateway.provider,
      authority: '',
      paymentUrl: '',
      error: `تمام درگاه‌های بانکی با خطا مواجه شدند. لطفاً لحظاتی بعد مجدداً تلاش نمایید. (${lastError})`
    };
  }

  /**
   * Verify payment based on the authority prefix or explicit provider
   */
  async verifyPayment(options: PaymentVerifyOptions, explicitProvider?: GatewayProvider): Promise<PaymentVerifyResult> {
    let targetGateway: IPaymentGateway = this.primaryGateway;

    if (explicitProvider === 'saman' || options.authority.startsWith('SEP_')) {
      targetGateway = this.secondaryGateway;
    } else {
      targetGateway = this.primaryGateway;
    }

    return await targetGateway.verifyPayment(options);
  }

  getHealthStatus(): GatewayHealthStatus[] {
    return [
      {
        provider: this.primaryGateway.provider,
        healthy: this.circuitBreakers[this.primaryGateway.provider].state !== 'OPEN',
        failureCount: this.circuitBreakers[this.primaryGateway.provider].failures,
        lastFailureTime: this.circuitBreakers[this.primaryGateway.provider].lastFailure,
        circuitState: this.circuitBreakers[this.primaryGateway.provider].state
      },
      {
        provider: this.secondaryGateway.provider,
        healthy: this.circuitBreakers[this.secondaryGateway.provider].state !== 'OPEN',
        failureCount: this.circuitBreakers[this.secondaryGateway.provider].failures,
        lastFailureTime: this.circuitBreakers[this.secondaryGateway.provider].lastFailure,
        circuitState: this.circuitBreakers[this.secondaryGateway.provider].state
      }
    ];
  }
}

export const paymentRouter = new PaymentFailoverRouter();
