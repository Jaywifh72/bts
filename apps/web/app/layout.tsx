import type { Metadata } from 'next';
import './globals.css';
import { inter, dmSerifDisplay } from '@/lib/fonts';
import { TopNav } from '@/components/nav/TopNav';
import { Footer } from '@/components/nav/Footer';
import { KeyboardShortcuts } from '@/components/nav/KeyboardShortcuts';
import { CommandPalette } from '@/components/nav/CommandPalette';
import { siteUrl } from '@/lib/site';
import { auth } from '@/auth';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    template: '%s | CineCanon',
    default: 'CineCanon — Cinematic Technical Reference',
  },
  description: 'Behind-the-scenes technical metadata for working film professionals.',
  applicationName: 'CineCanon',
  openGraph: {
    type: 'website',
    siteName: 'CineCanon',
    locale: 'en_US',
    title: 'CineCanon — Cinematic Technical Reference',
    description: 'Behind-the-scenes technical metadata for working film professionals.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CineCanon — Cinematic Technical Reference',
    description: 'Behind-the-scenes technical metadata for working film professionals.',
  },
  // T9-6: feed autodiscovery — readers like NetNewsWire or Feedly pick
  // this up automatically when the user enters the homepage URL.
  alternates: {
    types: {
      'application/atom+xml': '/digest.xml',
    },
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en" className={`${inter.variable} ${dmSerifDisplay.variable}`}>
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-50 antialiased">
        {/* T8-2: skip-to-content. Visually hidden until keyboard-focused. */}
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <TopNav session={session} />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-7xl px-4 py-8 min-h-[60vh] sm:px-6 lg:px-8 focus:outline-none"
        >
          {children}
        </main>
        <Footer />
        <KeyboardShortcuts />
        <CommandPalette />
      </body>
    </html>
  );
}
