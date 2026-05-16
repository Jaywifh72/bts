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
 *
 * Brand-system pass — palette swapped to the locked CineCanon tokens
 * (#0E0E0E ink → #C97A3B amber) and the C-in-C brand mark is rendered
 * inline at the top-left as 96×96 SVG. Satori (Next/og) only supports
 * a subset of SVG; we inline the two <path>s with their exact values
 * from /CineCanon-Images/01_brand_mark.svg.
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
          background: 'linear-gradient(135deg, #0E0E0E 0%, #1a1410 55%, #5a3517 100%)',
          color: '#ECE6DC',
          fontFamily: 'Inter',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <svg width="96" height="96" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M 359.687 190 A 160 160 0 1 0 359.687 210 L 319.583 210 A 120 120 0 1 1 319.583 190 Z"
              fill="#ECE6DC"
            />
            <path
              d="M 299.820 194 A 100 100 0 1 0 299.820 206 L 279.775 206 A 80 80 0 1 1 279.775 194 Z"
              fill="#C97A3B"
            />
          </svg>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: '#ECE6DC',
              letterSpacing: '-0.01em',
            }}
          >
            CineCanon
          </div>
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 88,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            maxWidth: 980,
            color: '#ECE6DC',
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
