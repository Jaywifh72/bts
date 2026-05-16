import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Shared shell for per-role landing pages (`/for-dps`, `/for-colorists`,
 * `/for-coordinators`, `/for-gaffers`). Caller supplies the role-specific
 * tools, queries, top people, and recent dossiers; the layout is fixed.
 */
export function RolePage({
  eyebrow,
  title,
  description,
  toolBlock,
  crossCutBlock,
  peopleBlock,
  dossierBlock,
}: {
  eyebrow: string;
  title: string;
  description: string;
  toolBlock?: ReactNode;
  crossCutBlock?: ReactNode;
  peopleBlock?: ReactNode;
  dossierBlock?: ReactNode;
}) {
  return (
    <>
      <header className="mb-10 border-b border-zinc-800 pb-8">
        <p className="text-[11px] uppercase tracking-[0.25em] text-amber-500/80">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-serif text-4xl text-zinc-50">{title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-300">
          {description}
        </p>
      </header>
      {toolBlock}
      {crossCutBlock}
      {peopleBlock}
      {dossierBlock}
      <aside className="mt-12 rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-400">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-400">
          About this page
        </p>
        CineCanon&apos;s editorial standard: every claim is cited with a
        confidence rating. Read{' '}
        <Link href="/methodology" className="text-amber-400 hover:underline">the methodology</Link> for the four-tier rubric, the link-rot policy,
        and the dispute-resolution flow.
      </aside>
    </>
  );
}

export function ToolTile({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <li>
      <Link
        href={href}
        className="block h-full rounded border border-amber-900/40 bg-amber-950/10 p-4 hover:border-amber-700/60"
      >
        <h3 className="font-serif text-base text-zinc-100">{title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{desc}</p>
      </Link>
    </li>
  );
}

export function CrossCutLink({ href, title }: { href: string; title: string }) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-200 hover:border-amber-700/60 hover:text-amber-400"
      >
        <span aria-hidden="true">→ </span>{title}
      </Link>
    </li>
  );
}
