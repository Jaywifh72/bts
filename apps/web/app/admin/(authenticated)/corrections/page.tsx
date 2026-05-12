import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listCorrections, type CorrectionStatus } from '@bts/db';
import { CorrectionRow } from '@/components/admin/CorrectionRow';

export const metadata: Metadata = {
  title: 'Corrections',
  robots: { index: false, follow: false },
};

const STATUSES: (CorrectionStatus | 'all')[] = ['open', 'triaged', 'resolved', 'dismissed', 'all'];

type Props = {
  searchParams: { status?: string };
};

function parseStatus(v: string | undefined): CorrectionStatus | 'all' {
  if (v && (STATUSES as string[]).includes(v)) return v as CorrectionStatus | 'all';
  return 'open';
}

export default async function AdminCorrectionsPage({ searchParams }: Props) {
  const status = parseStatus(searchParams.status);
  const rows = await listCorrections(db, { status });

  return (
    <div>
      <header className="mb-4 flex items-baseline justify-between">
        <h1 className="font-serif text-2xl">Corrections</h1>
        <div className="text-sm text-zinc-500">{rows.length} {status}</div>
      </header>

      <nav
        aria-label="Filter corrections"
        className="mb-6 flex flex-wrap gap-2 rounded border border-zinc-800 bg-zinc-900/40 p-2 text-xs"
      >
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === 'open' ? '/admin/corrections' : `/admin/corrections?status=${s}`}
            className={`rounded px-2 py-1 ${
              status === s
                ? 'bg-amber-600 text-zinc-950'
                : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {s}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
          No {status === 'all' ? '' : status} corrections.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => (
            <CorrectionRow key={c.id} correction={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
