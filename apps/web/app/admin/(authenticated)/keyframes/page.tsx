import type { Metadata } from 'next';
import { db, listAllKeyFrames, listProductions } from '@bts/db';
import { KeyFrameAdmin } from '@/components/admin/KeyFrameAdmin';

export const metadata: Metadata = {
  title: 'Key Frames Admin',
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ productionSlug?: string }>;
};

export default async function AdminKeyFramesPage(props: Props) {
  const searchParams = await props.searchParams;
  const slug = searchParams.productionSlug || undefined;
  const [frames, productions] = await Promise.all([
    listAllKeyFrames(db, slug),
    listProductions(db, { dataTier: 'curated' }),
  ]);

  return (
    <div>
      <header className="mb-4 flex items-baseline justify-between">
        <h1 className="font-serif text-2xl">Key frames</h1>
        <div className="text-sm text-zinc-500">{frames.length} curated</div>
      </header>
      <p className="mb-6 max-w-2xl text-sm text-zinc-400">
        Hand-pick 3–4 representative stills per curated film. Paste a public
        image URL (TMDb backdrops, Frame.io exports, ASC magazine assets,
        etc.). Frames render in <code className="text-zinc-300">sort_order</code>{' '}
        ascending on the film page.
      </p>
      <KeyFrameAdmin
        productions={productions.map((p) => ({ slug: p.slug, title: p.title }))}
        frames={frames}
        selectedSlug={slug ?? null}
      />
    </div>
  );
}
