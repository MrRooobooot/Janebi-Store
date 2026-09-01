# QA Report — LIKE-escape cluster (commit 0393582)

**Date**: 2026-09-01 · **Verdict: PASS**

## 1. Repo gate — `npm run verify` — PASS

```
$ npm run verify
Test Files  39 passed (39)
      Tests  306 passed (306)
✅ ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED)
```
Includes `tests/unit/like-escape.test.ts` (4 tests) and full Vite+Esbuild build.

## 2. Diff review of 0393582 — PASS

`server/utils/like.ts`:
```ts
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
- Escapes `\`, `%`, `_` (regex `[\\%_]`) ✔
- Explicit `escape '\'` clause pairs with the helper ✔
- Applied to user search input in `server/routes/products.ts`:
```ts
-    const s = `%${search}%`;
+    const s = containsLikePattern(String(search));
     conditions.push(or(
-      like(products.title, s),
-      like(products.category, s),
-      like(products.brand, s)
+      likeWithEscape(products.title, s),
+      likeWithEscape(products.category, s),
+      likeWithEscape(products.brand, s)
     )!);
```
Unit test includes a real better-sqlite3 LIKE check: searching `50%_off` matched only the literal row `'50%_off'` (not `'50Xoff'`). ✔

## 3. Live probe https://janebiarena.ir — PASS

| Probe | Result | Evidence |
|---|---|---|
| `GET /api/health` | 200 | `{"status":"ok","database":"ok","latencyMs":1,...,"nodeVersion":"v22.23.2"}` |
| `GET /api/products?search=قاب` | 200, sane | 2 results, e.g. `{"id":8,"title":"قاب نیلکین CamShield Pro برای Xiaomi 14 Ultra","category":"قاب و کاور"}` |
| `GET /api/products?search=%25` | 200, no crash | body: `[]` — treated as literal `%`, no wildcard blowup, no 500 |
| `GET /` | 200 | — |
| `GET /products` | 200 (after 301 → `/products/`) | `301 -> https://janebiarena.ir/products/` then `final 200` |

Note: live deploy behavior with `%` returning `[]` is consistent with the escape (a literal `%` matches no product names). Whether the live build already contains 0393582 was not asserted; endpoint is healthy and non-crashing either way.

## Summary
All gates green: 39 suites / 306 tests pass, escape covers `\ % _` and is wired into the storefront search route, live health/pages/search all sane. **PASS**.
