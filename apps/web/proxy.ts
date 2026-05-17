import NextAuth from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from './auth.config';

/**
 * Edge proxy: wraps the request with the Auth.js session reader so the
 * `authorized` callback in `auth.config.ts` can gate `/account/*`.
 *
 * `/admin/*` is gated at the (authenticated) layout level, not here —
 * the middleware runtime can't reliably read database-strategy sessions,
 * so role-based access control lives in server components instead. See
 * apps/web/app/admin/(authenticated)/layout.tsx.
 *
 * Auth.js is only initialised when AUTH_SECRET is configured. Without
 * it (CI smoke pack, misconfigured deploys), the request passes through
 * untouched and page-level redirects handle the missing-auth case.
 */
const authEnabled = !!process.env.AUTH_SECRET;

const passthrough = (_req: NextRequest) => NextResponse.next();

export default authEnabled
  ? NextAuth(authConfig).auth(() => NextResponse.next())
  : passthrough;

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
