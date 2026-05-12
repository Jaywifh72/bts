import { NextResponse, type NextRequest } from 'next/server';
import {
  db,
  getProductionWithFullDetail,
  getPersonBySlug,
  getPersonFilmography,
} from '@bts/db';
import { siteUrl, absoluteUrl } from '@/lib/site';
import { posterUrl, profileUrl } from '@/lib/tmdb-image';
import { pickPrimaryRole } from '@/lib/primary-role';

/**
 * E-39 — oEmbed provider. Notion, Slack, Discord, Linear, Apple
 * Messages, and a long tail of consumers auto-detect oEmbed via the
 * `<link rel="alternate" type="application/json+oembed" href="...">` tag
 * on each page (added per-route in generateMetadata).
 *
 * Spec: https://oembed.com/. We return `type='link'` payloads — they
 * render as rich cards everywhere without giving consumers an iframe
 * surface (which sandboxes our typography and we'd lose the brand
 * voice anyway).
 *
 * 1-hour edge cache: cards rarely change after curation, and Slack
 * etc. cache aggressively client-side anyway.
 */

export const runtime = 'nodejs';
export const revalidate = 3600;

function parseTargetUrl(raw: string | null): { kind: 'film' | 'crew'; slug: string } | null {
  if (!raw) return null;
  // Accept either a fully-qualified URL (what Slack/Notion send after
  // resolving the autodiscovery link) or a root-relative path (what
  // the autodiscovery link itself contains, since generateMetadata
  // emits relative paths). Absolutize relative inputs against our
  // own origin so the host check below still applies.
  const base = siteUrl();
  let parsed: URL;
  try {
    parsed = new URL(raw, base);
  } catch {
    return null;
  }
  // Restrict to our own origin to avoid being weaponised as a SSRF or
  // open metadata-resolver service.
  const ours = new URL(base);
  if (parsed.host !== ours.host && parsed.host !== 'localhost:3000') return null;

  const m = /^\/(films|crew)\/([a-z0-9-]+)\/?$/.exec(parsed.pathname);
  if (!m) return null;
  return { kind: m[1] === 'films' ? 'film' : 'crew', slug: m[2]! };
}

async function buildFilmPayload(slug: string) {
  const data = await getProductionWithFullDetail(db, slug);
  if (!data) return null;
  const dp = data.crew.find((c) => c.role_slug === 'director-of-photography');
  const director = data.crew.find((c) => c.role_slug === 'director');
  const titleWithYear = data.production.release_year
    ? `${data.production.title} (${data.production.release_year})`
    : data.production.title;
  const author = dp ?? director ?? null;
  return {
    version: '1.0',
    type: 'link',
    title: titleWithYear,
    author_name: author?.display_name ?? null,
    author_url: author ? absoluteUrl(`/crew/${author.person_slug}`) : null,
    provider_name: 'Studio Pro',
    provider_url: siteUrl(),
    thumbnail_url: posterUrl(data.production.poster_path, 'w342') ?? null,
    thumbnail_width: data.production.poster_path ? 342 : null,
    thumbnail_height: data.production.poster_path ? 513 : null,
  };
}

async function buildCrewPayload(slug: string) {
  const [person, filmography] = await Promise.all([
    getPersonBySlug(db, slug),
    getPersonFilmography(db, slug),
  ]);
  if (!person) return null;
  const primaryRole = pickPrimaryRole(filmography);
  return {
    version: '1.0',
    type: 'link',
    title: primaryRole ? `${person.display_name} — ${primaryRole}` : person.display_name,
    author_name: person.display_name,
    author_url: absoluteUrl(`/crew/${person.slug}`),
    provider_name: 'Studio Pro',
    provider_url: siteUrl(),
    thumbnail_url: profileUrl(person.profile_path, 'w185') ?? null,
    thumbnail_width: person.profile_path ? 185 : null,
    thumbnail_height: person.profile_path ? 278 : null,
  };
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const target = parseTargetUrl(url);
  if (!target) {
    return NextResponse.json({ error: 'invalid_or_unsupported_url' }, { status: 404 });
  }

  const payload =
    target.kind === 'film'
      ? await buildFilmPayload(target.slug)
      : await buildCrewPayload(target.slug);

  if (!payload) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
