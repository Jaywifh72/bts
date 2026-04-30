CREATE TABLE "crew_assignment_sources" (
	"crew_assignment_id" bigint NOT NULL,
	"source_id" bigint NOT NULL,
	"confidence" "source_confidence_enum" NOT NULL,
	"claim_quote" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crew_assignment_sources_crew_assignment_id_source_id_pk" PRIMARY KEY("crew_assignment_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "equipment_usage_sources" (
	"equipment_usage_id" bigint NOT NULL,
	"source_id" bigint NOT NULL,
	"confidence" "source_confidence_enum" NOT NULL,
	"claim_quote" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_usage_sources_equipment_usage_id_source_id_pk" PRIMARY KEY("equipment_usage_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "production_sources" (
	"production_id" bigint NOT NULL,
	"source_id" bigint NOT NULL,
	"confidence" "source_confidence_enum" NOT NULL,
	"claim_quote" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_sources_production_id_source_id_pk" PRIMARY KEY("production_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "scene_sources" (
	"scene_id" bigint NOT NULL,
	"source_id" bigint NOT NULL,
	"confidence" "source_confidence_enum" NOT NULL,
	"claim_quote" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scene_sources_scene_id_source_id_pk" PRIMARY KEY("scene_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"kind" "source_kind_enum" NOT NULL,
	"title" text NOT NULL,
	"publication" text,
	"author" text,
	"published_at" date,
	"accessed_at" date,
	"url" text,
	"archive_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "crew_assignment_sources" ADD CONSTRAINT "crew_assignment_sources_crew_assignment_id_crew_assignments_id_fk" FOREIGN KEY ("crew_assignment_id") REFERENCES "public"."crew_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_assignment_sources" ADD CONSTRAINT "crew_assignment_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_usage_sources" ADD CONSTRAINT "equipment_usage_sources_equipment_usage_id_equipment_usage_id_fk" FOREIGN KEY ("equipment_usage_id") REFERENCES "public"."equipment_usage"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_usage_sources" ADD CONSTRAINT "equipment_usage_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_sources" ADD CONSTRAINT "production_sources_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_sources" ADD CONSTRAINT "production_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_sources" ADD CONSTRAINT "scene_sources_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_sources" ADD CONSTRAINT "scene_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crew_assignment_sources_source_idx" ON "crew_assignment_sources" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "equipment_usage_sources_source_idx" ON "equipment_usage_sources" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "production_sources_source_idx" ON "production_sources" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "scene_sources_source_idx" ON "scene_sources" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_url_unq" ON "sources" USING btree ("url") WHERE "sources"."url" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "sources_kind_idx" ON "sources" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "sources_published_idx" ON "sources" USING btree ("published_at");