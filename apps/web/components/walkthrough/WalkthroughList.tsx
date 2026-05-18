import Link from 'next/link';

export type WalkthroughListRow = {
  slug: string;
  headline: string;
  scene_label: string | null;
  lead_credit: string | null;
  duration_s: number | null;
  production_slug: string;
  production_title: string;
  release_year: number | null;
  summary: string | null;
  tags: string[];
};

function fmtDuration(s: number | null): string {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${r}s`;
}

export function WalkthroughList({ rows }: { rows: WalkthroughListRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">No walkthroughs yet — table not migrated on this environment.</p>;
  }
  return (
    <ul className="space-y-2 text-sm">
      {rows.map((r) => (
        <li key={r.slug} className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-xs text-zinc-500">{r.release_year ?? '—'}</span>
            <Link href={`/walkthroughs/${r.slug}`} className="font-serif text-zinc-100 hover:text-amber-400">{r.headline}</Link>
            <span className="text-xs text-zinc-500">
              — <Link href={`/films/${r.production_slug}`} className="hover:text-amber-400">{r.production_title}</Link>
            </span>
            <span className="ml-auto flex items-baseline gap-3 text-[11px]">
              {r.duration_s && <span className="font-mono text-zinc-500">{fmtDuration(r.duration_s)}</span>}
              {r.lead_credit && <span className="text-zinc-500">{r.lead_credit}</span>}
            </span>
          </div>
          {r.summary && (
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{r.summary.split('\n\n')[0]?.slice(0, 220)}</p>
          )}
          {r.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
              {r.tags.map((t) => (
                <span key={t} className="rounded border border-zinc-800 px-1.5 py-0.5 text-zinc-500">{t}</span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
