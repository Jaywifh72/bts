import Link from 'next/link';
import { FormatBadge } from '@/components/productions/FormatBadge';

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
}

export function FilmographyTable({ rows }: { rows: FilmographyRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-zinc-500">No credits found.</p>;

  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Production</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Year</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Role</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Format</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
