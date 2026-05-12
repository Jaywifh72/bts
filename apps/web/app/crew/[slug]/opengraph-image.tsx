import { ImageResponse } from 'next/og';
import { headers } from 'next/headers';
import { ogFonts } from '@/lib/og/font';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };
export const alt = 'Studio Pro crew card';

async function originFromHeaders(): Promise<string> {
  // Next 15+ — `headers()` is now async.
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

type CrewApiPayload = {
  display_name: string;
  primary_role: string | null;
  filmography: Array<{ production_title: string }>;
};

/**
 * T6-5 — per-person OG card. Mirrors the production card's visual
 * language. Edge-runtime; data via fetch to /api/v1/crew/<slug> (a
 * lightweight endpoint added for this card).
 */
export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const fonts = await ogFonts();

  let name = 'Studio Pro';
  let primaryRole: string | null = null;
  let topCredits: string[] = [];
  let credits = 0;

  try {
    const res = await fetch(`${await originFromHeaders()}/api/v1/crew/${(await params).slug}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = (await res.json()) as CrewApiPayload;
      name = data.display_name;
      primaryRole = data.primary_role;
      topCredits = data.filmography.slice(0, 3).map((c) => c.production_title);
      credits = data.filmography.length;
    }
  } catch {
    // Falls through to the generic card.
  }

  // Same defensive flattening as the production card — single-line strings
  // per <div> so satori's "every multi-child container needs display:flex"
  // rule is trivially satisfied.
  const headlineLine = primaryRole ? `${primaryRole} — ${name}` : name;
  const creditsSummary = credits > 0
    ? `${credits} credit${credits === 1 ? '' : 's'} · ${topCredits.join(' · ')}`
    : 'Cinematic technical reference';

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
            fontSize: headlineLine.length > 30 ? 60 : 88,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          {headlineLine}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            color: '#a1a1aa',
            lineHeight: 1.4,
          }}
        >
          {creditsSummary}
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
      headers: {
        'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=86400, immutable',
      },
    },
  );
}
