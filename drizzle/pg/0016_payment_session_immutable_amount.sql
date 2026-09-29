-- F1/F3 money-path hardening — parity with drizzle/sqlite/0016 (additive only).
-- See that file for the rationale; the statements are deliberately identical.
ALTER TABLE orders ADD COLUMN payment_amount integer;--> statement-breakpoint
ALTER TABLE orders ADD COLUMN payment_provider text;--> statement-breakpoint
ALTER TABLE orders ADD COLUMN payment_url text;--> statement-breakpoint
ALTER TABLE orders ADD COLUMN payment_requested_at text;
