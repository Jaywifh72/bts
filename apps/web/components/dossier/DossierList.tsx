import Link from 'next/link';

export type DossierListRow = {
  slug: string;
  headline: string;
  lead_credit: string | null;
  production_slug: string;
  production_title: string;
  release_year: number | null;
  summary: string | null;
};

export function DossierList({ basePath, rows }: { basePath: string; rows: DossierListRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">No dossiers yet — table not migrated on this environment.</p>;
  }
  return (
    <ul className="space-y-2 text-sm">
      {rows.map((r) => (
        <li key={r.slug} className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-xs text-zinc-500">{r.release_year ?? '—'}</span>
            <Link href={`${basePath}/${r.slug}`} className="font-serif text-zinc-100 hover:text-amber-400">{r.headline}</Link>
            <span className="text-xs text-zinc-500">
              — <Link href={`/films/${r.production_slug}`} className="hover:text-amber-400">{r.production_title}</Link>
            </span>
            {r.lead_credit && <span className="ml-auto text-[11px] text-zinc-500">{r.lead_credit}</span>}
          </div>
          {r.summary && (
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{r.summary.split('\n\n')[0]?.slice(0, 220)}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
