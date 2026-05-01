CREATE TYPE "public"."vfx_credit_role_enum" AS ENUM('primary', 'additional', 'special_sequences', 'miniatures', 'previsualization');--> statement-breakpoint
CREATE TYPE "public"."vfx_technique_category_enum" AS ENUM('creature', 'environment', 'character', 'practical_enhancement', 'simulation', 'compositing', 'other');--> statement-breakpoint
ALTER TYPE "public"."source_kind_enum" ADD VALUE 'vfx_breakdown_article' BEFORE 'other';--> statement-breakpoint
CREATE TABLE "production_vfx_techniques" (
	"production_id" bigint NOT NULL,
	"technique_id" integer NOT NULL,
	CONSTRAINT "production_vfx_techniques_production_id_technique_id_pk" PRIMARY KEY("production_id","technique_id")
);
--> statement-breakpoint
CREATE TABLE "vfx_credits" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"production_id" bigint NOT NULL,
	"vfx_house_id" bigint NOT NULL,
	"shot_count" integer,
	"role" "vfx_credit_role_enum" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vfx_credits_production_house_unq" UNIQUE("production_id","vfx_house_id")
);
--> statement-breakpoint
CREATE TABLE "vfx_house_sources" (
	"vfx_house_id" bigint NOT NULL,
	"source_id" bigint NOT NULL,
	"confidence" "source_confidence_enum" NOT NULL,
	"claim_quote" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vfx_house_sources_vfx_house_id_source_id_pk" PRIMARY KEY("vfx_house_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "vfx_houses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"country" text,
	"founded_year" integer,
	"website" text,
	"wikidata_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vfx_houses_slug_unique" UNIQUE("slug"),
	CONSTRAINT "vfx_houses_wikidata_id_unique" UNIQUE("wikidata_id")
);
--> statement-breakpoint
CREATE TABLE "vfx_techniques" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" "vfx_technique_category_enum" NOT NULL,
	CONSTRAINT "vfx_techniques_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "production_vfx_techniques" ADD CONSTRAINT "production_vfx_techniques_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_vfx_techniques" ADD CONSTRAINT "production_vfx_techniques_technique_id_vfx_techniques_id_fk" FOREIGN KEY ("technique_id") REFERENCES "public"."vfx_techniques"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vfx_credits" ADD CONSTRAINT "vfx_credits_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vfx_credits" ADD CONSTRAINT "vfx_credits_vfx_house_id_vfx_houses_id_fk" FOREIGN KEY ("vfx_house_id") REFERENCES "public"."vfx_houses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vfx_house_sources" ADD CONSTRAINT "vfx_house_sources_vfx_house_id_vfx_houses_id_fk" FOREIGN KEY ("vfx_house_id") REFERENCES "public"."vfx_houses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vfx_house_sources" ADD CONSTRAINT "vfx_house_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_vfx_techniques_production_idx" ON "production_vfx_techniques" USING btree ("production_id");--> statement-breakpoint
CREATE INDEX "vfx_credits_production_idx" ON "vfx_credits" USING btree ("production_id");--> statement-breakpoint
CREATE INDEX "vfx_credits_house_idx" ON "vfx_credits" USING btree ("vfx_house_id");--> statement-breakpoint
CREATE INDEX "vfx_house_sources_source_idx" ON "vfx_house_sources" USING btree ("source_id");