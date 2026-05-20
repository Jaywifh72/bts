// Daily AEO observatory cycle — runs in GitHub Actions against Neon prod.
//
// Deterministic (no LLM orchestration loop) so cost + runtime are predictable.
// Per cycle:
//   • 30 prompts × N=3 engines × 3 samples = up to 270 engine calls
//   • Skips an engine when its API key is absent
//   • Writes: aeo_cycles, aeo_response_observations, aeo_citation_scores,
//             aeo_daily_metrics
//   • Produces a markdown digest at ./output/aeo-digest-YYYY-MM-DD.md
//
// Citation extraction is best-effort URL regex from response text. Judge-LLM
// scoring (the full Princeton metric) is OUT of scope for v1 — Claude as the
// judge would 4× the cost and add 100s of calls per cycle. Citation Precision
// rows are populated with NULL judge_score; a later workflow can backfill.
//
// Env:
//   DATABASE_URL          — required (Neon pooler URL in prod)
//   OPENAI_API_KEY        — optional; absence skips chatgpt
//   ANTHROPIC_API_KEY     — optional; absence skips claude
//   GOOGLE_AI_API_KEY     — optional; absence skips gemini
//   AEO_SAMPLES_PER_PROMPT (default 3)
//   DRY_RUN=1             — count what would run, no API calls or writes

import 'dotenv/config';
import { db, sql } from '../src/index.ts';

const SAMPLES = clampInt(process.env.AEO_SAMPLES_PER_PROMPT, 1, 10, 3);
const DRY_RUN = process.env.DRY_RUN === '1';
const TODAY = new Date().toISOString().slice(0, 10);

type EngineCode = 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'ai_overview';

const ENGINES: Array<{ code: EngineCode; envKey: string; key: string | undefined }> = [
  { code: 'chatgpt',     envKey: 'OPENAI_API_KEY',    key: process.env.OPENAI_API_KEY },
  { code: 'claude',      envKey: 'ANTHROPIC_API_KEY', key: process.env.ANTHROPIC_API_KEY },
  { code: 'gemini',      envKey: 'GOOGLE_AI_API_KEY', key: process.env.GOOGLE_AI_API_KEY },
  // 'ai_overview' is the aeo_engines row we use for Firecrawl-via-Google
  // search results. Firecrawl /v1/search returns the top organic SERP
  // results — a reasonable proxy for "what Google's index surfaces" since
  // SerpAPI's actual AI Overview panel is paid-only.
  { code: 'ai_overview', envKey: 'FIRECRAWL_API_KEY', key: process.env.FIRECRAWL_API_KEY },
];

const activeEngines = ENGINES.filter((e) => e.key);
console.log(`[i] active engines: ${activeEngines.map((e) => e.code).join(', ') || '(none)'} `
  + `| samples per (prompt × engine): ${SAMPLES}`);
if (activeEngines.length === 0) {
  console.error('[!] no engine keys present — set at least OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_AI_API_KEY');
  process.exit(1);
}

// 1. Load prompts and engine ids
const prompts = await db.execute<{ id: string; prompt_text: string; topical_cluster: string }>(sql`
  SELECT id::text, prompt_text, topical_cluster
  FROM aeo_prompts
  WHERE deprecated_on IS NULL
  ORDER BY created_at
`);
console.log(`[i] active prompts: ${prompts.length}`);

const engineRows = await db.execute<{ id: string; code: string }>(sql`
  SELECT id::text, code FROM aeo_engines WHERE active = true
`);
const engineIdByCode = new Map(engineRows.map((r) => [r.code, r.id]));

const totalCalls = prompts.length * activeEngines.length * SAMPLES;
console.log(`[i] planned calls: ${totalCalls} (${prompts.length} prompts × ${activeEngines.length} engines × ${SAMPLES} samples)`);

if (DRY_RUN) {
  console.log('[dry-run] not making API calls or writing rows');
  process.exit(0);
}

// 2. Open a cycle row
const cycleRows = await db.execute<{ id: string }>(sql`
  INSERT INTO aeo_cycles (ran_on, focus_tag, intent_statement, status)
  VALUES (
    ${TODAY}::date,
    'gha-bootstrap',
    'Automated daily cycle via .github/workflows/aeo-cycle.yml — deterministic polling, no judge LLM.',
    'running'
  )
  RETURNING id::text
`);
const cycleId = cycleRows[0]!.id;
const startedAt = Date.now();
console.log(`[+] cycle ${cycleId} started`);

// 3. Poll every (prompt × engine × sample). Best-effort; engine errors are logged
//    to aeo_response_observations.error_code and don't abort the cycle.
let observationsWritten = 0;
let citationsWritten = 0;
let totalCostCents = 0;
const failures: Array<{ engine: string; prompt: string; err: string }> = [];

// Per-engine outcome counters — enables per-engine failure tolerance
// (cycle is 'failed' only if every engine fails, 'partial' otherwise).
const perEngine: Record<string, { ok: number; fail: number }> = {};
for (const e of activeEngines) perEngine[e.code] = { ok: 0, fail: 0 };

// Per-engine throttle. Gemini free tier is ~10 req/min on grounding; we space
// to 6s between Gemini calls. Other engines have much higher limits.
const MIN_DELAY_MS: Record<string, number> = {
  gemini: 6000,
  chatgpt: 100,
  claude: 100,
  ai_overview: 500, // Firecrawl free tier ~5 req/s
};
const lastCallAt: Record<string, number> = {};

// Retry with exponential backoff on 429.
async function withRetry<T>(engineCode: string, fn: () => Promise<T>, maxRetries = 4): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Throttle before the call.
      const minDelay = MIN_DELAY_MS[engineCode] ?? 0;
      const since = Date.now() - (lastCallAt[engineCode] ?? 0);
      if (since < minDelay) await sleep(minDelay - since);
      lastCallAt[engineCode] = Date.now();
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = /\b429\b/.test(msg) || /rate.?limit|quota/i.test(msg);
      if (!is429 || attempt === maxRetries) throw err;
      const backoff = Math.min(30000, 2000 * Math.pow(2, attempt));
      console.warn(`[retry] ${engineCode} got 429 — sleeping ${backoff}ms (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

for (const prompt of prompts) {
  for (const engine of activeEngines) {
    const engineId = engineIdByCode.get(engine.code);
    if (!engineId) {
      console.warn(`[skip] no aeo_engines row for ${engine.code}`);
      continue;
    }
    for (let sampleIndex = 1; sampleIndex <= SAMPLES; sampleIndex++) {
      const t0 = Date.now();
      try {
        const { responseText, citations, raw, tokenCostCents } = await withRetry(
          engine.code,
          () => pollEngine(engine.code, engine.key!, prompt.prompt_text),
        );
        perEngine[engine.code]!.ok++;
        totalCostCents += tokenCostCents;
        const obs = await db.execute<{ id: string }>(sql`
          INSERT INTO aeo_response_observations (
            cycle_id, prompt_id, engine_id, sample_index,
            response_text, raw_response_json, citations_json,
            total_words_in_response, raw_response_token_cost_cents, latency_ms
          )
          VALUES (
            ${cycleId}::uuid, ${prompt.id}::uuid, ${engineId}::uuid, ${sampleIndex},
            ${responseText},
            ${JSON.stringify(raw)}::jsonb,
            ${JSON.stringify(citations)}::jsonb,
            ${responseText.split(/\s+/).length},
            ${tokenCostCents},
            ${Date.now() - t0}
          )
          RETURNING id::text
        `);
        observationsWritten++;
        const obsId = obs[0]!.id;
        for (let i = 0; i < citations.length; i++) {
          const url = citations[i]!;
          let domain = '';
          try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch { continue; }
          const isCinecanon = domain === 'cinecanon.com';
          await db.execute(sql`
            INSERT INTO aeo_citation_scores (
              observation_id, cited_url, cited_domain, is_cinecanon, position_in_response
            )
            VALUES (
              ${obsId}::uuid, ${url}, ${domain}, ${isCinecanon}, ${i + 1}
            )
          `);
          citationsWritten++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        perEngine[engine.code]!.fail++;
        failures.push({ engine: engine.code, prompt: prompt.prompt_text.slice(0, 50), err: msg });
        await db.execute(sql`
          INSERT INTO aeo_response_observations (
            cycle_id, prompt_id, engine_id, sample_index, error_code, latency_ms
          )
          VALUES (
            ${cycleId}::uuid, ${prompt.id}::uuid, ${engineId}::uuid, ${sampleIndex},
            ${msg.slice(0, 200)},
            ${Date.now() - t0}
          )
        `);
      }
      if (observationsWritten % 20 === 0) {
        console.log(`[+] progress: ${observationsWritten}/${totalCalls} (${citationsWritten} citations) — $${(totalCostCents / 100).toFixed(2)} so far`);
      }
    }
  }
}

console.log(`[+] polling done — ${observationsWritten} obs, ${citationsWritten} citations, ${failures.length} failures, $${(totalCostCents / 100).toFixed(2)}`);

// 4. Aggregate daily metrics — share-of-answer per page × engine, scoped CineCanon
await db.execute(sql`
  INSERT INTO aeo_daily_metrics (
    metric_date, engine_id, scope, page_url, share_of_answer, n_observations
  )
  SELECT
    ${TODAY}::date,
    o.engine_id,
    'cinecanon',
    s.cited_url AS page_url,
    (COUNT(*) FILTER (WHERE s.is_cinecanon)::numeric) / NULLIF(COUNT(*)::numeric, 0) AS share_of_answer,
    COUNT(*) AS n_observations
  FROM aeo_response_observations o
  JOIN aeo_citation_scores s ON s.observation_id = o.id
  WHERE o.cycle_id = ${cycleId}::uuid
    AND s.is_cinecanon = true
  GROUP BY o.engine_id, s.cited_url
  ON CONFLICT DO NOTHING
`);
const metricCount = await db.execute<{ n: number }>(sql`
  SELECT COUNT(*)::int AS n FROM aeo_daily_metrics WHERE metric_date = ${TODAY}::date
`);
console.log(`[+] aeo_daily_metrics rows for ${TODAY}: ${metricCount[0]!.n}`);

// 4b. Competitive landscape — top cited domains this cycle. Key operational signal:
//     when our share-of-answer is 0, this is exactly who's winning the citations.
const topDomains = await db.execute<{ cited_domain: string; hits: number; is_cinecanon: boolean }>(sql`
  SELECT
    s.cited_domain,
    COUNT(*)::int AS hits,
    bool_or(s.is_cinecanon) AS is_cinecanon
  FROM aeo_response_observations o
  JOIN aeo_citation_scores s ON s.observation_id = o.id
  WHERE o.cycle_id = ${cycleId}::uuid
  GROUP BY s.cited_domain
  ORDER BY hits DESC
  LIMIT 15
`);
const cinecanonShare = await db.execute<{ n: number; total: number }>(sql`
  SELECT
    COUNT(*) FILTER (WHERE s.is_cinecanon)::int AS n,
    COUNT(*)::int AS total
  FROM aeo_response_observations o
  JOIN aeo_citation_scores s ON s.observation_id = o.id
  WHERE o.cycle_id = ${cycleId}::uuid
`);
const share = cinecanonShare[0]!;
const sharePct = share.total > 0 ? (share.n / share.total * 100).toFixed(1) : '0.0';
console.log(`[+] cinecanon share-of-answer this cycle: ${share.n}/${share.total} (${sharePct}%)`);

// 5. Finalize cycle. Per-engine failure tolerance: 'failed' only if every
// engine produced zero observations. 'partial' if some engine succeeded
// but at least one had any failures. 'succeeded' only if zero failures.
const enginesDead = Object.values(perEngine).filter((e) => e.ok === 0).length;
const finalStatus = enginesDead === Object.keys(perEngine).length
  ? 'failed'
  : failures.length === 0
    ? 'succeeded'
    : 'partial';
await db.execute(sql`
  UPDATE aeo_cycles
  SET status = ${finalStatus},
      finished_at = NOW(),
      total_cost_cents = ${totalCostCents}
  WHERE id = ${cycleId}::uuid
`);
console.log(`[+] cycle ${cycleId} → ${finalStatus} | ${((Date.now() - startedAt) / 1000).toFixed(0)}s | $${(totalCostCents / 100).toFixed(2)}`);

// 6. Write digest
const digest = `# AEO digest — ${TODAY}

**Cycle:** \`${cycleId}\`
**Status:** ${finalStatus}
**Runtime:** ${((Date.now() - startedAt) / 1000).toFixed(0)}s
**Engine cost:** $${(totalCostCents / 100).toFixed(2)}

## Coverage

| Metric | Value |
|---|---:|
| Prompts polled | ${prompts.length} |
| Engines active | ${activeEngines.map((e) => e.code).join(', ')} |
| Samples per (prompt × engine) | ${SAMPLES} |
| Planned calls | ${totalCalls} |
| Observations written | ${observationsWritten} |
| Citations extracted | ${citationsWritten} |
| Failures | ${failures.length} |
| Daily-metrics rows | ${metricCount[0]!.n} |

## Per-engine outcome

| engine | succeeded | failed |
|---|---:|---:|
${activeEngines.map((e) => `| ${e.code} | ${perEngine[e.code]!.ok} | ${perEngine[e.code]!.fail} |`).join('\n')}

## Share of answer

CineCanon citations: **${share.n} / ${share.total} (${sharePct}%)** this cycle.

## Top cited domains (competitive landscape)

${topDomains.length === 0
  ? '_no citations this cycle_'
  : '| domain | hits | cinecanon? |\n|---|---:|:---:|\n' +
    topDomains.map((d) => `| \`${d.cited_domain}\` | ${d.hits} | ${d.is_cinecanon ? '**yes**' : '—'} |`).join('\n')}

## Failures (first 10)

${failures.slice(0, 10).map((f) => `- **${f.engine}** on "${f.prompt}…" — ${f.err.slice(0, 120)}`).join('\n') || '_none_'}

## Open questions for human review

- v1 cycle does NOT compute Princeton Citation Precision (no judge-LLM scoring). Wire that into a separate workflow once cost guardrails are agreed.
- Perplexity + Google AI Overviews not yet polled — needs \`PERPLEXITY_API_KEY\` + \`SERPAPI_KEY\` (or substitute Firecrawl).
- Citation extraction is best-effort URL regex — replace with structured citations from each engine's web-search response shape.
`;

const fs = await import('node:fs/promises');
await fs.mkdir('./output', { recursive: true });
await fs.writeFile(`./output/aeo-digest-${TODAY}.md`, digest, 'utf-8');
console.log(`[+] digest → ./output/aeo-digest-${TODAY}.md`);

process.exit(finalStatus === 'failed' ? 1 : 0);

// ----------------------------------------------------------------------
// Engine pollers
// ----------------------------------------------------------------------

type PollResult = {
  responseText: string;
  citations: string[];        // best-effort URL extraction
  raw: unknown;               // raw provider payload (for replay)
  tokenCostCents: number;     // approximate
};

async function pollEngine(code: EngineCode, key: string, prompt: string): Promise<PollResult> {
  switch (code) {
    case 'chatgpt':     return pollChatGPT(key, prompt);
    case 'claude':      return pollClaude(key, prompt);
    case 'gemini':      return pollGemini(key, prompt);
    case 'ai_overview': return pollFirecrawl(key, prompt);
    default:            throw new Error(`engine ${code} not implemented`);
  }
}

async function pollChatGPT(key: string, prompt: string): Promise<PollResult> {
  // Use the Responses API with web_search tool so the model actually
  // browses + returns structured citations (url_citation annotations).
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      input: prompt,
      tools: [{ type: 'web_search' }],
      max_output_tokens: 800,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as {
    output?: Array<{
      type: string;
      content?: Array<{
        type: string;
        text?: string;
        annotations?: Array<{ type: string; url?: string }>;
      }>;
    }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  // Concatenate all output_text blocks; collect URLs from url_citation annotations.
  const messages = (json.output ?? []).filter((o) => o.type === 'message');
  const text = messages
    .flatMap((m) => m.content ?? [])
    .filter((c) => c.type === 'output_text')
    .map((c) => c.text ?? '')
    .join('\n');
  const citations = uniqueUrls(
    messages
      .flatMap((m) => m.content ?? [])
      .flatMap((c) => c.annotations ?? [])
      .filter((a) => a.type === 'url_citation' && a.url)
      .map((a) => a.url!),
  );
  // gpt-4o-mini pricing + web_search call fee (~$25/1k calls = $0.025/call).
  const inTok = json.usage?.input_tokens ?? 0;
  const outTok = json.usage?.output_tokens ?? 0;
  const costCents = Math.round(
    (inTok * 0.000015 + outTok * 0.00006) * 100 + 2.5, // 2.5 cents per web_search call
  );
  return { responseText: text, citations, raw: json, tokenCostCents: costCents };
}

async function pollClaude(key: string, prompt: string): Promise<PollResult> {
  // Claude web_search tool (released 2025). Sonnet-class minimum for tool use
  // depth; haiku may not support web_search reliably so we use sonnet.
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as {
    content: Array<{
      type: string;
      text?: string;
      citations?: Array<{ type: string; url?: string }>;
    }>;
    usage: { input_tokens: number; output_tokens: number };
  };
  const textBlocks = json.content.filter((c) => c.type === 'text');
  const text = textBlocks.map((c) => c.text ?? '').join('\n');
  const citations = uniqueUrls(
    textBlocks
      .flatMap((b) => b.citations ?? [])
      .filter((c) => c.url)
      .map((c) => c.url!),
  );
  // Claude Sonnet 4.6 pricing ~ $3/M input, $15/M output; web_search ~ $10/1k calls.
  const costCents = Math.round(
    (json.usage.input_tokens * 0.000003 + json.usage.output_tokens * 0.000015) * 100 + 1, // 1 cent per search
  );
  return { responseText: text, citations, raw: json, tokenCostCents: costCents };
}

async function pollGemini(key: string, prompt: string): Promise<PollResult> {
  // Gemini 2.0+ supports the googleSearch tool for grounding. Returns
  // groundingMetadata.groundingChunks with web URIs.
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { maxOutputTokens: 800 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as {
    candidates: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: {
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
      };
    }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  const text = json.candidates[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  const citations = uniqueUrls(
    (json.candidates[0]?.groundingMetadata?.groundingChunks ?? [])
      .map((c) => c.web?.uri)
      .filter((u): u is string => Boolean(u)),
  );
  // Gemini 2.0 Flash pricing: $0.10/M input, $0.40/M output. Grounding is
  // included free up to 1500 queries/day per project; assume free for now.
  const inTok = json.usageMetadata?.promptTokenCount ?? 0;
  const outTok = json.usageMetadata?.candidatesTokenCount ?? 0;
  const costCents = Math.round((inTok * 0.0000001 + outTok * 0.0000004) * 100);
  return { responseText: text, citations, raw: json, tokenCostCents: costCents };
}

async function pollFirecrawl(key: string, prompt: string): Promise<PollResult> {
  // Firecrawl /v1/search returns top-N organic Google results for the query.
  // We treat each result URL as a "citation" — what Google's index surfaces
  // for this working-pro question, which is the input AI Overviews draw from.
  // Pricing: ~1 credit per search (~$0.001 on standard plan).
  const res = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query: prompt, limit: 10 }),
  });
  if (!res.ok) throw new Error(`Firecrawl ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as {
    success?: boolean;
    data?: Array<{ url?: string; title?: string; description?: string }>;
  };
  const results = json.data ?? [];
  // Synthesize a response_text from titles + descriptions so the row is
  // useful for downstream judge-LLM scoring later (when we add it).
  const responseText = results
    .map((r, i) => `${i + 1}. ${r.title ?? '(no title)'}\n   ${r.url ?? ''}\n   ${r.description ?? ''}`)
    .join('\n\n');
  const citations = uniqueUrls(
    results.map((r) => r.url).filter((u): u is string => Boolean(u)),
  );
  // Approximate cost: 1 credit per search ≈ $0.001 = 0.1 cent. Round up.
  const costCents = 1;
  return { responseText, citations, raw: json, tokenCostCents: costCents };
}

function uniqueUrls(urls: string[]): string[] {
  return [...new Set(urls.map((u) => u.replace(/[.,;:!?]+$/, '')))];
}

function clampInt(raw: string | undefined, min: number, max: number, dflt: number): number {
  if (raw == null) return dflt;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}
