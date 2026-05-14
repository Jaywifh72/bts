'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { SearchBar } from './SearchBar';

const links = [
  { href: '/films', label: 'Films' },
  { href: '/crew', label: 'Crew' },
  { href: '/gear', label: 'Gear' },
  { href: '/vfx', label: 'VFX' },
  { href: '/stunts', label: 'Stunts' },
  { href: '/references', label: 'References' },
  { href: '/tools', label: 'Tools' },
  { href: '/queries', label: 'Queries' },
  { href: '/ask', label: 'Ask' },
] as const;

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function TopNav() {
  const pathname = usePathname() ?? '/';
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer open.
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [mobileOpen]);

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950" aria-label="Primary">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-8 sm:px-6 sm:py-4">
        <Link href="/" className="font-serif text-lg text-zinc-50 hover:text-amber-400">
          CineCanon
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
            className="text-sm text-zinc-400 hover:text-amber-400 transition-colors"
            aria-label="Saved bookmarks"
            title="Saved bookmarks"
          >
            ★
          </Link>
          <div className="hidden sm:block"><SearchBar /></div>

          {/* Mobile hamburger — hidden on lg+ */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            className="lg:hidden rounded border border-zinc-800 px-2 py-1 text-zinc-300 hover:border-amber-500 hover:text-amber-400"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile drawer — slides in below nav. */}
      {mobileOpen && (
        <div
          id="mobile-nav-drawer"
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
                        ? 'block px-4 py-3 text-base text-amber-400 sm:px-6'
                        : 'block px-4 py-3 text-base text-zinc-300 hover:bg-zinc-900 sm:px-6'
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
                className="block px-4 py-3 text-base text-zinc-300 hover:bg-zinc-900 sm:px-6"
              >
                ★ Saved bookmarks
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="block px-4 py-3 text-base text-zinc-500 hover:bg-zinc-900 sm:px-6"
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
