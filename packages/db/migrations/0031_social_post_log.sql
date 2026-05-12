-- E-40 — track Bluesky / Mastodon posts so we never post the same
-- production twice. Idempotency via a (production_id, channel)
-- unique key. Status records dry-run vs real posts.
CREATE TABLE social_post_log (
  id              BIGSERIAL PRIMARY KEY,
  production_id   BIGINT NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL CHECK (channel IN ('bluesky', 'mastodon')),
  posted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  post_url        TEXT,
  status          TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'dry_run')),
  error           TEXT,
  UNIQUE (production_id, channel)
);
CREATE INDEX social_post_log_production_idx ON social_post_log(production_id);
CREATE INDEX social_post_log_posted_at_idx ON social_post_log(posted_at DESC);
