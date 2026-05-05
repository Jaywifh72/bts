import { equipmentManufacturers } from '../../schema/index.ts';
import type { SeedDb } from '../run.ts';

export const manufacturersData = [
  { slug: 'arri', name: 'ARRI', kind: 'manufacturer' as const, country: 'DE', foundedYear: 1917 },
  { slug: 'arri-rental', name: 'ARRI Rental', kind: 'rental_house' as const, country: 'DE' },
  { slug: 'cooke', name: 'Cooke Optics', kind: 'manufacturer' as const, country: 'GB', foundedYear: 1893 },
  { slug: 'panavision', name: 'Panavision', kind: 'manufacturer' as const, country: 'US', foundedYear: 1954 },
  { slug: 'zeiss', name: 'Carl Zeiss', kind: 'manufacturer' as const, country: 'DE', foundedYear: 1846 },
  { slug: 'atlas-lens', name: 'Atlas Lens Co', kind: 'manufacturer' as const, country: 'US' },
  { slug: 'tiffen', name: 'The Tiffen Company', kind: 'manufacturer' as const, country: 'US' },
  { slug: 'schneider-kreuznach', name: 'Schneider-Kreuznach', kind: 'manufacturer' as const, country: 'DE' },
  { slug: 'leitz-cine', name: 'Leitz Cine', kind: 'manufacturer' as const, country: 'DE' },
  { slug: 'angenieux', name: 'Angénieux', kind: 'manufacturer' as const, country: 'FR' },
  { slug: 'imax', name: 'IMAX Corporation', kind: 'manufacturer' as const, country: 'CA', foundedYear: 1967 },
  { slug: 'red-digital-cinema', name: 'RED Digital Cinema', kind: 'manufacturer' as const, country: 'US', foundedYear: 2005 },
  // 'sony-cinema' is the canonical slug — predates this row but the original
  // seed used the verbose name 'Sony Cinema Products'. Standardize on 'Sony'.
  { slug: 'sony-cinema', name: 'Sony', kind: 'manufacturer' as const, country: 'JP', foundedYear: 1946 },
  { slug: 'mitchell', name: 'Mitchell Camera Corporation', kind: 'manufacturer' as const, country: 'US', foundedYear: 1920 },
  { slug: 'vantage', name: 'Vantage Film (Hawk)', kind: 'manufacturer' as const, country: 'DE', foundedYear: 1995 },
  { slug: 'bausch-lomb', name: 'Bausch & Lomb', kind: 'manufacturer' as const, country: 'US', foundedYear: 1853 },
  { slug: 'lomo', name: 'LOMO', kind: 'manufacturer' as const, country: 'RU', foundedYear: 1914 },
];

export async function seedManufacturers(db: SeedDb) {
  for (const m of manufacturersData) {
    await db.insert(equipmentManufacturers)
      .values(m)
      .onConflictDoUpdate({
        target: equipmentManufacturers.slug,
        set: {
          name: m.name,
          kind: m.kind,
          country: m.country ?? null,
          foundedYear: m.foundedYear ?? null,
          updatedAt: new Date(),
        },
      });
  }
}
