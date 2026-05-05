import type { MetadataRoute } from 'next';
import {
  db,
  listProductions,
  listPeople,
  listManufacturers,
  listAllGearPaths,
  listVfxHouses,
  listProductionLastmods,
} from '@bts/db';
import { siteUrl } from '@/lib/site';

/**
 * Dynamic sitemap.xml — emits every public URL the site exposes.
 *
 * /admin/* is intentionally excluded (also explicitly disallowed via robots.txt).
 *
 * Priorities are relative within the site and follow the page-importance
 * gradient: home > index pages > entity detail pages > deep gear pages.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const [productions, people, manufacturers, gearPaths, vfxHouses, lastmods] = await Promise.all([
    listProductions(db),
    listPeople(db),
    listManufacturers(db),
    listAllGearPaths(db),
    listVfxHouses(db),
    listProductionLastmods(db),
  ]);

  // T6-2: per-production lastmod from updated_at. Falls back to `now` when
  // a slug isn't in the lastmods map (shouldn't happen but defensive).
  const lastmodBySlug = new Map(lastmods.map((l) => [l.slug, new Date(l.updated_at)]));

  const seriesPaths = new Set<string>();
  for (const g of gearPaths) {
    seriesPaths.add(`${g.manufacturer_slug}/${g.series_slug}`);
  }

  return [
    // Static / index pages
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/films`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/crew`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/gear`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/vfx`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },

    // Production detail pages
    ...productions.map((p) => ({
      url: `${base}/films/${p.slug}`,
      lastModified: lastmodBySlug.get(p.slug) ?? now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),

    // Person detail pages
    ...people.map((p) => ({
      url: `${base}/crew/${p.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),

    // VFX house detail pages
    ...vfxHouses.map((h) => ({
      url: `${base}/vfx/${h.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),

    // Manufacturer pages
    ...manufacturers.map((m) => ({
      url: `${base}/gear/${m.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),

    // Series pages
    ...[...seriesPaths].map((path) => ({
      url: `${base}/gear/${path}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),

    // Item pages
    ...gearPaths.map((g) => ({
      url: `${base}/gear/${g.manufacturer_slug}/${g.series_slug}/${g.item_slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),

    // Killer query pages
    {
      url: `${base}/queries/alexa65-sphero`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${base}/queries/dune-part-two-lenses`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${base}/queries/magic-hour-2023`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}
