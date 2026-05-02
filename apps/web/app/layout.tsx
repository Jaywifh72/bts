import type { Metadata } from 'next';
import './globals.css';
import { inter, dmSerifDisplay } from '@/lib/fonts';
import { TopNav } from '@/components/nav/TopNav';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    template: '%s | Studio Pro',
    default: 'Studio Pro — Cinematic Technical Reference',
  },
  description: 'Behind-the-scenes technical metadata for working film professionals.',
  applicationName: 'Studio Pro',
  openGraph: {
    type: 'website',
    siteName: 'Studio Pro',
    locale: 'en_US',
    title: 'Studio Pro — Cinematic Technical Reference',
    description: 'Behind-the-scenes technical metadata for working film professionals.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Studio Pro — Cinematic Technical Reference',
    description: 'Behind-the-scenes technical metadata for working film professionals.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerifDisplay.variable}`}>
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-50 antialiased">
        <TopNav />
        <main className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
