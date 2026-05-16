import { auth } from '@/auth';
import type { Session } from 'next-auth';

/**
 * `auth()` throws at runtime when AUTH_SECRET is missing or the adapter
 * can't reach Postgres. Crashing every server-rendered page over an
 * optional auth feature is the wrong default — wrap it so missing
 * config / unreachable DB just degrades to "logged out everywhere".
 *
 * Use this in the root layout, BookmarkButton server wrapper, and any
 * other page that reads session for cosmetic state. Keep the unwrapped
 * `auth()` for actions/routes that genuinely require a session (those
 * already throw on `if (!session?.user)`).
 */
export async function safeAuth(): Promise<Session | null> {
  try {
    return await auth();
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[safeAuth] auth() failed; treating as logged out:', err);
    }
    return null;
  }
}
