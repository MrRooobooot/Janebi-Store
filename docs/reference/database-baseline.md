# Database baseline — Janebi Store

> **Status:** living · **Updated:** 2026-10-13 · **Scope:** the SQLite engine and settings, the 15 tables with their SQL column names, migrations, and the seed. Canonical source is `server/db/schema.ts`; this page is checked against it on 2026-10-13. PostgreSQL was removed on 2026-10-13 (`docs/reports/2026-10-13-postgres-removal-record.md`).

## 1. Engine and settings

- SQLite through `better-sqlite3`, accessed with Drizzle ORM. The file comes from `DATABASE_URL` (default `./data/janebi.db`, `server/env.ts`).
- `server/db/index.ts` sets `journal_mode = WAL` and `busy_timeout = 5000`.
- Migrations are SQL files in `drizzle/sqlite/` (16 files, `0000` to `0016`; there is no `0010`). They run synchronously when the module loads, and each migration is journaled.

## 2. Tables

Column names are the SQL names. Where the code uses another name in JavaScript it is written in the schema, not here.

| Table | Columns |
|---|---|
| `users` | `id`, `name`, `phone` (unique), `email`, `password` (bcrypt), `avatar`, `joined_date`, `created_at`, `vip_points`, `role`, `must_change_password` |
| `addresses` | `id`, `user_id`, `title`, `name`, `phone`, `province`, `city`, `address`, `postal_code`, `is_default` |
| `products` | `id` (autoincrement), `title`, `category`, `price`, `originalPrice`, `discount`, `image`, `brand`, `warranty`, `description`, `rating`, `reviewsCount`, `stockQuantity` (default 10), `sku`, `cost_price`, `barcode`, `is_active` |
| `product_features` | `id`, `product_id`, `feature` |
| `orders` | `id`, `user_id`, `date`, `created_at`, `status`, `statusText`, `total`, `subtotal`, `shippingFee`, `discountAmount`, `vip_points_used`, `vip_points_earned`, `paymentMethod`, `shippingMethod`, `recipientName`, `recipientPhone`, `recipientAddress`, `recipientPostalCode`, `authority`, `refId`, `payment_amount`, `payment_provider`, `payment_url`, `payment_requested_at` |
| `order_items` | `id`, `order_id`, `product_id`, `price`, `qty`, `title`, `image`, `brand` |
| `reviews` | `id`, `product_id`, `user_id`, `userName`, `rating`, `title`, `comment`, `date`, `isVerifiedBuyer`, `recommend`, `helpfulCount`, `unhelpfulCount`, `approved` |
| `coupons` | `code`, `percent`, `amount`, `minTotal`, `label`, `active`, `expiresAt`, `usage_limit`, `used_count` |
| `cart_items` | `id`, `user_id`, `product_id`, `quantity`, `added_at` |
| `wishlist_items` | `id`, `user_id`, `product_id`, `added_at` |
| `contact_messages` | `id`, `name`, `email`, `phone`, `subject`, `message`, `status`, `created_at` |
| `newsletter_subscribers` | `email`, `subscribed_at` |
| `store_settings` | `key`, `value` |
| `blog_posts` | `id`, `title`, `excerpt`, `body`, `image`, `category`, `author`, `readTime`, `tags`, `published`, `created_at` |
| `audit_logs` | `id`, `admin_user_id`, `action`, `entity`, `entity_id`, `meta`, `created_at` |

## 3. Facts to keep in mind

- **Money is integer Toman** (`price`, `total`, `subtotal`, `payment_amount`, and similar). There are no decimal columns.
- **Casing is mixed.** Most columns are snake_case, but several tables keep camelCase (`originalPrice`, `shippingFee`, `refId`, `userName`). Read the schema before writing a probe.
- **Cost and supplier fields stay internal.** `cost_price` (`costPrice` in code) and `barcode` are excluded from every public product query (`server/routes/products.ts`); only the admin products route returns them.
- **Soft hide:** `products.is_active = 0` removes a product from the storefront, product detail, cart, and sitemap while keeping order history intact.
- **Payment amount is frozen at request time** in `orders.payment_amount`; verify must read it, never the mutable `total`.
- **Search** uses an FTS5 table created by `drizzle/sqlite/0014_products_fts.sql`, with a LIKE fallback where FTS5 is unavailable.

## 4. Seed

- `SEED_DEMO_DATA=1` seeds demo products (`server/index.ts`, `scripts/oneoff/seed-dev-db.ts`).
- Without that flag, an empty catalogue is served and a warning is logged.
- The seed creates no admin account. A new admin must be created through the app or directly in the database.
