#!/bin/bash
# static-exposure.sh — regression probe for SEC-01: the production web root is
# `dist/`, which also holds the esbuild server bundle + its source map. Boots a
# real production server on an isolated DB and asserts those are NOT served.
set -uo pipefail
cd "$(dirname "$0")/../.."

PORT=3979
DIR=/tmp/static-exposure-probe
rm -rf "$DIR" && mkdir -p "$DIR"
kill "$(lsof -tiTCP:$PORT -sTCP:LISTEN)" 2>/dev/null

PORT=$PORT NODE_ENV=production DATABASE_URL="$DIR/probe.db" \
  JWT_ACCESS_SECRET="probe-access-secret-01" JWT_REFRESH_SECRET="probe-refresh-secret-01" \
  APP_URL=https://janebiarena.ir \
  node dist/server.cjs > "$DIR/server.log" 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null' EXIT

for _ in $(seq 1 30); do
  curl -sf -o /dev/null "http://127.0.0.1:$PORT/api/health" && break
  sleep 0.5
done

fail=0
check() { # path expected_code
  got=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT$1")
  if [ "$got" != "$2" ]; then echo "FAIL  $1 → $got (want $2)"; fail=1; else echo "ok    $1 → $got"; fi
}

check /server.cjs 404
check /server.cjs.map 404
check /api/products 200

[ "$fail" = 0 ] || { echo "SEC-01 REGRESSION: server bundle exposed"; tail -20 "$DIR/server.log"; exit 1; }
echo "SEC-01 PASS: server bundle + source map not served"
