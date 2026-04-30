import { eq, and, sql } from 'drizzle-orm';
import {
  equipmentUsage, scenes, equipmentSeries, equipmentItems,
  crewAssignments, productions, people, roles,
} from '../../schema/index.ts';
import type { SeedDb } from '../run.ts';

type UsageSeed = {
  productionSlug: string;
  sceneSlug: string;
  seriesSlug: string;
  itemSlug?: string;          // optional; when set, must belong to seriesSlug
  setupLabel?: string;
  usageRole?: string;
  notes?: string;
  // Optional crew attribution: resolved as crew_assignments matching (production, person, role)
  crewPersonSlug?: string;
  crewRoleSlug?: string;
};

export const usageData: UsageSeed[] = [
  // ======================================================
  // Dune: Part Two — Greig Fraser, ALEXA Mini LF + DNA LF Vintage Primes + IRND filters
  // ======================================================
  // Arrakis Walking Sequence
  { productionSlug: 'dune-part-two-2024', sceneSlug: 'arrakis-walking-sequence',
    seriesSlug: 'arri-alexa-mini-lf-series', itemSlug: 'arri-alexa-mini-lf',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'greig-fraser', crewRoleSlug: 'director-of-photography' },
  { productionSlug: 'dune-part-two-2024', sceneSlug: 'arrakis-walking-sequence',
    seriesSlug: 'arri-rental-dna-lf-vintage', itemSlug: 'arri-rental-dna-lf-vintage-50mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens' },
  { productionSlug: 'dune-part-two-2024', sceneSlug: 'arrakis-walking-sequence',
    seriesSlug: 'tiffen-irnd', itemSlug: 'tiffen-irnd-0-9',
    setupLabel: 'A-Cam', usageRole: 'in_mattebox_filter' },

  // Sandworm Ride
  { productionSlug: 'dune-part-two-2024', sceneSlug: 'sandworm-ride',
    seriesSlug: 'arri-alexa-mini-lf-series', itemSlug: 'arri-alexa-mini-lf',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'greig-fraser', crewRoleSlug: 'director-of-photography' },
  { productionSlug: 'dune-part-two-2024', sceneSlug: 'sandworm-ride',
    seriesSlug: 'arri-rental-dna-lf-vintage', itemSlug: 'arri-rental-dna-lf-vintage-32mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens' },

  // IMAX B&W Arena (IR-converted body)
  { productionSlug: 'dune-part-two-2024', sceneSlug: 'imax-bw-arena',
    seriesSlug: 'arri-alexa-mini-lf-series', itemSlug: 'arri-alexa-mini-lf',
    setupLabel: 'IR-Cam', usageRole: 'a_cam',
    notes: 'IR-converted ALEXA Mini LF for the B&W test sequences.' },
  { productionSlug: 'dune-part-two-2024', sceneSlug: 'imax-bw-arena',
    seriesSlug: 'arri-rental-dna-lf-vintage', itemSlug: 'arri-rental-dna-lf-vintage-100mm',
    setupLabel: 'IR-Cam', usageRole: 'a_cam_lens' },

  // ======================================================
  // Oppenheimer — IMAX 65mm + 65mm 5-perf + Panavision 65mm
  // ======================================================
  { productionSlug: 'oppenheimer-2023', sceneSlug: 'trinity-test',
    seriesSlug: 'arri-alexa-65-series', itemSlug: 'arri-alexa-65',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'hoyte-van-hoytema', crewRoleSlug: 'director-of-photography',
    notes: 'IMAX 65mm + ALEXA 65 hybrid coverage on this sequence.' },
  { productionSlug: 'oppenheimer-2023', sceneSlug: 'lab-meeting',
    seriesSlug: 'arri-alexa-65-series', itemSlug: 'arri-alexa-65',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'hoyte-van-hoytema', crewRoleSlug: 'director-of-photography' },

  // ======================================================
  // The Brutalist — Lol Crawley, VistaVision (no equipment_series for VistaVision yet,
  // so we'll just skip equipment_usage here and document in notes)
  // ======================================================
  // (Intentionally no equipment_usage rows — the project doesn't have a VistaVision series seeded.)

  // ======================================================
  // Poor Things — ALEXA Mini LF + Cooke S7/i + SkyPanel for the magic-hour Lisbon scene (Q3!)
  // ======================================================
  { productionSlug: 'poor-things-2023', sceneSlug: 'lisbon-tile-rooftops',
    seriesSlug: 'arri-alexa-mini-lf-series', itemSlug: 'arri-alexa-mini-lf',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'robbie-ryan', crewRoleSlug: 'director-of-photography' },
  { productionSlug: 'poor-things-2023', sceneSlug: 'lisbon-tile-rooftops',
    seriesSlug: 'cooke-s7i-ff-plus', itemSlug: 'cooke-s7i-25mm-t2',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens' },
  { productionSlug: 'poor-things-2023', sceneSlug: 'lisbon-tile-rooftops',
    seriesSlug: 'arri-skypanel', itemSlug: 'arri-skypanel-s60-c',
    setupLabel: 'Key', usageRole: 'key_light',
    notes: 'SkyPanel as ambient fill for the magic-hour rooftop sequence.' },

  // ======================================================
  // Killers of the Flower Moon — ALEXA 65 + Orbiter on the magic-hour ext scene (Q3!)
  // ======================================================
  { productionSlug: 'killers-of-the-flower-moon-2023', sceneSlug: 'osage-prairie-dawn',
    seriesSlug: 'arri-alexa-65-series', itemSlug: 'arri-alexa-65',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'rodrigo-prieto', crewRoleSlug: 'director-of-photography',
    notes: 'ALEXA 65 for the prairie dawn establishing.' },
  // (Note: spec explicitly says do NOT seed KOTFM as a Panavision Sphero match.)
  { productionSlug: 'killers-of-the-flower-moon-2023', sceneSlug: 'osage-prairie-dawn',
    seriesSlug: 'arri-orbiter', itemSlug: 'arri-orbiter',
    setupLabel: 'Key', usageRole: 'key_light',
    notes: 'Orbiter as portable HMI-replacement for early-dawn fill.' },

  // ======================================================
  // The Batman — Greig Fraser, ALEXA LF + DNA LF Vintage Primes (similar pairing to Dune)
  // ======================================================
  { productionSlug: 'the-batman-2022', sceneSlug: 'opening-rooftop',
    seriesSlug: 'arri-alexa-family', itemSlug: 'arri-alexa-lf',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'greig-fraser', crewRoleSlug: 'director-of-photography' },
  { productionSlug: 'the-batman-2022', sceneSlug: 'opening-rooftop',
    seriesSlug: 'arri-rental-dna-lf-vintage', itemSlug: 'arri-rental-dna-lf-vintage-40mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens' },

  // ======================================================
  // The Northman — Mini LF + Cooke S7/i (per Blaschke's interview)
  // ======================================================
  { productionSlug: 'the-northman-2022', sceneSlug: 'volcano-duel',
    seriesSlug: 'arri-alexa-mini-lf-series', itemSlug: 'arri-alexa-mini-lf',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'jarin-blaschke', crewRoleSlug: 'director-of-photography' },
  { productionSlug: 'the-northman-2022', sceneSlug: 'volcano-duel',
    seriesSlug: 'cooke-s7i-ff-plus', itemSlug: 'cooke-s7i-50mm-t2',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens' },

  // ======================================================
  // 1917 — Mini LF + Master Anamorphic (per Deakins interview)
  // ======================================================
  { productionSlug: '1917-2019', sceneSlug: 'trench-to-poppy-field-oner',
    seriesSlug: 'arri-alexa-mini-lf-series', itemSlug: 'arri-alexa-mini-lf',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'roger-deakins', crewRoleSlug: 'director-of-photography' },
  { productionSlug: '1917-2019', sceneSlug: 'trench-to-poppy-field-oner',
    seriesSlug: 'zeiss-master-anamorphic', itemSlug: 'zeiss-master-anamorphic-35mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens' },

  // ======================================================
  // Blade Runner 2049 — ALEXA XT + Master Primes (Deakins)
  // ======================================================
  { productionSlug: 'blade-runner-2049-2017', sceneSlug: 'sea-wall-confrontation',
    seriesSlug: 'arri-alexa-family', itemSlug: 'arri-alexa-xt',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'roger-deakins', crewRoleSlug: 'director-of-photography' },
  { productionSlug: 'blade-runner-2049-2017', sceneSlug: 'sea-wall-confrontation',
    seriesSlug: 'zeiss-master-prime', itemSlug: 'zeiss-master-prime-32mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens' },

  // ======================================================
  // Mad Max: Fury Road — ALEXA Mini + no specific lens series seeded
  // ======================================================
  { productionSlug: 'mad-max-fury-road-2015', sceneSlug: 'opening-chase',
    seriesSlug: 'arri-alexa-family', itemSlug: 'arri-alexa-mini',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'john-seale', crewRoleSlug: 'director-of-photography' },

  // ======================================================
  // The Revenant — ALEXA 65 + Panavision Sphero (Q1 anchor!)
  // CRITICAL: scene must have BOTH series referenced for Q1 to return The Revenant.
  // ======================================================
  { productionSlug: 'the-revenant-2015', sceneSlug: 'glacial-rebirth',
    seriesSlug: 'arri-alexa-65-series', itemSlug: 'arri-alexa-65',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'emmanuel-lubezki', crewRoleSlug: 'director-of-photography' },
  { productionSlug: 'the-revenant-2015', sceneSlug: 'glacial-rebirth',
    seriesSlug: 'panavision-sphero-anamorphic', itemSlug: 'panavision-sphero-50mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens' },
  { productionSlug: 'the-revenant-2015', sceneSlug: 'bear-attack',
    seriesSlug: 'arri-alexa-65-series', itemSlug: 'arri-alexa-65',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'emmanuel-lubezki', crewRoleSlug: 'director-of-photography' },

  // ======================================================
  // Gravity — ALEXA Mini + Master Primes (Lubezki)
  // ======================================================
  { productionSlug: 'gravity-2013', sceneSlug: 'space-debris-strike',
    seriesSlug: 'arri-alexa-family', itemSlug: 'arri-alexa-mini',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'emmanuel-lubezki', crewRoleSlug: 'director-of-photography' },

  // ======================================================
  // Dunkirk — ALEXA 65 aerial coverage (Hoytema)
  // ======================================================
  { productionSlug: 'dunkirk-2017', sceneSlug: 'mole-aerial',
    seriesSlug: 'arri-alexa-65-series', itemSlug: 'arri-alexa-65',
    setupLabel: 'Aerial', usageRole: 'aerial_cam',
    crewPersonSlug: 'hoyte-van-hoytema', crewRoleSlug: 'director-of-photography' },

  // ======================================================
  // Skyfall — ALEXA Mini + Master Primes (Deakins)
  // ======================================================
  { productionSlug: 'skyfall-2012', sceneSlug: 'shanghai-skyline-fight',
    seriesSlug: 'arri-alexa-family', itemSlug: 'arri-alexa-mini',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'roger-deakins', crewRoleSlug: 'director-of-photography' },

  // ======================================================
  // Children of Men — 35mm film only; no digital series seeded — skip.
  // ======================================================
];

export async function seedEquipmentUsage(db: SeedDb) {
  for (const u of usageData) {
    // Resolve scene
    const [sceneRow] = await db
      .select({ id: scenes.id, prodId: scenes.productionId })
      .from(scenes)
      .innerJoin(productions, eq(scenes.productionId, productions.id))
      .where(and(eq(productions.slug, u.productionSlug), eq(scenes.slug, u.sceneSlug)));
    if (!sceneRow) throw new Error(`unknown (production, scene): (${u.productionSlug}, ${u.sceneSlug})`);
    const { id: sceneId, prodId } = sceneRow;

    const [seriesRow] = await db
      .select({ id: equipmentSeries.id })
      .from(equipmentSeries)
      .where(eq(equipmentSeries.slug, u.seriesSlug));
    if (!seriesRow) throw new Error(`unknown series slug: ${u.seriesSlug}`);
    const seriesId = seriesRow.id;

    let itemId: number | null = null;
    if (u.itemSlug) {
      const [itemRow] = await db
        .select({ id: equipmentItems.id })
        .from(equipmentItems)
        .where(eq(equipmentItems.slug, u.itemSlug));
      if (!itemRow) throw new Error(`unknown item slug: ${u.itemSlug}`);
      itemId = itemRow.id;
    }

    let crewAssignmentId: number | null = null;
    if (u.crewPersonSlug && u.crewRoleSlug) {
      const [caRow] = await db
        .select({ id: crewAssignments.id })
        .from(crewAssignments)
        .innerJoin(people, eq(crewAssignments.personId, people.id))
        .innerJoin(roles, eq(crewAssignments.roleId, roles.id))
        .where(and(
          eq(crewAssignments.productionId, prodId),
          eq(people.slug, u.crewPersonSlug),
          eq(roles.slug, u.crewRoleSlug),
        ));
      if (caRow) crewAssignmentId = caRow.id;
    }

    // equipment_usage has no natural slug. Use a deterministic uniqueness check
    // based on (scene_id, equipment_series_id, equipment_item_id, setup_label).
    // Delete-and-reinsert this exact tuple for idempotency.
    await db.delete(equipmentUsage)
      .where(and(
        eq(equipmentUsage.sceneId, sceneId),
        eq(equipmentUsage.equipmentSeriesId, seriesId),
        itemId !== null
          ? eq(equipmentUsage.equipmentItemId, itemId)
          : sql`${equipmentUsage.equipmentItemId} IS NULL`,
        u.setupLabel
          ? eq(equipmentUsage.setupLabel, u.setupLabel)
          : sql`${equipmentUsage.setupLabel} IS NULL`,
      ));

    await db.insert(equipmentUsage).values({
      sceneId: sceneId,
      equipmentSeriesId: seriesId,
      equipmentItemId: itemId,
      crewAssignmentId: crewAssignmentId,
      setupLabel: u.setupLabel ?? null,
      usageRole: u.usageRole ?? null,
      notes: u.notes ?? null,
    });
  }
}
