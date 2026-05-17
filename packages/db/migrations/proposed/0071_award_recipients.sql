-- Migration 0071 (PROPOSED) — Multi-recipient junction.
--
-- Today each award row carries up to one recipient via three nullable
-- FKs (person / vfx_house / stunt_company). That works for Oscar DP
-- but breaks for:
--   - Best Sound (4-5 mixers / re-recording engineers)
--   - Best VFX (4 person credits + production VFX team)
--   - Stunt ensemble (entire stunt team named, not just the coordinator)
--   - Production design (designer + set decorator)
--
-- award_recipients moves recipients into a junction so any award row
-- can list N recipients of mixed kinds.
--
-- The legacy single-recipient FKs on `awards` are KEPT (not dropped)
-- so existing queries continue to work. New ingest code should write
-- through award_recipients; a follow-up migration will backfill
-- existing rows and drop the legacy columns.

CREATE TABLE "award_recipients" (
  "id"              bigserial PRIMARY KEY,
  "award_id"        bigint NOT NULL REFERENCES "awards"("id") ON DELETE CASCADE,
  "recipient_kind"  award_recipient_kind_enum NOT NULL,
  "person_id"           bigint REFERENCES "people"("id")           ON DELETE SET NULL,
  "vfx_house_id"        bigint REFERENCES "vfx_houses"("id")       ON DELETE SET NULL,
  "stunt_company_id"    bigint REFERENCES "stunt_companies"("id")  ON DELETE SET NULL,
  "production_id"       bigint REFERENCES "productions"("id")      ON DELETE SET NULL,
  "credited_as"     text,     -- override display name (e.g. "James 'Jim' Roberts")
  "role_note"       text,     -- e.g. "Re-recording Mixer", "Set Decorator"
  "sort_order"      integer NOT NULL DEFAULT 0,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),

  -- Exactly one of the recipient FKs is non-null, matching recipient_kind.
  CONSTRAINT "award_recipients_kind_fk_consistent" CHECK (
    (recipient_kind = 'person'        AND person_id        IS NOT NULL AND vfx_house_id IS NULL AND stunt_company_id IS NULL AND production_id IS NULL) OR
    (recipient_kind = 'vfx_house'     AND vfx_house_id     IS NOT NULL AND person_id    IS NULL AND stunt_company_id IS NULL AND production_id IS NULL) OR
    (recipient_kind = 'stunt_company' AND stunt_company_id IS NOT NULL AND person_id    IS NULL AND vfx_house_id     IS NULL AND production_id IS NULL) OR
    (recipient_kind = 'production'    AND production_id    IS NOT NULL AND person_id    IS NULL AND vfx_house_id     IS NULL AND stunt_company_id IS NULL) OR
    (recipient_kind IN ('society', 'other_org'))
  )
);

CREATE INDEX "award_recipients_award_idx"    ON "award_recipients" ("award_id", "sort_order");
CREATE INDEX "award_recipients_person_idx"   ON "award_recipients" ("person_id")        WHERE "person_id"        IS NOT NULL;
CREATE INDEX "award_recipients_vfx_idx"      ON "award_recipients" ("vfx_house_id")     WHERE "vfx_house_id"     IS NOT NULL;
CREATE INDEX "award_recipients_stunt_co_idx" ON "award_recipients" ("stunt_company_id") WHERE "stunt_company_id" IS NOT NULL;

-- Backfill from the legacy single-FK columns on `awards` so queries
-- against the junction return the full historical set immediately.
INSERT INTO "award_recipients" ("award_id", "recipient_kind", "person_id", "vfx_house_id", "stunt_company_id", "production_id", "sort_order")
SELECT
  a.id,
  a.recipient_kind,
  a.recipient_person_id,
  a.recipient_vfx_house_id,
  a.recipient_stunt_company_id,
  CASE WHEN a.recipient_kind = 'production' THEN a.production_id END,
  0
FROM "awards" a
WHERE a.recipient_person_id IS NOT NULL
   OR a.recipient_vfx_house_id IS NOT NULL
   OR a.recipient_stunt_company_id IS NOT NULL
   OR a.recipient_kind = 'production';
