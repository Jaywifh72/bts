# GEO Interventions Catalog

The intervention catalog. The `content-optimizer` agent reads this file before generating any PR. An intervention that isn't in this catalog with a cited effect size will not be applied.

## The four "APPLY" interventions

### 1. Statistics Addition (+41% Impression Score)

**What it is.** Inserting verifiable numerical claims into the page body.

**Where to insert.** First 2 paragraphs of every content page. Statistics in the H2 section "Key Specifications" do not count — they're already structured data. The lift comes from inline-prose statistics that AI engines pull as quotable claims.

**Quality bar.**
- Must be specific. "Higher density" is not a statistic. "1.24 g/cm³ at 23°C" is.
- Must be verifiable. The source either appears in our `references` block on the same page, or is a primary source we link to. No statistics from secondary aggregators.
- Must be relevant. A statistic about IMDb Pro's metadata depth has no place on a Lol Crawley DP page.

**CineCanon examples.**
- "Lol Crawley shot *The Brutalist* in VistaVision 8-perf 35mm, the format's most prominent revival since the 1990s, with custom Panavision Sphero spherical lenses."
- "*Dune: Part Two* (2024) was photographed on the ARRI ALEXA 65 in ARRIRAW 4.5K LF Open Gate, with a Panavision Sphero and H series anamorphic lens package — Greig Fraser ASC ACS's third feature shot in that configuration."
- "The Brutalist's photochemical finish was completed at FotoKem with a final 4K DI, one of fewer than 8 theatrical features in 2024 to deliver a photochemically-finished theatrical print run."

**Failure modes.**
- Made-up numbers (the LLM-judge in `citation-extractor` flags hallucinations; the content-optimizer is paranoid about this and requires citations for every number).
- Statistics that contradict our own structured data (rare but devastating — schema-doctor cross-checks).

### 2. Cite Sources (+40% baseline, +115% for pages ranking 5+)

**What it is.** Adding 2-4 external citations to authoritative sources within the page body.

**Why the asymmetric lift.** Pages already ranking 1-4 in classic SERP get cited largely on the strength of that ranking signal. Pages ranking 5+ are competing on content quality alone, and citations are the strongest content-quality signal AI engines have. For FilaScope, this is the highest-leverage intervention — most of our long-tail filament pages rank 5-15.

**Where to cite.**
- Material properties → manufacturer datasheets (Polymaker, eSun, Bambu Lab, ColorFabb — direct PDF/HTML links)
- Print settings → primary sources (Bambu Studio docs, PrusaSlicer wiki, OrcaSlicer GitHub)
- Material science → ASTM/ISO standards, peer-reviewed papers (we use Google Scholar to find DOIs)
- Industry data → reputable trade press (3DPrint.com, All3DP, Hackaday — never aggregator listicles)

**Forbidden citations.**
- Pinterest, Reddit (raw, without attribution to a named expert), YouTube comments
- Our own pages (self-citation doesn't lift visibility)
- Any source we've already cited 3+ times on the page (diminishing returns observed in Princeton's data)

**FilaScope template.**

```markdown
### Mechanical Properties

PETG-CF exhibits a tensile strength of 65 MPa,[^1] which positions it
between standard PETG (50 MPa)[^2] and PA-CF composites (95 MPa).[^3] The
addition of 15-20% short carbon fiber improves stiffness but reduces
elongation at break to approximately 4%.[^1]

[^1]: Polymaker PolyMide CoPA-CF Technical Data Sheet, January 2025.
[^2]: ColorFabb PETG Economy datasheet.
[^3]: Bambu Lab PA-CF specifications page.
```

### 3. Quotation Addition (+28% Impression Score)

**What it is.** Inserting direct quotations from named experts.

**Why.** Quotations from named individuals are heavily favored by ChatGPT and Claude because they're a strong signal of editorial care. Perplexity weighs them less (it prefers raw citations), so we always pair quotations with citations.

**Quality bar.**
- Named individual, ideally with a verifiable credential (X title at Y org)
- Quote is substantive — not a marketing platitude
- Cited to a public source (interview, paper, conference talk, podcast transcript)

**Where to find quotes.**
- 3D printing industry interviews (Hackaday's podcast, 3D Printing Industry interviews, Tom Sanladerer's YouTube channel transcripts)
- Manufacturer engineering blogs (Prusa Research blog, Bambu Lab engineering posts)
- Academic papers on FDM/SLA materials (DOI required)

**FilaScope template.**

```markdown
> "PETG with carbon fiber reinforcement bridges the gap between consumer
> filaments and engineering-grade composites. The key is fiber length
> distribution — most consumer CF blends use fibers below 200 µm, which
> limits load transfer."
> — Dr. Joshua Pearce, Western University, *Open-Source Engineering*, 2024.[^4]

[^4]: Pearce, J. *Open-Source Engineering*. 2024, p.142.
```

### 4. Fluency / clarity rewrite (neutral on Impression Score, +14% Citation Recall)

**What it is.** Rewriting buried answers into "answer-first" format.

**Why it's listed despite neutral Impression lift.** Aggarwal et al. measured only Impression Score. Foundation Marketing's 2026 analysis (n=12k queries) showed that pages with answer-first format gain +14% Citation Recall — i.e., they get more of their content surfaced when they are cited. Recall is the metric most directly fixable by writing.

**The format.**

```markdown
## What is the heat deflection temperature of PLA?

PLA has a heat deflection temperature of approximately 55°C at 0.45 MPa
load (ASTM D648). [direct answer in first 25 words]

Standard PLA softens above ~60°C, which limits its use in applications
exposed to heat. PLA Pro and PLA-CF variants raise this to 65-75°C
through annealing or fiber reinforcement. [expansion]

The mechanism: PLA's glass transition temperature (Tg) is 60-65°C... [depth]
```

**Triggers for this intervention.**
- Citation Recall < 0.6 on a page that has >0 citations (the content is there, the engine isn't surfacing the right part)
- "Burial" detected: the answer to the page's H1 question appears after the 200th word

## The forbidden interventions

These will be rejected by the content-optimizer even if the human asks:

### Keyword Stuffing (-10% on Perplexity)

The Princeton data is unambiguous: keyword density above natural prose levels is actively penalized. The content-optimizer measures keyword density before and after every change; any PR that raises density of any target keyword above its pre-existing baseline is auto-rejected.

### "Unique Words" / synonym jamming (-4%)

Replacing common terms with rare synonyms to seem distinctive. Hurts both Impression Score and human readability.

### Authoritative voice without substance (+5%, not worth the engineering cost)

Phrases like "as industry leaders have established" without an actual citation. Small lift, brittle, and conflicts with the Cite Sources intervention.

## Intervention selection logic

When the content-optimizer fires on a page, it picks interventions in this order:

1. If `Citation Recall < 0.5` → Fluency rewrite first (the answer isn't being surfaced)
2. If `Impression Score < 0.3` AND page has fewer than 2 external citations → Cite Sources
3. If page lacks inline statistics in first 200 words → Statistics Addition
4. If page has no named-expert quotations → Quotation Addition
5. Never apply more than 2 interventions in a single PR (atomicity of measurement — we need to attribute lift)

## Measurement after intervention

After a PR merges, the citation-extractor flags the affected pages for **accelerated sampling**: N=10 instead of N=5 for the next 14 days. This tightens CIs faster so we can either book the lift or roll back.

The decision rule:
- Day 14: if the new mean's 95% CI lower bound is above the pre-intervention mean → **booked**
- Day 14: if the CIs overlap → **inconclusive**, extend monitoring 14 more days
- Day 28: if still inconclusive → revert the intervention. We do not carry inconclusive bets.

This is the discipline that makes the system better over time. Most teams ship "improvements" and never measure them. We do, and we revert the ones that don't pay.

## 2026 supplementary interventions (provisional)

These are not in the Princeton paper but have published 2026 effect sizes. Treat as experimental — the optimizer applies them only when explicitly invoked, never automatically.

### Long-form rewrite (10.18 vs 2.39 citation ratio at >20K chars)

Adding substantial depth to a page (target >5000 words for cornerstone pages, >2000 for product pages). Source: Growth Memo 2026.

**Caveat.** This contradicts the answer-first format if done lazily. Done well: answer-first in the first 200 words, then deep expansion below.

### llms.txt addition (impact: unconfirmed)

Per Kevin Indig's 2026 analysis: low cost, no proven impact. We add it for FilaScope because the cost is minimal and the implicit "we welcome AI crawlers" signal is positive, but we don't claim measurable lift from it.

### Schema entity linkage via @id + sameAs (+38% extraction accuracy)

This is `entity-builder`'s domain, not content-optimizer's. See `agents/entity-builder.md`.

## Source citations for this catalog

- Aggarwal et al., *GEO: Generative Engine Optimization*, ACM KDD 2024. arXiv:2311.09735.
- Sielinski, R., *Quantifying Uncertainty in AI Visibility*. arXiv:2603.08924.
- Foundation Marketing, *ChatGPT Citation Pattern Analysis*, March 2026.
- Growth Memo, *Long-Form Content and AI Citations*, March 2026.
- ConvertMate, *GEO Benchmark Study 2026: What Actually Drives Visibility*, March 2026.
- LoudFace, *AEO 2026: Audit of 400+ AI Answers Across B2B SaaS*, April 2026.
- Ahrefs, *75K-Domain Brand Mention vs Backlink Correlation Study*, 2025.
