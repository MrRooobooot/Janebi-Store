-- Production-parity fix (r37c): the application's Drizzle queries select
-- "usage_limit" / "used_count" (names from the SQLite schema mapping, which is
-- the query builder source of truth across all routes). Migration 0006 created
-- these PG columns as camelCase ("usageLimit"/"usedCount"), so every order
-- flow that touches coupons failed on PostgreSQL with "column does not exist"
-- (verified live on a pristine PG database, 2026-09-04). Rename to the
-- snake_case names the queries actually use — consistent with the PG naming
-- style of sibling columns (vip_points_used, created_at, user_id).
ALTER TABLE coupons RENAME COLUMN "usageLimit" TO "usage_limit";
--> statement-breakpoint
ALTER TABLE coupons RENAME COLUMN "usedCount" TO "used_count";
