// Per-item editorial seed: value proposition, typical-use blurb,
// compatibility (mount + camera bodies + adapter notes). Images are
// intentionally left empty in this seed — the schema accepts a
// gallery via the `images` JSONB column, but seeding only happens
// once a verified CC-licensed source URL is on hand.
//
// Summaries are brief original prose synthesizing widely-known
// facts about each piece of gear (mount type, target sensor, working
// context). Compatibility lists are structured facts (mount names,
// body model names) — facts aren't copyrightable.
import { db, sql } from '../src/index.ts';

type Compat = {
  mount?: string;
  compatible_cameras?: string[];
  compatible_lens_mounts?: string[];
  adapter_notes?: string;
};

type ItemSeed = {
  slug: string;
  valueProposition: string;
  description?: string;
  notableUses?: string;
  compatibility: Compat;
};

const ITEMS: ItemSeed[] = [
  // ── Cameras ───────────────────────────────────────────────────────
  {
    slug: 'arri-alexa-mini-lf',
    valueProposition:
      'The default A-camera on most modern tentpoles — a compact full-frame ALEXA body weighing 2.6 kg with the same LogC3 color science as the larger ALEXA LF, in a chassis small enough for handheld and Steadicam.',
    description:
      'The ALEXA Mini LF replaced the Super-35 ALEXA Mini in 2019 with an LPL mount, a 4.5K Open Gate 36.7×25.5 mm sensor, and built-in motorised IRND. The body shares its color science across the full ALEXA family, so a Mini LF unit can intercut with an ALEXA 65 or LF without grading drift.',
    notableUses:
      'Pulled when the production needs a full-frame look but the camera has to fit on a Steadicam, drone gimbal, or in a tight handheld rig. Standard A-camera on Marvel features, Villeneuve films, and most prestige Netflix originals.',
    compatibility: {
      mount: 'LPL',
      compatible_lens_mounts: ['LPL', 'PL (via adapter)', 'EF (via adapter)'],
      adapter_notes: 'PL-to-LPL and EF-to-LPL adapters ship from ARRI; both maintain electronic /i metadata and infinity focus. The LDS-2 protocol on LPL also exposes lens metadata to the body for shading and distortion correction in post.',
    },
  },
  {
    slug: 'arri-alexa-65',
    valueProposition:
      'ARRI Rental\'s flagship 65 mm digital body — a 54.12 × 25.58 mm sensor (open gate) that captures 60% more area than full-frame and roughly twice the area of Super 35. Rental-only.',
    description:
      'The ALEXA 65 was introduced in 2014 as a stitched-sensor large-format body using three ALEV III sensors in tandem. The format is the standard for high-end work that needs more than full-frame can offer — Greig Fraser on Dune and The Batman, Lubezki on The Revenant, Roger Deakins on 1917 second unit.',
    notableUses:
      'The "I want my film to feel bigger" choice. Works well when paired with vintage rehouse glass that produces enough image circle to cover the sensor (Leitz Thalia, Hawk 65, ARRI Rental Prime DNA LF Vintage at the centre).',
    compatibility: {
      mount: 'XPL',
      compatible_lens_mounts: ['XPL (native)', 'PL (via adapter, S35 image circle only)'],
      adapter_notes: 'ARRI Rental supplies the XPL mount exclusively; the body is rental-only and the mount system isn\'t available for purchase. Lenses for the 65 must produce a >55 mm image circle to cover open gate; PL-mount Super-35 glass mounts via adapter but only covers a windowed crop.',
    },
  },
  {
    slug: 'sony-venice-2-body',
    valueProposition:
      'Sony\'s 8K full-frame cinema flagship — dual base ISO (800 / 3200), 8 stops of internal motorised ND, and 16-bit X-OCN recording in a body small enough to fly on a stabiliser.',
    description:
      'The VENICE 2 (2022) replaced the original VENICE with an 8.6K sensor block in a similar chassis. The two base ISOs and the eight-stop internal ND make it the camera of choice for productions that need to alternate between bright daylight exteriors and low-key night interiors without changing filtration.',
    notableUses:
      'Default A-camera for productions that prefer Sony\'s S-Log3/S-Gamut3.Cine over ARRI\'s LogC. Heavy adoption in the Netflix in-house production stack and on Top Gun: Maverick (where a custom VENICE 1 IMAX-Certified mode shipped before VENICE 2).',
    compatibility: {
      mount: 'PL (locking)',
      compatible_lens_mounts: ['PL (native)', 'E-mount (interchangeable mount)', 'LPL (via adapter)'],
      adapter_notes: 'The VENICE / VENICE 2 ships with an interchangeable mount: PL is the cinema default; E-mount enables Sony G Master and third-party stills glass for documentary and B-camera work. ARRI LPL primes mount via adapter with full-frame coverage.',
    },
  },
  {
    slug: 'red-v-raptor-8k',
    valueProposition:
      'RED\'s 8K VistaVision cinema body — an 8192×4320 16:9 active-area sensor in a body that weighs 2 kg and shoots 120 fps at 8K full-frame.',
    description:
      'The V-RAPTOR (2021) ships with a 40.96×21.60 mm VV sensor and the RF mount through Komodo-X compatibility, plus optional PL adapter. The cameras are popular on episodic series that need 8K masters and on commercial production where the small form factor is a meaningful advantage.',
    notableUses:
      'Default RED of the 2020s. Used on James Gunn\'s recent superhero work, the Marvel TV pipeline, and a substantial slice of high-end car commercials.',
    compatibility: {
      mount: 'RF (V-RAPTOR), PL (via adapter)',
      compatible_lens_mounts: ['RF (native)', 'PL (via adapter)', 'EF (via adapter)'],
      adapter_notes: 'The V-RAPTOR ships in RF mount with an optional PL adapter that retains REDLink power and shutter sync. The Komodo-X variant uses RF mount throughout.',
    },
  },

  // ── Cooke S4/i ────────────────────────────────────────────────────
  {
    slug: 'cooke-s4i-32mm-t2',
    valueProposition:
      'The Cooke 32mm — a workhorse normal-wide on Super-35 with the recognisable Cooke skin-tone rendering. T2.0, 110mm front, 1.85kg.',
    notableUses:
      'Pulled for two-shots and three-shots in the 35–50mm normal-perspective range, particularly on dialogue-heavy scenes where the Cooke Look\'s flattering skin-tone rendering matters more than maximum sharpness.',
    compatibility: {
      mount: 'PL',
      compatible_cameras: ['ARRI ALEXA Studio / Plus / XT (S35)', 'ARRI ALEXA Mini', 'RED Helium 8K (S35 mode)', 'Sony VENICE (S35 mode)', 'ARRI ALEXA Mini LF (windowed S35 mode)'],
      adapter_notes: 'PL is the native mount. Covers Super 35 (~31.5 mm image circle) — does not cover full-frame open gate. Body needs to be set to S35 windowed mode when used on full-frame sensors.',
    },
  },
  {
    slug: 'cooke-s4i-50mm-t2',
    valueProposition:
      'The Cooke S4/i normal — a 50mm on Super 35 that\'s arguably the most-used prime in the company\'s catalogue. Same T2.0 / 110mm front / Cooke rendering as the rest of the set.',
    notableUses:
      'The medium-shot and over-the-shoulder default for dialogue. The "if you only carry three primes" middle choice in a 25 / 50 / 75 set.',
    compatibility: {
      mount: 'PL',
      compatible_cameras: ['ARRI ALEXA family (S35 mode)', 'RED Helium 8K', 'Sony VENICE (S35)', 'ALEXA Mini LF (S35 windowed)'],
      adapter_notes: 'Super 35 image circle (~31.5 mm). Mounts on full-frame bodies but the corners vignette outside windowed S35 mode.',
    },
  },

  // ── Cooke S7/i FF+ ────────────────────────────────────────────────
  {
    slug: 'cooke-s7i-32mm-t2',
    valueProposition:
      'The Cooke 32mm in full-frame (FF+) coverage — the 46.31 mm image circle covers the ALEXA Mini LF / 65 (open gate centre crop) and Sony VENICE 8K. Same Cooke rendering as the S4/i, scaled to full-frame.',
    notableUses:
      'Default normal-wide on full-frame productions wanting the Cooke Look — A24 prestige, Apple TV+ originals, recent Marvel features that switched from Super-35 to full-frame mid-cycle.',
    compatibility: {
      mount: 'PL (LPL adapter available)',
      compatible_cameras: ['ARRI ALEXA Mini LF', 'ARRI ALEXA LF', 'ARRI ALEXA 35', 'Sony VENICE / VENICE 2', 'RED Monstro 8K VV', 'RED V-RAPTOR'],
      adapter_notes: 'PL natively, LPL via the Cooke / ARRI adapter without metadata loss. /i Technology metadata exposes T-stop, focus, and zoom position to the body for post-correction.',
    },
  },
  {
    slug: 'cooke-s7i-50mm-t2',
    valueProposition:
      'Cooke S7/i 50mm full-frame normal — the most-used focal length of the FF+ set, identical rendering signature to the S4/i 50mm but covering ALEXA Mini LF and VENICE 2 at full image circle.',
    notableUses:
      'A-camera medium-shot and over-the-shoulder default on full-frame productions. The "ALEXA Mini LF + S7/i" combination is the modern equivalent of "ALEXA Studio + S4/i" from the previous decade.',
    compatibility: {
      mount: 'PL (LPL adapter available)',
      compatible_cameras: ['ARRI ALEXA Mini LF', 'ARRI ALEXA LF', 'ARRI ALEXA 35', 'Sony VENICE / VENICE 2', 'RED Monstro / V-RAPTOR'],
      adapter_notes: 'Native PL mount. LPL adapter from ARRI or Cooke retains /i metadata and infinity focus.',
    },
  },

  // ── Zeiss Master Prime ────────────────────────────────────────────
  {
    slug: 'zeiss-master-prime-32mm',
    valueProposition:
      'Zeiss Master Prime 32mm T1.3 — the technically-flawless Super 35 normal-wide. Co-developed by ARRI and Zeiss with low distortion, low breathing, and even illumination across the frame.',
    notableUses:
      'The "I want zero character" choice. Pulled when the production wants the camera to be invisible — the lens shouldn\'t add anything the cinematographer didn\'t deliberately put there.',
    compatibility: {
      mount: 'PL',
      compatible_cameras: ['ARRI ALEXA family (S35)', 'RED Helium 8K', 'Sony VENICE (S35)', 'ARRI ALEXA Mini LF (S35 windowed)'],
      adapter_notes: 'Super 35 image circle (~32 mm). LDS-1 metadata on PL. Doesn\'t cover full-frame in open gate.',
    },
  },

  // ── Zeiss Supreme Prime ───────────────────────────────────────────
  {
    slug: 'zeiss-supreme-prime-35mm',
    valueProposition:
      'Zeiss Supreme Prime 35mm T1.5 — the same technical neutrality as the Master Primes, scaled to full frame in LPL mount, weight-matched at 1.6 kg with the rest of the set.',
    notableUses:
      'Default 35mm on ALEXA Mini LF / ALEXA 35 productions wanting Master-Prime-grade neutrality at full-frame coverage. The Supreme set is the most consistent-rendering full-frame prime line on the market.',
    compatibility: {
      mount: 'LPL',
      compatible_cameras: ['ARRI ALEXA Mini LF', 'ARRI ALEXA LF', 'ARRI ALEXA 35', 'Sony VENICE / VENICE 2 (with E-to-LPL adapter)', 'RED Monstro / V-RAPTOR (with PL-to-LPL adapter)'],
      adapter_notes: 'Native LPL mount. PL-to-LPL adapter is not directionally possible (the Supreme back-focus is too short). LDS-2 metadata exposes T-stop, focus, and shading data to the body.',
    },
  },

  // ── Atlas Orion ───────────────────────────────────────────────────
  {
    slug: 'atlas-orion-50mm',
    valueProposition:
      'Atlas Orion 50mm anamorphic — Super-35 2× squeeze with characteristic blue horizontal flares and oval bokeh, at a price-point that\'s opened anamorphic shooting to indie and mid-budget productions.',
    notableUses:
      'Default anamorphic on independent features and high-end episodic where Panavision rental cost is prohibitive. The Orion rendering signature sits closer to vintage Panavision G-Series than to Zeiss Master Anamorphic — characterful, not transparent.',
    compatibility: {
      mount: 'PL',
      compatible_cameras: ['ARRI ALEXA family (S35)', 'RED Helium 8K', 'Sony VENICE (S35 mode)', 'ALEXA Mini LF (S35 windowed)'],
      adapter_notes: 'Native PL. Super 35 coverage at 2× squeeze — produces a 2.39:1 final aspect when extracted from a 4-perf S35 frame.',
    },
  },

  // ── ARRI SkyPanel ─────────────────────────────────────────────────
  {
    slug: 'arri-skypanel-s60-c',
    valueProposition:
      'The standard "key for one person" soft LED on cinema sets — full-spectrum tunable from 2,800K to 10,000K plus a complete Rec.709 / Rec.2020 RGB picker, in a 60×30 cm panel that draws ~440 W at full output.',
    description:
      'The S60-C is the mid-range SkyPanel — large enough to wrap a face from 4-6 ft away, small enough to fly on a C-stand or grip head. Built-in CRMX wireless lets it integrate with a console without a DMX cable run, and the colour science matches the rest of the SkyPanel line so a multi-fixture rig stays consistent.',
    notableUses:
      'Pulled for soft key on dialogue interiors, ambient fill on exteriors, and as a colour-tuneable practical wash where a tungsten or HMI rig would be slow to gel and slow to dim.',
    compatibility: {
      compatible_lens_mounts: [],
      adapter_notes: 'Yokes accept C-stand baby pin (16 mm) and junior (28 mm) receivers. Power: 100-240 V AC or 48 V DC. Control via DMX, sACN, Art-Net, CRMX (LumenRadio) wireless, or the on-fixture encoder.',
    },
  },
];

let updated = 0;
let missing = 0;
for (const seed of ITEMS) {
  const r = await db.execute<{ id: number }>(sql`
    UPDATE equipment_items SET
      value_proposition = ${seed.valueProposition},
      ${seed.description ? sql`description = ${seed.description},` : sql``}
      ${seed.notableUses ? sql`notable_uses = ${seed.notableUses},` : sql``}
      compatibility = ${JSON.stringify(seed.compatibility)}::jsonb,
      updated_at = NOW()
    WHERE slug = ${seed.slug}
    RETURNING id
  `);
  if (r.length === 0) {
    console.warn(`  [miss] ${seed.slug}`);
    missing++;
  } else {
    console.log(`  [ok] ${seed.slug}`);
    updated++;
  }
}

console.log(`\nseeded ${updated} items; ${missing} missing`);
process.exit(0);
