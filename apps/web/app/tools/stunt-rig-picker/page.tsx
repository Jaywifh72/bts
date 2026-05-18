import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { StuntRigPicker } from './StuntRigPicker';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Stunt rig decision picker',
  description: 'Wire descent vs decelerator vs airbag — answer four questions, get a ranked recommendation.',
  alternates: { canonical: `${siteUrl()}/tools/stunt-rig-picker` },
};

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Stunts · decision"
        title="Stunt rig decision picker"
        accent="amber"
        description="Four questions, ranked recommendation. Always cross-check with your stunt coordinator and SAG-AFTRA safety bulletins before locking a rig."
      />
      <StuntRigPicker />
    </>
  );
}
