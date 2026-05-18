'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';

type Framing = 'tight' | 'medium' | 'wide';
type Takes = 'single' | 'few' | 'many';
type Experience = 'novice' | 'experienced' | 'expert';

type Rig = {
  key: 'wire' | 'decelerator' | 'airbag';
  label: string;
  blurb: string;
};

const RIGS: Rig[] = [
  { key: 'wire', label: 'Wire descent rig', blurb: 'Controlled descent on cable + brake. Highly repeatable, paint-out cost in post.' },
  { key: 'decelerator', label: 'Decelerator', blurb: 'Free-fall feel until device engages near landing. Single take per setup.' },
  { key: 'airbag', label: 'Airbag landing', blurb: 'Stacked airbag rated to fall height. Repeatable but landing target is fixed.' },
];

export function StuntRigPicker() {
  const [height, setHeight] = useState(10);
  const [framing, setFraming] = useState<Framing>('medium');
  const [takes, setTakes] = useState<Takes>('few');
  const [experience, setExperience] = useState<Experience>('experienced');

  const scores = useMemo(() => {
    const s = { wire: 0, decelerator: 0, airbag: 0 };

    // Height
    if (height <= 8) { s.airbag += 2; s.decelerator += 2; s.wire += 1; }
    else if (height <= 20) { s.airbag += 3; s.decelerator += 2; s.wire += 2; }
    else if (height <= 30) { s.airbag += 2; s.wire += 3; s.decelerator += 1; }
    else { s.wire += 4; s.airbag -= 2; s.decelerator -= 1; }

    // Framing — wide hides the bag, tight exposes wires
    if (framing === 'tight') { s.decelerator += 2; s.airbag -= 2; s.wire -= 1; }
    if (framing === 'medium') { s.decelerator += 1; s.wire += 1; }
    if (framing === 'wide') { s.wire -= 2; s.airbag -= 3; s.decelerator += 1; }

    // Takes
    if (takes === 'single') { s.decelerator += 3; s.wire += 1; }
    if (takes === 'few') { s.wire += 2; s.airbag += 2; }
    if (takes === 'many') { s.wire += 3; s.airbag += 3; s.decelerator -= 2; }

    // Experience
    if (experience === 'novice') { s.wire += 3; s.airbag += 1; s.decelerator -= 2; }
    if (experience === 'experienced') { s.wire += 1; s.airbag += 1; s.decelerator += 1; }
    if (experience === 'expert') { s.decelerator += 2; s.wire += 1; }

    return s;
  }, [height, framing, takes, experience]);

  const ranked = useMemo(() =>
    RIGS.map((r) => ({ ...r, score: scores[r.key] }))
        .sort((a, b) => b.score - a.score),
    [scores],
  );

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
      <section className="space-y-4 rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-[10px] uppercase tracking-widest text-zinc-500">Inputs</h2>

        <label className="block text-sm text-zinc-300">
          <div className="mb-1 flex items-baseline justify-between">
            <span>Fall height</span><span className="font-mono text-amber-400">{height} m</span>
          </div>
          <input type="range" min={2} max={45} value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full accent-amber-500" />
        </label>

        <label className="block text-sm text-zinc-300">
          <span className="mb-1 block">On-camera framing</span>
          <select value={framing} onChange={(e) => setFraming(e.target.value as Framing)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5">
            <option value="tight">Tight (CU / MS)</option>
            <option value="medium">Medium / cowboy</option>
            <option value="wide">Wide / full body</option>
          </select>
        </label>

        <label className="block text-sm text-zinc-300">
          <span className="mb-1 block">Takes needed</span>
          <select value={takes} onChange={(e) => setTakes(e.target.value as Takes)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5">
            <option value="single">Single hero take</option>
            <option value="few">2–4 takes</option>
            <option value="many">5+ takes</option>
          </select>
        </label>

        <label className="block text-sm text-zinc-300">
          <span className="mb-1 block">Performer experience</span>
          <select value={experience} onChange={(e) => setExperience(e.target.value as Experience)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5">
            <option value="novice">Lead actor (limited stunt work)</option>
            <option value="experienced">Experienced stunt performer</option>
            <option value="expert">Specialist high-fall performer</option>
          </select>
        </label>
      </section>

      <section className="rounded border border-amber-700/40 bg-amber-950/10 p-4">
        <h2 className="text-[10px] uppercase tracking-widest text-amber-300">Recommendation</h2>
        <ol className="mt-3 space-y-3">
          {ranked.map((r, i) => (
            <li key={r.key} className={`rounded border p-3 ${i === 0 ? 'border-amber-700 bg-amber-950/30' : 'border-zinc-800 bg-zinc-900/40'}`}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className={`font-serif ${i === 0 ? 'text-amber-400' : 'text-zinc-300'}`}>
                  {i === 0 && '★ '}{r.label}
                </h3>
                <span className="font-mono text-xs text-zinc-500">score {r.score}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">{r.blurb}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
          Working recommendation only. See the{' '}
          <Link href="/decisions/wire-rig-vs-decelerator" className="text-amber-400 hover:underline">
            full decision tree
          </Link>{' '}
          for pros, cons, and example films. Final rig must come from your stunt coordinator.
        </p>
      </section>
    </div>
  );
}
