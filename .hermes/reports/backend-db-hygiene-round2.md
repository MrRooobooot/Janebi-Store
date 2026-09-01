# Backend DB Hygiene — Round 2 (Prod: janebiarena.ir)

**Date:** 2026-09-01 (run 1788234770 epoch) · **VPS:** 45.82.137.67 · **Container:** `janebi-store` (DB: `/app/data/janebi.db`, SQLite, 405,504 bytes)
**Scope:** data-only. No schema/code changes. Orders/payments untouched.

## 1. Backup (done FIRST)

```
ssh ubuntu@45.82.137.67 \
  "TS=\$(date +%s) && docker cp janebi-store:/app/data/janebi.db /home/ubuntu/backups/janebi-pre-hygiene-\$TS.db && ls -la /home/ubuntu/backups/janebi-pre-hygiene-\$TS.db"
```
- First attempt `docker cp janebi-store:data/janebi.db` → `Error response from daemon: Could not find the file` (relative path not resolvable by docker cp; container WORKDIR is `/app`). Fixed by using absolute path `:/app/data/janebi.db`.
- **Result:** `-rw-r--r-- 1 ubuntu ubuntu 405504 /home/ubuntu/backups/janebi-pre-hygiene-1788234770.db`

## 2. Scratch/test table audit

```
ssh ubuntu@45.82.137.67 "docker exec janebi-store node -e \"const db=require('better-sqlite3')('/app/data/janebi.db'); console.log(JSON.stringify(db.prepare(\\\"select name from sqlite_master where type='table' order by name\\\").all().map(r=>r.name)));\""
```
**Tables before (16):** `__drizzle_migrations, addresses, blog_posts, cart_items, contact_messages, coupons, newsletter_subscribers, order_items, orders, product_features, products, reviews, sqlite_sequence, store_settings, users, wishlist_items`

**None of `scratch_t`, `scratch_t2`, `s3`, `s4`, `mutex_t` exist** — evidently already dropped in a prior hygiene round. **0 tables dropped**; no DROP statements were needed or executed.

## 3. Coupons audit

Schema note: this DB's `coupons` table has no `is_active` column — actual columns are `code, percent, amount, minTotal, label, active, expiresAt, usage_limit, used_count` (first query with `is_active` failed with `SqliteError: no such column: is_active`; re-queried with actual columns / `select *`).

```
... node -e \"db.prepare('select * from coupons order by code').all()\" ...
```

**All coupons (BEFORE):**

| code | active | usage_limit | used_count | label |
|---|---|---|---|---|
| JANEBI100 | 1 | null | 0 | ۱۰۰,۰۰۰ تومان تخفیف خرید اختصاصی |
| OFF20 | 1 | null | 0 | ۲۰٪ تخفیف ویژه خرید بالای ۱ میلیون |
| SUMMER30 | 1 | null | 0 | ۳۰٪ تخفیف جشنواره تابستانه |
| WELCOME10 | 1 | null | 0 | ۱۰٪ تخفیف خوش‌آمدگویی |

**Assessment:** only 4 coupons exist, all with Persian marketing labels and proper `minTotal` — all look like real owner marketing coupons. **No test/E2E coupons found** (no FIRST10, OFF50, TEST*, E2E*, SCRATCH* codes). The ~9 test coupons referenced from prior audits appear to have already been removed/deactivated in an earlier round. **0 coupons deactivated** — all left active per the "if unsure / real marketing" rule.

## 4. Re-verification

- `sqlite_master` table list (above) contains no scratch/test tables. ✅
- `GET https://janebiarena.ir/api/coupons-active`:
```json
[{"code":"WELCOME10",...},{"code":"OFF20",...},{"code":"SUMMER30",...},{"code":"JANEBI100",...}]
```
→ exactly the 4 legitimate marketing coupons; zero test coupons. ✅

## Summary of mutations

- Backup written: `/home/ubuntu/backups/janebi-pre-hygiene-1788234770.db` (405,504 B)
- Dropped tables: none (targets absent)
- Deactivated coupons: none (none present)
- Data changes to DB: none
