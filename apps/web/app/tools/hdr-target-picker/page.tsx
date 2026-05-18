import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { HdrTargetPicker } from './HdrTargetPicker';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'HDR delivery target picker',
  description: 'Recommend primary + fallback HDR targets (Dolby Vision, HDR10, HDR10+, HLG) based on platform, budget, and finishing constraints.',
  alternates: { canonical: `${siteUrl()}/tools/hdr-target-picker` },
};

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Color · decision"
        title="HDR delivery target picker"
        accent="amber"
        description="Match your platform mix and finishing budget to the right HDR target. Always ratify with your colorist and the final platform’s delivery spec."
      />
      <HdrTargetPicker />
    </>
  );
}
