# Fix: LIKE wildcard escaping in product search (PROJECT_AUDIT.md §3.14)

**Commit**: `0393582` — pushed to `main` (github.com/MrRooobooot/Janebi-Store)

## What changed

1. **New shared helper — `server/utils/like.ts`**
   ```ts
   import { sql, type SQL } from "drizzle-orm";

   export function escapeLikePattern(input: string): string {
     return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
   }

   export function containsLikePattern(input: string): string {
     return `%${escapeLikePattern(input)}%`;
   }

   export function likeWithEscape(column: any, pattern: string): SQL {
     return sql`${column} like ${pattern} escape '\\'`;
   }
   ```
   Note: drizzle's `like()` emits no `ESCAPE` clause, so the helper builds the
   condition with an explicit `escape '\\'` — without it, backslash-escaped
   `%`/`_` would not be matched literally.

2. **`server/routes/products.ts`** — storefront search now uses the helper:
   ```ts
   if (search) {
     const s = containsLikePattern(String(search));
     conditions.push(or(
       likeWithEscape(products.title, s),
       likeWithEscape(products.category, s),
       likeWithEscape(products.brand, s)
     )!);
   }
   ```
   No API shape or response format changes.

3. **`server/routes/admin.ts`** — checked; contains no `like()` interpolation
   (no admin product-search LIKE pattern exists), so no change needed there.

## Test evidence

New `tests/unit/like-escape.test.ts` (4 tests, all passing):
- escapes `\`, `%`, `_` (`a%b_c\d` → `a\%b\_c\\d`); leaves Persian/plain text untouched
- wraps term in `%...%` while escaping (`50%_off` → `%50\%\_off%`)
- integration check against real better-sqlite3: `SELECT name FROM t WHERE name like ? escape '\'` with `%50\%\_off%` matches only the literal row `'50%_off'`, not `'50Xoff'`

## Gate

`npm run verify` → exit 0, tail:
```
✓ built in 540ms
dist/server.cjs  212.7kb
======================================================
✅ ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED)
======================================================
```
