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

function PipelineCard({ p }: { p: ColorPipelineRow }) {
  const hasAny = STAGE_LABELS.some(({ key }) => p[key]);
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40">
      <div className="border-b border-zinc-800 px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-zinc-100">{p.pipeline_name}</span>
          {p.scene_slug ? (
            <Link href={`#scene-${p.scene_slug}`} className="text-xs text-zinc-500 hover:text-amber-400">
              · {p.scene_title}
            </Link>
          ) : (
            <span className="text-xs text-zinc-500">· production default</span>
          )}
        </div>
      </div>
      {hasAny && (
        <div className="grid grid-cols-1 divide-y divide-zinc-800 sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
          {STAGE_LABELS.map(({ key, label }) => {
            const v = p[key];
            if (!v) return null;
            return (
              <div key={key} className="px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
                <div className="font-mono text-sm text-zinc-200">{String(v)}</div>
              </div>
            );
          })}
        </div>
      )}
      {p.notes && (
        <p className="border-t border-zinc-800 px-3 py-2 text-xs text-zinc-500">{p.notes}</p>
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
