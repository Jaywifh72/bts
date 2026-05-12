ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS paywall_status TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS archive_status TEXT NOT NULL DEFAULT 'unknown';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sources_paywall_status_check'
  ) THEN
    ALTER TABLE sources
      ADD CONSTRAINT sources_paywall_status_check
      CHECK (paywall_status IN ('unknown', 'open', 'soft_paywall', 'hard_paywall', 'login_required'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sources_archive_status_check'
  ) THEN
    ALTER TABLE sources
      ADD CONSTRAINT sources_archive_status_check
      CHECK (archive_status IN ('unknown', 'not_needed', 'captured', 'missing', 'failed'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS sources_canonical_url_idx
  ON sources(canonical_url)
  WHERE canonical_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS sources_paywall_status_idx
  ON sources(paywall_status);
CREATE INDEX IF NOT EXISTS sources_archive_status_idx
  ON sources(archive_status);
