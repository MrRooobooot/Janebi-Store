# Backend DB Hygiene — Prod Residue Cleanup (Janebi Arena)

> **Date**: 2026-08-31 22:53 (+0330) · **Host**: VPS 45.82.137.67 · **Container**: `janebi-store` · **DB**: `/app/data/janebi.db` (better-sqlite3 probe)

---

## 0. Backup (performed FIRST, before any mutation)

- Hot copy: `docker cp janebi-store:/app/data/janebi.db /home/ubuntu/backups/janebi-20260831-225250.db` (397,312 B)
- Consistent snapshot via in-container node: `VACUUM INTO` + `wal_checkpoint(TRUNCATE)` → `/home/ubuntu/backups/janebi-full-20260831-225300.db` (348,160 B)
- Ongoing daily cron backups already present in `/home/ubuntu/backups/` (env + db snapshots through 20260831-023001).

## 1. Scratch/test tables — enumeration & result

Full table census (sqlite_master, type='table'):

```
addresses, blog_posts, cart_items, contact_messages, coupons,
newsletter_subscribers, order_items, orders, product_features, products,
reviews, sqlite_sequence, store_settings, users, wishlist_items
```

**Result: NONE of the audit-listed scratch tables (`scratch_t`, `scratch_t2`, `s3`, `s4`, `mutex_t`) exist in the prod DB.** They were evidently already removed (or lost with the Aug-29 rebuild — the DB was re-seeded fresh: `orders=2, products=14` rows). No DROP executed; nothing to confirm against `drizzle/sqlite/*.sql` (grep for those names returned no matches — they never appear in any migration either). No schema/code defect found ⇒ no repo code change, `npm run verify` not required.

## 2. Coupons — enumeration

Live coupon census (real schema: `code, percent, amount, minTotal, label, active, expiresAt`):

| code | discount | minTotal | active |
|---|---|---|---|
| WELCOME10 | 10% | 300,000 | 1 |
| OFF20 | 20% | 1,000,000 | 1 |
| SUMMER30 | 30% | 2,000,000 | 1 |
| JANEBI100 | fixed 100,000 | 500,000 | 1 |

**Result: only 4 real business coupons exist; none of the 9 stale E2E test coupons are present.** No `UPDATE ... active=0` was needed and none of the real coupons were touched.

## 3. Migration 0005 verification & remediation

`drizzle/sqlite/0005_order_created_at_indexes.sql` content (local repo, 9 statements):

```sql
ALTER TABLE orders ADD COLUMN created_at TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items (user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON wishlist_items (user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses (user_id);
CREATE INDEX IF NOT EXISTS idx_product_features_product_id ON product_features (product_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages (status, created_at);
```

**Before state:**
- `PRAGMA table_info(orders)`: `id,user_id,date,status,statusText,total,subtotal,shippingFee,discountAmount,paymentMethod,shippingMethod,recipientName,recipientPhone,recipientAddress,recipientPostalCode,authority,refId,vip_points_used,vip_points_earned,created_at` → **`created_at` present ✅**
- idx_* census (before): only **6 of 9** present — `idx_orders_user_id`, `idx_orders_created_at`, `idx_order_items_order_id`, `idx_reviews_product_id`, `idx_cart_items_user_id`, `idx_addresses_user_id`.
- **Missing: `idx_wishlist_items_user_id`, `idx_product_features_product_id`, `idx_contact_messages_status`.**

**Remediation (in-container node + better-sqlite3, inside a transaction):**

```sql
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON wishlist_items (user_id);
CREATE INDEX IF NOT EXISTS idx_product_features_product_id ON product_features (product_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages (status, created_at);
```

**After state — full 9/9 idx_* census ✅:**

```
idx_addresses_user_id, idx_cart_items_user_id, idx_contact_messages_status,
idx_order_items_order_id, idx_orders_created_at, idx_orders_user_id,
idx_product_features_product_id, idx_reviews_product_id, idx_wishlist_items_user_id
```

Note: the live SQLite runner evidently applied 0005 partially (column + 6 indexes) with no `__drizzle_migrations` bookkeeping table present — the three missing indexes were repaired manually above. This confirms the audit's suspicion that the SQLite boot runner can silently skip 0005 statements; the repo's migration journaling is worth a follow-up (tracked in PROJECT_GRAPH.md context), but no code defect was found in this pass.

## 4. Post-change integrity

- `orders` count = 2, `products` count = 14 — unchanged, no data touched.
- WAL checkpointed (TRUNCATE) after writes; backup files retained.
