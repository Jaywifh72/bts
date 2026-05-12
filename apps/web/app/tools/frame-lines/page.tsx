import type { Metadata } from 'next';
import { FrameLineOverlay } from '@/components/tools/FrameLineOverlay';

export const metadata: Metadata = {
  title: 'Frame-line overlay',
  description:
    'Visualize aspect-ratio frame lines over a sensor or reference image. ARRI Frame Line + Lens Illumination Tool clone.',
};

export default function FrameLinesPage() {
  return (
    <article>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Tools</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">Frame-line overlay</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Visualize how common cinema aspect ratios crop within a given
          sensor format. Drop a reference still on top to preview your
          frame lines on the actual shot. Pure SVG, no plugins.
        </p>
      </header>
      <FrameLineOverlay />
    </article>
  );
}
