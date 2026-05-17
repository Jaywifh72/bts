import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, accounts } from '@bts/db';
import { SignOutLink } from './SignOutLink';

export const metadata: Metadata = { title: 'Account' };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin?callbackUrl=/account');

  const linked = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(eq(accounts.userId, session.user.id));

  return (
    <div>
      <h1 className="font-serif text-3xl text-zinc-50">Account</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">Profile</h2>
          <div className="mt-4 flex items-center gap-4">
            {session.user.image && (
              <Image
                src={session.user.image}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-full ring-1 ring-zinc-800"
              />
            )}
            <div>
              <p className="text-zinc-50">{session.user.name ?? '—'}</p>
              <p className="text-sm text-zinc-400">{session.user.email}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">Connected providers</h2>
          <ul className="mt-4 space-y-2 text-sm text-zinc-50">
            {linked.map((a) => (
              <li key={a.provider} className="capitalize">{a.provider}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-8">
        <SignOutLink />
      </div>
    </div>
  );
}
