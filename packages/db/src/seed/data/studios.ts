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
