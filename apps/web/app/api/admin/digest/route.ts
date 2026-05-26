// Weekly-digest endpoint. Called by .github/workflows/seo-digest.yml.
//
// Auth: bearer token via DIGEST_AUTH_TOKEN env var. We don't reuse the
// admin session cookie because GH Actions doesn't have one; a shared
// secret is simpler than provisioning a service-account session.

import { NextResponse, type NextRequest } from 'next/server';
import { buildDigest } from '@/lib/seo-digest';
import { renderDigestMarkdown } from '@/lib/seo-digest-markdown';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const expected = process.env.DIGEST_AUTH_TOKEN;
  if (!expected) {
    return new Response('DIGEST_AUTH_TOKEN not set on server', { status: 503 });
  }
  const got = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (got !== expected) {
    return new Response('forbidden', { status: 403 });
  }

  const format = new URL(req.url).searchParams.get('format') ?? 'markdown';
  const digest = await buildDigest();

  if (format === 'json') {
    return NextResponse.json(digest, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const md = renderDigestMarkdown(digest);
  return new Response(md, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
