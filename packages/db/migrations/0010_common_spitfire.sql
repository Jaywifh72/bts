CREATE TYPE "public"."video_category_enum" AS ENUM('vfx_breakdown', 'compositing', 'making_of', 'behind_the_scenes', 'director_interview', 'dp_interview', 'production_design', 'stunts', 'sound', 'music', 'other');--> statement-breakpoint
CREATE TYPE "public"."video_source_enum" AS ENUM('youtube', 'vimeo');--> statement-breakpoint
CREATE TYPE "public"."video_status_enum" AS ENUM('published', 'pending', 'rejected');--> statement-breakpoint
CREATE TABLE "production_videos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"production_id" bigint NOT NULL,
	"source" "video_source_enum" NOT NULL,
	"external_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"channel_name" text,
	"channel_id" text,
	"thumbnail_url" text,
	"duration_seconds" integer,
	"view_count" integer,
	"published_at" date,
	"category" "video_category_enum" NOT NULL,
	"confidence_score" numeric(4, 3) NOT NULL,
	"status" "video_status_enum" DEFAULT 'pending' NOT NULL,
	"category_locked" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_videos_unique" UNIQUE("production_id","source","external_id")
);
--> statement-breakpoint
ALTER TABLE "production_videos" ADD CONSTRAINT "production_videos_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_videos_status_idx" ON "production_videos" USING btree ("production_id","status","category");