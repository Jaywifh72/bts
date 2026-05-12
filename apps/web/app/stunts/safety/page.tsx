import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listSafetyBulletins, type SafetyBulletinCategory } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';

export const metadata: Metadata = {
  title: 'SAG-AFTRA safety bulletins',
  description:
    'Indexed and cross-referenced archive of SAG-AFTRA safety bulletins — firearms (#1, #39), pyrotechnics (#4), helicopters (#2), stunts (#14), fire (#15), water (#16), vehicles (#17). Mechanism, scope, key requirements, and the rigs each bulletin governs.',
};

const CATEGORIES: Array<{
  key: SafetyBulletinCategory;
  label: string;
  blurb: string;
  accent: string;
}> = [
  {
    key: 'stunts_general',
    label: 'Stunts (general)',
    blurb:
      'The umbrella bulletin governing any rigged stunt action and the procedural baseline for the more-specific category bulletins.',
    accent: 'border-red-900/50',
  },
  {
    key: 'firearms',
    label: 'Firearms',
    blurb:
      'Firearm chain of custody, blank ammunition handling, muzzle discipline, and the camera-operator-near-firearm extension.',
    accent: 'border-zinc-700',
  },
  {
    key: 'pyrotechnics',
    label: 'Pyrotechnics',
    blurb:
      'Special effects involving explosive charge — squibs, debris cannons, fire-bar gas effects, pressure-release destruction.',
    accent: 'border-orange-900/50',
  },
  {
    key: 'fire',
    label: 'Fire',
    blurb:
      'Sustained or controlled flame work — full-body burns, propane bars, gel-suit layering, set-piece fires.',
    accent: 'border-orange-900/40',
  },
  {
    key: 'aerial',
    label: 'Aerial',
    blurb:
      'Helicopter operations and FAA Part 133 external-load work where camera platforms or performers are externally rigged.',
    accent: 'border-sky-900/50',
  },
  {
    key: 'vehicles',
    label: 'Vehicles',
    blurb:
      'Picture-car preparation, chase choreography, cannon-rolls, pipe-ramps, pod-car driving, and Russian-arm camera-car rigs.',
    accent: 'border-blue-900/50',
  },
  {
    key: 'water',
    label: 'Water / underwater',
    blurb:
      'Underwater performance tanks, dump-tank effects, water cannons, swimming pool work, and open-water boat or scuba sequences.',
    accent: 'border-teal-900/50',
  },
  {
    key: 'animals',
    label: 'Animals',
    blurb:
      'Live-animal interaction with cast and crew. Distinct from the AHA "No Animals Were Harmed" certification, which covers animal welfare.',
    accent: 'border-amber-900/50',
  },
  {
    key: 'environmental',
    label: 'Environmental',
    blurb:
      'Extreme-temperature work, inclement weather, high-altitude productions, and exposure-time limits.',
    accent: 'border-zinc-700',
  },
  {
    key: 'medical',
    label: 'Medical / blood',
    blurb:
      'Practical blood effects, body-fluid simulations, and the cleanup protocols governed jointly with OSHA blood-borne-pathogen requirements.',
    accent: 'border-rose-900/50',
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

export default async function SafetyBulletinsIndexPage() {
  const bulletins = await listSafetyBulletins(db);

  const byCategory = new Map<SafetyBulletinCategory, typeof bulletins>();
  for (const b of bulletins) {
    const list = byCategory.get(b.category) ?? [];
    list.push(b);
    byCategory.set(b.category, list);
  }

  const totalRiggingLinks = bulletins.reduce(
    (acc, b) => acc + b.related_rigging_slugs.length,
    0,
  );

  return (
    <>
      <div className="relative mb-12 overflow-hidden border-b border-zinc-800 pb-10">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-red-950/40 via-zinc-950/0 to-transparent"
        />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.25em] text-red-500/80">
            Archive · Safety bulletins
          </p>
          <h1 className="mt-2 font-serif text-5xl text-zinc-50 leading-none">
            The procedure manual
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            SAG-AFTRA's Safety Bulletins are the working stunt
            department's procedure manual — numbered guidance documents
            covering firearms, pyro, helicopters, animals, water work,
            and the supporting craft. They're freely distributed by
            SAG-AFTRA but scattered across PDFs and only ever
            referenced by number on production reports. We index them
            here as cross-referenced entities, with mechanism + key
            requirements + the rigs each bulletin governs.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <Stat label="Bulletins indexed" value={bulletins.length} />
            <Stat label="Categories" value={byCategory.size} />
            <Stat label="Rigging cross-links" value={totalRiggingLinks} />
            <Stat
              label="With revision date"
              value={bulletins.filter((b) => b.last_revision_date).length}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link href="/stunts/rigging" className="text-amber-400 hover:underline">
              Rigging glossary →
            </Link>
            <Link href="/stunts/sequences" className="text-amber-400 hover:underline">
              Sequence archive →
            </Link>
            <Link href="/stunts" className="text-amber-400 hover:underline">
              Back to the Stunts archive →
            </Link>
          </div>
        </div>
      </div>

      <p className="mb-10 max-w-2xl rounded border border-amber-900/40 bg-amber-950/10 p-4 text-xs leading-relaxed text-amber-200/80">
        <strong className="font-serif text-amber-200">Editorial note.</strong>{' '}
        We do not reproduce SAG-AFTRA bulletin text directly — the
        bulletin text is copyrighted by SAG-AFTRA. Each entry is
        original prose summarising scope and key requirements,
        with the canonical PDF linked for the authoritative source.
        If you are the safety officer of record on a working
        production, the canonical PDF — not this archive — is the
        document you carry.
      </p>

      {CATEGORIES.map(({ key, label, blurb, accent }) => {
        const items = byCategory.get(key) ?? [];
        if (items.length === 0) return null;
        return (
          <section key={key} className="mb-14">
            <SectionHeader
              label={label}
              heading={`${items.length} ${items.length === 1 ? 'bulletin' : 'bulletins'}`}
            />
            <p className="-mt-2 mb-5 max-w-2xl text-xs text-zinc-500">{blurb}</p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((b) => (
                <li key={b.slug}>
                  <Link
                    href={`/stunts/safety/${b.slug}`}
                    className={`group flex h-full flex-col gap-2 rounded border ${accent} bg-zinc-900/40 p-4 hover:bg-red-950/10 transition-colors`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs text-amber-500/70">
                        #{b.bulletin_number}
                      </span>
                      <span className="font-serif text-base text-zinc-100 group-hover:text-amber-400 line-clamp-2">
                        {b.title}
                      </span>
                    </div>
                    <p className="line-clamp-3 text-xs leading-relaxed text-zinc-400">
                      {b.scope}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-wide text-zinc-500">
                      {b.last_revision_date && (
                        <span>
                          Rev. {b.last_revision_date.slice(0, 4)}
                        </span>
                      )}
                      {b.related_rigging_slugs.length > 0 && (
                        <span>
                          {b.related_rigging_slugs.length} rig
                          {b.related_rigging_slugs.length === 1 ? '' : 's'}
                        </span>
                      )}
                      {b.key_requirements.length > 0 && (
                        <span>
                          {b.key_requirements.length}{' '}
                          requirement{b.key_requirements.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <aside className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-500">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-400">
          Coverage scope
        </p>
        SAG-AFTRA maintains roughly fifty numbered safety bulletins.
        The ones indexed here are the most-cited in production
        records and behind-the-scenes interviews — the bulletins a
        working stunt coordinator references daily. The full list,
        including ad-hoc revisions and supplements, is at{' '}
        <a
          href="https://www.sagaftra.org/safety"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-300 underline-offset-2 hover:text-amber-400 hover:underline"
        >
          sagaftra.org/safety
        </a>.
      </aside>
    </>
  );
}
