import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import express, { json } from 'express';
import { db } from '../../server/db/index.js';
import { users, products, orders, coupons, addresses, orderItems, cartItems } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';

import authRoutes from '../../server/routes/auth.js';
import userRoutes from '../../server/routes/users.js';
import productRoutes from '../../server/routes/products.js';
import orderRoutes from '../../server/routes/orders.js';
import adminRoutes from '../../server/routes/admin.js';

// Setup unified test app
const app = express();
app.use(json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

describe('End-to-End (E2E) Complete User & Admin Journey', () => {
  const timestamp = Date.now();
  const customerPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const customerPassword = 'password123';
  const customerName = 'مشتری آزمایشی E2E';
  
  const adminId = `admin-e2e-${timestamp}`;
  const adminPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const adminToken = jwt.sign({ userId: adminId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

  let customerToken: string;
  let customerId: string;
  let testProductId: number;
  let testCouponCode = `E2ECOUPON_${timestamp}`;
  let placedOrderId: string;

  beforeAll(async () => {
    // 1. Seed an Admin User
    await db.insert(users).values({
      id: adminId,
      name: 'ادمین تست کل سفر',
      phone: adminPhone,
      password: 'hash',
      role: 'admin'
    });

    // 2. Seed a Product with initial stock of 10
    const [prod] = await db.insert(products).values({
      title: 'ایرپاد پرو مکس تستی E2E',
      category: 'audio',
      price: 500000,
      originalPrice: 600000,
      discount: 16,
      brand: 'اپل',
      image: 'https://example.com/airpods.jpg',
      stockQuantity: 10,
      sku: `AIRPOD-E2E-${timestamp}`
    }).returning();
    testProductId = prod.id;

    // 3. Seed a 10% Coupon
    await db.insert(coupons).values({
      code: testCouponCode,
      percent: 10,
      minTotal: 300000,
      label: 'تخفیف ۱۰ درصدی تست کامل',
      active: true
    });
  });

  afterAll(async () => {
    // Cleanup in foreign-key safe order
    if (placedOrderId) {
      await db.delete(orderItems).where(eq(orderItems.orderId, placedOrderId));
      await db.delete(orders).where(eq(orders.id, placedOrderId));
    }
    if (testProductId) {
      await db.delete(products).where(eq(products.id, testProductId));
    }
    await db.delete(coupons).where(eq(coupons.code, testCouponCode));
    if (customerId) {
      await db.delete(addresses).where(eq(addresses.userId, customerId));
      await db.delete(users).where(eq(users.id, customerId));
    }
    await db.delete(users).where(eq(users.id, adminId));
  });

  // -------------------------------------------------------------
  // STEP 1: Customer Registration & Authentication
  // -------------------------------------------------------------
  it('STEP 1: Customer registers and receives JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: customerName,
        phone: customerPhone,
        password: customerPassword
      });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.name).toBe(customerName);
    
    customerToken = res.body.accessToken;
    customerId = res.body.user.id;
  });

  // -------------------------------------------------------------
  // STEP 2: Customer Address Book Management
  // -------------------------------------------------------------
  it('STEP 2: Customer adds a delivery address to their address book', async () => {
    const res = await request(app)
      .post('/api/users/me/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        title: 'منزل شخصی',
        name: customerName,
        phone: customerPhone,
        province: 'تهران',
        city: 'تهران',
        address: 'خیابان ولیعصر، بالاتر از میدان ونک، پلاک ۱۰۰',
        postalCode: '1987654321'
      });

    expect(res.status).toBe(201);
    expect(res.body.address.isDefault).toBe(true);
    expect(res.body.address.province).toBe('تهران');
  });

  // -------------------------------------------------------------
  // STEP 3: Customer Views Products and Checks Stock
  // -------------------------------------------------------------
  it('STEP 3: Customer browses catalog and sees stock quantity', async () => {
    const res = await request(app)
      .get(`/api/products/${testProductId}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toContain('ایرپاد پرو مکس');
    expect(res.body.stockQuantity).toBe(10);
  });

  // -------------------------------------------------------------
  // STEP 4: Customer Places Order with Coupon & Stock Decrements
  // -------------------------------------------------------------
  it('STEP 4: Customer places order for 2 items with coupon', async () => {
    // 2 items * 500,000 = 1,000,000
    // 10% coupon = 100,000 discount
    // express shipping = 50,000
    // Total = 950,000
    const orderPayload = {
      items: [{ id: testProductId, quantity: 2 }],
      recipient: {
        name: customerName,
        phone: customerPhone,
        province: 'تهران',
        city: 'تهران',
        address: 'خیابان ولیعصر، بالاتر از میدان ونک، پلاک ۱۰۰',
        postalCode: '1987654321'
      },
      paymentMethod: 'online',
      shippingMethod: 'express',
      couponCode: testCouponCode
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.order).toBeDefined();
    expect(res.body.order.subtotal).toBe(1000000);
    expect(res.body.order.discountAmount).toBe(100000);
    expect(res.body.order.shippingFee).toBe(50000);
    expect(res.body.order.total).toBe(950000);
    expect(res.body.order.status).toBe('pending_payment');

    placedOrderId = res.body.order.id;

    // Verify stock is atomically decremented: 10 - 2 = 8
    const updatedProd = await db.query.products.findFirst({
      where: eq(products.id, testProductId)
    });
    expect(updatedProd?.stockQuantity).toBe(8);
  });

  // -------------------------------------------------------------
  // STEP 5: Customer Sees Order in Profile History
  // -------------------------------------------------------------
  it('STEP 5: Customer sees placed order in /api/orders/my-orders', async () => {
    const res = await request(app)
      .get('/api/orders/my-orders')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    
    const foundOrder = res.body.find((o: any) => o.id === placedOrderId);
    expect(foundOrder).toBeDefined();
    expect(foundOrder.total).toBe(950000);
    expect(foundOrder.items.length).toBe(1);
    expect(foundOrder.items[0].quantity).toBe(2);
  });

  // -------------------------------------------------------------
  // STEP 6: Admin Inspects the New Order in Admin Dashboard
  // -------------------------------------------------------------
  it('STEP 6: Admin inspects the new order in Admin Dashboard', async () => {
    const ordersRes = await request(app)
      .get('/api/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(ordersRes.status).toBe(200);
    const orderInAdmin = ordersRes.body.find((o: any) => o.id === placedOrderId);
    expect(orderInAdmin).toBeDefined();
    expect(orderInAdmin.recipientName).toBe(customerName);
  });

  // -------------------------------------------------------------
  // STEP 7: Admin Updates Order Status to "Shipped" and "Delivered"
  // -------------------------------------------------------------
  it('STEP 7: Admin updates order status to "shipped" and reflects in customer profile', async () => {
    // 1. Admin updates status to "shipped"
    const updateRes = await request(app)
      .put(`/api/admin/orders/${placedOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'shipped',
        statusText: 'ارسال شده'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.status).toBe('shipped');

    // 2. Customer checks their profile again
    const customerCheckRes = await request(app)
      .get('/api/orders/my-orders')
      .set('Authorization', `Bearer ${customerToken}`);

    const updatedCustomerOrder = customerCheckRes.body.find((o: any) => o.id === placedOrderId);
    expect(updatedCustomerOrder.status).toBe('shipped');
    expect(updatedCustomerOrder.statusText).toBe('ارسال شده');
  });
});
