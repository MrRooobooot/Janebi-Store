-- F1/F3 money-path hardening (additive only):
--   The payment session issued for an order is now persisted in full, so a
--   repeated /api/payment/request can hand back the same StartPay session
--   instead of minting a rival authority that orphans the first payment (F1),
--   and the callback can verify against the amount frozen at request time
--   instead of the mutable orders.total (F3).
--   payment_requested_at also carries the claim timestamp used as the
--   one-session-per-order lock. Legacy rows stay NULL and fall back to
--   orders.total at verify time.
ALTER TABLE orders ADD COLUMN payment_amount integer;--> statement-breakpoint
ALTER TABLE orders ADD COLUMN payment_provider text;--> statement-breakpoint
ALTER TABLE orders ADD COLUMN payment_url text;--> statement-breakpoint
ALTER TABLE orders ADD COLUMN payment_requested_at text;
