import Link from 'next/link';
import { getProductionWithFullDetail } from '@bts/db';
import { FormatBadge } from './FormatBadge';
import { SceneList } from './SceneList';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SourceCitation } from '@/components/ui/SourceCitation';

type DetailData = NonNullable<Awaited<ReturnType<typeof getProductionWithFullDetail>>>;

export function ProductionDetail({ data }: { data: DetailData }) {
  const { production, formats, studios, crew, scenes, productionSources } = data;

  type CrewMember = (typeof crew)[number];
  const crewByCategory = crew.reduce<Record<string, CrewMember[]>>((acc, c) => {
    (acc[c.role_category] ??= []).push(c);
    return acc;
  }, {});

  return (
    <article>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          {production.type} · {production.release_year ?? 'TBD'}
        </p>
        <h1 className="mt-1 font-serif text-4xl text-zinc-50">{production.title}</h1>
        {production.original_title && (
          <p className="mt-1 text-sm text-zinc-500">{production.original_title}</p>
        )}
        {production.synopsis && (
          <p className="mt-3 max-w-2xl text-zinc-400">{production.synopsis}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {formats.map((f, i) => <FormatBadge key={i} format={f} />)}
        </div>
        {productionSources.length > 0 && (
          <div className="mt-3">
            <SourceCitation sources={productionSources} />
          </div>
        )}
      </header>

      {studios.length > 0 && (
        <div className="mb-6">
          <SectionHeader label="Production" heading="Studios" />
          <ul className="space-y-1">
            {studios.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="text-zinc-200">{s.name}</span>
                <span className="text-xs text-zinc-500">{s.role.replace('_', ' ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Object.entries(crewByCategory).map(([category, members]) => (
        <div key={category} className="mb-6">
          <SectionHeader label="Department" heading={category.replace('_', ' ')} />
          <ul className="space-y-1">
            {members.map((m, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Link
                  href={`/crew/${m.person_slug}`}
                  className="text-zinc-200 hover:text-amber-400"
                >
                  {m.credit_name_override ?? m.display_name}
                </Link>
                <span className="text-zinc-500">{m.role_name}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <SceneList rows={scenes} />
    </article>
  );
}
