#!/usr/bin/env bash
set -eo pipefail

echo "======================================================"
echo "🛡️  JANEBI ARENA: ADVERSARIAL ENGINEERING QUALITY GATE"
echo "======================================================"

echo "▶ 1. Strict TypeScript Type-Checking..."
npx tsc --noEmit

echo "▶ 2. Isolated Unit & Integration Tests (Vitest)..."
npx tsx scripts/audit/test-vitest-isolation.ts
npx vitest run --reporter=verbose | tee /tmp/janebi-vitest.log
SKIPPED=$(grep -oE "Tests +[0-9]+ passed \| [0-9]+ skipped" /tmp/janebi-vitest.log | grep -oE "^[^|]*\| [0-9]+" | grep -oE "[0-9]+$" || true)
if [ -n "$SKIPPED" ] && [ "$SKIPPED" != "0" ]; then
  echo
  echo "⚠️  $SKIPPED Vitest test(s) SKIPPED — a green gate with skips is NOT full coverage."
  echo "   Most likely the PostgreSQL suite: tests/postgres/postgres-verification.test.ts"
  echo "   is gated by describe.skipIf(!process.env.PG_DATABASE_URL). Run with:"
  echo "     PG_DATABASE_URL=postgres://… npm test"
  echo
fi

echo "▶ 3. Production Build (Vite Client + Esbuild Server)..."
npm run build

echo "▶ 4. Live rate-limit proof (limiters skip under NODE_ENV=test, so Vitest cannot see them)..."
node scripts/gate/ratelimit-live.mjs

echo "▶ 5. Static-exposure regression probe (SEC-01: /server.cjs must 404)..."
bash scripts/gate/static-exposure.sh

echo "▶ 6. CSP inline-hash probe (SEC-03: no 'unsafe-inline' + security.txt)..."
bash scripts/gate/csp-inline.sh

echo "======================================================"
echo "✅ QUALITY GATES PASSED"
if [ "${SKIPPED:-0}" = "0" ]; then
  echo "   Typecheck + Vitest + build + rate-limit + SEC-01 + SEC-03 green, 0 skipped."
else
  echo "   Typecheck + Vitest + build + rate-limit + SEC-01 + SEC-03 green, but $SKIPPED test(s) skipped (see above)."
fi
echo "   NOT run by this gate: e2e (npm run test:e2e)."
echo "======================================================"
