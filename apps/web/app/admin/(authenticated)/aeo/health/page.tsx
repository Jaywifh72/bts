import type { Metadata } from 'next';
import Link from 'next/link';
import { db, sql } from '@bts/db';
import { isGscConfigured } from '@/lib/gsc';

export const metadata: Metadata = {
  title: 'AEO — Health',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Status = 'ok' | 'warn' | 'fail' | 'na';

type Check = {
  name: string;
  status: Status;
  value: string;
  detail: string;
  href?: string;
};

type Stats = {
  cycles_total: number;
  last_cycle_status: string | null;
  last_cycle_ran_on: string | null;
  last_cycle_hours_ago: number | null;
  last_obs_hours_ago: number | null;
  observations_7d: number;
  citations_7d: number;
  our_citations_7d: number;
  failed_cycles_7d: number;
  partial_cycles_7d: number;
  ok_cycles_7d: number;
  active_engines: number;
  active_prompts: number;
};

async function fetchStats(): Promise<Stats> {
  const [row] = await db.execute<Stats>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM aeo_cycles) AS cycles_total,
      (SELECT status FROM aeo_cycles ORDER BY started_at DESC LIMIT 1) AS last_cycle_status,
      (SELECT ran_on::text FROM aeo_cycles ORDER BY started_at DESC LIMIT 1) AS last_cycle_ran_on,
      (SELECT EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600 FROM aeo_cycles ORDER BY started_at DESC LIMIT 1)::int AS last_cycle_hours_ago,
      (SELECT EXTRACT(EPOCH FROM (NOW() - MAX(observed_at))) / 3600 FROM aeo_response_observations)::int AS last_obs_hours_ago,
      (SELECT COUNT(*)::int FROM aeo_response_observations WHERE observed_at > NOW() - INTERVAL '7 days') AS observations_7d,
      (SELECT COUNT(*)::int FROM aeo_citation_scores s
         JOIN aeo_response_observations o ON o.id = s.observation_id
         WHERE o.observed_at > NOW() - INTERVAL '7 days') AS citations_7d,
      (SELECT COUNT(*)::int FROM aeo_citation_scores s
         JOIN aeo_response_observations o ON o.id = s.observation_id
         WHERE o.observed_at > NOW() - INTERVAL '7 days' AND s.is_cinecanon = true) AS our_citations_7d,
      (SELECT COUNT(*)::int FROM aeo_cycles WHERE started_at > NOW() - INTERVAL '7 days' AND status = 'failed') AS failed_cycles_7d,
      (SELECT COUNT(*)::int FROM aeo_cycles WHERE started_at > NOW() - INTERVAL '7 days' AND status = 'partial') AS partial_cycles_7d,
      (SELECT COUNT(*)::int FROM aeo_cycles WHERE started_at > NOW() - INTERVAL '7 days' AND status = 'succeeded') AS ok_cycles_7d,
      (SELECT COUNT(*)::int FROM aeo_engines WHERE active = true) AS active_engines,
      (SELECT COUNT(*)::int FROM aeo_prompts WHERE deprecated_on IS NULL) AS active_prompts
  `);
  return row!;
}

function gradeChecks(s: Stats, gscConfigured: boolean): Check[] {
  const cycleAge = s.last_cycle_hours_ago ?? 9999;
  const obsAge = s.last_obs_hours_ago ?? 9999;
  const ok7d = s.ok_cycles_7d ?? 0;
  const failed7d = s.failed_cycles_7d ?? 0;
  const partial7d = s.partial_cycles_7d ?? 0;
  const ranOn = s.last_cycle_ran_on ?? 'never';

  return [
    {
      name: 'Daily cron freshness',
      status: cycleAge > 36 ? 'fail' : cycleAge > 26 ? 'warn' : 'ok',
      value: cycleAge >= 24 ? `${(cycleAge / 24).toFixed(1)}d ago` : `${cycleAge}h ago`,
      detail: `Last cycle started ${cycleAge}h ago. Expected daily fire @ 10:00 UTC. >36h = cron is broken.`,
      href: 'https://github.com/Jaywifh72/bts/actions/workflows/aeo-cycle.yml',
    },
    {
      name: 'Last cycle outcome',
      status: s.last_cycle_status === 'succeeded' ? 'ok'
        : s.last_cycle_status === 'partial' ? 'warn'
        : s.last_cycle_status === 'failed' || s.last_cycle_status === null ? 'fail'
        : 'warn',
      value: s.last_cycle_status ?? 'never run',
      detail: `Cycle that ran on ${ranOn}. 'partial' = one engine failed; 'failed' = nothing landed.`,
    },
    {
      name: 'Cycle success rate (7d)',
      status: ok7d >= 5 ? 'ok' : ok7d >= 3 ? 'warn' : 'fail',
      value: `${ok7d} ok / ${partial7d} partial / ${failed7d} failed`,
      detail: 'A healthy week is ~7 ok cycles. Anything below 5 means investigate the cycle workflow.',
    },
    {
      name: 'Observation freshness',
      status: obsAge > 36 ? 'fail' : obsAge > 28 ? 'warn' : 'ok',
      value: obsAge >= 24 ? `${(obsAge / 24).toFixed(1)}d ago` : `${obsAge}h ago`,
      detail: 'Time since the most recent engine response landed. Should track cron freshness.',
    },
    {
      name: 'Citation extraction working',
      status: s.observations_7d === 0 ? 'fail'
        : s.citations_7d === 0 ? 'fail'
        : s.citations_7d / Math.max(s.observations_7d, 1) >= 1 ? 'ok'
        : 'warn',
      value: `${s.citations_7d.toLocaleString()} citations / ${s.observations_7d.toLocaleString()} obs`,
      detail: 'Each engine should produce ~3–10 citations per query when web_search is on. 0 = the API response shape changed and our parser broke.',
    },
    {
      name: 'CineCanon citation share',
      status: s.our_citations_7d === 0 ? 'warn' : 'ok',
      value: `${s.our_citations_7d} of ${s.citations_7d} (${s.citations_7d > 0 ? ((s.our_citations_7d / s.citations_7d) * 100).toFixed(1) : '0.0'}%)`,
      detail: 'The hero metric. Zero is the starting condition; this rises as the editorial team and earned-media work pay off. Not a failure today.',
    },
    {
      name: 'Active engines',
      status: s.active_engines >= 3 ? 'ok' : s.active_engines >= 1 ? 'warn' : 'fail',
      value: `${s.active_engines} of 5`,
      detail: 'Engines registered as active in aeo_engines. 5 = chatgpt, claude, gemini, perplexity, ai_overview.',
    },
    {
      name: 'Prompt bank',
      status: s.active_prompts >= 30 ? 'ok' : s.active_prompts >= 10 ? 'warn' : 'fail',
      value: `${s.active_prompts} active`,
      detail: 'Buyer-intent prompts. v1 ships with 30 seeded; the /ask flywheel will grow it organically.',
    },
    {
      name: 'GSC integration',
      status: gscConfigured ? 'ok' : 'warn',
      value: gscConfigured ? 'configured' : 'not configured',
      detail: gscConfigured
        ? 'Google Search Console env vars present. Organic-search performance visible at /admin/seo.'
        : 'Without GSC, you cannot answer "how is organic Google going". Set GSC_SERVICE_ACCOUNT_* in Vercel.',
      href: '/admin/seo',
    },
  ];
}

function overallGrade(checks: Check[]): { letter: string; pct: number; color: string } {
  const weights: Record<Status, number> = { ok: 1, warn: 0.5, fail: 0, na: 0.5 };
  const sum = checks.reduce((a, c) => a + weights[c.status], 0);
  const pct = (sum / checks.length) * 100;
  if (pct >= 90) return { letter: 'A', pct, color: '#34d399' };
  if (pct >= 75) return { letter: 'B', pct, color: '#84cc16' };
  if (pct >= 60) return { letter: 'C', pct, color: '#f59e0b' };
  if (pct >= 40) return { letter: 'D', pct, color: '#fb923c' };
  return { letter: 'F', pct, color: '#ef4444' };
}

export default async function AeoHealthPage() {
  const stats = await fetchStats();
  const checks = gradeChecks(stats, isGscConfigured());
  const grade = overallGrade(checks);
  const okCount = checks.filter((c) => c.status === 'ok').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-3xl text-zinc-50">AEO Health</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Is the observatory running, and is it producing trustworthy data? Refresh this page to re-check.
          </p>
        </div>
        <Link href="/admin/aeo" className="text-sm text-zinc-400 hover:text-amber-400">← AEO home</Link>
      </header>

      <section className="rounded border-2 p-6" style={{ borderColor: `${grade.color}66`, background: `${grade.color}11` }}>
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">Overall observatory grade</p>
            <p className="mt-1 font-serif text-5xl text-zinc-50" style={{ color: grade.color }}>
              {grade.letter}
            </p>
            <p className="mt-1 text-xs text-zinc-400">{grade.pct.toFixed(0)} / 100</p>
          </div>
          <div className="flex gap-4 text-sm">
            <Stat label="OK" value={okCount} color="#34d399" />
            <Stat label="Warn" value={warnCount} color="#f59e0b" />
            <Stat label="Fail" value={failCount} color="#ef4444" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Health checks</h2>
        <ul className="space-y-2">
          {checks.map((c) => <CheckRow key={c.name} c={c} />)}
        </ul>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400 italic">
        <p>
          Failure alerts: the cron workflow opens a GitHub issue on consecutive failures
          (see <code>.github/workflows/aeo-failure-alert.yml</code>). If the grade above is &le; C,
          something needs your attention even if no issue has been opened yet.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className="font-serif text-2xl" style={{ color }}>{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
    </div>
  );
}

function CheckRow({ c }: { c: Check }) {
  const colors: Record<Status, string> = {
    ok:   'border-emerald-900/40 bg-emerald-950/10',
    warn: 'border-amber-900/40 bg-amber-950/10',
    fail: 'border-red-900/40 bg-red-950/10',
    na:   'border-zinc-800 bg-zinc-900/30',
  };
  const dot: Record<Status, string> = {
    ok: 'bg-emerald-500',
    warn: 'bg-amber-500',
    fail: 'bg-red-500',
    na: 'bg-zinc-600',
  };
  return (
    <li className={`rounded border ${colors[c.status]} p-3`}>
      <div className="flex items-baseline gap-3">
        <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dot[c.status]}`} aria-label={c.status} />
        <h3 className="font-serif text-base text-zinc-100">{c.name}</h3>
        <span className="ml-auto font-mono text-sm text-zinc-300">{c.value}</span>
      </div>
      <p className="ml-5 mt-1 text-xs italic text-zinc-400">{c.detail}</p>
      {c.href && (
        <p className="ml-5 mt-1 text-[11px]">
          <Link href={c.href} className="text-amber-400 hover:underline" target={c.href.startsWith('http') ? '_blank' : undefined}>
            {c.href.startsWith('http') ? 'Open ↗' : 'Go →'}
          </Link>
        </p>
      )}
    </li>
  );
}
