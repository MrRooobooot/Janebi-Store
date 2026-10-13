# Inventory baseline — Janebi Store

> **Status:** living · **Updated:** 2026-10-13 · **Scope:** the stock model, how stock moves on order and on cancellation, and the known limits. Checked against `server/db/schema.ts`, `server/routes/orders.ts`, `server/routes/payment.ts` and `server/lib/orderLifecycle.ts` on 2026-10-13.

## 1. Model

- Stock is the `stockQuantity` column of `products` (integer, not null, default 10).
- `products.id` is an autoincrement integer.
- There is no reservation table. Stock is a single number per product.

## 2. Stock on order (`POST /api/orders`, `server/routes/orders.ts`)

1. The whole order is written inside one `db.transaction`.
2. For each line the server reads the product's current `stockQuantity`. If it is lower than the requested quantity, the order fails with `موجودی محصول <title> کافی نیست`.
3. Stock is then decremented with a conditional update, `stockQuantity = stockQuantity - qty WHERE stockQuantity >= qty`. The predicate is what prevents overselling when checkouts race; it is not only a pre-check.
4. The `orders` row and its `order_items` rows are inserted in the same transaction. Any failure rolls the whole thing back.

## 3. Stock returned

Stock goes back through one helper, `restockItemsAndRefundPoints` (`server/lib/orderLifecycle.ts`), which is called from three places:

- **Customer or admin cancellation:** `POST /api/orders/:id/cancel`, and an admin status change to `cancelled`.
- **Failed payment:** `GET /api/payment/verify` when the gateway reports a failure.
- **Abandoned payment:** the reaper in `server/routes/payment.ts`, every 5 minutes.

Each path first flips the order's status with a conditional update and restocks only if its update won, so a concurrent verify and reaper cannot restock twice.

## 4. Known limits

1. **Stock leaves at order creation, not at payment.** A shopper who never pays holds stock until the reaper cancels the order: 45 minutes after the last payment request, or 24 hours after creation for an order that never reached a gateway (`server/routes/payment.ts`).
2. **Reservations are not modelled.** A reservation table with `ACTIVE`, `CONSUMED`, `RELEASED` and `EXPIRED` states was planned in an earlier document; it does not exist in the schema.
3. **Concurrency depends on SQLite transactions and the conditional update.** There is no row-level lock table; this is adequate for the single-process deployment.
