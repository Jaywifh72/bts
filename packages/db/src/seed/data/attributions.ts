import { eq, and, sql } from 'drizzle-orm';
import {
  sources, productions, scenes, crewAssignments, equipmentUsage, equipmentSeries,
  productionSources, sceneSources, crewAssignmentSources, equipmentUsageSources,
  people, roles,
} from '../../schema/index.ts';
import type { SeedDb } from '../run.ts';

type Confidence = 'primary' | 'secondary' | 'manufacturer_marketing' | 'speculative';

type ProductionAttr = {
  productionSlug: string;
  sourceSlug: string;
  confidence: Confidence;
  claimQuote?: string;
  notes?: string;
};

type SceneAttr = {
  productionSlug: string;
  sceneSlug: string;
  sourceSlug: string;
  confidence: Confidence;
  claimQuote?: string;
};

type CrewAttr = {
  productionSlug: string;
  personSlug: string;
  roleSlug: string;
  sourceSlug: string;
  confidence: Confidence;
  claimQuote?: string;
};

type UsageAttr = {
  productionSlug: string;
  sceneSlug: string;
  seriesSlug: string;
  setupLabel?: string;       // helps disambiguate when multiple usage rows exist
  sourceSlug: string;
  confidence: Confidence;
  claimQuote?: string;
};

// One primary AC source per production, where available.
export const productionAttrs: ProductionAttr[] = [
  { productionSlug: 'dune-part-two-2024', sourceSlug: 'ac-fraser-dune-2024', confidence: 'primary' },
  { productionSlug: 'dune-part-two-2024', sourceSlug: 'team-deakins-fraser-dune-2024', confidence: 'secondary' },
  { productionSlug: 'oppenheimer-2023', sourceSlug: 'ac-hoytema-oppenheimer-2023', confidence: 'primary' },
  { productionSlug: 'oppenheimer-2023', sourceSlug: 'imax-blog-oppenheimer-2023', confidence: 'manufacturer_marketing' },
  { productionSlug: 'the-brutalist-2024', sourceSlug: 'ac-crawley-brutalist-2024', confidence: 'primary' },
  { productionSlug: 'poor-things-2023', sourceSlug: 'ac-ryan-poor-things-2023', confidence: 'primary' },
  { productionSlug: 'killers-of-the-flower-moon-2023', sourceSlug: 'ac-prieto-kotfm-2023', confidence: 'primary' },
  { productionSlug: 'the-batman-2022', sourceSlug: 'ac-fraser-batman-2022', confidence: 'primary' },
  { productionSlug: 'the-northman-2022', sourceSlug: 'ac-blaschke-northman-2022', confidence: 'primary' },
  { productionSlug: '1917-2019', sourceSlug: 'ac-deakins-1917-2020', confidence: 'primary' },
  { productionSlug: '1917-2019', sourceSlug: 'team-deakins-1917-podcast', confidence: 'secondary' },
  { productionSlug: 'blade-runner-2049-2017', sourceSlug: 'ac-deakins-blade-runner-2049', confidence: 'primary' },
  { productionSlug: 'mad-max-fury-road-2015', sourceSlug: 'ac-seale-fury-road-2015', confidence: 'primary' },
  { productionSlug: 'the-revenant-2015', sourceSlug: 'ac-lubezki-revenant-2015', confidence: 'primary' },
  { productionSlug: 'the-revenant-2015', sourceSlug: 'inarritu-revenant-vanity-fair-2015', confidence: 'secondary' },
  { productionSlug: 'gravity-2013', sourceSlug: 'ac-lubezki-gravity-2013', confidence: 'primary' },
  { productionSlug: 'dunkirk-2017', sourceSlug: 'ac-hoytema-dunkirk-2017', confidence: 'primary' },
  { productionSlug: 'skyfall-2012', sourceSlug: 'ac-deakins-skyfall-2012', confidence: 'primary' },
  { productionSlug: 'children-of-men-2006', sourceSlug: 'ac-lubezki-children-of-men', confidence: 'primary' },
];

// Scene-level attribution where a published source documents a specific scene
export const sceneAttrs: SceneAttr[] = [
  { productionSlug: 'dune-part-two-2024', sceneSlug: 'arrakis-walking-sequence',
    sourceSlug: 'ac-fraser-dune-2024', confidence: 'primary',
    claimQuote: 'Fraser shot the dune-walking sequences in Wadi Rum during early-morning windows for low-angle shadow detail.' },
  { productionSlug: 'oppenheimer-2023', sceneSlug: 'trinity-test',
    sourceSlug: 'ac-hoytema-oppenheimer-2023', confidence: 'primary',
    claimQuote: 'The Trinity sequence was shot at dawn over multiple takes with practical pyro and IMAX 65mm.' },
  { productionSlug: 'oppenheimer-2023', sceneSlug: 'fission-visions',
    sourceSlug: 'imax-blog-oppenheimer-2023', confidence: 'manufacturer_marketing',
    claimQuote: 'IMAX 70mm B&W (Kodak custom stock) was used for the fission visions.' },
  { productionSlug: '1917-2019', sceneSlug: 'trench-to-poppy-field-oner',
    sourceSlug: 'team-deakins-1917-podcast', confidence: 'primary',
    claimQuote: 'Deakins describes the magic-hour timing constraints of the trench-to-poppy-field oner.' },
  { productionSlug: 'the-revenant-2015', sceneSlug: 'glacial-rebirth',
    sourceSlug: 'ac-lubezki-revenant-2015', confidence: 'primary',
    claimQuote: 'Lubezki shot the glacial-rebirth sequence at magic hour over multiple weeks waiting for the right light.' },
  { productionSlug: 'poor-things-2023', sceneSlug: 'lisbon-tile-rooftops',
    sourceSlug: 'ac-ryan-poor-things-2023', confidence: 'primary',
    claimQuote: 'Ryan shot the Lisbon rooftop sequences at magic hour with SkyPanels for ambient fill.' },
];

// Crew assignment attribution (DPs + directors)
export const crewAttrs: CrewAttr[] = [
  { productionSlug: 'dune-part-two-2024', personSlug: 'greig-fraser', roleSlug: 'director-of-photography',
    sourceSlug: 'ac-fraser-dune-2024', confidence: 'primary' },
  { productionSlug: 'oppenheimer-2023', personSlug: 'hoyte-van-hoytema', roleSlug: 'director-of-photography',
    sourceSlug: 'ac-hoytema-oppenheimer-2023', confidence: 'primary' },
  { productionSlug: 'the-brutalist-2024', personSlug: 'lol-crawley', roleSlug: 'director-of-photography',
    sourceSlug: 'ac-crawley-brutalist-2024', confidence: 'primary' },
  { productionSlug: 'poor-things-2023', personSlug: 'robbie-ryan', roleSlug: 'director-of-photography',
    sourceSlug: 'ac-ryan-poor-things-2023', confidence: 'primary' },
  { productionSlug: 'killers-of-the-flower-moon-2023', personSlug: 'rodrigo-prieto', roleSlug: 'director-of-photography',
    sourceSlug: 'ac-prieto-kotfm-2023', confidence: 'primary' },
  { productionSlug: 'the-batman-2022', personSlug: 'greig-fraser', roleSlug: 'director-of-photography',
    sourceSlug: 'ac-fraser-batman-2022', confidence: 'primary' },
  { productionSlug: 'the-northman-2022', personSlug: 'jarin-blaschke', roleSlug: 'director-of-photography',
    sourceSlug: 'ac-blaschke-northman-2022', confidence: 'primary' },
  { productionSlug: '1917-2019', personSlug: 'roger-deakins', roleSlug: 'director-of-photography',
    sourceSlug: 'ac-deakins-1917-2020', confidence: 'primary' },
  { productionSlug: 'blade-runner-2049-2017', personSlug: 'roger-deakins', roleSlug: 'director-of-photography',
    sourceSlug: 'ac-deakins-blade-runner-2049', confidence: 'primary' },
  { productionSlug: 'mad-max-fury-road-2015', personSlug: 'john-seale', roleSlug: 'director-of-photography',
    sourceSlug: 'ac-seale-fury-road-2015', confidence: 'primary' },
  { productionSlug: 'the-revenant-2015', personSlug: 'emmanuel-lubezki', roleSlug: 'director-of-photography',
    sourceSlug: 'ac-lubezki-revenant-2015', confidence: 'primary' },
  { productionSlug: 'gravity-2013', personSlug: 'emmanuel-lubezki', roleSlug: 'director-of-photography',
    sourceSlug: 'ac-lubezki-gravity-2013', confidence: 'primary' },
  { productionSlug: 'dunkirk-2017', personSlug: 'hoyte-van-hoytema', roleSlug: 'director-of-photography',
    sourceSlug: 'ac-hoytema-dunkirk-2017', confidence: 'primary' },
  { productionSlug: 'skyfall-2012', personSlug: 'roger-deakins', roleSlug: 'director-of-photography',
    sourceSlug: 'ac-deakins-skyfall-2012', confidence: 'primary' },
  { productionSlug: 'children-of-men-2006', personSlug: 'emmanuel-lubezki', roleSlug: 'director-of-photography',
    sourceSlug: 'ac-lubezki-children-of-men', confidence: 'primary' },
];

// Equipment_usage attribution — focus on the killer-query anchors
export const usageAttrs: UsageAttr[] = [
  // Dune 2: DNA LF Vintage on the Arrakis Walking Sequence
  { productionSlug: 'dune-part-two-2024', sceneSlug: 'arrakis-walking-sequence',
    seriesSlug: 'arri-rental-dna-lf-vintage', setupLabel: 'A-Cam',
    sourceSlug: 'ac-fraser-dune-2024', confidence: 'primary',
    claimQuote: 'Fraser used the ARRI Rental DNA LF Vintage Primes (Canon K-35 rehouse in LF coverage) on the Arrakis sequence.' },
  { productionSlug: 'dune-part-two-2024', sceneSlug: 'arrakis-walking-sequence',
    seriesSlug: 'arri-rental-dna-lf-vintage', setupLabel: 'A-Cam',
    sourceSlug: 'ymcinema-dna-lf-vintage-2024', confidence: 'secondary' },
  // Dune 2: ALEXA Mini LF body
  { productionSlug: 'dune-part-two-2024', sceneSlug: 'arrakis-walking-sequence',
    seriesSlug: 'arri-alexa-mini-lf-series', setupLabel: 'A-Cam',
    sourceSlug: 'ac-fraser-dune-2024', confidence: 'primary' },
  // The Revenant: ALEXA 65 + Sphero on Glacial Rebirth (Q1 anchor)
  { productionSlug: 'the-revenant-2015', sceneSlug: 'glacial-rebirth',
    seriesSlug: 'arri-alexa-65-series', setupLabel: 'A-Cam',
    sourceSlug: 'ac-lubezki-revenant-2015', confidence: 'primary',
    claimQuote: 'Lubezki used the ARRI ALEXA 65 with Panavision Sphero T-Series anamorphic glass.' },
  { productionSlug: 'the-revenant-2015', sceneSlug: 'glacial-rebirth',
    seriesSlug: 'panavision-sphero-anamorphic', setupLabel: 'A-Cam',
    sourceSlug: 'ac-lubezki-revenant-2015', confidence: 'primary' },
  // Poor Things: SkyPanel on the Lisbon rooftops (Q3 anchor)
  { productionSlug: 'poor-things-2023', sceneSlug: 'lisbon-tile-rooftops',
    seriesSlug: 'arri-skypanel', setupLabel: 'Key',
    sourceSlug: 'ac-ryan-poor-things-2023', confidence: 'primary' },
  // KOTFM: Orbiter on Osage Prairie Dawn (Q3 anchor)
  { productionSlug: 'killers-of-the-flower-moon-2023', sceneSlug: 'osage-prairie-dawn',
    seriesSlug: 'arri-orbiter', setupLabel: 'Key',
    sourceSlug: 'ac-prieto-kotfm-2023', confidence: 'primary' },
  // 1917 Master Anamorphic
  { productionSlug: '1917-2019', sceneSlug: 'trench-to-poppy-field-oner',
    seriesSlug: 'zeiss-master-anamorphic', setupLabel: 'A-Cam',
    sourceSlug: 'ac-deakins-1917-2020', confidence: 'primary' },
  // Oppenheimer ALEXA 65
  { productionSlug: 'oppenheimer-2023', sceneSlug: 'trinity-test',
    seriesSlug: 'arri-alexa-65-series', setupLabel: 'A-Cam',
    sourceSlug: 'ac-hoytema-oppenheimer-2023', confidence: 'primary' },
];

export async function seedAttributions(db: SeedDb) {
  // Production sources
  for (const a of productionAttrs) {
    const [{ id: prodId } = { id: undefined }] = await db.select({ id: productions.id })
      .from(productions).where(eq(productions.slug, a.productionSlug));
    const [{ id: srcId } = { id: undefined }] = await db.select({ id: sources.id })
      .from(sources).where(eq(sources.slug, a.sourceSlug));
    if (!prodId) throw new Error(`unknown production: ${a.productionSlug}`);
    if (!srcId)  throw new Error(`unknown source: ${a.sourceSlug}`);
    await db.insert(productionSources).values({
      productionId: prodId, sourceId: srcId, confidence: a.confidence,
      claimQuote: a.claimQuote ?? null, notes: a.notes ?? null,
    }).onConflictDoUpdate({
      target: [productionSources.productionId, productionSources.sourceId],
      set: { confidence: a.confidence, claimQuote: a.claimQuote ?? null, notes: a.notes ?? null },
    });
  }

  // Scene sources
  for (const a of sceneAttrs) {
    const [{ id: sceneId } = { id: undefined }] = await db.select({ id: scenes.id })
      .from(scenes)
      .innerJoin(productions, eq(scenes.productionId, productions.id))
      .where(and(eq(productions.slug, a.productionSlug), eq(scenes.slug, a.sceneSlug)));
    const [{ id: srcId } = { id: undefined }] = await db.select({ id: sources.id })
      .from(sources).where(eq(sources.slug, a.sourceSlug));
    if (!sceneId) throw new Error(`unknown scene: ${a.productionSlug}/${a.sceneSlug}`);
    if (!srcId)   throw new Error(`unknown source: ${a.sourceSlug}`);
    await db.insert(sceneSources).values({
      sceneId, sourceId: srcId, confidence: a.confidence,
      claimQuote: a.claimQuote ?? null, notes: null,
    }).onConflictDoUpdate({
      target: [sceneSources.sceneId, sceneSources.sourceId],
      set: { confidence: a.confidence, claimQuote: a.claimQuote ?? null },
    });
  }

  // Crew assignment sources
  for (const a of crewAttrs) {
    const [{ id: caId } = { id: undefined }] = await db.select({ id: crewAssignments.id })
      .from(crewAssignments)
      .innerJoin(productions, eq(crewAssignments.productionId, productions.id))
      .innerJoin(people, eq(crewAssignments.personId, people.id))
      .innerJoin(roles, eq(crewAssignments.roleId, roles.id))
      .where(and(
        eq(productions.slug, a.productionSlug),
        eq(people.slug, a.personSlug),
        eq(roles.slug, a.roleSlug),
      ));
    const [{ id: srcId } = { id: undefined }] = await db.select({ id: sources.id })
      .from(sources).where(eq(sources.slug, a.sourceSlug));
    if (!caId) throw new Error(`unknown crew_assignment: ${a.productionSlug}/${a.personSlug}/${a.roleSlug}`);
    if (!srcId) throw new Error(`unknown source: ${a.sourceSlug}`);
    await db.insert(crewAssignmentSources).values({
      crewAssignmentId: caId, sourceId: srcId, confidence: a.confidence,
      claimQuote: a.claimQuote ?? null, notes: null,
    }).onConflictDoUpdate({
      target: [crewAssignmentSources.crewAssignmentId, crewAssignmentSources.sourceId],
      set: { confidence: a.confidence, claimQuote: a.claimQuote ?? null },
    });
  }

  // Equipment usage sources
  for (const a of usageAttrs) {
    // Resolve scene_id for the (production, scene) pair
    const [{ id: sceneId } = { id: undefined }] = await db.select({ id: scenes.id })
      .from(scenes).innerJoin(productions, eq(scenes.productionId, productions.id))
      .where(and(eq(productions.slug, a.productionSlug), eq(scenes.slug, a.sceneSlug)));
    if (!sceneId) throw new Error(`unknown scene: ${a.productionSlug}/${a.sceneSlug}`);
    const [{ id: seriesId } = { id: undefined }] = await db.select({ id: equipmentSeries.id })
      .from(equipmentSeries).where(eq(equipmentSeries.slug, a.seriesSlug));
    if (!seriesId) throw new Error(`unknown series: ${a.seriesSlug}`);
    // Find the matching equipment_usage row
    const usageRows = await db.select({ id: equipmentUsage.id })
      .from(equipmentUsage)
      .where(and(
        eq(equipmentUsage.sceneId, sceneId),
        eq(equipmentUsage.equipmentSeriesId, seriesId),
        a.setupLabel
          ? eq(equipmentUsage.setupLabel, a.setupLabel)
          : sql`${equipmentUsage.setupLabel} IS NULL`,
      ));
    if (usageRows.length === 0) {
      throw new Error(`no equipment_usage match for ${a.productionSlug}/${a.sceneSlug}/${a.seriesSlug}/${a.setupLabel ?? '(no label)'}`);
    }
    const [{ id: srcId } = { id: undefined }] = await db.select({ id: sources.id })
      .from(sources).where(eq(sources.slug, a.sourceSlug));
    if (!srcId) throw new Error(`unknown source: ${a.sourceSlug}`);
    // Attach to every matching usage row (typically one)
    for (const u of usageRows) {
      await db.insert(equipmentUsageSources).values({
        equipmentUsageId: u.id, sourceId: srcId, confidence: a.confidence,
        claimQuote: a.claimQuote ?? null, notes: null,
      }).onConflictDoUpdate({
        target: [equipmentUsageSources.equipmentUsageId, equipmentUsageSources.sourceId],
        set: { confidence: a.confidence, claimQuote: a.claimQuote ?? null },
      });
    }
  }
}
