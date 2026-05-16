import type { ClaimRow, ClaimSourceRow, EvidenceItem } from '@bts/db';
import { ClaimConfidenceBadge } from '@/components/ui/ClaimConfidenceBadge';
import { ClaimStatusBadge } from '@/components/ui/ClaimStatusBadge';
import { EvidenceGallery } from '@/components/ui/EvidenceGallery';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SourcesForClaim } from '@/components/ui/SourcesForClaim';

/**
 * UX-audit F2 — polymorphic claims renderer. Generalization of
 * `<ProductionClaims>` so every entity detail page (crew, vfx_house,
 * stunt_company, stunt_school, format, society) can render the same
 * "Source-backed facts" section that film pages already do.
 *
 * Decision (per Theme F plan, option B): claims render in a discrete
 * side panel under the entity's prose, NOT as inline `{{N}}` markers
 * within biography text. Keeps editorial copy clean; matches the
 * existing /films convention.
 *
 * Pass-through props mirror `<ProductionClaims>` so call sites can use
 * `getClaimsBundleForEntity` directly. The `eyebrow` / `heading`
 * pair is overridable so each entity type can title its panel
 * appropriately ("Claims about this person" / "Claims about this
 * VFX house" etc.).
 */
function claimTypeLabel(type: string): string {
  return type.replace(/_/g, ' ');
}

export function EntityClaimsList({
  claims,
  sourcesByClaimId,
  evidenceByClaimId,
  eyebrow = 'Claims',
  heading = 'Source-backed facts',
  anchorId,
  /** Maximum claims to render inline before showing a "N more" footer. */
  cap = 12,
}: {
  claims: readonly ClaimRow[];
  sourcesByClaimId: Record<number, ClaimSourceRow[]>;
  evidenceByClaimId: Record<number, EvidenceItem[]>;
  eyebrow?: string;
  heading?: string;
  anchorId?: string;
  cap?: number;
}) {
  if (claims.length === 0) return null;

  const verified = claims.filter((claim) => claim.status === 'verified' || claim.status === 'reviewed').length;
  const needsSource = claims.filter((claim) => claim.status === 'needs_source').length;
  const disputed = claims.filter((claim) => claim.status === 'disputed').length;

  return (
    <section className="mt-8 border-t border-zinc-800 pt-6">
      <SectionHeader label={eyebrow} heading={heading} anchorId={anchorId} />
      <div className="-mt-2 mb-4 flex flex-wrap gap-2 text-xs text-zinc-400">
        <span>{claims.length} total</span>
        <span aria-hidden="true">/</span>
        <span>{verified} reviewed or verified</span>
        <span aria-hidden="true">/</span>
        <span>{needsSource} need sources</span>
        {disputed > 0 && (
          <>
            <span aria-hidden="true">/</span>
            <span className="text-amber-300">{disputed} disputed</span>
          </>
        )}
      </div>

      <ul className="space-y-3">
        {claims.slice(0, cap).map((claim) => (
          <li key={claim.id} className="border border-zinc-800 bg-zinc-900/35 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const evidenceCount = evidenceByClaimId[claim.id]?.length ?? 0;
                return evidenceCount > 0 ? (
                  <span className="rounded border border-indigo-700/60 bg-indigo-950/35 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-indigo-300">
                    {evidenceCount} evidence
                  </span>
                ) : null;
              })()}
              <span className="text-[10px] uppercase tracking-wide text-zinc-400">
                {claimTypeLabel(claim.claim_type)}
              </span>
              <ClaimStatusBadge status={claim.status} />
              <ClaimConfidenceBadge confidence={claim.confidence} />
              {claim.source_count > 0 && (
                <span className="text-xs text-zinc-400">
                  {claim.source_count} source{claim.source_count === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-zinc-200">{claim.statement}</p>
            {claim.editorial_note && (
              <p className="mt-1 text-xs text-zinc-400">{claim.editorial_note}</p>
            )}
            <EvidenceGallery evidence={evidenceByClaimId[claim.id] ?? []} />
            <SourcesForClaim sources={sourcesByClaimId[claim.id] ?? []} />
          </li>
        ))}
      </ul>

      {claims.length > cap && (
        <p className="mt-3 text-xs text-zinc-400">
          Showing {cap} of {claims.length} claims. The admin queue has the full set.
        </p>
      )}
    </section>
  );
}
