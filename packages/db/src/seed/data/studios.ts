import { studios } from '../../schema/index.ts';
import type { SeedDb } from '../run.ts';

export const studiosData = [
  { slug: 'warner-bros',    name: 'Warner Bros. Pictures',  kind: 'studio' as const, country: 'US' },
  { slug: 'sony-pictures',  name: 'Sony Pictures',          kind: 'studio' as const, country: 'US' },
  { slug: 'disney',         name: 'Walt Disney Studios',    kind: 'studio' as const, country: 'US' },
  { slug: 'universal',      name: 'Universal Pictures',     kind: 'studio' as const, country: 'US' },
  { slug: 'netflix',        name: 'Netflix',                kind: 'streamer' as const, country: 'US' },
  { slug: 'apple-tv-plus',  name: 'Apple TV+',              kind: 'streamer' as const, country: 'US' },
  { slug: 'lionsgate',      name: 'Lionsgate',              kind: 'studio' as const, country: 'US' },
  { slug: 'a24',            name: 'A24',                    kind: 'production_company' as const, country: 'US' },
  { slug: 'blumhouse',      name: 'Blumhouse Productions',  kind: 'production_company' as const, country: 'US' },
  { slug: 'legendary',      name: 'Legendary Entertainment',kind: 'production_company' as const, country: 'US' },
  { slug: 'searchlight',    name: 'Searchlight Pictures',   kind: 'studio' as const, country: 'US' },
  { slug: 'annapurna',      name: 'Annapurna Pictures',     kind: 'production_company' as const, country: 'US' },
  { slug: 'focus-features', name: 'Focus Features',         kind: 'distributor' as const, country: 'US' },
  { slug: 'plan-b',         name: 'Plan B Entertainment',   kind: 'production_company' as const, country: 'US' },
  { slug: 'specialty-films', name: 'Specialty Films',       kind: 'production_company' as const, country: 'US' },
  { slug: 'columbia-pictures', name: 'Columbia Pictures',     kind: 'studio' as const, country: 'US' },
  { slug: 'paramount',         name: 'Paramount Pictures',     kind: 'studio' as const, country: 'US' },
  { slug: 'united-artists',    name: 'United Artists',         kind: 'studio' as const, country: 'US' },
  { slug: 'zoetrope',          name: 'American Zoetrope',      kind: 'production_company' as const, country: 'US' },
  { slug: 'amblin',            name: 'Amblin Entertainment',   kind: 'production_company' as const, country: 'US' },
  { slug: 'dreamworks',        name: 'DreamWorks Pictures',    kind: 'studio' as const, country: 'US' },
  { slug: 'miramax',           name: 'Miramax',                kind: 'studio' as const, country: 'US' },
  { slug: 'syncopy',           name: 'Syncopy',                kind: 'production_company' as const, country: 'GB' },
  { slug: 'film4',             name: 'Film4 Productions',      kind: 'production_company' as const, country: 'GB' },
  { slug: 'weinstein-company', name: 'The Weinstein Company',  kind: 'studio' as const, country: 'US' },
  { slug: 'sony-pictures-classics', name: 'Sony Pictures Classics', kind: 'distributor' as const, country: 'US' },
  { slug: 'amazon-studios',    name: 'Amazon MGM Studios',     kind: 'studio' as const, country: 'US' },
  { slug: 'mk2',               name: 'mk2 Films',              kind: 'production_company' as const, country: 'FR' },
  { slug: 'neon',              name: 'NEON',                   kind: 'distributor' as const, country: 'US' },
  { slug: 'topic-studios',     name: 'Topic Studios',          kind: 'production_company' as const, country: 'US' },
  { slug: 'mubi',              name: 'MUBI',                   kind: 'distributor' as const, country: 'GB' },
  { slug: 'black-label-media', name: 'Black Label Media',      kind: 'production_company' as const, country: 'US' },
];

export async function seedStudios(db: SeedDb) {
  for (const s of studiosData) {
    await db.insert(studios)
      .values(s)
      .onConflictDoUpdate({
        target: studios.slug,
        set: { name: s.name, kind: s.kind, country: s.country, updatedAt: new Date() },
      });
  }
}
