#!/bin/bash
# nginx-drift.sh — SEC-02 drift guard (NOT wired into npm run verify: the gate
# must not depend on SSH). nginx config is not in CI — deploy/nginx-janebi-store.conf
# is the versioned reference, the VPS is the truth. Run this after any ops touch
# of the reverse proxy, or from a cron/QA round.
#
# Invariant: every proxy location must OVERWRITE X-Forwarded-For with $remote_addr.
# Appending ($proxy_add_x_forwarded_for) lets the client control req.ip, which
# makes every IP rate limit bypassable.
set -uo pipefail
REMOTE="${REMOTE:-ubuntu@45.82.137.67}"
SSH_OPTS="-o BatchMode=yes -o ConnectTimeout=12 -o StrictHostKeyChecking=accept-new"

# --from-file <path>: offline negative-control mode — run the same invariant check
# against a synthetic `nginx -T` dump (used to prove the guard actually FAILS on drift).
if [ "${1:-}" = "--from-file" ]; then
  CONF=$(cat "$2") || { echo "FAIL: cannot read $2"; exit 1; }
else
  CONF=$(ssh -n $SSH_OPTS "$REMOTE" 'sudo nginx -T 2>/dev/null') || { echo "FAIL: cannot read nginx config from $REMOTE"; exit 1; }
fi

overwrite=$(printf '%s' "$CONF" | grep -c 'X-Forwarded-For \$remote_addr')
append=$(printf '%s' "$CONF" | grep -c 'proxy_add_x_forwarded_for')
proxies=$(printf '%s' "$CONF" | grep -c 'proxy_pass http://127.0.0.1:3000')

echo "proxy locations=$proxies  XFF-remote_addr=$overwrite  XFF-append=$append"

fail=0
[ "$proxies" -ge 1 ] || { echo "FAIL: no proxy_pass locations found — wrong config or remote"; fail=1; }
[ "$append" -eq 0 ] || { echo "FAIL: $append location(s) still APPEND X-Forwarded-For → rate-limit bypass (SEC-02)"; fail=1; }
[ "$overwrite" -ge "$proxies" ] || { echo "FAIL: only $overwrite/$proxies proxy locations overwrite X-Forwarded-For"; fail=1; }

# behavioural leg: rotating spoofed XFF must NOT create fresh rate-limit buckets
DOMAIN="${DOMAIN:-janebiarena.ir}"
codes=""
for i in 1 2 3 4 5 6 7; do
  codes="$codes$(curl -sS -o /dev/null -w '%{http_code} ' -X POST \
    -H "X-Forwarded-For: 10.9.9.$i" -H 'Content-Type: application/json' \
    -d '{"phone":"09120000000","password":"x"}' "https://$DOMAIN/api/auth/login")"
done
echo "rotating-XFF auth calls: $codes"
echo "$codes" | grep -q ' 429' || { echo "FAIL: no 429 under rotating XFF → spoofing still opens new buckets"; fail=1; }

[ "$fail" = 0 ] && echo "SEC-02 PASS: X-Forwarded-For is client-unspoofable, limiter buckets IP-bound" || echo "SEC-02 DRIFT DETECTED"
exit $fail
