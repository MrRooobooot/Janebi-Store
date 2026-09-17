import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import express, { json } from 'express';
import { db, sqlite } from '../../server/db/index.js';
import { products, users, orders, orderItems, coupons, cartItems } from '../../server/db/schema.js';
import { and, eq, inArray, sql } from 'drizzle-orm';
import orderRoutes from '../../server/routes/orders.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';

const app = express();
app.use(json());
app.use('/api/orders', orderRoutes);
app.use(errorHandler);

describe('Database Transaction Rollback Integrity', () => {
  const timestamp = Date.now();
  const testUserId = `user-rollback-${timestamp}`;
  const testPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const testToken = jwt.sign({ userId: testUserId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

  let prodInStockId: number;
  let prodOutOfStockId: number;

  beforeAll(async () => {
    // 1. Create test user
    await db.insert(users).values({
      id: testUserId,
      name: 'کاربر تست تراکنش',
      phone: testPhone,
      password: 'hash'
    });

    // 2. Create product with stock
    const [p1] = await db.insert(products).values({
      title: `محصول دارای موجودی ${timestamp}`,
      category: 'test',
      price: 200000,
      image: '/p1.jpg',
      brand: 'تست',
      stockQuantity: 10,
      sku: `SKU-ROLLBACK-1-${timestamp}`
    }).returning();
    prodInStockId = p1.id;

    // 3. Create product with zero stock
    const [p2] = await db.insert(products).values({
      title: `محصول ناموجود ${timestamp}`,
      category: 'test',
      price: 150000,
      image: '/p2.jpg',
      brand: 'تست',
      stockQuantity: 0,
      sku: `SKU-ROLLBACK-2-${timestamp}`
    }).returning();
    prodOutOfStockId = p2.id;
  });

  afterAll(async () => {
    const pids = [prodInStockId, prodOutOfStockId].filter(Boolean);
    if (pids.length > 0) {
      await db.delete(orderItems).where(inArray(orderItems.productId, pids));
      await db.delete(products).where(inArray(products.id, pids));
    }
    await db.delete(orders).where(eq(orders.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it('rolls back all stock deductions and order inserts when one item in multi-item order is out of stock', async () => {
    // Stock before checkout
    const beforeP1 = await db.query.products.findFirst({ where: eq(products.id, prodInStockId) });
    expect(beforeP1?.stockQuantity).toBe(10);

    const initialOrders = await db.query.orders.findMany({ where: eq(orders.userId, testUserId) });
    const initialOrderCount = initialOrders.length;

    // Attempt multi-item order where item 1 has stock (requesting 3) but item 2 is out of stock (requesting 1)
    const payload = {
      items: [
        { id: prodInStockId, quantity: 3 },
        { id: prodOutOfStockId, quantity: 1 }
      ],
      recipient: {
        name: 'کاربر تست',
        phone: testPhone,
        address: 'تهران، خیابان آزادی',
        postalCode: '1234567890'
      },
      paymentMethod: 'online',
      shippingMethod: 'standard'
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('موجودی');

    // Verify stock of prodInStock was NOT decremented (must still be 10)
    const afterP1 = await db.query.products.findFirst({ where: eq(products.id, prodInStockId) });
    expect(afterP1?.stockQuantity).toBe(10);

    // Verify zero new orders were committed in the database
    const afterOrders = await db.query.orders.findMany({ where: eq(orders.userId, testUserId) });
    expect(afterOrders.length).toBe(initialOrderCount);
  });

  it('rolls back database modifications when an unhandled error is thrown inside db.transaction', async () => {
    const initialPrice = 200000;

    await expect(db.transaction(async (tx) => {
      // Step 1: Update product price inside transaction
      await tx.update(products)
        .set({ price: 999999 })
        .where(eq(products.id, prodInStockId));

      // Step 2: Throw artificial exception
      throw new Error('Simulated failure during checkout/transaction');
    })).rejects.toThrow('Simulated failure during checkout/transaction');

    // Verify the update was completely discarded and price reverted
    const p = await db.query.products.findFirst({ where: eq(products.id, prodInStockId) });
    expect(p?.price).toBe(initialPrice);
  });

  it('rolls back multi-table writes atomically upon transaction failure', async () => {
    const fakeOrderId = `ORD-FAIL-${Date.now()}`;

    await expect(db.transaction(async (tx) => {
      // 1. Insert order
      await tx.insert(orders).values({
        id: fakeOrderId,
        userId: testUserId,
        date: '1403/05/25',
        status: 'pending_payment',
        statusText: 'تست',
        total: 50000,
        subtotal: 50000,
        paymentMethod: 'online',
        shippingMethod: 'standard',
        recipientName: 'تست',
        recipientPhone: testPhone,
        recipientAddress: 'آدرس'
      });

      // 2. Decrement stock
      await tx.update(products)
        .set({ stockQuantity: sql`stockQuantity - 5` })
        .where(eq(products.id, prodInStockId));

      // 3. Throw to abort
      throw new Error('Abort transaction');
    })).rejects.toThrow('Abort transaction');

    // Verify neither order nor stock change was persisted
    const orderCheck = await db.query.orders.findFirst({ where: eq(orders.id, fakeOrderId) });
    expect(orderCheck).toBeUndefined();

    const productCheck = await db.query.products.findFirst({ where: eq(products.id, prodInStockId) });
    expect(productCheck?.stockQuantity).toBe(10);
  });
});

/**
 * Rollback AFTER real writes.
 *
 * The suite above only proves rejection paths that abort BEFORE any write
 * (pre-flight stock check) or hand-rolled transactions. These tests inject a
 * fault at the DATABASE layer — a SQLite trigger that RAISEs ABORT on a table
 * the real handler writes to — so the real POST /api/orders and
 * POST /api/orders/:id/cancel handlers have already committed earlier writes
 * inside their own `db.transaction` when the failure hits. The only thing that
 * can save the invariants is a genuine ROLLBACK of the whole transaction, which
 * is exactly what these assert.
 *
 * Trigger SQL is dropped in a `finally` + `afterAll` so no residue survives in
 * the shared dev DB even if an assertion throws.
 */
describe.skipIf(!sqlite)('Rollback after real writes (SQLite fault injection)', () => {
  const ts = Date.now();
  const userId = `user-rb-trig-${ts}`;
  const phone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const token = jwt.sign({ userId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const couponCode = `RB${ts}`;

  const TRIGGERS = ['rb_cart_clear_abort', 'rb_mid_loop_abort', 'rb_raw_tx_abort'];
  const dropTriggers = () => {
    for (const name of TRIGGERS) {
      try {
        sqlite!.exec(`DROP TRIGGER IF EXISTS ${name}`);
      } catch {
        /* trigger already gone — nothing to clean */
      }
    }
  };

  let prodA = 0;
  let prodB = 0;

  const recipient = { name: 'RB', phone, address: 'تهران' };

  beforeAll(async () => {
    dropTriggers();
    await db.insert(users).values({
      id: userId,
      name: 'کاربر تست رول‌بک',
      phone,
      password: 'hash',
      vipPoints: 100,
    });

    const [a] = await db.insert(products).values({
      title: `RB-A ${ts}`,
      category: 'test',
      price: 200000,
      image: '/rb-a.jpg',
      brand: 'تست',
      stockQuantity: 10,
      sku: `SKU-RB-A-${ts}`,
    }).returning({ id: products.id });
    prodA = a.id;

    const [b] = await db.insert(products).values({
      title: `RB-B ${ts}`,
      category: 'test',
      price: 100000,
      image: '/rb-b.jpg',
      brand: 'تست',
      stockQuantity: 10,
      sku: `SKU-RB-B-${ts}`,
    }).returning({ id: products.id });
    prodB = b.id;

    await db.insert(coupons).values({
      code: couponCode,
      percent: 10,
      minTotal: 1000,
      label: 'کد تست رول‌بک',
      active: true,
      usageLimit: 5,
      usedCount: 0,
    });
  });

  afterAll(async () => {
    dropTriggers();
    await db.delete(orderItems).where(inArray(orderItems.productId, [prodA, prodB]));
    await db.delete(orders).where(eq(orders.userId, userId));
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
    await db.delete(coupons).where(eq(coupons.code, couponCode));
    await db.delete(products).where(inArray(products.id, [prodA, prodB]));
    await db.delete(users).where(eq(users.id, userId));
  });

  it('rolls back every earlier write when the final cart-clear step fails inside the real handler', async () => {
    // Order insert → order_items insert → stock decrement → VIP deduction →
    // earned-points credit (COD) → coupon counter increment → cart clear.
    // The abort fires on the LAST step, so a missing ROLLBACK would leave an
    // order, a stock hole, spent VIP points and a burned coupon behind.
    await db.update(users).set({ vipPoints: 100 }).where(eq(users.id, userId));
    await db.update(products).set({ stockQuantity: 10 }).where(eq(products.id, prodA));
    await db.update(coupons).set({ usedCount: 0 }).where(eq(coupons.code, couponCode));
    await db.insert(cartItems).values({
      id: `cart-rb-${ts}`,
      userId,
      productId: prodA,
      quantity: 1,
      addedAt: Date.now(),
    });

    try {
      // Negative control: the identical payload succeeds while the trigger is
      // absent, so the 400 below can only come from the injected fault.
      const control = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ id: prodA, quantity: 2 }],
          recipient,
          couponCode,
          useVipPoints: true,
          paymentMethod: 'cod',
          shippingMethod: 'standard',
        });
      expect(control.status).toBe(201);
      await db.delete(orderItems).where(eq(orderItems.orderId, control.body.order.id));
      await db.delete(orders).where(eq(orders.id, control.body.order.id));
      await db.update(users).set({ vipPoints: 100 }).where(eq(users.id, userId));
      await db.update(products).set({ stockQuantity: 10 }).where(eq(products.id, prodA));
      await db.update(coupons).set({ usedCount: 0 }).where(eq(coupons.code, couponCode));
      // The control order cleared the cart; re-seed the row the aborting DELETE targets.
      await db.insert(cartItems).values({
        id: `cart-rb-${ts}`,
        userId,
        productId: prodA,
        quantity: 1,
        addedAt: Date.now(),
      });

      sqlite!.exec(
        `CREATE TRIGGER rb_cart_clear_abort BEFORE DELETE ON cart_items ` +
        `WHEN OLD.user_id = '${userId}' ` +
        `BEGIN SELECT RAISE(ABORT, 'ROLLBACK_TEST_CART_CLEAR'); END`
      );

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ id: prodA, quantity: 2 }],
          recipient,
          couponCode,
          useVipPoints: true,
          paymentMethod: 'cod',
          shippingMethod: 'standard',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('ROLLBACK_TEST_CART_CLEAR');

      // No order, no order items.
      const ordersAfter = await db.select().from(orders).where(eq(orders.userId, userId));
      expect(ordersAfter).toHaveLength(0);
      const itemsAfter = await db.select().from(orderItems).where(eq(orderItems.productId, prodA));
      expect(itemsAfter).toHaveLength(0);

      // Stock untouched.
      const p = await db.query.products.findFirst({ where: eq(products.id, prodA) });
      expect(p?.stockQuantity).toBe(10);

      // VIP points untouched (neither the deduction nor the COD credit stuck).
      const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
      expect(u?.vipPoints).toBe(100);

      // Coupon redemption counter untouched.
      const c = await db.query.coupons.findFirst({ where: eq(coupons.code, couponCode) });
      expect(c?.usedCount).toBe(0);

      // The cart row the aborted DELETE targeted is still there.
      const cartAfter = await db.select().from(cartItems).where(eq(cartItems.userId, userId));
      expect(cartAfter).toHaveLength(1);
    } finally {
      dropTriggers();
      await db.delete(cartItems).where(eq(cartItems.userId, userId));
    }
  });

  it('rolls back the whole multi-item order when a stock write fails mid-loop', async () => {
    await db.update(products).set({ stockQuantity: 10 }).where(inArray(products.id, [prodA, prodB]));

    try {
      // Negative control: both items order fine without the trigger.
      const control = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [
            { id: prodA, quantity: 2 },
            { id: prodB, quantity: 3 },
          ],
          recipient,
          paymentMethod: 'online',
          shippingMethod: 'standard',
        });
      expect(control.status).toBe(201);
      await db.delete(orderItems).where(eq(orderItems.orderId, control.body.order.id));
      await db.delete(orders).where(eq(orders.id, control.body.order.id));
      await db.update(products).set({ stockQuantity: 10 }).where(inArray(products.id, [prodA, prodB]));

      // Fires on the SECOND product's stock decrement: by then the order row,
      // the first order_item and the first product's decrement are all written.
      sqlite!.exec(
        `CREATE TRIGGER rb_mid_loop_abort AFTER UPDATE ON products ` +
        `WHEN NEW.id = ${prodB} ` +
        `BEGIN SELECT RAISE(ABORT, 'ROLLBACK_TEST_MID_LOOP'); END`
      );

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [
            { id: prodA, quantity: 2 },
            { id: prodB, quantity: 3 },
          ],
          recipient,
          paymentMethod: 'online',
          shippingMethod: 'standard',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('ROLLBACK_TEST_MID_LOOP');

      const ordersAfter = await db.select().from(orders).where(eq(orders.userId, userId));
      expect(ordersAfter).toHaveLength(0);
      const itemsAfter = await db.select().from(orderItems).where(inArray(orderItems.productId, [prodA, prodB]));
      expect(itemsAfter).toHaveLength(0);

      // The first product's successful decrement was rolled back too.
      const pa = await db.query.products.findFirst({ where: eq(products.id, prodA) });
      const pb = await db.query.products.findFirst({ where: eq(products.id, prodB) });
      expect(pa?.stockQuantity).toBe(10);
      expect(pb?.stockQuantity).toBe(10);
    } finally {
      dropTriggers();
    }
  });

  it('leaves the transaction queue usable after an aborted transaction', async () => {
    try {
      sqlite!.exec(
        `CREATE TRIGGER rb_raw_tx_abort AFTER UPDATE ON products ` +
        `WHEN NEW.id = ${prodA} ` +
        `BEGIN SELECT RAISE(ABORT, 'ROLLBACK_TEST_RAW_TX'); END`
      );

      await expect(db.transaction(async (tx) => {
        await tx.update(products).set({ price: 123 }).where(eq(products.id, prodA));
      })).rejects.toThrow('ROLLBACK_TEST_RAW_TX');
    } finally {
      dropTriggers();
    }

    // Rolled back …
    const p = await db.query.products.findFirst({ where: eq(products.id, prodA) });
    expect(p?.price).toBe(200000);

    // … and the wrapper's tx-depth bookkeeping is intact: a fresh transaction
    // still begins and commits (a leaked BEGIN would throw here).
    const committed = await db.transaction(async (tx) => {
      await tx.update(products).set({ price: 200000 }).where(eq(products.id, prodA));
      return 'committed';
    });
    expect(committed).toBe('committed');

    // Plain non-transactional writes work as well.
    await db.update(users).set({ name: 'کاربر تست رول‌بک' }).where(and(eq(users.id, userId)));
  });
});
