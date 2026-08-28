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

echo "======================================================"
echo "✅ ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED)"
echo "======================================================"
