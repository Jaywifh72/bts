import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, users, accounts, sessions, verificationTokens } from '@bts/db';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Drizzle table column types are structurally compatible with the adapter
  // at runtime but don't satisfy its strict generic constraints. Cast to any
  // to bypass — this is the documented workaround for @auth/drizzle-adapter.
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
