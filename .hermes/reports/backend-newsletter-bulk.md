# Backend Cluster Report — Newsletter Chain + Admin Bulk Endpoints

**Commit**: `9b0d2b9` — `feat(admin): newsletter chain + bulk endpoints` (pushed to `main`)
**Gate**: `npm run verify` ✅ ALL HARDCORE QUALITY GATES PASSED (typecheck + 297 vitest tests + full build)

## 1. Newsletter chain — trace result

Full chain verified end-to-end; no structural disconnect found:

1. **Footer form** (`src/components/Footer.tsx:25`, read-only for backend) → `POST /api/contact/newsletter` ✅ matches mounted route
2. **Public POST endpoint** (`server/routes/contact.ts:69`) → `newsletterSubscribers` (`server/db/schema.ts:143`) ✅ exists, dedupes via `findFirst` on PK `email`
3. **Admin list API** (`server/routes/admin.ts` `GET /api/admin/newsletter`) → real rows via `db.select()` ✅; consumed by `src/pages/admin/Newsletter.tsx:20`

Gaps fixed (backend side):
- **Persian digit normalization**: email is now run through `toEnglishDigits` (`src/lib/utils.js`) + trim/lowercase before validation and insert, so `۰۱۲…` pastes don't fail or dup.
- **Rate limiting**: new dedicated `newsletterLimiter` in `server/app.ts` — `POST /api/contact/newsletter` capped at **5 req / 15 min / IP** (skipped in test env, like existing limiters), preventing list-bombing of the subscribers table.
- Email regex validation moved after normalization (kept for the raw input too).

## 2. Admin bulk endpoints (added in `server/routes/admin.ts`)

All sit behind the router-wide `authenticate + requireAdmin`; all use `db.transaction`:

| Endpoint | Behavior | Response |
|---|---|---|
| `POST /api/admin/messages/read-all` | Marks every `unread` contact message `read` | `{updated: n, deleted: 0}` |
| `POST /api/admin/messages/bulk-delete` | Deletes messages by id list, atomic | `{deleted: n}` |
| `POST /api/admin/orders/bulk-delete` | Deletes `order_items` then `orders` atomically (FK-safe) | `{deleted: n}` |

Validation: new strict `bulkIdsSchema` in `server/validators/index.ts` — `ids` array, 1–500 items, max 128 chars each. **Note / deviation**: task spec said `{ids:number[]}`, but `contact_messages.id` and `orders.id` are **text PKs** in both SQLite and PG schemas, so the schema preprocesses numbers→strings and rejects anything else; frontend can send either.

## 3. PG parity

No work needed: `newsletterSubscribers` pgTable already exists in `server/db/schema.pg.ts:142` and the table is present in `drizzle/pg/0000_tan_captain_cross.sql` + `0001_sloppy_strong_guy.sql`. Bulk endpoints use dialect-portable Drizzle calls (`inArray`, `returning`, `db.transaction`) already proven elsewhere in admin.ts.

## Files changed (server only — no src/ edits)

- `server/routes/contact.ts` — toEnglishDigits normalization on newsletter POST
- `server/app.ts` — newsletterLimiter (5/15min on /api/contact/newsletter)
- `server/routes/admin.ts` — 3 bulk endpoints + `inArray`/`validate` imports
- `server/validators/index.ts` — `bulkIdsSchema`

## Issues encountered

- `patch` tool twice dropped adjacent context lines (`try {` / `const {id}`); caught and restored immediately — final file verified by `npm run verify` and build.
- `server/app.ts` had a concurrent sibling edit reported; verified via `git diff --stat` that the 15 added lines were only my limiter hunk before staging.
