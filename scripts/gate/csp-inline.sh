#!/bin/bash
# csp-inline.sh — regression probe for SEC-03.
# Boots a real production server on an isolated DB and asserts the served shell
# and the CSP header agree: script-src has NO 'unsafe-inline' and every inline
# executable script in the HTML is pinned by its sha256 hash. Also checks the
# RFC 9116 security.txt route.
set -uo pipefail
cd "$(dirname "$0")/../.."

PORT=3980
DIR=/tmp/csp-inline-probe
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

curl -sS -D "$DIR/headers.txt" -o "$DIR/shell.html" "http://127.0.0.1:$PORT/?cb=$RANDOM"
curl -sS -o "$DIR/security.txt" -w '%{http_code}' "http://127.0.0.1:$PORT/.well-known/security.txt" > "$DIR/sec_code"

python3 - "$DIR" <<'PY'
import base64, hashlib, re, sys, pathlib
d = pathlib.Path(sys.argv[1])
headers = d.joinpath("headers.txt").read_text(errors="replace")
html = d.joinpath("shell.html").read_text(errors="replace")

m = re.search(r"(?im)^content-security-policy:\s*(.+)$", headers)
if not m:
    sys.exit("FAIL  no Content-Security-Policy header (NODE_ENV must be production)")
csp = m.group(1)
script_src = re.search(r"script-src([^;]*);", csp)
script_src = script_src.group(1) if script_src else ""
attr_src = re.search(r"script-src-attr([^;]*);?", csp)

fail = []
print("script-src:" + script_src)

if "unsafe-inline" in script_src:
    fail.append("script-src still carries 'unsafe-inline'")
if "'self'" not in script_src:
    fail.append("script-src lost 'self'")

inline = re.findall(
    r"<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>(.*?)</script>", html, re.S | re.I)
print("inline executable scripts in served shell: %d" % len(inline))
if not inline:
    fail.append("no inline script found in shell — probe would pass vacuously")

for body in inline:
    h = "'sha256-%s'" % base64.b64encode(hashlib.sha256(body.encode()).digest()).decode()
    status = "pinned" if h in script_src else "NOT PINNED"
    print("  %s %s" % (status, h))
    if h not in script_src:
        fail.append("inline script hash missing from script-src: %s" % h)

if attr_src and "none" not in attr_src.group(1):
    fail.append("script-src-attr is no longer 'none'")

sec_code = d.joinpath("sec_code").read_text().strip()
sec_body = d.joinpath("security.txt").read_text(errors="replace")
print("security.txt: %s" % sec_code)
if sec_code != "200":
    fail.append("security.txt → %s (want 200)" % sec_code)
elif "Contact:" not in sec_body:
    fail.append("security.txt has no Contact: field")

if fail:
    print("SEC-03 FAIL:")
    for f in fail:
        print("  - " + f)
    sys.exit(1)
print("SEC-03 PASS: no 'unsafe-inline', all inline scripts hash-pinned, security.txt 200")
PY
STATUS=$?
[ "$STATUS" = 0 ] || tail -20 "$DIR/server.log"
exit $STATUS
