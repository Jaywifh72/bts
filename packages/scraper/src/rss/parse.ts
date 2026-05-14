/**
 * Minimal RSS 2.0 + Atom feed parser. Tagged XML is simple enough that
 * pulling in a full parser dependency for our 5-10 feeds isn't worth
 * the supply-chain surface. Handles the <item>/<entry> shapes we hit
 * in the wild (WordPress + Squarespace + custom CMSes).
 */

export type FeedItem = {
  title: string;
  link: string;
  pubDate: Date | null;
  /** Plain-text summary (HTML stripped). */
  summary: string;
  /** Original HTML for posterity / future indexing. */
  contentHtml: string | null;
  guid: string;
};

const ENT: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  '#039': "'",
  nbsp: ' ',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&([a-zA-Z]+|#[0-9]+);/g, (m, key) => ENT[key.toLowerCase()] ?? m)
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)));
}

function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, '')).trim();
}

function unwrapCdata(s: string): string {
  const m = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(s.trim());
  return m ? m[1]! : s;
}

/**
 * Match the *first* tag of a given name within the given block. Handles
 * both `<tag>...</tag>` and self-closing-empty `<tag/>`. Doesn't try to
 * parse attributes; if we ever need them we can extend.
 */
function matchTag(block: string, name: string): string | null {
  // Atom uses both `<title>...</title>` and `<title type="...">...</title>`.
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i');
  const m = re.exec(block);
  if (!m) return null;
  return unwrapCdata(m[1]!);
}

/**
 * Atom <link rel="alternate" href="..."/> form; falls back to RSS's
 * `<link>...</link>` text content via matchTag if href isn't found.
 */
function matchLink(block: string): string | null {
  // Atom self-closing link with href attr
  const atomMatch = /<link\b[^>]*?\bhref="([^"]+)"[^>]*\/?\s*>/i.exec(block);
  if (atomMatch) return atomMatch[1]!;
  return matchTag(block, 'link');
}

export function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  // RSS 2.0 uses <item>; Atom uses <entry>. Match either.
  const re = /<(item|entry)\b[\s\S]*?<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[0];
    const title = matchTag(block, 'title') ?? '';
    const link = matchLink(block) ?? '';
    const pubDateRaw = matchTag(block, 'pubDate') ?? matchTag(block, 'updated') ?? matchTag(block, 'published');
    const contentHtml =
      matchTag(block, 'content:encoded') ?? matchTag(block, 'content') ?? matchTag(block, 'description') ?? matchTag(block, 'summary');
    const guid = matchTag(block, 'guid') ?? matchTag(block, 'id') ?? link;

    const pubDate = pubDateRaw ? new Date(pubDateRaw) : null;
    if (!title.trim() || !link.trim()) continue;

    items.push({
      title: stripHtml(title).trim(),
      link: link.trim(),
      pubDate: pubDate && !Number.isNaN(pubDate.getTime()) ? pubDate : null,
      summary: contentHtml ? stripHtml(contentHtml).slice(0, 600) : '',
      contentHtml: contentHtml ?? null,
      guid: guid.trim(),
    });
  }
  return items;
}

const USER_AGENT = 'CineCanonBot/1.0 (https://cinecanon.com; cinema-tech aggregator)';

export async function fetchFeed(url: string): Promise<FeedItem[]> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
  });
  if (!res.ok) throw new Error(`RSS ${res.status}: ${url}`);
  return parseFeed(await res.text());
}
