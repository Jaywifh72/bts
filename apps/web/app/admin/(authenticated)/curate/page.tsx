import type { Metadata } from 'next';
import Link from 'next/link';
import { ENTITIES } from '@/lib/admin/entity-registry';
import { countEntities } from '@/lib/admin/entity-inserters';

export const metadata: Metadata = {
  title: 'Curate',
  robots: { index: false, follow: false },
};

const TABLE_BY_TYPE: Record<string, string> = {
  'vfx-house': 'vfx_houses',
  'stunt-company': 'stunt_companies',
  'stunt-rigging': 'stunt_rigging_techniques',
  'safety-bulletin': 'safety_bulletins',
};

export default async function AdminCurateLandingPage() {
  const counts = await countEntities();

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-2xl text-zinc-50">Curate</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Hand-crafted creation forms for the editorial entities the
          site is built around. Each form mirrors the public schema:
          identification → editorial prose → structured fields →
          references. Idempotent enough that re-submitting with the
          same slug is a clear failure rather than a silent overwrite.
        </p>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        {ENTITIES.map((e) => {
          const tableName = TABLE_BY_TYPE[e.type];
          const count = tableName ? counts[tableName] ?? 0 : 0;
          return (
            <Link
              key={e.type}
              href={`/admin/curate/new/${e.type}`}
              className="group flex items-start gap-4 rounded border border-zinc-800 bg-zinc-900/40 p-4 hover:border-amber-700/50 hover:bg-amber-950/10 transition-colors"
            >
              <div className="shrink-0 rounded border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-center">
                <div className="font-serif text-2xl text-zinc-100 group-hover:text-amber-400">
                  {count.toLocaleString()}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {e.pluralLabel}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-base text-zinc-100 group-hover:text-amber-400">
                  + New {e.label.toLowerCase()}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  {e.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] uppercase tracking-wide text-zinc-500">
                  <span>
                    Identification · {e.identification.length}
                  </span>
                  <span>Editorial · {e.editorial.length}</span>
                  <span>Structured · {e.structured.length}</span>
                  <span>JSONB · {e.jsonb.length}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <aside className="mt-10 rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-500">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-400">
          Coverage
        </p>
        Phase 7.2 covers four high-leverage entity types. Forms for
        stunt schools, equipment manufacturers, equipment series,
        equipment items, and post-production houses come next — each
        is a one-config-block + one-inserter-function addition rather
        than a separate page build.
      </aside>
    </div>
  );
}
