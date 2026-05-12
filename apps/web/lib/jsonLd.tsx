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
  /** TMDb vote average (0-10) for AggregateRating. */
  voteAverage?: number | null;
  voteCount?: number | null;
  /** TMDb genre names for the genre field. */
  genres?: string[];
  runtime?: number | null;
  // E-41 — schema.org expansion.
  /** Studios with role='production_company' from production_studios. */
  productionCompanies?: { name: string }[];
  /** Studios with role='distributor'. */
  distributors?: { name: string }[];
  /** Camera-dept crew (DP, gaffer, etc) for Movie.contributor. */
  contributors?: { name: string; slug: string; role: string }[];
  /** Citations from `sources` joined via attributions.production_id. */
  citations?: { title: string | null; url: string; publisher?: string | null }[];
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
    // Falls back to undefined when no poster. Per-detail-page OG image
    // generation is deferred (see commit message for details); the
    // site-level og:image set via root layout still applies.
    image: m.posterUrl ?? undefined,
    director:
      m.directors && m.directors.length > 0
        ? m.directors.map((d) => ({
            '@type': 'Person',
            name: d.name,
            url: absoluteUrl(`/crew/${d.slug}`),
          }))
        : undefined,
    sameAs: m.tmdbId ? [`https://www.themoviedb.org/movie/${m.tmdbId}`] : undefined,
    genre: m.genres && m.genres.length > 0 ? m.genres : undefined,
    duration: m.runtime ? `PT${m.runtime}M` : undefined, // ISO-8601 duration
    // T6-3: AggregateRating from TMDb's vote_average. ratingCount required by spec.
    aggregateRating: m.voteAverage && m.voteCount && m.voteCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: m.voteAverage,
      bestRating: 10,
      worstRating: 0,
      ratingCount: m.voteCount,
    } : undefined,
    // E-41 — productionCompany / distributor / contributor / citation.
    productionCompany: m.productionCompanies && m.productionCompanies.length > 0
      ? m.productionCompanies.map((c) => ({ '@type': 'Organization', name: c.name }))
      : undefined,
    distributor: m.distributors && m.distributors.length > 0
      ? m.distributors.map((d) => ({ '@type': 'Organization', name: d.name }))
      : undefined,
    contributor: m.contributors && m.contributors.length > 0
      ? m.contributors.map((c) => ({
          '@type': 'Person',
          name: c.name,
          url: absoluteUrl(`/crew/${c.slug}`),
          jobTitle: c.role,
        }))
      : undefined,
    citation: m.citations && m.citations.length > 0
      ? m.citations.map((c) => ({
          '@type': 'CreativeWork',
          name: c.title ?? c.url,
          url: c.url,
          publisher: c.publisher
            ? { '@type': 'Organization', name: c.publisher }
            : undefined,
        }))
      : undefined,
  };
}

/**
 * T6-4 — BreadcrumbList JSON-LD. Pass the trail in order from root to leaf.
 * Each item: `name` (display) + `path` (absolute or root-relative).
 */
export function buildBreadcrumbJsonLd(
  trail: { name: string; path: string }[],
): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: t.path.startsWith('http') ? t.path : absoluteUrl(t.path),
    })),
  };
}

type PersonInput = {
  slug: string;
  name: string;
  primaryRole?: string | null;
  // E-41 expansion.
  birthYear?: number | null;
  deathYear?: number | null;
  nationality?: string | null;
  imdbId?: string | null;
  tmdbPersonId?: number | null;
  wikidataId?: string | null;
  /** Wikidata-backfilled film schools (E-25 / wikidata:education). */
  alumniOf?: string[];
  /** ASC, BSC, AMC, etc — populated by E-13/E-14 society directories. */
  memberOf?: string[];
  /** Awards joined from production_awards via the person's credits. */
  awards?: { name: string; year: number; isWinner: boolean }[];
};

export function buildPersonJsonLd(p: PersonInput): JsonLdObject {
  const url = absoluteUrl(`/crew/${p.slug}`);
  const sameAs: string[] = [];
  if (p.imdbId) sameAs.push(`https://www.imdb.com/name/${p.imdbId}`);
  if (p.tmdbPersonId) sameAs.push(`https://www.themoviedb.org/person/${p.tmdbPersonId}`);
  if (p.wikidataId) sameAs.push(`https://www.wikidata.org/wiki/${p.wikidataId}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': url,
    url,
    name: p.name,
    jobTitle: p.primaryRole ?? undefined,
    nationality: p.nationality ?? undefined,
    birthDate: p.birthYear ? String(p.birthYear) : undefined,
    deathDate: p.deathYear ? String(p.deathYear) : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    alumniOf: p.alumniOf && p.alumniOf.length > 0
      ? p.alumniOf.map((school) => ({
          '@type': 'EducationalOrganization',
          name: school,
        }))
      : undefined,
    memberOf: p.memberOf && p.memberOf.length > 0
      ? p.memberOf.map((society) => ({
          '@type': 'Organization',
          name: society,
        }))
      : undefined,
    award: p.awards && p.awards.length > 0
      ? p.awards
          .filter((a) => a.isWinner)
          .map((a) => `${a.name} (${a.year})`)
      : undefined,
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

// ── Scene → CreativeWork ────────────────────────────────────────────────────
//
// Scene pages are the richest editorial-prose surface on the site (lighting
// motivation paragraphs, rigging detail, location, time of day). They are
// also exactly the kind of "passage that AI engines want to cite" — without
// structured data they're undertyped. CreativeWork + isPartOf links them to
// the parent Movie; citation array exposes their primary sources.

type SceneInput = {
  productionSlug: string;
  productionTitle: string;
  sceneSlug: string;
  sceneTitle: string;
  synopsis?: string | null;
  location?: string | null;
  timeOfDay?: string | null;
  interiorExterior?: string | null;
  authorName?: string | null;
  authorUrl?: string | null;
  dateModified?: string | null;
  citations?: Array<{ name: string; url: string; publication?: string | null }> | null;
};

export function buildSceneJsonLd(s: SceneInput): JsonLdObject {
  const url = absoluteUrl(`/films/${s.productionSlug}/scenes/${s.sceneSlug}`);
  const parentUrl = absoluteUrl(`/films/${s.productionSlug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': url,
    url,
    name: s.sceneTitle,
    description: s.synopsis ?? undefined,
    isPartOf: {
      '@type': 'Movie',
      '@id': parentUrl,
      url: parentUrl,
      name: s.productionTitle,
    },
    contentLocation: s.location ? { '@type': 'Place', name: s.location } : undefined,
    keywords: [s.interiorExterior, s.timeOfDay].filter(Boolean).join(', ') || undefined,
    author: s.authorName
      ? { '@type': 'Person', name: s.authorName, url: s.authorUrl ?? undefined }
      : undefined,
    dateModified: s.dateModified ?? undefined,
    citation: s.citations?.map((c) => ({
      '@type': 'CreativeWork',
      name: c.name,
      url: c.url,
      publisher: c.publication ? { '@type': 'Organization', name: c.publication } : undefined,
    })),
    // E-E-A-T: AI engines reward sites that explicitly mark which passages
    // are good "speak aloud" candidates. The synopsis is the canonical one.
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.scene-synopsis', 'h1', '[data-speakable]'],
    },
  };
}

// ── Stunt sequence → Article ─────────────────────────────────────────────────
//
// Stunt sequence pages have description + rigging detail + safety bulletins
// + references — same passage-citable shape as scenes. Use Article (the
// schema.org subtype that carries author + dateModified + publisher most
// natively).

type StuntSequenceInput = {
  productionSlug: string;
  productionTitle: string;
  sequenceSlug: string;
  sequenceName: string;
  description?: string | null;
  disciplines?: string[] | null;
  citations?: Array<{ name: string; url: string; publication?: string | null }> | null;
  dateModified?: string | null;
};

export function buildStuntSequenceJsonLd(s: StuntSequenceInput): JsonLdObject {
  const url = absoluteUrl(`/stunts/sequences/${s.productionSlug}/${s.sequenceSlug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': url,
    url,
    headline: `${s.sequenceName} — ${s.productionTitle}`,
    description: s.description ?? undefined,
    keywords: s.disciplines?.join(', '),
    about: {
      '@type': 'Movie',
      '@id': absoluteUrl(`/films/${s.productionSlug}`),
      name: s.productionTitle,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Studio Pro',
      url: absoluteUrl('/'),
    },
    dateModified: s.dateModified ?? undefined,
    citation: s.citations?.map((c) => ({
      '@type': 'CreativeWork',
      name: c.name,
      url: c.url,
      publisher: c.publication ? { '@type': 'Organization', name: c.publication } : undefined,
    })),
  };
}

// ── Keyframe → ImageObject ───────────────────────────────────────────────────

type ImageInput = {
  url: string;
  caption?: string | null;
  credit?: string | null;
  productionTitle?: string | null;
  width?: number;
  height?: number;
};

export function buildImageJsonLd(i: ImageInput): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    contentUrl: i.url,
    url: i.url,
    name: i.caption ?? undefined,
    caption: i.caption ?? undefined,
    creditText: i.credit ?? undefined,
    isPartOf: i.productionTitle
      ? { '@type': 'Movie', name: i.productionTitle }
      : undefined,
    width: i.width,
    height: i.height,
  };
}

// ── BTS video → VideoObject ──────────────────────────────────────────────────

type VideoInput = {
  url: string;
  title: string;
  thumbnailUrl?: string | null;
  uploadDate?: string | null;
  duration?: number | null;  // seconds
  channelName?: string | null;
  productionTitle?: string | null;
};

function toIso8601Duration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${s ? `${s}S` : ''}` || 'PT0S';
}

export function buildVideoJsonLd(v: VideoInput): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: v.title,
    contentUrl: v.url,
    embedUrl: v.url,
    thumbnailUrl: v.thumbnailUrl ?? undefined,
    uploadDate: v.uploadDate ?? undefined,
    duration: v.duration != null ? toIso8601Duration(v.duration) : undefined,
    author: v.channelName
      ? { '@type': 'Organization', name: v.channelName }
      : undefined,
    about: v.productionTitle
      ? { '@type': 'Movie', name: v.productionTitle }
      : undefined,
  };
}
