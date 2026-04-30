CREATE TABLE "equipment_usage" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"scene_id" bigint NOT NULL,
	"equipment_series_id" bigint NOT NULL,
	"equipment_item_id" bigint,
	"crew_assignment_id" bigint,
	"setup_label" text,
	"usage_role" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"production_id" bigint NOT NULL,
	"slug" text NOT NULL,
	"scene_number" text,
	"title" text NOT NULL,
	"synopsis" text,
	"position_in_runtime_seconds" integer,
	"interior_exterior" "scene_interior_exterior_enum",
	"time_of_day" "scene_time_of_day_enum",
	"location" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scenes_production_slug_unq" UNIQUE("production_id","slug")
);
--> statement-breakpoint
ALTER TABLE "equipment_usage" ADD CONSTRAINT "equipment_usage_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_usage" ADD CONSTRAINT "equipment_usage_equipment_series_id_equipment_series_id_fk" FOREIGN KEY ("equipment_series_id") REFERENCES "public"."equipment_series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_usage" ADD CONSTRAINT "equipment_usage_crew_assignment_id_crew_assignments_id_fk" FOREIGN KEY ("crew_assignment_id") REFERENCES "public"."crew_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_usage" ADD CONSTRAINT "equipment_usage_item_series_fk" FOREIGN KEY ("equipment_item_id","equipment_series_id") REFERENCES "public"."equipment_items"("id","series_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "equipment_usage_scene_idx" ON "equipment_usage" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "equipment_usage_series_idx" ON "equipment_usage" USING btree ("equipment_series_id");--> statement-breakpoint
CREATE INDEX "equipment_usage_series_scene_idx" ON "equipment_usage" USING btree ("equipment_series_id","scene_id");--> statement-breakpoint
CREATE INDEX "equipment_usage_item_idx" ON "equipment_usage" USING btree ("equipment_item_id") WHERE "equipment_usage"."equipment_item_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "equipment_usage_crew_idx" ON "equipment_usage" USING btree ("crew_assignment_id") WHERE "equipment_usage"."crew_assignment_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "scenes_tod_ie_idx" ON "scenes" USING btree ("time_of_day","interior_exterior");