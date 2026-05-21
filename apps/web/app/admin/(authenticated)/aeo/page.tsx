import type { Metadata } from 'next';
import Link from 'next/link';
import { db, sql } from '@bts/db';
import { Sparkline } from '@/components/admin/Sparkline';

export const metadata: Metadata = {
  title: 'AEO Observatory',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Counts = {
  prompts_active: number;
  cycles_total: number;
  last_cycle: string | null;
  last_cycle_status: string | null;
  observations_7d: number;
  cinecanon_citations_7d: number;
  pending_interventions: number;
  earned_media_open: number;
  ask_log_24h: number;
};

async function fetchCounts(): Promise<Counts> {
  const [row] = await db.execute<Counts>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM aeo_prompts WHERE deprecated_on IS NULL) AS prompts_active,
      (SELECT COUNT(*)::int FROM aeo_cycles) AS cycles_total,
      (SELECT MAX(ran_on)::text FROM aeo_cycles) AS last_cycle,
      (SELECT status FROM aeo_cycles ORDER BY ran_on DESC NULLS LAST LIMIT 1) AS last_cycle_status,
      (SELECT COUNT(*)::int FROM aeo_response_observations
        WHERE observed_at > NOW() - INTERVAL '7 days') AS observations_7d,
      (SELECT COUNT(*)::int FROM aeo_citation_scores
        WHERE is_cinecanon = true AND created_at > NOW() - INTERVAL '7 days') AS cinecanon_citations_7d,
      (SELECT COUNT(*)::int FROM aeo_interventions
        WHERE decision IS NULL OR decision = 'pending') AS pending_interventions,
      (SELECT COUNT(*)::int FROM aeo_earned_media_targets
        WHERE status IN ('discovered','brief_drafted','sent')) AS earned_media_open,
      (SELECT COUNT(*)::int FROM ask_query_log
        WHERE observed_at > NOW() - INTERVAL '1 day') AS ask_log_24h
  `);
  return row!;
}

function Tile({ label, value, hint, href, accent = 'zinc' }: {
  label: string; value: string | number; hint?: string; href?: string;
  accent?: 'amber' | 'emerald' | 'sky' | 'zinc' | 'red';
}) {
  const accents: Record<string, string> = {
    amber:   'border-amber-900/40 bg-amber-950/10 hover:border-amber-700/60',
    emerald: 'border-emerald-900/40 bg-emerald-950/10 hover:border-emerald-700/60',
    sky:     'border-sky-900/40 bg-sky-950/10 hover:border-sky-700/60',
    zinc:    'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700',
    red:     'border-red-900/40 bg-red-950/10 hover:border-red-700/60',
  };
  const inner = (
    <>
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <div>
        <div className="font-serif text-3xl text-zinc-50">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      </div>
    </>
  );
  const classes = `flex h-full flex-col justify-between rounded border p-4 transition-colors ${accents[accent]}`;
  return href ? <Link href={href} className={classes}>{inner}</Link> : <div className={classes}>{inner}</div>;
}

type TrendPoint = { d: string; v: number };

async function fetchTrends() {
  // 30-day daily trends: observations, citations (any), cinecanon citations.
  const obs = await db.execute<TrendPoint>(sql`
    SELECT (observed_at AT TIME ZONE 'UTC')::date::text AS d, COUNT(*)::int AS v
    FROM aeo_response_observations
    WHERE observed_at > NOW() - INTERVAL '30 days'
    GROUP BY 1 ORDER BY 1
  `);
  const allCit = await db.execute<TrendPoint>(sql`
    SELECT (s.created_at AT TIME ZONE 'UTC')::date::text AS d, COUNT(*)::int AS v
    FROM aeo_citation_scores s
    WHERE s.created_at > NOW() - INTERVAL '30 days'
    GROUP BY 1 ORDER BY 1
  `);
  const ourCit = await db.execute<TrendPoint>(sql`
    SELECT (s.created_at AT TIME ZONE 'UTC')::date::text AS d, COUNT(*)::int AS v
    FROM aeo_citation_scores s
    WHERE s.created_at > NOW() - INTERVAL '30 days'
      AND s.is_cinecanon = true
    GROUP BY 1 ORDER BY 1
  `);
  const askLog = await db.execute<TrendPoint>(sql`
    SELECT (observed_at AT TIME ZONE 'UTC')::date::text AS d, COUNT(*)::int AS v
    FROM ask_query_log
    WHERE observed_at > NOW() - INTERVAL '30 days'
    GROUP BY 1 ORDER BY 1
  `);
  return { obs, allCit, ourCit, askLog };
}

export default async function AeoLandingPage() {
  const c = await fetchCounts();
  const trends = await fetchTrends();
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-zinc-50">AEO Observatory</h1>
        <p className="mt-1 text-sm text-zinc-400">
          CineCanon-Sentinel — daily Citation Precision measurement across ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews.
          {c.last_cycle ? (
            <> Last cycle: <span className="text-zinc-200">{c.last_cycle}</span> ({c.last_cycle_status}).</>
          ) : (
            <> <span className="text-amber-400">No cycle has run yet</span> — wire Hermes to start measurement.</>
          )}
        </p>
      </header>

      <section>
        <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Live counters</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Prompts active"     value={c.prompts_active}        href="/admin/aeo/precision" accent="amber" />
          <Tile label="Cycles total"       value={c.cycles_total}                                       accent="zinc" />
          <Tile label="Observations / 7d"  value={c.observations_7d}                                    accent="sky" />
          <Tile label="CineCanon citations / 7d" value={c.cinecanon_citations_7d}                        accent="emerald" />
          <Tile label="Pending interventions"  value={c.pending_interventions} href="/admin/aeo/interventions" accent={c.pending_interventions > 0 ? 'amber' : 'zinc'} />
          <Tile label="Earned-media targets"   value={c.earned_media_open}     href="/admin/aeo/earned-media"  accent={c.earned_media_open > 0 ? 'amber' : 'zinc'} />
          <Tile label="/ask queries / 24h"     value={c.ask_log_24h}                                       accent="sky" />
          <Tile label="Precision history"      value="open →"                  href="/admin/aeo/precision"     accent="zinc" />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Trends · last 30 days</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TrendCard
            label="Observations / day"
            values={trends.obs.map((r) => r.v)}
            labels={trends.obs.map((r) => r.d)}
            color="#38bdf8"
            blurb="Engine responses captured per day."
          />
          <TrendCard
            label="Citations / day (total)"
            values={trends.allCit.map((r) => r.v)}
            labels={trends.allCit.map((r) => r.d)}
            color="#a78bfa"
            blurb="Total URLs the engines cited."
          />
          <TrendCard
            label="CineCanon citations / day"
            values={trends.ourCit.map((r) => r.v)}
            labels={trends.ourCit.map((r) => r.d)}
            color="#34d399"
            blurb="How often engines cited cinecanon.com. The hero trend."
            heroish
          />
          <TrendCard
            label="/ask queries / day"
            values={trends.askLog.map((r) => r.v)}
            labels={trends.askLog.map((r) => r.d)}
            color="#f59e0b"
            blurb="Working-pro questions through the /ask flywheel."
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Public surfaces</h2>
        <ul className="space-y-1.5 text-sm">
          <li><Link href="/api/v1/aeo/precision" className="text-amber-400 hover:underline">/api/v1/aeo/precision</Link> — daily metrics feed (CC-BY)</li>
          <li><Link href="/api/v1/aeo/claims" className="text-amber-400 hover:underline">/api/v1/aeo/claims</Link> — high-confidence claims feed</li>
          <li><Link href="/api/v1/aeo/digest.xml" className="text-amber-400 hover:underline">/api/v1/aeo/digest.xml</Link> — Atom feed</li>
        </ul>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400">
        <p>
          Storage lives in the <code>aeo_*</code> tables (migration 0091) plus <code>ask_query_log</code> (0092).
          The skill at <code>.claude/skills/cinecanon-sentinel/</code> defines agent behavior; the daily GitHub
          Actions cron runs at 10:00 UTC via <code>.github/workflows/aeo-cycle.yml</code>.
        </p>
      </section>
    </div>
  );
}

function TrendCard({
  label, values, labels, color, blurb, heroish = false,
}: {
  label: string;
  values: number[];
  labels: string[];
  color: string;
  blurb: string;
  heroish?: boolean;
}) {
  const latest = values.length ? values[values.length - 1]! : 0;
  const sum30 = values.reduce((a, b) => a + b, 0);
  return (
    <div className={`rounded border p-3 ${heroish ? 'border-emerald-900/40 bg-emerald-950/10' : 'border-zinc-800 bg-zinc-900/40'}`}>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
      <div className="mt-2">
        <Sparkline
          values={values}
          labels={labels}
          ariaLabel={label}
          width={220}
          height={36}
          color={color}
        />
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="font-serif text-xl text-zinc-50">{latest.toLocaleString()}</span>
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">
          {sum30.toLocaleString()} <span className="text-zinc-600">over 30d</span>
        </span>
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">{blurb}</p>
    </div>
  );
}
