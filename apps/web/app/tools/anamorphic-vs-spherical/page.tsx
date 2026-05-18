import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { AnamorphicMatrix } from './AnamorphicMatrix';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Anamorphic vs spherical matrix',
  description: 'Score your project across six axes (aspect, character, budget, weight, close-focus, VFX integration) for a defensible cinematography recommendation.',
  alternates: { canonical: `${siteUrl()}/tools/anamorphic-vs-spherical` },
};

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Cinematography · decision"
        title="Anamorphic vs spherical matrix"
        accent="amber"
        description="Six axes, one defensible recommendation. Pull this up before the lens-test day so the conversation with the DP is grounded in trade-offs, not vibes."
      />
      <AnamorphicMatrix />
    </>
  );
}
