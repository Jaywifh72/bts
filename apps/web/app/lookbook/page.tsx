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
        eyebrow="Visual search · upload coming soon"
        title="Lookbook"
        accent="purple"
        description="Visual reverse search across the curated keyframe archive. Reference-still upload is in development; in the meantime, the palette browser below sorts every curated frame by dominant colour — useful today for 'warm-amber sunset' or 'cyan night exterior' lookups without inference."
        actions={
          <Link
            href="/shots"
            className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-500"
          >
            Browse the palette grouping at /shots <span aria-hidden="true">→</span>
          </Link>
        }
      />

      <section className="mb-12 rounded border border-amber-700/40 bg-amber-950/10 p-6">
        <h2 className="font-serif text-xl text-zinc-100">
          What's working today
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
          The palette browser at{' '}
          <Link href="/shots" className="text-amber-400 hover:underline">/shots</Link>{' '}
          groups every curated keyframe by extracted dominant colour. Useful for
          &ldquo;warm-amber sunset shots&rdquo; or &ldquo;cyan night exteriors&rdquo;
          today, no inference required.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
          When upload-and-match ships here, it'll run a SigLIP-2 visual
          embedding against the keyframe corpus and return the top 20
          visually-similar shots — each match links to the dossier with the
          lighting plot, color pipeline, and citation chain intact. Match
          rationale matters as much as match accuracy on a reference site.
        </p>
      </section>

      <aside className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-400">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-300">
          Contributors
        </p>
        Schema and query infrastructure are in place
        (<code>production_keyframes.embedding vector(768)</code>, HNSW index,
        model versioning). The bottleneck is hosting a SigLIP-2 inference
        endpoint. If you can host one — or contribute keyframe annotations to
        seed the corpus — reach out via the footer.
      </aside>
    </>
  );
}
