import Link from 'next/link';
import type { ReferenceWithCrossCitations } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';

const KIND_LABEL: Record<string, string> = {
  link: 'article',
  video: 'video',
  document: 'document',
  audio: 'audio',
  image: 'image',
};

/**
 * Phase 31 — unified references render that consults the polymorphic
 * media model (media_associations role='reference') and surfaces the
 * "+N also cited" cross-citation hint.
 *
 * Self-hides when the entity has no references attached. Replaces
 * the per-entity jsonb-driven render that previously duplicated
 * shared sources across every entity that cited them.
 */
export function EntityReferencesList({
  references,
  /** Optional — overrides the default heading "Further reading" */
  heading,
}: {
  references: readonly ReferenceWithCrossCitations[];
  heading?: string;
}) {
  if (references.length === 0) return null;

  return (
    <section className="mb-10">
      <SectionHeader
        label="References"
        heading={heading ?? `${references.length} ${references.length === 1 ? 'source' : 'sources'} cited`}
      />
      <p className="-mt-2 mb-4 max-w-2xl text-xs text-zinc-500">
        Every URL is stored once in the archive and attached to as
        many entities as cite it. Entries marked{' '}
        <span className="font-mono text-amber-400">+N also cited</span> appear
        on other detail pages too — click to see every entity that
        depends on the same source.
      </p>
      <ul className="space-y-2">
        {references.map((r) => (
          <li
            key={r.asset_id}
            className="flex items-baseline justify-between gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-zinc-500">
                  {KIND_LABEL[r.kind] ?? r.kind}
                </span>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm text-zinc-100 hover:text-amber-400"
                >
                  {r.caption_override ?? r.title}
                </a>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] uppercase tracking-wide text-zinc-500">
                {r.publication && <span>{r.publication}</span>}
                <span className="truncate font-mono normal-case text-zinc-600">{r.url}</span>
              </div>
            </div>
            {r.also_cited_count > 0 && (
              <Link
                href={`/references/${r.asset_id}`}
                className="shrink-0 rounded border border-amber-900/50 bg-amber-950/20 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-300 hover:border-amber-700 hover:bg-amber-950/40"
                title={`Also cited on ${r.also_cited_count} ${r.also_cited_count === 1 ? 'other entity' : 'other entities'}`}
              >
                +{r.also_cited_count} also cited
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
