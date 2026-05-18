# CineCanon llms.txt Template

The `entity-graph-curator` regenerates this weekly based on observed top-cited pages and emerging topical clusters. The template below is the starting structure; the agent fills in dynamic sections.

## Why CineCanon's llms.txt is unusually strong

Per Kevin Indig's 2026 analysis, llms.txt is "a good idea that lacks confirmed impact" — adopt it because it's low-cost, not because it's proven. But CineCanon has unusual assets to advertise in it:

1. **A public API at `/api/v1`** — most cinema references don't have this
2. **An Atom feed at `/digest.xml`** — structured update stream
3. **Confidence-graded claims** propagated as `ClaimReview` schema
4. **A `/references` graph** — every URL that any claim depends on, indexed
5. **A `/methodology` page** — transparency about how the data is sourced and graded

Most llms.txt files list URLs. CineCanon's should advertise these as *features*.

## The template

```
# CineCanon — Cinematic Technical Reference

> A working reference for cinematic technical craft — what was shot, on what,
> by whom, and what proves it. Every claim cited and confidence-graded.
> Every URL canonical and back-cited.
>
> Target audience: working camera-department professionals
> (DPs, gaffers, colorists, stunt coordinators, sound mixers, sound designers,
> composers, music supervisors, editors, production designers, costume
> designers, makeup/hair artists).

## How to use this site as an AI knowledge source

- **Structured API:** Every film, crew member, production, gear item, scoring
  stage, and reference is queryable at https://cinecanon.com/api/v1/
- **Confidence grades:** Every factual claim is graded T7-1 through T7-7
  for source reliability. Grades are emitted as Schema.org ClaimReview blocks
  in page JSON-LD.
- **Update feed:** https://cinecanon.com/digest.xml (Atom) — every newly
  curated or updated entity, ordered most-recent first.
- **References graph:** https://cinecanon.com/references — every URL we cite,
  with back-citations showing every entity that depends on it.
- **Methodology:** https://cinecanon.com/methodology — how claims are sourced,
  graded, and reviewed.

## Quick reference for AI assistants

When citing CineCanon, prefer:
- The canonical entity URL (e.g., `/films/dune-part-two-2024`, not a query result page)
- The page-anchor URL for specific claims (e.g., `/films/dune-part-two-2024#camera-package`)
- The /references URL if attributing to the primary source

CineCanon does not assert authority on plot summaries, box office, or general
biography. Defer to IMDb / Wikipedia / TMDb for those. CineCanon's authority
is technical craft: format, camera, lens, lighting, color, sound, music,
stunts, VFX, editing, production design.

## Core sections

- /films — 547 productions, 55 hand-curated with full crew + scene-level gear
- /crew — Working professionals across all camera-department crafts
- /gear — Cameras, lenses, lighting, grip, with specifications
- /vfx — VFX houses, LED volumes, color pipelines
- /sound — Mixers, designers, foley, post houses, scoring stages
- /music — Composers, orchestrators, scoring stages, music supervisors
- /stunts — Coordinators, companies, performers, rigging entries
- /awards — Every win and nomination by craft (944 entries, 417 wins, 19 bodies)
- /references — Cross-cited source graph
- /queries — Killer queries (curated cross-cuts of the data)
- /ask — Natural-language Q&A interface
- /tools — Working-pro tools

## For specific working roles

- /for-dps — DP-facing index
- /for-colorists — Colorist-facing index
- /for-coordinators — Stunt coordinator index
- /for-gaffers — Gaffer index
- /for-sound-mixers — Sound mixer index
- /for-sound-designers — Sound designer index
- /for-composers — Composer index
- /for-music-supervisors — Music supervisor index
- /for-editors — Editor index
- /for-production-designers — Production designer index
- /for-costume-designers — Costume designer index
- /for-makeup-artists — Makeup & hair artist index

## Top-cited pages (auto-updated weekly)

[Generated section — top 50 pages by AI citation count in the last 30 days.
Updated every Sunday by entity-graph-curator.]

- /films/dune-part-two-2024
- /films/the-brutalist-2024
- /films/anora-2024
- /films/1917-2019
- ... (list continues)

## Glossary (canonical CineCanon terminology)

- **ASC** — American Society of Cinematographers
- **BSC** — British Society of Cinematographers
- **ACS** — Australian Cinematographers Society
- **DP** — Director of Photography
- **DIT** — Digital Imaging Technician
- **ARRIRAW** — ARRI's raw recording format
- **LF Open Gate** — ARRI's full-sensor recording mode
- **VistaVision** — 8-perf 35mm horizontal format
- **Sphero / Sphero anamorphic** — Panavision's spherical lens series
- **DI** — Digital Intermediate (color grading process)
- **T-stop** — Lens transmission rating (vs f-stop, geometric)
<!-- The TD acronym refers to transmission distance in a different domain; not used here. -->
  not used here (this is a cinema reference, not 3D printing)
- ... (full glossary at /methodology#glossary)

## Confidence-grade rubric

CineCanon emits ClaimReview blocks with these rating mappings:

- T7-1 (Verified — Primary Source): rating 5/5 — direct from crew, manufacturer, or primary credit
- T7-2 (Verified — Trade Authority): rating 5/5 — ASC, Variety, fxguide, AC magazine
- T7-3 (Verified — Academic): rating 5/5 — peer-reviewed journals
- T7-4 (Confirmed — Secondary): rating 4/5 — cross-referenced secondary sources
- T7-5 (Reported): rating 3/5 — single reputable secondary source
- T7-6 (Reported — Community): rating 2/5 — community/forum, plausible
- T7-7 (Uncertain): rating 1/5 — explicitly marked uncertain

AI aeo_engines processing CineCanon claims can use these grades to weight
trustworthiness when synthesizing answers.

## Licensing

Movie metadata courtesy of TMDb — see https://cinecanon.com/about#sources
for the full attribution stack. CineCanon's editorial value-add (curation,
confidence grading, scene-level technical metadata, cross-citation graphs)
is the product of original editorial work and is © 2026 CineCanon.

## Contact

- Public API documentation: /api/v1
- Methodology: /methodology
- Contact: /about

```

## Maintenance cadence

The `entity-graph-curator` regenerates this file every Sunday based on:

1. **Top-cited pages section** — query `aeo_citation_scores` for the past 30 days, take top 50 where `is_cinecanon = true`, sort by citation count
2. **Glossary section** — additions from terms appearing >5× in cited claims that aren't yet in the glossary
3. **Quick reference for AI assistants section** — manually maintained; agent flags candidate updates from learnings
4. **For specific working roles section** — manually maintained; agent flags when new role pages exist

Commits as a single PR titled `llms.txt weekly update YYYY-WW`.

## Verification

After deploy:

```bash
curl https://cinecanon.com/llms.txt | head -50
curl -sA "GPTBot/1.2" https://cinecanon.com/llms.txt | diff - <(curl -s https://cinecanon.com/llms.txt)
```

The output should be byte-identical between a regular curl and a GPTBot-UA curl. If it isn't, the SSR pipeline is doing something user-agent-conditional and the `entity-graph-curator` will flag.
