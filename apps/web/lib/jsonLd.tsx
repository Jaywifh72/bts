/**
 * JSON-LD structured data emitter. Renders a server-side <script> tag with
 * the schema.org payload. Search engines (Google, Bing) and AI crawlers use
 * this to understand entity types beyond what HTML alone can express.
 *
 * Use one helper per entity type so the @type and recommended properties are
 * applied consistently. Each helper accepts the smallest set of inputs and
 * sensibly omits fields when they're null.
 */

import { absoluteUrl } from './site';

type JsonLdValue = string | number | boolean | null | JsonLdObject | JsonLdValue[];
type JsonLdObject = { [key: string]: JsonLdValue | undefined };

export function JsonLd({ data }: { data: JsonLdObject }) {
  // Strip undefined and null values recursively so the rendered JSON stays
  // tight. Search engines treat extra null fields as noise and may downgrade
  // structured-data confidence.
  const cleaned = clean(data);
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- output is JSON, not HTML
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleaned) }}
    />
  );
}

function clean(input: JsonLdValue): JsonLdValue {
  if (Array.isArray(input)) {
    const out = input.map(clean).filter((v) => v !== null && v !== undefined);
    return out.length > 0 ? out : null;
  }
  if (input && typeof input === 'object') {
    const out: JsonLdObject = {};
    for (const [k, v] of Object.entries(input)) {
      if (v === null || v === undefined) continue;
      const c = clean(v);
      if (c === null || (Array.isArray(c) && c.length === 0)) continue;
      out[k] = c;
    }
    return out;
  }
  return input;
}

// ─────────────────────────────────────────────────────────────────────────────
// Builders for each entity type. Pages call these and pass the result to <JsonLd>.
// ─────────────────────────────────────────────────────────────────────────────

type MovieInput = {
  slug: string;
  title: string;
  originalTitle?: string | null;
  releaseYear?: number | null;
  synopsis?: string | null;
  directors?: { name: string; slug: string }[];
  posterUrl?: string | null;
  tmdbId?: number | null;
};

export function buildMovieJsonLd(m: MovieInput): JsonLdObject {
  const url = absoluteUrl(`/films/${m.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    '@id': url,
    url,
    name: m.title,
    alternateName: m.originalTitle ?? undefined,
    description: m.synopsis ?? undefined,
    datePublished: m.releaseYear ? String(m.releaseYear) : undefined,
    image: m.posterUrl ?? `${url}/opengraph-image`,
    director:
      m.directors && m.directors.length > 0
        ? m.directors.map((d) => ({
            '@type': 'Person',
            name: d.name,
            url: absoluteUrl(`/crew/${d.slug}`),
          }))
        : undefined,
    sameAs: m.tmdbId ? [`https://www.themoviedb.org/movie/${m.tmdbId}`] : undefined,
  };
}

type PersonInput = {
  slug: string;
  name: string;
  primaryRole?: string | null;
};

export function buildPersonJsonLd(p: PersonInput): JsonLdObject {
  const url = absoluteUrl(`/crew/${p.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': url,
    url,
    name: p.name,
    jobTitle: p.primaryRole ?? undefined,
    image: `${url}/opengraph-image`,
  };
}

type ProductInput = {
  manufacturerSlug: string;
  seriesSlug: string;
  itemSlug: string;
  name: string;
  manufacturerName: string;
  category?: string | null;
  description?: string | null;
};

export function buildProductJsonLd(p: ProductInput): JsonLdObject {
  const url = absoluteUrl(`/gear/${p.manufacturerSlug}/${p.seriesSlug}/${p.itemSlug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': url,
    url,
    name: p.name,
    brand: { '@type': 'Brand', name: p.manufacturerName },
    category: p.category ?? undefined,
    description: p.description ?? undefined,
  };
}

type OrganizationInput = {
  slug: string;
  name: string;
  website?: string | null;
  country?: string | null;
};

export function buildOrganizationJsonLd(o: OrganizationInput): JsonLdObject {
  const url = absoluteUrl(`/vfx/${o.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': url,
    url,
    name: o.name,
    sameAs: o.website ? [o.website] : undefined,
    address: o.country
      ? { '@type': 'PostalAddress', addressCountry: o.country }
      : undefined,
  };
}
