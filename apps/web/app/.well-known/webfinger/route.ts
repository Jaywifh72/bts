import { db, getPersonBySlug } from '@bts/db';
import { siteUrl } from '@/lib/site';

export const runtime = 'nodejs';
export const revalidate = 3600;

/**
 * E-43 — WebFinger discovery so cinematographer profiles federate.
 * Mastodon / Pixelfed / Lemmy clients hit
 * `/.well-known/webfinger?resource=acct:roger-deakins@studiopro.dev`
 * and expect a JRD payload pointing at the canonical profile URL.
 *
 * We don't currently host ActivityPub actors, so the `self` link
 * uses `application/jrd+json` for the WebFinger record itself and
 * a `profile-page` link points at the human-readable HTML profile.
 * Spec: RFC 7033.
 */

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      // RFC 7033 §10.2: WebFinger payloads use application/jrd+json
      'Content-Type': 'application/jrd+json; charset=utf-8',
      // CORS: WebFinger is universally cross-origin queried.
      'Access-Control-Allow-Origin': '*',
      // Cache for an hour at the CDN; clients also cache.
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const resource = url.searchParams.get('resource');
  if (!resource) {
    return jsonResponse({ error: 'missing resource parameter' }, 400);
  }

  // Expected forms:
  //   acct:slug@host
  //   https://host/crew/slug
  let slug: string | null = null;
  const acctMatch = resource.match(/^acct:([^@]+)@(.+)$/i);
  if (acctMatch) {
    slug = acctMatch[1]!;
  } else {
    try {
      const u = new URL(resource);
      const m = u.pathname.match(/^\/crew\/([a-z0-9-]+)\/?$/);
      if (m) slug = m[1]!;
    } catch {
      // fall through
    }
  }
  if (!slug) {
    return jsonResponse({ error: 'unsupported resource format' }, 400);
  }

  const person = await getPersonBySlug(db, slug);
  if (!person) {
    return jsonResponse({ error: 'not found' }, 404);
  }

  const base = siteUrl();
  const host = base.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const profileUrl = `${base}/crew/${person.slug}`;

  return jsonResponse({
    subject: `acct:${person.slug}@${host}`,
    aliases: [profileUrl],
    links: [
      {
        rel: 'http://webfinger.net/rel/profile-page',
        type: 'text/html',
        href: profileUrl,
      },
      {
        rel: 'self',
        type: 'application/jrd+json',
        href: `${base}/.well-known/webfinger?resource=acct:${person.slug}@${host}`,
      },
    ],
  });
}
