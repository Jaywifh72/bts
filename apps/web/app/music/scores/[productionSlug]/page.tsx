import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  db, getScoreWorksByProductionSlug, getMusicCuesForScoreWork,
} from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const revalidate = 86400;

export async function generateMetadata(
  { params }: { params: Promise<{ productionSlug: string }> },
): Promise<Metadata> {
  const { productionSlug } = await params;
  const rows = await getScoreWorksByProductionSlug(db, productionSlug);
  if (rows.length === 0) return { title: 'Score' };
  const r = rows[0]!;
  const composers = rows.map((row) => row.composer_name).join(' & ');
  return {
    title: `${r.production_title} — score by ${composers}`,
    description: r.summary
      ?? `Score deep-dive for ${r.production_title}${r.release_year ? ` (${r.release_year})` : ''} — composer ${composers}${r.scoring_stage_name ? `, recorded at ${r.scoring_stage_name}` : ''}.`,
    alternates: { canonical: `${siteUrl()}/music/scores/${productionSlug}` },
  };
}

const CUE_FUNCTION_LABELS: Record<string, string> = {
  main_title: 'Main title',
  end_credits: 'End credits',
  theme_intro: 'Theme — intro',
  theme_restatement: 'Theme — restatement',
  transition: 'Transition',
  underscore: 'Underscore',
  source: 'Source',
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

export default async function ScoreDeepDivePage(
  { params }: { params: Promise<{ productionSlug: string }> },
) {
  const { productionSlug } = await params;
  const works = await getScoreWorksByProductionSlug(db, productionSlug);
  if (works.length === 0) notFound();

  // Fetch cues for each composer's work in parallel.
  const cuesByWork = await Promise.all(
    works.map((w) => getMusicCuesForScoreWork(db, w.score_work_id)),
  );

  const head = works[0]!;
  const composerNames = works.map((w) => w.composer_name).join(' & ');
  const totalCues = cuesByWork.reduce((sum, c) => sum + c.length, 0);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'MusicComposition',
          '@id': absoluteUrl(`/music/scores/${productionSlug}`),
          name: `${head.production_title} — Original Motion Picture Score`,
          composer: works.map((w) => ({
            '@type': 'Person',
            name: w.composer_name,
            url: absoluteUrl(`/crew/${w.composer_slug}`),
          })),
          dateCreated: head.release_year?.toString(),
        }}
      />

      <PageHero
        eyebrow="Music · score"
        title={`${head.production_title} — score`}
        accent="amber"
        description={head.summary
          ?? `Score for ${head.production_title}${head.release_year ? ` (${head.release_year})` : ''} by ${composerNames}${head.scoring_stage_name ? `, recorded at ${head.scoring_stage_name}` : head.recording_location ? `, recorded at ${head.recording_location}` : ''}.`}
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="Composers" value={works.length} />
            <PageHeroStat label="Cues documented" value={totalCues} />
            <PageHeroStat label="Runtime" value={head.runtime_minutes ? `${head.runtime_minutes} min` : '—'} />
            <PageHeroStat label="Release year" value={head.release_year ?? '—'} />
          </div>
        }
      />

      <nav aria-label="Score context" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href={`/films/${head.production_slug}`}
              className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
          Film: {head.production_title} ↗
        </Link>
        {head.scoring_stage_slug && (
          <Link href={`/music/scoring-stages/${head.scoring_stage_slug}`}
                className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
            Stage: {head.scoring_stage_name} ↗
          </Link>
        )}
        <Link href="/awards/craft/score"
              className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
          Score awards
        </Link>
      </nav>

      {head.themes_summary && (
        <section className="mb-12">
          <h2 className="mb-3 font-serif text-xl text-zinc-100">Themes</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-zinc-300">{head.themes_summary}</p>
        </section>
      )}

      {works.map((w, i) => {
        const cues = cuesByWork[i] ?? [];
        return (
          <section key={w.score_work_id} className="mb-12">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">
                {works.length > 1 ? `Composed by ` : 'Composer · '}
                <Link href={`/crew/${w.composer_slug}`} className="text-amber-400 hover:text-amber-300">
                  {w.composer_name}
                </Link>
              </h2>
              <p className="text-xs text-zinc-500">
                {cues.length} cue{cues.length === 1 ? '' : 's'} documented
              </p>
            </div>
            {w.recording_orchestra && (
              <p className="mb-3 text-sm text-zinc-400">
                Recorded by <span className="text-zinc-200">{w.recording_orchestra}</span>
                {w.scoring_stage_name && (
                  <> at <Link href={`/music/scoring-stages/${w.scoring_stage_slug}`} className="text-amber-400 hover:text-amber-300">{w.scoring_stage_name}</Link></>
                )}
              </p>
            )}
            {cues.length === 0 ? (
              <p className="text-sm text-zinc-500">No cues catalogued for this composer's work yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {cues.map((c) => (
                  <li key={c.id}
                      className="flex flex-wrap items-baseline gap-x-2 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                    {c.track_number !== null && (
                      <span className="font-mono text-xs text-zinc-500">#{c.track_number}</span>
                    )}
                    <Link href={`/music/cues/${head.production_slug}/${c.slug}`}
                          className="font-medium text-zinc-100 hover:text-amber-400">
                      {c.title}
                    </Link>
                    {c.is_flagship && (
                      <span className="rounded border border-amber-700 bg-amber-900/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                        flagship
                      </span>
                    )}
                    <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300">
                      {CUE_FUNCTION_LABELS[c.cue_function] ?? c.cue_function}
                    </span>
                    {c.scene_label && (
                      <span className="text-xs text-zinc-400">— {c.scene_label}</span>
                    )}
                    <span className="ml-auto font-mono text-xs tabular-nums text-zinc-500">
                      {formatRuntime(c.runtime_seconds)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {head.release_label && (
        <p className="mb-12 text-xs text-zinc-500">
          Released on <span className="text-zinc-300">{head.release_label}</span>
          {head.release_format && <> · {head.release_format}</>}
          {head.release_url && (
            <> · <a href={head.release_url} target="_blank" rel="noopener noreferrer"
                    className="text-amber-400 hover:text-amber-300">listen ↗</a></>
          )}
        </p>
      )}
    </>
  );
}
