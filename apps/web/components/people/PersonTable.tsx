import Link from 'next/link';

type Row = {
  slug: string;
  displayName: string;
  primaryRole: string | null;
  nationality: string | null;
  birthYear?: number | null;
  creditCount?: number;
};

export function PersonTable({ rows }: { rows: Row[] }) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="People"
      className="scroll-hint-right overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
    >
      <table className="stack-on-mobile w-full text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-normal">Name</th>
            <th scope="col" className="px-3 py-2 text-left font-normal">Primary role</th>
            <th scope="col" className="px-3 py-2 text-left font-normal">Nationality</th>
            <th scope="col" className="px-3 py-2 text-left font-normal">Born</th>
            <th scope="col" className="px-3 py-2 text-right font-normal">Credits</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug} className="border-b border-zinc-900 hover:bg-zinc-900/40">
              <td data-label="Name" className="px-3 py-2">
                <Link href={`/crew/${r.slug}`} className="text-zinc-100 hover:text-amber-400">
                  {r.displayName}
                </Link>
              </td>
              <td data-label="Primary role" className="px-3 py-2 text-zinc-300">
                {r.primaryRole ?? <span className="text-zinc-500">—</span>}
              </td>
              <td data-label="Nationality" className="px-3 py-2 text-zinc-400">
                {r.nationality ?? <span className="text-zinc-500">—</span>}
              </td>
              <td data-label="Born" className="px-3 py-2 font-mono tabular-nums text-zinc-400">
                {r.birthYear ?? <span className="text-zinc-500">—</span>}
              </td>
              <td data-label="Credits" className="px-3 py-2 text-right font-mono tabular-nums text-zinc-300">
                {r.creditCount ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
