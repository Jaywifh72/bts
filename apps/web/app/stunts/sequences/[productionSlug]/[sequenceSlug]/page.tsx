import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, getStuntSequence, listStuntSequences, getRiggingForSequence, resolveSequenceBulletins, getProductionVideos } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { JsonLd, buildStuntSequenceJsonLd } from '@/lib/jsonLd';

interface Props { params: Promise<{ productionSlug: string; sequenceSlug: string }> }

export async function generateStaticParams() {
  const rows = await listStuntSequences(db);
  return rows.map((r) => ({
    productionSlug: r.production_slug,
    sequenceSlug: r.slug,
  }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const data = await getStuntSequence(db, params.productionSlug, params.sequenceSlug);
  if (!data) return {};
  return {
    title: `${data.sequence.name} — ${data.sequence.production_title}`,
    description: data.sequence.description?.slice(0, 160),
  };
}

const ROLE_LABELS: Record<string, string> = {
  coordinator: 'Coordinator',
  '2nd_unit_director': '2nd-Unit Director',
  performer: 'Performer',
  double: 'Double',
  rigger: 'Rigger',
  safety: 'Safety Officer',
  precision_driver: 'Precision Driver',
  fight_choreographer: 'Fight Choreographer',
};

function discipline(d: string) {
  return d.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function towingRigLabel(rig: string) {
  return rig
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function StuntSequenceDetailPage(props: Props) {
  const params = await props.params;
  const data = await getStuntSequence(db, params.productionSlug, params.sequenceSlug);
  if (!data) notFound();
  const { sequence, credits } = data;

  // Phase-5/6 cross-links — glossary entries by discipline-tag overlap,
  // bulletins resolved by parsing the free-form bulletin references.
  // Phase 14 — surface stunt-categorised videos from the parent
  // production on the sequence page; auto-grows as discovery seeds
  // new stunt videos.
  const [riggingMatches, bulletinMatches, allVideos] = await Promise.all([
    getRiggingForSequence(db, sequence.discipline_tags),
    resolveSequenceBulletins(db, sequence.safety_bulletins_followed),
    getProductionVideos(db, sequence.production_id),
  ]);
  const stuntVideos = allVideos.filter((v) => v.category === 'stunts');
  const bulletinMap = new Map(
    bulletinMatches.map((b) => [b.bulletin_number, b]),
  );

  const credByRole = new Map<string, typeof credits>();
  for (const c of credits) {
    const list = credByRole.get(c.role) ?? [];
    list.push(c);
    credByRole.set(c.role, list);
  }
  const roleOrder = ['coordinator', '2nd_unit_director', 'fight_choreographer', 'performer', 'double', 'rigger', 'precision_driver', 'safety'];
  const orderedRoles = [
    ...roleOrder.filter((r) => credByRole.has(r)),
    ...[...credByRole.keys()].filter((r) => !roleOrder.includes(r)),
  ];

  const rigging = sequence.rigging ?? {};
  const vehicle = sequence.vehicle;

  const sequenceJsonLd = buildStuntSequenceJsonLd({
    productionSlug: sequence.production_slug,
    productionTitle: sequence.production_title,
    sequenceSlug: sequence.slug,
    sequenceName: sequence.name,
    description: sequence.description,
    disciplines: sequence.discipline_tags ?? [],
    citations: sequence.references?.map((r) => ({
      name: r.title,
      url: r.url,
      publication: r.publication,
    })),
  });

  return (
    <article>
      <JsonLd data={sequenceJsonLd} />
      {/* Hero */}
      <header className="relative mb-10 overflow-hidden border-b border-zinc-800 pb-8">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-red-950/40 via-zinc-950/0 to-transparent"
        />
        <div className="relative">
          <p className="text-xs text-zinc-500">
            <Link href="/stunts" className="hover:text-amber-400">Stunts</Link>
            {' › '}
            <Link href="/stunts/sequences" className="hover:text-amber-400">Sequences</Link>
            {' › '}
            <Link href={`/films/${sequence.production_slug}`} className="hover:text-amber-400">
              {sequence.production_title}
              {sequence.production_release_year && ` (${sequence.production_release_year})`}
            </Link>
            {' › '}
          </p>
          <h1 className="mt-2 font-serif text-4xl text-zinc-50 leading-tight">{sequence.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            {sequence.scene_title && (
              <span className="text-zinc-500">Scene: {sequence.scene_title}</span>
            )}
            {sequence.screen_minutes && (
              <span className="font-mono text-zinc-300">
                {Number(sequence.screen_minutes).toFixed(1)} min on screen
              </span>
            )}
            {sequence.discipline_tags.map((d) => (
              <span
                key={d}
                className="rounded border border-red-900/40 bg-red-950/30 px-2 py-0.5 text-red-200/90"
              >
                {discipline(d)}
              </span>
            ))}
          </div>
        </div>
      </header>
      {/* Description */}
      {sequence.description && (
        <section className="mb-10 max-w-3xl">
          <p className="text-sm leading-relaxed text-zinc-300">{sequence.description}</p>
        </section>
      )}
      {/* Credits */}
      {orderedRoles.length > 0 && (
        <section className="mb-10">
          <SectionHeader label="Credits" heading="Stunt team" />
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orderedRoles.map((role) => {
              const list = credByRole.get(role)!;
              return (
                <div key={role} className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                    {ROLE_LABELS[role] ?? role.replace(/_/g, ' ')}
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {list.map((c) => (
                      <li key={c.person_slug}>
                        <Link
                          href={`/crew/${c.person_slug}`}
                          className="text-zinc-200 hover:text-amber-400"
                        >
                          {c.display_name}
                        </Link>
                        {c.doubling_for_display_name && (
                          <span className="ml-1 text-xs text-zinc-500">
                            (doubling{' '}
                            {c.doubling_for_person_slug ? (
                              <Link
                                href={`/crew/${c.doubling_for_person_slug}`}
                                className="hover:text-amber-400"
                              >
                                {c.doubling_for_display_name}
                              </Link>
                            ) : (
                              c.doubling_for_display_name
                            )}
                            )
                          </span>
                        )}
                        {c.notes && (
                          <p className="mt-0.5 text-xs text-zinc-500">{c.notes}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {/* Rigging breakdown */}
      {(rigging.rigs?.length || rigging.mounts?.length || rigging.harness || rigging.notes) && (
        <section className="mb-10">
          <SectionHeader label="Rigging" heading="Equipment + technique" />
          {rigging.rigs && rigging.rigs.length > 0 && (
            <ul className="mt-3 space-y-3">
              {rigging.rigs.map((rig, i) => (
                <li
                  key={i}
                  className="rounded border border-zinc-800 bg-zinc-900/40 p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-serif text-base text-zinc-100">{rig.type}</h3>
                    <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                      {rig.manufacturer && (
                        <span>
                          <span className="text-[10px] uppercase tracking-wide">Mfr</span>{' '}
                          <span className="text-zinc-300">{rig.manufacturer}</span>
                        </span>
                      )}
                      {rig.capacity_lbs != null && (
                        <span>
                          <span className="text-[10px] uppercase tracking-wide">Capacity</span>{' '}
                          <span className="font-mono text-zinc-300">{rig.capacity_lbs} lb</span>
                        </span>
                      )}
                    </div>
                  </div>
                  {rig.notes && (
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{rig.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {(rigging.mounts?.length || rigging.harness) && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {rigging.mounts && rigging.mounts.length > 0 && (
                <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Mounts</p>
                  <ul className="mt-1 space-y-1 text-sm text-zinc-300">
                    {rigging.mounts.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
              {rigging.harness && (
                <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Harness</p>
                  <p className="mt-1 text-sm text-zinc-300">{rigging.harness}</p>
                </div>
              )}
            </div>
          )}
          {rigging.notes && (
            <div className="mt-3 max-w-3xl rounded border border-amber-900/50 bg-amber-950/20 p-3 text-sm leading-relaxed text-amber-100/90">
              <div className="mb-1 text-[10px] uppercase tracking-widest text-amber-500/80">Coordinator notes</div>
              {rigging.notes}
            </div>
          )}
        </section>
      )}
      {/* Vehicle */}
      {vehicle && (vehicle.picture_car || vehicle.towing_rig || vehicle.prep_company) && (
        <section className="mb-10">
          <SectionHeader label="Vehicles" heading="Picture car + tow rig" />
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {vehicle.picture_car && (
              <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Picture car</p>
                <div className="mt-1 font-serif text-lg text-zinc-100">
                  {vehicle.picture_car.year ? `${vehicle.picture_car.year} ` : ''}
                  {vehicle.picture_car.make} {vehicle.picture_car.model}
                </div>
                {vehicle.picture_car.modifications && vehicle.picture_car.modifications.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500">Modifications</p>
                    <ul className="mt-1 space-y-1 text-sm text-zinc-300">
                      {vehicle.picture_car.modifications.map((m) => (
                        <li key={m} className="flex gap-2">
                          <span className="text-zinc-600">·</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-3">
              {vehicle.towing_rig && (
                <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Towing rig</p>
                  <p className="mt-1 text-sm text-zinc-200">{towingRigLabel(vehicle.towing_rig)}</p>
                </div>
              )}
              {vehicle.prep_company && (
                <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Prep company</p>
                  <p className="mt-1 text-sm text-zinc-200">{vehicle.prep_company}</p>
                </div>
              )}
              {vehicle.precision_driver_person_slug && (
                <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Precision driver</p>
                  <Link
                    href={`/crew/${vehicle.precision_driver_person_slug}`}
                    className="mt-1 block text-sm text-zinc-200 hover:text-amber-400"
                  >
                    {vehicle.precision_driver_person_slug.replace(/-/g, ' ')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      {/* Safety */}
      {(sequence.safety_officer_display_name || sequence.safety_bulletins_followed.length > 0) && (
        <section className="mb-10">
          <SectionHeader label="Safety" heading="Officer + bulletins" />
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {sequence.safety_officer_display_name && (
              <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Safety officer</p>
                {sequence.safety_officer_person_slug ? (
                  <Link
                    href={`/crew/${sequence.safety_officer_person_slug}`}
                    className="mt-1 block text-sm text-zinc-200 hover:text-amber-400"
                  >
                    {sequence.safety_officer_display_name}
                  </Link>
                ) : (
                  <p className="mt-1 text-sm text-zinc-200">{sequence.safety_officer_display_name}</p>
                )}
              </div>
            )}
            {sequence.safety_bulletins_followed.length > 0 && (
              <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                  Bulletins observed
                </p>
                <ul className="mt-1 space-y-1 text-sm text-zinc-300">
                  {sequence.safety_bulletins_followed.map((b) => {
                    const numberMatch = b.match(/#\s*(\d+[A-Za-z]?)/);
                    const n = numberMatch?.[1];
                    const resolved = n ? bulletinMap.get(n) : null;
                    return (
                      <li key={b}>
                        {resolved ? (
                          <Link
                            href={`/stunts/safety/${resolved.slug}`}
                            className="text-zinc-200 hover:text-amber-400"
                          >
                            {b}
                            <span className="ml-1 text-xs text-amber-500/60">↗</span>
                          </Link>
                        ) : (
                          b
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
      {/* VFX handoff */}
      {(sequence.vfx_handoff_house_slug || sequence.vfx_handoff_frame != null) && (
        <section className="mb-10">
          <SectionHeader label="Hand-off" heading="VFX continuation" />
          <div className="mt-3 max-w-2xl rounded border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
            <p className="text-zinc-300">
              The practical stunt hands off to digital extension
              {sequence.vfx_handoff_frame != null && (
                <>
                  {' '}at frame{' '}
                  <span className="font-mono text-zinc-100">{sequence.vfx_handoff_frame}</span>
                </>
              )}
              {sequence.vfx_handoff_house_slug && (
                <>
                  {' '}— picked up by{' '}
                  <Link
                    href={`/vfx/${sequence.vfx_handoff_house_slug}`}
                    className="text-amber-400 hover:underline"
                  >
                    {sequence.vfx_handoff_house_name ?? sequence.vfx_handoff_house_slug}
                  </Link>
                </>
              )}
              .
            </p>
          </div>
        </section>
      )}
      {/* BTS video — single curated link on the sequence row. */}
      {sequence.bts_video_url && (
        <section className="mb-10">
          <SectionHeader label="Behind the scenes" heading="Video" />
          <a
            href={sequence.bts_video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded border border-zinc-800 bg-zinc-900/40 px-4 py-2 text-sm text-zinc-200 hover:border-amber-700 hover:text-amber-400"
          >
            Watch BTS footage ↗
          </a>
        </section>
      )}
      {/* Phase 14 — stunt-categorised videos from the parent
          production. Auto-populates once discovery + the Phase 9.1
          categoriser have classified videos as 'stunts'. Falls back
          silently when none exist. */}
      {stuntVideos.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            label="Stunt videos"
            heading={`${stuntVideos.length} ${stuntVideos.length === 1 ? 'video' : 'videos'} from this production`}
          />
          <p className="-mt-2 mb-4 max-w-2xl text-xs text-zinc-500">
            Videos categorised as stunt content from the parent
            production. Useful for "anatomy of the chase" / "fight
            breakdown" coverage that frequently overlaps multiple
            sequences in the same film.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stuntVideos.map((v) => (
              <li
                key={v.id}
                className="overflow-hidden rounded border border-red-900/40 bg-zinc-900/40 hover:border-red-800/70 transition-colors"
              >
                <a href={v.url} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="relative aspect-video w-full bg-zinc-950">
                    {v.thumbnail_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      (<img
                        src={v.thumbnail_url}
                        alt={v.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />)
                    )}
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-xs leading-snug text-zinc-200">
                      {v.title}
                    </p>
                    <div className="mt-1 flex items-baseline justify-between gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
                      <span className="truncate">{v.channel_name}</span>
                      <span className="shrink-0 rounded bg-red-950/40 px-1 text-red-300">stunts</span>
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {/* Rigging glossary cross-link — every Phase-5 entry whose
          related_discipline_tags overlap this sequence's tags. */}
      {riggingMatches.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            label="Rigging glossary"
            heading={`${riggingMatches.length} ${riggingMatches.length === 1 ? 'rig' : 'rigs'} used in this sequence`}
          />
          <p className="-mt-2 mb-4 max-w-2xl text-xs text-zinc-500">
            Each entry explains how the rig works mechanically and
            the safety bulletin that governs it. Click through for
            the full glossary detail.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {riggingMatches.map((r) => (
              <Link
                key={r.slug}
                href={`/stunts/rigging/${r.slug}`}
                className="group flex flex-col gap-2 rounded border border-red-900/40 bg-red-950/10 p-4 hover:border-red-800/70 hover:bg-red-950/20 transition-colors"
              >
                <p className="text-[10px] uppercase tracking-wide text-red-400/80">
                  {r.category}
                </p>
                <h3 className="font-serif text-base text-zinc-100 group-hover:text-amber-400">
                  {r.name}
                </h3>
                <p className="line-clamp-3 text-xs leading-relaxed text-zinc-400">
                  {r.tagline}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
      {/* References */}
      {sequence.references.length > 0 && (
        <section className="mb-10">
          <SectionHeader label="References" heading="Further reading" />
          <ul className="mt-3 space-y-2 text-sm">
            {sequence.references.map((ref, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-100 hover:text-amber-400"
                >
                  {ref.title}
                </a>
                {ref.publication && (
                  <span className="text-xs text-zinc-500">{ref.publication}</span>
                )}
                {ref.kind && (
                  <span className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                    {ref.kind.replace(/_/g, ' ')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {/* Resources footer */}
      <footer className="border-t border-zinc-800 pt-6">
        <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Continue</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link
            href={`/films/${sequence.production_slug}`}
            className="text-zinc-300 hover:text-amber-400"
          >
            ← Back to {sequence.production_title}
          </Link>
          <Link href="/stunts/sequences" className="text-zinc-300 hover:text-amber-400">
            All sequences
          </Link>
          <Link href="/stunts" className="text-zinc-300 hover:text-amber-400">
            Stunts archive
          </Link>
        </div>
      </footer>
    </article>
  );
}
