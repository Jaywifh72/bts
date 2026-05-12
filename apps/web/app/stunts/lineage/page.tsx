import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listStuntLineageEdges, type LineageEdge } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PersonAvatar } from '@/components/people/PersonAvatar';

export const metadata: Metadata = {
  title: 'Stunt lineage',
  description:
    'The mentor → protégé chains that account for most working modern Hollywood stunt coordination. The Needham line, the Armstrong line, the 87Eleven / Brandon Lee line, and the Norris / Mad Max line — visualised as a dependency graph from root coordinators forward.',
};

/**
 * Group edges into trees rooted at people who appear as a mentor but
 * never as a protégé. We render each tree as a horizontal chain of
 * generations: root → first generation → second generation. The model
 * works because every documented Hollywood stunt-coordination chain
 * we seed is a strict tree (no shared mentors, no cycles) — the data
 * model permits arbitrary DAGs but the present dataset is forest-shaped.
 */
type TreeNode = {
  slug: string;
  display_name: string;
  profile_path: string | null;
  primary_role: string | null;
  children: TreeNode[];
};

function buildForest(edges: readonly LineageEdge[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  const isProtégé = new Set<string>();

  function ensure(
    slug: string,
    display_name: string,
    profile_path: string | null,
    primary_role: string | null,
  ): TreeNode {
    const cached = nodes.get(slug);
    if (cached) return cached;
    const node: TreeNode = { slug, display_name, profile_path, primary_role, children: [] };
    nodes.set(slug, node);
    return node;
  }

  for (const e of edges) {
    const mentor = ensure(e.mentor_slug, e.mentor_display_name, e.mentor_profile_path, null);
    const protégé = ensure(
      e.protégé_slug,
      e.protégé_display_name,
      e.protégé_profile_path,
      e.protégé_primary_role,
    );
    mentor.children.push(protégé);
    isProtégé.add(e.protégé_slug);
  }

  return [...nodes.values()].filter((n) => !isProtégé.has(n.slug));
}

/**
 * Compact, photo-anchored card used at every generation in the chain.
 * Slightly larger at the root so the visual hierarchy reads "the line
 * starts here, branching forward into the next generation."
 */
function NodeCard({
  node,
  size = 'md',
}: {
  node: TreeNode;
  size?: 'lg' | 'md' | 'sm';
}) {
  const avatarSize = size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md';
  const titleClass =
    size === 'lg'
      ? 'font-serif text-base text-zinc-50'
      : size === 'sm'
        ? 'text-xs text-zinc-100'
        : 'text-sm text-zinc-100';

  return (
    <Link
      href={`/crew/${node.slug}`}
      className="group flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2 hover:border-red-900/50 hover:bg-red-950/10 transition-colors"
    >
      <PersonAvatar
        slug={node.slug}
        displayName={node.display_name}
        profilePath={node.profile_path}
        size={avatarSize}
      />
      <span className="min-w-0">
        <span className={`block truncate ${titleClass} group-hover:text-amber-400`}>
          {node.display_name}
        </span>
        {node.primary_role && (
          <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
            {node.primary_role}
          </span>
        )}
      </span>
    </Link>
  );
}

/** Renders one root and its descendants left-to-right. */
function Tree({ root }: { root: TreeNode }) {
  // Two generations is the deepest any documented chain we seed runs.
  // We render N levels by recursing, but with a flatter visual emphasis
  // since most readers come for "who taught whom" not graph theory.
  return (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
      <div className="shrink-0">
        <NodeCard node={root} size="lg" />
      </div>
      {root.children.length > 0 && (
        <>
          <span aria-hidden className="mt-7 hidden text-red-900/60 sm:block">→</span>
          <div className="flex flex-col gap-2">
            {root.children.map((c) => (
              <div key={c.slug} className="flex flex-wrap items-start gap-x-3 gap-y-2">
                <NodeCard node={c} />
                {c.children.length > 0 && (
                  <>
                    <span aria-hidden className="mt-4 hidden text-red-900/40 sm:block">→</span>
                    <div className="flex flex-col gap-2">
                      {c.children.map((g) => (
                        <NodeCard key={g.slug} node={g} size="sm" />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default async function StuntLineagePage() {
  const edges = await listStuntLineageEdges(db);
  const forest = buildForest(edges);
  // Sort roots so the most-branching mentors render first — that's
  // a useful proxy for historical importance within this small dataset.
  forest.sort((a, b) => b.children.length - a.children.length || a.display_name.localeCompare(b.display_name));

  const totalCoordinators = new Set<string>();
  for (const e of edges) {
    totalCoordinators.add(e.mentor_slug);
    totalCoordinators.add(e.protégé_slug);
  }

  return (
    <>
      {/* Hero — same red-accented neighbourhood as /stunts so the
          section identity reads instantly. */}
      <div className="relative mb-12 overflow-hidden border-b border-zinc-800 pb-10">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-red-950/40 via-zinc-950/0 to-transparent"
        />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.25em] text-red-500/80">Archive · Lineage</p>
          <h1 className="mt-2 font-serif text-5xl text-zinc-50 leading-none">
            Who brought whom up
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Stunt coordination is overwhelmingly an apprentice craft.
            The chains below trace the working coordinators of modern
            Hollywood action back to the second-unit floors and
            doubling jobs where they came up. Every edge is sourced
            from published interviews, Variety / theASC oral histories,
            or producers' commentary tracks — not inference.
          </p>

          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div>
              <div className="font-serif text-2xl text-zinc-50">{forest.length}</div>
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">Lineages</div>
            </div>
            <div>
              <div className="font-serif text-2xl text-zinc-50">{totalCoordinators.size}</div>
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">Coordinators</div>
            </div>
            <div>
              <div className="font-serif text-2xl text-zinc-50">{edges.length}</div>
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">Documented edges</div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link href="/stunts/people" className="text-amber-400 hover:underline">
              Browse all performers + coordinators →
            </Link>
            <Link href="/stunts" className="text-amber-400 hover:underline">
              Back to the Stunts archive →
            </Link>
          </div>
        </div>
      </div>

      {forest.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No documented lineage edges yet. Run <code>seed-stunt-lineages</code>.
        </p>
      ) : (
        <div className="space-y-10">
          {forest.map((root) => (
            <section
              key={root.slug}
              className="rounded border border-zinc-800 bg-zinc-900/30 p-5"
            >
              <SectionHeader
                label="Lineage"
                heading={`The ${root.display_name.split(' ').slice(-1)[0]} line`}
              />
              <p className="-mt-2 mb-4 max-w-2xl text-xs text-zinc-500">
                Traced from {root.display_name} through{' '}
                {root.children.length}{' '}
                {root.children.length === 1 ? 'direct protégé' : 'direct protégés'}.
              </p>
              <Tree root={root} />
            </section>
          ))}
        </div>
      )}

      <aside className="mt-12 rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-500">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-400">
          About this graph
        </p>
        Every edge is a documented apprenticeship — typically multiple
        years working as the protégé's primary second-unit hand, double,
        or 87Eleven trainee. We deliberately exclude one-off
        productions, where the relationship is collaborative rather
        than formative. If you know of a chain we're missing, the
        archive accepts contributions through the Corrections endpoint.
      </aside>
    </>
  );
}
