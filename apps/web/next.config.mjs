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
    ],
  },
};

export default config;
