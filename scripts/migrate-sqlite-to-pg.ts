import Database from 'better-sqlite3';
import { Pool } from 'pg';
import path from 'path';

async function migrate() {
  const sqlitePath = path.resolve(process.cwd(), './data/janebi.db');
  const sqlite = new Database(sqlitePath);
  
  const pool = new Pool({
    connectionString: process.env.PG_DATABASE_URL || `postgres://${process.env.USER || 'aidin'}@localhost:5432/janebi_verify`
  });

  const client = await pool.connect();
  console.log('Connected to PostgreSQL successfully.');

  try {
    await client.query('BEGIN');

    // 1. Users
    const users = sqlite.prepare('SELECT * FROM users').all() as any[];
    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, name, phone, email, password, avatar, joined_date, vip_points, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.name, u.phone, u.email, u.password, u.avatar, u.joined_date, u.vip_points, u.role]
      );
    }
    console.log(`Migrated ${users.length} users.`);

    // 2. Addresses
    const addresses = sqlite.prepare('SELECT * FROM addresses').all() as any[];
    for (const a of addresses) {
      await client.query(
        `INSERT INTO addresses (id, user_id, title, name, phone, province, city, address, postal_code, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [a.id, a.user_id, a.title, a.name, a.phone, a.province, a.city, a.address, a.postal_code, Boolean(a.is_default)]
      );
    }
    console.log(`Migrated ${addresses.length} addresses.`);

    // 3. Products
    const products = sqlite.prepare('SELECT * FROM products').all() as any[];
    for (const p of products) {
      await client.query(
        `INSERT INTO products (id, title, category, price, "originalPrice", discount, image, brand, warranty, description, rating, "reviewsCount", "stockQuantity", sku)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.title, p.category, p.price, p.originalPrice, p.discount, p.image, p.brand, p.warranty, p.description, p.rating, p.reviewsCount, p.stockQuantity, p.sku]
      );
    }
    await client.query(`SELECT setval('products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM products))`);
    console.log(`Migrated ${products.length} products.`);

    // 4. Product Features
    const features = sqlite.prepare('SELECT * FROM product_features').all() as any[];
    for (const f of features) {
      await client.query(
        `INSERT INTO product_features (id, product_id, feature)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [f.id, f.product_id, f.feature]
      );
    }
    await client.query(`SELECT setval('product_features_id_seq', (SELECT COALESCE(MAX(id), 1) FROM product_features))`);
    console.log(`Migrated ${features.length} product features.`);

    // 5. Orders
    const orders = sqlite.prepare('SELECT * FROM orders').all() as any[];
    for (const o of orders) {
      await client.query(
        `INSERT INTO orders (id, user_id, date, status, "statusText", total, subtotal, "shippingFee", "discountAmount", "paymentMethod", "shippingMethod", "recipientName", "recipientPhone", "recipientAddress", "recipientPostalCode", authority, "refId")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (id) DO NOTHING`,
        [o.id, o.user_id, o.date, o.status, o.statusText, o.total, o.subtotal, o.shippingFee, o.discountAmount, o.paymentMethod, o.shippingMethod, o.recipientName, o.recipientPhone, o.recipientAddress, o.recipientPostalCode, o.authority, o.refId]
      );
    }
    console.log(`Migrated ${orders.length} orders.`);

    // 6. Order Items
    const orderItems = sqlite.prepare('SELECT * FROM order_items').all() as any[];
    for (const oi of orderItems) {
      await client.query(
        `INSERT INTO order_items (id, order_id, product_id, price, qty, title, image, brand)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [oi.id, oi.order_id, oi.product_id, oi.price, oi.qty, oi.title, oi.image, oi.brand]
      );
    }
    await client.query(`SELECT setval('order_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM order_items))`);
    console.log(`Migrated ${orderItems.length} order items.`);

    // 7. Reviews
    const reviews = sqlite.prepare('SELECT * FROM reviews').all() as any[];
    for (const r of reviews) {
      await client.query(
        `INSERT INTO reviews (id, product_id, user_id, "userName", rating, title, comment, date, "isVerifiedBuyer", recommend, "helpfulCount", "unhelpfulCount")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.product_id, r.user_id, r.userName, r.rating, r.title, r.comment, r.date, Boolean(r.isVerifiedBuyer), Boolean(r.recommend), r.helpfulCount, r.unhelpfulCount]
      );
    }
    console.log(`Migrated ${reviews.length} reviews.`);

    // 8. Coupons
    const coupons = sqlite.prepare('SELECT * FROM coupons').all() as any[];
    for (const c of coupons) {
      await client.query(
        `INSERT INTO coupons (code, percent, amount, "minTotal", label, active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO NOTHING`,
        [c.code, c.percent, c.amount, c.minTotal, c.label, Boolean(c.active)]
      );
    }
    console.log(`Migrated ${coupons.length} coupons.`);

    await client.query('COMMIT');
    console.log('✅ SQLite to PostgreSQL migration committed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed and rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
