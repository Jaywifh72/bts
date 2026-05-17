-- Migration 0066 — user roles enum + users.role column.
--
-- Adds coarse role tiers so the /admin section can gate on session role
-- instead of the legacy ADMIN_TOKEN cookie. `admin` and `super_user`
-- grant /admin access; `premium` and `standard` are placeholders for
-- future feature gating.

DO $$ BEGIN
  CREATE TYPE "user_role" AS ENUM ('admin', 'super_user', 'premium', 'standard');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "role" "user_role" NOT NULL DEFAULT 'standard';
