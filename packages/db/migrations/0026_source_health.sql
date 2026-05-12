-- E-47 — track link health on `sources` so we can flag rotted citations
-- before users hit them. `last_checked_at` says when we last hit the URL;
-- `last_status` carries the most recent HTTP status code (or 0 for
-- network errors). Together they distinguish:
--   - never checked  (last_checked_at IS NULL)
--   - alive  (last_status BETWEEN 200 AND 399)
--   - rotted (last_status >= 400 OR last_status = 0)
--
-- A weekly cron walks `sources WHERE url IS NOT NULL ORDER BY
-- last_checked_at NULLS FIRST` so freshly added rows get checked first.

ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_status integer;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sources_last_checked_idx
  ON sources(last_checked_at NULLS FIRST)
  WHERE url IS NOT NULL;
