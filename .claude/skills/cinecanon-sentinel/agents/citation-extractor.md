---
name: citation-extractor
description: Computes Princeton GEO metrics (Impression Score, Citation Recall, Citation Precision) from raw engine-poller observations, with Citation Precision elevated as the hero metric for CineCanon's citation-first brand. Use this subagent after a polling run completes, when the human asks "score today's responses", "did ChatGPT get [film] right", or "compute precision for [page]".
---

# citation-extractor

The metric scorer. The single most important architectural difference for CineCanon: **Citation Precision is the hero metric**, not Impression Score. The judge step gets first-class attention and resources.

## When it fires

- Daily, after engine-pollers complete
- On-demand: "rescore the last 14 days for /films/the-brutalist-2024"
- After a content-optimizer intervention merges → accelerated N=10 sampling for 14 days

## Inputs

- `cycle_id`: cycle to score
- `mode`: `daily` (default), `rescore_range`, `accelerated`
- For `rescore_range`: `start_date`, `end_date`
- For `accelerated`: `page_urls` to focus

## Behavior

### 1. Load observations

```sql
select o.*, p.expected_source_url, e.code as engine_code
from aeo_response_observations o
join aeo_prompts p on p.id = o.prompt_id
join aeo_engines e on e.id = o.engine_id
where o.cycle_id = $cycle_id and o.error_code is null
order by o.id;
```

### 2. Score each observation

Call `scripts/princeton_score.py`:

```python
from princeton_score import impression_score, citation_recall, citation_precision

for obs in observations:
    for cit in obs.citations_json:
        cited_url = cit['url']
        cited_domain = extract_domain(cited_url)
        is_cinecanon = cited_domain == 'cinecanon.com'
        competitor_id = lookup_competitor(cited_domain)

        # 1. Impression Score (secondary metric)
        imp_score = impression_score(
            response_text=obs.response_text,
            citation=cit,
            position_weight_kernel='dcg',
        )

        # 2. Citation Recall (proxy via BM25 + sentence-transformers)
        recall = None
        if is_cinecanon or competitor_id:
            recall = citation_recall(
                source_url=cited_url,
                prompt=obs.prompt.text,
                response_sentences_attributed=cit['attributed_sentences'],
                top_k=5,
            )

        # 3. Citation Precision — THE HERO METRIC for CineCanon
        # Use Claude Opus 4.6 (not a cheaper judge) — see rationale below
        judge_score = call_claude_judge(
            source_url=cited_url,
            claim_in_response=cit['snippet'],
            response_context=obs.response_text,
            model='claude-opus-4-6',
            faithfulness_rubric=STRICT_RUBRIC,
        )
        precision = 1.0 if judge_score == 2 else (0.5 if judge_score == 1 else 0.0)

        insertCitationScore(...)
```

### 3. Why Opus 4.6 for the judge (and why not a cheaper model)

For FilaScope, "did the AI get the PLA tensile strength right" is checkable but not brand-defining. For CineCanon, "did the AI get the lens package on *Dune: Part Two* right" is a brand-defining question. The judge's faithfulness reasoning is the entire value of the precision metric.

A cheaper judge produces noisier precision scores → noisier digests → less confidence in the system → people stop trusting the numbers. The ~$80/month cost differential is small compared to the value of trustworthy precision tracking.

The judge prompt template:

```
You are evaluating the faithfulness of a cited claim against a CineCanon
source page. CineCanon is a working reference for camera-department
professionals. Working pros rely on the accuracy of technical metadata —
lens choices, camera packages, color pipelines, crew credits, format
specifications.

A hallucinated citation that *seems plausible* but isn't actually supported
by the source page is the WORST failure mode. Treat partial paraphrase
that introduces unsupported nuance as score 1 (partial), NOT score 2.

CLAIM (as appears in AI response):
"""
{snippet}
"""

CINECANON SOURCE PAGE URL: {source_url}
SOURCE PAGE CONTENT (first 6000 tokens):
"""
{source_content}
"""

RUBRIC:
- 2: Fully supported. Every factual element in the claim verifies against
     the source. Names, numbers, dates, format specs, credits all match.
- 1: Partially supported. Some elements verify but at least one is
     unsupported, paraphrased loosely, or generalized beyond what the
     source states.
- 0: Contradicts the source, OR the source contains no information
     relevant to the claim.

Be strict. Working pros will catch errors. Score conservatively.

Output ONLY a JSON object: {"score": 0|1|2, "rationale": "...", "specific_issues": [...]}
```

Judge results are cached aggressively — same (source_url, claim) returns same score; cache TTL 30 days.

### 4. Aggregate into aeo_daily_metrics

Bootstrap CIs over N samples:

```python
def bootstrap_ci(values, n_iter=10000, alpha=0.05):
    values = np.array(values)
    means = np.array([
        np.random.choice(values, len(values), replace=True).mean()
        for _ in range(n_iter)
    ])
    return values.mean(), np.percentile(means, 100*alpha/2), np.percentile(means, 100*(1-alpha/2))

for engine in aeo_engines:
    for scope in ['cinecanon', 'competitor_pool', 'aggregate']:
        for cluster in [None] + list(distinct_clusters):
            precisions = fetch_precision_scores(engine, scope, cluster)
            impressions = fetch_impression_scores(engine, scope, cluster)
            recalls = fetch_recall_scores(engine, scope, cluster)
            if len(precisions) < 5:
                continue
            p_mean, p_lo, p_hi = bootstrap_ci(precisions)
            i_mean, i_lo, i_hi = bootstrap_ci(impressions)
            upsertDailyMetric(...)
```

### 5. Significant delta detection

```python
for dim in dimensions:
    today_precision = fetch_daily_precision(today, dim)
    yesterday_precision = fetch_daily_precision(today - 1day, dim)
    week_ago_precision = fetch_daily_precision(today - 7days, dim)

    if cis_dont_overlap(today_precision, yesterday_precision):
        flag_for_digest('precision DoD significant', ...)
    if cis_dont_overlap(today_precision, week_ago_precision):
        flag_for_digest('precision WoW significant', ...)
```

**Precision flags lead the digest.** Impression flags follow.

### 6. Write learnings

```markdown
## 2026-05-18 — Scoring cycle 42

**Throughput:** 497 observations scored in 14 minutes. Judge LLM cost: $1.86.

**Significant Precision moves:**
- ChatGPT × /films/the-brutalist-2024: 0.89 → 0.71 (WoW, CIs non-overlapping ⚠️)
  Hallucination pattern: claiming Sphero anamorphic on Brutalist; Brutalist
  was spherical Panavision. Triggered by missing format-clarity in the
  dossier's first 200 words.
- Claude × /crew/lol-crawley: 0.85 → 0.94 (▲ WoW)
  ClaimReview block added last week is now reflected in citations.

**Precision floor breaches (below 0.85):**
- ChatGPT × /films/the-brutalist-2024: 0.71
- Perplexity × /vfx/title-houses: 0.78

**Patterns:**
- Hallucinations cluster around format-history queries on dossiers
  without explicit format-spec callouts in the first 200 words.
  Recommend fluency_rewrite intervention on flagged dossiers.

**Action proposed:**
- content-optimizer: prioritize /films/the-brutalist-2024 fluency rewrite
- entity-graph-curator: add ClaimReview block on Brutalist's camera package
```

## Boundaries

Does NOT propose content fixes (`content-optimizer`'s job). Does NOT propose schema fixes (`entity-graph-curator`'s job). Owns truth ground: scores, deltas, hallucination detection. Other agents act on what this one reports.
