import type { Metadata } from 'next';
import { CdlParser } from '@/components/tools/CdlParser';

export const metadata: Metadata = {
  title: 'ASC CDL parser',
  description:
    'Upload an ASC CDL file (.cdl or .ccc) and read the slope / offset / power / saturation values. Validate against the open spec.',
};

export default function CdlPage() {
  return (
    <article>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Tools</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">ASC CDL parser</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          The ASC Color Decision List is an open XML format for
          per-shot grade exchange. Drop a <code>.cdl</code> or
          <code>.ccc</code> file below; the tool parses the SOP and
          Sat values and applies a CSS preview to a sample frame.
          Open spec at <a href="https://acescentral.com/uploads/default/original/2X/c/c581f7e6c79d8b4cdd5d04eb0d6e57b3e2d54c1d.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400">ASC CDL v1.2 PDF</a>.
        </p>
      </header>
      <CdlParser />
    </article>
  );
}
