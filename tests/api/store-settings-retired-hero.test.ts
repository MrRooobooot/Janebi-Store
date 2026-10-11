import { describe, it, expect, beforeAll } from 'vitest';
import request from '../setup/request.js';
import express, { json } from 'express';
import { readFileSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { db } from '../../server/db/index.js';
import { users, storeSettings } from '../../server/db/schema.js';
import adminRoutes from '../../server/routes/admin.js';
import publicSettingsRoutes from '../../server/routes/settings.js';
import { env } from '../../server/env.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';

// Hero-slide controls were removed from the admin form. The homepage hero is
// HERO_COPY, so these keys must not be saved, published or returned as active.
const app = express();
app.use(json());
app.use('/api/admin', adminRoutes);
app.use('/api/settings', publicSettingsRoutes);
app.use(errorHandler);

const adminId = 'test-settings-admin-' + Date.now();
const adminToken = jwt.sign({ userId: adminId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
const auth = { Authorization: `Bearer ${adminToken}` };
const LEGACY_KEY = 'heroSlide2Title';
const LEGACY_VALUE = 'عنوان قدیمی اسلاید';

async function storedValue(key: string) {
  const row = await db.query.storeSettings.findFirst({ where: eq(storeSettings.key, key) });
  return row?.value;
}

describe('Store settings: retired hero-slide keys', () => {
  beforeAll(async () => {
    await db.insert(users).values({
      id: adminId,
      name: 'مدیر تنظیمات',
      phone: '09' + Math.floor(100000000 + Math.random() * 900000000),
      password: 'hash',
      role: 'admin',
    });
    // Simulates a row written before the controls were removed. It must stay in
    // the database (no migration), but must not surface as an active setting.
    await db.insert(storeSettings)
      .values({ key: LEGACY_KEY, value: LEGACY_VALUE })
      .onConflictDoUpdate({ target: storeSettings.key, set: { value: LEGACY_VALUE } });
  });

  it('saves a valid setting such as storeName', async () => {
    const res = await request(app)
      .put('/api/admin/settings')
      .set(auth)
      .send({ storeName: 'فروشگاه تست تنظیمات' });

    expect(res.status).toBe(200);
    expect(await storedValue('storeName')).toBe('فروشگاه تست تنظیمات');
  });

  it('does not store retired heroSlide keys sent alongside valid settings', async () => {
    const res = await request(app)
      .put('/api/admin/settings')
      .set(auth)
      .send({ storeName: 'فروشگاه تست دوم', heroSlide1Title: 'نباید ذخیره شود' });

    expect(res.status).toBe(200);
    expect(await storedValue('heroSlide1Title')).toBeUndefined();
    expect(res.body.settings).not.toHaveProperty('heroSlide1Title');
  });

  it('rejects a request that contains only retired keys', async () => {
    const res = await request(app)
      .put('/api/admin/settings')
      .set(auth)
      .send({ heroSlide1Title: 'x', heroSlide2Image: '/products/cas-4.svg' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('هیچ فیلد معتبری');
    expect(await storedValue('heroSlide2Image')).toBeUndefined();
  });

  it('public GET /api/settings does not publish a stored retired key', async () => {
    const res = await request(app).get('/api/settings');

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty(LEGACY_KEY);
    expect(res.body).not.toHaveProperty('heroSlide1Image');
    expect(res.body).toHaveProperty('storeName');
  });

  it('admin GET does not return a stored retired key, and leaves the row intact', async () => {
    const res = await request(app).get('/api/admin/settings').set(auth);

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty(LEGACY_KEY);
    expect(await storedValue(LEGACY_KEY)).toBe(LEGACY_VALUE);
  });
});

// The admin page is not rendered in the Vitest node environment, so this is a
// source-level guard: the hero section and its keys must not come back. The
// rendered result is covered by the E2E admin check, not by this test.
describe('Admin settings page: no hero-slide controls', () => {
  const page = readFileSync(new URL('../../src/pages/admin/Settings.tsx', import.meta.url), 'utf8');

  it('contains no heroSlide keys', () => {
    expect(page).not.toMatch(/heroSlide/);
  });

  it('does not render the hero-slide section heading', () => {
    expect(page).not.toContain('مدیریت اسلایدرهای هیرو');
  });
});
