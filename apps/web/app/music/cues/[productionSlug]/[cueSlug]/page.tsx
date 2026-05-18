import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, getMusicCueByProductionAndSlug, getPerformersForCue } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const revalidate = 86400;

export async function generateMetadata(
  { params }: { params: Promise<{ productionSlug: string; cueSlug: string }> },
): Promise<Metadata> {
  const { productionSlug, cueSlug } = await params;
  const cue = await getMusicCueByProductionAndSlug(db, productionSlug, cueSlug);
  if (!cue) return { title: 'Cue' };
  return {
    title: `${cue.title} — ${cue.production_title} score`,
    description: cue.notable_for
      ?? cue.listening_notes
      ?? `${cue.title}, a cue from ${cue.production_title} (${cue.composer_name}).`,
    alternates: { canonical: `${siteUrl()}/music/cues/${productionSlug}/${cueSlug}` },
  };
}

const CUE_FUNCTION_LABELS: Record<string, string> = {
  main_title: 'Main title',
  end_credits: 'End credits',
  theme_intro: 'Theme — intro',
  theme_restatement: 'Theme — restatement',
  transition: 'Transition',
  underscore: 'Underscore',
  source: 'Source (diegetic)',
  source_to_score: 'Source → score',
  montage: 'Montage',
  action_set_piece: 'Action set piece',
  reveal: 'Reveal',
  emotional_beat: 'Emotional beat',
  silence_to_score: 'Silence → score',
  other: 'Other',
};

function formatRuntime(seconds: number | null): string {
  if (seconds === null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default async function CueDetailPage(
  { params }: { params: Promise<{ productionSlug: string; cueSlug: string }> },
) {
  const { productionSlug, cueSlug } = await params;
  const cue = await getMusicCueByProductionAndSlug(db, productionSlug, cueSlug);
  if (!cue) notFound();

  const performers = await getPerformersForCue(db, cue.id);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'MusicComposition',
          '@id': absoluteUrl(`/music/cues/${productionSlug}/${cueSlug}`),
          name: cue.title,
          composer: {
            '@type': 'Person',
            name: cue.composer_name,
            url: absoluteUrl(`/crew/${cue.composer_slug}`),
          },
          inLanguage: undefined,
          duration: cue.runtime_seconds ? `PT${cue.runtime_seconds}S` : undefined,
        }}
      />

      <PageHero
        eyebrow="Music · cue"
        title={cue.title}
        accent="amber"
        description={cue.notable_for
          ?? `Cue from ${cue.production_title}${cue.release_year ? ` (${cue.release_year})` : ''}, composed by ${cue.composer_name}.`}
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="Runtime" value={formatRuntime(cue.runtime_seconds)} />
            <PageHeroStat label="Function" value={CUE_FUNCTION_LABELS[cue.cue_function] ?? cue.cue_function} />
            <PageHeroStat label="Key" value={cue.key_signature ?? '—'} />
            <PageHeroStat label="Tempo" value={cue.tempo_bpm ? `${cue.tempo_bpm} BPM` : '—'} />
          </div>
        }
      />

      <nav aria-label="Cue context" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href={`/films/${cue.production_slug}`}
              className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
          Film: {cue.production_title} ↗
        </Link>
        <Link href={`/music/scores/${cue.production_slug}`}
              className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
          Full score
        </Link>
        <Link href={`/crew/${cue.composer_slug}`}
              className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
          Composer: {cue.composer_name}
        </Link>
        {cue.scoring_stage_slug && (
          <Link href={`/music/scoring-stages/${cue.scoring_stage_slug}`}
                className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
            Stage: {cue.scoring_stage_name}
          </Link>
        )}
        {cue.is_flagship && (
          <span className="rounded border border-amber-700 bg-amber-900/30 px-2.5 py-1 text-amber-300">
            ★ flagship cue
          </span>
        )}
      </nav>

      {cue.scene_label && (
        <section className="mb-8">
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">In picture</h2>
          <p className="text-sm text-zinc-300">
            {cue.scene_label}
            {cue.scene_minute !== null && (
              <span className="ml-2 font-mono text-xs text-zinc-500">≈ {cue.scene_minute} min in</span>
            )}
          </p>
        </section>
      )}

      {cue.instrumentation_summary && (
        <section className="mb-8">
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Instrumentation</h2>
          <p className="text-sm text-zinc-300">{cue.instrumentation_summary}</p>
        </section>
      )}

      {cue.listening_notes && (
        <section className="mb-8">
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Listening notes</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-zinc-300">{cue.listening_notes}</p>
        </section>
      )}

      {performers.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-serif text-lg text-zinc-100">Performers</h2>
          <ul className="space-y-1 text-sm">
            {performers.map((p, i) => (
              <li key={i} className="flex items-baseline gap-x-2">
                <span className="text-zinc-400">{p.instrument}</span>
                <span className="text-zinc-600">—</span>
                {p.person_slug ? (
                  <Link href={`/crew/${p.person_slug}`} className="text-zinc-100 hover:text-amber-400">
                    {p.credited_as ?? p.person_name}
                  </Link>
                ) : (
                  <span className="text-zinc-100">{p.credited_as ?? '—'}</span>
                )}
                {p.is_soloist && (
                  <span className="text-[10px] uppercase tracking-wide text-amber-400/70">soloist</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {cue.recording_session_date && (
        <p className="text-xs text-zinc-500">
          Recorded {cue.recording_session_date}
          {cue.recording_orchestra && <> · {cue.recording_orchestra}</>}
        </p>
      )}
    </>
  );
}
