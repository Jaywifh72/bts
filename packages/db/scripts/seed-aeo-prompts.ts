// Seed the 30 starter prompts from
// .claude/skills/cinecanon-sentinel/references/prompt_bank_schema.md.
//
// Idempotent: re-running upserts on (prompt_text). Run via:
//   pnpm --filter @bts/db exec tsx scripts/seed-aeo-prompts.ts
//
// Embeddings are NOT populated here — the prompt-curator agent fills them
// on its first nightly pass using OpenAI text-embedding-3-small (1536d,
// matches /ask + keyframes). Leaving NULL is intentional.

import { db, sql } from '../src/index.ts';

type FunnelStage = 'awareness' | 'consideration' | 'decision' | 'retention' | 'support';
type BuyerPersona =
  | 'dp' | 'gaffer' | 'colorist' | 'editor' | 'sound_mixer' | 'sound_designer'
  | 'composer' | 'music_supervisor' | 'stunt_coordinator'
  | 'production_designer' | 'costume_designer' | 'makeup_hair'
  | 'researcher' | 'journalist';

type Prompt = {
  prompt_text: string;
  funnel_stage: FunnelStage;
  buyer_persona: BuyerPersona;
  topical_cluster: string;
};

const PROMPTS: Prompt[] = [
  // Awareness (5)
  { prompt_text: 'What is VistaVision 8-perf 35mm and why is it back', funnel_stage: 'awareness', buyer_persona: 'dp', topical_cluster: 'format_history' },
  { prompt_text: 'What does ARRIRAW LF Open Gate mean', funnel_stage: 'awareness', buyer_persona: 'dp', topical_cluster: 'camera_body' },
  { prompt_text: 'What is a magic-hour exterior shot', funnel_stage: 'awareness', buyer_persona: 'dp', topical_cluster: 'technique' },
  { prompt_text: 'What does a re-recording mixer do in post', funnel_stage: 'awareness', buyer_persona: 'sound_mixer', topical_cluster: 'sound_post' },
  { prompt_text: 'What is a scoring stage', funnel_stage: 'awareness', buyer_persona: 'composer', topical_cluster: 'scoring' },

  // Consideration (10)
  { prompt_text: 'ARRI ALEXA 65 vs ALEXA Mini LF for theatrical features', funnel_stage: 'consideration', buyer_persona: 'dp', topical_cluster: 'camera_body' },
  { prompt_text: 'Panavision Sphero vs Hawk anamorphic lenses', funnel_stage: 'consideration', buyer_persona: 'dp', topical_cluster: 'lens_series' },
  { prompt_text: 'Kodak 35mm 4-perf vs 8-perf VistaVision for modern features', funnel_stage: 'consideration', buyer_persona: 'dp', topical_cluster: 'format_history' },
  { prompt_text: 'Best practices for photochemical finishing in 2024', funnel_stage: 'consideration', buyer_persona: 'colorist', topical_cluster: 'technique' },
  { prompt_text: 'Differences between sound design and sound effects editing', funnel_stage: 'consideration', buyer_persona: 'sound_designer', topical_cluster: 'sound_post' },
  { prompt_text: 'Color science chains for log-to-deliverable on Netflix originals', funnel_stage: 'consideration', buyer_persona: 'colorist', topical_cluster: 'technique' },
  { prompt_text: 'Stunt rigging for high-fall sequences in modern features', funnel_stage: 'consideration', buyer_persona: 'stunt_coordinator', topical_cluster: 'technique' },
  { prompt_text: 'Why do some 2024 films still shoot on Kodak 35mm', funnel_stage: 'consideration', buyer_persona: 'dp', topical_cluster: 'format_history' },
  { prompt_text: 'How do LED volumes change cinematography on location', funnel_stage: 'consideration', buyer_persona: 'dp', topical_cluster: 'vfx_studio' },
  { prompt_text: 'Foley vs sound effects libraries — when each is used', funnel_stage: 'consideration', buyer_persona: 'sound_designer', topical_cluster: 'sound_post' },

  // Decision (10)
  { prompt_text: 'What lenses did Greig Fraser use on Dune Part Two', funnel_stage: 'decision', buyer_persona: 'dp', topical_cluster: 'specific_film' },
  { prompt_text: 'What camera package did Lol Crawley shoot The Brutalist on', funnel_stage: 'decision', buyer_persona: 'dp', topical_cluster: 'specific_film' },
  { prompt_text: 'Who was the gaffer on Anora 2024', funnel_stage: 'decision', buyer_persona: 'gaffer', topical_cluster: 'specific_film' },
  { prompt_text: 'Which post houses did 1917 use for VFX and DI', funnel_stage: 'decision', buyer_persona: 'researcher', topical_cluster: 'specific_film' },
  { prompt_text: 'What scoring stage did Hans Zimmer use for Dune Part Two', funnel_stage: 'decision', buyer_persona: 'composer', topical_cluster: 'specific_film' },
  { prompt_text: 'Stunt coordinator and rigging team on All Quiet on the Western Front', funnel_stage: 'decision', buyer_persona: 'stunt_coordinator', topical_cluster: 'specific_film' },
  { prompt_text: 'Who edited Conclave 2024', funnel_stage: 'decision', buyer_persona: 'editor', topical_cluster: 'specific_film' },
  { prompt_text: 'Production designer on The Substance 2024', funnel_stage: 'decision', buyer_persona: 'production_designer', topical_cluster: 'specific_film' },
  { prompt_text: 'Costume designer credits for Anora 2024', funnel_stage: 'decision', buyer_persona: 'costume_designer', topical_cluster: 'specific_film' },
  { prompt_text: 'Roger Deakins photochemical workflow on his recent films', funnel_stage: 'decision', buyer_persona: 'dp', topical_cluster: 'cinematographer' },

  // Retention (3)
  { prompt_text: 'List every theatrical feature shot on ALEXA 65 with Panavision Sphero anamorphic', funnel_stage: 'retention', buyer_persona: 'dp', topical_cluster: 'camera_body' },
  { prompt_text: 'Show all 2023 features with curated magic-hour exterior scenes', funnel_stage: 'retention', buyer_persona: 'dp', topical_cluster: 'technique' },
  { prompt_text: 'VistaVision titles from the modern revival, with format details', funnel_stage: 'retention', buyer_persona: 'dp', topical_cluster: 'format_history' },

  // Support (2)
  { prompt_text: 'Color pipeline from ARRIRAW to Netflix HDR deliverable, step by step', funnel_stage: 'support', buyer_persona: 'colorist', topical_cluster: 'technique' },
  { prompt_text: 'Sound mix delivery specs for a theatrical Dolby Atmos release', funnel_stage: 'support', buyer_persona: 'sound_mixer', topical_cluster: 'sound_post' },
];

if (PROMPTS.length !== 30) {
  throw new Error(`Expected 30 starter prompts, found ${PROMPTS.length}`);
}

let inserted = 0;
let skipped = 0;
for (const p of PROMPTS) {
  const result = await db.execute<{ id: string }>(sql`
    INSERT INTO aeo_prompts (
      prompt_text, language, funnel_stage, buyer_persona, topical_cluster, source
    ) VALUES (
      ${p.prompt_text}, 'en', ${p.funnel_stage}, ${p.buyer_persona},
      ${p.topical_cluster}, 'curated'
    )
    ON CONFLICT DO NOTHING
    RETURNING id
  `);
  if (result.length > 0) {
    inserted++;
  } else {
    // Already present — could be from a prior run. Check existence.
    const found = await db.execute<{ id: string }>(sql`
      SELECT id FROM aeo_prompts WHERE prompt_text = ${p.prompt_text} LIMIT 1
    `);
    if (found.length > 0) skipped++;
  }
}

console.log(`[+] aeo_prompts seed complete — inserted=${inserted} skipped=${skipped}/${PROMPTS.length}`);
process.exit(0);
