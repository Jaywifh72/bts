import Link from 'next/link';
import Image from 'next/image';
import { FormatBadge } from '@/components/productions/FormatBadge';
import { posterUrl } from '@/lib/tmdb-image';

interface FilmographyRow {
  production_slug: string;
  production_title: string;
  release_year: number | null;
  production_type: string;
  role_name: string;
  role_category: string;
  credit_name_override: string | null;
  primary_aspect_ratio: string | null;
  primary_acquisition_format: string | null;
  poster_path?: string | null;
}

export function FilmographyTable({ rows }: { rows: FilmographyRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-zinc-500">No credits found.</p>;

  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            <th className="w-10 px-3 py-2"></th>
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Production</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Year</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Role</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Format</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const poster = posterUrl(row.poster_path, 'w154');
            return (
              <tr key={`${row.production_slug}-${row.role_name}-${i}`} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
                <td className="px-3 py-2">
                  <Link href={`/films/${row.production_slug}`} className="block">
                    <div
                      className="relative h-9 w-6 overflow-hidden rounded bg-zinc-800"
                      style={{ aspectRatio: '2/3' }}
                    >
                      {poster && (
                        <Image src={poster} alt="" fill sizes="24px" className="object-cover" />
                      )}
                    </div>
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/films/${row.production_slug}`} className="text-zinc-200 hover:text-amber-400">
                    {row.production_title}
                  </Link>
                </td>
                <td className="px-3 py-2 tabular-nums text-zinc-400">
                  {row.release_year ?? '—'}
                </td>
                <td className="px-3 py-2 text-zinc-400">
                  {row.credit_name_override
                    ? `${row.role_name} (as ${row.credit_name_override})`
                    : row.role_name}
                </td>
                <td className="px-3 py-2">
                  {row.primary_aspect_ratio && row.primary_acquisition_format
                    ? <FormatBadge format={{ aspect_ratio: row.primary_aspect_ratio, acquisition_format: row.primary_acquisition_format }} />
                    : <span className="text-zinc-600">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
