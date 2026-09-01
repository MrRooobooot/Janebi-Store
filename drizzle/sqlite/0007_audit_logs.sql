CREATE TABLE `audit_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `admin_user_id` text,
  `action` text NOT NULL,
  `entity` text NOT NULL,
  `entity_id` text,
  `meta` text,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_audit_logs_created_at` ON `audit_logs` (`created_at`);
