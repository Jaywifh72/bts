import 'dotenv/config';
import { db, sql } from '@bts/db';

/**
 * E-50 — newsletter LLM-write helper. Pulls the week's curatorial
 * deltas from the database, feeds them to Anthropic's claude-haiku-4-5
 * with a strict template, and returns:
 *   1. Markdown newsletter copy (intro + sections)
 *   2. Bluesky thread (split into 280-char posts)
 *
 * Editor reviews + ships — we don't auto-publish here. Pairs with
 * E-40 (social:post) for a curated-film cadence.
 *
 * Without ANTHROPIC_API_KEY, the helper still computes the audit
 * feed and prints it; the LLM call is skipped.
 */

const ANTHROPIC_BASE = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

type AuditDelta = {
  newCurated: Array<{ slug: string; title: string; year: number | null; verified_at: string }>;
  newCrew: Array<{ production: string; role: string; person: string }>;
  newKeyframes: Array<{ production: string; caption: string | null }>;
  newAwards: Array<{ production: string; person: string | null; award: string; category: string; year: number; is_winner: boolean }>;
  newCitations: Array<{ production: string; title: string | null; url: string | null }>;
  newLightingSetups: Array<{ production: string; scene: string; setup_name: string }>;
};

export async function collectAuditDelta(sinceDays: number = 7): Promise<AuditDelta> {
  const since = sql.raw(`NOW() - INTERVAL '${sinceDays} days'`);

  const [curated, crew, keyframes, awards, citations, lighting] = await Promise.all([
    db.execute<{ slug: string; title: string; year: number | null; verified_at: string }>(sql`
      SELECT slug, title, release_year AS year, last_verified_at::text AS verified_at
      FROM productions
      WHERE data_tier = 'curated' AND last_verified_at >= ${since}
      ORDER BY last_verified_at DESC
      LIMIT 50
    `),
    db.execute<{ production: string; role: string; person: string }>(sql`
      SELECT p.slug AS production, r.name AS role, ppl.display_name AS person
      FROM crew_assignments ca
      JOIN productions p ON p.id = ca.production_id
      JOIN people ppl ON ppl.id = ca.person_id
      JOIN roles r ON r.id = ca.role_id
      WHERE ca.created_at >= ${since}
      ORDER BY ca.created_at DESC
      LIMIT 100
    `),
    db.execute<{ production: string; caption: string | null }>(sql`
      SELECT p.slug AS production, kf.caption
      FROM production_keyframes kf
      JOIN productions p ON p.id = kf.production_id
      WHERE kf.created_at >= ${since}
      ORDER BY kf.created_at DESC
      LIMIT 50
    `),
    db.execute<{ production: string; person: string | null; award: string; category: string; year: number; is_winner: boolean }>(sql`
      SELECT p.slug AS production, ppl.display_name AS person,
             pa.award_org::text AS award, pa.category, pa.year, pa.is_winner
      FROM production_awards pa
      JOIN productions p ON p.id = pa.production_id
      LEFT JOIN people ppl ON ppl.id = pa.recipient_person_id
      WHERE pa.created_at >= ${since}
      ORDER BY pa.created_at DESC
      LIMIT 50
    `),
    db.execute<{ production: string; title: string | null; url: string | null }>(sql`
      SELECT p.slug AS production, s.title, s.url
      FROM production_sources ps
      JOIN sources s ON s.id = ps.source_id
      JOIN productions p ON p.id = ps.production_id
      WHERE ps.created_at >= ${since}
      ORDER BY ps.created_at DESC
      LIMIT 50
    `),
    db.execute<{ production: string; scene: string; setup_name: string }>(sql`
      SELECT p.slug AS production, sc.title AS scene, ls.setup_name
      FROM lighting_setups ls
      JOIN scenes sc ON sc.id = ls.scene_id
      JOIN productions p ON p.id = sc.production_id
      WHERE ls.created_at >= ${since}
      ORDER BY ls.created_at DESC
      LIMIT 50
    `),
  ]);

  return {
    newCurated: [...curated],
    newCrew: [...crew],
    newKeyframes: [...keyframes],
    newAwards: [...awards],
    newCitations: [...citations],
    newLightingSetups: [...lighting],
  };
}

function buildPrompt(delta: AuditDelta, sinceDays: number): string {
  const lines: string[] = [];
  lines.push(`# Studio Pro — last ${sinceDays} day${sinceDays === 1 ? '' : 's'} of curatorial deltas\n`);
  if (delta.newCurated.length > 0) {
    lines.push('## New curated films');
    for (const c of delta.newCurated) {
      lines.push(`- ${c.title}${c.year ? ` (${c.year})` : ''} → /films/${c.slug}`);
    }
    lines.push('');
  }
  if (delta.newAwards.length > 0) {
    lines.push('## New awards');
    for (const a of delta.newAwards.slice(0, 30)) {
      lines.push(`- ${a.is_winner ? 'WON' : 'NOM'}: ${a.award} ${a.category} (${a.year}) — ${a.person ?? '?'} on /films/${a.production}`);
    }
    lines.push('');
  }
  if (delta.newKeyframes.length > 0) {
    lines.push(`## New key frames: ${delta.newKeyframes.length} added`);
    for (const k of delta.newKeyframes.slice(0, 10)) {
      lines.push(`- /films/${k.production}${k.caption ? ` — "${k.caption}"` : ''}`);
    }
    lines.push('');
  }
  if (delta.newLightingSetups.length > 0) {
    lines.push('## New lighting setups');
    for (const l of delta.newLightingSetups.slice(0, 20)) {
      lines.push(`- ${l.setup_name} on ${l.scene} (/films/${l.production})`);
    }
    lines.push('');
  }
  if (delta.newCrew.length > 0) {
    lines.push(`## New crew credits: ${delta.newCrew.length} entries across films`);
    lines.push('');
  }
  if (delta.newCitations.length > 0) {
    lines.push(`## New citations: ${delta.newCitations.length} sources tied to scenes`);
    lines.push('');
  }
  return lines.join('\n');
}

const SYSTEM_PROMPT = `You write the weekly newsletter for Studio Pro, a cinematography reference site for working film professionals (DPs, gaffers, VFX supervisors). Your tone is informed and concise — assume the reader knows what an IDT is.

You will be given the week's curatorial deltas. Produce TWO outputs:

1. **Newsletter (Markdown)** — under 350 words. Lead with a 1-paragraph intro that picks the single most interesting delta and explains why it matters for the audience. Then 3–5 short sections with H2 headings. Cite specific films and crew. Use \`[Title (Year)](path)\` markdown links.

2. **Bluesky thread** — 3–6 posts, each under 280 chars. Lead post hooks; later posts give specific examples; closing post invites readers to subscribe. Separate posts with \`---\`.

Rules:
- Don't invent facts. If a delta isn't in the input, don't write about it.
- Don't use bullet lists in the intro paragraph.
- One emoji max in the entire newsletter, only if it's genuinely useful.

Format your response as JSON: \`{ "newsletter_md": "...", "bluesky_thread": "..." }\``;

export type DraftResult = {
  newsletter_md: string;
  bluesky_thread: string;
  delta: AuditDelta;
  audit_summary: string;
};

export async function draftNewsletter(opts: { sinceDays?: number; dryRun?: boolean } = {}): Promise<DraftResult> {
  const sinceDays = opts.sinceDays ?? 7;
  const delta = await collectAuditDelta(sinceDays);
  const audit_summary = buildPrompt(delta, sinceDays);

  console.log(`newsletter:draft — collected delta over ${sinceDays}d:`);
  console.log(audit_summary);

  if (opts.dryRun) {
    console.log('--- DRY RUN — skipping LLM call ---');
    return { newsletter_md: '', bluesky_thread: '', delta, audit_summary };
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.warn('ANTHROPIC_API_KEY not set — returning audit summary only');
    return { newsletter_md: '', bluesky_thread: '', delta, audit_summary };
  }

  const res = await fetch(ANTHROPIC_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: audit_summary }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { content: Array<{ type: string; text: string }> };
  const text = json.content.find((c) => c.type === 'text')?.text ?? '';

  // Try to parse the JSON envelope; if Haiku wrapped it in markdown
  // fences, strip them.
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  let parsed: { newsletter_md: string; bluesky_thread: string };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Best-effort fallback: dump the whole text into newsletter_md.
    parsed = { newsletter_md: text, bluesky_thread: '' };
  }

  console.log('\n=== NEWSLETTER ===\n');
  console.log(parsed.newsletter_md);
  console.log('\n=== BLUESKY THREAD ===\n');
  console.log(parsed.bluesky_thread);

  return { ...parsed, delta, audit_summary };
}
