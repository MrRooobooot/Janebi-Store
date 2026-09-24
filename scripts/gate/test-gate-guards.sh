#!/usr/bin/env bash
# Regression guards for scripts/gate/*.sh — the runnable check behind the
# stale-listener and CSP-directive-parsing fixes.
#
#   bash scripts/gate/test-gate-guards.sh     # exits 0 when all guards hold
#
# Every check ASSERTS a property of the shipped gate scripts, so expected child
# failures are captured and asserted rather than surfaced as errors.
set -u
cd "$(dirname "$0")/../.." || exit 1
pass=0; fail=0
ok() { printf 'ok    %s\n' "$1"; pass=$((pass + 1)); }
no() { printf 'FAIL  %s\n' "$1"; fail=$((fail + 1)); }

# ---------------------------------------------------------------- 1. CSP parsing
# Directive regexes are read straight out of the shipped script, so this fails if
# the parsing is ever weakened again (e.g. a bare `script-src` search that also
# matches `script-src-attr`).
if python3 - <<'PY'
import re, pathlib, sys
src = pathlib.Path("scripts/gate/csp-inline.sh").read_text()
pat_src = re.search(r'r"(\(\?:.*?)"\s*,\s*csp\)', src).group(1)
pat_attr = re.search(r'attr_src = re\.search\(r"(.*?)", csp\)', src).group(1)

cases = [
    ("script-src then attr",   "default-src 'self';script-src 'self' 'sha256-a=';script-src-attr 'none'", True),
    ("attr BEFORE script-src", "default-src 'self';script-src-attr 'none';script-src 'self' 'sha256-a='", True),
    ("no script-src at all",   "default-src 'self';script-src-attr 'none'", False),
    ("unsafe-inline present",  "default-src 'self';script-src 'self' 'unsafe-inline';script-src-attr 'none'", False),
    ("attr loosened",          "default-src 'self';script-src 'self';script-src-attr 'unsafe-inline'", False),
]
bad = 0
for name, csp, want_pass in cases:
    m = re.search(pat_src, csp)
    s = m.group(1) if m else ""
    a = re.search(pat_attr, csp)
    fails = []
    if not s: fails.append("script-src missing")
    if "unsafe-inline" in s: fails.append("unsafe-inline")
    if s and "'self'" not in s: fails.append("no 'self'")
    if not a: fails.append("script-src-attr missing")
    elif "none" not in a.group(1): fails.append("attr != none")
    got_pass = not fails
    if got_pass != want_pass:
        print("FAIL  csp parse [%s] -> %s" % (name, fails or "pass"))
        bad += 1
    else:
        print("ok    csp parse [%s]" % name)
sys.exit(1 if bad else 0)
PY
then ok "csp-inline.sh directive parsing (both orders, all negative cases)"; else no "csp-inline.sh directive parsing"; fi

# ------------------------------------------------- 2. stale-listener guard (x2)
# A SIGTERM-ignoring stub holds the probe port and answers 200 to everything —
# exactly a half-dead server that never released the socket. Both gate scripts
# must abort before probing instead of testing the stale process.
cat > /tmp/gate_guard_stub.py <<'PY'
import http.server, socketserver, signal, sys
signal.signal(signal.SIGTERM, signal.SIG_IGN)
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200); self.send_header("Content-Type", "text/html"); self.end_headers()
        self.wfile.write(b"<html>STALE</html>")
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
socketserver.TCPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
PY
STUBS=""
cleanup() {
  for p in $STUBS; do kill -9 "$p" 2>/dev/null; done
  for port in 3979 3980; do lsof -tiTCP:$port -sTCP:LISTEN 2>/dev/null | xargs -r kill -9 2>/dev/null; done
}
trap cleanup EXIT

for port in 3979 3980; do
  python3 /tmp/gate_guard_stub.py "$port" >/dev/null 2>&1 &
  STUBS="$STUBS $!"
  disown "$!" 2>/dev/null   # keep the SIGKILL cleanup out of the output
done
sleep 1.5

for spec in "3979:static-exposure.sh" "3980:csp-inline.sh"; do
  port=${spec%%:*}; script=${spec##*:}
  out=$(bash "scripts/gate/$script" 2>&1); rc=$?
  if [ "$rc" -eq 0 ]; then
    no "$script aborts on a stale listener (it exited 0 — probed the wrong process)"
  elif printf '%s' "$out" | grep -q "not our server"; then
    ok "$script aborts on a stale listener (exit $rc, listener identity mismatch)"
  else
    no "$script aborts on a stale listener (exit $rc, but not for the listener reason)"
  fi
done

# ------------------------------------------------ 3. positive control (no stub)
cleanup; STUBS=""; sleep 1
out=$(bash scripts/gate/static-exposure.sh 2>&1); rc=$?
if [ "$rc" -eq 0 ] && printf '%s' "$out" | grep -q "SEC-01 PASS"; then
  ok "static-exposure.sh passes against its own server (no stale listener)"
else
  no "static-exposure.sh positive control (exit $rc)"
fi

printf '\n%s  (%d passed, %d failed)\n' \
  "$([ "$fail" -eq 0 ] && echo 'GUARDS OK' || echo 'GUARDS BROKEN')" "$pass" "$fail"
[ "$fail" -eq 0 ]
