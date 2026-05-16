import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)'],
        serif: ['var(--font-dm-serif-display)'],
      },
      colors: {
        // CineCanon brand palette. Locked tokens — see
        // components/brand/README.md before introducing variants.
        // Use for CineCanon identity surfaces only (logo, confidence
        // glyphs). Existing zinc-* / amber-* utility palette stays
        // for everything else.
        'cc-paper': 'var(--cc-paper)',
        'cc-amber': 'var(--cc-amber)',
        'cc-ink':   'var(--cc-ink)',
      },
    },
  },
  plugins: [],
};

export default config;
