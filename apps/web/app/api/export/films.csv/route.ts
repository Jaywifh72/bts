import { NextResponse, type NextRequest } from 'next/server';
import { db, listProductions } from '@bts/db';
import { rateLimit } from '@/lib/rate-limit';

/**
 * CSV export of the films catalogue. Honors the same filters as /films.
 * Useful for the "working pro / spreadsheet" path that no other film database
 * supports cleanly.
 *
 * Rate-limited at 5 calls per IP per minute to discourage scraping. Returns
 * RFC-4180-compliant CSV with a leading BOM so Excel opens UTF-8 correctly.
 */
export const dynamic = 'force-dynamic';

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, { namespace: 'export:films', limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const dataTier = searchParams.get('tier') === 'curated' ? 'curated' as const : undefined;
  const genre = searchParams.get('genre') ?? undefined;
  // Multi-decade support (UX-audit P0-3). Single-value back-compat handled by
  // the same parser — a lone "2010" becomes [2010]. Canonicalized for
  // cache-key parity with the /films page.
  const decadeParam = searchParams.get('decade') ?? '';
  const decades = Array.from(
    new Set(
      decadeParam
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  ).sort((a, b) => a - b);

  const rows = await listProductions(db, {
    dataTier,
    genre,
    decades: decades.length > 0 ? decades : undefined,
    limit: 2000,
    sort: 'recent',
  });

  const headers = [
    'slug', 'title', 'release_year', 'type', 'data_tier',
    'primary_aspect_ratio', 'primary_acquisition_format',
    'genres', 'vote_average', 'popularity',
  ];
  const lines: string[] = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      csvEscape(r.slug),
      csvEscape(r.title),
      csvEscape(r.release_year),
      csvEscape(r.type),
      csvEscape(r.data_tier),
      csvEscape(r.primary_aspect_ratio),
      csvEscape(r.primary_acquisition_format),
      csvEscape((r.genres ?? []).join('; ')),
      csvEscape(r.vote_average),
      csvEscape(r.popularity),
    ].join(','));
  }

  const body = '﻿' + lines.join('\r\n') + '\r\n';
  const filename = `studio-pro-films${dataTier === 'curated' ? '-curated' : ''}.csv`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, s-maxage=3600',
    },
  });
}
