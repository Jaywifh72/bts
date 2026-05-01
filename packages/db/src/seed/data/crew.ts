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

  // ===== Classic Era =====
  { productionSlug: 'lawrence-of-arabia-1962', personSlug: 'freddie-young', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'lawrence-of-arabia-1962', personSlug: 'david-lean', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'the-godfather-1972', personSlug: 'gordon-willis', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'the-godfather-1972', personSlug: 'francis-ford-coppola', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'barry-lyndon-1975', personSlug: 'john-alcott', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'barry-lyndon-1975', personSlug: 'stanley-kubrick', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'days-of-heaven-1978', personSlug: 'nestor-almendros', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'days-of-heaven-1978', personSlug: 'terrence-malick', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'apocalypse-now-1979', personSlug: 'vittorio-storaro', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'apocalypse-now-1979', personSlug: 'francis-ford-coppola', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'blade-runner-1982', personSlug: 'jordan-cronenweth', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'blade-runner-1982', personSlug: 'ridley-scott', roleSlug: 'director', creditOrder: 1 },

  // ===== 1990s =====
  { productionSlug: 'schindlers-list-1993', personSlug: 'janusz-kaminski', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'schindlers-list-1993', personSlug: 'steven-spielberg', roleSlug: 'director', creditOrder: 1 },

  // ===== 2000s =====
  { productionSlug: 'collateral-2004', personSlug: 'dion-beebe', roleSlug: 'director-of-photography', creditOrder: 1 },

  { productionSlug: 'no-country-for-old-men-2007', personSlug: 'roger-deakins', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'no-country-for-old-men-2007', personSlug: 'joel-coen', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'there-will-be-blood-2007', personSlug: 'robert-elswit', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'there-will-be-blood-2007', personSlug: 'paul-thomas-anderson', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'the-dark-knight-2008', personSlug: 'wally-pfister', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'the-dark-knight-2008', personSlug: 'christopher-nolan', roleSlug: 'director', creditOrder: 1 },

  // ===== 2010s =====
  { productionSlug: 'inception-2010', personSlug: 'wally-pfister', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'inception-2010', personSlug: 'christopher-nolan', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'the-social-network-2010', personSlug: 'jeff-cronenweth', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'the-social-network-2010', personSlug: 'david-fincher', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'birdman-2014', personSlug: 'emmanuel-lubezki', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'birdman-2014', personSlug: 'alejandro-inarritu', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'ex-machina-2014', personSlug: 'rob-hardy', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'ex-machina-2014', personSlug: 'alex-garland', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'carol-2015', personSlug: 'ed-lachman', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'carol-2015', personSlug: 'todd-haynes', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'son-of-saul-2015', personSlug: 'matyas-erdely', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'son-of-saul-2015', personSlug: 'laslo-nemes', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'moonlight-2016', personSlug: 'james-laxton', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'moonlight-2016', personSlug: 'barry-jenkins', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'la-la-land-2016', personSlug: 'linus-sandgren', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'la-la-land-2016', personSlug: 'damien-chazelle', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'arrival-2016', personSlug: 'bradford-young', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'arrival-2016', personSlug: 'denis-villeneuve', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'cold-war-2018', personSlug: 'lukasz-zal', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'cold-war-2018', personSlug: 'pawel-pawlikowski', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'first-man-2018', personSlug: 'linus-sandgren', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'first-man-2018', personSlug: 'damien-chazelle', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'the-favourite-2018', personSlug: 'robbie-ryan', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'the-favourite-2018', personSlug: 'yorgos-lanthimos', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'midsommar-2019', personSlug: 'pawel-pogorzelski', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'midsommar-2019', personSlug: 'ari-aster', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'once-upon-a-time-in-hollywood-2019', personSlug: 'robert-richardson', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'once-upon-a-time-in-hollywood-2019', personSlug: 'quentin-tarantino', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'portrait-of-a-lady-on-fire-2019', personSlug: 'claire-mathon', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'portrait-of-a-lady-on-fire-2019', personSlug: 'celine-sciamma', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'the-lighthouse-2019', personSlug: 'jarin-blaschke', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'the-lighthouse-2019', personSlug: 'robert-eggers', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'joker-2019', personSlug: 'lawrence-sher', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'joker-2019', personSlug: 'todd-phillips', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'marriage-story-2019', personSlug: 'robbie-ryan', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'marriage-story-2019', personSlug: 'noah-baumbach', roleSlug: 'director', creditOrder: 1 },

  // ===== 2020–2024 =====
  { productionSlug: 'mank-2020', personSlug: 'erik-messerschmidt', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'mank-2020', personSlug: 'david-fincher', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'the-power-of-the-dog-2021', personSlug: 'ari-wegner', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'the-power-of-the-dog-2021', personSlug: 'jane-campion', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'nightmare-alley-2021', personSlug: 'dan-laustsen', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'nightmare-alley-2021', personSlug: 'guillermo-del-toro', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'spencer-2021', personSlug: 'claire-mathon', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'spencer-2021', personSlug: 'pablo-larrain', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'babylon-2022', personSlug: 'linus-sandgren', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'babylon-2022', personSlug: 'damien-chazelle', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'elvis-2022', personSlug: 'mandy-walker', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'elvis-2022', personSlug: 'baz-luhrmann', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'tar-2022', personSlug: 'florian-hoffmeister', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'tar-2022', personSlug: 'todd-field', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'all-quiet-on-the-western-front-2022', personSlug: 'james-friend', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'all-quiet-on-the-western-front-2022', personSlug: 'edward-berger', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'the-substance-2024', personSlug: 'benjamin-kracun', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'the-substance-2024', personSlug: 'coralie-fargeat', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'anora-2024', personSlug: 'drew-daniels', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'anora-2024', personSlug: 'sean-baker', roleSlug: 'director', creditOrder: 1 },

  { productionSlug: 'conclave-2024', personSlug: 'stephane-fontaine', roleSlug: 'director-of-photography', creditOrder: 1 },
  { productionSlug: 'conclave-2024', personSlug: 'edward-berger', roleSlug: 'director', creditOrder: 1 },
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
