import Link from 'next/link';
import type { ReactNode } from 'react';
import { CitationRigorBadge, type CitationRigorData } from './CitationRigorBadge';
import { CorrectionForm } from './CorrectionForm';
import { formatRelativeTime } from '@/lib/format-time';

/**
 * UX-audit P0-2 — provenance is a first-class UI primitive across every
 * entity type, not just film detail. This footer block standardizes the
 * citation-rigor badge, sources anchor, correction CTA, last-verified
 * timestamp, and curated-by byline so a researcher reading a crew, gear,
 * VFX-house, stunt-company, reference, format, or society page gets the
 * same provenance treatment they get on a film page.
 *
 * Film-specific affordances (IMDb/TMDb/Loadout-PDF) ride in via the
 * `extraLinks` slot rather than being baked into the footer.
 */
type EntityProvenanceFooterProps = {
  /** Entity slug for the corrections-queue link. Optional — when omitted
   *  the correction submission falls back to `pageUrl` for routing. */
  entitySlug?: string;
  /** Absolute or root-relative URL of the current page (corrections
   *  triage uses this to deep-link back to the offending row). */
  pageUrl: string;
  /** Citation rigor counts. `null` hides the badge entirely — for entities
   *  with no attributions surfacing a 0/0 score would be misleading. */
  confidence?: CitationRigorData | null;
  /** Count of cited sources. When > 0, renders an in-page anchor link
   *  pointing at `#${sourcesAnchorId}` (defaults to `sources`). */
  sourcesCount?: number;
  sourcesAnchorId?: string;
  /** ISO timestamp of the last data-freshness verification. */
  lastVerifiedAt?: string | null;
  /** Editorial byline (E-E-A-T) — surfaces only when the entity is curated
   *  rather than purely derived from imports. */
  dataTier?: string | null;
  curatedBy?: string | null;
  curatedByUrl?: string | null;
  lastCuratedReview?: string | null;
  /** Slot for entity-type-specific link-outs (IMDb/TMDb/IMSDb/Loadout PDF
   *  on films, manufacturer website on gear, etc.). Rendered inline with
   *  the "Suggest a correction →" button. */
  extraLinks?: ReactNode;
};

export function EntityProvenanceFooter({
  entitySlug,
  pageUrl,
  confidence = null,
  sourcesCount = 0,
  sourcesAnchorId = 'sources',
  lastVerifiedAt,
  dataTier,
  curatedBy,
  curatedByUrl,
  lastCuratedReview,
  extraLinks,
}: EntityProvenanceFooterProps) {
  const showRigorRow = sourcesCount > 0 || confidence;
  const showCuratedByline = dataTier === 'curated' && Boolean(curatedBy);

  return (
    <>
      {showRigorRow && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CitationRigorBadge data={confidence ?? null} />
          {sourcesCount > 0 && (
            <a
              href={`#${sourcesAnchorId}`}
              className="text-xs text-zinc-400 hover:text-amber-400"
            >
              {sourcesCount} source{sourcesCount === 1 ? '' : 's'} ↓
            </a>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400">
        {extraLinks}
        <CorrectionForm productionSlug={entitySlug} pageUrl={pageUrl} />
      </div>

      {lastVerifiedAt && (
        <p className="mt-2 text-[10px] uppercase tracking-widest text-zinc-400">
          Verified{' '}
          <time dateTime={lastVerifiedAt}>
            {formatRelativeTime(lastVerifiedAt)}
          </time>
        </p>
      )}

      {showCuratedByline && (
        <p className="mt-1 text-[11px] uppercase tracking-wide text-amber-500/70">
          <span className="text-zinc-400">Curated by</span>{' '}
          {curatedByUrl ? (
            <a
              href={curatedByUrl}
              className="text-amber-400 hover:underline"
              rel="author"
            >
              {curatedBy}
            </a>
          ) : (
            <span className="text-amber-400">{curatedBy}</span>
          )}
          {lastCuratedReview && (
            <>
              {' · '}
              <span className="text-zinc-400">
                Last reviewed{' '}
                <time dateTime={lastCuratedReview}>
                  {formatRelativeTime(lastCuratedReview)}
                </time>
              </span>
            </>
          )}
          {' · '}
          <Link href="/methodology" className="text-zinc-400 hover:text-amber-400">
            Methodology
          </Link>
        </p>
      )}
    </>
  );
}
