#!/bin/bash
# post-order evidence: DB rows + SMS receipt trace for the E2E COD order.
C=janebi-store
DB=/app/data/janebi.db
echo "--- orders ---"
docker exec $C sqlite3 -header $DB "select id,status,payment_method,payment_status,final_total,created_at from orders order by created_at desc limit 3;" 2>/dev/null \
  || docker exec $C sqlite3 $DB "select * from orders where id like 'ORD-MU%';"
echo "--- columns ---"
docker exec $C sqlite3 $DB "select group_concat(name) from pragma_table_info('orders');"
echo "--- order_items ---"
docker exec $C sqlite3 $DB "select group_concat(name) from pragma_table_info('order_items');"
docker exec $C sqlite3 $DB "select order_id,name,quantity,price from order_items;"
echo "--- stock p14 ---"
docker exec $C sqlite3 $DB "select id,stockQuantity from products where id=14;"
echo "--- SMS log trace (last 40 lines mentioning sms/kavenegar/pattern) ---"
docker logs --tail 400 $C 2>&1 | grep -iE "sms|kavenegar|pattern|پیامک|receipt" | tail -20
echo "--- container env SMS keys (names only) ---"
docker exec $C sh -c 'env | grep -oE "^(SMS|KAVENEGAR)[A-Z_]*" | head' 2>/dev/null
