import Link from 'next/link';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';

interface VfxCredit {
  vfx_house_slug: string;
  vfx_house_name: string;
  vfx_house_kind?: string | null;
  role: string;
  shot_count: number | null;
  notes: string | null;
}

const KIND_LABELS: Record<string, string> = {
  full_service: 'Full-service',
  boutique: 'Boutique',
  in_house: 'In-house',
  rendering: 'Rendering',
  previsualization: 'Previs',
  other: '',
};

interface VfxTechnique {
  slug: string;
  name: string;
  category: string;
}

interface VfxSectionProps {
  credits: VfxCredit[];
  techniques: VfxTechnique[];
}

export function VfxSection({ credits, techniques }: VfxSectionProps) {
  if (credits.length === 0 && techniques.length === 0) return null;

  const totalShots = credits.reduce((sum, c) => sum + (c.shot_count ?? 0), 0);

  return (
    <div className="mt-8">
      <SectionHeader label="Post-Production" heading="Visual Effects" />

      {techniques.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {techniques.map((t) => (
            <Badge key={t.slug} label={t.name} variant="category" />
          ))}
        </div>
      )}

      {credits.length > 0 && (
        <>
          <div className="rounded border border-zinc-800">
            {credits.map((c, i) => (
              <div
                key={c.vfx_house_slug}
                className={`flex items-center gap-3 px-4 py-2 text-sm ${i > 0 ? 'border-t border-zinc-800/50' : ''}`}
              >
                <Badge label={c.role.replace('_', ' ')} variant="category" />
                <Link href={`/vfx/${c.vfx_house_slug}`} className="flex-1 text-zinc-200 hover:text-amber-400">
                  {c.vfx_house_name}
                </Link>
                {c.vfx_house_kind && KIND_LABELS[c.vfx_house_kind] && (
                  <span className="text-xs text-zinc-500" title="Studio operating model">
                    {KIND_LABELS[c.vfx_house_kind]}
                  </span>
                )}
                <span className="text-xs text-zinc-500">
                  {c.shot_count != null ? `${c.shot_count.toLocaleString()} shots` : '—'}
                </span>
              </div>
            ))}
          </div>
          {totalShots > 0 && (
            <p className="mt-2 text-right text-xs text-zinc-500">
              {totalShots.toLocaleString()} total VFX shots
            </p>
          )}
        </>
      )}
    </div>
  );
}
