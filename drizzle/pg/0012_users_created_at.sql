ALTER TABLE users ADD COLUMN created_at integer;--> statement-breakpoint
UPDATE users SET created_at = CAST(substring(id from 5) AS integer)
WHERE created_at IS NULL AND id ~ '^usr-[0-9]{13}$';
