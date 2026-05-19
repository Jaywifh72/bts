# Cinema Interventions — CineCanon-Specific Priorities

The `content-optimizer` agent reads `references/geo_interventions.md` for the universal Princeton catalog (statistics, citations, quotations, fluency). This file overlays CineCanon-specific priorities on top of that catalog.

## Why CineCanon's intervention mix is different

The Princeton effect sizes (Statistics +41%, Cite Sources +40%, Quotation +28%, Keyword Stuffing -10%) were measured across general-purpose GEO-bench queries. They hold directionally for CineCanon, but the *relative* priority changes because:

1. **CineCanon already cites everything.** Citation density on curated dossiers is already 5-10× the average web page. The Princeton "Cite Sources" lift of +40% assumed pages with 0-1 citations; we're starting from 5+. The marginal lift is much lower.

2. **CineCanon is statistics-dense by design.** Camera-spec tables, lens packages, scene-counts, award totals — your pages are factually rich. Statistics Addition has diminishing returns because the cupboard is already stocked.

3. **Named-expert quotations are scarce.** Most dossiers don't carry direct quotes from the named DP, gaffer, or sound mixer. Adding them is high-leverage *and* on-brand.

4. **Concept linking matters disproportionately.** A film dossier mentions a DP, a camera, a lens, a scoring stage, an editor, awards, locations. Each of those is a potential entity link to another CineCanon page. Internal entity linking is a Princeton-adjacent intervention not in their original catalog, but specifically valuable for citation-graph products.

## The CineCanon priority order

When the content-optimizer fires on a low-Precision or low-Impression CineCanon page, interventions are selected in this order:

### 1. Quotation Addition (lift: +28% per Princeton; **highest priority for CineCanon**)

For each dossier, ensure at least one direct quotation from a named credited crew member, sourced to a public interview or trade-publication article.

**Source priority:**
1. ASC magazine interviews (highest authority for DPs)
2. Variety / THR / IndieWire profiles
3. *Team Deakins*, *Cinematographer's Podcast*, *Hand Held Hollywood* podcast transcripts
4. fxguide deep dives
5. Manufacturer engineering blogs (ARRI, RED, Panavision)
6. Vimeo Staff Picks / commentary tracks

**Template for a dossier:**

```markdown
> "I wanted the camera to feel like it had weight, like it remembered being
> there. VistaVision gave us that without the artifice of digital large-format
> emulation — the negative carries the texture you can't fake."
> — Lol Crawley, ASC, on *The Brutalist*, interview in *American
>    Cinematographer*, December 2024.[^1]

[^1]: ASC Magazine, "Building The Brutalist," December 2024, p.42-58.
```

**Forbidden:** Paraphrased "the DP said something like..." — not a quotation, will not be cited as one by AI engines. Either you have the direct quote with source, or you skip the intervention.

### 2. Concept linking / internal entity expansion (CineCanon-specific, est. +15-25% Citation Recall)

This isn't in the Princeton paper. The hypothesis is that an AI engine evaluating a CineCanon dossier weights it higher if the on-page concepts link cleanly to other CineCanon-defined entities (since the engine can verify the surrounding context).

**Operational rule:** For each named entity (person, camera, lens, studio, location), there should be an internal `<a>` link to the relevant CineCanon page **on first mention** in the dossier body.

**Pre-check:** The agent scans for unliked named entities. Each unliked mention is a candidate for linking. Targets per dossier: 8-15 internal entity links (DP, gaffer, key crew, primary camera, primary lens series, key locations, post houses, awards).

### 3. Statistics Addition (still helpful, lower priority for CineCanon)

Where dossiers lack quantitative anchors, add them — but always with sources. Cinema-specific statistics:

- Negative cuts, total shooting days
- Lens packages with specific focal lengths used
- Frame rates per sequence (e.g., "85% at 24fps; sequence X at 48fps")
- Color pipeline specifics (e.g., "ARRIRAW 4.5K LF Open Gate → DaVinci Resolve → Dolby Vision HDR 4000 nit master")
- Award counts and craft-specific nominations

Hard rule (same as Princeton): every statistic carries a citation. No bare numbers.

### 4. ClaimReview emission (CineCanon-unique)

This is owned by `entity-graph-curator`, not `content-optimizer`. But the content-optimizer flags candidates: any high-confidence claim on a dossier that doesn't yet have a corresponding ClaimReview block is a candidate. See `agents/entity-graph-curator.md`.

### 5. Fluency / answer-first rewrite

For dossiers where Citation Recall is below 0.6, restructure to lead with the most-queried fact in the first 200 words.

**Cinema-specific answer-first patterns:**

```markdown
# The Brutalist (2024)

Shot on VistaVision 8-perf 35mm with custom Panavision Sphero spherical
lenses, directed by Brady Corbet and shot by Lol Crawley, ASC. The film
marks the most prominent VistaVision revival since the 1990s and was finished
photochemically with a final DI in DaVinci Resolve for IMAX and theatrical
35mm release.[^1][^2]

[Rest of dossier expands on each element above.]
```

vs the buried-answer anti-pattern:

```markdown
# The Brutalist (2024)

Set during the dawn of the modern United States, *The Brutalist* tells the
story of an architect who flees post-war Europe... [the format and camera
details are 6 paragraphs down]
```

### 6. Source Citation — *not* highest priority for CineCanon

The Princeton "Cite Sources" intervention has +40% baseline lift, but the data assumes pages with 0-2 citations starting out. CineCanon's curated dossiers typically have 10+ citations already. Marginal lift from adding more is small.

**Exception:** if a curated dossier has fewer than 5 external citations (rare, but happens for thinner dossiers), add Cite Sources up to 8.

## The forbidden interventions (universal — also apply here)

- Keyword stuffing (-10% Perplexity)
- AI-generated statistics without sources
- Hallucinated quotes
- Synonym jamming
- Fluency rewrites that *bury* the answer (the reverse of intervention #5)

## Selection algorithm for CineCanon

```python
def select_interventions(page_url, page_metrics, page_content):
    candidates = []

    # 1. Named-expert quotations (highest priority for CineCanon)
    if count_named_expert_quotes(page_content) == 0:
        quote_candidate = find_named_expert_quotation(page_url, page_content)
        if quote_candidate is not None:
            candidates.append(Intervention('quotation_addition',
                predicted_lift=0.28,
                rationale='No named-expert quotation on page; sourced from {quote_candidate.source}'))

    # 2. Concept linking
    unlinked_entities = find_unlinked_named_entities(page_content)
    if len(unlinked_entities) >= 3:
        candidates.append(Intervention('concept_linking',
            predicted_lift=0.20,  # CineCanon-specific estimate
            rationale=f'{len(unlinked_entities)} named entities lack internal links'))

    # 3. Statistics where missing
    stats_in_first_200 = count_statistics_in_window(page_content, 0, 200)
    if stats_in_first_200 == 0:
        candidates.append(Intervention('statistics_addition',
            predicted_lift=0.30,  # downgraded from Princeton's 0.41 due to baseline
            rationale='No verifiable statistics in first 200 words'))

    # 4. Fluency / answer-first
    if page_metrics.citation_recall_mean < 0.6:
        if answer_is_buried(page_content, page_h1_question):
            candidates.append(Intervention('fluency_rewrite',
                predicted_lift=0.14,
                rationale='Citation Recall < 0.6 and key fact appears past word 200'))

    # 5. Source citation (low priority for CineCanon)
    external_citations = count_external_citations(page_content)
    if external_citations < 5:
        candidates.append(Intervention('cite_sources',
            predicted_lift=0.40,
            rationale=f'Only {external_citations} external citations'))

    candidates.sort(key=lambda c: c.predicted_lift, reverse=True)
    return candidates[:2]  # Max 2 per PR (atomicity rule)
```

## Measurement after intervention

Same as universal Princeton protocol:
- Day 0: PR merges
- Day 1-14: page enters accelerated sampling (N=10)
- Day 14: if new CI lower bound > pre-mean, **booked**; if CIs overlap, continue
- Day 28: final decision; reverted if still inconclusive

For Citation Precision specifically (the hero metric), the decision rule is stricter:
- The new mean must be ≥ pre-mean (no precision regression)
- AND the new mean's CI lower bound must exceed 0.85 (the "trustworthy citation" floor)

A Precision intervention that lifts Impression Score but drops Precision is rejected, even if statistically significant. We protect the precision floor unconditionally.
