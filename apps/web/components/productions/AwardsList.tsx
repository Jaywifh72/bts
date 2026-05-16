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
 *
 * UX-audit C6: brought to parity with the `/awards` index per-row source
 * affordance — `[src] ↗` chip with sr-only context and a non-color
 * status glyph (✓ WON / ○ NOM) on top of the existing amber/zinc hue.
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
              aria-hidden="true"
            />
            <span
              className={`font-mono text-xs ${a.is_winner ? 'text-amber-400' : 'text-zinc-400'}`}
            >
              <span className="sr-only">Status: </span>
              <span aria-hidden="true">{a.is_winner ? '✓ ' : '○ '}</span>
              {a.is_winner ? 'WON' : 'NOM'}
            </span>
            <span className="text-zinc-300">{orgLabel(a.award_org)}</span>
            <span aria-hidden="true" className="text-zinc-400">·</span>
            <span className="text-zinc-200">{a.category}</span>
            <span aria-hidden="true" className="text-zinc-400">·</span>
            <span className="font-mono text-xs text-zinc-400">{a.year}</span>
            {a.recipient_person_slug && a.recipient_display_name && (
              <>
                <span aria-hidden="true" className="text-zinc-400">→</span>
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
                <span aria-hidden="true" className="text-zinc-400">→</span>
                <Link
                  href={`/vfx/${a.recipient_vfx_house_slug}`}
                  className="text-zinc-300 hover:text-amber-400"
                  aria-label={`${a.recipient_vfx_house_name} (VFX house)`}
                >
                  {a.recipient_vfx_house_name}
                </Link>
              </>
            )}
            {a.recipient_stunt_company_slug && a.recipient_stunt_company_name && (
              <>
                <span aria-hidden="true" className="text-zinc-400">→</span>
                <Link
                  href={`/stunts/companies/${a.recipient_stunt_company_slug}`}
                  className="text-zinc-300 hover:text-amber-400"
                  aria-label={`${a.recipient_stunt_company_name} (stunt company)`}
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
                className="ml-auto font-mono text-[10px] text-amber-400 hover:text-amber-300"
                title="View cited source"
              >
                <span className="sr-only">Cited source (opens in new tab): </span>
                [src] <span aria-hidden="true">↗</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
