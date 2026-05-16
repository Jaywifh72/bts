import type { Metadata } from 'next';
import Link from 'next/link';
import { KILLER_QUERIES } from '@/lib/queries-index';

export const metadata: Metadata = {
  title: 'Killer queries',
  description:
    'Hand-picked queries that demonstrate what the CineCanon archive can answer once the data is in shape. Each one cross-cuts crews, gear, productions, or scenes in a way that would be tedious-to-impossible elsewhere.',
};

const QUERIES = KILLER_QUERIES;

export default function QueriesIndexPage() {
  return (
    <>
      <header className="mb-10">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Archive</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">Killer queries</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Hand-picked queries that demonstrate what the CineCanon archive can answer
          once the data is in shape. Each cross-cuts crew, gear, productions, or scenes
          in a way that would be tedious-to-impossible elsewhere on the open web.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {QUERIES.map((q) => (
          <li key={q.slug}>
            <Link
              href={`/queries/${q.slug}`}
              className="group block h-full rounded border border-zinc-800 bg-zinc-900/40 p-5 transition-colors hover:border-amber-500/60"
            >
              <h2 className="font-serif text-lg text-zinc-100 group-hover:text-amber-400">
                {q.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {q.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {q.crossCuts.map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 max-w-2xl text-xs leading-relaxed text-zinc-500">
        These three are the canonical demo set. As the archive grows we&apos;ll add more
        — lighting-by-decade, doublings cross-tabbed by stunt coordinator,
        post-house churn by colourist, etc. The query templates live in
        <code className="ml-1 font-mono text-zinc-400">packages/db/src/queries/killer-queries.ts</code>.
      </p>
    </>
  );
}
