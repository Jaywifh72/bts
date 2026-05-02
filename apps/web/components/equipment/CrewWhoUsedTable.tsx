import Link from 'next/link';

type Row = {
  person_slug: string;
  display_name: string;
  role_slug: string;
  role_name: string;
  role_category: string;
  production_count: number;
  scene_count: number;
};

/**
 * Table of camera crew who shot using a given series or item, ranked by
 * production_count. The same person can appear once per role they held
 * (most commonly "Director of Photography" + "First Assistant Camera").
 */
export function CrewWhoUsedTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-500">
        No camera crew yet attributed to this gear.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Crew</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Role</th>
            <th className="px-3 py-2 text-right font-medium text-zinc-400">Productions</th>
            <th className="px-3 py-2 text-right font-medium text-zinc-400">Scenes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={`${r.person_slug}:${r.role_slug}`}
              className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}
            >
              <td className="px-3 py-2">
                <Link
                  href={`/crew/${r.person_slug}`}
                  className="text-zinc-200 hover:text-amber-400"
                >
                  {r.display_name}
                </Link>
              </td>
              <td className="px-3 py-2 text-zinc-400">{r.role_name}</td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-300">
                {r.production_count}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-300">
                {r.scene_count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
