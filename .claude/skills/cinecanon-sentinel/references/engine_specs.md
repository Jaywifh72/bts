# Engine Specifications — CineCanon

Per-engine specs for the 5 AI engines we poll. Right-sized for CineCanon's audience (working camera-department pros — predominantly English-speaking, mostly North America + UK + Europe).

## Why 5 engines (not 8)

The multi-site reference design polled 8 engines. For CineCanon's audience, we drop Grok and DeepSeek:

- **Grok:** X (Twitter) bias dominant; cinema-craft buyers don't research on X
- **DeepSeek:** Strong technical-paper coverage, weak cinema-trade authority; <1% relevance for our prompt clusters in the 2026 audit

If audience patterns shift (e.g., a cinema-trade publication starts producing on X), revisit and add back.

## Coverage matrix

| Engine | Polling method | N | Refresh window | Cost / 1k queries |
|---|---|---|---|---|
| ChatGPT (GPT-5.2 + browsing) | OpenAI API + retrieve tool | 5 | ~6 hours | $4.50 |
| Claude (Sonnet 4.6 + web search) | Anthropic API + web_search | 5 | ~4 hours | $3.20 |
| Perplexity Sonar | Perplexity API | 5 | ~1 hour | $0.50 |
| Gemini 2.5 + grounding | Google AI API | 5 | ~12 hours | $1.80 |
| Google AI Overviews | SerpAPI | 3 | ~24 hours | $1.50 |

Total at 100 prompts × 5 samples × 5 engines = ~12,500 queries/day → ~$225/month for engine API. The cost driver.

## ChatGPT (GPT-5.2 with browsing/SearchGPT)

**Endpoint.** `https://api.openai.com/v1/responses` with tool `{"type": "web_search"}`.

**Citation format.** Inline tokens mapped to `response.tool_use.sources`.

**Quirks for cinema queries:**
- Strong bias toward IMDb Pro and Wikipedia for film/crew lookups — expect ~40% of citations to be those two domains
- For VistaVision/format-history queries, ASC magazine citations are heavily favored — CineCanon-vs-ASC competition lives here
- Refresh window ~6 hours; minimum 2-hour gap between samples
- ChatGPT-User UA fetches the page in real-time when generating answers — making sure `/films/{slug}-{year}` pages SSR cleanly is critical (covered by `entity-graph-curator`)

## Claude (Sonnet 4.6 with web_search)

**Endpoint.** `https://api.anthropic.com/v1/messages` with web_search tool.

**Citation format.** Clean `` tags with indices.

**Quirks for cinema queries:**
- Most conservative citer — lower mention count, higher Citation Precision
- Strongest preference for clean technical content with citations; CineCanon's confidence-graded format performs unusually well here
- Web search invoked ~75% of the time on cinema prompts; force with `web_search.required=true`

## Perplexity Sonar

**Endpoint.** `https://api.perplexity.ai/chat/completions`, models `sonar` or `sonar-pro`.

**Citation format.** Top-level `citations` array.

**Quirks for cinema queries:**
- Cites the most aggressively (6-8 citations per response)
- Strongly favors freshness — recently-updated dossiers get a measurable lift
- Refresh window shortest (~1 hour); samples spaced 20 minutes safe
- Heavily uses fxguide for VFX queries — CineCanon competes there

## Gemini 2.5 (with Google Search grounding)

**Endpoint.** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent` with `tools=[{"google_search":{}}]`.

**Citation format.** `groundingMetadata.groundingChunks` with `groundingSupports` for per-segment attribution.

**Quirks for cinema queries:**
- Cites verbosely (~12 sources) but only ~4 substantively contribute. Filter to `groundingSupports.score > 0.7`.
- Tightest coupling to Google organic top-10 — classic SEO position predicts citation more strongly here than elsewhere
- Refresh aligns with Google's index, typically 12-24 hours

## Google AI Overviews (via SerpAPI)

**Endpoint.** SerpAPI `engine=google&google_domain=google.com&ai_overview=true`.

**N=3** (lower than other engines) to keep SerpAPI cost manageable.

**Citation format.** AI Overview card at top of SERP with inline citations linked to organic results.

**Quirks for cinema queries:**
- Available on ~20-30% of CineCanon-relevant queries (the eligibility rate is itself a metric we track)
- 38% citation overlap with the organic top-10 (per the BrightEdge 2026 analysis); classic SEO and AEO are most tightly coupled here
- US (`google.com`) vs UK (`google.co.uk`) coverage differs measurably — track both if audience splits there

## When to add an engine

Criterion: measurable buyer reach in cinema-craft category > 5%. The `learnings-synthesizer` flags candidates monthly. Apple Intelligence and Microsoft Copilot are on the watchlist; neither crosses the threshold yet for working-camera-dept buyers.

When one does, the `engine-poller` config is updated, a column added to `engine_scores`, and one cycle runs in dry-run mode before promotion.

## When to drop an engine

If two engines show >0.9 metric correlation over 90 days, fuse them in reporting. The monthly architectural review catches these. Current correlation matrix: no fusable pairs.

## Rate limit handling

Every engine poller wraps API calls with:
- Exponential backoff (1s, 2s, 4s, 8s, 16s)
- Max 3 retries
- Circuit breaker: 5 consecutive failures → skip the engine for the day and flag

Per-engine concurrency cap: 5 parallel requests. System-wide cap from Hermes: 25 concurrent.
