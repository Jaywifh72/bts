import Link from 'next/link';
import type { ColorPipelineRow } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';

const STAGE_LABELS: Array<{ key: keyof ColorPipelineRow; label: string }> = [
  { key: 'camera_log',    label: 'Camera log' },
  { key: 'camera_gamut',  label: 'Camera gamut' },
  { key: 'idt',           label: 'IDT' },
  { key: 'working_space', label: 'Working space' },
  { key: 'odt',           label: 'ODT' },
  { key: 'deliverable',   label: 'Deliverable' },
];

/**
 * UX-audit second pass — color pipeline rendered as a horizontal flow.
 * The IDT → working → ODT chain is a sequence, not a key-value list.
 * Each stage is a chip with the named transform; arrows between. Empty
 * stages render dashed so the structural completeness of the chain is
 * visible at a glance (a colorist scanning 12 dossiers can spot the one
 * with no IDT documented).
 *
 * Mobile: chips stack vertically with down-arrows.
 */
function PipelineCard({ p }: { p: ColorPipelineRow }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40">
      <div className="border-b border-zinc-800 px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-zinc-100">{p.pipeline_name}</span>
          {p.scene_slug ? (
            <Link href={`#scene-${p.scene_slug}`} className="text-xs text-zinc-400 hover:text-amber-400">
              · {p.scene_title}
            </Link>
          ) : (
            <span className="text-xs text-zinc-400">· production default</span>
          )}
        </div>
      </div>

      <ol
        aria-label="ACES color pipeline, left to right"
        className="flex flex-col items-stretch gap-2 p-3 sm:flex-row sm:items-end sm:gap-1 sm:overflow-x-auto"
      >
        {STAGE_LABELS.map(({ key, label }, i) => {
          const v = p[key];
          const filled = Boolean(v);
          return (
            <li
              key={key}
              className="flex flex-col items-stretch gap-1 sm:flex-row sm:items-end"
            >
              <div
                className={`min-w-[10rem] rounded border px-3 py-2 ${
                  filled
                    ? 'border-amber-700/60 bg-amber-950/30'
                    : 'border-dashed border-zinc-700 bg-zinc-900/40'
                }`}
              >
                <div className={`text-[10px] uppercase tracking-wide ${filled ? 'text-amber-300' : 'text-zinc-400'}`}>
                  {label}
                </div>
                <div className={`mt-0.5 font-mono text-sm ${filled ? 'text-zinc-100' : 'text-zinc-500 italic'}`}>
                  {filled ? String(v) : 'undocumented'}
                </div>
              </div>
              {i < STAGE_LABELS.length - 1 && (
                <div
                  aria-hidden="true"
                  className="flex items-center justify-center text-zinc-500 sm:px-1"
                >
                  <span className="sm:hidden">↓</span>
                  <span className="hidden sm:inline">→</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {p.notes && (
        <p className="border-t border-zinc-800 px-3 py-2 text-xs text-zinc-400">{p.notes}</p>
      )}
    </div>
  );
}

export function ColorPipelineList({ pipelines }: { pipelines: readonly ColorPipelineRow[] }) {
  if (pipelines.length === 0) return null;

  const def = pipelines.find((p) => p.scene_id === null);
  const overrides = pipelines.filter((p) => p.scene_id !== null);

  return (
    <div className="mt-10">
      <SectionHeader
        label="Color"
        heading={overrides.length === 0
          ? 'Pipeline'
          : `Pipeline + ${overrides.length} scene override${overrides.length === 1 ? '' : 's'}`}
        anchorId="color-pipeline"
      />
      <p className="-mt-2 mb-3 max-w-2xl text-xs text-zinc-500">
        Camera color science → IDT → working space → ODT → deliverable.
        Production-wide default first; scenes that diverge below.
      </p>
      <div className="space-y-3">
        {def && <PipelineCard p={def} />}
        {overrides.map((p) => (
          <PipelineCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}
