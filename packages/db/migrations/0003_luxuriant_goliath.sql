CREATE TABLE "equipment_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"series_id" bigint NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"model_number" text,
	"year_introduced" integer,
	"year_discontinued" integer,
	"status" "equipment_item_status_enum" DEFAULT 'active' NOT NULL,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_items_slug_unique" UNIQUE("slug"),
	CONSTRAINT "equipment_items_id_series_unique" UNIQUE("id","series_id")
);
--> statement-breakpoint
CREATE TABLE "equipment_manufacturers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "equipment_manufacturer_kind_enum" NOT NULL,
	"country" text,
	"founded_year" integer,
	"website" text,
	"description" text,
	"wikidata_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_manufacturers_slug_unique" UNIQUE("slug"),
	CONSTRAINT "equipment_manufacturers_wikidata_id_unique" UNIQUE("wikidata_id")
);
--> statement-breakpoint
CREATE TABLE "equipment_series" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"manufacturer_id" bigint NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" "equipment_series_category_enum" NOT NULL,
	"year_introduced" integer,
	"year_discontinued" integer,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_series_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "equipment_items" ADD CONSTRAINT "equipment_items_series_id_equipment_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."equipment_series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_series" ADD CONSTRAINT "equipment_series_manufacturer_id_equipment_manufacturers_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."equipment_manufacturers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "equipment_items_series_idx" ON "equipment_items" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "equipment_items_status_idx" ON "equipment_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "equipment_items_specs_gin_idx" ON "equipment_items" USING gin ("specs");--> statement-breakpoint
CREATE INDEX "equipment_series_manuf_cat_idx" ON "equipment_series" USING btree ("manufacturer_id","category");