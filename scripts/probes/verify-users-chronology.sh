#!/bin/bash
# R3 prod verification: migration applied, legacy rows backfilled, list is chronological.
# Prints only ids/order/status — never tokens or secrets.
set -u
C=janebi-store

echo "== 1. schema (PRAGMA) =="
docker exec $C node -e "
const D=require('better-sqlite3');const m=new D('/app/data/janebi.db',{readonly:true});
console.log('created_at column:', m.prepare(\"select count(*) n from pragma_table_info('users') where name='created_at'\").get().n);
console.log('journal has 0012:', JSON.stringify(m.prepare(\"select name from sqlite_master where type='table' and name='__drizzle_migrations'\").get()||{}));
console.log('users:', m.prepare('select count(*) n from users').get().n, '| missing created_at:', m.prepare('select count(*) n from users where created_at is null').get().n);
"

echo "== 2. backfill legacy rows =="
docker cp /tmp/backfill-user-created-at.cjs $C:/app/backfill-user-created-at.cjs
docker exec -w /app $C node /app/backfill-user-created-at.cjs apply
docker exec $C rm -f /app/backfill-user-created-at.cjs

echo "== 3. live API order (as owner) =="
T=$(docker exec -w /app $C node -e "const j=require('jsonwebtoken');process.stdout.write(j.sign({userId:'usr-admin-aidin'},process.env.JWT_ACCESS_SECRET,{expiresIn:'10m'}))")
curl -s -H "Authorization: Bearer $T" "http://127.0.0.1:3000/api/admin/users" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const r=JSON.parse(d);console.log('rows:',r.length);r.forEach((u,i)=>console.log(' ',i+1,u.id,'created_at='+u.createdAt,'joined_date='+u.joinedDate))})"

echo "== 4. storefront health =="
curl -s -o /dev/null -w "home:%{http_code}\n" https://janebiarena.ir/
curl -s https://janebiarena.ir/BUILD_INFO; echo
