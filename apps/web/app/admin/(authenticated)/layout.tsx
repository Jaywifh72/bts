import Link from 'next/link';
import { logout } from '../login/actions';

/**
 * Layout for protected admin pages. The login page sits outside this route
 * group so it isn't wrapped by the admin chrome / logout button.
 */
export default function AdminAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-6 -my-8">
      <div className="border-b border-amber-900/40 bg-zinc-900/60">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="rounded bg-amber-600 px-2 py-0.5 text-xs font-bold text-zinc-950">
              ADMIN
            </span>
            <Link
              href="/admin/videos"
              className="text-sm text-zinc-300 hover:text-zinc-50"
            >
              Videos
            </Link>
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
              ← Back to site
            </Link>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
      <div className="mx-auto max-w-screen-2xl px-6 py-6">{children}</div>
    </div>
  );
}
