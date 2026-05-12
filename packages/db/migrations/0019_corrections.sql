-- T7-4: public correction-queue inbox. Replaces the mailto:-only path
-- from T1-4 with a real on-site submission flow + admin triage. Schema
-- captures: which production the user was looking at (nullable —
-- generic site-wide corrections allowed too), what they wrote, and
-- their email for follow-up if they chose to share it. The page_url
-- column lets the queue surface "they were on /films/foo" even when
-- production_id is null (e.g. crew page, gear page).

CREATE TYPE correction_status_enum AS ENUM (
  'open',
  'triaged',
  'resolved',
  'dismissed'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS corrections (
  id              bigserial PRIMARY KEY,
  -- Optional FK; corrections can target a specific production or be generic.
  -- ON DELETE SET NULL so deleting a production doesn't lose the report
  -- (its page_url is still useful as triage context).
  production_id   bigint REFERENCES productions(id) ON DELETE SET NULL,
  page_url        text NOT NULL,
  message         text NOT NULL,
  email           text,
  status          correction_status_enum NOT NULL DEFAULT 'open',
  triage_notes    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS corrections_status_created_idx
  ON corrections(status, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS corrections_production_idx
  ON corrections(production_id, created_at DESC)
  WHERE production_id IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER set_updated_at_corrections
  BEFORE UPDATE ON corrections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
