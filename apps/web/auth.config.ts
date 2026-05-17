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
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const protectedPath = request.nextUrl.pathname.startsWith('/account');
      if (protectedPath) return isLoggedIn;
      return true;
    },
  },
} satisfies NextAuthConfig;
