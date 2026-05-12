import Link from 'next/link';
import type { LightingSetup, LightingFixture } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';

const ROLE_LABELS: Record<string, string> = {
  key:        'Key',
  fill:       'Fill',
  back:       'Back',
  rim:        'Rim',
  kicker:     'Kicker',
  practical:  'Practical',
  eye_light:  'Eye',
  ambient:    'Ambient',
  hair_light: 'Hair',
  set_light:  'Set',
  special:    'Special',
  natural:    'Natural',
};

const ROLE_COLORS: Record<string, string> = {
  key:        'bg-amber-950/40 text-amber-300 border-amber-800',
  fill:       'bg-blue-950/40 text-blue-300 border-blue-800',
  back:       'bg-purple-950/40 text-purple-300 border-purple-800',
  rim:        'bg-pink-950/40 text-pink-300 border-pink-800',
  kicker:     'bg-fuchsia-950/40 text-fuchsia-300 border-fuchsia-800',
  practical:  'bg-emerald-950/40 text-emerald-300 border-emerald-800',
  eye_light:  'bg-cyan-950/40 text-cyan-300 border-cyan-800',
  ambient:    'bg-zinc-900 text-zinc-400 border-zinc-700',
  hair_light: 'bg-rose-950/40 text-rose-300 border-rose-800',
  set_light:  'bg-teal-950/40 text-teal-300 border-teal-800',
  special:    'bg-yellow-950/40 text-yellow-300 border-yellow-800',
  natural:    'bg-orange-950/40 text-orange-300 border-orange-800',
};

function FixtureRow({ f }: { f: LightingFixture }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2 text-sm">
      <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${ROLE_COLORS[f.role] ?? 'bg-zinc-900 text-zinc-400 border-zinc-700'}`}>
        {ROLE_LABELS[f.role] ?? f.role}
      </span>
      <Link
        href={f.item_slug ? `/gear/${f.manufacturer_slug}/${f.series_slug}/${f.item_slug}` : `/gear/${f.manufacturer_slug}/${f.series_slug}`}
        className="text-zinc-100 hover:text-amber-400"
      >
        {f.manufacturer_name} {f.item_name ?? f.series_name}
      </Link>
      {f.color_temp_k != null && (
        <span className="font-mono text-xs text-zinc-500">{f.color_temp_k}K</span>
      )}
      {f.intensity_pct != null && (
        <span className="font-mono text-xs text-zinc-500">{f.intensity_pct}%</span>
      )}
      {f.diffusion && (
        <span className="text-xs text-zinc-500">+ {f.diffusion}</span>
      )}
      {f.position_notes && (
        <span className="ml-auto text-xs text-zinc-500">{f.position_notes}</span>
      )}
    </li>
  );
}

export function LightingSetupsList({ setups }: { setups: readonly LightingSetup[] }) {
  if (setups.length === 0) return null;

  // Group by scene so the timeline reads naturally.
  const byScene = new Map<number, { scene_slug: string; scene_title: string; setups: LightingSetup[] }>();
  for (const s of setups) {
    let g = byScene.get(s.scene_id);
    if (!g) {
      g = { scene_slug: s.scene_slug, scene_title: s.scene_title, setups: [] };
      byScene.set(s.scene_id, g);
    }
    g.setups.push(s);
  }

  return (
    <div className="mt-10">
      <SectionHeader
        label="Lighting"
        heading={`${setups.length} setup${setups.length === 1 ? '' : 's'} across ${byScene.size} scene${byScene.size === 1 ? '' : 's'}`}
      />
      <p className="-mt-2 mb-3 max-w-2xl text-xs text-zinc-500">
        Per-scene lighting plots: fixture role (key / fill / back /
        practical), color temperature, diffusion stack, and motivation
        notes from cited supervisor interviews.
      </p>
      <div className="space-y-6">
        {[...byScene.values()].map((g) => (
          <section key={g.scene_slug}>
            <h3 className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
              <Link href={`#scene-${g.scene_slug}`} className="hover:text-amber-400">
                {g.scene_title}
              </Link>
            </h3>
            <div className="space-y-3">
              {g.setups.map((s) => (
                <div key={s.id} className="rounded border border-zinc-800 bg-zinc-900/40">
                  <div className="border-b border-zinc-800 px-3 py-2">
                    <div className="font-medium text-zinc-100">{s.setup_name}</div>
                    {s.motivation && (
                      <p className="mt-0.5 text-xs text-zinc-500">{s.motivation}</p>
                    )}
                  </div>
                  {s.fixtures.length > 0 ? (
                    <ul className="divide-y divide-zinc-800">
                      {s.fixtures.map((f) => (
                        <FixtureRow key={f.fixture_id} f={f} />
                      ))}
                    </ul>
                  ) : (
                    <div className="px-3 py-2 text-xs text-zinc-600">
                      Setup defined; no fixtures plotted yet.
                    </div>
                  )}
                  {s.notes && (
                    <p className="border-t border-zinc-800 px-3 py-2 text-xs text-zinc-500">
                      {s.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
