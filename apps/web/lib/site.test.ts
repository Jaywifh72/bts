// Unit tests for the site-URL helpers. These guarantee that the
// `@id` / `url` / canonical fields emitted by every JSON-LD block on
// every dossier page (~77 call sites — see graphify audit) come out
// well-formed for any value of NEXT_PUBLIC_SITE_URL the user supplies
// in Vercel.
//
// The risk this guards against: if siteUrl() silently returns a value
// with a trailing slash, every absoluteUrl() call concatenates a double
// slash, and every JSON-LD `@id` across the site becomes malformed
// simultaneously. Catch that here, not in production.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { siteUrl, absoluteUrl } from './site';

describe('siteUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
  });

  it('falls back to localhost:3000 when env var is unset', () => {
    expect(siteUrl()).toBe('http://localhost:3000');
  });

  it('returns the env value verbatim when no trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.cinecanon.com';
    expect(siteUrl()).toBe('https://www.cinecanon.com');
  });

  it('strips a single trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.cinecanon.com/';
    expect(siteUrl()).toBe('https://www.cinecanon.com');
  });

  it('strips multiple trailing slashes (defensive — copy-paste error)', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.cinecanon.com///';
    expect(siteUrl()).toBe('https://www.cinecanon.com');
  });

  it('strips whitespace around the env value', () => {
    process.env.NEXT_PUBLIC_SITE_URL = '  https://www.cinecanon.com  ';
    expect(siteUrl()).toBe('https://www.cinecanon.com');
  });

  it('falls back when env var is whitespace only', () => {
    process.env.NEXT_PUBLIC_SITE_URL = '   ';
    expect(siteUrl()).toBe('http://localhost:3000');
  });

  it('preserves a non-default port', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:8080';
    expect(siteUrl()).toBe('http://localhost:8080');
  });

  it('preserves a subpath when the deploy lives under one (no path stripping)', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/cinecanon';
    expect(siteUrl()).toBe('https://example.com/cinecanon');
  });
});

describe('absoluteUrl', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.cinecanon.com';
  });

  it('joins a leading-slash path correctly', () => {
    expect(absoluteUrl('/films/the-brutalist-2024')).toBe(
      'https://www.cinecanon.com/films/the-brutalist-2024',
    );
  });

  it('returns the bare host for the root path "/"', () => {
    expect(absoluteUrl('/')).toBe('https://www.cinecanon.com/');
  });

  it('joins a path without a leading slash', () => {
    expect(absoluteUrl('crew/greig-fraser')).toBe(
      'https://www.cinecanon.com/crew/greig-fraser',
    );
  });

  it('never produces a double slash even if env had a trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.cinecanon.com/';
    expect(absoluteUrl('/films/x')).toBe('https://www.cinecanon.com/films/x');
    expect(absoluteUrl('/films/x')).not.toMatch(/\/\/films/);
  });

  it('preserves query strings and fragments', () => {
    expect(absoluteUrl('/films/x?utm=test')).toBe(
      'https://www.cinecanon.com/films/x?utm=test',
    );
    expect(absoluteUrl('/films/x#claim-42')).toBe(
      'https://www.cinecanon.com/films/x#claim-42',
    );
  });

  it('joins deep nested paths used by scene routes', () => {
    expect(absoluteUrl('/films/dune-part-two-2024/scenes/spice-harvester')).toBe(
      'https://www.cinecanon.com/films/dune-part-two-2024/scenes/spice-harvester',
    );
  });

  it('produces a parseable URL for every call site (round-trip via URL())', () => {
    const paths = [
      '/',
      '/films',
      '/films/the-brutalist-2024',
      '/crew/greig-fraser',
      '/vfx/dneg',
      '/partnerships/villeneuve-fraser',
      '/api/v1/aeo/digest.xml',
    ];
    for (const p of paths) {
      const url = absoluteUrl(p);
      // If URL() throws, the value is malformed and every JSON-LD `@id`
      // emitted by every dossier page would silently violate schema.org.
      expect(() => new URL(url)).not.toThrow();
      expect(new URL(url).host).toBe('www.cinecanon.com');
    }
  });
});
