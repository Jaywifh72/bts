import 'dotenv/config';

/**
 * Minimal Wikidata SPARQL client.
 *
 * Endpoint: https://query.wikidata.org/sparql
 * Returns JSON via the `Accept: application/sparql-results+json` header.
 * Wikidata requires a User-Agent identifying the application + contact —
 * see https://meta.wikimedia.org/wiki/User-Agent_policy. We send a
 * generic project string; tighten later if WMF asks.
 *
 * Throttling: WMF asks for sequential requests with a polite delay; the
 * service kills queries that exceed 30s server-side. Our soft cap is
 * one request at a time with 1s spacing — slow but bulletproof for the
 * batch sizes we care about (a few hundred productions/people).
 */

const ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT =
  'StudioProBot/1.0 (https://github.com/anthropics/studio-pro; cinema-tech reference site) sparql-client';

// 2s baseline spacing — observed 429s at 1s under sustained load.
const MIN_SPACING_MS = 2000;
const MAX_RETRIES = 4;
let _lastStartedAt = 0;
let _inflight: Promise<unknown> = Promise.resolve();

async function throttle(): Promise<void> {
  // Serialize through `_inflight` so concurrent callers naturally queue.
  const wait = _inflight.then(async () => {
    const elapsed = Date.now() - _lastStartedAt;
    if (elapsed < MIN_SPACING_MS) {
      await new Promise((r) => setTimeout(r, MIN_SPACING_MS - elapsed));
    }
    _lastStartedAt = Date.now();
  });
  _inflight = wait;
  await wait;
}

export type SparqlBinding = Record<string, { type: string; value: string; 'xml:lang'?: string }>;

export type SparqlResult = {
  head: { vars: string[] };
  results: { bindings: SparqlBinding[] };
};

const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

export async function sparql(query: string): Promise<SparqlResult> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await throttle();
    const url = `${ENDPOINT}?query=${encodeURIComponent(query)}`;
    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          Accept: 'application/sparql-results+json',
          'User-Agent': USER_AGENT,
        },
      });
    } catch (e) {
      lastErr = e;
      // Network error — back off and retry.
      const backoff = 2 ** attempt * 1000;
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }

    if (res.ok) return (await res.json()) as SparqlResult;

    if (RETRY_STATUSES.has(res.status) && attempt < MAX_RETRIES) {
      // Honour Retry-After when set; else exponential backoff.
      const retryAfter = res.headers.get('retry-after');
      const backoff = retryAfter
        ? Number(retryAfter) * 1000
        : 2 ** attempt * 1000;
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }

    const body = await res.text().catch(() => '');
    throw new Error(`Wikidata SPARQL ${res.status}: ${body.slice(0, 200)}`);
  }
  throw lastErr ?? new Error('Wikidata SPARQL: exhausted retries');
}

/**
 * Convenience: extract a Wikidata QID from a full entity URI like
 * `http://www.wikidata.org/entity/Q12345`. Returns the QID without the
 * `http://...` prefix, or null if the input doesn't match.
 */
export function qidFromUri(uri: string): string | null {
  const m = /\/entity\/(Q\d+)$/.exec(uri);
  return m ? m[1]! : null;
}
