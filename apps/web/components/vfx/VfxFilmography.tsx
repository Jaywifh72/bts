import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

interface FilmographyRow {
  production_slug: string;
  production_title: string;
  release_year: number | null;
  role: string;
  shot_count: number | null;
}

export function VfxFilmography({ rows }: { rows: FilmographyRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-px">
      {rows.map((r) => (
        <div
          key={r.production_slug}
          className="flex items-center gap-3 rounded bg-zinc-950 px-3 py-2 text-sm"
        >
          <span className="w-10 shrink-0 text-xs text-zinc-500">{r.release_year ?? '—'}</span>
          <Link href={`/films/${r.production_slug}`} className="flex-1 text-zinc-200 hover:text-amber-400">
            {r.production_title}
          </Link>
          <Badge label={r.role} variant="category" />
          <span className="w-20 text-right text-xs text-zinc-500">
            {r.shot_count != null ? `${r.shot_count.toLocaleString()} shots` : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}
