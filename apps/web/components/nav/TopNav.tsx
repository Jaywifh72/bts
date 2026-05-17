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
const links = [
  { href: '/films', label: 'Films' },
  { href: '/crew', label: 'Crew' },
  { href: '/gear', label: 'Gear' },
  { href: '/vfx', label: 'VFX' },
  { href: '/stunts', label: 'Stunts' },
  { href: '/awards', label: 'Awards' },
  { href: '/references', label: 'Sources' },
  { href: '/tools', label: 'Tools' },
  { href: '/ask', label: 'Ask' },
] as const;

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function TopNav({ session }: { session: Session | null }) {
  const pathname = usePathname() ?? '/';
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

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
        <ul className="hidden flex-wrap gap-x-4 gap-y-1 lg:flex lg:gap-6">
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
