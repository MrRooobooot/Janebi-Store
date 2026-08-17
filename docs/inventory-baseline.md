# Inventory Baseline — Janebi-Store

## 1. Inventory & Stock Model

Inventory in Janebi-Store is tracked at the product level via the `stockQuantity` column in the `products` table.

```text
Table: products
Columns:
  id: serial (PK)
  title: text
  stockQuantity: integer (default 10)
  ...
```

---

## 2. Order Stock Deduction Flow

When an order is created (`POST /api/orders`):
1. The request payload provides an array of `items` with `{ productId, qty }`.
2. The server begins a database transaction:
   - For each item, queries current `stockQuantity`.
   - If `stockQuantity < qty`, the transaction immediately aborts and throws:
     `محصول ${product.title} به تعداد درخواستی در انبار موجود نیست`
   - Otherwise, updates `products` setting `stockQuantity = stockQuantity - item.qty`.
   - Inserts order row into `orders`.
   - Inserts line items into `order_items`.
3. If any step fails, the entire transaction rolls back.

---

## 3. Stock Restocking on Failure / Cancellation

When payment fails (`GET /api/payment/verify` with `Status=NOK` or verification failure):
1. All line items associated with the order are retrieved from `order_items`.
2. Each product has its stock restored: `stockQuantity = stockQuantity + item.qty`.
3. The order status is set to `cancelled`.

---

## 4. Current Limitations & Transition to Reservation Model
1. **Immediate Deduction vs Reservation:** Currently, stock is deducted immediately upon order creation. If a user abandons payment, stock remains deducted until the callback or manual cleanup.
2. **Missing `inventory_reservations` Table:** Under Plan v2 (Phase 6), a dedicated `inventory_reservations` table will be introduced with statuses:
   - `ACTIVE`
   - `CONSUMED`
   - `RELEASED`
   - `EXPIRED`
3. **High-Frequency Concurrency:** In PostgreSQL, atomic stock deduction using `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND stock_quantity >= $1 RETURNING stock_quantity;` or row-level locking (`SELECT ... FOR UPDATE`) prevents negative stock under concurrent load.
