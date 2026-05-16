import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/ui/PageHero';

export const metadata: Metadata = {
  title: 'Tools',
  description:
    'Pro-grade pre-production tools — sensor coverage checker, loadout calculator, frame-line overlay, ACES pipeline picker, ASC CDL parser.',
};

type Tool = {
  href: string;
  title: string;
  summary: string;
  phase: 'Prep' | 'On set' | 'Post';
  inputs: string;
  outputs: string;
  /** Pulls from the CineCanon catalog vs. pure-math calculator. */
  backedByCatalog: boolean;
  /** Inputs and result encoded into URL query — sharable / reproducible. */
  urlAsState: boolean;
  /** Exports a print-ready PDF artifact. */
  pdfExport: boolean;
  /** Runs entirely client-side once loaded; no server roundtrip needed. */
  offlineOk: boolean;
};

const TOOLS: Tool[] = [
  {
    href: '/tools/coverage',
    title: 'Sensor coverage checker',
    summary: 'Does this lens cover this sensor at this aspect? Trig math from manufacturer-published image circles.',
    phase: 'Prep',
    inputs: 'Lens (image Ø) · sensor body · target aspect',
    outputs: 'Covers / vignettes verdict + margin (mm)',
    backedByCatalog: true,
    urlAsState: false,
    pdfExport: false,
    offlineOk: true,
  },
  {
    href: '/tools/loadout',
    title: 'Loadout calculator',
    summary: 'Build a kit from CineCanon\'s curated equipment list. URL-as-state share link, print-as-PDF.',
    phase: 'Prep',
    inputs: 'Camera body · primes · zooms · filters · accessories',
    outputs: 'Loadout sheet (HTML/PDF) · per-day rate · weight total',
    backedByCatalog: true,
    urlAsState: true,
    pdfExport: true,
    offlineOk: false,
  },
  {
    href: '/tools/frame-lines',
    title: 'Frame-line overlay',
    summary: 'Visualize aspect-ratio frame lines on a sensor or reference still. Clone of ARRI\'s Frame Line + Lens Illumination Tool.',
    phase: 'On set',
    inputs: 'Sensor body · target aspect · (optional) uploaded reference image',
    outputs: 'SVG overlay of frame lines on sensor area',
    backedByCatalog: true,
    urlAsState: true,
    pdfExport: false,
    offlineOk: true,
  },
  {
    href: '/tools/aces',
    title: 'ACES pipeline picker',
    summary: 'Camera body → IDT → working space → ODT → deliverable. Reference chain for ACES 1.3 grading.',
    phase: 'Post',
    inputs: 'Camera log format · working space · deliverable',
    outputs: 'IDT / ODT / working-space chain (named transforms)',
    backedByCatalog: true,
    urlAsState: true,
    pdfExport: false,
    offlineOk: true,
  },
  {
    href: '/tools/cdl',
    title: 'ASC CDL parser',
    summary: 'Upload a .cdl/.ccc XML file and read the slope/offset/power/saturation values. Validates against the open spec.',
    phase: 'Post',
    inputs: '.cdl or .ccc file upload',
    outputs: 'Parsed SOP/sat per ColorCorrection node',
    backedByCatalog: false,
    urlAsState: false,
    pdfExport: false,
    offlineOk: true,
  },
];

const PHASES: Tool['phase'][] = ['Prep', 'On set', 'Post'];

function CapChip({ on, label }: { on: boolean; label: string }) {
  return on ? (
    <span className="rounded border border-amber-700/60 bg-amber-950/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
      <span aria-hidden="true">✓ </span>{label}
    </span>
  ) : (
    <span className="rounded border border-zinc-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
      {label}
    </span>
  );
}

export default function ToolsPage() {
  const byPhase = PHASES.map((p) => ({ phase: p, tools: TOOLS.filter((t) => t.phase === p) }));

  return (
    <>
      <PageHero
        eyebrow="Tools"
        title="Pre-production tools"
        description={
          <>
            Calculators and visualizers backed by the CineCanon equipment
            dataset. URL-as-state where it makes sense — share the page,
            share the answer. Capability flags below: <span className="text-amber-300">amber</span> = supported,
            zinc = not yet.
          </>
        }
      />

      {byPhase.map(({ phase, tools }) => (
        <section key={phase} className="mb-10">
          <h2 className="mb-3 font-serif text-xl text-zinc-100">
            {phase} <span className="text-sm font-normal text-zinc-400">({tools.length})</span>
          </h2>
          <div
            tabIndex={0}
            role="region"
            aria-label={`${phase} tools`}
            className="overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-normal">Tool</th>
                  <th scope="col" className="px-3 py-2 text-left font-normal">Inputs</th>
                  <th scope="col" className="px-3 py-2 text-left font-normal">Outputs</th>
                  <th scope="col" className="px-3 py-2 text-left font-normal">Capabilities</th>
                </tr>
              </thead>
              <tbody>
                {tools.map((t) => (
                  <tr key={t.href} className="border-b border-zinc-900 align-top hover:bg-zinc-900/40">
                    <td className="px-3 py-2">
                      <Link href={t.href} className="font-medium text-zinc-100 hover:text-amber-400">
                        {t.title}
                      </Link>
                      <p className="mt-1 max-w-md text-xs text-zinc-400">{t.summary}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-300">{t.inputs}</td>
                    <td className="px-3 py-2 text-xs text-zinc-300">{t.outputs}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        <CapChip on={t.backedByCatalog} label="Catalog-backed" />
                        <CapChip on={t.urlAsState}      label="URL-as-state" />
                        <CapChip on={t.pdfExport}       label="PDF export" />
                        <CapChip on={t.offlineOk}       label="Offline OK" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
