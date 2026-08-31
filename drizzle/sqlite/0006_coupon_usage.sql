ALTER TABLE coupons ADD COLUMN usage_limit INTEGER;
--> statement-breakpoint
ALTER TABLE coupons ADD COLUMN used_count INTEGER NOT NULL DEFAULT 0;
