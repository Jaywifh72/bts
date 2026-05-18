'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';

// Each axis: 0 = strongly spherical, 10 = strongly anamorphic.
// Order is the question the DP would ask in this order.
const AXES = [
  { key: 'aspect',     label: 'Target aspect ratio', sphericalHint: '1.85 / 16:9', anamorphicHint: '2.39 with native squeeze' },
  { key: 'character',  label: 'Lens character priority', sphericalHint: 'Neutral / sharp edge-to-edge', anamorphicHint: 'Oval bokeh + horiz flares' },
  { key: 'budget',     label: 'Rental + lighting budget', sphericalHint: 'Tight', anamorphicHint: 'Tentpole' },
  { key: 'weight',     label: 'Rig weight tolerance', sphericalHint: 'Handheld / Steadicam-heavy', anamorphicHint: 'Studio / dolly-heavy' },
  { key: 'closeFocus', label: 'Close-focus need', sphericalHint: 'Tight CU, intimate blocking', anamorphicHint: 'Mostly wider blocking' },
  { key: 'vfxLoad',    label: 'VFX integration load', sphericalHint: 'Heavy CG / comp work', anamorphicHint: 'Mostly practical' },
] as const;

type AxisKey = typeof AXES[number]['key'];

export function AnamorphicMatrix() {
  const [values, setValues] = useState<Record<AxisKey, number>>({
    aspect: 5, character: 5, budget: 5, weight: 5, closeFocus: 5, vfxLoad: 5,
  });

  const total = useMemo(
    () => AXES.reduce((acc, a) => acc + values[a.key], 0),
    [values],
  );
  const max = AXES.length * 10;
  const percent = (total / max) * 100;

  const verdict = useMemo(() => {
    if (percent >= 70) return { label: 'Anamorphic', tone: 'strong', body: 'Your project skews strongly anamorphic. Plan for slower glass, larger rentals, anamorphic mumps mitigations on long focal lengths, and lighting load to support T2.8–T4 stops.' };
    if (percent >= 55) return { label: 'Anamorphic (lean)', tone: 'lean', body: 'Anamorphic likely the right call, but verify on lens-test day that close-focus and rig weight don’t block your blocking.' };
    if (percent >= 45) return { label: 'Either could work — test both', tone: 'neutral', body: 'You’re inside the noise floor of the matrix. Schedule a side-by-side test day on the same setup; pick by performance reads, not theory.' };
    if (percent >= 30) return { label: 'Spherical (lean)', tone: 'lean', body: 'Spherical is probably the better fit. Consider modern primes (Cooke S7/i, Signature, ALFA) for some warmth without anamorphic penalties.' };
    return { label: 'Spherical', tone: 'strong', body: 'Your project skews strongly spherical. Faster glass, lighter rigs, easier VFX integration. If you want some "filmic" character, look at vintage spherical sets or rear-element flares.' };
  }, [percent]);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
      <section className="space-y-4 rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-[10px] uppercase tracking-widest text-zinc-500">Score each axis (0 = spherical · 10 = anamorphic)</h2>
        {AXES.map((a) => (
          <div key={a.key}>
            <div className="mb-1 flex items-baseline justify-between text-sm text-zinc-300">
              <span>{a.label}</span>
              <span className="font-mono text-amber-400">{values[a.key]}</span>
            </div>
            <input type="range" min={0} max={10} value={values[a.key]}
              onChange={(e) => setValues({ ...values, [a.key]: Number(e.target.value) })}
              className="w-full accent-amber-500" />
            <div className="mt-0.5 flex justify-between text-[10px] uppercase tracking-widest text-zinc-500">
              <span>{a.sphericalHint}</span>
              <span>{a.anamorphicHint}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded border border-amber-700/40 bg-amber-950/10 p-4">
        <h2 className="text-[10px] uppercase tracking-widest text-amber-300">Recommendation</h2>
        <div className="mt-2 font-serif text-3xl text-zinc-100">{verdict.label}</div>
        <div className="mt-3">
          <div className="h-3 w-full overflow-hidden rounded bg-zinc-800">
            <div className="h-full bg-amber-500" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] uppercase tracking-widest text-zinc-500">
            <span>Spherical</span>
            <span className="font-mono text-zinc-400">{total} / {max}</span>
            <span>Anamorphic</span>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-zinc-300">{verdict.body}</p>
        <p className="mt-4 border-t border-zinc-800 pt-3 text-[11px] leading-relaxed text-zinc-500">
          See the full{' '}
          <Link href="/decisions/anamorphic-vs-spherical" className="text-amber-400 hover:underline">
            decision tree
          </Link>{' '}
          for pros, cons, example films, and the matrix logic.
        </p>
      </section>
    </div>
  );
}
