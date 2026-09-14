#!/usr/bin/env bash
set -eo pipefail

echo "======================================================"
echo "🛡️  JANEBI ARENA: ADVERSARIAL ENGINEERING QUALITY GATE"
echo "======================================================"

echo "▶ 1. Strict TypeScript Type-Checking..."
npx tsc --noEmit

echo "▶ 2. Automated Unit & Integration Tests (Vitest)..."
npx vitest run --reporter=verbose

echo "▶ 3. Production Build (Vite Client + Esbuild Server)..."
npm run build

echo "▶ 4. Static-exposure regression probe (SEC-01: /server.cjs must 404)..."
bash scripts/probes/static-exposure.sh

echo "▶ 5. CSP inline-hash probe (SEC-03: no 'unsafe-inline' + security.txt)..."
bash scripts/probes/csp-inline.sh

echo "======================================================"
echo "✅ ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED)"
echo "======================================================"
