import type { Metadata } from 'next';
import Link from 'next/link';
import { FORMAT_TAXONOMY } from '@/lib/formats';
import { SectionHeader } from '@/components/ui/SectionHeader';

export const metadata: Metadata = {
  title: 'Browse by acquisition format',
  description:
    'Browse productions by the camera negative or sensor format they were shot on — IMAX 65mm, ALEXA 65, Panavision 65mm, Super 16mm, anamorphic 35mm, and more.',
};

export default function FormatIndexPage() {
  return (
    <article>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Reference</p>
        <h1 className="mt-1 font-serif text-4xl text-zinc-50">
          Browse by acquisition format
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-400">
          Every production in our database is tagged with the camera negative
          (or digital sensor format) used for principal photography. Pick a
          format to see who shot on it.
        </p>
      </header>

      <SectionHeader label="Formats" heading={`${FORMAT_TAXONOMY.length} formats`} />
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {FORMAT_TAXONOMY.map((f) => (
          <li key={f.slug}>
            <Link
              href={`/format/${f.slug}`}
              className="group block rounded border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-600"
            >
              <h2 className="font-serif text-lg text-zinc-100 group-hover:text-amber-400">
                {f.label}
              </h2>
              <p className="mt-1 line-clamp-3 text-sm text-zinc-400">
                {f.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
