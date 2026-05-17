import type { Session } from 'next-auth';

/**
 * Auth.js initialises (and can throw) at MODULE LOAD time when
 * `AUTH_SECRET` is missing in production — i.e. importing `@/auth`
 * crashes before any try/catch wrapping the call site can help. So:
 *
 *  1. Short-circuit when `AUTH_SECRET` is unset (CI smoke pack, misconf
 *     prod deploys) so we never import `@/auth` at all.
 *  2. Lazy `await import('@/auth')` and try/catch the call.
 *
 * The result: every page that reads session for cosmetic state can
 * import `safeAuth` unconditionally; missing auth config simply means
 * "logged out everywhere" instead of "500 on every page".
 *
 * Server actions and the Auth.js route handler keep using `auth()`
 * directly — they SHOULD fail loudly when auth isn't configured.
 */
export async function safeAuth(): Promise<Session | null> {
  if (!process.env.AUTH_SECRET) return null;
  try {
    const { auth } = await import('@/auth');
    const session = await auth();
    // Log session shape in prod so "logged in but safeAuth returned null"
    // diagnoses can be cross-referenced against the request route.
    // eslint-disable-next-line no-console
    console.log(
      '[safeAuth]',
      session
        ? { email: session.user?.email, role: session.user?.role, id: session.user?.id }
        : 'null',
    );
    return session;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[safeAuth] auth() failed; treating as logged out:', err);
    return null;
  }
}
