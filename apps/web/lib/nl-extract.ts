/**
 * E-31 — natural-language → structured-filter extraction.
 *
 * Pattern: a small LLM call (gpt-4.1-mini, ~$0.0003/query) using JSON-
 * schema structured output to convert a free-text query like "films
 * Roger Deakins shot in 2.39:1 anamorphic on 35mm before 2010" into
 * a typed filter object. Combined with semantic-search candidate
 * retrieval, this gives natural-language coverage without writing a
 * full text-to-SQL pipeline (which is a security/quality hazard).
 *
 * The extracted `themes` field is what we feed to the embedding
 * search — short tonal/genre/visual descriptors. The other fields
 * are exact matches we apply as SQL filters.
 */

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You extract structured film-search filters from a natural-language query.

You will receive a query about films (cinematography, behind-the-scenes, technical metadata). Extract these fields when the query mentions them:

- director: director name (string), or null
- dp: cinematographer/director-of-photography name (string), or null
- year_min: earliest release year (int), or null
- year_max: latest release year (int), or null
- aspect_ratio: one of "1.33:1", "1.37:1", "1.43:1", "1.66:1", "1.78:1", "1.85:1", "2.20:1", "2.39:1", "2.76:1", or null
- format_keyword: short keyword for the acquisition format like "imax", "alexa 65", "vistavision", "35mm", "16mm", "anamorphic", or null
- themes: short comma-separated visual/tonal descriptors for semantic search (e.g. "magic hour, handheld, dystopian"); empty string if the query is purely structural
- limit: max results requested by the user (int, default 12)

Rules:
- "after X" → year_min = X+1; "before X" → year_max = X-1; "in 2024" → year_min = year_max = 2024; "the 2010s" → year_min = 2010, year_max = 2019.
- "anamorphic" should populate format_keyword, NOT aspect_ratio (anamorphic isn't an aspect ratio).
- If a name is ambiguous between director and DP, prefer the role the query implies; if neither, set both to null.
- themes captures the *flavor* of the query (style, mood, subject) so embedding search can rank candidates.
- Output strictly the schema; no commentary.
`;

const RESPONSE_SCHEMA = {
  name: 'film_search_filters',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      director: { type: ['string', 'null'] },
      dp: { type: ['string', 'null'] },
      year_min: { type: ['integer', 'null'] },
      year_max: { type: ['integer', 'null'] },
      aspect_ratio: { type: ['string', 'null'] },
      format_keyword: { type: ['string', 'null'] },
      themes: { type: 'string' },
      limit: { type: 'integer' },
    },
    required: ['director', 'dp', 'year_min', 'year_max', 'aspect_ratio', 'format_keyword', 'themes', 'limit'],
  },
};

export type SearchFilters = {
  director: string | null;
  dp: string | null;
  year_min: number | null;
  year_max: number | null;
  aspect_ratio: string | null;
  format_keyword: string | null;
  themes: string;
  limit: number;
};

export class MissingApiKeyError extends Error {
  constructor() {
    super('OPENAI_API_KEY env var not set on server.');
  }
}

/**
 * Calls OpenAI to extract structured search filters from `query`.
 * Throws MissingApiKeyError if no key is set.
 */
export async function extractFilters(query: string): Promise<SearchFilters> {
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
        { role: 'user', content: query },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: RESPONSE_SCHEMA,
      },
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI chat ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const raw = json.choices[0]?.message.content;
  if (!raw) throw new Error('OpenAI returned no content');

  const parsed = JSON.parse(raw) as SearchFilters;
  // Clamp limit to a sane range — protects against runaway queries.
  parsed.limit = Math.min(Math.max(parsed.limit ?? 12, 1), 50);
  return parsed;
}
