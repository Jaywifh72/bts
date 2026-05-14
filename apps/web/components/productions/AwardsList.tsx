import Link from 'next/link';
import type { ProductionAward } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { orgLabel } from '@/lib/award-labels';

/**
 * T2-6 — production awards section. Wins-first within year, most recent
 * year first. Self-hides when there are no awards.
 *
 * Recipient handling (post-migration 0057): each award row may attribute
 * to at most one of person / VFX house / stunt company. We render
 * whichever is present, linking to that entity's profile page. Rows with
 * no recipient render as production-level (Best Picture, Best VFX team
 * without a specified house lead, etc.).
 */
export function AwardsList({ awards }: { awards: readonly ProductionAward[] }) {
  if (awards.length === 0) return null;

  return (
    <div className="mt-6">
      <SectionHeader
        label="Recognition"
        heading={`Awards (${awards.filter((a) => a.is_winner).length} won, ${awards.length} total)`}
      />
      <ul className="mt-2 space-y-1.5 text-sm">
        {awards.map((a) => (
          <li key={a.id} className="flex flex-wrap items-baseline gap-x-2">
            <span
              className={`inline-block w-1 self-stretch rounded ${a.is_winner ? 'bg-amber-500' : 'bg-zinc-700'}`}
              aria-hidden
            />
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
            {a.recipient_person_slug && a.recipient_display_name && (
              <>
                <span className="text-zinc-600">→</span>
                <Link
                  href={`/crew/${a.recipient_person_slug}`}
                  className="text-zinc-300 hover:text-amber-400"
                >
                  {a.recipient_display_name}
                </Link>
              </>
            )}
            {a.recipient_vfx_house_slug && a.recipient_vfx_house_name && (
              <>
                <span className="text-zinc-600">→</span>
                <Link
                  href={`/vfx/${a.recipient_vfx_house_slug}`}
                  className="text-zinc-300 hover:text-amber-400"
                  title="VFX house recipient"
                >
                  {a.recipient_vfx_house_name}
                </Link>
              </>
            )}
            {a.recipient_stunt_company_slug && a.recipient_stunt_company_name && (
              <>
                <span className="text-zinc-600">→</span>
                <Link
                  href={`/stunts/companies/${a.recipient_stunt_company_slug}`}
                  className="text-zinc-300 hover:text-amber-400"
                  title="Stunt company recipient"
                >
                  {a.recipient_stunt_company_name}
                </Link>
              </>
            )}
            {a.source_url && (
              <a
                href={a.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-600 hover:text-amber-400"
                aria-label="Source"
              >
                ↗
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
