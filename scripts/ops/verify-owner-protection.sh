#!/bin/bash
# verify R1 on prod: owner cloaking + mutation refusal, using short-lived in-container tokens.
# Prints only status codes/sizes — never tokens or secrets.
set -u
B=http://127.0.0.1:3000
mint() { docker exec -w /app janebi-store node -e "const j=require('jsonwebtoken');process.stdout.write(j.sign({userId:'$1'},process.env.JWT_ACCESS_SECRET,{expiresIn:'10m'}))"; }
ALI=$(mint usr-admin-ali)
OWNER=$(mint usr-admin-aidin)

echo "== as usr-admin-ali (non-owner admin) =="
printf 'GET /api/admin/users        → HTTP '; curl -s -o /tmp/ali-users.json -w '%{http_code}\n' -H "Authorization: Bearer $ALI" "$B/api/admin/users?limit=500"
python3 - <<'PY'
import json
rows = json.load(open('/tmp/ali-users.json'))
ids = [r['id'] for r in rows]
print('  rows:', len(ids), '| owner visible:', 'usr-admin-aidin' in ids, '| self visible:', 'usr-admin-ali' in ids)
PY
printf 'PUT role(owner)→user         → HTTP '; curl -s -o /tmp/ali-role.json -w '%{http_code}  ' -X PUT -H "Authorization: Bearer $ALI" -H 'Content-Type: application/json' -d '{"role":"user"}' "$B/api/admin/users/usr-admin-aidin/role"; head -c 90 /tmp/ali-role.json; echo
printf 'PUT password(owner)          → HTTP '; curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "Authorization: Bearer $ALI" -H 'Content-Type: application/json' -d '{"newPassword":"x-not-applied-123"}' "$B/api/admin/users/usr-admin-aidin/password"
printf 'PUT points(owner)            → HTTP '; curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "Authorization: Bearer $ALI" -H 'Content-Type: application/json' -d '{"vipPoints":999}' "$B/api/admin/users/usr-admin-aidin/points"

echo "== as usr-admin-aidin (owner) =="
printf 'GET /api/admin/users        → HTTP '; curl -s -o /tmp/own-users.json -w '%{http_code}  ' -H "Authorization: Bearer $OWNER" "$B/api/admin/users?limit=500"
python3 - <<'PY'
import json
rows = json.load(open('/tmp/own-users.json'))
ids = [r['id'] for r in rows]
print('owner visible:', 'usr-admin-aidin' in ids)
PY
printf 'paging ?page=1&limit=1      → HTTP '; curl -s -o /dev/null -D /tmp/hdr.txt -w '%{http_code}  ' -H "Authorization: Bearer $OWNER" "$B/api/admin/users?page=1&limit=1"; grep -i '^x-total-count' /tmp/hdr.txt | tr -d '\r'

echo "== owner state untouched =="
docker exec janebi-store node -e "const D=require('better-sqlite3');const m=new D('/app/data/janebi.db',{readonly:true});console.log(m.prepare('select id, role, vip_points from users where id=?').get('usr-admin-aidin'));"
rm -f /tmp/ali-users.json /tmp/own-users.json /tmp/ali-role.json /tmp/hdr.txt
