#!/bin/bash
# R3 prod verification: migration applied, legacy rows backfilled, list is chronological.
# Prints only ids/order/status — never tokens or secrets.
# The whole probe body runs ON THE VPS (local docker there, or ssh from the Mac),
# so no owner token is ever minted on a workstation.
set -u
C=janebi-store
REMOTE="${VPS_USER:-ubuntu}@${VPS_HOST:-janebiarena.ir}"

body() {
  echo "== 1. schema (PRAGMA) =="
  docker exec $C sqlite3 /app/data/janebi.db "select 'created_at column: '||count(*) from pragma_table_info('users') where name='created_at';"
  docker exec $C sqlite3 /app/data/janebi.db "select 'users: '||count(*)||' | missing created_at: '||sum(created_at is null) from users;"

  echo "== 2. backfill legacy rows (idempotent) =="
  docker cp /tmp/backfill-user-created-at.cjs $C:/app/backfill-user-created-at.cjs
  docker exec -w /app $C node /app/backfill-user-created-at.cjs apply
  docker exec $C rm -f /app/backfill-user-created-at.cjs

  echo "== 3. live API order (as owner) =="
  T=$(docker exec -w /app $C node -e 'const j=require("jsonwebtoken");process.stdout.write(j.sign({userId:"usr-admin-aidin"},process.env.JWT_ACCESS_SECRET,{expiresIn:"10m"}))')
  curl -s -H "Authorization: Bearer $T" http://127.0.0.1:3000/api/admin/users \
    | docker exec -i $C node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const r=JSON.parse(d);console.log("rows:",r.length,r.map(u=>u.id+(u.createdAt?"@"+u.createdAt:"@null")).join(" > "))})'

  echo "== 4. storefront health =="
  curl -s -o /dev/null -w "home:%{http_code}\n" https://janebiarena.ir/
  curl -s https://janebiarena.ir/BUILD_INFO; echo
}

# The backfill script must exist at /tmp on whichever host runs the body.
if docker info >/dev/null 2>&1; then
  echo "(mode: local docker)"
  cp -f scripts/backfill-user-created-at.cjs /tmp/backfill-user-created-at.cjs
  body
else
  echo "(mode: ssh $REMOTE)"
  scp -q scripts/backfill-user-created-at.cjs "$REMOTE:/tmp/backfill-user-created-at.cjs"
  ssh -o ConnectTimeout=8 -o BatchMode=yes "$REMOTE" "C=$C; $(declare -f body); body"
fi
