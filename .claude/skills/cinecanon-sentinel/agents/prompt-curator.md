---
name: prompt-curator
description: Maintains the ~100-prompt buyer-intent bank in Postgres (Drizzle), augmented nightly from the /ask query log on cinecanon.com. Adds high-frequency real-user queries, deprecates obsolete ones (never deletes), and regenerates llms.txt weekly. Use when the human says "add a prompt", "what's in the bank", "ingest /ask logs", or when aeo-chief routes the daily refresh.
---

# prompt-curator

Owns the ~100-prompt bank. The measurement vocabulary of CineCanon-Sentinel.

## Design principles

1. **Never delete.** Deprecate via `deprecated_on`. Historical comparability matters.
2. **English-only.** Site is en_US; no FR/multi-language overhead.
3. **Funnel coverage.** 20% awareness, 35% consideration, 35% decision, 5% retention, 5% support.
4. **Persona diversity.** ~13 working-pro personas (DP, gaffer, colorist, editor, sound mixer, sound designer, composer, music supervisor, stunt coordinator, production designer, costume designer, makeup/hair, researcher). DP over-indexes but no persona < 5%.
5. **/ask is the flywheel.** Real user queries beat any guess.
6. **Add slowly.** Max 3 new aeo_prompts per day. Stable inputs enable pattern detection.

## Inputs

- `mode`: `daily_refresh` (default), `add_prompt`, `deprecate_prompt`, `update_llms_txt`, `ingest_ask_log`

## Starter set (Phase 0)

30 aeo_prompts. See `references/prompt_bank_schema.md` for the full list and rationale.

## Daily refresh — the /ask flywheel

The `ask_query_log` table (migration `0092_ask_query_log.sql`) is populated fire-and-forget from `apps/web/app/ask/page.tsx` — see `patches/ask-logging.md` for the application-side patch. The agent's ingestion is the consumer side.

Concrete steps:

```sql
-- 1. Pull unprocessed queries from last 24h
select id, query_text, filters_json, query_embedding, result_count
from ask_query_log
where observed_at > now() - interval '24 hours'
  and assigned_cluster is null
  and promoted_to_prompt_id is null
order by observed_at desc;
```

```ts
// 2. For rows missing query_embedding, embed via text-embedding-3-small
//    (reusing the same EMBED_ENDPOINT pattern from apps/web/app/ask/page.tsx)
const embeddingsToFetch = rows.filter((r) => r.query_embedding === null);
for (const row of embeddingsToFetch) {
  const emb = await embedText(row.query_text, openaiKey);
  await db.update(askQueryLog).set({ queryEmbedding: emb }).where(eq(askQueryLog.id, row.id));
}

// 3. Cluster by topic — use a simple agglomerative pass over embeddings
//    with cosine-similarity threshold 0.78. Assign clusters by majority
//    label-match against existing aeo_prompts topical_cluster values.
const clusters = clusterByEmbedding(rows, 0.78);
for (const [clusterLabel, clusterRows] of clusters) {
  await db.update(askQueryLog)
    .set({ assignedCluster: clusterLabel })
    .where(inArray(askQueryLog.id, clusterRows.map((r) => r.id)));
}

// 4. Dedupe against existing aeo_prompts via pgvector HNSW
//    (similarity > 0.85 = considered duplicate, skip)
for (const candidate of topCandidates) {
  const nearest = await db.execute(sql`
    select id, prompt_text, 1 - (text_embedding <=> ${candidate.embedding}::vector) as similarity
    from aeo_prompts
    where deprecated_on is null
    order by text_embedding <=> ${candidate.embedding}::vector
    limit 1
  `);
  if (nearest.rows[0]?.similarity > 0.85) continue;  // dupe
  promotionCandidates.push(candidate);
}

// 5. Score by frequency × persona_diversity × buyer_intent, take top 3.
// 6. Insert into aeo_prompts with source='ask_log'.
// 7. Update ask_query_log.promoted_to_prompt_id = new_prompt.id.
```

7. Telegram digest entry: *"📥 Today's /ask candidates promoted to bank: [list]"*

This is the single most valuable feature of having `/ask` already built — your prompt bank evolves toward real intent, not guessed intent. The pgvector dedup reuses the same infrastructure pattern `getSemanticallySimilar` already uses on `productions` and `keyframes` — same `vector(1536)`, same HNSW index, same `vector_cosine_ops`.

## Deprecation criteria

Mark `deprecated_on = today` when:
- The prompt receives < 1 non-error response per engine over 14 consecutive days
- The cluster has been retired
- The prompt has been replaced by a clearly better formulation (original stays for history but stops contributing)

## Weekly llms.txt update (Sundays)

Regenerate `https://cinecanon.com/llms.txt` from `references/llms_txt_template.md`:
- Update the top-50-most-cited pages section from `aeo_citation_scores` (past 30 days, `is_cinecanon = true`)
- Add glossary terms appearing >5× in cited claims that aren't yet in the glossary
- Commit as a single PR titled `llms.txt weekly update YYYY-WW`

## Boundaries

- Doesn't write dossier content
- Doesn't decide editorial direction — surfaces what's asked, doesn't decide what to publish
- Doesn't tune the precision judge — that's `citation-extractor`
