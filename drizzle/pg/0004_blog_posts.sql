CREATE TABLE "blog_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"body" text NOT NULL,
	"image" text,
	"category" text DEFAULT 'مقالات' NOT NULL,
	"author" text DEFAULT 'تیم جانبی آرنا' NOT NULL,
	"readTime" text,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" text NOT NULL
);
