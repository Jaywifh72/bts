import type { Metadata } from 'next';
import './globals.css';
import { inter, dmSerifDisplay } from '@/lib/fonts';
import { TopNav } from '@/components/nav/TopNav';
import { Footer } from '@/components/nav/Footer';
import { KeyboardShortcuts } from '@/components/nav/KeyboardShortcuts';
import { CommandPalette } from '@/components/nav/CommandPalette';
import { BookmarkSyncOnSignIn } from '@/components/BookmarkSyncOnSignIn';
import { siteUrl } from '@/lib/site';
import { safeAuth } from '@/lib/safe-auth';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    template: '%s | CineCanon',
    default: 'CineCanon — Cinematic Technical Reference',
  },
  description: 'CineCanon is the cinematic technical reference for working camera-department professionals — cited, confidence-graded data on what every film was shot on, by whom, with what gear, lighting, color, sound, music, stunts, and VFX.',
  applicationName: 'CineCanon',
  openGraph: {
    type: 'website',
    siteName: 'CineCanon',
    locale: 'en_US',
    title: 'CineCanon — Cinematic Technical Reference',
    description: 'CineCanon is the cinematic technical reference for working camera-department professionals — cited, confidence-graded data on what every film was shot on, by whom, with what gear, lighting, color, sound, music, stunts, and VFX.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CineCanon — Cinematic Technical Reference',
    description: 'CineCanon is the cinematic technical reference for working camera-department professionals — cited, confidence-graded data on what every film was shot on, by whom, with what gear, lighting, color, sound, music, stunts, and VFX.',
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
  const session = await safeAuth();
  return (
    <html lang="en" className={`${inter.variable} ${dmSerifDisplay.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning data-logged-in={session ? 'true' : 'false'} className="min-h-screen bg-zinc-950 font-sans text-zinc-50 antialiased">
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
        <BookmarkSyncOnSignIn isLoggedIn={!!session} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
