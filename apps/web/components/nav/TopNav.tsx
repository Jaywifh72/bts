'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import type { Session } from 'next-auth';
import { SearchBar } from './SearchBar';
import { UserMenu } from './UserMenu';
import { CineCanonMark } from '@/components/brand/CineCanonMark';

// UX-audit second pass — top nav had grown to 9 entries plus 3 icons,
// crowding the 1024px breakpoint. "Demos" (/queries) dropped from
// primary nav — it's a curated showcase, not a working surface; it
// still lives in the footer "Cross-cuts" group and is reachable via
// the homepage rail. "Sources" / "Tools" / "Ask" stay — those are
// the daily-use surfaces.
// Primary nav. "Craft" collapses department surfaces (VFX, Stunts, Sound,
// Music, Gear) into a dropdown so the bar fits at lg without crowding.
// Films/Crew/Awards/Sources/Tools/Ask stay flat — they're cross-cuts that
// don't belong to one department.
const links = [
  { href: '/films', label: 'Films' },
  { href: '/crew', label: 'Crew' },
  { href: '/awards', label: 'Awards' },
  { href: '/references', label: 'Sources' },
  { href: '/tools', label: 'Tools' },
  { href: '/ask', label: 'Ask' },
] as const;

const craftLinks = [
  { href: '/vfx',    label: 'VFX',    blurb: 'Houses, supervisors, breakdowns' },
  { href: '/stunts', label: 'Stunts', blurb: 'Companies, performers, sequences, rigging' },
  { href: '/sound',  label: 'Sound',  blurb: 'Mixers, designers, foley, dub stages' },
  { href: '/music',  label: 'Music',  blurb: 'Composers, scoring stages, supervisors' },
  { href: '/gear',   label: 'Gear',   blurb: 'Cameras, lenses, lighting, grip' },
] as const;

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function TopNav({ session }: { session: Session | null }) {
  const pathname = usePathname() ?? '/';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [craftOpen, setCraftOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const craftRef = useRef<HTMLLIElement>(null);

  // Close craft dropdown on route change or outside click.
  useEffect(() => { setCraftOpen(false); }, [pathname]);
  useEffect(() => {
    if (!craftOpen) return;
    function onClick(e: MouseEvent) {
      if (craftRef.current && !craftRef.current.contains(e.target as Node)) {
        setCraftOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setCraftOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [craftOpen]);

  const craftActive = craftLinks.some((l) => isActive(l.href, pathname));

  // Close drawer on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // A11y: when drawer opens, lock body scroll, move focus into it, trap Tab,
  // close on Escape, restore focus to hamburger on close.
  useEffect(() => {
    if (!mobileOpen) return;

    document.body.style.overflow = 'hidden';

    // Move focus to first focusable inside drawer.
    const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
      'a, button, input, [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        return;
      }
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
        'a, button, input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
      // Return focus to the trigger when drawer closes.
      hamburgerRef.current?.focus();
    };
  }, [mobileOpen]);

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950" aria-label="Primary">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-8 sm:px-6 sm:py-4">
        {/* Brand identity. Mark + serif wordmark sit side-by-side; the
            wordmark provides the brand *name* (visible & SR-readable),
            the mark provides identity. The mark's own aria-label is
            suppressed via title="" because the adjacent text already
            says CineCanon — no need to announce it twice. */}
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-lg text-zinc-50 hover:text-amber-400"
        >
          <CineCanonMark size={28} title="" />
          <span>CineCanon</span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden flex-wrap items-center gap-x-4 gap-y-1 lg:flex lg:gap-6">
          {links.map((link) => {
            const active = isActive(link.href, pathname);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'text-sm text-zinc-50 underline decoration-amber-500 decoration-2 underline-offset-4'
                      : 'text-sm text-zinc-400 hover:text-zinc-50 transition-colors'
                  }
                >
                  {link.label}
                </Link>
              </li>
            );
          })}

          {/* Craft dropdown — collapses VFX/Stunts/Sound/Music/Gear so the
              primary bar stays under 9 items at lg. */}
          <li ref={craftRef} className="relative">
            <button
              type="button"
              onClick={() => setCraftOpen(!craftOpen)}
              aria-expanded={craftOpen}
              aria-haspopup="menu"
              className={
                craftActive
                  ? 'inline-flex items-center gap-1 text-sm text-zinc-50 underline decoration-amber-500 decoration-2 underline-offset-4'
                  : 'inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-50 transition-colors'
              }
            >
              Craft
              <span aria-hidden="true" className="text-[10px]">{craftOpen ? '▴' : '▾'}</span>
            </button>
            {craftOpen && (
              <div
                role="menu"
                aria-label="Craft surfaces"
                className="absolute left-0 top-full z-40 mt-2 w-64 overflow-hidden rounded border border-zinc-800 bg-zinc-950 shadow-xl"
              >
                <ul className="divide-y divide-zinc-900">
                  {craftLinks.map((c) => {
                    const active = isActive(c.href, pathname);
                    return (
                      <li key={c.href}>
                        <Link
                          role="menuitem"
                          href={c.href}
                          aria-current={active ? 'page' : undefined}
                          className={
                            active
                              ? 'block bg-amber-950/30 px-3 py-2 text-sm text-amber-300'
                              : 'block px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900 hover:text-amber-400'
                          }
                        >
                          <span className="font-medium">{c.label}</span>
                          <span className="block text-[11px] text-zinc-500">{c.blurb}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </li>
        </ul>

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          <Link
            href="/bookmarks"
            aria-current={isActive('/bookmarks', pathname) ? 'page' : undefined}
            className="inline-flex h-11 w-11 items-center justify-center rounded border border-zinc-800 text-base text-zinc-400 hover:border-amber-500 hover:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950 transition-colors"
            aria-label="Saved bookmarks"
            title="Saved bookmarks"
          >
            ★
          </Link>
          <div className="hidden sm:block"><SearchBar /></div>
          <UserMenu session={session} />

          {/* Mobile hamburger — hidden on lg+ */}
          <button
            ref={hamburgerRef}
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded border border-zinc-800 text-zinc-300 hover:border-amber-500 hover:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile drawer — slides in below nav. A11y: rendered as a modal
          dialog so screen readers announce it as a discrete region and
          keyboard users get focus trap + Escape-to-close. */}
      {mobileOpen && (
        <div
          ref={drawerRef}
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Primary navigation"
          className="lg:hidden border-t border-zinc-800 bg-zinc-950"
        >
          <div className="px-4 py-3 sm:px-6">
            <SearchBar />
          </div>
          <ul className="divide-y divide-zinc-900 border-t border-zinc-800">
            {links.map((link) => {
              const active = isActive(link.href, pathname);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={
                      active
                        // A11y B9: non-color cue (left border + font-weight)
                        // alongside the amber hue.
                        ? 'block border-l-4 border-amber-500 px-4 py-3 text-base font-semibold text-amber-300 sm:px-6'
                        : 'block border-l-4 border-transparent px-4 py-3 text-base text-zinc-300 hover:bg-zinc-900 sm:px-6'
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            {/* Craft group — flat in the drawer for tap-friendliness. */}
            <li className="bg-zinc-900/40 px-4 py-2 text-[10px] uppercase tracking-widest text-zinc-500 sm:px-6">
              Craft
            </li>
            {craftLinks.map((c) => {
              const active = isActive(c.href, pathname);
              return (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    aria-current={active ? 'page' : undefined}
                    className={
                      active
                        ? 'block border-l-4 border-amber-500 px-4 py-3 text-base font-semibold text-amber-300 sm:px-6'
                        : 'block border-l-4 border-transparent px-4 py-3 text-base text-zinc-300 hover:bg-zinc-900 sm:px-6'
                    }
                  >
                    {c.label}
                    <span className="block text-[11px] text-zinc-500">{c.blurb}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/bookmarks"
                aria-current={isActive('/bookmarks', pathname) ? 'page' : undefined}
                className={
                  isActive('/bookmarks', pathname)
                    ? 'block border-l-4 border-amber-500 px-4 py-3 text-base font-semibold text-amber-300 sm:px-6'
                    : 'block border-l-4 border-transparent px-4 py-3 text-base text-zinc-300 hover:bg-zinc-900 sm:px-6'
                }
              >
                <span aria-hidden="true">★ </span>Saved bookmarks
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="block border-l-4 border-transparent px-4 py-3 text-base text-zinc-400 hover:bg-zinc-900 sm:px-6"
              >
                About + methodology
              </Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
