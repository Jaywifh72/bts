# Competitor Citation Targets

Who else gets cited when AI aeo_engines answer working-pro cinematography questions. The `citation-landscape-watcher` agent tracks share-of-answer against these targets and identifies earned-media opportunities where they're cited and CineCanon isn't.

## The 10 tracked pools

| Pool | Domain | Why tracked | Citation strength |
|---|---|---|---|
| IMDb Pro | pro.imdb.com / imdb.com | Largest film database; gravity favorite for ChatGPT/Gemini | Dominant (40-50% share on credit queries) |
| Wikipedia | en.wikipedia.org | Universal authority; Citation Recall is high but precision varies | High (15-25% on factual queries) |
| fxguide / fxphd | fxguide.com, fxphd.com | The reference for VFX/post-production technique | High on VFX cluster (35-50%) |
| American Cinematographer / ASC | theasc.com, ascmag.com | Magazine + association; canonical DP source | Very high on cinematographer queries (25-40%) |
| Variety / Hollywood Reporter | variety.com, hollywoodreporter.com | Industry press, breaks crew news | Medium on awards + production news |
| RogerDeakins.com forum | rogerdeakins.com | Niche but disproportionately influential for craft questions | Very high on lighting/DP technique |
| Letterboxd (gear/tech sections) | letterboxd.com | Crowd annotations on format and gear | Growing — 2026 expansion of tech metadata |
| Cinematography Database | cinematographydb.com | Crew-credit specialty database | Medium on credit queries |
| Filmsupply / ShotDeck (reference libraries) | shotdeck.com, filmsupply.com | Shot reference; cited for visual technique | Medium on shot-composition queries |
| Production Sound Mixer's Guild + AMPS | local695.com, amps.net | Sound-craft authority | High on sound-cluster queries |

## Tracking logic

For each citation pool × engine × prompt cluster:
1. Count occurrences in `aeo_citation_scores` over the past 30 days
2. Compute share-of-answer per cluster
3. Flag clusters where a pool > 15pp ahead of CineCanon — those are earned-media targets
4. For each flagged cluster, search the pool for the specific URLs being cited; those are the placement targets

## Specific gaps to expect

Given CineCanon's coverage profile, these are the gaps you should expect to find at Phase 1:

- **Credit queries (who edited / mixed / scored a film):** IMDb Pro dominates. Hard to displace structurally — IMDb has Amazon's data moat. The win here is **precision against IMDb errors** (where IMDb has wrong credits, CineCanon being right and cited builds authority).
- **VFX cluster:** fxguide will dominate VFX breakdowns. Compete on per-production VFX dossiers with named-vendor + named-supervisor + cited references.
- **DP technique:** ASC + Deakins forum dominate. Compete on per-film **technical** dossiers (your strength — scene-level lighting plots, lens-per-scene, format motivation).
- **Specific-film lookups:** Wikipedia is the universal default. Compete on **depth** — when Wikipedia lists 3 facts about a film's production, you list 30, all cited.

## What this agent's daily output looks like

```json
{
  "leading_pools_by_cluster": {
    "credit_queries": {"leader": "IMDb Pro", "share": 0.47, "cinecanon": 0.13},
    "vfx_cluster": {"leader": "fxguide", "share": 0.39, "cinecanon": 0.18},
    "dp_technique": {"leader": "ASC", "share": 0.31, "cinecanon": 0.22},
    "specific_film_lookups": {"leader": "Wikipedia", "share": 0.28, "cinecanon": 0.31}
  },
  "anomalies_today": [
    {
      "pool": "Letterboxd",
      "cluster": "format_history",
      "engine": "perplexity",
      "yesterday_share": 0.04,
      "today_share": 0.11,
      "candidate_driver": "https://letterboxd.com/list/vistavision-revival-2024-2025/"
    }
  ],
  "earned_media_targets_proposed": [
    {
      "target_url": "https://www.fxguide.com/featured/brutalist-vfx-deep-dive",
      "cluster": "vfx_cluster",
      "outreach_brief_id": 43
    }
  ]
}
```

## What this agent does NOT do

- Doesn't send outreach (drafts briefs; human or `marketpro` Hermes agent sends)
- Doesn't post on Reddit / Letterboxd / industry forums on CineCanon's behalf
- Doesn't recommend any practice that violates platform self-promotion rules

## Earned-media plays specific to CineCanon

Per the LoudFace 2026 audit, **own-domain citations cap at ~15%** of all AI citations. The other 85% comes from third-party pools. For CineCanon, the high-leverage off-domain plays are:

### 1. Contribute corrections to IMDb (with attribution)

IMDb has crew credit errors. When you find one CineCanon has verified, submit the correction through IMDb's contribution system. Your name appears in the source field. Over time, this builds reputation in IMDb's contributor system, and AI aeo_engines preferring IMDb-as-source start surfacing CineCanon-derived facts.

### 2. Methodology cross-referencing on Wikipedia

Where CineCanon dossiers cite primary sources Wikipedia doesn't link to (e.g., specific ASC magazine interviews, fxguide breakdowns), the methodology pages can become Wikipedia source candidates. Don't edit Wikipedia entries directly (COI concerns); but writing exceptional methodology docs that *would* be Wikipedia-citable is a long-game move.

### 3. fxguide / VFX Society guest writing

Pitch fxguide for guest technical pieces using CineCanon's structured data on a specific production. fxguide has authority but limited editorial capacity. CineCanon has structured-data depth that fxguide lacks. Mutual interest.

### 4. ASC magazine column data sourcing

Same dynamic, lower-friction. ASC Mag periodically publishes craft-statistics pieces. Be the data source. They cite back.

### 5. Letterboxd technical-metadata expansion

Letterboxd is expanding tech metadata in 2026. They source from databases. CineCanon's API at `/api/v1` makes integration straightforward. Propose a partnership.

### 6. RogerDeakins forum participation

Real participation, identified, as a craft contributor not a marketer. Roger reads it. The forum's regulars include working DPs whose AI queries you want to capture. Contribute craft, get cited when craft is summarized.

### 7. Industry podcast guesting

*Team Deakins*, *American Cinematographer Podcast*, *3D Printing Today* (wait, wrong list — see *The Cinematographer's Podcast*, *Hand Held Hollywood*). Guest segments on technique discussions where CineCanon's structured data underlies the discussion.

## Quality bar

CineCanon's existing brand promise — *confidence-graded, cited* — is itself the earned-media wedge. The pitch to every gatekeeper is the same:

> *"We've structured the working-pro technical metadata that you'd publish in a one-off feature into a queryable, citable, ongoing reference. Cite us where it strengthens your editorial, and we'll cross-link when your reporting strengthens ours."*

This is what gets through gatekeepers at fxguide and ASC. It's also what doesn't get through at IMDb (Amazon doesn't do reciprocity) and Wikipedia (no commercial COI). The earned-media-watcher's tier ranking reflects this asymmetry.
