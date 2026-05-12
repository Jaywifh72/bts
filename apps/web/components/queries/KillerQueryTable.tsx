import type { ReactNode } from 'react';

/**
 * Generic over the row shape so call-sites don't need `as unknown as
 * Record<string, unknown>[]` casts. Most consumers pass the result of a
 * `db.execute<RowShape>(...)` call directly.
 */
export interface Column<TRow extends object = Record<string, unknown>> {
  key: keyof TRow & string;
  header: string;
  render: (row: TRow) => ReactNode;
}

export interface KillerQueryTableProps<TRow extends object = Record<string, unknown>> {
  columns: Column<TRow>[];
  rows: readonly TRow[];
  emptyMessage?: string;
}

export function KillerQueryTable<TRow extends object>({
  columns,
  rows,
  emptyMessage = 'No results.',
}: KillerQueryTableProps<TRow>) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-left font-medium text-zinc-400">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-zinc-200">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
