/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ['@bts/db'],
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
      // Studio Pro own CDN (future)
      { protocol: 'https', hostname: 'cdn.studiopro.example.com' },
    ],
    // Production keyframes can hot-link to publisher CDNs we don't enumerate.
    // The keyframe admin page handles arbitrary URLs that wouldn't pass remotePatterns.
    // Components that need this set `unoptimized` on the Image.
    dangerouslyAllowSVG: false,
  },
};

export default config;
