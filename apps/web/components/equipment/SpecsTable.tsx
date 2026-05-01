import { validateSpecs } from '@bts/db/schema/specs';

interface SpecsTableProps {
  category: string;
  specs: unknown;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function SpecsTable({ category, specs }: SpecsTableProps) {
  let parsed: Record<string, unknown>;
  try {
    parsed = validateSpecs(category, specs) as Record<string, unknown>;
  } catch {
    parsed = (typeof specs === 'object' && specs !== null)
      ? specs as Record<string, unknown>
      : {};
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) return null;

  const knownKeys = new Set(Object.keys(parsed));
  const rawEntries = typeof specs === 'object' && specs !== null
    ? Object.entries(specs as Record<string, unknown>)
    : [];
  const unknownEntries = rawEntries.filter(([k]) => !knownKeys.has(k));

  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Spec</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value], i) => (
            <tr key={key} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
              <td className="px-3 py-2 text-zinc-400">{key.replace(/_/g, ' ')}</td>
              <td className="px-3 py-2 text-zinc-200">{formatValue(value)}</td>
            </tr>
          ))}
          {unknownEntries.map(([key, value], i) => (
            <tr key={`unknown-${key}`} className={(entries.length + i) % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
              <td className="px-3 py-2 text-zinc-500">{key.replace(/_/g, ' ')}</td>
              <td className="px-3 py-2 text-zinc-500">{formatValue(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
