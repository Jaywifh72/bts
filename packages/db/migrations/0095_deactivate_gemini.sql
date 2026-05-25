-- Migration 0095 — deactivate the gemini engine.
--
-- Gemini's free-tier daily quota exhausts after ~20 grounded calls, making
-- it unusable at the cycle's polling volume. Disabling it (instead of
-- removing the row) preserves history: aeo_response_observations rows
-- still reference the engine_id, and re-enabling later is just an
-- UPDATE back to true.
--
-- This affects:
--   • /admin/aeo "Active engines" tile (was 5, now 4)
--   • aeo-cycle.ts engineIdByCode lookup (returns undefined for gemini)
--   • The cycle script logs "[skip]" instead of polling
--
-- Re-enable when GCP billing is enabled or when migrating to Vertex AI.

UPDATE aeo_engines SET active = false WHERE code = 'gemini';
