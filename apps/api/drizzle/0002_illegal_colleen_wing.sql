ALTER TABLE "ingredients" ALTER COLUMN "unit" SET DATA TYPE varchar(60);--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "category" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "season" varchar(20);--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "difficulty" varchar(20);--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "search_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "steps" ADD COLUMN "title" varchar(120);--> statement-breakpoint
ALTER TABLE "steps" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
CREATE INDEX "recipes_category_idx" ON "recipes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "recipes_title_idx" ON "recipes" USING btree ("title");--> statement-breakpoint
CREATE INDEX "recipes_search_text_trgm_idx" ON "recipes" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "image_url";--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "is_favorite";--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "tags";