import { ImageResponse } from 'next/og';
import { headers } from 'next/headers';
import { ogFonts } from '@/lib/og/font';

// Edge runtime — bypasses the @vercel/og Node-mode entrypoint whose
// Windows-path URL constructor fails at module init. Edge uses a
// different bundle that doesn't hit that branch. Trade-off: edge can't
// import @bts/db (postgres-js needs Node TCP), so we fetch from our
// own /api/v1 endpoint instead.
export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };
export const alt = 'Studio Pro production card';

type ApiPayload = {
  production: { title: string; release_year: number | null };
  formats: Array<{ aspect_ratio: string; acquisition_format: string; is_primary: boolean }>;
  crew: Array<{ role_slug: string; display_name: string; credit_name_override: string | null }>;
};

function originFromHeaders(): string {
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/**
 * T6-5 — per-production OG card. Pulls title, year, primary format,
 * director, and DP from the public /api/v1/productions/<slug> endpoint
 * (edge-compatible — no DB driver required). Falls back to a generic
 * card on 404; the page itself notFound()'s in that case so this branch
 * should be unreachable outside of cache-invalidation races.
 */
export default async function OG({ params }: { params: { slug: string } }) {
  const fonts = await ogFonts();

  let title = 'Studio Pro';
  let year: number | null = null;
  let director: string | undefined;
  let dp: string | undefined;
  let primaryFormat: ApiPayload['formats'][number] | undefined;

  try {
    const res = await fetch(`${originFromHeaders()}/api/v1/productions/${params.slug}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = (await res.json()) as ApiPayload;
      title = data.production.title;
      year = data.production.release_year;
      director = data.crew.find((c) => c.role_slug === 'director')?.display_name;
      dp = data.crew.find((c) => c.role_slug === 'director-of-photography')?.display_name;
      primaryFormat = data.formats.find((f) => f.is_primary) ?? data.formats[0];
    }
  } catch {
    // Falls through to the generic card.
  }

  // Build the credits row as a single template string so satori never
  // sees a div with mixed text + element children. (satori requires
  // every multi-child container to have explicit display:flex; the
  // safest defense is to keep child counts low.)
  const creditsLine = [
    director ? `Dir. ${director}` : null,
    dp ? `DP ${dp}` : null,
    primaryFormat
      ? `${primaryFormat.aspect_ratio} · ${primaryFormat.acquisition_format}`
      : null,
  ].filter(Boolean).join('  ·  ');

  const titleLine = year ? `${title} (${year})` : title;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)',
          color: '#fafafa',
          fontFamily: 'Inter',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            fontWeight: 700,
            color: '#f59e0b',
          }}
        >
          Studio Pro
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: titleLine.length > 30 ? 64 : 84,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          {titleLine}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            color: '#a1a1aa',
            lineHeight: 1.4,
          }}
        >
          {creditsLine || 'Cinematic technical reference'}
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
      // 30-day CDN cache: film-page OG cards are stable until the
      // production data changes; cache invalidation happens on the
      // next revalidate of /films/[slug] via `revalidatePath`.
      headers: {
        'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=86400, immutable',
      },
    },
  );
}
