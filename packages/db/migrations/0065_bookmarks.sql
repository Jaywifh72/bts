-- Migration 0065 — Bookmarks (user-bound saves).
--
-- Stores per-user bookmarks of any catalog entity. The (kind, slug) pair
-- identifies the target; title/subtitle/href are denormalized so list views
-- can render without joining back to the source table.
-- See spec docs/superpowers/specs/2026-05-16-google-auth-design.md and
-- plan docs/superpowers/plans/2026-05-16-google-auth.md (Task 3).

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id    uuid                      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       text                      NOT NULL,
  slug       text                      NOT NULL,
  title      text                      NOT NULL,
  subtitle   text,
  href       text                      NOT NULL,
  added_at   timestamp with time zone  NOT NULL DEFAULT now(),
  CONSTRAINT bookmarks_pk PRIMARY KEY (user_id, kind, slug)
);

CREATE INDEX IF NOT EXISTS bookmarks_user_added_idx
  ON bookmarks (user_id, added_at DESC);
