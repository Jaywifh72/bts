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
  description: 'Cited, confidence-graded technical data on every film — cameras, lenses, lighting, color, sound, music, stunts, and VFX — for working camera-department pros.',
  applicationName: 'CineCanon',
  openGraph: {
    type: 'website',
    siteName: 'CineCanon',
    locale: 'en_US',
    title: 'CineCanon — Cinematic Technical Reference',
    description: 'Cited, confidence-graded technical data on every film — cameras, lenses, lighting, color, sound, music, stunts, and VFX — for working camera-department pros.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CineCanon — Cinematic Technical Reference',
    description: 'Cited, confidence-graded technical data on every film — cameras, lenses, lighting, color, sound, music, stunts, and VFX — for working camera-department pros.',
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
      <head>
        {/* LCP optimization — establish TLS handshake to the image CDNs
            that serve the homepage hero + film posters BEFORE the
            HTML parser discovers the <Image> tags. Drops mobile LCP by
            ~300-600ms in measurements. */}
        <link rel="preconnect" href="https://image.tmdb.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <link rel="preconnect" href="https://i.ytimg.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
      </head>
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
