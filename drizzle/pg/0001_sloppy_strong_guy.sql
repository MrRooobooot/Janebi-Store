CREATE TABLE "contact_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"subject" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'unread' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"email" text PRIMARY KEY NOT NULL,
	"subscribed_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "vip_points_used" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "vip_points_earned" integer DEFAULT 0;