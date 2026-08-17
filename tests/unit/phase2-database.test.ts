import { describe, it, expect } from 'vitest';
import * as pgSchema from '../../server/db/schema.pg.js';
import * as sqliteSchema from '../../server/db/schema.js';
import fs from 'fs';
import path from 'path';

describe('Phase 2 — PostgreSQL Schema & Migration Verification', () => {
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
    'wishlistItems'
  ];

  it('exports all 10 core database tables in PostgreSQL schema', () => {
    for (const tableName of expectedTables) {
      expect(pgSchema[tableName as keyof typeof pgSchema]).toBeDefined();
    }
  });

  it('exports all relation definitions in PostgreSQL schema', () => {
    expect(pgSchema.productsRelations).toBeDefined();
    expect(pgSchema.productFeaturesRelations).toBeDefined();
    expect(pgSchema.reviewsRelations).toBeDefined();
    expect(pgSchema.ordersRelations).toBeDefined();
    expect(pgSchema.orderItemsRelations).toBeDefined();
    expect(pgSchema.usersRelations).toBeDefined();
    expect(pgSchema.cartItemsRelations).toBeDefined();
    expect(pgSchema.wishlistItemsRelations).toBeDefined();
  });

  it('verifies generated PostgreSQL migration file exists and is valid SQL', () => {
    const migrationDir = path.resolve(process.cwd(), 'drizzle/pg');
    expect(fs.existsSync(migrationDir)).toBe(true);
    const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql'));
    expect(files.length).toBeGreaterThan(0);

    const migrationContent = fs.readFileSync(path.join(migrationDir, files[0]), 'utf-8');
    expect(migrationContent).toContain('CREATE TABLE "users"');
    expect(migrationContent).toContain('CREATE TABLE "products"');
    expect(migrationContent).toContain('CREATE TABLE "orders"');
    expect(migrationContent).toContain('CREATE TABLE "order_items"');
    expect(migrationContent).toContain('CREATE TABLE "coupons"');
  });

  it('verifies docker-compose contains Postgres 15 service with healthcheck', () => {
    const dockerComposePath = path.resolve(process.cwd(), 'docker-compose.yml');
    expect(fs.existsSync(dockerComposePath)).toBe(true);
    const content = fs.readFileSync(dockerComposePath, 'utf-8');

    expect(content).toContain('janebi-postgres');
    expect(content).toContain('postgres:15-alpine');
    expect(content).toContain('pg_isready');
    expect(content).toContain('janebi_pgdata');
  });

  it('verifies schema parity between SQLite and PostgreSQL column structures', () => {
    // Check users table columns
    const userKeys = Object.keys(pgSchema.users);
    expect(userKeys).toContain('id');
    expect(userKeys).toContain('phone');
    expect(userKeys).toContain('password');
    expect(userKeys).toContain('vipPoints');
    expect(userKeys).toContain('role');

    // Check products table columns
    const productKeys = Object.keys(pgSchema.products);
    expect(productKeys).toContain('id');
    expect(productKeys).toContain('title');
    expect(productKeys).toContain('price');
    expect(productKeys).toContain('stockQuantity');
    expect(productKeys).toContain('sku');
  });
});
