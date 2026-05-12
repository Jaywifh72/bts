import type { Metadata } from 'next';
import { AcesPicker } from '@/components/tools/AcesPicker';

export const metadata: Metadata = {
  title: 'ACES pipeline picker',
  description:
    'Camera body → IDT → working space → ODT → deliverable. ACES 1.3 reference chain.',
};

export default function AcesPage() {
  return (
    <article>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Tools</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">ACES pipeline picker</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Pick a camera body and a deliverable; the tool suggests the IDT,
          working space, and ODT. References the canonical ACES 1.3
          config maintained at <a href="https://github.com/AcademySoftwareFoundation/OpenColorIO-Configs" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400">AcademySoftwareFoundation/OpenColorIO-Configs</a>.
        </p>
      </header>
      <AcesPicker />
      <p className="mt-6 text-xs text-zinc-600">
        Suggestions are starting points — final IDT choice depends on
        the camera firmware version + EI. Consult vendor docs.
      </p>
    </article>
  );
}
