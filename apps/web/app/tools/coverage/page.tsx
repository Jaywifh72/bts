import type { Metadata } from 'next';
import { db, listLensCoverageItems } from '@bts/db';
import { CoverageChecker } from '@/components/tools/CoverageChecker';

export const metadata: Metadata = {
  title: 'Sensor coverage checker',
  description:
    'Does this lens cover this sensor at this aspect ratio? Math derived from manufacturer-published image circles.',
};

export default async function CoveragePage() {
  const lenses = await listLensCoverageItems(db);
  return (
    <article>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Tools</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">Sensor coverage checker</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          "Does this lens cover this sensor at this aspect?" Pick a lens
          (or enter an image circle manually), pick a sensor preset, pick
          a delivery aspect — the tool does the trig and tells you if the
          lens covers cleanly, only at the chosen aspect, or vignettes.
          ARRI Frame Line + Lens Illumination Tool clone.
        </p>
      </header>
      <CoverageChecker lenses={lenses} />
      <p className="mt-6 text-xs text-zinc-600">
        Sensor active areas pulled from manufacturer datasheets. Image
        circles from the lens spec sheets — see <a href="/tools/frame-lines" className="hover:text-amber-400">/tools/frame-lines</a> for a
        visual frame-line preview at a chosen sensor + aspect. Anamorphic
        lenses report their stated image circle (the squeeze does not
        change the optical circle that hits the sensor).
      </p>
    </article>
  );
}
