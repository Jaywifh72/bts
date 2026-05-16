import { ImageResponse } from 'next/og';

/**
 * iOS home-screen icon. Next 16's file-based apple-icon convention
 * doesn't accept .svg (only .ico/.jpg/.jpeg/.png), so we rasterise
 * the brand mark at build time via Satori. 180×180 is Apple's
 * recommended size; the OS scales down for older device classes.
 *
 * Apple doesn't auto-mask transparency on home-screen icons, so the
 * ink background is required. 10% safe-area inset matches Apple HIG.
 */
export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0E0E0E',
        }}
      >
        {/* Mark scaled into ~80% of the tile (Apple HIG safe area). */}
        <svg
          width="144"
          height="144"
          viewBox="0 0 400 400"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 359.687 190 A 160 160 0 1 0 359.687 210 L 319.583 210 A 120 120 0 1 1 319.583 190 Z"
            fill="#ECE6DC"
          />
          <path
            d="M 299.820 194 A 100 100 0 1 0 299.820 206 L 279.775 206 A 80 80 0 1 1 279.775 194 Z"
            fill="#C97A3B"
          />
        </svg>
      </div>
    ),
    {
      ...size,
      headers: {
        'Cache-Control': 'public, s-maxage=31536000, immutable',
      },
    },
  );
}
