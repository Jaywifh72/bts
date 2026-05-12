import 'dotenv/config';
import { db, sql } from '@bts/db';

/**
 * E-29 — color palette extraction per key frame.
 *
 * Uses GPT-4o-mini's vision capability with a strict JSON schema to
 * pull 5 dominant hex colors from each image, ordered most-dominant
 * first. Cost: ~$0.0003 per image. We could later swap in a server-
 * side `sharp` + k-means cluster for free, but a vision-LLM pass is
 * cleaner to ship and works well on cinematic frames where the
 * dominant tones are usually deliberate (cinematographer-graded).
 *
 * The response is JSONB (not text[]) on `production_keyframes.palette`
 * so we can later attach per-color weights or roles.
 */

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You extract the 5 most-dominant colors from a film still as hex strings.

Rules:
- Return exactly 5 colors, ordered most-dominant first.
- Use lowercase six-digit hex with the leading "#" (e.g. "#1a1a1a").
- Capture cinematic intent: include the key shadow tone, the dominant midtone, and the brightest highlight tone if distinct.
- Skip any pure black "#000000" or pure white "#ffffff" unless they're genuinely a meaningful share of the frame; prefer near-black / off-white that better matches what's actually there.`;

const RESPONSE_SCHEMA = {
  name: 'film_still_palette',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      colors: {
        type: 'array',
        items: { type: 'string' },
        minItems: 5,
        maxItems: 5,
      },
    },
    required: ['colors'],
  },
};

export class MissingApiKeyError extends Error {
  constructor() {
    super('OPENAI_API_KEY env var not set on server.');
  }
}

async function extractPalette(imageUrl: string): Promise<string[] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new MissingApiKeyError();

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the 5 most dominant colors as hex strings.' },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
          ],
        },
      ],
      response_format: { type: 'json_schema', json_schema: RESPONSE_SCHEMA },
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI vision ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const raw = json.choices[0]?.message.content;
  if (!raw) return null;
  const parsed = JSON.parse(raw) as { colors: string[] };
  // Sanity-filter to valid hex format.
  return parsed.colors.filter((c) => /^#[0-9a-f]{6}$/i.test(c));
}

export type PaletteStats = {
  attempted: number;
  extracted: number;
  errors: number;
};

export async function extractKeyFramePalettes(
  opts: { limit?: number; refresh?: boolean } = {},
): Promise<PaletteStats> {
  const stats: PaletteStats = { attempted: 0, extracted: 0, errors: 0 };
  const filterClause = opts.refresh ? sql`TRUE` : sql`palette IS NULL`;
  const limitClause = opts.limit ? sql`LIMIT ${opts.limit}` : sql``;

  const targets = await db.execute<{ id: number; image_url: string }>(sql`
    SELECT id, image_url FROM production_keyframes
    WHERE ${filterClause}
    ORDER BY id
    ${limitClause}
  `);

  console.log(`palette:extract — ${targets.length} key frames to process`);

  for (const row of targets) {
    stats.attempted++;
    try {
      const palette = await extractPalette(row.image_url);
      if (!palette || palette.length === 0) {
        stats.errors++;
        continue;
      }
      await db.execute(sql`
        UPDATE production_keyframes
        SET palette = ${JSON.stringify(palette)}::jsonb, updated_at = NOW()
        WHERE id = ${row.id}
      `);
      stats.extracted++;
    } catch (e) {
      stats.errors++;
      if (e instanceof MissingApiKeyError) throw e;
      console.error(`  keyframe ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(
    `palette:extract done — attempted=${stats.attempted} extracted=${stats.extracted} errors=${stats.errors}`,
  );
  return stats;
}
