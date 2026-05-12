import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listRiggingTechniques, type RiggingCategory } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';

export const metadata: Metadata = {
  title: 'Stunt rigging glossary',
  description:
    'The canonical reference for the specialised rigs working stunt coordinators actually use — pole-cats, decelerators, ratchets, cannon-rolls, gel suits, helicopter mounts. Mechanism, safety, and named productions, fully cross-referenced.',
};

// Curated category metadata — labels, hex-coded accent colours,
// editorial subtitle. Order here is the intentional render order
// on the index, surfacing the most-recognisable categories first.
const CATEGORIES: Array<{
  key: RiggingCategory;
  label: string;
  blurb: string;
  accent: string;
}> = [
  {
    key: 'descender',
    label: 'Descender rigs',
    blurb:
      'Vertical fall arrest — fan descenders, decelerators, pole-cat ejectors, the airbag standard. The spine of every controlled-fall sequence.',
    accent: 'border-red-900/50',
  },
  {
    key: 'wire',
    label: 'Wire rigs',
    blurb:
      'Wire-flying harnesses, ratchets, controlled-rappel rigs. The post-Hong-Kong tradition that put performers in the air for sustained takes.',
    accent: 'border-amber-900/50',
  },
  {
    key: 'vehicle',
    label: 'Vehicle rigs',
    blurb:
      'Cannon-rolls, pipe-ramps, pod-cars, the Russian-arm camera platform. The rigs under every modern car-chase sequence.',
    accent: 'border-blue-900/50',
  },
  {
    key: 'fire',
    label: 'Fire rigs',
    blurb:
      'Gel-suit layering, propane-bar costume routing, partial-burn techniques. The thinnest margin of safety in working stunt coordination.',
    accent: 'border-orange-900/50',
  },
  {
    key: 'fall',
    label: 'Fall craft',
    blurb:
      'Pad arrangements, breakaway glass, stair-falls, contact technique. The sub-rigging craft that lets a fight read as violent without injury.',
    accent: 'border-zinc-700',
  },
  {
    key: 'fight',
    label: 'Fight choreography',
    blurb:
      'Reactive-camera technique, gun-fu, padded weapons. The choreography languages — not just the props — that define modern action style.',
    accent: 'border-purple-900/50',
  },
  {
    key: 'aerial',
    label: 'Aerial rigs',
    blurb:
      'Helicopter external mounts, wingsuit BASE, fast-rope and cable transfers. Performance work above the ground line.',
    accent: 'border-sky-900/50',
  },
  {
    key: 'water',
    label: 'Water rigs',
    blurb:
      'Underwater performance tanks, dump-tanks, water-cannons. The rigs underneath any storm sequence or sustained underwater set-piece.',
    accent: 'border-teal-900/50',
  },
];

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-serif text-2xl text-zinc-50">{value.toLocaleString()}</div>
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}

export default async function RiggingIndexPage() {
  const techniques = await listRiggingTechniques(db);

  // Bucket by category in the editorial order set above.
  const byCategory = new Map<RiggingCategory, typeof techniques>();
  for (const t of techniques) {
    const list = byCategory.get(t.category) ?? [];
    list.push(t);
    byCategory.set(t.category, list);
  }

  const totalBulletins = new Set(
    techniques.map((t) => t.sag_aftra_bulletin).filter(Boolean),
  ).size;

  return (
    <>
      {/* Hero — same red-accented neighbourhood as the rest of /stunts. */}
      <div className="relative mb-12 overflow-hidden border-b border-zinc-800 pb-10">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-red-950/40 via-zinc-950/0 to-transparent"
        />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.25em] text-red-500/80">
            Archive · Rigging glossary
          </p>
          <h1 className="mt-2 font-serif text-5xl text-zinc-50 leading-none">
            How the rigs work
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            The specialised rigs working stunt coordinators actually
            use, catalogued with mechanism, safety considerations, and
            the SAG-AFTRA bulletin that governs each one. Cross-linked
            to the sequences in the archive that put each rig on screen
            — so you can read about a cannon-roll, then jump straight
            to every Bond, Mission, or Mad Max sequence that depends
            on one.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <Stat label="Techniques" value={techniques.length} />
            <Stat label="Categories" value={byCategory.size} />
            <Stat label="SAG-AFTRA bulletins" value={totalBulletins} />
            <Stat
              label="With variants"
              value={techniques.filter((t) => t.common_variants.length > 0).length}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link href="/stunts/sequences" className="text-amber-400 hover:underline">
              Sequence archive →
            </Link>
            <Link href="/stunts" className="text-amber-400 hover:underline">
              Back to the Stunts archive →
            </Link>
          </div>
        </div>
      </div>

      {CATEGORIES.map(({ key, label, blurb, accent }) => {
        const items = byCategory.get(key) ?? [];
        if (items.length === 0) return null;
        return (
          <section key={key} className="mb-14">
            <SectionHeader
              label={label}
              heading={`${items.length} ${items.length === 1 ? 'technique' : 'techniques'}`}
            />
            <p className="-mt-2 mb-5 max-w-2xl text-xs text-zinc-500">{blurb}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => (
                <Link
                  key={t.slug}
                  href={`/stunts/rigging/${t.slug}`}
                  className={`group flex flex-col gap-2 rounded border ${accent} bg-zinc-900/40 p-4 hover:bg-red-950/10 transition-colors`}
                >
                  <h2 className="font-serif text-base text-zinc-50 group-hover:text-amber-400">
                    {t.name}
                  </h2>
                  <p className="line-clamp-3 text-xs leading-relaxed text-zinc-400">
                    {t.tagline}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-wide text-zinc-500">
                    {t.sag_aftra_bulletin && (
                      <span className="text-amber-500/70">
                        {t.sag_aftra_bulletin.replace('SAG-AFTRA Safety Bulletin ', 'Bulletin ')}
                      </span>
                    )}
                    {t.common_variants.length > 0 && (
                      <span>
                        {t.common_variants.length} variant
                        {t.common_variants.length === 1 ? '' : 's'}
                      </span>
                    )}
                    {t.related_discipline_tags.length > 0 && (
                      <span>
                        {t.related_discipline_tags.length} tag
                        {t.related_discipline_tags.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <aside className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-500">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-400">
          Editorial scope
        </p>
        Each entry's mechanism description is original prose written
        for this archive — the rigs themselves are not copyrightable
        and the working details are widely documented through
        SAG-AFTRA's safety bulletins, BTS interviews, and the public
        record of the productions that use them. Photos and references
        link to the production-side sources where the rig appears on
        screen, not to commercial product pages for the equipment.
      </aside>
    </>
  );
}
