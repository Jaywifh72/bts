import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';

/**
 * Edge-safe portion. NO database imports — loaded by middleware.ts
 * which runs on the Edge runtime. The full config in `auth.ts` spreads
 * this and adds the Drizzle adapter + DB-only callbacks.
 */
export const authConfig = {
  providers: [
    Google({ allowDangerousEmailAccountLinking: true }),
    GitHub({}), // default: no auto-link (see spec rationale)
  ],
  pages: {
    signIn: '/signin',
  },
  // No `authorized` callback — database sessions can't be read in
  // middleware (the Drizzle adapter needs Node, middleware runs Edge),
  // so `auth.user` is always null there and any check redirects logged-in
  // users in error. Auth gating lives in server components instead:
  //   - /account/page.tsx redirects on null session
  //   - /admin/(authenticated)/layout.tsx enforces role
  callbacks: {},
} satisfies NextAuthConfig;
