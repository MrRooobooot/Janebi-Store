export interface Product {
  id: number;
  title: string;
  category: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  brand: string;
  warranty?: string;
  features?: string[];
  description?: string;
  rating?: number;
  reviewsCount?: number;
  stockQuantity?: number;
  sku?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface OrderRecipient {
  name: string;
  phone?: string;
  address: string;
  postalCode?: string;
}

export interface OrderItem {
  id: number;
  title: string;
  price: number;
  image: string;
  qty: number;
  brand?: string;
}

export interface Order {
  id: string;
  date: string;
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled' | string;
  statusText: string;
  total: number;
  subtotal?: number;
  shippingFee?: number;
  paymentMethod?: string;
  trackingCode?: string;
  recipient: OrderRecipient;
  items: OrderItem[];
}
