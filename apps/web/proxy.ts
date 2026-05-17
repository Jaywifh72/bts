import NextAuth from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from './auth.config';

/**
 * Combined edge proxy for two access-gates:
 *
 *  1. `/admin/*` — gated by EITHER:
 *       a) Auth.js session whose email is listed in AUTH_ADMIN_EMAILS
 *          (comma-separated, case-insensitive), OR
 *       b) shared ADMIN_TOKEN cookie (legacy single-operator review UI).
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

function getAdminEmails(): Set<string> {
  const raw = process.env.AUTH_ADMIN_EMAILS ?? '';
  return new Set(
    raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
  );
}

type ReqWithAuth = NextRequest & { auth?: { user?: { email?: string | null } } | null };

function adminGate(req: ReqWithAuth): NextResponse | null {
  const path = req.nextUrl.pathname;
  if (!path.startsWith('/admin') || path.startsWith('/admin/login')) return null;

  // Path A — Auth.js session with allowlisted email.
  const sessionEmail = req.auth?.user?.email?.toLowerCase();
  if (sessionEmail && getAdminEmails().has(sessionEmail)) return null;

  // Path B — legacy shared cookie.
  const expected = process.env.ADMIN_TOKEN;
  const provided = req.cookies.get('admin_token')?.value;
  if (expected && provided && tokensMatch(provided, expected)) return null;

  // Neither — redirect to signin (so an authed user with the wrong email
  // can re-auth with the right one) or admin/login depending on config.
  const dest = sessionEmail ? '/signin' : '/admin/login';
  const url = new URL(dest, req.url);
  url.searchParams.set(dest === '/signin' ? 'callbackUrl' : 'next', req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

// Auth.js is initialised only if AUTH_SECRET is configured. Without it,
// `auth()` throws at request time — for environments where Auth.js
// isn't set up (CI test runs, missing config), fall back to the legacy
// cookie gate alone so the rest of the site keeps serving.
const authEnabled = !!process.env.AUTH_SECRET;
const withAuth = authEnabled ? NextAuth(authConfig).auth : null;

const handler = (req: ReqWithAuth) => {
  const adminRedirect = adminGate(req);
  if (adminRedirect) return adminRedirect;
  return NextResponse.next();
};

// When auth is enabled: wrap with NextAuth so /account/* is gated AND
// `req.auth` is populated for the admin-email check.
export default authEnabled
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  ? withAuth!((req) => handler(req as unknown as ReqWithAuth))
  : (handler as unknown as (req: NextRequest) => NextResponse | Promise<NextResponse>);

export const config = {
  // Skip Next internals, static files, and auth itself.
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
