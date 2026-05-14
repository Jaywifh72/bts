import Link from 'next/link';
import type { OrgRecipientAward } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { orgLabel } from '@/lib/award-labels';

/**
 * Awards section for org-level recipients (VFX houses, stunt companies).
 * Mirrors the layout used on /crew/[slug] for person recipients so a
 * visitor sees one consistent awards shape across the site.
 *
 * Self-hides when `awards` is empty so detail pages don't render an
 * empty "Awards (0 won, 0 total)" header for entities that haven't been
 * award-credited yet.
 */
export function OrgRecipientAwardsList({
  awards,
  sectionLabel = 'Recognition',
}: {
  awards: readonly OrgRecipientAward[];
  /** Override for sections that want a non-default eyebrow (e.g. "Awards"). */
  sectionLabel?: string;
}) {
  if (awards.length === 0) return null;
  const wins = awards.filter((a) => a.is_winner).length;
  return (
    <div className="mb-8">
      <SectionHeader
        label={sectionLabel}
        heading={`Awards (${wins} won, ${awards.length} total)`}
      />
      <ul className="mt-2 space-y-1.5 text-sm">
        {awards.map((a) => (
          <li key={a.id} className="flex flex-wrap items-baseline gap-x-2">
            <span
              className={`font-mono text-xs ${a.is_winner ? 'text-amber-400' : 'text-zinc-500'}`}
              title={a.is_winner ? 'Won' : 'Nominated'}
            >
              {a.is_winner ? 'WON' : 'NOM'}
            </span>
            <span className="text-zinc-300">{orgLabel(a.award_org)}</span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-200">{a.category}</span>
            <span className="text-zinc-500">·</span>
            <span className="font-mono text-xs text-zinc-500">{a.year}</span>
            <span className="text-zinc-600">→</span>
            <Link
              href={`/films/${a.production_slug}`}
              className="text-zinc-200 hover:text-amber-400"
            >
              {a.production_title}
            </Link>
            {a.source_url && (
              <a
                href={a.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 text-[10px] uppercase tracking-wide text-zinc-500 hover:text-amber-400"
                title="Award source"
              >
                source ↗
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
