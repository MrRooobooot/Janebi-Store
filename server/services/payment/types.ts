/**
2| * Payment Gateway Architecture & Auto-Failover Circuit Breaker
3| * Types and Interfaces
4| */

export type GatewayProvider = 'zarinpal' | 'saman' | 'dummy';

export interface PaymentRequestOptions {
  orderId: string;
  amountTomans: number;
  callbackUrl: string;
  description?: string;
  mobile?: string;
  email?: string;
  idempotencyKey?: string;
}

export interface PaymentRequestResult {
  success: boolean;
  provider: GatewayProvider;
  authority: string;
  paymentUrl: string;
  error?: string;
  rawResponse?: any;
}

export interface PaymentVerifyOptions {
  authority: string;
  status: string;
  amountTomans: number;
  orderId?: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  provider: GatewayProvider;
  refId?: string;
  cardPan?: string;
  error?: string;
  code?: number | string;
  rawResponse?: any;
}

export interface IPaymentGateway {
  readonly provider: GatewayProvider;
  readonly isHealthy: boolean;
  requestPayment(options: PaymentRequestOptions): Promise<PaymentRequestResult>;
  verifyPayment(options: PaymentVerifyOptions): Promise<PaymentVerifyResult>;
  checkHealth(): Promise<boolean>;
}

export interface GatewayHealthStatus {
  provider: GatewayProvider;
  healthy: boolean;
  failureCount: number;
  lastFailureTime?: number;
  circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}
