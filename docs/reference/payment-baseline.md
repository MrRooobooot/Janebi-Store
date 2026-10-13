# Payment baseline — Janebi Store

> **Status:** living · **Updated:** 2026-10-13 · **Scope:** the Zarinpal payment lifecycle, gateway configuration, order states, and failure handling. Checked against `server/routes/payment.ts`, `server/services/payment/ZarinpalAdapter.ts`, `server/app.ts` and `server/routes/orders.ts` on 2026-10-13. Saman is the failover gateway in the architecture; see `PaymentFailoverRouter.ts` for its state.

## 1. Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (browser)
    participant Store as Express API
    participant DB as Database
    participant ZP as Zarinpal

    Customer->>Store: POST /api/orders (order created, stock decremented, status pending_payment)
    Customer->>Store: POST /api/payment/request { orderId }
    Store->>ZP: POST …/pg/v4/payment/request.json (amount, callback, merchant_id)
    ZP-->>Store: authority
    Store->>DB: store authority and payment_requested_at
    Store-->>Customer: link to our own /pay/{authority}
    Customer->>Store: GET /pay/{authority}
    Store-->>Customer: HTML hop to Zarinpal StartPay
    Customer->>ZP: pays on the bank page
    ZP->>Store: GET /api/payment/verify?Authority=…&Status=OK|NOK
    Store->>ZP: POST …/pg/v4/payment/verify.json
    Store->>DB: success → status processing, refId; failure → status cancelled, stock restored
    Store-->>Customer: 302 /checkout/callback?status=success|failed|expired&orderId=…
```

The customer never talks to the StartPay page directly from the checkout. The hop through `/pay/:authority` is the server-side handoff documented in `docs/reference/architecture.md`; Zarinpal renders StartPay only for the expected referrer.

## 2. Gateway configuration

Environment: `ZARINPAL_MERCHANT_ID` and `ZARINPAL_SANDBOX` (`true` or `false`), read in `server/env.ts`.

| Mode | Request and verify API | StartPay page |
|---|---|---|
| Sandbox (`ZARINPAL_SANDBOX=true`) | `https://sandbox.zarinpal.com/pg/v4/payment/` | `https://sandbox.zarinpal.com/pg/StartPay/{authority}` |
| Production | `https://payment.zarinpal.com/pg/v4/payment/` | `https://www.zarinpal.com/pg/StartPay/{authority}` |

`ZarinpalAdapter.checkHealth()` sends an `OPTIONS` request to `https://api.zarinpal.com/pg/v4/payment/request.json` with a 2.5-second timeout, in both modes, as a reachability probe.

## 3. Order states

Used by `orders.status` (values as written by the code):

- `pending_payment`: order created, stock already deducted, waiting for payment.
- `processing`: verify succeeded; `refId` holds the bank reference.
- `shipped`, `delivered`: set by admin status changes.
- `cancelled`: payment failed, customer abandoned, or an admin or customer cancelled it. Stock and VIP points are restored (see `docs/reference/inventory-baseline.md`).

An expired payment session does not cancel the order. `status=expired` in the callback only means the link must be requested again.

## 4. Callbacks and failures

`GET /api/payment/verify` redirects to `/checkout/callback` with one of:

- `status=success&orderId=…&ref_id=…`: the order was flipped to `processing` and the bank reference stored.
- `status=failed&orderId=…`: the gateway reported `NOK`, or verification failed. The order is cancelled and stock and VIP points are restored in one transaction.
- `status=expired&orderId=…`: the session is older than 45 minutes (`PAYMENT_SESSION_TTL_MS` in `server/routes/payment.ts`).
- `status=failed&message=…`: malformed or unknown callback parameters.

The abandoned-order reaper runs every 5 minutes (`server/routes/payment.ts`). It cancels only `pending_payment` orders with no `refId`: 45 minutes after the last payment request, or 24 hours after creation for an order that never reached a gateway.

## 5. Known limits

1. **Payment data lives in the `orders` table** (`authority`, `refId`, `payment_amount`, `payment_provider`, `payment_url`, `payment_requested_at`). There is no separate `payments` table.
2. **No idempotency key.** Repeated callbacks are safe because the verify path and the reaper flip the status with a conditional update before touching stock or points. Only the winner restores stock.
3. **Gateway fallback:** the failover router (`PaymentFailoverRouter.ts`) is in code. Whether Saman is configured in production is an operator fact, not something this document can verify.
