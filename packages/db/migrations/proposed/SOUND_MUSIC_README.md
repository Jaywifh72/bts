# Sound & Music expansion — proposed migrations 0073-0075

Status: **DRAFT — not in `_journal.json`. Review before promoting.**

Adds per-production scoring metadata, music cue catalog (full curated
coverage target ~500), and a sound-libraries entity for SFX library
credits. Builds on the existing `post_houses` (sound_mix kind) and
`scoring_stages` tables — no new houses/stages tables needed.

## Decisions locked in

| # | Decision |
|---|---|
| 1 | Sound craft split = 3: `sound-design`, `dialogue-adr`, `music-editing`. Plus new `music-supervision` craft. Already shipped in `apps/web/lib/awards/crafts.ts`. |
| 2 | `post_houses` extension: NONE needed. Use existing `kind` + `production_post_houses.role` for sound filtering. The earlier "add `disciplines text[]`" idea is dropped. |
| 3 | Music supervisors live at `/music/supervisors` (sub-route), not a top-level hub. |
| 4 | Full cue coverage for curated tier (~500 cues across top 50 films). |
| 5 | Top nav uses Craft dropdown — already shipped in `apps/web/components/nav/TopNav.tsx`. |

## Migration files

1. **0073_score_works.sql** — `score_works` (production × composer) + `score_work_sources`. One row per composer (handles co-composer pairs cleanly). Joins to `scoring_stages` for the recording venue.
2. **0074_music_cues.sql** — `music_cues` + `music_cue_sources` + `music_cue_performers`. Cues are scoped to a `score_work_id`. `cue_function` enum captures the dramatic purpose (main_title, theme_intro, source_to_score, silence_to_score, etc.).
3. **0075_sound_libraries.sql** — `sound_libraries` + `production_sound_libraries` junction + sources sub-junction. Sparse table; uniquely citable.

## NOT included (intentionally deferred)

- **`dub_stages`**: post_houses already covers sound_mix facilities. If we later want stage-level detail (Atmos / Premier / IMAX cert per room within a facility), promote then. For now, `post_houses` row = facility = mix venue.
- **`music_supervision_works`** parallel to `score_works`: music supervisor credits live in `crew_assignments` with role_slug `music-supervisor`. If we later want per-production licensed-cue logs (which songs were licensed, fees), that's a separate migration.
- **Schema-side `crafts` table**: still deferred (proposed 0069). Crafts continue to live in `apps/web/lib/awards/crafts.ts` until awards taxonomy is promoted.

## Sub-routes to build (Phase C+D — not in this migration set)

```
/sound/houses               — index of post_houses filtered to sound_mix + sound_design
/sound/houses/[slug]        — house detail (reuse vfx-house template)
/sound/post                 — post-sound discipline page
/sound/effects              — sound design + SFX editors + sound libraries
/sound/effects/libraries/[slug] — library detail

/music/composers            — composer index (people filtered by music category)
/music/composers/[slug]     — composer dossier (or extend /crew)
/music/scoring-stages       — index (already in DB)
/music/scoring-stages/[slug]
/music/orchestras           — recording orchestras (extract from score_works.recording_orchestra)
/music/supervisors          — music supervisor index
/music/scores/[productionSlug]            — per-production score deep-dive
/music/cues/[productionSlug]/[cueSlug]    — cue detail with listening notes + sources
```

## Role landing pages (Phase D)

```
/for-sound-mixers         — production + post mix
/for-sound-designers      — SFX, design, foley
/for-composers            — scoring craft
/for-music-supervisors    — licensing-focused
```

All four built on existing `RolePage` shell.

## Ingest jobs (Phase D)

Drop into the existing `/admin/ingest` UI alongside Wikidata workers:

- **MusicBrainz** — composer + soundtrack release metadata (free, MIT-license catalog)
- **Discogs** — soundtrack releases (free API, rich release/label/format)
- **TMDb crew expansion** — sound + music departments (already in TMDb, currently filtered out)
- **Wikidata** — extend existing workers with P86 (composer), P162 (producer), P5612 (sound mixer)
- **MPSE Golden Reel** — public winners list scraper
- **SCL Awards** — public winners list scraper
