import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, getMediaAssetById, type HydratedAssociation } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const id = Number(params.id);
  if (!Number.isFinite(id)) return {};
  const data = await getMediaAssetById(db, id);
  if (!data) return {};
  return {
    title: `${data.asset.title} — referenced by ${data.associations.length}`,
    description: data.asset.caption ?? `Source cited by ${data.associations.length} entities across the Studio Pro archive.`,
  };
}

export const dynamic = 'force-dynamic';

const KIND_BADGE: Record<string, string> = {
  video:    'bg-red-950/30 text-red-300 border-red-900/50',
  image:    'bg-emerald-950/30 text-emerald-300 border-emerald-900/50',
  link:     'bg-amber-950/30 text-amber-300 border-amber-900/50',
  document: 'bg-purple-950/30 text-purple-300 border-purple-900/50',
  audio:    'bg-sky-950/30 text-sky-300 border-sky-900/50',
};

const ENTITY_TYPE_LABEL: Record<string, string> = {
  production:               'Production',
  person:                   'Crew',
  vfx_house:                'VFX house',
  stunt_company:            'Stunt company',
  stunt_school:             'Stunt school',
  stunt_sequence:           'Stunt sequence',
  stunt_rigging_technique:  'Rigging',
  safety_bulletin:          'Safety bulletin',
  equipment_manufacturer:   'Manufacturer',
  equipment_series:         'Equipment series',
  equipment_item:           'Equipment',
  post_house:               'Post house',
  scene:                    'Scene',
};

const ROLE_BADGE: Record<string, string> = {
  subject:        'border-amber-900/40 text-amber-300',
  reference:      'border-zinc-700 text-zinc-400',
  reel:           'border-red-900/40 text-red-300',
  credit_holder:  'border-emerald-900/40 text-emerald-300',
  thumbnail:      'border-blue-900/40 text-blue-300',
  related:        'border-zinc-700 text-zinc-500',
};

export default async function ReferenceDetailPage(props: Props) {
  const params = await props.params;
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const data = await getMediaAssetById(db, id);
  if (!data) notFound();
  const { asset, associations } = data;

  // Group associations by entity_type for the sectioned render.
  const byType = new Map<string, typeof associations>();
  for (const a of associations) {
    const list = byType.get(a.entity_type) ?? [];
    list.push(a);
    byType.set(a.entity_type, list);
  }
  const orderedTypes = [...byType.keys()].sort((a, b) =>
    (byType.get(b)!.length - byType.get(a)!.length) || a.localeCompare(b),
  );

  return (
    <article>
      <nav className="mb-6 text-xs uppercase tracking-wide text-zinc-500">
        <Link href="/references" className="hover:text-amber-400">References</Link>
        <span className="mx-2 text-zinc-700">/</span>
        <span className="text-zinc-300">#{asset.id}</span>
      </nav>
      <header className="mb-10 rounded border border-amber-900/40 bg-amber-950/10 p-6">
        <div className="flex items-baseline gap-3">
          <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-xs uppercase tracking-wide ${KIND_BADGE[asset.kind] ?? 'border-zinc-700 text-zinc-400'}`}>
            {asset.kind}
          </span>
          <span className="font-mono text-xs text-amber-500/80">
            {associations.length} associations · {byType.size} entity types
          </span>
        </div>
        <h1 className="mt-2 font-serif text-3xl text-zinc-50 leading-tight">
          {asset.title}
        </h1>
        <p className="mt-3">
          <a
            href={asset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-mono text-xs text-amber-400 hover:underline"
          >
            {asset.url} ↗
          </a>
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500">
          {asset.publication && (
            <span>
              <span className="uppercase tracking-wide">Publication:</span>{' '}
              <span className="text-zinc-300">{asset.publication}</span>
            </span>
          )}
          {asset.credit && (
            <span>
              <span className="uppercase tracking-wide">Credit:</span>{' '}
              <span className="text-zinc-300">{asset.credit}</span>
            </span>
          )}
          {asset.published_at && (
            <span>
              <span className="uppercase tracking-wide">Published:</span>{' '}
              <span className="font-mono text-zinc-300">{asset.published_at.slice(0, 10)}</span>
            </span>
          )}
        </div>
        {asset.caption && (
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-300">{asset.caption}</p>
        )}
      </header>
      <SectionHeader
        label="Cited by"
        heading={`${associations.length} ${associations.length === 1 ? 'entity' : 'entities'} across ${byType.size} ${byType.size === 1 ? 'category' : 'categories'}`}
      />
      <p className="-mt-2 mb-6 max-w-2xl text-xs text-zinc-500">
        Every entity in the archive that has this URL attached.
        Click through to the entity&apos;s page to see how the source
        is used in context.
      </p>
      <div className="space-y-8">
        {orderedTypes.map((type) => {
          const items = byType.get(type)!;
          return (
            <section key={type}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  {ENTITY_TYPE_LABEL[type] ?? type.replace(/_/g, ' ')}
                </h2>
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {items.length} {items.length === 1 ? 'citation' : 'citations'}
                </span>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {items.map((a) => (
                  <li key={a.association_id}>
                    {a.href ? (
                      <Link
                        href={a.href}
                        className="group flex items-start gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/50 hover:bg-amber-950/10 transition-colors"
                      >
                        <CitationCardContents association={a} />
                      </Link>
                    ) : (
                      <div className="flex items-start gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 opacity-60">
                        <CitationCardContents association={a} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <aside className="mt-12 rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-500">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-400">
          Why this page exists
        </p>
        Sources cited across multiple entities are stored once and
        attached many times. This view inverts the lookup — instead
        of "what does this VFX house cite?", it asks "what cites this
        Variety article?", which is how working researchers actually
        navigate a source dataset.
      </aside>
    </article>
  );
}

function CitationCardContents({ association }: { association: HydratedAssociation }) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${ROLE_BADGE[association.role] ?? 'border-zinc-700 text-zinc-400'}`}>
            {association.role.replace(/_/g, ' ')}
          </span>
          <span className="truncate text-sm text-zinc-100 group-hover:text-amber-400">
            {association.display_name}
          </span>
        </div>
        {association.caption_override && (
          <p className="mt-1 line-clamp-2 text-xs italic text-zinc-500">
            {association.caption_override}
          </p>
        )}
        {association.slug && (
          <div className="mt-1 truncate font-mono text-[10px] text-zinc-600">
            {association.slug}
          </div>
        )}
      </div>
    </>
  );
}
