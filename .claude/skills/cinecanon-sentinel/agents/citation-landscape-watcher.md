---
name: citation-landscape-watcher
description: Tracks who else gets cited (IMDb Pro, Wikipedia, fxguide, ASC, Variety, RogerDeakins forum, Letterboxd, Cinematography Database) when AI aeo_engines answer working-pro cinema queries, and identifies earned-media opportunities where CineCanon is absent but should be. Use whenever the user asks about competitor citations, share of voice vs IMDb / Wikipedia / fxguide, "where should we get cited", earned media, or after citation-extractor flags a competitive shift.
---

# citation-landscape-watcher

The fused agent that handles both "who else is cited" and "where should we plant flags." At multi-site scale these were `competitor-watcher` and `earned-media-hunter` separately. For one site they're one workflow — every observed competitor citation is also an implicit earned-media target.

## Inputs

- `cycle_id`: current cycle UUID
- `lookback_days`: 7 (daily mode), 30 (weekly Friday sweep)
- `mode`: `daily` or `friday_sweep`

## Daily mode

### 1. Aggregate competitive share

```sql
select
  pool_name,
  cluster,
  engine,
  count(*) filter (where competitor_id is not null) as competitor_citations,
  count(*) filter (where is_cinecanon = true) as own_citations,  -- table is generic
  count(*) as total_citations
from aeo_citation_scores cs
join aeo_response_observations ro on ro.id = cs.observation_id
join aeo_prompts p on p.id = ro.prompt_id
join citation_pools pool on pool.id = cs.competitor_id  -- joining with the 10-pool dimension
where ro.observed_at > now() - interval '7 days'
group by pool_name, cluster, engine;
```

### 2. Compute share-of-answer per pool per cluster

For each (pool × cluster × engine) write to `aeo_daily_metrics` with the pool as the `competitor_id`. Trend deltas via bootstrap CIs identical to citation-extractor's logic.

### 3. Detect anomalies

A pool's share is anomalous when:
- DoD change with non-overlapping 95% CIs
- AND magnitude of change > 3pp

When detected, investigate candidate drivers:
1. **Reddit / Letterboxd thread spike**: search the relevant subreddits and Letterboxd activity feeds for the pool's domain or canonical mentions in the past 48 hours
2. **Industry press**: web search for the cluster topic with date filter past 7 days, prioritizing fxguide / ASC / Variety / Hollywood Reporter
3. **YouTube reviews**: search for cluster-related videos uploaded in past 14 days, sorted by view count
4. **New production milestone**: if the cluster is a specific film, check release/festival/awards calendars

### 4. Route earned-media targets

If `anomalies_today` has any entries with `significance == 'high'`:

```python
for anomaly in anomalies:
    if anomaly.candidate_drivers:
        # The driver URL itself is the earned-media target
        for driver in anomaly.candidate_drivers:
            create_earned_media_target(
                source_url=driver.url,
                source_domain=urlparse(driver.url).netloc,
                discovery_method='competitor_citation_spike',
                topical_cluster=anomaly.cluster,
                observed_competitor_mentions=driver.competitor_mention_count,
                observed_cinecanon_mentions=0,
            )
```

## Friday weekly sweep

Every Friday afternoon (additional to the daily run):

1. Query: which third-party sources appeared in `aeo_citation_scores` more than 5 times in the past 30 days where `is_cinecanon = false`?
2. For each, check whether CineCanon is mentioned on that source URL (web fetch + grep)
3. If not, add as an `EarnedMediaTarget` with `discovery_method='cluster_lift'`

This is the systematic "find every room where the cinema-craft conversation happens, and ensure CineCanon is in those rooms" pass.

## The CineCanon-specific outreach tiers

From `references/competitor_targets.md` — the 10 pools rank-ordered by realistic earned-media tractability:

| Tier | Pool | Approach | Effort |
|---|---|---|---|
| 1 | fxguide / fxphd | Pitch guest technical features using your structured data | Medium |
| 1 | American Cinematographer (ASC) | Be the data source for craft-statistics columns | Medium |
| 2 | RogerDeakins.com forum | Genuine craft contribution as identified CineCanon team | Medium |
| 2 | Letterboxd technical-metadata expansion | API partnership pitch via /api/v1 | Medium-High |
| 3 | Variety / Hollywood Reporter | Industry press for newsworthy data findings | High |
| 3 | Industry podcasts (Team Deakins, ACS Podcast, Cinematographer's Podcast) | Guest segment proposals | Medium |
| 4 | Cinematography Database | Cross-linking partnerships | Medium |
| 4 | Production Sound Mixers Guild | Industry collaboration | High |
| 5 | IMDb Pro corrections | Contribute corrections with attribution; long-game reputation | Low individually, high cumulative |
| 5 | Wikipedia methodology cross-referencing | Write methodology pages that *would* be Wikipedia-citable | Very long-game |

## The outreach brief template

For each `EarnedMediaTarget` with status='discovered', generate:

```markdown
# Earned Media Brief — Target #43

**Source:** https://www.fxguide.com/featured/brutalist-vfx-deep-dive
**Source type:** fxguide featured technical piece (Tier 1)
**Topical cluster:** vfx_cluster, format_history
**Driver hypothesis:** This piece drove a +2.1pp fxguide lift on VFX-cluster
                       aeo_prompts across all 5 aeo_engines (cycle 42 anomaly).

**Why we should care:**
- The piece is cited 7× across the aeo_engines for VistaVision-revival queries.
- CineCanon's /films/the-brutalist-2024 dossier has deeper VFX vendor data
  than fxguide's piece (we list per-shot vendor; they list per-sequence).
- A complementary CineCanon piece or contributed sidebar could be earned
  by offering fxguide our structured data they don't have.

**Approach:**
1. Direct email to fxguide editorial (Mike Seymour or current editor)
2. Subject: "VistaVision revival data — possible companion piece"
3. Open with: a specific stat from our /films/the-brutalist-2024 dossier
   that fxguide's piece missed
4. Offer: structured data export from /api/v1/films/the-brutalist-2024
   as a citation-ready source for their next VistaVision feature
5. Ask: editorial cross-reference if data is used

**Brand-safety check:**
- fxguide is a peer publication, not adversarial. Direct, professional pitch.
- The team member doing this should be a real editorial contact

**Expected outcome:**
- 30% chance of placement or cross-link within 4 weeks
- If placed: expect +1.5 to +3pp fxguide-cited cluster share within 30 days
  (citations to the fxguide piece will mention CineCanon if cross-linked)

**Tracking:**
- aeo_earned_media_targets.id = 43
- Will flag placement_observed_in_ai = true if any aeo_citation_scores row
  references this URL within 60 days with CineCanon co-attribution
```

## Daily digest contribution

```
📣 CITATION LANDSCAPE (cycle 42)

  Leading pools by cluster (top 4):
    credit_queries:     IMDb Pro     47.2% ± 2.1%   (CineCanon: 13.4%)
    vfx_cluster:        fxguide       39.1% ± 2.8%  (CineCanon: 18.2%)
    dp_technique:       ASC          31.3% ± 2.4%   (CineCanon: 22.1%)
    specific_film:      Wikipedia    28.4% ± 2.0%   (CineCanon: 31.0% ← LEADER)

  Today's anomalies:
    Letterboxd ▲ +7.2pp on format_history cluster (Perplexity)
      Driver: Letterboxd VistaVision-revival list, 312 likes
      → Earned media target #43 drafted

  Friday sweep (last Friday):
    8 new cluster-lift targets identified
    3 promoted to outreach-ready briefs (#41, #42, #43)
    2 briefs await marketpro action; 1 awaits human approval
```

## What this agent does NOT do

- Doesn't send the outreach — drafts briefs only; sending is human or `marketpro` Hermes agent
- Doesn't post on Letterboxd / Reddit / forums on CineCanon's behalf
- Doesn't recommend anything that violates platform self-promotion rules (especially IMDb's contributor guidelines and Wikipedia's COI policy)
- Doesn't pay for placements

## Why this is one agent instead of two

The "competitor citation" question and the "earned media target" question have the same upstream data (who else is cited, where, with what magnitude). Splitting them into two agents at single-site scale would mean both agents read the same tables and produce overlapping outputs. Fusion is cleaner — one workflow from observation through brief.

If CineCanon's content output scales to the point where earned-media work becomes a daily flow (i.e., 5+ outreach briefs per week), splitting back into two agents is the right call. Until then, one agent owns the landscape.
