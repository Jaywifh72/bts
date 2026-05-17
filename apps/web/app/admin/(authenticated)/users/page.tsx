import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { asc } from 'drizzle-orm';
import { db, users, accounts } from '@bts/db';
import { safeAuth } from '@/lib/safe-auth';
import { UserRoleSelect } from './UserRoleSelect';

export const metadata: Metadata = {
  title: 'User Management',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Role = 'admin' | 'super_user' | 'premium' | 'standard';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  super_user: 'Super User',
  premium: 'Premium',
  standard: 'Standard',
};

const ROLE_PILL_CLASS: Record<Role, string> = {
  admin: 'bg-amber-600 text-zinc-950',
  super_user: 'bg-amber-900/60 text-amber-200',
  premium: 'bg-zinc-700 text-zinc-100',
  standard: 'bg-zinc-800 text-zinc-300',
};

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function AdminUsersPage() {
  // Belt-and-braces: the (authenticated) layout already enforces this,
  // but this page is admin-only (not super_user) so double-check here.
  const session = await safeAuth();
  if (session?.user?.role !== 'admin') redirect('/');

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.email));

  const providerRows = await db
    .select({ userId: accounts.userId, provider: accounts.provider })
    .from(accounts);

  const providersByUser = new Map<string, string[]>();
  for (const p of providerRows) {
    const list = providersByUser.get(p.userId) ?? [];
    list.push(p.provider);
    providersByUser.set(p.userId, list);
  }

  const selfId = session.user.id;
  const adminCount = rows.filter((r) => r.role === 'admin').length;

  return (
    <div>
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-2xl text-zinc-50">User Management</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {rows.length} user{rows.length === 1 ? '' : 's'} · {adminCount} admin
            {adminCount === 1 ? '' : 's'}
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
          No users yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/80 text-left text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">User</th>
                <th scope="col" className="px-4 py-3 font-medium">Providers</th>
                <th scope="col" className="px-4 py-3 font-medium">Joined</th>
                <th scope="col" className="px-4 py-3 font-medium">Current role</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Change role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map((u) => {
                const isSelf = u.id === selfId;
                const providers = providersByUser.get(u.id) ?? [];
                return (
                  <tr key={u.id} className="hover:bg-zinc-900/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.image}
                            alt=""
                            className="h-8 w-8 rounded-full ring-1 ring-zinc-800"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-50">
                            {(u.name ?? u.email)[0]?.toUpperCase() ?? '?'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-zinc-50">
                            {u.name ?? '—'}
                            {isSelf && (
                              <span className="ml-2 text-xs text-zinc-500">(you)</span>
                            )}
                          </div>
                          <div className="truncate text-xs text-zinc-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {providers.length === 0
                        ? '—'
                        : providers.map((p) => (
                            <span
                              key={p}
                              className="mr-1 inline-block rounded bg-zinc-800 px-1.5 py-0.5 capitalize"
                            >
                              {p}
                            </span>
                          ))}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${ROLE_PILL_CLASS[u.role as Role]}`}
                      >
                        {ROLE_LABEL[u.role as Role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <UserRoleSelect userId={u.id} currentRole={u.role as Role} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-500">
        Role changes save immediately. You can't demote yourself if you're the
        last admin.
      </p>
    </div>
  );
}
