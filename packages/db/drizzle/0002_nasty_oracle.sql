ALTER TABLE "stories" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
UPDATE "stories" SET "status" = 'brainstorm';--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "status" SET DEFAULT 'brainstorm'::text;--> statement-breakpoint
DROP TYPE "public"."story_status";--> statement-breakpoint
CREATE TYPE "public"."story_status" AS ENUM('brainstorm', 'mvp', 'icebox');--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "status" SET DEFAULT 'brainstorm'::"public"."story_status";--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "status" SET DATA TYPE "public"."story_status" USING "status"::"public"."story_status";--> statement-breakpoint
ALTER TABLE "stories" DROP COLUMN "milestone_category";--> statement-breakpoint
DROP TYPE "public"."milestone_category";