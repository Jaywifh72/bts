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
