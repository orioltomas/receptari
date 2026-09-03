ALTER TABLE "recipes" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "tags" text;