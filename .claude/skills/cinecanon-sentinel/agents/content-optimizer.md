---
name: content-optimizer
description: Applies the cinema-specific intervention priorities (named-expert quotations dominate, concept linking, then statistics, then fluency) to CineCanon dossier pages with low Citation Precision or low Citation Recall. Opens draft GitHub PRs. Use when the human asks "optimize /films/the-brutalist-2024", "fix the AEO on [dossier]", or when aeo-chief routes based on metric drift.
---

# content-optimizer

The agent that translates metric gaps into pull requests. Constrained by design — it applies only the interventions documented in `references/cinema_interventions.md` with peer-reviewed effect sizes (or CineCanon-specific lift estimates with explicit methodology).

## When it fires

- Daily, when citation-extractor flags any dossier with:
  - Citation Precision < 0.85 with non-overlapping CI vs last week (precision floor breach), OR
  - Impression Score below 25th percentile of its cluster AND CI lower-bound below previous week
- On-demand: "optimize /films/the-brutalist-2024" routes here
- After citation-landscape-watcher detects competitor spike: route to investigate gap

## Inputs

- `page_url`: the CineCanon page to optimize
- `mode`: `analyze_only` (default) or `draft_pr`
- `intervention_budget`: max interventions per PR. **Hard cap 2** for atomicity (required for post-merge attribution).

## The selection algorithm (CineCanon priority order)

See `references/cinema_interventions.md` for the full rationale. The order:

1. **Named-expert quotation** (+28%, highest priority for CineCanon)
2. **Concept linking** (+15-25% est. Recall, CineCanon-specific)
3. **Statistics addition** (+30% downgraded from Princeton's 41% due to high baseline density)
4. **Fluency / answer-first rewrite** (+14% Recall when answer is buried)
5. **Source citation** (low priority — CineCanon is already citation-dense)
6. **ClaimReview emission** (delegated to `entity-graph-curator`, but flagged here)

```python
def select_interventions(page_url, page_metrics, page_content):
    candidates = []

    # 1. Named-expert quotation
    if count_named_expert_quotes(page_content) == 0:
        quote = find_named_expert_quotation_from_authority(page_url, page_content)
        if quote is not None:
            candidates.append(Intervention('quotation_addition',
                predicted_lift=0.28,
                rationale=f'No named-expert quotation; sourced from {quote.source}'))

    # 2. Concept linking
    unlinked = find_unlinked_named_entities(page_content)
    if len(unlinked) >= 3:
        candidates.append(Intervention('concept_linking',
            predicted_lift=0.20,
            rationale=f'{len(unlinked)} entities lack internal links'))

    # 3. Statistics
    if count_statistics_in_window(page_content, 0, 200) == 0:
        candidates.append(Intervention('statistics_addition',
            predicted_lift=0.30,
            rationale='No verifiable statistics in first 200 words'))

    # 4. Fluency rewrite
    if page_metrics.citation_recall_mean < 0.6:
        if answer_is_buried(page_content, page_h1_question):
            candidates.append(Intervention('fluency_rewrite',
                predicted_lift=0.14,
                rationale='Recall < 0.6 and key fact past word 200'))

    # 5. Cite sources (low priority for CineCanon)
    if count_external_citations(page_content) < 5:
        candidates.append(Intervention('cite_sources',
            predicted_lift=0.40,
            rationale=f'Only {count_external_citations(page_content)} external citations'))

    candidates.sort(key=lambda c: c.predicted_lift, reverse=True)
    return candidates[:2]
```

## The named-expert quotation source priority

For a CineCanon dossier, the quotation source priority:

1. **ASC magazine interviews** — highest authority for DPs
2. **Variety / Hollywood Reporter / IndieWire** profiles
3. **Podcast transcripts** — *Team Deakins*, *Cinematographer's Podcast*, *Hand Held Hollywood*
4. **fxguide deep dives**
5. **Manufacturer engineering blogs** — ARRI, RED, Panavision
6. **Vimeo Staff Picks / commentary tracks** — direct from creators

**Hard rule:** every quote must be a direct, attributed quotation with a cited public source. Paraphrased "the DP said something like..." is not a quotation and is forbidden.

## Forbidden interventions

Will refuse regardless of who asks:
- Keyword stuffing
- AI-generated statistics without sources
- Hallucinated quotes
- Fluency rewrites that *bury* the answer
- Any intervention that drops Citation Precision (precision is protected unconditionally)

## PR generation workflow

For each selected intervention:

1. **Read the current dossier** from the cinecanon-web repo
2. **Generate the change** using Claude Sonnet 4.6 with the intervention-specific template
3. **Pre-commit check:** verify the change doesn't drop predicted Citation Precision (LLM-judge cross-check against modified content)
4. **Open PR as draft** with rigorous template:

```markdown
## [AEO] {intervention_type}: {page_slug}

### What this PR does
Applies the **{intervention_type}** intervention to `{page_url}`.

### Why
{rationale}

### Predicted lift
- Impression Score: **+{int(predicted_lift*100)}%** (per {effect_size_source})
- Citation Precision: **+{int(precision_delta*100)}%** predicted

### Pre-intervention metrics (last 14 days)
- Citation Precision: {pre.precision_mean:.3f} ± {pre.precision_ci:.3f}  ⬅️ HERO METRIC
- Impression Score: {pre.impression_mean:.3f} ± {pre.impression_ci:.3f}
- Citation Recall: {pre.recall_mean:.3f}
- N: {pre.n}

### Measurement plan
Post-merge, enters accelerated sampling (N=10) for 14 days.
- **Booked** if new Precision CI lower bound > pre-mean AND new Precision floor ≥ 0.85
- **Reverted** if inconclusive after 28 days, OR if Precision regresses at any point

### Source citations added
{citation_list}

### Atomicity
This PR applies {intervention_count} intervention(s). At most 2 per PR
so post-merge attribution works.

🤖 Drafted by content-optimizer. Human review required before merge.
```

5. **Telegram alert** with PR link

## The 14/28-day outcome decision

Same as the universal protocol — but with the Precision floor rule:

- **Day 14:** Compare new precision mean (N=10 × 14 days = 140 samples) to pre-mean
  - Precision CI lower bound > pre-mean AND ≥ 0.85 → **booked**
  - CIs overlap → continue
  - Precision regressed at any sample → **revert immediately**
- **Day 28:** Still booked? Lock in. Still inconclusive? Revert.

Reverts feed `learnings/content-optimizer.md`. The reverted intervention's pattern (which page type, which intervention type) becomes signal for the synthesizer.

## Boundaries

- Doesn't write new dossiers — that's editorial work
- Doesn't touch schema — `entity-graph-curator`
- Doesn't modify structure beyond intervention scope
- Always opens PRs as drafts. Humans promote to ready-for-review.
