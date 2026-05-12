import type { Metadata } from 'next';
import { login } from './actions';
import { safeAdminNextPath } from '@/lib/admin';

export const metadata: Metadata = {
  title: 'Admin Login',
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: { next?: string; error?: string };
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid: 'Invalid token. Try again.',
  server_misconfigured:
    'ADMIN_TOKEN is not set on the server. Set it in apps/web/.env.local and restart.',
};

export default function AdminLoginPage({ searchParams }: Props) {
  const next = safeAdminNextPath(searchParams.next);
  const errorMessage = searchParams.error ? ERROR_MESSAGES[searchParams.error] : null;

  return (
    <div className="mx-auto mt-24 max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-lg">
      <h1 className="mb-1 font-serif text-2xl">Admin</h1>
      <p className="mb-6 text-sm text-zinc-400">
        Enter the admin token to access the review UI.
      </p>

      {errorMessage && (
        <div className="mb-4 rounded border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <form action={login} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="token" className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
            Token
          </label>
          <input
            id="token"
            name="token"
            type="password"
            autoFocus
            autoComplete="off"
            required
            className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm focus:border-amber-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded bg-amber-600 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-500"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
