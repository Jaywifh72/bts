'use client';
import { useMemo, useState } from 'react';

// Indicative 2024-25 AFM Phonograph Code numbers for film scoring sessions.
// These are working estimates — actual rates vary by AFM Local, scale,
// doubling, leader/sub-leader bumps, and stage's house rate.

const STAGE_TIERS = {
  'tier-1': { label: 'Tier 1 (AIR, Sony, Newman, Synchron)', perHour: 4200, setupFee: 6000 },
  'tier-2': { label: 'Tier 2 (Eastwood, Capitol, Wired, Bratislava)', perHour: 2400, setupFee: 3500 },
  'tier-3': { label: 'Tier 3 (regional / Eastern European)', perHour: 1100, setupFee: 1500 },
} as const;

type StageKey = keyof typeof STAGE_TIERS;

export function ScoringCostCalculator() {
  const [players, setPlayers] = useState(60);
  const [hours, setHours] = useState(3);
  const [stage, setStage] = useState<StageKey>('tier-1');
  const [conductor, setConductor] = useState(true);
  const [contractor, setContractor] = useState(true);
  const [cueCount, setCueCount] = useState(8);

  const result = useMemo(() => {
    const tier = STAGE_TIERS[stage];
    const stageCost = tier.perHour * hours + tier.setupFee;

    // AFM scale-ish — 3-hour session minimum, ~$520/musician for a 3hr session, ~$170/hr after.
    const sessionRate = hours <= 3 ? 520 : 520 + (hours - 3) * 170;
    // Section leaders + sub-leaders get +50% / +25% — approximate the bump.
    const sectionLeaderBump = Math.round(players * 0.18) * sessionRate * 0.35;
    const playerCost = players * sessionRate + sectionLeaderBump;

    // Pension & health adds ~13% on top of scale.
    const pension = playerCost * 0.13;

    const conductorCost = conductor ? Math.max(1500, hours * 800) : 0;
    const contractorCost = contractor ? Math.max(800, players * 25) : 0;

    // Misc: librarian, copyist, score prep, rigger.
    const ancillary = Math.round(players * 35) + 600;

    const subtotal = stageCost + playerCost + pension + conductorCost + contractorCost + ancillary;
    const contingency = subtotal * 0.10;
    const total = subtotal + contingency;

    return {
      stageCost, playerCost, pension, conductorCost, contractorCost,
      ancillary, subtotal, contingency, total,
      perCue: cueCount > 0 ? total / cueCount : null,
      sessionRate,
    };
  }, [players, hours, stage, conductor, contractor, cueCount]);

  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
      <section className="space-y-4 rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-[10px] uppercase tracking-widest text-zinc-500">Session parameters</h2>

        <label className="block text-sm text-zinc-300">
          <div className="mb-1 flex items-baseline justify-between">
            <span>Players</span><span className="font-mono text-amber-400">{players}</span>
          </div>
          <input type="range" min={12} max={110} value={players}
            onChange={(e) => setPlayers(Number(e.target.value))}
            className="w-full accent-amber-500" />
          <p className="mt-1 text-xs text-zinc-500">A pops orchestra is ~50, a full romantic ensemble ~85, a tentpole "Hollywood orchestra" 90+.</p>
        </label>

        <label className="block text-sm text-zinc-300">
          <div className="mb-1 flex items-baseline justify-between">
            <span>Session hours</span><span className="font-mono text-amber-400">{hours}h</span>
          </div>
          <input type="range" min={3} max={10} value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full accent-amber-500" />
          <p className="mt-1 text-xs text-zinc-500">AFM minimum is 3hr. Most film sessions are 3 or 6 hr.</p>
        </label>

        <label className="block text-sm text-zinc-300">
          <span className="mb-1 block">Scoring stage tier</span>
          <select value={stage} onChange={(e) => setStage(e.target.value as StageKey)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100">
            {Object.entries(STAGE_TIERS).map(([k, v]) => (
              <option key={k} value={k}>{v.label} — {fmt(v.perHour)}/hr</option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-zinc-300">
          <div className="mb-1 flex items-baseline justify-between">
            <span>Cues to record</span><span className="font-mono text-amber-400">{cueCount}</span>
          </div>
          <input type="range" min={1} max={30} value={cueCount}
            onChange={(e) => setCueCount(Number(e.target.value))}
            className="w-full accent-amber-500" />
        </label>

        <div className="flex gap-4 text-sm text-zinc-300">
          <label className="flex items-center gap-2"><input type="checkbox" checked={conductor} onChange={(e) => setConductor(e.target.checked)} /> Conductor</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={contractor} onChange={(e) => setContractor(e.target.checked)} /> Contractor</label>
        </div>
      </section>

      <section className="space-y-2 rounded border border-amber-700/40 bg-amber-950/10 p-4">
        <h2 className="text-[10px] uppercase tracking-widest text-amber-300">Estimate</h2>
        <div className="mb-3 font-serif text-3xl text-zinc-100">{fmt(result.total)}</div>
        {result.perCue !== null && (
          <p className="text-sm text-zinc-400">≈ <span className="text-amber-400">{fmt(result.perCue)}</span> per cue ({cueCount} cues)</p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="text-zinc-500">Stage</dt><dd className="text-right font-mono text-zinc-300">{fmt(result.stageCost)}</dd>
          <dt className="text-zinc-500">Players (scale)</dt><dd className="text-right font-mono text-zinc-300">{fmt(result.playerCost)}</dd>
          <dt className="text-zinc-500">Pension & H&W (~13%)</dt><dd className="text-right font-mono text-zinc-300">{fmt(result.pension)}</dd>
          {conductor && (<><dt className="text-zinc-500">Conductor</dt><dd className="text-right font-mono text-zinc-300">{fmt(result.conductorCost)}</dd></>)}
          {contractor && (<><dt className="text-zinc-500">Contractor</dt><dd className="text-right font-mono text-zinc-300">{fmt(result.contractorCost)}</dd></>)}
          <dt className="text-zinc-500">Ancillary (libr., prep)</dt><dd className="text-right font-mono text-zinc-300">{fmt(result.ancillary)}</dd>
          <dt className="text-zinc-500">Contingency (10%)</dt><dd className="text-right font-mono text-zinc-300">{fmt(result.contingency)}</dd>
        </dl>

        <p className="mt-4 border-t border-zinc-800 pt-3 text-[11px] leading-relaxed text-zinc-500">
          Working estimate only. Per-musician scale, leader/sub-leader bumps, doublings,
          new-use buyouts, and stage house fees vary by local and contract. Always confirm with the
          contractor before scoping a budget.
        </p>
      </section>
    </div>
  );
}
