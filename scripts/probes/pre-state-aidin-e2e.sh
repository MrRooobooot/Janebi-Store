#!/bin/bash
# aidin COD E2E — pre-flight snapshot + short-lived owner token (never printed elsewhere).
C=janebi-store
DB=/app/data/janebi.db
docker exec $C sqlite3 $DB "select 'tables: '||group_concat(name) from sqlite_master where type='table';"
docker exec $C sqlite3 $DB "select 'product_cols: '||group_concat(name) from pragma_table_info('products');"
docker exec $C sqlite3 $DB "select 'orders='||count(*) from orders;"
docker exec $C sqlite3 $DB "select 'addresses_aidin='||count(*) from addresses where user_id='usr-admin-aidin';"
echo -n "TOKEN="
docker exec -w /app $C node -e 'const j=require("jsonwebtoken");process.stdout.write(j.sign({userId:"usr-admin-aidin",role:"admin"},process.env.JWT_ACCESS_SECRET,{expiresIn:"15m"}))'
echo
