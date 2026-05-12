import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/ui/PageHero';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Lookbook — visual reverse search',
  description:
    'Find shots that look like a reference still. SigLIP-2 visual embeddings + HNSW index over the curated keyframe corpus.',
  alternates: { canonical: `${siteUrl()}/lookbook` },
};

export const revalidate = 86400;

/**
 * /lookbook — visual reverse search.
 *
 * Stack:
 *   • Image upload → SigLIP-2 (siglip-2-base-patch16-384) → 768-dim vector
 *   • HNSW index on `production_keyframes.embedding` (migration 0030)
 *   • Top-K cosine returns keyframes ordered by similarity
 *
 * Schema + index + embedding columns all exist. Inference path needs:
 *   1. A serverless or background SigLIP encoder. Options:
 *      a) Replicate / Modal / Fal hosted SigLIP endpoint (cheapest start)
 *      b) Self-host via fastapi on a small GPU box
 *      c) Web ONNX runtime in-browser (slowest, but free + private)
 *   2. Backfill: extract SigLIP embeddings for the 0-row keyframe corpus
 *      first (kf.palette + kf.phash already populated for some).
 *
 * Today's render: explains what's coming, links to the keyframe palette
 * grouping at /shots which works without inference, and pitches the
 * developer roadmap for anyone wanting to contribute.
 */
export default function LookbookPage() {
  return (
    <>
      <PageHero
        eyebrow="Visual search · coming soon"
        title="Lookbook"
        accent="purple"
        description="Upload a reference still and find visually-similar shots across the curated archive. Built on SigLIP-2 visual embeddings + HNSW vector index over every seeded keyframe."
      />

      <section className="mb-12 rounded border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="font-serif text-xl text-zinc-100">What this will do</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Drop a frame from any film, reference still, or even a sketch. The
          page extracts a 768-dimensional SigLIP-2 visual embedding from the
          image, runs an HNSW nearest-neighbour search against the seeded
          keyframe corpus, and returns the top 20 most-visually-similar shots
          across the entire curated archive.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          For a working DP, this collapses a half-day of reference-hunting
          into a 10-second query. The output is cited — each match links to
          the curated dossier where the shot lives, with the lighting setup,
          color pipeline, and citation chain intact.
        </p>

        <h3 className="mt-6 font-serif text-base text-zinc-100">What&apos;s in place</h3>
        <ul className="mt-2 space-y-1 text-sm leading-relaxed text-zinc-400">
          <li>✓ <code>production_keyframes.embedding</code> vector(768) column</li>
          <li>✓ HNSW index for sub-100ms ANN retrieval (migration 0030)</li>
          <li>✓ <code>embedding_model</code> + <code>embedding_generated_at</code> versioning (migration 0053)</li>
          <li>✓ <code>getVisuallySimilarKeyFrames</code> query helper</li>
        </ul>

        <h3 className="mt-6 font-serif text-base text-zinc-100">What&apos;s pending</h3>
        <ul className="mt-2 space-y-1 text-sm leading-relaxed text-zinc-400">
          <li>○ Seed keyframes for the 9 deep-dive films (4×9 = 36 baseline frames)</li>
          <li>○ Run SigLIP-2 extractor against seeded frames (one-shot)</li>
          <li>○ Wire serverless inference endpoint for uploaded images</li>
          <li>○ Build the upload UI + results grid</li>
        </ul>

        <h3 className="mt-6 font-serif text-base text-zinc-100">In the meantime</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          The{' '}
          <Link href="/shots" className="text-amber-400 hover:underline">
            palette browser
          </Link>{' '}grouping at /shots renders curated keyframes by extracted
          dominant colour — useful for &ldquo;all warm-amber sunset shots&rdquo; or
          &ldquo;cyan night exteriors&rdquo; without inference.
        </p>
      </section>

      <aside className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-500">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-400">
          Contribute
        </p>
        If you can host a SigLIP-2 inference endpoint or contribute keyframe
        annotations, reach out via the footer. The schema + UI architecture
        are designed to drop a vendor in cleanly.
      </aside>
    </>
  );
}
