/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ['@bts/db'],
  // Deploy budget — cap static-page concurrency at build so the
  // build worker doesn't fan ~30 pages × ~19 queries each across a
  // small Postgres connection pool. Vercel's build env + Neon's
  // pooler can absorb more, but pinning this here keeps local
  // builds (Docker pg, 100 conns) honest with prod expectations.
  experimental: {
    workerThreads: false,
    cpus: 2,
  },
  // Next 16+ dev server treats requests to /_next/* as cross-origin unless
  // the Host header matches the server's bound origin. When the dev server
  // binds to `localhost` but the browser hits `127.0.0.1` (Chrome devtools
  // workspace, IDE proxies, lan testing, etc.), every dev resource — JS
  // chunks, HMR websocket, fonts — 403's. The static HTML still renders,
  // which makes the failure look like "hydration is broken" rather than
  // "the React bundle never loaded". Allowlist the common local aliases.
  allowedDevOrigins: ['127.0.0.1', 'localhost', '10.5.0.2'],
  images: {
    remotePatterns: [
      // TMDb CDN — posters and backdrops fetched via lib/tmdb.ts
      { protocol: 'https', hostname: 'image.tmdb.org' },
      // YouTube thumbnails — used by VideoGallery
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      // Wikimedia Commons — license-compatible reference photos
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'commons.wikimedia.org' },
      // Vimeo thumbnails — used by VideoGallery for vimeo-source rows
      { protocol: 'https', hostname: 'i.vimeocdn.com' },
      // CineCanon own CDN (future)
      { protocol: 'https', hostname: 'cdn.cinecanon.com' },
    ],
    // Production keyframes can hot-link to publisher CDNs we don't enumerate.
    // The keyframe admin page handles arbitrary URLs that wouldn't pass remotePatterns.
    // Components that need this set `unoptimized` on the Image.
    dangerouslyAllowSVG: false,
  },
};

export default config;
