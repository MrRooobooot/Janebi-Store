import { EventEmitter } from 'events';

export interface OrderPaidEvent {
  orderId: string;
  total: number;
  recipientName: string;
  recipientPhone: string;
  recipientAddress?: string;
  items: Array<{ title: string; qty: number; price: number }>;
  paymentMethod: string;
}

export interface LowStockEvent {
  productId: number;
  title: string;
  remainingStock: number;
  sku?: string;
}

export interface ReviewCreatedEvent {
  reviewId: string;
  productId: number;
  productTitle?: string;
  userName: string;
  rating: number;
  comment: string;
}

export interface ContactCreatedEvent {
  messageId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  subject?: string | null;
  message: string;
}

export interface StoreEventsMap {
  'order:paid': (event: OrderPaidEvent) => void;
  'stock:low': (event: LowStockEvent) => void;
  'review:created': (event: ReviewCreatedEvent) => void;
  'contact:created': (event: ContactCreatedEvent) => void;
}

class StoreEventEmitter extends EventEmitter {
  override emit<E extends keyof StoreEventsMap>(
    event: E,
    ...args: Parameters<StoreEventsMap[E]>
  ): boolean {
    return super.emit(event, ...args);
  }

  override on<E extends keyof StoreEventsMap>(
    event: E,
    listener: StoreEventsMap[E]
  ): this {
    return super.on(event, listener as (...args: any[]) => void);
  }
}

export const storeEvents = new StoreEventEmitter();
