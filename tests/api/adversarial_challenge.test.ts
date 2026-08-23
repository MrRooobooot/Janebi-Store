import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { db } from '../../server/db/index.js';
import { users, products, orders, orderItems, coupons, addresses } from '../../server/db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';
import bcrypt from 'bcrypt';

describe('Empirical Adversarial & Boundary Challenge Suite', () => {
  // Test User & Admin credentials
  const adminId = 'challenger-admin-' + Date.now();
  const userId = 'challenger-user-' + Date.now();
  const otherUserId = 'challenger-other-' + Date.now();

  const adminPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const userPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const otherPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);

  const adminToken = jwt.sign({ userId: adminId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const userToken = jwt.sign({ userId: userId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const otherUserToken = jwt.sign({ userId: otherUserId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const expiredToken = jwt.sign({ userId: userId }, env.JWT_ACCESS_SECRET, { expiresIn: '-10s' });
  const invalidSecretToken = jwt.sign({ userId: userId }, 'WRONG_SECRET_KEY', { expiresIn: '1h' });

  // Test products, coupons, and orders IDs
  let testProductId: number;
  let testOrderId: string;
  const couponCodes: string[] = [];
  const createdAddressIds: string[] = [];

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('secret123', 10);

    // 1. Seed Admin & Users
    await db.insert(users).values([
      {
        id: adminId,
        name: 'مدیر آزمون چالشگر',
        phone: adminPhone,
        password: hashedPassword,
        role: 'admin'
      },
      {
        id: userId,
        name: 'کاربر آزمون چالشگر',
        phone: userPhone,
        password: hashedPassword,
        role: 'user'
      },
      {
        id: otherUserId,
        name: 'کاربر دیگر آزمون',
        phone: otherPhone,
        password: hashedPassword,
        role: 'user'
      }
    ]);

    // 2. Seed Test Product with stock 10
    const [prod] = await db.insert(products).values({
      title: 'محصول استرس تست چالشگر',
      category: 'accessories',
      price: 100000,
      image: '/test.jpg',
      brand: 'تست چالشگر',
      stockQuantity: 10,
      sku: `SKU-CHAL-${Date.now()}`
    }).returning();
    testProductId = prod.id;

    // 3. Seed Test Order
    testOrderId = `ORD-CHAL-${Date.now()}`;
    await db.insert(orders).values({
      id: testOrderId,
      userId: userId,
      date: '1403/05/25',
      status: 'pending_payment',
      statusText: 'در انتظار پرداخت',
      total: 100000,
      subtotal: 100000,
      shippingFee: 35000,
      discountAmount: 0,
      paymentMethod: 'پرداخت آنلاین',
      shippingMethod: 'پست پیشتاز',
      recipientName: 'کاربر آزمون',
      recipientPhone: userPhone,
      recipientAddress: 'تهران، خیابان آزادی'
    });

    await db.insert(orderItems).values({
      orderId: testOrderId,
      productId: testProductId,
      price: 100000,
      qty: 1,
      title: 'محصول استرس تست چالشگر',
      image: '/test.jpg',
      brand: 'تست چالشگر'
    });
  });

  afterAll(async () => {
    // Cleanup everything created
    if (createdAddressIds.length > 0) {
      await db.delete(addresses).where(inArray(addresses.id, createdAddressIds));
    }
    await db.delete(addresses).where(eq(addresses.userId, userId));
    await db.delete(addresses).where(eq(addresses.userId, otherUserId));

    if (couponCodes.length > 0) {
      await db.delete(coupons).where(inArray(coupons.code, couponCodes));
    }

    await db.delete(orderItems).where(eq(orderItems.productId, testProductId));
    await db.delete(orders).where(eq(orders.id, testOrderId));
    await db.delete(orders).where(eq(orders.userId, userId));
    await db.delete(orders).where(eq(orders.userId, otherUserId));
    await db.delete(products).where(eq(products.id, testProductId));
    await db.delete(users).where(inArray(users.id, [adminId, userId, otherUserId]));
  });

  // =========================================================================
  // SCOPE 1: RBAC SECURITY ACROSS ALL ADMIN ENDPOINTS (/api/admin/*)
  // =========================================================================
  describe('Scope 1: RBAC Security Across All Admin Endpoints', () => {
    const adminEndpoints: Array<{
      name: string;
      method: 'get' | 'post' | 'put' | 'delete';
      url: string;
      body?: any;
    }> = [
      { name: 'Stats Dashboard', method: 'get', url: '/api/admin/stats' },
      { name: 'Users List', method: 'get', url: '/api/admin/users' },
      { name: 'Update User Role', method: 'put', url: `/api/admin/users/${userId}/role`, body: { role: 'admin' } },
      { name: 'Create Product', method: 'post', url: '/api/admin/products', body: { title: 'X', category: 'Y', price: 1000 } },
      { name: 'Update Product', method: 'put', url: `/api/admin/products/${testProductId}`, body: { price: 2000 } },
      { name: 'Delete Product', method: 'delete', url: `/api/admin/products/${testProductId}` },
      { name: 'Orders List', method: 'get', url: '/api/admin/orders' },
      { name: 'Update Order Status', method: 'put', url: `/api/admin/orders/${testOrderId}/status`, body: { status: 'shipped' } },
      { name: 'Coupons List', method: 'get', url: '/api/admin/coupons' },
      { name: 'Create Coupon', method: 'post', url: '/api/admin/coupons', body: { code: 'CHAL99', label: 'L' } },
      { name: 'Delete Coupon', method: 'delete', url: '/api/admin/coupons/CHAL99' }
    ];

    it('1.1: Strictly returns 401 Unauthorized for Unauthenticated requests across ALL admin endpoints', async () => {
      for (const ep of adminEndpoints) {
        const req = (request(app) as any)[ep.method](ep.url);
        if (ep.body) req.send(ep.body);
        const res = await req;
        expect(res.status, `Endpoint ${ep.method.toUpperCase()} ${ep.url} failed 401 check`).toBe(401);
      }
    });

    it('1.2: Strictly returns 401 Unauthorized for Invalid/Expired/Malformed tokens across admin endpoints', async () => {
      // Expired token
      const resExp = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(resExp.status).toBe(401);

      // Wrong secret
      const resSec = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${invalidSecretToken}`);
      expect(resSec.status).toBe(401);

      // Malformed header (non-bearer)
      const resMal = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Basic dXNlcjpwYXNz`);
      expect(resMal.status).toBe(401);

      // Non-existent user token
      const deletedUserToken = jwt.sign({ userId: 'deleted-user-uuid-99999' }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
      const resDel = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${deletedUserToken}`);
      expect(resDel.status).toBe(401);
    });

    it('1.3: Strictly returns 403 Forbidden for Non-Admin (User) tokens across ALL admin endpoints', async () => {
      for (const ep of adminEndpoints) {
        const req = (request(app) as any)[ep.method](ep.url).set('Authorization', `Bearer ${userToken}`);
        if (ep.body) req.send(ep.body);
        const res = await req;
        expect(res.status, `Endpoint ${ep.method.toUpperCase()} ${ep.url} failed 403 check for userToken`).toBe(403);
      }
    });

    it('1.4: Privilege escalation attempt by non-admin is strictly prevented', async () => {
      // User attempts to make themselves admin
      const res = await request(app)
        .put(`/api/admin/users/${userId}/role`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(403);

      // Verify in DB that role was NOT changed
      const dbUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
      expect(dbUser?.role).toBe('user');
    });

    it('1.5: Valid Admin Token has authorized access to admin endpoints', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics).toBeDefined();
    });

    it('1.6: Token with forged role:admin claim in JWT payload for standard user is blocked (DB truth check)', async () => {
      // Attacker creates a token with claims { userId: userId, role: 'admin' }
      const forgedRoleToken = jwt.sign({ userId: userId, role: 'admin' }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${forgedRoleToken}`);

      // Since the middleware loads user from DB where role='user', access must be strictly 403 Forbidden!
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // SCOPE 2: COUPON ENGINE BOUNDARY & EDGE CASES
  // =========================================================================
  describe('Scope 2: Coupon Engine Boundary & Edge Cases', () => {
    const p10Code = `CP_P10_${Date.now()}`;
    const f50Code = `CP_F50_${Date.now()}`;
    const min100Code = `CP_MIN100_${Date.now()}`;
    const inactiveCode = `CP_INACT_${Date.now()}`;
    const massiveCode = `CP_MASSIVE_${Date.now()}`;

    beforeAll(async () => {
      await db.insert(coupons).values([
        {
          code: p10Code,
          percent: 10,
          amount: null,
          minTotal: 0,
          label: 'تخفیف ۱۰ درصد',
          active: true
        },
        {
          code: f50Code,
          percent: null,
          amount: 50000,
          minTotal: 50000,
          label: 'تخفیف ۵۰ هزار تومانی',
          active: true
        },
        {
          code: min100Code,
          percent: 15,
          amount: null,
          minTotal: 100000,
          label: 'حداقل خرید ۱۰۰ هزار تومان',
          active: true
        },
        {
          code: inactiveCode,
          percent: 20,
          amount: null,
          minTotal: 0,
          label: 'کد غیرفعال',
          active: false
        },
        {
          code: massiveCode,
          percent: null,
          amount: 1000000, // 1,000,000 Toman discount
          minTotal: 20000,
          label: 'تخفیف یک میلیون تومانی',
          active: true
        }
      ]);
      couponCodes.push(p10Code, f50Code, min100Code, inactiveCode, massiveCode);
    });

    it('2.1: Percentage and Fixed amount calculations perform accurate arithmetic', async () => {
      // 10% on 200,000 = 20,000 discount -> 180,000 total
      const resP = await request(app)
        .post('/api/coupons/validate')
        .send({ code: p10Code, cartTotal: 200000 });
      expect(resP.status).toBe(200);
      expect(resP.body.valid).toBe(true);
      expect(resP.body.discount).toBe(20000);
      expect(resP.body.finalTotal).toBe(180000);

      // Fixed 50,000 on 120,000 = 50,000 discount -> 70,000 total
      const resF = await request(app)
        .post('/api/coupons/validate')
        .send({ code: f50Code, cartTotal: 120000 });
      expect(resF.status).toBe(200);
      expect(resF.body.valid).toBe(true);
      expect(resF.body.discount).toBe(50000);
      expect(resF.body.finalTotal).toBe(70000);
    });

    it('2.2: Minimum cart threshold boundary tests (minTotal - 1, minTotal, minTotal + 1)', async () => {
      // minTotal is 100,000
      // 99,999 -> FAILS (400)
      const resUnder = await request(app)
        .post('/api/coupons/validate')
        .send({ code: min100Code, cartTotal: 99999 });
      expect(resUnder.status).toBe(400);
      expect(resUnder.body.valid).toBe(false);

      // 100,000 -> PASSES (200)
      const resExact = await request(app)
        .post('/api/coupons/validate')
        .send({ code: min100Code, cartTotal: 100000 });
      expect(resExact.status).toBe(200);
      expect(resExact.body.valid).toBe(true);
      expect(resExact.body.discount).toBe(15000);

      // 100,001 -> PASSES (200)
      const resOver = await request(app)
        .post('/api/coupons/validate')
        .send({ code: min100Code, cartTotal: 100001 });
      expect(resOver.status).toBe(200);
      expect(resOver.body.valid).toBe(true);
      expect(resOver.body.discount).toBe(15000); // 15% of 100001 = 15000.15 rounded = 15000
    });

    it('2.3: Case-insensitivity and whitespace trim robustness', async () => {
      const lower = p10Code.toLowerCase();
      const mixed = p10Code.slice(0, 4).toLowerCase() + p10Code.slice(4).toUpperCase();
      const withSpaces = `  ${lower}  `;

      const resLower = await request(app).post('/api/coupons/validate').send({ code: lower, cartTotal: 100000 });
      expect(resLower.status).toBe(200);
      expect(resLower.body.valid).toBe(true);

      const resMixed = await request(app).post('/api/coupons/validate').send({ code: mixed, cartTotal: 100000 });
      expect(resMixed.status).toBe(200);
      expect(resMixed.body.valid).toBe(true);

      const resSpaces = await request(app).post('/api/coupons/validate').send({ code: withSpaces, cartTotal: 100000 });
      expect(resSpaces.status).toBe(200);
      expect(resSpaces.body.valid).toBe(true);
    });

    it('2.4: Inactive coupon is rejected with 400', async () => {
      const res = await request(app)
        .post('/api/coupons/validate')
        .send({ code: inactiveCode, cartTotal: 100000 });

      expect(res.status).toBe(400);
      expect(res.body.valid).toBe(false);
    });

    it('2.5: Massive discount exceeding cartTotal is clamped and NEVER produces negative total', async () => {
      // Cart total = 50,000, discount is 1,000,000
      const res = await request(app)
        .post('/api/coupons/validate')
        .send({ code: massiveCode, cartTotal: 50000 });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.discount).toBe(50000); // Clamped to cartTotal
      expect(res.body.finalTotal).toBe(0);   // Never negative!

      // Also verify when placing order via POST /api/orders
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [{ id: testProductId, quantity: 1 }], // subtotal = 100,000
          recipient: {
            name: 'کاربر تست',
            phone: userPhone,
            address: 'آدرس تست'
          },
          shippingMethod: 'standard', // shippingFee = 35000
          couponCode: massiveCode     // discount = 1,000,000
        });

      expect(orderRes.status).toBe(201);
      expect(orderRes.body.order.subtotal).toBe(100000);
      expect(orderRes.body.order.discountAmount).toBe(100000); // Clamped to subtotal
      expect(orderRes.body.order.shippingFee).toBe(35000);
      expect(orderRes.body.order.total).toBe(35000); // 100000 + 35000 - 100000 = 35000 (>= 0)
    });

    it('2.6: Invalid & Malformed coupon payloads are rejected with 400', async () => {
      // Negative cartTotal
      const resNeg = await request(app).post('/api/coupons/validate').send({ code: p10Code, cartTotal: -100 });
      expect(resNeg.status).toBe(400);

      // Empty string code
      const resEmpty = await request(app).post('/api/coupons/validate').send({ code: '', cartTotal: 100000 });
      expect(resEmpty.status).toBe(400);

      // Missing cartTotal
      const resMissing = await request(app).post('/api/coupons/validate').send({ code: p10Code });
      expect(resMissing.status).toBe(400);
    });
  });

  // =========================================================================
  // SCOPE 3: PAYMENT VERIFICATION IDEMPOTENCY
  // =========================================================================
  describe('Scope 3: Payment Verification Idempotency', () => {
    let failOrderId: string;
    let failAuthority: string;
    let succOrderId: string;
    let succAuthority: string;

    beforeAll(async () => {
      // 1. Order for Failure Verification Idempotency
      failOrderId = `ORD-FAIL-IDEM-${Date.now()}`;
      failAuthority = `DUMMY_AUTH_FAIL_${Date.now()}`;
      await db.insert(orders).values({
        id: failOrderId,
        userId: userId,
        date: '1403/05/25',
        status: 'pending_payment',
        statusText: 'در انتظار پرداخت',
        total: 200000,
        subtotal: 200000,
        shippingFee: 35000,
        paymentMethod: 'پرداخت آنلاین',
        shippingMethod: 'پست پیشتاز',
        recipientName: 'کاربر تست',
        recipientPhone: userPhone,
        recipientAddress: 'تهران',
        authority: failAuthority
      });
      await db.insert(orderItems).values({
        orderId: failOrderId,
        productId: testProductId,
        price: 100000,
        qty: 2, // 2 items
        title: 'محصول استرس تست چالشگر',
        image: '/test.jpg',
        brand: 'تست چالشگر'
      });

      // 2. Order for Success Verification Idempotency
      succOrderId = `ORD-SUCC-IDEM-${Date.now()}`;
      succAuthority = `DUMMY_AUTH_SUCC_${Date.now()}`;
      await db.insert(orders).values({
        id: succOrderId,
        userId: userId,
        date: '1403/05/25',
        status: 'pending_payment',
        statusText: 'در انتظار پرداخت',
        total: 100000,
        subtotal: 100000,
        shippingFee: 35000,
        paymentMethod: 'پرداخت آنلاین',
        shippingMethod: 'پست پیشتاز',
        recipientName: 'کاربر تست',
        recipientPhone: userPhone,
        recipientAddress: 'تهران',
        authority: succAuthority
      });
      await db.insert(orderItems).values({
        orderId: succOrderId,
        productId: testProductId,
        price: 100000,
        qty: 1,
        title: 'محصول استرس تست چالشگر',
        image: '/test.jpg',
        brand: 'تست چالشگر'
      });
    });

    afterAll(async () => {
      await db.delete(orderItems).where(inArray(orderItems.orderId, [failOrderId, succOrderId]));
      await db.delete(orders).where(inArray(orders.id, [failOrderId, succOrderId]));
    });

    it('3.1: Repeated failed verification calls (Status=NOK) restock inventory EXACTLY once without duplicate restocking', async () => {
      // Record initial stock
      const initialProduct = await db.query.products.findFirst({ where: eq(products.id, testProductId) });
      const initialStock = initialProduct!.stockQuantity;

      // 1st Verification Call: Status=NOK
      const res1 = await request(app).get(`/api/payment/verify?Authority=${failAuthority}&Status=NOK`);
      expect(res1.status).toBe(302);
      expect(res1.header.location).toContain('status=failed');

      // Verify order is cancelled and stock incremented by 2
      const orderAfter1 = await db.query.orders.findFirst({ where: eq(orders.id, failOrderId) });
      expect(orderAfter1?.status).toBe('cancelled');

      const prodAfter1 = await db.query.products.findFirst({ where: eq(products.id, testProductId) });
      expect(prodAfter1?.stockQuantity).toBe(initialStock + 2);

      // 2nd Verification Call (Idempotent replay)
      const res2 = await request(app).get(`/api/payment/verify?Authority=${failAuthority}&Status=NOK`);
      expect(res2.status).toBe(302);
      expect(res2.header.location).toContain('status=failed');

      // Stock must NOT have increased again!
      const prodAfter2 = await db.query.products.findFirst({ where: eq(products.id, testProductId) });
      expect(prodAfter2?.stockQuantity).toBe(initialStock + 2);

      // 3rd Verification Call (Idempotent replay)
      const res3 = await request(app).get(`/api/payment/verify?Authority=${failAuthority}&Status=NOK`);
      expect(res3.status).toBe(302);

      const prodAfter3 = await db.query.products.findFirst({ where: eq(products.id, testProductId) });
      expect(prodAfter3?.stockQuantity).toBe(initialStock + 2);
    });

    it('3.2: Repeated successful verification calls (Status=OK) do not alter verified order refId or state', async () => {
      // 1st Verification Call: Status=OK
      const res1 = await request(app).get(`/api/payment/verify?Authority=${succAuthority}&Status=OK`);
      expect(res1.status).toBe(302);
      expect(res1.header.location).toContain('status=success');

      const orderAfter1 = await db.query.orders.findFirst({ where: eq(orders.id, succOrderId) });
      expect(orderAfter1?.status).toBe('processing');
      const assignedRefId = orderAfter1?.refId;
      expect(assignedRefId).toBeDefined();

      // 2nd Verification Call (Idempotent replay)
      const res2 = await request(app).get(`/api/payment/verify?Authority=${succAuthority}&Status=OK`);
      expect(res2.status).toBe(302);
      expect(res2.header.location).toContain('status=success');
      expect(res2.header.location).toContain(`ref_id=${assignedRefId}`);

      const orderAfter2 = await db.query.orders.findFirst({ where: eq(orders.id, succOrderId) });
      expect(orderAfter2?.status).toBe('processing');
      expect(orderAfter2?.refId).toBe(assignedRefId); // Unchanged!
    });

    it('3.3: Calling verification on already finalized order cannot reverse or corrupt status', async () => {
      // Attempting Status=NOK on the already processing succOrderId
      const resNokOnSuccess = await request(app).get(`/api/payment/verify?Authority=${succAuthority}&Status=NOK`);
      expect(resNokOnSuccess.status).toBe(302);
      // Status is already processing, should redirect with current status and NOT cancel
      const order = await db.query.orders.findFirst({ where: eq(orders.id, succOrderId) });
      expect(order?.status).toBe('processing');
    });

    it('3.4: 5 Concurrent Payment Verification Failure Requests restock inventory EXACTLY once without race condition', async () => {
      // Setup a fresh order with 3 units
      const raceOrderId = `ORD-RACE-PAY-${Date.now()}`;
      const raceAuth = `DUMMY_AUTH_RACE_${Date.now()}`;

      await db.insert(orders).values({
        id: raceOrderId,
        userId: userId,
        date: '1403/05/25',
        status: 'pending_payment',
        statusText: 'در انتظار پرداخت',
        total: 300000,
        subtotal: 300000,
        shippingFee: 35000,
        paymentMethod: 'پرداخت آنلاین',
        shippingMethod: 'پست پیشتاز',
        recipientName: 'کاربر تست',
        recipientPhone: userPhone,
        recipientAddress: 'تهران',
        authority: raceAuth
      });

      await db.insert(orderItems).values({
        orderId: raceOrderId,
        productId: testProductId,
        price: 100000,
        qty: 3,
        title: 'محصول استرس تست چالشگر',
        image: '/test.jpg',
        brand: 'تست چالشگر'
      });

      const initialStock = (await db.query.products.findFirst({ where: eq(products.id, testProductId) }))!.stockQuantity;

      // Fire 5 concurrent requests with Status=NOK
      const promises = Array.from({ length: 5 }, () =>
        request(app).get(`/api/payment/verify?Authority=${raceAuth}&Status=NOK`)
      );

      const results = await Promise.all(promises);
      results.forEach(res => {
        expect(res.status).toBe(302);
        expect(res.header.location).toContain('status=failed');
      });

      // Verification: Stock must have increased by EXACTLY 3, not 15
      const finalProd = await db.query.products.findFirst({ where: eq(products.id, testProductId) });
      expect(finalProd!.stockQuantity).toBe(initialStock + 3);

      await db.delete(orderItems).where(eq(orderItems.orderId, raceOrderId));
      await db.delete(orders).where(eq(orders.id, raceOrderId));
    });
  });

  // =========================================================================
  // SCOPE 4: USER ADDRESS BOOK DEFAULT ATOMICITY & TENANT ISOLATION
  // =========================================================================
  describe('Scope 4: User Address Book Default Atomicity & Tenant Isolation', () => {
    let addr1Id: string;
    let addr2Id: string;
    let addr3Id: string;
    let otherUserAddrId: string;

    it('4.1: First address created automatically becomes default (isDefault = true)', async () => {
      const res = await request(app)
        .post('/api/users/me/addresses')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'خانه ۱',
          name: 'کاربر آزمون',
          phone: userPhone,
          province: 'تهران',
          city: 'تهران',
          address: 'خیابان ولیعصر، کوچه اول، پلاک ۱',
          postalCode: '1111111111'
        });

      expect(res.status).toBe(201);
      expect(res.body.address.isDefault).toBe(true);
      addr1Id = res.body.address.id;
      createdAddressIds.push(addr1Id);
    });

    it('4.2: Subsequent addresses created are non-default (isDefault = false)', async () => {
      // Add 2nd address
      const res2 = await request(app)
        .post('/api/users/me/addresses')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'محل کار ۲',
          name: 'کاربر آزمون',
          phone: userPhone,
          province: 'تهران',
          city: 'تهران',
          address: 'خیابان مطهری، پلاک ۲۰',
          postalCode: '2222222222'
        });

      expect(res2.status).toBe(201);
      expect(res2.body.address.isDefault).toBe(false);
      addr2Id = res2.body.address.id;
      createdAddressIds.push(addr2Id);

      // Add 3rd address
      const res3 = await request(app)
        .post('/api/users/me/addresses')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'انبار ۳',
          name: 'کاربر آزمون',
          phone: userPhone,
          province: 'تهران',
          city: 'تهران',
          address: 'خیابان آزادی، پلاک ۳۰',
          postalCode: '3333333333'
        });

      expect(res3.status).toBe(201);
      expect(res3.body.address.isDefault).toBe(false);
      addr3Id = res3.body.address.id;
      createdAddressIds.push(addr3Id);

      // Verify in DB that exactly ONE address is default
      const userAddrs = await db.query.addresses.findMany({ where: eq(addresses.userId, userId) });
      const defaultAddrs = userAddrs.filter(a => a.isDefault);
      expect(defaultAddrs.length).toBe(1);
      expect(defaultAddrs[0].id).toBe(addr1Id);
    });

    it('4.3: Atomically switching default address unsets all previous defaults', async () => {
      // Set Address 2 as default
      const res = await request(app)
        .put(`/api/users/me/addresses/${addr2Id}/default`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);

      // Verify in DB: addr2 is true, addr1 and addr3 are false
      const userAddrs = await db.query.addresses.findMany({ where: eq(addresses.userId, userId) });
      const addr1 = userAddrs.find(a => a.id === addr1Id);
      const addr2 = userAddrs.find(a => a.id === addr2Id);
      const addr3 = userAddrs.find(a => a.id === addr3Id);

      expect(addr1?.isDefault).toBe(false);
      expect(addr2?.isDefault).toBe(true);
      expect(addr3?.isDefault).toBe(false);

      const defaultCount = userAddrs.filter(a => a.isDefault).length;
      expect(defaultCount).toBe(1);
    });

    it('4.4: Deleting the default address automatically promotes a remaining address to default', async () => {
      // Currently addr2Id is default. Delete addr2Id.
      const res = await request(app)
        .delete(`/api/users/me/addresses/${addr2Id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);

      // Verify in DB: addr2 is gone, exactly one of {addr1, addr3} is now isDefault: true
      const userAddrs = await db.query.addresses.findMany({ where: eq(addresses.userId, userId) });
      expect(userAddrs.length).toBe(2);
      expect(userAddrs.find(a => a.id === addr2Id)).toBeUndefined();

      const defaultAddrs = userAddrs.filter(a => a.isDefault);
      expect(defaultAddrs.length).toBe(1); // One remaining promoted
    });

    it('4.5: Tenant Isolation: User cannot set default or delete another user address', async () => {
      // Other user creates an address
      const otherRes = await request(app)
        .post('/api/users/me/addresses')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          title: 'آدرس کاربر دیگر',
          name: 'کاربر دیگر',
          phone: otherPhone,
          province: 'تهران',
          city: 'تهران',
          address: 'خیابان کارگر، پلاک ۱۰۰',
          postalCode: '5555555555'
        });

      expect(otherRes.status).toBe(201);
      otherUserAddrId = otherRes.body.address.id;
      createdAddressIds.push(otherUserAddrId);

      // User attempts to set other user address as default -> 404
      const resSet = await request(app)
        .put(`/api/users/me/addresses/${otherUserAddrId}/default`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(resSet.status).toBe(404);

      // User attempts to delete other user address -> 404
      const resDel = await request(app)
        .delete(`/api/users/me/addresses/${otherUserAddrId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(resDel.status).toBe(404);

      // Verify other user address still exists and belongs to other user
      const dbAddr = await db.query.addresses.findFirst({ where: eq(addresses.id, otherUserAddrId) });
      expect(dbAddr).toBeDefined();
      expect(dbAddr?.userId).toBe(otherUserId);
    });

    it('4.6: Setting default on non-existent address ID strictly returns 404', async () => {
      const res = await request(app)
        .put('/api/users/me/addresses/addr-non-existent-id-999/default')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(404);
    });

    it('4.7: Deleting all remaining addresses cleanly leaves address book empty', async () => {
      const remaining = await db.query.addresses.findMany({ where: eq(addresses.userId, userId) });
      for (const a of remaining) {
        const delRes = await request(app)
          .delete(`/api/users/me/addresses/${a.id}`)
          .set('Authorization', `Bearer ${userToken}`);
        expect(delRes.status).toBe(200);
      }

      const finalAddrs = await db.query.addresses.findMany({ where: eq(addresses.userId, userId) });
      expect(finalAddrs.length).toBe(0);
    });
  });
});
