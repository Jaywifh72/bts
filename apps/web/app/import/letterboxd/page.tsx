import type { Metadata } from 'next';
import { LetterboxdImport } from '@/components/import/LetterboxdImport';

export const metadata: Metadata = {
  title: 'Letterboxd import',
  description:
    'Upload your Letterboxd watched.csv to see which of those films have curated BTS data on Studio Pro.',
};

export default function LetterboxdImportPage() {
  return (
    <article>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Import</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">Letterboxd → Studio Pro</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Drop your <code>watched.csv</code> from the Letterboxd
          <a href="https://letterboxd.com/settings/data/" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400"> data export</a>.
          We match by title + year and tell you which of your watched
          films have curated camera/lens/lighting/VFX data here.
          Nothing is uploaded — matching runs entirely in your browser.
        </p>
      </header>
      <LetterboxdImport />
    </article>
  );
}
