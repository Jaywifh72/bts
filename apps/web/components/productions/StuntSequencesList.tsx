import Link from 'next/link';
import type { StuntSequenceRow } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';

function discipline(d: string) {
  return d.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Compact list of stunt sequences keyed to a production. Each entry
 * links to the full sequence-detail page where the rigging breakdown,
 * vehicle data, credits, safety bulletins, and references render in
 * full. Self-hides when no sequences are curated.
 */
export function StuntSequencesList({ sequences }: { sequences: readonly StuntSequenceRow[] }) {
  if (sequences.length === 0) return null;

  return (
    <div className="mt-10">
      <SectionHeader
        label="Stunts"
        heading={`${sequences.length} curated set-piece${sequences.length === 1 ? '' : 's'}`}
      />
      <p className="-mt-2 mb-3 max-w-2xl text-xs text-zinc-500">
        Sequence-level rigging detail — pole-cats, decelerators,
        picture-car modifications, named coordinators, and the
        SAG-AFTRA / BSR safety bulletins observed on set. Click
        through for the full breakdown.
      </p>
      <ul className="space-y-3">
        {sequences.map((s) => (
          <li key={s.id}>
            <Link
              href={`/stunts/sequences/${s.production_slug}/${s.slug}`}
              className="group block rounded border border-zinc-800 bg-zinc-900/40 p-4 hover:border-red-900/50 transition-colors"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-serif text-base text-zinc-100 group-hover:text-amber-400">
                  {s.name}
                </h3>
                <div className="flex items-baseline gap-3 text-xs text-zinc-500">
                  {s.screen_minutes && (
                    <span className="font-mono">{Number(s.screen_minutes).toFixed(1)} min</span>
                  )}
                  <span className="text-amber-500/70">Detail →</span>
                </div>
              </div>
              {s.description && (
                <p className="mt-1.5 line-clamp-2 text-xs text-zinc-400">{s.description}</p>
              )}
              <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
                {s.discipline_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.discipline_tags.slice(0, 5).map((d) => (
                      <span
                        key={d}
                        className="rounded border border-red-900/40 bg-red-950/30 px-1.5 py-0.5 text-[10px] text-red-200/90"
                      >
                        {discipline(d)}
                      </span>
                    ))}
                  </div>
                )}
                {s.vfx_handoff_house_slug && (
                  <span className="text-zinc-500">
                    VFX hand-off:{' '}
                    <span className="text-zinc-300">{s.vfx_handoff_house_name}</span>
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
