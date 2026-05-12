import type { Metadata } from 'next';
import Link from 'next/link';
import { findDuplicateCandidates } from '@/lib/admin/health-queries';

export const metadata: Metadata = {
  title: 'Duplicate candidates',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function similarityBadge(s: number): string {
  if (s >= 0.85) return 'bg-red-700 text-red-50';
  if (s >= 0.65) return 'bg-amber-600 text-zinc-950';
  return 'bg-zinc-700 text-zinc-200';
}

export default async function AdminDuplicatesPage() {
  const pairs = await findDuplicateCandidates();

  // Bucket by table for the section headers.
  const byTable = new Map<string, typeof pairs>();
  for (const p of pairs) {
    const list = byTable.get(p.table_name) ?? [];
    list.push(p);
    byTable.set(p.table_name, list);
  }

  return (
    <div>
      <nav className="mb-6 text-xs uppercase tracking-wide text-zinc-500">
        <Link href="/admin/health" className="hover:text-amber-400">Health</Link>
        <span className="mx-2 text-zinc-700">/</span>
        <span className="text-zinc-300">Duplicate candidates</span>
      </nav>

      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-2xl text-zinc-50">Duplicate candidates</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Pairs of rows whose names match by trigram similarity above
            the per-table threshold. The Wētā FX situation surfaces
            here before it bites — rather than after a credit redirect
            takes 80 lines of SQL to fix.
          </p>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <div className="font-mono text-zinc-300">{pairs.length}</div>
          <div className="text-[10px] uppercase tracking-wide">Pairs surfaced</div>
        </div>
      </header>

      {pairs.length === 0 ? (
        <div className="rounded border border-emerald-900/40 bg-emerald-950/10 p-8 text-center">
          <p className="font-serif text-lg text-emerald-300">
            No duplicate candidates detected.
          </p>
          <p className="mt-1 text-sm text-emerald-400/70">
            Editorial tables are clean.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {[...byTable.entries()].map(([tableName, items]) => (
            <section key={tableName}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  {items[0]!.table_label}
                </h2>
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {items.length} {items.length === 1 ? 'pair' : 'pairs'}
                </span>
              </div>
              <ul className="space-y-2">
                {items.map((p, i) => {
                  const aHref = `${p.public_route_prefix}/${p.a_slug}`;
                  const bHref = `${p.public_route_prefix}/${p.b_slug}`;
                  return (
                    <li
                      key={`${tableName}-${i}-${p.a_slug}-${p.b_slug}`}
                      className="rounded border border-zinc-800 bg-zinc-900/40 p-3"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${similarityBadge(p.similarity)}`}
                            title="Trigram similarity"
                          >
                            {(p.similarity * 100).toFixed(0)}%
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                            similar
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <div className="rounded border border-zinc-800 bg-zinc-950/40 p-2">
                          <Link href={aHref} className="block text-sm text-zinc-100 hover:text-amber-400">
                            {p.a_name}
                          </Link>
                          <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] uppercase tracking-wide text-zinc-500">
                            <span className="font-mono text-zinc-400">{p.a_slug}</span>
                            {p.a_country && <span>{p.a_country}</span>}
                            {p.a_year && <span>est. {p.a_year}</span>}
                            {p.a_credits > 0 && <span>{p.a_credits} credits</span>}
                          </div>
                        </div>
                        <div className="rounded border border-zinc-800 bg-zinc-950/40 p-2">
                          <Link href={bHref} className="block text-sm text-zinc-100 hover:text-amber-400">
                            {p.b_name}
                          </Link>
                          <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] uppercase tracking-wide text-zinc-500">
                            <span className="font-mono text-zinc-400">{p.b_slug}</span>
                            {p.b_country && <span>{p.b_country}</span>}
                            {p.b_year && <span>est. {p.b_year}</span>}
                            {p.b_credits > 0 && <span>{p.b_credits} credits</span>}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <aside className="mt-12 rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-500">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-400">
          Method
        </p>
        Pairs are scored with Postgres <code className="font-mono text-zinc-400">pg_trgm.similarity()</code>{' '}
        against the row’s primary name field. Thresholds are
        per-table: editorial entities at 0.45, productions at 0.85,
        people at 0.7. Merge UI is a follow-up phase — for now this
        is a detection-only view that lets you spot collisions early
        and fix them via the existing SQL paths.
      </aside>
    </div>
  );
}
