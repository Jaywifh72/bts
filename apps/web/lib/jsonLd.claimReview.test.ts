import { describe, it, expect } from 'vitest';
import {
  shouldEmitClaimReview,
  buildClaimReviewJsonLd,
} from './jsonLd';

// These tests lock in the (status, confidence) → ClaimReview mapping
// for CineCanon-Sentinel. The rubric is documented in jsonLd.tsx and
// CLAUDE.md; changing emission behavior should require updating both
// and intentionally re-baselining these tests.

describe('shouldEmitClaimReview', () => {
  describe('verified status', () => {
    it.each(['primary', 'secondary', 'manufacturer', 'rental_house', 'bts_visual'])(
      'emits for verified × %s',
      (confidence) => {
        expect(shouldEmitClaimReview('verified', confidence)).toBe(true);
      },
    );

    it.each(['inferred', 'speculative', 'conflicting'])(
      'suppresses for verified × %s (low-confidence source)',
      (confidence) => {
        expect(shouldEmitClaimReview('verified', confidence)).toBe(false);
      },
    );
  });

  describe('reviewed status', () => {
    it.each(['primary', 'secondary', 'manufacturer', 'rental_house', 'bts_visual'])(
      'emits for reviewed × %s',
      (confidence) => {
        expect(shouldEmitClaimReview('reviewed', confidence)).toBe(true);
      },
    );

    it.each(['inferred', 'speculative', 'conflicting'])(
      'suppresses for reviewed × %s',
      (confidence) => {
        expect(shouldEmitClaimReview('reviewed', confidence)).toBe(false);
      },
    );
  });

  describe('sourced status', () => {
    it.each(['primary', 'secondary', 'manufacturer', 'rental_house'])(
      'emits for sourced × %s',
      (confidence) => {
        expect(shouldEmitClaimReview('sourced', confidence)).toBe(true);
      },
    );

    it('suppresses sourced × bts_visual (one confidence step too soft for unreviewed)', () => {
      // bts_visual is OK once an editor has reviewed it, but a sourced-only
      // claim with bts_visual evidence isn't enough for structured data yet.
      expect(shouldEmitClaimReview('sourced', 'bts_visual')).toBe(false);
    });

    it.each(['inferred', 'speculative', 'conflicting'])(
      'suppresses sourced × %s',
      (confidence) => {
        expect(shouldEmitClaimReview('sourced', confidence)).toBe(false);
      },
    );
  });

  describe('unverified statuses', () => {
    it.each([
      'candidate',
      'needs_source',
      'disputed',
      'deprecated',
      'rejected',
    ])('suppresses %s × primary (status too soft)', (status) => {
      expect(shouldEmitClaimReview(status, 'primary')).toBe(false);
    });
  });

  it('suppresses unknown enum values defensively', () => {
    expect(shouldEmitClaimReview('not_a_status', 'primary')).toBe(false);
    expect(shouldEmitClaimReview('verified', 'not_a_confidence')).toBe(false);
  });
});

describe('buildClaimReviewJsonLd', () => {
  const baseInput = {
    claimId: '42',
    pageUrl: '/films/the-brutalist-2024',
    claimReviewed: 'The Brutalist (2024) was shot on VistaVision.',
    status: 'verified',
    confidence: 'primary',
    datePublished: '2026-05-18',
  };

  it('produces a well-formed Schema.org ClaimReview', () => {
    const out = buildClaimReviewJsonLd(baseInput);
    expect(out['@context']).toBe('https://schema.org');
    expect(out['@type']).toBe('ClaimReview');
    expect(out.claimReviewed).toBe(baseInput.claimReviewed);
    expect(out.datePublished).toBe('2026-05-18');
  });

  it('uses a stable #claim-<id> URL anchor for citation', () => {
    const out = buildClaimReviewJsonLd(baseInput);
    expect(out['@id']).toMatch(/\/films\/the-brutalist-2024#claim-42$/);
    expect(out.url).toBe(out['@id']);
  });

  it('maps verified+primary → rating 5 "Verified — Primary Source"', () => {
    const out = buildClaimReviewJsonLd(baseInput);
    const r = out.reviewRating as { ratingValue: number; alternateName: string };
    expect(r.ratingValue).toBe(5);
    expect(r.alternateName).toBe('Verified — Primary Source');
  });

  it('maps verified+secondary → rating 5 "Verified — Authority"', () => {
    const r = buildClaimReviewJsonLd({ ...baseInput, confidence: 'secondary' })
      .reviewRating as { ratingValue: number; alternateName: string };
    expect(r.ratingValue).toBe(5);
    expect(r.alternateName).toBe('Verified — Authority');
  });

  it('maps verified+bts_visual → rating 4 "Verified — Visual Evidence"', () => {
    const r = buildClaimReviewJsonLd({ ...baseInput, confidence: 'bts_visual' })
      .reviewRating as { ratingValue: number; alternateName: string };
    expect(r.ratingValue).toBe(4);
    expect(r.alternateName).toBe('Verified — Visual Evidence');
  });

  it('maps reviewed+primary → rating 4 "Confirmed"', () => {
    const r = buildClaimReviewJsonLd({ ...baseInput, status: 'reviewed' })
      .reviewRating as { ratingValue: number; alternateName: string };
    expect(r.ratingValue).toBe(4);
    expect(r.alternateName).toBe('Confirmed');
  });

  it('maps sourced+primary → rating 3 "Reported"', () => {
    const r = buildClaimReviewJsonLd({ ...baseInput, status: 'sourced' })
      .reviewRating as { ratingValue: number; alternateName: string };
    expect(r.ratingValue).toBe(3);
    expect(r.alternateName).toBe('Reported');
  });

  it('emits firstAppearance when a source url is provided', () => {
    const out = buildClaimReviewJsonLd({
      ...baseInput,
      firstAppearanceUrl: 'https://theasc.com/articles/brutalist-vv',
      firstAppearanceName: 'American Cinematographer',
    });
    const item = out.itemReviewed as {
      firstAppearance: { '@type': string; url: string; name: string };
    };
    expect(item.firstAppearance['@type']).toBe('CreativeWork');
    expect(item.firstAppearance.url).toBe('https://theasc.com/articles/brutalist-vv');
    expect(item.firstAppearance.name).toBe('American Cinematographer');
  });

  it('omits firstAppearance when no source is provided', () => {
    const out = buildClaimReviewJsonLd(baseInput);
    const item = out.itemReviewed as { firstAppearance?: unknown };
    expect(item.firstAppearance).toBeUndefined();
  });

  it('falls back to lowest valid rating for unmapped (status, confidence)', () => {
    // Caller should have filtered with shouldEmitClaimReview first; this is
    // a defense-in-depth fallback so we never emit ratingValue < 3 which
    // would warn in Google Rich Results.
    const r = buildClaimReviewJsonLd({
      ...baseInput,
      status: 'candidate',
      confidence: 'inferred',
    }).reviewRating as { ratingValue: number };
    expect(r.ratingValue).toBe(3);
  });
});
