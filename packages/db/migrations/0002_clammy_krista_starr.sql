CREATE TABLE "roles" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"category" "role_category_enum" NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "roles_category_idx" ON "roles" USING btree ("category");--> statement-breakpoint
CREATE INDEX "roles_aliases_gin_idx" ON "roles" USING gin ("aliases");