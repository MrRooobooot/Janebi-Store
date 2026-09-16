#!/bin/bash
# proof-admin-bugs.sh — empirical evidence for admin-route defects on sandbox :3978
set -u
B=http://127.0.0.1:3978
T=$(cat /tmp/audit-isolated/token.txt)
AH="Authorization: Bearer $T"
J="Content-Type: application/json"
DB=/tmp/audit-isolated/janebi.db
q() { sqlite3 "$DB" "$1"; }

echo "== P1: DELETE /api/admin/products/:id for a product that was ever ordered =="
q "insert into orders (id,user_id,date,status,statusText,total,subtotal,shippingFee,discountAmount,paymentMethod,shippingMethod,recipientName,recipientPhone,recipientAddress,vip_points_used,vip_points_earned,created_at) values ('ORD-FKPROOF-1','usr-admin-aidin','۱۴۰۵/۰۶/۲۰','processing','در حال پردازش',100,100,0,0,'پرداخت در محل','پست پیشتاز','تست','09120000000','تهران',0,0,datetime('now'));" 2>/dev/null
q "insert into order_items (order_id,product_id,price,qty,title,image) values ('ORD-FKPROOF-1',5496,100,1,'تست FK','/images/products/p-5496.jpg');" 2>/dev/null
echo "order_items referencing 5496: $(q "select count(*) from order_items where product_id=5496;")"
curl -s -o /tmp/p1.json -w 'DELETE product → HTTP %{http_code}  ' -X DELETE -H "$AH" $B/api/admin/products/5496
echo "body: $(head -c 120 /tmp/p1.json)"
echo "product still in DB: $(q "select count(*) from products where id=5496;")  (1 = delete refused by FK)"

echo
echo "== P2: DELETE /api/admin/reviews/:id → products.rating/reviewsCount recomputed? =="
q "delete from reviews where product_id=5600;"
q "insert into reviews (id,product_id,user_id,userName,rating,comment,date,approved) values (9001,5600,'usr-admin-aidin','الف',5,'خوب','۱۴۰۵/۰۶/۲۰',0),(9002,5600,'usr-admin-aidin','ب',1,'بد','۱۴۰۵/۰۶/۲۰',0);"
curl -s -o /dev/null -X PUT -H "$AH" -H "$J" -d '{"approved":true}' $B/api/admin/reviews/9001/approved
curl -s -o /dev/null -X PUT -H "$AH" -H "$J" -d '{"approved":true}' $B/api/admin/reviews/9002/approved
echo "after approving 5★ + 1★ → rating/reviewsCount = $(q "select rating||' / '||reviewsCount from products where id=5600;")   (expected 3.0 / 2)"
curl -s -o /dev/null -w 'DELETE /reviews/9002 → HTTP %{http_code}  ' -X DELETE -H "$AH" $B/api/admin/reviews/9002
echo "after deleting the 1★ → rating/reviewsCount = $(q "select rating||' / '||reviewsCount from products where id=5600;")   (correct = 5.0 / 1)"

echo
echo "== P3: POST /api/admin/orders/bulk-delete → restock + VIP refund? =="
q "update products set stockQuantity=50 where id=5496;"
q "insert into orders (id,user_id,date,status,statusText,total,subtotal,shippingFee,discountAmount,paymentMethod,shippingMethod,recipientName,recipientPhone,recipientAddress,vip_points_used,vip_points_earned,created_at) values ('ORD-BULKDEL-1','usr-admin-aidin','۱۴۰۵/۰۶/۲۰','processing','در حال پردازش',200,200,0,0,'پرداخت در محل','پست پیشتاز','تست','09120000000','تهران',3,2,datetime('now'));" 2>/dev/null
q "insert into order_items (order_id,product_id,price,qty,title,image) values ('ORD-BULKDEL-1',5496,100,2,'تست bulk','/images/products/p-5496.jpg');" 2>/dev/null
echo "stock before = $(q "select stockQuantity from products where id=5496;") (order has qty=2 → restock must add 2); vip_points_used=3 must be refunded"
curl -s -o /tmp/p3.json -w 'bulk-delete → HTTP %{http_code}  ' -X POST -H "$AH" -H "$J" -d '{"ids":["ORD-BULKDEL-1"]}' $B/api/admin/orders/bulk-delete
echo "body: $(head -c 100 /tmp/p3.json)"
echo "stock after = $(q "select stockQuantity from products where id=5496;")   (correct = 52)"
echo "order row gone? $(q "select count(*) from orders where id='ORD-BULKDEL-1';") (0 = deleted)"

echo
echo "== P4: audit coverage — actions logged for the operations above =="
q "select action, count(*) from audit_logs group by action order by 2 desc limit 14;"
