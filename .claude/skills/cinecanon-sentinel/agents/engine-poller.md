---
name: engine-poller
description: Polls a single AI engine with N=5 samples per prompt to build a sampling distribution. Use when the aeo-chief or human invokes "poll aeo_engines", "sample ChatGPT", or "run today's measurements" against the CineCanon prompt bank.
---

# engine-poller

Owns one engine at a time. Invoked in parallel — one instance per engine — from the daily cycle. 5 aeo_engines: chatgpt, claude, perplexity, gemini, ai_overview.

## Inputs

- `engine`: one of `chatgpt`, `claude`, `perplexity`, `gemini`, `ai_overview`
- `cycle_id`: current cycle UUID
- `prompt_subset` (optional): filter, e.g. `cluster=specific_film`
- `n_override` (optional): override default sample count

## Behavior

### 1. Load context
- Read `references/engine_specs.md` for the assigned engine
- Read `learnings/engine-poller.md` from the last 7 days
- Query Supabase for active aeo_prompts: `select * from aeo_prompts where deprecated_on is null and language = 'en'`

### 2. Apply prior

Apply learnings tagged with `engine_quirk` from past 7 days. Examples observed in practice:

- "ChatGPT browsing fails between 02:00-03:00 ET — vendor maintenance window" → skip those hours
- "Perplexity Sonar returns French results when accept-language missing" → always set `accept-language: en-US,en`
- "Gemini cost spikes when safetySettings omitted" → always include minimal safety config

### 3. Sample

```python
for prompt in active_prompts:
    for i in range(1, N + 1):
        wait_for_engine_spacing(engine, prompt, i)
        try:
            response = call_engine_api(engine, prompt.text)
        except RateLimit as e:
            backoff_and_retry(e)
        except Timeout:
            log_observation(error_code='timeout')
            continue
        except CircuitBreakerOpen:
            telegram_alert(f"{engine} circuit breaker open, skipping")
            return

        insertResponseObservation(
            cycle_id=cycle_id,
            prompt_id=prompt.id,
            engine_id=engine.id,
            sample_index=i,
            raw_response_json=response.raw,
            response_text=response.text,
            citations_json=extract_citation_array(response),
            total_words_in_response=count_words(response.text),
            ai_overview_present=(engine == 'ai_overview' and response.had_overview),
            raw_response_token_cost=response.token_cost,
            vendor_request_id=response.request_id,
        )
```

### 4. Critical rules

- **Never deduplicate samples.** Identical responses are still data points; the distribution matters.
- **Never silently skip a prompt.** Log all errors with `error_code`.
- **Cap concurrency at 5 per engine.**
- **Respect each engine's refresh window** (`references/engine_specs.md`).

### 5. Output

No digest — write to `aeo_response_observations` and append to `learnings/engine-poller.md`:

```markdown
## 2026-05-18 — chatgpt cycle 42

**Run summary:** 100 aeo_prompts × 5 samples = 500 observations attempted.
- Successful: 497
- Errors: 3 (1 timeout on /films/the-substance-2024 prompt, 2 rate-limited at 06:42 ET)
- Total cost: $2.25
- p50 latency: 8.4s; p95: 19.1s

**Patterns:**
- Specific-film aeo_prompts about 2024 films timeout more than older films — context-window thrashing on heavy current-news context?
- 06:42 ET rate limit was 30 sec — likely RPM cap during parallel burst.

**Action proposed:**
- Tighten per-engine concurrency 5 → 4 for ChatGPT
- Stagger 2024-film aeo_prompts across a 10-minute window
```

### 6. Failure modes

| Symptom | Action |
|---|---|
| 401/403 from API | Stop, post `🔴 ENGINE AUTH FAILED: <engine>`, do not retry |
| 429 with Retry-After | Honor header, continue |
| 429 without header | Exponential backoff: 30s, 60s, 120s, 240s, then circuit-break |
| 5xx | Up to 3 retries |
| Empty response (200, no text) | Log as `error_code='empty_response'`, count toward N |
| Citation extraction failure | Log `error_code='citation_parse_error'`, attach raw response |

### 7. Cost management

```python
predicted_cost = remaining_prompts * N * engine.cost_per_query
if predicted_cost > 1.5 * engine.cost_30day_avg:
    telegram_alert(f"{engine} predicted cost ${predicted_cost:.2f} exceeds 1.5x avg. Pause?")
    wait_for_human_confirmation()
```

### 8. Separation of concerns

This agent does NOT compute Princeton metrics — `citation-extractor`'s job. Only output: raw observations preserved for re-scoring with future metric refinements.
