import { describe, it, expect } from 'vitest';
import * as sqliteSchema from '../../server/db/schema.js';
import fs from 'fs';
import path from 'path';

// Schema and migration checks for the SQLite database (the only supported one).
// Previously lived in phase2-database.test.ts, which only checked the removed
// PostgreSQL schema; these are the SQLite equivalents of those assertions.
describe('SQLite schema & migrations', () => {
  const expectedTables = [
    'users',
    'addresses',
    'products',
    'productFeatures',
    'orders',
    'orderItems',
    'reviews',
    'coupons',
    'cartItems',
    'wishlistItems',
  ];

  it('exports all 10 core database tables in the SQLite schema', () => {
    for (const tableName of expectedTables) {
      expect(sqliteSchema[tableName as keyof typeof sqliteSchema], tableName).toBeDefined();
    }
  });

  it('exports all relation definitions in the SQLite schema', () => {
    expect(sqliteSchema.productsRelations).toBeDefined();
    expect(sqliteSchema.productFeaturesRelations).toBeDefined();
    expect(sqliteSchema.reviewsRelations).toBeDefined();
    expect(sqliteSchema.ordersRelations).toBeDefined();
    expect(sqliteSchema.orderItemsRelations).toBeDefined();
    expect(sqliteSchema.usersRelations).toBeDefined();
    expect(sqliteSchema.cartItemsRelations).toBeDefined();
    expect(sqliteSchema.wishlistItemsRelations).toBeDefined();
  });

  it('ships SQLite migrations that create the core tables', () => {
    const migrationDir = path.resolve(process.cwd(), 'drizzle/sqlite');
    expect(fs.existsSync(migrationDir)).toBe(true);
    const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql'));
    expect(files.length).toBeGreaterThan(0);

    const migrationContent = files
      .sort()
      .map((f) => fs.readFileSync(path.join(migrationDir, f), 'utf-8'))
      .join('\n');
    for (const table of ['users', 'products', 'orders', 'order_items', 'coupons']) {
      expect(migrationContent, table).toContain(`CREATE TABLE \`${table}\``);
    }
  });

  it('keeps the core columns the application relies on', () => {
    const userKeys = Object.keys(sqliteSchema.users);
    for (const key of ['id', 'phone', 'password', 'vipPoints', 'role']) {
      expect(userKeys, `users.${key}`).toContain(key);
    }

    const productKeys = Object.keys(sqliteSchema.products);
    for (const key of ['id', 'title', 'price', 'stockQuantity', 'sku']) {
      expect(productKeys, `products.${key}`).toContain(key);
    }
  });
});
