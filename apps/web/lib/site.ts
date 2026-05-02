/**
 * Centralized base URL for the deployed site. Used by sitemap, robots,
 * canonical links, JSON-LD `@id`/`url`, and OpenGraph image URLs.
 *
 * Set NEXT_PUBLIC_SITE_URL to the production origin (no trailing slash) in
 * production. Falls back to the local dev port for development.
 *
 * Env var is NEXT_PUBLIC_* so it's inlined at build time and usable from
 * both server and client components.
 */
const FALLBACK = 'http://localhost:3000';

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return FALLBACK;
  return raw.replace(/\/+$/, '');
}

/** Builds an absolute URL by joining a path onto the site origin. */
export function absoluteUrl(path: string): string {
  const base = siteUrl();
  if (!path.startsWith('/')) return `${base}/${path}`;
  return `${base}${path}`;
}
