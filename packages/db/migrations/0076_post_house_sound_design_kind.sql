-- Migration 0076 — add 'sound_design' to the post_house_kind enum.
--
-- The `post_house_role` enum (in 0015_post_houses) already has 'sound_design'
-- as a per-credit role, but the parent `post_house_kind` enum only had
-- 'sound_mix'. That mismatch broke every query trying to filter sound houses
-- by kind IN ('sound_mix','sound_design') — silent at compile-time, errors
-- at query-time with `invalid input value for enum`.
--
-- ALTER TYPE ... ADD VALUE is non-transactional in older Postgres but works
-- in a standalone statement on Neon (PG14+).

ALTER TYPE "post_house_kind" ADD VALUE IF NOT EXISTS 'sound_design';
