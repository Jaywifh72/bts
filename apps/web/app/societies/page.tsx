import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listSocietiesWithCounts } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';

export const metadata: Metadata = {
  title: 'Cinematography societies',
  description:
    'Browse cinematography societies and the directors of photography credited as members — ASC, BSC, AFC, ACS, CSC, AIC, and more. Society membership is the most-cited credential in DP signatures.',
};

// Hourly revalidate — member counts only change when a curated DP row
// is added or its memberSocieties array is edited.
export const revalidate = 3600;

export default async function SocietiesIndexPage() {
  const societies = await listSocietiesWithCounts(db);

  const totalMembers = societies.reduce((sum, s) => sum + s.member_count, 0);
  const withMembers = societies.filter((s) => s.member_count > 0);

  return (
    <article>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Reference</p>
        <h1 className="mt-1 font-serif text-4xl text-zinc-50">
          Cinematography societies
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-400">
          Honorary professional societies for directors of photography. Membership
          is the most-cited credential in DP signatures — &ldquo;Roger Deakins
          ASC BSC&rdquo; — and tracks who the working DPs of each region recognise
          as their own. CineCanon currently tracks{' '}
          <span className="text-zinc-200">
            {totalMembers} member{totalMembers === 1 ? '' : 's'}
          </span>{' '}
          across{' '}
          <span className="text-zinc-200">
            {withMembers.length} {withMembers.length === 1 ? 'society' : 'societies'}
          </span>{' '}
          (of {societies.length} catalogued).
        </p>
      </header>

      <SectionHeader
        label="Index"
        heading={`Societies · ${societies.length}`}
      />
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {societies.map((s) => (
          <li key={s.slug}>
            <Link
              href={`/societies/${s.slug}`}
              className="group block rounded border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-600"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-serif text-lg text-zinc-100 group-hover:text-amber-400">
                  {s.name}
                </h2>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  {s.member_count} {s.member_count === 1 ? 'member' : 'members'}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-zinc-300">{s.full_name}</p>
              <p className="mt-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
                {s.country && (
                  <span className="rounded border border-zinc-800 px-1.5 py-0.5 font-mono text-[10px]">
                    {s.country}
                  </span>
                )}
                {s.founded_year && <span>Est. {s.founded_year}</span>}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
