import { ImageResponse } from 'next/og';
import { ogFonts } from '@/lib/og/font';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };
export const alt = 'CineCanon — Cinematic Technical Reference';

/**
 * T6-5 — root-level OG card. Used as the default for any page that
 * doesn't ship its own opengraph-image. Static copy to keep this route
 * edge-runtime-friendly (no DB driver in edge).
 */
export default async function OG() {
  const fonts = await ogFonts();

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 60%, #422006 100%)',
          color: '#fafafa',
          fontFamily: 'Inter',
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#f59e0b',
            letterSpacing: '-0.01em',
          }}
        >
          CineCanon
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 88,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            maxWidth: 980,
          }}
        >
          Cinematic technical reference
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 28,
            color: '#a1a1aa',
            maxWidth: 900,
            lineHeight: 1.3,
          }}
        >
          Behind-the-scenes equipment, scenes, crew, and citations for
          working film professionals.
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
