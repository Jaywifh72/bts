import Link from 'next/link';
import { SearchBar } from './SearchBar';

const links = [
  { href: '/films', label: 'Films' },
  { href: '/crew', label: 'Crew' },
  { href: '/gear', label: 'Gear' },
  { href: '/vfx', label: 'VFX' },
  { href: '/queries/alexa65-sphero', label: 'Queries' },
] as const;

export function TopNav() {
  return (
    <nav className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-4">
        <Link href="/" className="font-serif text-lg text-zinc-50 hover:text-amber-400">
          Studio Pro
        </Link>
        <ul className="flex gap-6">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto">
          <SearchBar />
        </div>
      </div>
    </nav>
  );
}
