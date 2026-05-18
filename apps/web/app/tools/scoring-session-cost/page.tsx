import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { ScoringCostCalculator } from './ScoringCostCalculator';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Scoring session cost calculator',
  description: 'Estimate the cost of a live orchestral scoring session — players, hours, stage tier, conductor, contractor, AFM minimums.',
  alternates: { canonical: `${siteUrl()}/tools/scoring-session-cost` },
};

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Music · cost"
        title="Scoring session cost calculator"
        accent="amber"
        description="Working estimate for a live orchestral session at a Tier 1–3 scoring stage. Uses 2024-25 AFM Phonograph Code minimums and prevailing stage rates. Always confirm with the contractor and stage before scoping."
      />
      <ScoringCostCalculator />
    </>
  );
}
