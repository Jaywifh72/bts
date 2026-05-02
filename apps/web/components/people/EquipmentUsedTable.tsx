import Link from 'next/link';

type Row = {
  manufacturer_slug: string;
  manufacturer_name: string;
  series_slug: string;
  series_name: string;
  series_category: string;
  item_slug: string | null;
  item_name: string | null;
  production_count: number;
  scene_count: number;
};

/**
 * Groups equipment-used rows by series so the same series doesn't repeat its
 * header for each item variant. Each series block lists its items inline.
 */
export function EquipmentUsedTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return null;

  // Group by series, preserving the production_count-DESC order from the query.
  const grouped = new Map<string, { meta: Row; items: Row[] }>();
  for (const r of rows) {
    const existing = grouped.get(r.series_slug);
    if (existing) {
      existing.items.push(r);
    } else {
      grouped.set(r.series_slug, { meta: r, items: [r] });
    }
  }

  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Series</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Items</th>
            <th className="px-3 py-2 text-right font-medium text-zinc-400">Productions</th>
            <th className="px-3 py-2 text-right font-medium text-zinc-400">Scenes</th>
          </tr>
        </thead>
        <tbody>
          {[...grouped.values()].map(({ meta, items }, i) => {
            const totalProductions = Math.max(...items.map((it) => it.production_count));
            const totalScenes = items.reduce((s, it) => s + it.scene_count, 0);
            const itemList = items.filter((it) => it.item_slug && it.item_name);
            return (
              <tr key={meta.series_slug} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
                <td className="px-3 py-2">
                  <Link
                    href={`/gear/${meta.manufacturer_slug}/${meta.series_slug}`}
                    className="text-zinc-200 hover:text-amber-400"
                  >
                    {meta.series_name}
                  </Link>
                  <div className="text-xs text-zinc-500">
                    {meta.manufacturer_name} · {meta.series_category.replace(/_/g, ' ')}
                  </div>
                </td>
                <td className="px-3 py-2 text-zinc-400">
                  {itemList.length > 0 ? (
                    <ul className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {itemList.map((it) => (
                        <li key={it.item_slug}>
                          <Link
                            href={`/gear/${it.manufacturer_slug}/${it.series_slug}/${it.item_slug}`}
                            className="text-xs text-zinc-400 hover:text-amber-400"
                          >
                            {it.item_name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-300">
                  {totalProductions}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-300">
                  {totalScenes}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
