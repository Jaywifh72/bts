import { NextResponse } from 'next/server';

/**
 * Pure passthrough. All auth gating lives in server components:
 *   - /account/page.tsx redirects on null session
 *   - /admin/(authenticated)/layout.tsx enforces role
 *
 * We don't wrap with NextAuth here because (a) the Drizzle adapter
 * needs Node runtime and middleware runs on Edge, so session lookups
 * always return null in middleware regardless, and (b) the wrapper
 * adds latency for no gain. Page-level redirects handle all cases.
 */
export default function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
