import { NextResponse, type NextRequest } from 'next/server';

/**
 * Gate /admin/* on a single shared token stored in the ADMIN_TOKEN env var.
 * The login page itself (/admin/login) is exempt so users can authenticate.
 *
 * This is intentionally minimal — full multi-user auth is sub-project 6.
 * For now this protects the single-operator review UI from drive-by access.
 *
 * The middleware runs on the Edge runtime where node:crypto is not available,
 * so we use a manual constant-time XOR rather than Buffer.timingSafeEqual.
 * (The login action in admin/login/actions.ts is server-only and uses
 *  timingSafeEqual proper — both paths are time-safe.)
 */
function tokensMatch(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) {
    // Still walk the longer string so length comparison doesn't leak.
    let diff = 1;
    const longer = expected.length > provided.length ? expected : provided;
    for (let i = 0; i < longer.length; i++) diff |= longer.charCodeAt(i) ^ 0;
    return diff === 0;
  }
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export function proxy(req: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  const provided = req.cookies.get('admin_token')?.value;

  if (!expected || !provided || !tokensMatch(provided, expected)) {
    const url = new URL('/admin/login', req.url);
    url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Match every /admin/* path EXCEPT /admin/login (login can't require auth).
  matcher: ['/admin/((?!login).*)'],
};
