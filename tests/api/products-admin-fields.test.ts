import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { db } from '../../server/db/index.js';
import { products, users } from '../../server/db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// costPrice/barcode are wholesale/supplier fields and isActive is the soft-hide
// flag, so:
//  - no public read path (list, detail, cart) may serialize them;
//  - a hidden product vanishes from the public list, 404s on detail, and the cart
//    refuses it — while the row survives for order history (order_items keeps its
//    own title/image snapshot) and stays editable in the panel;
//  - /api/admin/products is the only reader that returns all three.
describe('Admin-only product fields (costPrice/barcode/isActive)', () => {
  const tag = `PAF${Date.now()}`;
  const phone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const adminId = `usr-test-paf-${Date.now()}`;
  let token = '';
  let visibleId = 0;
  let hiddenId = 0;

  beforeAll(async () => {
    await db.insert(users).values({
      id: adminId,
      name: 'ادمین آزمون فیلدهای انبار',
      phone,
      password: await bcrypt.hash('1234', 10),
      role: 'admin',
    });
    const login = await request(app).post('/api/auth/login').send({ phone, password: '1234' });
    token = login.body.accessToken;

    const rows = await db
      .insert(products)
      .values([
        {
          title: `کالای آزمون ${tag}`,
          category: 'هولدر و نگهدارنده',
          price: 1000000,
          image: '/products/hld-13.svg',
          brand: 'ارلدام',
          stockQuantity: 5,
          sku: `TST-VIS-${tag}`,
          costPrice: 700000,
          barcode: '6260000000011',
        },
        {
          title: `کالای مخفی ${tag}`,
          category: 'هولدر و نگهدارنده',
          price: 500000,
          image: '/products/hld-13.svg',
          brand: 'ارلدام',
          stockQuantity: 5,
          sku: `TST-HID-${tag}`,
          costPrice: 100000,
          barcode: '6260000000028',
          isActive: 0,
        },
      ])
      .returning();
    visibleId = rows[0].id;
    hiddenId = rows[1].id;
  });

  afterAll(async () => {
    await db.delete(products).where(inArray(products.id, [visibleId, hiddenId]));
    await db.delete(users).where(eq(users.id, adminId));
  });

  it('public list omits costPrice/barcode/isActive and hides is_active=0 rows', async () => {
    const res = await request(app).get(`/api/products?search=${tag}`);
    expect(res.status).toBe(200);
    const rows = res.body as any[];
    const mine = rows.filter((p) => p.sku === `TST-VIS-${tag}`);
    expect(mine).toHaveLength(1);
    expect('costPrice' in mine[0]).toBe(false);
    expect('barcode' in mine[0]).toBe(false);
    expect('isActive' in mine[0]).toBe(false);
    expect(rows.some((p) => p.sku === `TST-HID-${tag}`)).toBe(false);
  });

  it('public detail omits them, and 404s on a hidden product', async () => {
    const ok = await request(app).get(`/api/products/${visibleId}`);
    expect(ok.status).toBe(200);
    expect('costPrice' in ok.body).toBe(false);
    expect('barcode' in ok.body).toBe(false);
    const hidden = await request(app).get(`/api/products/${hiddenId}`);
    expect(hidden.status).toBe(404);
  });

  it('cart refuses a hidden product', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: hiddenId, quantity: 1 });
    expect(res.status).toBe(404);
  });

  it('admin list returns the fields plus the hidden row', async () => {
    const res = await request(app)
      .get('/api/admin/products?limit=1000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const rows = res.body as any[];
    const mine = rows.find((p) => p.sku === `TST-VIS-${tag}`);
    expect(mine.costPrice).toBe(700000);
    expect(mine.barcode).toBe('6260000000011');
    expect(mine.isActive).toBe(1);
    expect(Array.isArray(mine.features)).toBe(true);
    expect(rows.some((p) => p.sku === `TST-HID-${tag}`)).toBe(true);
  });

  it('admin PUT persists costPrice/barcode/isActive and hides immediately', async () => {
    const res = await request(app)
      .put(`/api/admin/products/${visibleId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ costPrice: 650000, barcode: '6260000000097', isActive: 0 });
    expect(res.status).toBe(200);

    const after = await db.query.products.findFirst({ where: eq(products.id, visibleId) });
    expect(after?.costPrice).toBe(650000);
    expect(after?.barcode).toBe('6260000000097');
    expect(after?.isActive).toBe(0);

    // gone from the storefront...
    const gone = await request(app).get(`/api/products/${visibleId}`);
    expect(gone.status).toBe(404);
    // ...but the row (and its order-history snapshot) is intact
    const still = await db.query.products.findFirst({ where: eq(products.id, visibleId) });
    expect(still?.title).toContain(tag);
  });

  it('admin POST accepts the fields', async () => {
    const res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `کالای ساخت ${tag}`,
        category: 'هولدر و نگهدارنده',
        price: 300000,
        image: '/products/hld-13.svg',
        brand: 'ارلدام',
        sku: `TST-NEW-${tag}`,
        costPrice: 120000,
        barcode: '6260000000035',
        isActive: 1,
      });
    expect(res.status).toBe(201);
    expect(res.body.costPrice).toBe(120000);
    expect(res.body.barcode).toBe('6260000000035');
    expect(res.body.isActive).toBe(1);
    await db.delete(products).where(eq(products.id, res.body.id));
  });
});
