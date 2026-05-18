import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  db,
  getRiggingTechniqueBySlug,
  getSequencesUsingRigging,
  listRiggingTechniques,
  getBulletinsForRigging,
  getReferencesWithCrossCitations,
} from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EntityReferencesList } from '@/components/EntityReferencesList';

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const t = await getRiggingTechniqueBySlug(db, params.slug);
  if (!t) return {};
  return {
    title: t.name,
    description: t.tagline,
  };
}

export async function generateStaticParams() {
  // 23 entries, all curated — pre-rendering the lot is cheap and
  // gives the rigging glossary cache-warm SSG behaviour out of the box.
  const techniques = await listRiggingTechniques(db);
  return techniques.map((t) => ({ slug: t.slug }));
}

const CATEGORY_LABEL: Record<string, string> = {
  descender: 'Descender rig',
  wire: 'Wire rig',
  vehicle: 'Vehicle rig',
  fire: 'Fire rig',
  fall: 'Fall craft',
  fight: 'Fight choreography',
  aerial: 'Aerial rig',
  water: 'Water rig',
};

const CATEGORY_ACCENT: Record<string, string> = {
  descender: 'border-red-900/40 bg-red-950/10',
  wire: 'border-amber-900/40 bg-amber-950/10',
  vehicle: 'border-blue-900/40 bg-blue-950/10',
  fire: 'border-orange-900/40 bg-orange-950/10',
  fall: 'border-zinc-700 bg-zinc-900/40',
  fight: 'border-purple-900/40 bg-purple-950/10',
  aerial: 'border-sky-900/40 bg-sky-950/10',
  water: 'border-teal-900/40 bg-teal-950/10',
};

export default async function RiggingDetailPage(props: Props) {
  const params = await props.params;
  const technique = await getRiggingTechniqueBySlug(db, params.slug);
  if (!technique) notFound();

  const [sequences, governingBulletins, crossCitedReferences] = await Promise.all([
    getSequencesUsingRigging(db, technique.related_discipline_tags),
    // Phase-6 cross-link: every bulletin whose related_rigging_slugs
    // contains this technique's slug. Surfaces under the safety block.
    getBulletinsForRigging(db, technique.slug),
    // Phase 31 — references read from media_associations with
    // cross-citation count, so a reader sees "+N also cited" on
    // sources shared with other entities.
    getReferencesWithCrossCitations(db, 'stunt_rigging_technique', technique.id),
  ]);

  // Group sequences by production so the cross-link feels editorial,
  // not just a flat list — multiple sequences from the same film
  // collapse into one card.
  type Group = {
    production_slug: string;
    production_title: string;
    release_year: number | null;
    sequences: typeof sequences;
  };
  const byProd = new Map<string, Group>();
  for (const s of sequences) {
    const g = byProd.get(s.production_slug) ?? {
      production_slug: s.production_slug,
      production_title: s.production_title,
      release_year: s.release_year,
      sequences: [] as typeof sequences,
    };
    g.sequences.push(s);
    byProd.set(s.production_slug, g);
  }
  const productionGroups = [...byProd.values()].sort(
    (a, b) => (b.release_year ?? 0) - (a.release_year ?? 0) || a.production_title.localeCompare(b.production_title),
  );

  return (
    <>
      <nav className="mb-6 text-xs uppercase tracking-wide text-zinc-500">
        <Link href="/stunts" className="hover:text-amber-400">Stunts</Link>
        <span className="mx-2 text-zinc-700">/</span>
        <Link href="/stunts/rigging" className="hover:text-amber-400">Rigging glossary</Link>
        <span className="mx-2 text-zinc-700">/</span>
        <span className="text-zinc-300">{technique.name}</span>
      </nav>
      <header className={`mb-10 rounded border p-6 ${CATEGORY_ACCENT[technique.category]}`}>
        <p className="text-[10px] uppercase tracking-[0.25em] text-red-400/80">
          {CATEGORY_LABEL[technique.category] ?? technique.category}
        </p>
        <h1 className="mt-2 font-serif text-4xl text-zinc-50 leading-tight">
          {technique.name}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-zinc-300">
          {technique.tagline}
        </p>

        {technique.related_discipline_tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {technique.related_discipline_tags.map((tag) => (
              <span
                key={tag}
                className="rounded border border-red-900/40 bg-red-950/30 px-2 py-0.5 text-[10px] text-red-200/90"
              >
                {tag.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </header>
      {/* Engineering spec band — 0081 fields. Rendered above the
          mechanism narrative so coordinators see load / G-force /
          decelerator type at a glance. */}
      {(technique.max_load_kg != null
        || technique.stop_distance_m != null
        || technique.typical_g_force != null
        || technique.max_height_m != null
        || technique.decelerator_type
        || technique.primary_manufacturer) && (
        <section className="mb-8">
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Engineering specs</h2>
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {technique.max_load_kg != null && (
              <div><dt className="text-zinc-500">Max load</dt><dd className="font-mono text-zinc-200">{technique.max_load_kg} kg</dd></div>
            )}
            {technique.stop_distance_m != null && (
              <div><dt className="text-zinc-500">Stop distance</dt><dd className="font-mono text-zinc-200">{Number(technique.stop_distance_m)} m</dd></div>
            )}
            {technique.typical_g_force != null && (
              <div><dt className="text-zinc-500">Typical G-force</dt><dd className="font-mono text-zinc-200">{Number(technique.typical_g_force)} G</dd></div>
            )}
            {technique.max_height_m != null && (
              <div><dt className="text-zinc-500">Max height</dt><dd className="font-mono text-zinc-200">{Number(technique.max_height_m)} m</dd></div>
            )}
            {technique.decelerator_type && (
              <div><dt className="text-zinc-500">Decelerator</dt><dd className="text-zinc-200">{technique.decelerator_type}</dd></div>
            )}
            {technique.primary_manufacturer && (
              <div><dt className="text-zinc-500">Manufacturer</dt><dd className="text-zinc-200">{technique.primary_manufacturer}</dd></div>
            )}
            {technique.performer_certification && (
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="text-zinc-500">Performer certification</dt>
                <dd className="text-zinc-200">{technique.performer_certification}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Mechanism — the meat of the page */}
      <section className="mb-10">
        <SectionHeader label="Mechanism" heading="How the rig works" />
        <div className="prose prose-invert prose-zinc max-w-3xl text-sm leading-relaxed text-zinc-300">
          {technique.mechanism.split(/\n\n+/).map((para, i) => (
            <p key={i} className="mb-4">{para}</p>
          ))}
        </div>
      </section>
      {/* Safety considerations */}
      {technique.safety_considerations && (
        <section className="mb-10 rounded border border-amber-900/40 bg-amber-950/10 p-5">
          <SectionHeader label="Safety" heading="What can go wrong, and how it's mitigated" />
          <div className="max-w-3xl text-sm leading-relaxed text-zinc-300">
            {technique.safety_considerations.split(/\n\n+/).map((para, i) => (
              <p key={i} className="mb-3">{para}</p>
            ))}
          </div>
          {technique.sag_aftra_bulletin && governingBulletins.length === 0 && (
            <p className="mt-4 text-[11px] uppercase tracking-wide text-amber-500/70">
              Governed by: {technique.sag_aftra_bulletin}
            </p>
          )}
          {governingBulletins.length > 0 && (
            <div className="mt-5 border-t border-amber-900/30 pt-4">
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-amber-500/70">
                Governed by
              </p>
              <ul className="space-y-1.5 text-sm">
                {governingBulletins.map((b) => (
                  <li key={b.slug}>
                    <Link
                      href={`/stunts/safety/${b.slug}`}
                      className="text-zinc-200 hover:text-amber-400"
                    >
                      <span className="font-mono text-amber-500/70">
                        #{b.bulletin_number}
                      </span>{' '}
                      {b.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
      {/* Common variants */}
      {technique.common_variants.length > 0 && (
        <section className="mb-10">
          <SectionHeader label="Variants" heading={`${technique.common_variants.length} documented`} />
          <ul className="space-y-3">
            {technique.common_variants.map((v) => (
              <li
                key={v.name}
                className="rounded border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <h3 className="font-serif text-base text-zinc-100">{v.name}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{v.description}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {/* Notable productions — cross-linked from sequences via tag overlap */}
      {productionGroups.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            label="On screen"
            heading={`${productionGroups.length} ${productionGroups.length === 1 ? 'production' : 'productions'} using this rig`}
          />
          <p className="-mt-2 mb-5 max-w-2xl text-xs text-zinc-500">
            Sequences in the archive whose discipline tags overlap
            this technique's category. Click through for the full
            rigging breakdown of each set-piece.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {productionGroups.map((g) => (
              <li
                key={g.production_slug}
                className="rounded border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {g.release_year ?? '—'}
                </p>
                <Link
                  href={`/films/${g.production_slug}`}
                  className="mt-1 block font-serif text-base text-zinc-100 hover:text-amber-400"
                >
                  {g.production_title}
                </Link>
                <ul className="mt-2 space-y-1 text-xs">
                  {g.sequences.map((s) => (
                    <li key={`${s.production_slug}-${s.sequence_slug}`}>
                      <Link
                        href={`/stunts/sequences/${s.production_slug}/${s.sequence_slug}`}
                        className="text-zinc-400 hover:text-amber-400"
                      >
                        → {s.sequence_name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}
      {/* References — Phase 31 polymorphic render with cross-citation hints */}
      <EntityReferencesList references={crossCitedReferences} />
      {/* Photos — currently empty for most entries; renders when seeded. */}
      {technique.photos.length > 0 && (
        <section className="mb-10">
          <SectionHeader label="Reference photos" heading={`${technique.photos.length} images`} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {technique.photos.map((p) => (
              <figure key={p.url} className="overflow-hidden rounded border border-zinc-800">
                <div className="relative aspect-video w-full bg-zinc-950">
                  <Image
                    src={p.url}
                    alt={p.caption}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <figcaption className="border-t border-zinc-800 bg-zinc-900/60 p-2 text-[11px] text-zinc-400">
                  {p.caption}
                  {p.credit && (
                    <span className="block text-[10px] text-zinc-600">
                      Credit: {p.credit}
                    </span>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
      <aside className="mt-12 rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-500">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-400">
          About this entry
        </p>
        Mechanism and safety descriptions are original prose written
        for the CineCanon archive. The working detail of the rig
        itself is widely documented through SAG-AFTRA safety bulletins,
        production interviews, and the public record. If you have
        first-hand correction or context to add, the archive accepts
        contributions through the Corrections endpoint.
      </aside>
    </>
  );
}
