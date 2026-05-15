'use client';

import { useEffect, useState } from 'react';

/**
 * Horizontal sticky table-of-contents chip strip for long content pages
 * (production / crew detail). Renders inline above the article and pins
 * to the top of the viewport once it scrolls past, so the reader can
 * skip to any section without scrolling back to a fixed sidebar.
 *
 * Anchor links use native browser scroll. Pair each id in the `entries`
 * prop with a matching `<section id="...">` on the page; `scroll-mt-*`
 * on the section keeps the heading clear of the sticky chip strip itself.
 *
 * Self-hides under 3 entries — a TOC with one or two chips is more
 * visual noise than signal.
 */
export function PageTOC({ entries }: { entries: Array<{ id: string; label: string }> }) {
  const [active, setActive] = useState<string | null>(entries[0]?.id ?? null);

  useEffect(() => {
    if (entries.length === 0) return;
    // IntersectionObserver tracks which anchored section is currently
    // most visible; we highlight the matching chip. Using 30% root-margin
    // from the top so a section is "active" once it crosses the upper
    // third of the viewport rather than only when fully on screen.
    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((r) => r.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75] },
    );
    for (const e of entries) {
      const el = document.getElementById(e.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length < 3) return null;

  return (
    <nav
      aria-label="On this page"
      // Sticky just under the global top-nav (which is h-14 by default).
      className="sticky top-14 z-30 -mx-4 mb-6 border-b border-zinc-800 bg-zinc-950/95 px-4 backdrop-blur sm:-mx-6 lg:-mx-8 sm:px-6 lg:px-8"
    >
      <ul className="-mx-1 flex flex-nowrap items-center gap-1.5 overflow-x-auto py-2 text-xs scrollbar-thin">
        <li className="shrink-0 px-1 text-[10px] uppercase tracking-widest text-zinc-500">
          On this page
        </li>
        {entries.map((e) => (
          <li key={e.id} className="shrink-0">
            <a
              href={`#${e.id}`}
              aria-current={active === e.id ? 'true' : undefined}
              className={`block rounded-full border px-2.5 py-1 transition-colors ${
                active === e.id
                  ? 'border-amber-600 bg-amber-950/40 text-amber-300'
                  : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-amber-700 hover:text-amber-300'
              }`}
            >
              {e.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
