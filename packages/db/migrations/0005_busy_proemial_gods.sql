CREATE TABLE "crew_assignments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"production_id" bigint NOT NULL,
	"person_id" bigint NOT NULL,
	"role_id" smallint NOT NULL,
	"credit_order" integer,
	"credit_name_override" text,
	"started_on" date,
	"ended_on" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crew_assignments_prod_person_role_unq" UNIQUE("production_id","person_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "crew_assignments" ADD CONSTRAINT "crew_assignments_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_assignments" ADD CONSTRAINT "crew_assignments_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_assignments" ADD CONSTRAINT "crew_assignments_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crew_assignments_prod_role_idx" ON "crew_assignments" USING btree ("production_id","role_id");--> statement-breakpoint
CREATE INDEX "crew_assignments_person_role_idx" ON "crew_assignments" USING btree ("person_id","role_id");