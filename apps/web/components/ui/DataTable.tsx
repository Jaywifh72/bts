interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  emptyMessage = 'No data.',
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-3 py-2 text-left font-medium text-zinc-400"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={`px-3 py-2 text-zinc-200 ${col.className ?? ''}`}
                >
                  {col.render
                    ? col.render(row)
                    : String(row[col.key as keyof T] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
