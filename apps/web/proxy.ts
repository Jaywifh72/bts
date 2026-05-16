import NextAuth from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from './auth.config';

/**
 * Combined edge proxy for two access-gates:
 *
 *  1. `/admin/*` — gated by a shared ADMIN_TOKEN cookie (single-operator
 *     review UI, see admin/login/actions.ts for the server-side login).
 *  2. `/account/*` — gated by Auth.js session via the `authorized`
 *     callback in `auth.config.ts` (redirects to `/signin`).
 *
 * Both run in the Edge runtime, so node:crypto is not available — the
 * admin token comparison uses a manual constant-time XOR.
 */

function tokensMatch(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) {
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

function adminGate(req: NextRequest): NextResponse | null {
  const path = req.nextUrl.pathname;
  if (!path.startsWith('/admin') || path.startsWith('/admin/login')) return null;

  const expected = process.env.ADMIN_TOKEN;
  const provided = req.cookies.get('admin_token')?.value;
  if (!expected || !provided || !tokensMatch(provided, expected)) {
    const url = new URL('/admin/login', req.url);
    url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return null;
}

const { auth: withAuth } = NextAuth(authConfig);

// `withAuth` wraps the handler so Auth.js can attach session info to
// `req.auth` and apply the `authorized` callback for /account/* — the
// inner handler still runs the admin gate for /admin/*.
export default withAuth((req) => {
  const adminRedirect = adminGate(req as unknown as NextRequest);
  if (adminRedirect) return adminRedirect;
  return NextResponse.next();
});

export const config = {
  // Skip Next internals, static files, and auth itself.
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
