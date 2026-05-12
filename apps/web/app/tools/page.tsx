import type { Metadata } from 'next';
import Link from 'next/link';
import { SectionHeader } from '@/components/ui/SectionHeader';

export const metadata: Metadata = {
  title: 'Tools',
  description:
    'Pro-grade pre-production tools — sensor coverage checker, loadout calculator, frame-line overlay.',
};

const TOOLS = [
  {
    href: '/tools/coverage',
    title: 'Sensor coverage checker',
    summary:
      'Does this lens cover this sensor at this aspect? Trig math from manufacturer-published image circles.',
  },
  {
    href: '/tools/loadout',
    title: 'Loadout calculator',
    summary:
      'Build a kit from Studio Pro\'s curated equipment list. URL-as-state share link. Print-as-PDF.',
  },
  {
    href: '/tools/frame-lines',
    title: 'Frame-line overlay',
    summary:
      'Visualize aspect-ratio frame lines on a sensor or reference still. Clone of ARRI\'s Frame Line + Lens Illumination Tool.',
  },
  {
    href: '/tools/aces',
    title: 'ACES pipeline picker',
    summary:
      'Camera body → IDT → working space → ODT → deliverable. Reference chain for ACES 1.3 grading.',
  },
  {
    href: '/tools/cdl',
    title: 'ASC CDL parser',
    summary:
      'Upload a .cdl/.ccc XML file and read the slope/offset/power/saturation values. Validate against the open spec.',
  },
] as const;

export default function ToolsPage() {
  return (
    <article>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Tools</p>
        <h1 className="mt-1 font-serif text-4xl text-zinc-50">Pre-production tools</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Calculators and visualizers that work against the Studio Pro
          equipment dataset. URL-as-state where it makes sense — share
          the page to share the answer.
        </p>
      </header>
      <SectionHeader label="Index" heading={`${TOOLS.length} tools`} />
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className="block h-full rounded border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-amber-400/40"
            >
              <h2 className="font-medium text-zinc-100">{t.title}</h2>
              <p className="mt-1 text-sm text-zinc-500">{t.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
