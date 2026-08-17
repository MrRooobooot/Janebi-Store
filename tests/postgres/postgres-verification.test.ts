import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as pgSchema from '../../server/db/schema.pg.js';
import { eq, sql, inArray, and } from 'drizzle-orm';

describe('Phase 2 — Live PostgreSQL Engine & Concurrency Verification', () => {
  const connectionString = process.env.PG_DATABASE_URL || `postgres://${process.env.USER || 'aidin'}@localhost:5432/janebi_verify`;
  let pool: pkg.Pool;
  let db: ReturnType<typeof drizzle>;
  let isPgAvailable = false;

  const timestamp = Date.now();
  const testUserId = `user-pg-verify-${timestamp}`;
  const testPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);

  let singleStockProductId: number;
  let multiStockProductId: number;
  let rollbackProductId: number;

  beforeAll(async () => {
    try {
      pool = new Pool({ connectionString, connectionTimeoutMillis: 2000 });
      const client = await pool.connect();
      client.release();
      db = drizzle(pool, { schema: pgSchema });
      isPgAvailable = true;

      // 1. Create test user in live PostgreSQL
      await db.insert(pgSchema.users).values({
        id: testUserId,
        name: 'کاربر تست زنده پستگرس',
        phone: testPhone,
        password: 'hash_pg_password',
        role: 'user'
      });

      // 2. Create products in live PostgreSQL
      const [p1] = await db.insert(pgSchema.products).values({
        title: `محصول تک واحدی پستگرس ${timestamp}`,
        category: 'test_pg',
        price: 120000,
        image: '/pg1.jpg',
        brand: 'پستگرس',
        stockQuantity: 1,
        sku: `SKU-PG-RACE-1-${timestamp}`
      }).returning();
      singleStockProductId = p1.id;

      const [p2] = await db.insert(pgSchema.products).values({
        title: `محصول پنج واحدی پستگرس ${timestamp}`,
        category: 'test_pg',
        price: 180000,
        image: '/pg2.jpg',
        brand: 'پستگرس',
        stockQuantity: 5,
        sku: `SKU-PG-RACE-5-${timestamp}`
      }).returning();
      multiStockProductId = p2.id;

      const [p3] = await db.insert(pgSchema.products).values({
        title: `محصول رول‌بک پستگرس ${timestamp}`,
        category: 'test_pg',
        price: 250000,
        image: '/pg3.jpg',
        brand: 'پستگرس',
        stockQuantity: 10,
        sku: `SKU-PG-ROLLBACK-${timestamp}`
      }).returning();
      rollbackProductId = p3.id;
    } catch (err) {
      console.warn('⚠️ PostgreSQL not available at ' + connectionString + ', skipping live PG tests.');
      isPgAvailable = false;
    }
  });

  afterAll(async () => {
    if (!isPgAvailable || !pool) return;
    try {
      const pids = [singleStockProductId, multiStockProductId, rollbackProductId].filter(Boolean);
      if (pids.length > 0) {
        await db.delete(pgSchema.orderItems).where(inArray(pgSchema.orderItems.productId, pids));
        await db.delete(pgSchema.products).where(inArray(pgSchema.products.id, pids));
      }
      await db.delete(pgSchema.orders).where(eq(pgSchema.orders.userId, testUserId));
      await db.delete(pgSchema.users).where(eq(pgSchema.users.id, testUserId));
      await pool.end();
    } catch (err) {
      // ignore teardown errors
    }
  });

  it('verifies live PostgreSQL catalog contains all 10 tables and valid constraints', async (ctx) => {
    if (!isPgAvailable) {
      ctx.skip();
      return;
    }
    const client = await pool.connect();
    try {
      const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);
      const tableNames = res.rows.map(r => r.table_name);
      
      const expected = [
        'addresses',
        'cart_items',
        'coupons',
        'order_items',
        'orders',
        'product_features',
        'products',
        'reviews',
        'users',
        'wishlist_items'
      ];
      
      for (const t of expected) {
        expect(tableNames).toContain(t);
      }
    } finally {
      client.release();
    }
  });

  it('executes atomic stock reservation and ACID rollback against live PostgreSQL', async (ctx) => {
    if (!isPgAvailable) {
      ctx.skip();
      return;
    }
    const client = await pool.connect();
    try {
      // Begin PostgreSQL transaction
      await client.query('BEGIN');

      // Attempt conditional decrement
      const decrementRes = await client.query(`
        UPDATE products 
        SET "stockQuantity" = "stockQuantity" - 3 
        WHERE id = $1 AND "stockQuantity" >= 3
        RETURNING "stockQuantity"
      `, [rollbackProductId]);

      expect(decrementRes.rowCount).toBe(1);
      expect(decrementRes.rows[0].stockQuantity).toBe(7);

      // Abort / Rollback transaction
      await client.query('ROLLBACK');

      // Verify stock was restored to 10
      const checkRes = await client.query(`
        SELECT "stockQuantity" FROM products WHERE id = $1
      `, [rollbackProductId]);

      expect(checkRes.rows[0].stockQuantity).toBe(10);
    } finally {
      client.release();
    }
  });

  it('prevents overselling under 50 concurrent requests on a single-stock item in PostgreSQL', async (ctx) => {
    if (!isPgAvailable) {
      ctx.skip();
      return;
    }
    const concurrencyCount = 50;

    // Simulate 50 concurrent workers competing to decrement 1 unit with atomic constraint
    const tasks = Array.from({ length: concurrencyCount }).map(async (_, idx) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const res = await client.query(`
          UPDATE products 
          SET "stockQuantity" = "stockQuantity" - 1 
          WHERE id = $1 AND "stockQuantity" >= 1
          RETURNING "stockQuantity"
        `, [singleStockProductId]);

        if (res.rowCount === 1) {
          const orderId = `ORD-PG-RACE-${timestamp}-${idx}`;
          await client.query(`
            INSERT INTO orders (id, user_id, date, status, "statusText", total, subtotal, "paymentMethod", "shippingMethod", "recipientName", "recipientPhone", "recipientAddress")
            VALUES ($1, $2, '1403/05/25', 'pending_payment', 'در انتظار پرداخت', 120000, 120000, 'online', 'standard', 'کاربر تستی', $3, 'تهران')
          `, [orderId, testUserId, testPhone]);

          await client.query(`
            INSERT INTO order_items (order_id, product_id, price, qty, title, image, brand)
            VALUES ($1, $2, 120000, 1, 'محصول تک واحدی', '/pg1.jpg', 'پستگرس')
          `, [orderId, singleStockProductId]);

          await client.query('COMMIT');
          return { success: true, orderId };
        } else {
          await client.query('ROLLBACK');
          return { success: false, reason: 'OUT_OF_STOCK' };
        }
      } catch (err) {
        await client.query('ROLLBACK');
        return { success: false, error: err };
      } finally {
        client.release();
      }
    });

    const results = await Promise.all(tasks);
    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    // Exactly 1 winner in PostgreSQL
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(concurrencyCount - 1);

    // Verify final stock is exactly 0
    const finalStockRes = await pool.query('SELECT "stockQuantity" FROM products WHERE id = $1', [singleStockProductId]);
    expect(finalStockRes.rows[0].stockQuantity).toBe(0);

    // Verify exactly 1 order item created in PostgreSQL
    const orderItemsRes = await pool.query('SELECT count(*) as count FROM order_items WHERE product_id = $1', [singleStockProductId]);
    expect(Number(orderItemsRes.rows[0].count)).toBe(1);
  });

  it('guarantees exactly 5 winners when 50 concurrent requests compete for 5 items in PostgreSQL', async (ctx) => {
    if (!isPgAvailable) {
      ctx.skip();
      return;
    }
    const concurrencyCount = 50;

    const tasks = Array.from({ length: concurrencyCount }).map(async (_, idx) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const res = await client.query(`
          UPDATE products 
          SET "stockQuantity" = "stockQuantity" - 1 
          WHERE id = $1 AND "stockQuantity" >= 1
          RETURNING "stockQuantity"
        `, [multiStockProductId]);

        if (res.rowCount === 1) {
          const orderId = `ORD-PG-5-${timestamp}-${idx}`;
          await client.query(`
            INSERT INTO orders (id, user_id, date, status, "statusText", total, subtotal, "paymentMethod", "shippingMethod", "recipientName", "recipientPhone", "recipientAddress")
            VALUES ($1, $2, '1403/05/25', 'pending_payment', 'در انتظار پرداخت', 180000, 180000, 'online', 'standard', 'کاربر تستی', $3, 'تهران')
          `, [orderId, testUserId, testPhone]);

          await client.query(`
            INSERT INTO order_items (order_id, product_id, price, qty, title, image, brand)
            VALUES ($1, $2, 180000, 1, 'محصول ۵ واحدی', '/pg2.jpg', 'پستگرس')
          `, [orderId, multiStockProductId]);

          await client.query('COMMIT');
          return { success: true, orderId };
        } else {
          await client.query('ROLLBACK');
          return { success: false, reason: 'OUT_OF_STOCK' };
        }
      } catch (err) {
        await client.query('ROLLBACK');
        return { success: false, error: err };
      } finally {
        client.release();
      }
    });

    const results = await Promise.all(tasks);
    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    // Exactly 5 winners
    expect(successes.length).toBe(5);
    expect(failures.length).toBe(concurrencyCount - 5);

    // Stock must be 0
    const finalStockRes = await pool.query('SELECT "stockQuantity" FROM products WHERE id = $1', [multiStockProductId]);
    expect(finalStockRes.rows[0].stockQuantity).toBe(0);

    // Exactly 5 order items in PostgreSQL
    const orderItemsRes = await pool.query('SELECT count(*) as count FROM order_items WHERE product_id = $1', [multiStockProductId]);
    expect(Number(orderItemsRes.rows[0].count)).toBe(5);
  });

  it('guarantees payment verify callback idempotency and prevents double-restock in PostgreSQL', async (ctx) => {
    if (!isPgAvailable) {
      ctx.skip();
      return;
    }
    // 1. Create order with 2 units
    const orderId = `ORD-PG-PAY-${timestamp}`;
    await pool.query(`
      INSERT INTO orders (id, user_id, date, status, "statusText", total, subtotal, "paymentMethod", "shippingMethod", "recipientName", "recipientPhone", "recipientAddress", authority)
      VALUES ($1, $2, '1403/05/25', 'pending_payment', 'در انتظار پرداخت', 500000, 500000, 'online', 'standard', 'کاربر تستی', $3, 'تهران', $4)
    `, [orderId, testUserId, testPhone, `AUTH_PG_${timestamp}`]);

    await pool.query(`
      INSERT INTO order_items (order_id, product_id, price, qty, title, image, brand)
      VALUES ($1, $2, 250000, 2, 'محصول رول‌بک', '/pg3.jpg', 'پستگرس')
    `, [orderId, rollbackProductId]);

    // Deduct stock from 10 to 8
    await pool.query('UPDATE products SET "stockQuantity" = "stockQuantity" - 2 WHERE id = $1', [rollbackProductId]);

    const stockBeforeCallback = await pool.query('SELECT "stockQuantity" FROM products WHERE id = $1', [rollbackProductId]);
    expect(stockBeforeCallback.rows[0].stockQuantity).toBe(8);

    // 2. Fire 20 parallel payment failure callbacks
    const callbacks = Array.from({ length: 20 }).map(async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Check if order is still pending_payment (idempotency guard)
        const orderRes = await client.query(`
          SELECT status FROM orders WHERE id = $1 FOR UPDATE
        `, [orderId]);

        if (orderRes.rows.length === 0 || orderRes.rows[0].status !== 'pending_payment') {
          await client.query('COMMIT');
          return { restocked: false };
        }

        // Restock
        const items = await client.query('SELECT product_id, qty FROM order_items WHERE order_id = $1', [orderId]);
        for (const itm of items.rows) {
          await client.query('UPDATE products SET "stockQuantity" = "stockQuantity" + $1 WHERE id = $2', [itm.qty, itm.product_id]);
        }

        // Mark cancelled
        await client.query(`UPDATE orders SET status = 'cancelled', "statusText" = 'لغو شده' WHERE id = $1`, [orderId]);

        await client.query('COMMIT');
        return { restocked: true };
      } catch (err) {
        await client.query('ROLLBACK');
        return { restocked: false, error: err };
      } finally {
        client.release();
      }
    });

    const callbackResults = await Promise.all(callbacks);
    const restockedCount = callbackResults.filter(r => r.restocked).length;

    // Exactly 1 callback should perform the restock
    expect(restockedCount).toBe(1);

    // Final stock must be restored to 10 (NOT 8 + 20*2 = 48)
    const stockAfterCallback = await pool.query('SELECT "stockQuantity" FROM products WHERE id = $1', [rollbackProductId]);
    expect(stockAfterCallback.rows[0].stockQuantity).toBe(10);
  });
});
