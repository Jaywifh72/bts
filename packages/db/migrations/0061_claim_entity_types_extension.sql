-- Migration 0061 — extend claim_entity_type_enum with the four entity
-- types that have detail pages but couldn't be the subject of a citation.
--
-- UX-audit Theme F item F2 unlock. The polymorphic claims graph already
-- supports `person`, `vfx_house`, `post_house`, `equipment_*`, `scene`,
-- `video`, `location` (migration 0040 / 0048). Today's audit revealed
-- that four entity types are missing — they have UI surfaces with
-- factual claims (taglines, founding stories, member lists, format
-- specs) but no way to attribute those claims to sources.
--
-- This unblocks rendering `[N]` citations on:
--   • /stunts/companies/[slug]
--   • /stunts/schools/[slug]
--   • /format/[slug]
--   • /societies/[slug]
--
-- Adding values to a Postgres enum is non-blocking and irreversible. We
-- use ADD VALUE IF NOT EXISTS so the migration is idempotent.

ALTER TYPE claim_entity_type_enum ADD VALUE IF NOT EXISTS 'stunt_company';
ALTER TYPE claim_entity_type_enum ADD VALUE IF NOT EXISTS 'stunt_school';
ALTER TYPE claim_entity_type_enum ADD VALUE IF NOT EXISTS 'format';
ALTER TYPE claim_entity_type_enum ADD VALUE IF NOT EXISTS 'society';
