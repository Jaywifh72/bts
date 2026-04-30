CREATE TABLE "production_formats" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"production_id" bigint NOT NULL,
	"label" text,
	"aspect_ratio" text NOT NULL,
	"acquisition_format" text NOT NULL,
	"color_space" text,
	"frame_rate" numeric(5, 2),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_studios" (
	"production_id" bigint NOT NULL,
	"studio_id" bigint NOT NULL,
	"role" "production_studio_role_enum" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_studios_production_id_studio_id_role_pk" PRIMARY KEY("production_id","studio_id","role")
);
--> statement-breakpoint
CREATE TABLE "productions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"type" "production_type_enum" NOT NULL,
	"parent_id" bigint,
	"title" text NOT NULL,
	"original_title" text,
	"release_year" integer,
	"principal_photography_start" date,
	"principal_photography_end" date,
	"runtime_minutes" integer,
	"synopsis" text,
	"tmdb_id" integer,
	"imdb_id" text,
	"wikidata_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "productions_slug_unique" UNIQUE("slug"),
	CONSTRAINT "productions_tmdb_id_unique" UNIQUE("tmdb_id"),
	CONSTRAINT "productions_imdb_id_unique" UNIQUE("imdb_id"),
	CONSTRAINT "productions_wikidata_id_unique" UNIQUE("wikidata_id")
);
--> statement-breakpoint
CREATE TABLE "studios" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"country" text,
	"kind" "studio_kind_enum" NOT NULL,
	"parent_studio_id" bigint,
	"wikidata_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studios_slug_unique" UNIQUE("slug"),
	CONSTRAINT "studios_wikidata_id_unique" UNIQUE("wikidata_id")
);
--> statement-breakpoint
ALTER TABLE "production_formats" ADD CONSTRAINT "production_formats_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_studios" ADD CONSTRAINT "production_studios_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_studios" ADD CONSTRAINT "production_studios_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productions" ADD CONSTRAINT "productions_parent_id_productions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studios" ADD CONSTRAINT "studios_parent_studio_id_studios_id_fk" FOREIGN KEY ("parent_studio_id") REFERENCES "public"."studios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_formats_production_idx" ON "production_formats" USING btree ("production_id");--> statement-breakpoint
CREATE INDEX "production_formats_primary_idx" ON "production_formats" USING btree ("production_id") WHERE "production_formats"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "production_studios_studio_role_idx" ON "production_studios" USING btree ("studio_id","role");--> statement-breakpoint
CREATE INDEX "productions_type_idx" ON "productions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "productions_release_year_idx" ON "productions" USING btree ("release_year");--> statement-breakpoint
CREATE INDEX "productions_parent_idx" ON "productions" USING btree ("parent_id");