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

// Auth.js is initialised only if AUTH_SECRET is configured. Without it,
// `auth()` throws at request time — for environments where Auth.js
// isn't set up (CI test runs, missing config), fall back to the admin
// gate alone so the rest of the site keeps serving.
const authEnabled = !!process.env.AUTH_SECRET;
const withAuth = authEnabled ? NextAuth(authConfig).auth : null;

const handler = (req: NextRequest) => {
  const adminRedirect = adminGate(req);
  if (adminRedirect) return adminRedirect;
  return NextResponse.next();
};

// When auth is enabled: wrap with NextAuth so /account/* is gated.
// When disabled: plain handler — /account/* will render the page-level
// redirect, which is also fine (page reads safeAuth → null → redirect).
export default authEnabled
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  ? withAuth!((req) => handler(req as unknown as NextRequest))
  : handler;

export const config = {
  // Skip Next internals, static files, and auth itself.
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
