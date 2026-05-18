'use client';
import { useMemo, useState } from 'react';

type Platform = 'theatrical' | 'streaming-tentpole' | 'streaming-standard' | 'broadcast' | 'mixed-tv';
type Budget = 'low' | 'medium' | 'high' | 'tentpole';

type Target = {
  key: 'dolby-vision' | 'hdr10-plus' | 'hdr10' | 'hlg';
  label: string;
  blurb: string;
};

const TARGETS: Target[] = [
  { key: 'dolby-vision', label: 'Dolby Vision', blurb: 'Per-shot dynamic metadata; the prestige streaming + theatrical standard. Requires DV-certified mastering pipeline.' },
  { key: 'hdr10-plus', label: 'HDR10+', blurb: 'Open dynamic metadata alternative. Strong on Amazon Prime Video and Samsung devices. Cheaper than DV to master.' },
  { key: 'hdr10',       label: 'HDR10', blurb: 'Baseline static-metadata HDR. Universally supported, required as fallback even when DV is primary.' },
  { key: 'hlg',         label: 'HLG (Hybrid Log-Gamma)', blurb: 'Broadcast-friendly HDR with no metadata; one signal renders on SDR + HDR sets. Live TV + Japan public broadcaster default.' },
];

export function HdrTargetPicker() {
  const [platform, setPlatform] = useState<Platform>('streaming-standard');
  const [budget, setBudget] = useState<Budget>('medium');
  const [needsDynamic, setNeedsDynamic] = useState(true);
  const [theatricalAlso, setTheatricalAlso] = useState(false);

  const scores = useMemo(() => {
    const s = { 'dolby-vision': 0, 'hdr10-plus': 0, 'hdr10': 0, 'hlg': 0 };

    // Platform mix
    if (platform === 'theatrical') { s['dolby-vision'] += 3; s.hdr10 += 1; }
    if (platform === 'streaming-tentpole') { s['dolby-vision'] += 4; s['hdr10-plus'] += 1; s.hdr10 += 2; }
    if (platform === 'streaming-standard') { s['dolby-vision'] += 2; s['hdr10-plus'] += 2; s.hdr10 += 3; }
    if (platform === 'broadcast') { s.hlg += 4; s.hdr10 += 2; }
    if (platform === 'mixed-tv') { s.hdr10 += 3; s.hlg += 2; s['hdr10-plus'] += 1; }

    // Budget
    if (budget === 'low') { s.hdr10 += 3; s.hlg += 2; s['dolby-vision'] -= 2; }
    if (budget === 'medium') { s.hdr10 += 2; s['hdr10-plus'] += 1; }
    if (budget === 'high') { s['dolby-vision'] += 2; s['hdr10-plus'] += 1; }
    if (budget === 'tentpole') { s['dolby-vision'] += 4; }

    // Dynamic metadata need
    if (needsDynamic) { s['dolby-vision'] += 3; s['hdr10-plus'] += 2; s.hdr10 -= 1; s.hlg -= 2; }
    else { s.hdr10 += 1; s.hlg += 1; }

    if (theatricalAlso) { s['dolby-vision'] += 2; }

    return s;
  }, [platform, budget, needsDynamic, theatricalAlso]);

  const ranked = useMemo(() =>
    TARGETS.map((t) => ({ ...t, score: scores[t.key] }))
           .sort((a, b) => b.score - a.score),
    [scores],
  );

  const primary = ranked[0];
  const fallback = ranked.find((t) => t.key === 'hdr10' && t.key !== primary?.key) ?? ranked[1];

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
      <section className="space-y-4 rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-[10px] uppercase tracking-widest text-zinc-500">Inputs</h2>

        <label className="block text-sm text-zinc-300">
          <span className="mb-1 block">Primary platform</span>
          <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5">
            <option value="theatrical">Theatrical first</option>
            <option value="streaming-tentpole">Streaming (tentpole, Netflix / Apple / Prime)</option>
            <option value="streaming-standard">Streaming (standard)</option>
            <option value="broadcast">Broadcast / live TV</option>
            <option value="mixed-tv">Mixed TV (linear + VOD)</option>
          </select>
        </label>

        <label className="block text-sm text-zinc-300">
          <span className="mb-1 block">Finishing budget</span>
          <select value={budget} onChange={(e) => setBudget(e.target.value as Budget)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5">
            <option value="low">Low (indie / boutique post)</option>
            <option value="medium">Medium</option>
            <option value="high">High (premium feature)</option>
            <option value="tentpole">Tentpole</option>
          </select>
        </label>

        <div className="space-y-2 text-sm text-zinc-300">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={needsDynamic} onChange={(e) => setNeedsDynamic(e.target.checked)} />
            Need per-shot dynamic metadata
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={theatricalAlso} onChange={(e) => setTheatricalAlso(e.target.checked)} />
            Also delivering theatrical
          </label>
        </div>
      </section>

      <section className="rounded border border-amber-700/40 bg-amber-950/10 p-4">
        <h2 className="text-[10px] uppercase tracking-widest text-amber-300">Recommendation</h2>

        {primary && (
          <div className="mb-3 rounded border border-amber-700 bg-amber-950/30 p-3">
            <div className="text-[10px] uppercase tracking-widest text-amber-300">Primary</div>
            <div className="mt-1 font-serif text-xl text-amber-400">{primary.label}</div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-300">{primary.blurb}</p>
          </div>
        )}

        {fallback && fallback.key !== primary?.key && (
          <div className="mb-3 rounded border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-400">Mandatory fallback</div>
            <div className="mt-1 font-serif text-zinc-200">{fallback.label}</div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{fallback.blurb}</p>
          </div>
        )}

        <h3 className="mt-4 text-[10px] uppercase tracking-widest text-zinc-500">Full ranking</h3>
        <ul className="mt-2 space-y-1 text-xs text-zinc-400">
          {ranked.map((t) => (
            <li key={t.key} className="flex items-baseline justify-between">
              <span>{t.label}</span>
              <span className="font-mono text-zinc-500">score {t.score}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 border-t border-zinc-800 pt-3 text-[11px] leading-relaxed text-zinc-500">
          HDR10 is effectively a required deliverable across all targets — every HDR-aware platform
          accepts it as a baseline. Dolby Vision / HDR10+ master always includes HDR10 fallback in spec.
        </p>
      </section>
    </div>
  );
}
