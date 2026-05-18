# Patch: `ClaimReview` JSON-LD emission

**Files touched:**
- `apps/web/lib/jsonLd.tsx` (add `buildClaimReviewJsonLd` builder)
- `apps/web/app/films/[slug]/page.tsx` (emit `<JsonLd>` per high-confidence claim)
- Same pattern applies to `/dossiers/[slug]`, `/walkthroughs/[slug]`, `/decisions/[slug]`, and `/partnerships/[slug]` — the patches mirror this one

This is the single highest-leverage AEO move available, because CineCanon already has confidence-graded claims as first-class DB entities (migration `0033_claims.sql` + `getClaimsForProduction` already imported in `/films/[slug]/page.tsx`). The propagation is roughly 50 lines and reuses every existing primitive.

---

## Addition to `apps/web/lib/jsonLd.tsx`

Append next to the other `build*JsonLd` exports. The shape exactly matches Schema.org's `ClaimReview` spec, with CineCanon's T7-1 through T7-7 grades mapped to the 1-5 `reviewRating.ratingValue` scale Google understands.

```tsx
// ... existing exports above ...

/**
 * Map CineCanon's T7-N confidence grades to Schema.org ClaimReview ratings.
 * The propagation: editorial team grades claims T7-1 (Verified — Primary
 * Source) through T7-7 (Uncertain). AI engines that respect ClaimReview
 * for fact-checking purposes (notably ChatGPT and Perplexity in 2026)
 * weight cited claims by this rating when synthesizing answers.
 *
 * We emit ClaimReview ONLY for T7-1 through T7-5 (ratings 3-5). T7-6 and
 * T7-7 are emitted as on-page confidence badges in the UI but NOT as
 * structured data, because Google Rich Results Test warns on low ratings.
 *
 * See references/cinema_interventions.md in cinecanon-sentinel for the
 * full mapping rationale.
 */
type ConfidenceGrade = 'T7-1' | 'T7-2' | 'T7-3' | 'T7-4' | 'T7-5' | 'T7-6' | 'T7-7';

const GRADE_TO_RATING: Record<ConfidenceGrade, { rating: 1 | 2 | 3 | 4 | 5; label: string }> = {
  'T7-1': { rating: 5, label: 'Verified — Primary Source' },
  'T7-2': { rating: 5, label: 'Verified — Trade Authority' },
  'T7-3': { rating: 5, label: 'Verified — Academic' },
  'T7-4': { rating: 4, label: 'Confirmed — Secondary' },
  'T7-5': { rating: 3, label: 'Reported' },
  'T7-6': { rating: 2, label: 'Reported — Community' },
  'T7-7': { rating: 1, label: 'Uncertain' },
};

/**
 * Returns true if this grade should emit a ClaimReview block.
 * T7-6 and T7-7 are surfaced as UI badges only — not structured data.
 */
export function shouldEmitClaimReview(grade: string): boolean {
  return grade === 'T7-1' || grade === 'T7-2' || grade === 'T7-3'
      || grade === 'T7-4' || grade === 'T7-5';
}

export type ClaimReviewInput = {
  /** Stable claim ID — becomes the URL anchor */
  claimId: string;
  /** The page this claim appears on, e.g. /films/dune-part-two-2024 */
  pageUrl: string;
  /** The claim text as it appears on the page */
  claimReviewed: string;
  /** Confidence grade T7-1..T7-7. Caller should filter by shouldEmitClaimReview() first. */
  grade: ConfidenceGrade;
  /** ISO-8601 date the claim was verified/published */
  datePublished: string;
  /** Optional first-appearance URL (the primary source we cite) */
  firstAppearanceUrl?: string | null;
  /** Optional human-readable name of the primary source */
  firstAppearanceName?: string | null;
};

export function buildClaimReviewJsonLd(c: ClaimReviewInput): JsonLdObject {
  const meta = GRADE_TO_RATING[c.grade];
  const claimUrl = `${absoluteUrl(c.pageUrl)}#claim-${c.claimId}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'ClaimReview',
    '@id': claimUrl,
    url: claimUrl,
    datePublished: c.datePublished,
    claimReviewed: c.claimReviewed,
    itemReviewed: {
      '@type': 'Claim',
      appearance: absoluteUrl(c.pageUrl),
      datePublished: c.datePublished,
      firstAppearance: c.firstAppearanceUrl
        ? {
            '@type': 'CreativeWork',
            url: c.firstAppearanceUrl,
            name: c.firstAppearanceName ?? undefined,
          }
        : undefined,
    },
    author: {
      '@type': 'Organization',
      name: 'CineCanon',
      url: absoluteUrl('/'),
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: meta.rating,
      bestRating: 5,
      worstRating: 1,
      alternateName: meta.label,
    },
  };
}
```

## Patch — `apps/web/app/films/[slug]/page.tsx`

The page already imports `getClaimsForProduction`, `getSourcesForClaims`, and `getEvidenceForClaims` and loads `claims`, `sourcesByClaimId`, `evidenceByClaimId`. We need to add the ClaimReview emission. The change is purely additive — one new import and one new JSX block right before the existing `<JsonLd data={breadcrumbJsonLd} />`.

```tsx
// ADD to the existing import:
import {
  JsonLd,
  buildMovieJsonLd,
  buildBreadcrumbJsonLd,
  buildClaimReviewJsonLd,    // ADD
  shouldEmitClaimReview,     // ADD
} from '@/lib/jsonLd';

// ... rest of imports unchanged ...

export default async function FilmDetailPage(props: Props) {
  // ... existing setup unchanged, including:
  //   const claims = await getClaimsForProduction(db, data.production.id);
  //   const sourcesByClaimId = await getSourcesForClaims(db, visibleClaimIds);
  // ... unchanged through jsonLd and breadcrumbJsonLd computation ...

  // ADD: build ClaimReview payloads for high-confidence claims only.
  // We use the same 12-claim window already used for visibleClaimIds so the
  // structured data exactly matches the on-page presentation.
  const claimReviewJsonLds = claims
    .slice(0, 12)
    .filter((claim) => shouldEmitClaimReview(claim.confidence_grade))
    .map((claim) => {
      const firstSource = sourcesByClaimId[claim.id]?.[0];
      return buildClaimReviewJsonLd({
        claimId: claim.id,
        pageUrl: `/films/${data.production.slug}`,
        claimReviewed: claim.claim_text,
        grade: claim.confidence_grade as 'T7-1' | 'T7-2' | 'T7-3' | 'T7-4' | 'T7-5',
        datePublished: (claim.updated_at ?? claim.created_at ?? new Date()).toISOString().slice(0, 10),
        firstAppearanceUrl: firstSource?.url ?? null,
        firstAppearanceName: firstSource?.title ?? firstSource?.publication ?? null,
      });
    });

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      {claimReviewJsonLds.map((cr, i) => (
        <JsonLd key={`claim-review-${i}`} data={cr} />
      ))}
      <ProductionDetail {...allTheExistingProps} />
    </>
  );
}
```

## Why this design

**Reuses existing data loading.** No new DB queries. `getClaimsForProduction`, `getSourcesForClaims`, `getEvidenceForClaims` already run; we just emit additional structured data from what's already in memory.

**Same 12-claim window as the UI.** Don't emit ClaimReview for hidden claims — would be a Rich Results inconsistency.

**Filters T7-6/T7-7 client-side.** Even if editorial accidentally publishes a community-graded claim, it stays out of structured data. The UI badge still shows the grade; the AI engines just don't get told the low-confidence ones are verified.

**The `#claim-` anchor.** Lets AI engines cite a specific claim by URL, which Perplexity and Claude do today. Combined with the existing `/claims/[id]` public page route (which I saw exists), high-confidence claims become deeply linkable AEO assets.

**ISR-aware.** The page's `revalidate = 86400` means ClaimReview structured data updates within 24h of an editorial claim re-grade. That's fine.

## Roll-out

Phase 1: Apply to `/films/[slug]` only — 55 curated dossiers × ~12 claims each = ~660 ClaimReview blocks shipped on day one.

Phase 2: Mirror the same patch in:
- `/dossiers/[slug]` — production_craft_dossiers (PD/costume/makeup-hair)
- `/walkthroughs/[slug]` — annotated_walkthroughs
- `/decisions/[slug]` — craft_decision_trees
- `/partnerships/[slug]` — practitioner_partnerships

Each of these surfaces also has claim data (per the Phase 1.x/2/3 migration commits) and benefits from the same emission. The `entity-graph-curator` agent owns rolling these patches out one route family at a time, measuring Precision lift per surface, and either continuing or backing off.

Phase 3: Per-scene ClaimReview blocks on `/films/[slug]/scenes/[sceneSlug]` for technical claims (lens choice per scene, lighting plot, format motivation).

## Measurement

The `citation-extractor` agent should observe a Precision lift specifically on claim-rich queries (lens choice, format spec, crew credits) within 14-28 days of the Phase 1 deploy. The accelerated post-merge sampling (N=10 × 14 days) on `/films/the-brutalist-2024`, `/films/dune-part-two-2024`, `/films/anora-2024`, `/films/conclave-2024`, and `/films/the-substance-2024` is the right baseline cohort.

If Precision moves on those five but not the rest, we have a curation density signal — only ClaimReview-rich pages get the lift, which says ClaimReview is doing the work (good) but the long-tail dossiers need editorial depth first (also good — that's the editorial backlog, not an AEO problem).
