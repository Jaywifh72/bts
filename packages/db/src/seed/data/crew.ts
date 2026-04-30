import { eq } from 'drizzle-orm';
import { crewAssignments, productions, people, roles } from '../../schema/index.ts';
import type { SeedDb } from '../run.ts';

type CrewSeed = {
  productionSlug: string;
  personSlug: string;
  roleSlug: string;
  creditOrder?: number;
  notes?: string;
};

export const crewData: CrewSeed[] = [
  // Dune: Part Two — Greig Fraser DP, Villeneuve director
  { productionSlug: 'dune-part-two-2024', personSlug: 'greig-fraser', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'dune-part-two-2024', personSlug: 'denis-villeneuve', roleSlug: 'director', creditOrder: 1 },

  // Oppenheimer — Hoyte van Hoytema DP, Nolan director
  { productionSlug: 'oppenheimer-2023', personSlug: 'hoyte-van-hoytema', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'oppenheimer-2023', personSlug: 'christopher-nolan', roleSlug: 'director', creditOrder: 1 },

  // The Brutalist — Lol Crawley DP, Brady Corbet director
  { productionSlug: 'the-brutalist-2024', personSlug: 'lol-crawley', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'the-brutalist-2024', personSlug: 'brady-corbet', roleSlug: 'director', creditOrder: 1 },

  // Poor Things — Robbie Ryan DP, Lanthimos director
  { productionSlug: 'poor-things-2023', personSlug: 'robbie-ryan', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'poor-things-2023', personSlug: 'yorgos-lanthimos', roleSlug: 'director', creditOrder: 1 },

  // Killers of the Flower Moon — Rodrigo Prieto DP, Scorsese director
  { productionSlug: 'killers-of-the-flower-moon-2023', personSlug: 'rodrigo-prieto', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'killers-of-the-flower-moon-2023', personSlug: 'martin-scorsese', roleSlug: 'director', creditOrder: 1 },

  // The Batman — Greig Fraser DP (again), Matt Reeves director
  { productionSlug: 'the-batman-2022', personSlug: 'greig-fraser', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'the-batman-2022', personSlug: 'matt-reeves', roleSlug: 'director', creditOrder: 1 },

  // The Northman — Jarin Blaschke DP, Robert Eggers director
  { productionSlug: 'the-northman-2022', personSlug: 'jarin-blaschke', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'the-northman-2022', personSlug: 'robert-eggers', roleSlug: 'director', creditOrder: 1 },

  // 1917 — Roger Deakins DP, Sam Mendes director
  { productionSlug: '1917-2019', personSlug: 'roger-deakins', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: '1917-2019', personSlug: 'sam-mendes', roleSlug: 'director', creditOrder: 1 },

  // Blade Runner 2049 — Roger Deakins DP, Villeneuve director
  { productionSlug: 'blade-runner-2049-2017', personSlug: 'roger-deakins', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'blade-runner-2049-2017', personSlug: 'denis-villeneuve', roleSlug: 'director', creditOrder: 1 },

  // Mad Max: Fury Road — John Seale DP, George Miller director
  { productionSlug: 'mad-max-fury-road-2015', personSlug: 'john-seale', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'mad-max-fury-road-2015', personSlug: 'george-miller', roleSlug: 'director', creditOrder: 1 },

  // The Revenant — Emmanuel Lubezki DP, Iñárritu director
  { productionSlug: 'the-revenant-2015', personSlug: 'emmanuel-lubezki', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'the-revenant-2015', personSlug: 'alejandro-inarritu', roleSlug: 'director', creditOrder: 1 },

  // Gravity — Emmanuel Lubezki DP
  { productionSlug: 'gravity-2013', personSlug: 'emmanuel-lubezki', roleSlug: 'director-of-photography', creditOrder: 1 },

  // Dunkirk — Hoyte van Hoytema DP, Nolan director
  { productionSlug: 'dunkirk-2017', personSlug: 'hoyte-van-hoytema', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'dunkirk-2017', personSlug: 'christopher-nolan', roleSlug: 'director', creditOrder: 1 },

  // Skyfall — Roger Deakins DP, Sam Mendes director
  { productionSlug: 'skyfall-2012', personSlug: 'roger-deakins', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'skyfall-2012', personSlug: 'sam-mendes', roleSlug: 'director', creditOrder: 1 },

  // Children of Men — Emmanuel Lubezki DP
  { productionSlug: 'children-of-men-2006', personSlug: 'emmanuel-lubezki', roleSlug: 'director-of-photography', creditOrder: 1 },

  // A few additional named camera-dept crew on Dune 2 (anchor-audience credibility):
  { productionSlug: 'dune-part-two-2024', personSlug: 'jaime-mata-mukai', roleSlug: 'gaffer' },
  { productionSlug: 'dune-part-two-2024', personSlug: 'tim-hurrell', roleSlug: 'first-ac' },
];

export async function seedCrew(db: SeedDb) {
  for (const c of crewData) {
    const [{ id: prodId } = { id: undefined }] = await db.select({ id: productions.id }).from(productions).where(eq(productions.slug, c.productionSlug));
    if (!prodId) throw new Error(`unknown production slug: ${c.productionSlug}`);
    const [{ id: personId } = { id: undefined }] = await db.select({ id: people.id }).from(people).where(eq(people.slug, c.personSlug));
    if (!personId) throw new Error(`unknown person slug: ${c.personSlug}`);
    const [{ id: roleId } = { id: undefined }] = await db.select({ id: roles.id }).from(roles).where(eq(roles.slug, c.roleSlug));
    if (!roleId) throw new Error(`unknown role slug: ${c.roleSlug}`);

    await db.insert(crewAssignments)
      .values({
        productionId: prodId,
        personId: personId,
        roleId: roleId,
        creditOrder: c.creditOrder ?? null,
        notes: c.notes ?? null,
      })
      .onConflictDoUpdate({
        target: [crewAssignments.productionId, crewAssignments.personId, crewAssignments.roleId],
        set: {
          creditOrder: c.creditOrder ?? null,
          notes: c.notes ?? null,
          updatedAt: new Date(),
        },
      });
  }
}
