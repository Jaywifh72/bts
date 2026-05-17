import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, users, accounts, sessions, verificationTokens } from '@bts/db';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Drizzle table column types are structurally compatible with the adapter
  // at runtime but don't satisfy its strict generic constraints under TS
  // strict mode + the v5 beta adapter typings. Documented workaround:
  // https://github.com/nextauthjs/next-auth/issues/9493
  // Remove these casts once the adapter ships typings that accept the
  // post-Drizzle-0.30 column shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: DrizzleAdapter(db as any, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any),
  session: { strategy: 'database' },
  callbacks: {
    ...authConfig.callbacks,
    // Adapter does not populate session.user.id by default.
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
