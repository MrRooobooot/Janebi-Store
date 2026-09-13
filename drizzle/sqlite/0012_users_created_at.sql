ALTER TABLE users ADD COLUMN created_at integer;--> statement-breakpoint
UPDATE users SET created_at = CAST(substr(id, 5) AS INTEGER)
WHERE created_at IS NULL AND id GLOB 'usr-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]';
