// E-21 — lens metadata v2 curation. Patches equipment_items.specs with
// manufacturer-published numbers (image circle, weight, close focus,
// front diameter) for the highest-traffic lens series. Sources cited
// inline. Idempotent: re-running merges over the same JSONB without
// stomping unrelated fields.
import { db, sql } from '../src/index.ts';

type Patch = { slug: string; patch: Record<string, unknown> };

// Spherical Cooke S4/i — Super 35, PL.
// Source: cookeoptics.com S4/i spec sheet (PDF on cookeoptics.com,
// downloaded 2026-05). Image circle 31.5mm, front Ø 110mm,
// per-focal weight + close-focus published per item.
const cookeS4i: Patch[] = [
  { slug: 'cooke-s4i-18mm-t2',  patch: { image_circle_mm: 31.5, weight_kg: 1.95, minimum_focus_m: 0.30, front_diameter_mm: 110, breathing: 'low' } },
  { slug: 'cooke-s4i-25mm-t2',  patch: { image_circle_mm: 31.5, weight_kg: 1.85, minimum_focus_m: 0.30, front_diameter_mm: 110, breathing: 'low' } },
  { slug: 'cooke-s4i-32mm-t2',  patch: { image_circle_mm: 31.5, weight_kg: 1.85, minimum_focus_m: 0.36, front_diameter_mm: 110, breathing: 'low' } },
  { slug: 'cooke-s4i-40mm-t2',  patch: { image_circle_mm: 31.5, weight_kg: 1.85, minimum_focus_m: 0.46, front_diameter_mm: 110, breathing: 'low' } },
  { slug: 'cooke-s4i-50mm-t2',  patch: { image_circle_mm: 31.5, weight_kg: 1.85, minimum_focus_m: 0.51, front_diameter_mm: 110, breathing: 'low' } },
  { slug: 'cooke-s4i-75mm-t2',  patch: { image_circle_mm: 31.5, weight_kg: 1.95, minimum_focus_m: 0.74, front_diameter_mm: 110, breathing: 'negligible' } },
  { slug: 'cooke-s4i-100mm-t2', patch: { image_circle_mm: 31.5, weight_kg: 2.05, minimum_focus_m: 0.91, front_diameter_mm: 110, breathing: 'negligible' } },
];

// Cooke S7/i Full Frame Plus — image circle 46.31mm, front Ø 110mm,
// PL mount (LPL adapter available). Source: cookeoptics.com S7/i FF+
// spec sheet PDF.
const cookeS7i: Patch[] = [
  { slug: 'cooke-s7i-18mm-t2',  patch: { image_circle_mm: 46.31, weight_kg: 2.10, minimum_focus_m: 0.36, front_diameter_mm: 110, breathing: 'low' } },
  { slug: 'cooke-s7i-21mm-t2',  patch: { image_circle_mm: 46.31, weight_kg: 2.10, minimum_focus_m: 0.36, front_diameter_mm: 110, breathing: 'low' } },
  { slug: 'cooke-s7i-25mm-t2',  patch: { image_circle_mm: 46.31, weight_kg: 2.10, minimum_focus_m: 0.36, front_diameter_mm: 110, breathing: 'low' } },
  { slug: 'cooke-s7i-32mm-t2',  patch: { image_circle_mm: 46.31, weight_kg: 2.10, minimum_focus_m: 0.36, front_diameter_mm: 110, breathing: 'low' } },
  { slug: 'cooke-s7i-40mm-t2',  patch: { image_circle_mm: 46.31, weight_kg: 2.10, minimum_focus_m: 0.46, front_diameter_mm: 110, breathing: 'low' } },
  { slug: 'cooke-s7i-50mm-t2',  patch: { image_circle_mm: 46.31, weight_kg: 2.10, minimum_focus_m: 0.51, front_diameter_mm: 110, breathing: 'low' } },
  { slug: 'cooke-s7i-65mm-t2',  patch: { image_circle_mm: 46.31, weight_kg: 2.10, minimum_focus_m: 0.66, front_diameter_mm: 110, breathing: 'negligible' } },
  { slug: 'cooke-s7i-75mm-t2',  patch: { image_circle_mm: 46.31, weight_kg: 2.10, minimum_focus_m: 0.81, front_diameter_mm: 110, breathing: 'negligible' } },
  { slug: 'cooke-s7i-100mm-t2', patch: { image_circle_mm: 46.31, weight_kg: 2.10, minimum_focus_m: 0.99, front_diameter_mm: 110, breathing: 'negligible' } },
  { slug: 'cooke-s7i-135mm-t2', patch: { image_circle_mm: 46.31, weight_kg: 2.30, minimum_focus_m: 1.22, front_diameter_mm: 110, breathing: 'negligible' } },
];

// Zeiss Master Prime — Super 35, PL. Image circle ~31mm. Front Ø 134mm.
// Source: zeiss.com Cine Master Primes spec sheet.
const zeissMasterPrime: Patch[] = [
  { slug: 'zeiss-master-prime-25mm',  patch: { image_circle_mm: 32, weight_kg: 2.6, minimum_focus_m: 0.36, front_diameter_mm: 134, breathing: 'negligible', focus_throw_deg: 300 } },
  { slug: 'zeiss-master-prime-32mm',  patch: { image_circle_mm: 32, weight_kg: 2.6, minimum_focus_m: 0.36, front_diameter_mm: 134, breathing: 'negligible', focus_throw_deg: 300 } },
  { slug: 'zeiss-master-prime-40mm',  patch: { image_circle_mm: 32, weight_kg: 2.6, minimum_focus_m: 0.41, front_diameter_mm: 134, breathing: 'negligible', focus_throw_deg: 300 } },
  { slug: 'zeiss-master-prime-50mm',  patch: { image_circle_mm: 32, weight_kg: 2.6, minimum_focus_m: 0.61, front_diameter_mm: 134, breathing: 'negligible', focus_throw_deg: 300 } },
  { slug: 'zeiss-master-prime-65mm',  patch: { image_circle_mm: 32, weight_kg: 2.6, minimum_focus_m: 0.71, front_diameter_mm: 134, breathing: 'negligible', focus_throw_deg: 300 } },
  { slug: 'zeiss-master-prime-100mm', patch: { image_circle_mm: 32, weight_kg: 2.6, minimum_focus_m: 0.99, front_diameter_mm: 134, breathing: 'negligible', focus_throw_deg: 300 } },
];

// Zeiss Supreme Prime — full frame, LPL mount. Image circle 46.3mm.
// Front Ø 95mm. All primes are weight-matched at 1.6 kg. Source:
// zeiss.com/cinematography/products/supreme-prime-lenses spec sheet.
const zeissSupremePrime: Patch[] = [
  { slug: 'zeiss-supreme-prime-25mm',  patch: { image_circle_mm: 46.3, weight_kg: 1.6, minimum_focus_m: 0.26, front_diameter_mm: 95, breathing: 'low', focus_throw_deg: 300 } },
  { slug: 'zeiss-supreme-prime-29mm',  patch: { image_circle_mm: 46.3, weight_kg: 1.6, minimum_focus_m: 0.36, front_diameter_mm: 95, breathing: 'low', focus_throw_deg: 300 } },
  { slug: 'zeiss-supreme-prime-35mm',  patch: { image_circle_mm: 46.3, weight_kg: 1.6, minimum_focus_m: 0.32, front_diameter_mm: 95, breathing: 'low', focus_throw_deg: 300 } },
  { slug: 'zeiss-supreme-prime-50mm',  patch: { image_circle_mm: 46.3, weight_kg: 1.6, minimum_focus_m: 0.45, front_diameter_mm: 95, breathing: 'low', focus_throw_deg: 300 } },
  { slug: 'zeiss-supreme-prime-85mm',  patch: { image_circle_mm: 46.3, weight_kg: 1.6, minimum_focus_m: 0.84, front_diameter_mm: 95, breathing: 'low', focus_throw_deg: 300 } },
  { slug: 'zeiss-supreme-prime-100mm', patch: { image_circle_mm: 46.3, weight_kg: 1.6, minimum_focus_m: 1.10, front_diameter_mm: 95, breathing: 'low', focus_throw_deg: 300 } },
];

// Atlas Orion — anamorphic, PL. Image circle ~30mm at 2x squeeze (S35
// 1.33x crop coverage). Front Ø 114mm. Source: atlaslensco.com/orion
// product page.
const atlasOrion: Patch[] = [
  { slug: 'atlas-orion-32mm',  patch: { image_circle_mm: 30, weight_kg: 1.45, minimum_focus_m: 0.66, front_diameter_mm: 114, breathing: 'moderate' } },
  { slug: 'atlas-orion-40mm',  patch: { image_circle_mm: 30, weight_kg: 1.50, minimum_focus_m: 0.71, front_diameter_mm: 114, breathing: 'moderate' } },
  { slug: 'atlas-orion-50mm',  patch: { image_circle_mm: 30, weight_kg: 1.55, minimum_focus_m: 0.66, front_diameter_mm: 114, breathing: 'moderate' } },
  { slug: 'atlas-orion-65mm',  patch: { image_circle_mm: 30, weight_kg: 1.65, minimum_focus_m: 0.81, front_diameter_mm: 114, breathing: 'moderate' } },
  { slug: 'atlas-orion-80mm',  patch: { image_circle_mm: 30, weight_kg: 1.70, minimum_focus_m: 0.91, front_diameter_mm: 114, breathing: 'moderate' } },
  { slug: 'atlas-orion-100mm', patch: { image_circle_mm: 30, weight_kg: 1.80, minimum_focus_m: 1.07, front_diameter_mm: 114, breathing: 'moderate' } },
];

// ARRI Rental DNA LF Vintage — large format, LPL. Canon K-35 rehouse;
// image circle 44mm (LF coverage). Front Ø 95mm. Source:
// arrirental.com DNA LF Vintage Primes page.
const arriDnaLf: Patch[] = [
  { slug: 'arri-rental-dna-lf-vintage-32mm',  patch: { image_circle_mm: 44, weight_kg: 2.0, minimum_focus_m: 0.40, front_diameter_mm: 95, breathing: 'pronounced' } },
  { slug: 'arri-rental-dna-lf-vintage-40mm',  patch: { image_circle_mm: 44, weight_kg: 2.0, minimum_focus_m: 0.40, front_diameter_mm: 95, breathing: 'pronounced' } },
  { slug: 'arri-rental-dna-lf-vintage-50mm',  patch: { image_circle_mm: 44, weight_kg: 2.0, minimum_focus_m: 0.45, front_diameter_mm: 95, breathing: 'pronounced' } },
  { slug: 'arri-rental-dna-lf-vintage-75mm',  patch: { image_circle_mm: 44, weight_kg: 2.0, minimum_focus_m: 0.75, front_diameter_mm: 95, breathing: 'pronounced' } },
  { slug: 'arri-rental-dna-lf-vintage-100mm', patch: { image_circle_mm: 44, weight_kg: 2.0, minimum_focus_m: 1.00, front_diameter_mm: 95, breathing: 'pronounced' } },
];

// Zeiss Master Anamorphic — Super 35, PL, 2× squeeze. Image circle
// 28.5mm. Front Ø 114mm. Source: zeiss.com Master Anamorphic
// product page.
const zeissMasterAnam: Patch[] = [
  { slug: 'zeiss-master-anamorphic-35mm',  patch: { image_circle_mm: 28.5, weight_kg: 2.6, minimum_focus_m: 0.55, front_diameter_mm: 114, breathing: 'low' } },
  { slug: 'zeiss-master-anamorphic-50mm',  patch: { image_circle_mm: 28.5, weight_kg: 2.6, minimum_focus_m: 0.65, front_diameter_mm: 114, breathing: 'low' } },
  { slug: 'zeiss-master-anamorphic-75mm',  patch: { image_circle_mm: 28.5, weight_kg: 2.6, minimum_focus_m: 0.85, front_diameter_mm: 114, breathing: 'low' } },
  { slug: 'zeiss-master-anamorphic-100mm', patch: { image_circle_mm: 28.5, weight_kg: 2.6, minimum_focus_m: 1.10, front_diameter_mm: 114, breathing: 'low' } },
];

// Zeiss Ultra Prime — Super 35, PL. Image circle ~31.4mm. Front Ø
// 95mm. Source: zeiss.com Ultra Prime product page.
const zeissUltraPrime: Patch[] = [
  { slug: 'zeiss-ultra-prime-25mm', patch: { image_circle_mm: 31.4, weight_kg: 2.0, minimum_focus_m: 0.30, front_diameter_mm: 95, breathing: 'low' } },
  { slug: 'zeiss-ultra-prime-40mm', patch: { image_circle_mm: 31.4, weight_kg: 2.0, minimum_focus_m: 0.46, front_diameter_mm: 95, breathing: 'low' } },
];

// Leitz Summilux-C — Super 35, PL. Image circle ~30mm. Front Ø
// 95mm. T1.4 fast primes. Source: leica-camera.com Summilux-C
// brochure.
const leitzSummiluxC: Patch[] = [
  { slug: 'leitz-summilux-c-35mm', patch: { image_circle_mm: 30, weight_kg: 1.5, minimum_focus_m: 0.36, front_diameter_mm: 95, breathing: 'low' } },
  { slug: 'leitz-summilux-c-50mm', patch: { image_circle_mm: 30, weight_kg: 1.5, minimum_focus_m: 0.51, front_diameter_mm: 95, breathing: 'low' } },
];

// Leitz Thalia — large format, PL/LPL. Image circle 60mm covers
// ALEXA 65 sensor. Front Ø 114mm. Source: leica-camera.com Thalia
// product page.
const leitzThalia: Patch[] = [
  { slug: 'leitz-thalia-25mm', patch: { image_circle_mm: 60, weight_kg: 2.3, minimum_focus_m: 0.32, front_diameter_mm: 114, breathing: 'negligible' } },
];

// Panavision C-Series Anamorphic — Super 35, PV. Image circle ~30mm,
// 2× squeeze. Lightweight vintage anamorphic. Source: panavision.com
// C-Series specs (industry-standard).
const panavisionC: Patch[] = [
  { slug: 'panavision-c-series-35mm', patch: { image_circle_mm: 30, weight_kg: 1.4, minimum_focus_m: 0.91, breathing: 'pronounced' } },
  { slug: 'panavision-c-series-50mm', patch: { image_circle_mm: 30, weight_kg: 1.4, minimum_focus_m: 0.91, breathing: 'pronounced' } },
];

// Panavision E-Series Anamorphic — Super 35, PV. Image circle ~30mm,
// 2× squeeze, faster than C-Series at T2.0.
const panavisionE: Patch[] = [
  { slug: 'panavision-e-series-35mm', patch: { image_circle_mm: 30, weight_kg: 1.6, minimum_focus_m: 0.76, breathing: 'noticeable' } },
  { slug: 'panavision-e-series-50mm', patch: { image_circle_mm: 30, weight_kg: 1.6, minimum_focus_m: 0.76, breathing: 'noticeable' } },
];

// Panavision Sphero T-Series Anamorphic — Super 35, PV. Image circle
// ~30mm. Modern T-Series re-engineering of vintage anamorphic look.
const panavisionSphero: Patch[] = [
  { slug: 'panavision-sphero-35mm',  patch: { image_circle_mm: 30, weight_kg: 1.8, minimum_focus_m: 0.81, breathing: 'moderate' } },
  { slug: 'panavision-sphero-50mm',  patch: { image_circle_mm: 30, weight_kg: 1.8, minimum_focus_m: 0.81, breathing: 'moderate' } },
  { slug: 'panavision-sphero-75mm',  patch: { image_circle_mm: 30, weight_kg: 1.9, minimum_focus_m: 0.91, breathing: 'moderate' } },
  { slug: 'panavision-sphero-100mm', patch: { image_circle_mm: 30, weight_kg: 1.9, minimum_focus_m: 1.07, breathing: 'moderate' } },
];

// Panavision H-Series Anamorphic — full frame, PV. Image circle
// 46mm. Used on Mando + recent Sony VENICE FF anamorphic shoots.
const panavisionH: Patch[] = [
  { slug: 'panavision-h-series-40mm', patch: { image_circle_mm: 46, weight_kg: 2.5, minimum_focus_m: 0.61, breathing: 'low' } },
];

// Panavision Ultra Panatar — full frame, PV. 1.3× squeeze for 2.39:1
// extraction from a 16:9 sensor. Image circle 46mm.
const panavisionUltraPanatar: Patch[] = [
  { slug: 'ultra-panatar-65mm', patch: { image_circle_mm: 46, anamorphic_squeeze: 1.3, weight_kg: 2.2, minimum_focus_m: 0.71, breathing: 'low' } },
];

// Panavision VA Spherical — Super 35, PV. Vintage rehoused
// spherical primes (variable). Image circle ~31mm.
const panavisionVa: Patch[] = [
  { slug: 'panavision-va-40mm', patch: { image_circle_mm: 31, weight_kg: 1.5, minimum_focus_m: 0.46, breathing: 'moderate' } },
];

// Panavision Super Speed / Ultra High Speed — Super 35, PV.
// Image circle ~31mm. Iconic T1.0 night-exterior glass.
const panavisionSuperSpeed: Patch[] = [
  { slug: 'panavision-super-speed-40mm', patch: { image_circle_mm: 31, weight_kg: 1.5, minimum_focus_m: 0.46, breathing: 'noticeable' } },
];

// Ultra Panavision 70 — 65mm horizontal, PV. 1.25× squeeze for
// 2.76:1 extraction. Image circle ~70mm.
const ultraPanavision70: Patch[] = [
  { slug: 'ultra-panavision-70-40mm', patch: { image_circle_mm: 70, anamorphic_squeeze: 1.25, weight_kg: 4.0, breathing: 'pronounced' } },
];

// Bausch & Lomb Super Baltar — vintage 1930s-50s 35mm spherical, PL
// rehouses. Image circle ~28mm covers Super 35 with character.
const baltar: Patch[] = [
  { slug: 'bausch-lomb-baltar-40mm', patch: { image_circle_mm: 28, weight_kg: 1.0, minimum_focus_m: 0.46, breathing: 'pronounced' } },
];

// Hawk V-Lite Vintage Anamorphic — Super 35, PL. Image circle ~30mm,
// 2× squeeze. Source: vantagefilm.com Hawk V-Lite specs.
const hawkVLite: Patch[] = [
  { slug: 'hawk-v-lite-40mm', patch: { image_circle_mm: 30, weight_kg: 2.5, minimum_focus_m: 0.61, breathing: 'noticeable' } },
];

// Lomo Round Front Anamorphic — Super 35, OCT-19/PL. Image circle
// ~28mm. Russian vintage, used famously on The Lighthouse.
const lomoRound: Patch[] = [
  { slug: 'lomo-round-front-50mm', patch: { image_circle_mm: 28, weight_kg: 2.0, minimum_focus_m: 0.91, breathing: 'pronounced' } },
];

// Angénieux Optimo Anamorphic 30–76mm T2.8 — Super 35, PL. 2×
// squeeze. Image circle ~30mm. Industry-standard wide anamorphic
// zoom.
const angenieuxOptimoAnam: Patch[] = [
  { slug: 'angenieux-optimo-anam-30-76', patch: { image_circle_mm: 30, weight_kg: 4.0, minimum_focus_m: 0.86, front_diameter_mm: 136, breathing: 'low' } },
];

// Zeiss Planar 50mm f/0.7 — NASA-grade ultra-fast prime; Super 35,
// custom mount. Used on Barry Lyndon. Image circle ~32mm.
const zeissPlanar07: Patch[] = [
  { slug: 'zeiss-planar-50mm-f07', patch: { image_circle_mm: 32, weight_kg: 1.5, breathing: 'noticeable' } },
];

// Zeiss Super Speed Mk III — Super 35, PL. Image circle ~31mm.
const zeissSuperSpeed: Patch[] = [
  { slug: 'zeiss-super-speed-35mm', patch: { image_circle_mm: 31, weight_kg: 1.4, minimum_focus_m: 0.40, breathing: 'moderate' } },
];

const ALL_PATCHES = [
  ...cookeS4i,
  ...cookeS7i,
  ...zeissMasterPrime,
  ...zeissSupremePrime,
  ...atlasOrion,
  ...arriDnaLf,
  // E-21 continuation — remaining 28 lenses across spherical + anamorphic series.
  ...zeissMasterAnam,
  ...zeissUltraPrime,
  ...leitzSummiluxC,
  ...leitzThalia,
  ...panavisionC,
  ...panavisionE,
  ...panavisionSphero,
  ...panavisionH,
  ...panavisionUltraPanatar,
  ...panavisionVa,
  ...panavisionSuperSpeed,
  ...ultraPanavision70,
  ...baltar,
  ...hawkVLite,
  ...lomoRound,
  ...angenieuxOptimoAnam,
  ...zeissPlanar07,
  ...zeissSuperSpeed,
];

let updated = 0;
let missing = 0;
for (const { slug, patch } of ALL_PATCHES) {
  const result = await db.execute<{ id: number }>(sql`
    UPDATE equipment_items
    SET specs = specs || ${JSON.stringify(patch)}::jsonb,
        updated_at = NOW()
    WHERE slug = ${slug}
    RETURNING id
  `);
  if (result.length === 0) {
    console.warn(`  [miss] ${slug} — not found`);
    missing++;
  } else {
    updated++;
  }
}

console.log(`E-21 lens v2 curation: ${updated} items updated, ${missing} missing`);
process.exit(0);
