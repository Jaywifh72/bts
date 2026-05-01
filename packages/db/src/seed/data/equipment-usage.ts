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

  // ===================================================================
  // CLASSIC ERA
  // ===================================================================

  // Lawrence of Arabia — Panavision System 65 camera, spherical 65mm
  { productionSlug: 'lawrence-of-arabia-1962', sceneSlug: 'desert-mirage',
    seriesSlug: 'panavision-system-65', itemSlug: 'panavision-system-65-studio',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'freddie-young', crewRoleSlug: 'director-of-photography',
    notes: 'Super Panavision 70 (65mm spherical) for the iconic desert establishing shots.' },

  // The Godfather — Panavision C-Series anamorphic (period-accurate late 60s/early 70s lenses)
  { productionSlug: 'the-godfather-1972', sceneSlug: 'godfather-wedding',
    seriesSlug: 'panavision-c-series', itemSlug: 'panavision-c-series-50mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    notes: 'Gordon Willis used Panavision C-series anamorphic; deliberately underexposed for shadow-heavy look.' },

  // Barry Lyndon — Zeiss f/0.7 NASA lens for candlelit interiors
  { productionSlug: 'barry-lyndon-1975', sceneSlug: 'candlelit-dinner',
    seriesSlug: 'zeiss-planar-f07', itemSlug: 'zeiss-planar-50mm-f07',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    crewPersonSlug: 'john-alcott', crewRoleSlug: 'director-of-photography',
    notes: 'The NASA-developed Zeiss f/0.7 50mm, modified by Ed DiGiulio, enabled shooting exclusively by candlelight at ISO 100 equivalent.' },

  // Apocalypse Now — Panavision E-Series anamorphic on 35mm
  { productionSlug: 'apocalypse-now-1979', sceneSlug: 'helicopter-attack',
    seriesSlug: 'panavision-e-series', itemSlug: 'panavision-e-series-35mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    crewPersonSlug: 'vittorio-storaro', crewRoleSlug: 'director-of-photography',
    notes: 'Storaro used Panavision anamorphic throughout the Philippines shoot for the full-frame horizontal sweep.' },
  { productionSlug: 'apocalypse-now-1979', sceneSlug: 'kurtz-compound',
    seriesSlug: 'panavision-e-series', itemSlug: 'panavision-e-series-50mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    crewPersonSlug: 'vittorio-storaro', crewRoleSlug: 'director-of-photography',
    notes: 'The extreme darkness of the Kurtz compound pushed Storaro to expose for selective pools of practical light — a landmark use of shadow as compositional element.' },

  // Days of Heaven — Panavision VA spherical (Nestor Almendros shot magic-hour)
  { productionSlug: 'days-of-heaven-1978', sceneSlug: 'wheat-fire-magic-hour',
    seriesSlug: 'panavision-va', itemSlug: 'panavision-va-40mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    crewPersonSlug: 'nestor-almendros', crewRoleSlug: 'director-of-photography',
    notes: 'Almendros and replacement DP Haskell Wexler shot only during magic hour — roughly 20 minutes per day — for weeks to achieve the film\'s luminous quality.' },

  // Blade Runner 1982 — Panavision H-Series or C-Series anamorphic
  { productionSlug: 'blade-runner-1982', sceneSlug: 'spinner-city-night',
    seriesSlug: 'panavision-h-series', itemSlug: 'panavision-h-series-40mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    crewPersonSlug: 'jordan-cronenweth', crewRoleSlug: 'director-of-photography',
    notes: 'Cronenweth used Panavision anamorphic lenses to capture the rain-slick streets; the anamorphic oval bokeh became iconic in neo-noir cinematography.' },
  { productionSlug: 'blade-runner-1982', sceneSlug: 'roy-batty-rooftop',
    seriesSlug: 'panavision-h-series', itemSlug: 'panavision-h-series-40mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    crewPersonSlug: 'jordan-cronenweth', crewRoleSlug: 'director-of-photography',
    notes: '"Tears in Rain" — shot in the diffused sodium vapor practical light of the rooftop set.' },

  // Schindler's List — Mitchell BNCR (35mm B&W with Nikon primes)
  { productionSlug: 'schindlers-list-1993', sceneSlug: 'liquidation-ghetto',
    seriesSlug: 'mitchell-bncr', itemSlug: 'mitchell-bncr-body',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'janusz-kaminski', crewRoleSlug: 'director-of-photography',
    notes: 'Kamiński used 35mm B&W throughout, pre-flashing negative for softer tones. The handheld documentary aesthetic was achieved partly with newsreel-style zooms.' },
  { productionSlug: 'schindlers-list-1993', sceneSlug: 'girl-in-red-coat',
    seriesSlug: 'mitchell-bncr', itemSlug: 'mitchell-bncr-body',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    notes: 'The girl in the red coat — the only sustained use of color in the film — was achieved via optical color correction in post on a B&W negative frame.' },

  // ===================================================================
  // 2000s
  // ===================================================================

  // Collateral — Sony HDW-F900 digital video
  { productionSlug: 'collateral-2004', sceneSlug: 'nighttime-la-drive',
    seriesSlug: 'sony-hdw-f900', itemSlug: 'sony-hdw-f900-body',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'dion-beebe', crewRoleSlug: 'director-of-photography',
    notes: 'Mann and Beebe chose the Sony HDW-F900 HD video for its ability to see detail in extreme Los Angeles night — the sensor rendered the city\'s sodium-vapor ambient light as a painterly orange glow impossible on film.' },
  { productionSlug: 'collateral-2004', sceneSlug: 'jazz-club-encounter',
    seriesSlug: 'sony-hdw-f900', itemSlug: 'sony-hdw-f900-body',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    notes: 'Selected interior sequences were shot on Kodak 35mm for contrast — a dual-format approach that differentiated the subjective emotional register from documentary-style street work.' },

  // No Country for Old Men — Panavision Primo spherical
  { productionSlug: 'no-country-for-old-men-2007', sceneSlug: 'desert-pursuit',
    seriesSlug: 'panavision-primo', setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    crewPersonSlug: 'roger-deakins', crewRoleSlug: 'director-of-photography',
    notes: 'Deakins used Panavision Primo spherical lenses with a 2.40:1 anamorphic-equivalent frame for the West Texas locations. The flat, sun-bleached palette was achieved through careful filtration rather than post manipulation.' },
  { productionSlug: 'no-country-for-old-men-2007', sceneSlug: 'hotel-room-showdown',
    seriesSlug: 'panavision-primo', setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    notes: 'The hotel room scenes relied on practical tungsten sources left visibly in frame — Deakins avoided additional fill to maintain the suffocating tension of available light.' },

  // There Will Be Blood — Panavision anamorphic (C-Series / T-Series)
  { productionSlug: 'there-will-be-blood-2007', sceneSlug: 'plainview-oil-fire',
    seriesSlug: 'panavision-t-series', setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    crewPersonSlug: 'robert-elswit', crewRoleSlug: 'director-of-photography',
    notes: 'Elswit and PTA shot anamorphic on Panavision cameras; the night fire sequence was lit only by the actual burning oil derrick and orange gels.' },
  { productionSlug: 'there-will-be-blood-2007', sceneSlug: 'i-drink-your-milkshake',
    seriesSlug: 'panavision-t-series', setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    notes: 'Elswit used wider anamorphic lenses (40–50mm range) for the intimate bowling alley confrontation, letting the curved ceiling become a claustrophobic frame element.' },

  // The Dark Knight — IMAX 65mm + Panavision 35mm
  { productionSlug: 'the-dark-knight-2008', sceneSlug: 'bank-heist-opening',
    seriesSlug: 'imax-film-camera', itemSlug: 'imax-msm-9802',
    setupLabel: 'IMAX-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'wally-pfister', crewRoleSlug: 'director-of-photography',
    notes: 'The bank heist was shot entirely on IMAX 65mm film, the first action sequence in a mainstream studio film to use IMAX cameras for an extended interior sequence.' },
  { productionSlug: 'the-dark-knight-2008', sceneSlug: 'chicago-truck-flip',
    seriesSlug: 'panavision-millennium-xl', itemSlug: 'panavision-millennium-xl2',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'wally-pfister', crewRoleSlug: 'director-of-photography',
    notes: 'The 18-wheeler flip on LaSalle Street was shot on Panavision Millennium XL2 35mm with multiple camera positions; the stunt was performed practically in one take.' },

  // ===================================================================
  // 2010s
  // ===================================================================

  // Inception — IMAX 65mm for dream sequences
  { productionSlug: 'inception-2010', sceneSlug: 'paris-fold',
    seriesSlug: 'panavision-millennium-xl', itemSlug: 'panavision-millennium-xl2',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'wally-pfister', crewRoleSlug: 'director-of-photography',
    notes: 'The Paris dream-fold sequence was shot on Panavision anamorphic 35mm on location in Paris; the fold was a practical in-camera effect using specially built set sections.' },
  { productionSlug: 'inception-2010', sceneSlug: 'zero-gravity-hotel',
    seriesSlug: 'panavision-millennium-xl', itemSlug: 'panavision-millennium-xl2',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    notes: 'The rotating hotel corridor was a fully practical rotating set built at Cardington Studios; cameras mounted on the set rotated with it, with no CG enhancement to the rotation.' },

  // The Social Network — RED One MX
  { productionSlug: 'the-social-network-2010', sceneSlug: 'deposition-opening',
    seriesSlug: 'red-camera-family', itemSlug: 'red-one-mx',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'jeff-cronenweth', crewRoleSlug: 'director-of-photography',
    notes: 'Cronenweth and Fincher used the RED One MX throughout; the resolution and latitude allowed the desaturated institutional palette to be achieved entirely in color science without significant grain.' },
  { productionSlug: 'the-social-network-2010', sceneSlug: 'henley-regatta',
    seriesSlug: 'red-camera-family', itemSlug: 'red-one-mx',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    notes: 'The Henley Regatta sequence — shot at the actual regatta — used extreme telephoto compression on the RED One to create the bleached, slow-motion aesthetic emphasizing the twins\' physical power.' },

  // Birdman — ALEXA M + Cooke S4/i
  { productionSlug: 'birdman-2014', sceneSlug: 'theatre-one-take',
    seriesSlug: 'arri-alexa-family', itemSlug: 'arri-alexa-m',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'emmanuel-lubezki', crewRoleSlug: 'director-of-photography',
    notes: 'The entire film was designed to appear as a single take. Lubezki and Iñárritu used the compact ALEXA M body because it could be operated by a single person through the narrow St. James Theatre corridors.' },
  { productionSlug: 'birdman-2014', sceneSlug: 'theatre-one-take',
    seriesSlug: 'cooke-s4i', itemSlug: 'cooke-s4i-32mm-t2',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    notes: 'Cooke S4/i primes chosen for consistent color science across the long continuous takes; focal lengths were planned to allow smooth transitions through doors and tight spaces.' },

  // Ex Machina — ALEXA + Zeiss Ultra Prime
  { productionSlug: 'ex-machina-2014', sceneSlug: 'ava-first-reveal',
    seriesSlug: 'arri-alexa-family', itemSlug: 'arri-alexa-mini',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'rob-hardy', crewRoleSlug: 'director-of-photography',
    notes: 'The ALEXA\'s clean sensor was critical for the VFX compositing work on Ava — her visible internal mechanisms required pristine background plates with no film grain to composite accurately.' },
  { productionSlug: 'ex-machina-2014', sceneSlug: 'ava-first-reveal',
    seriesSlug: 'zeiss-ultra-prime', itemSlug: 'zeiss-ultra-prime-40mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens' },

  // Carol — ARRI 416 Super 16mm
  { productionSlug: 'carol-2015', sceneSlug: 'toy-department-meeting',
    seriesSlug: 'arri-416', itemSlug: 'arri-416-body',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'ed-lachman', crewRoleSlug: 'director-of-photography',
    notes: 'Lachman shot on Super 16mm and blew up to 35mm, a deliberate choice to evoke the photographic texture of 1950s Kodak color films. The 16mm grain became an expressive element — imprecise and memory-like.' },
  { productionSlug: 'carol-2015', sceneSlug: 'road-trip-hotel',
    seriesSlug: 'arri-416', itemSlug: 'arri-416-body',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    notes: 'Many hotel room and car scenes were shot through windows or reflective surfaces — Lachman used the optical imperfection of shooting through glass as a voyeuristic distancing device.' },

  // Son of Saul — 35mm (ARRICAM LT)
  { productionSlug: 'son-of-saul-2015', sceneSlug: 'sonderkommando-work',
    seriesSlug: 'arricam-lt-st', itemSlug: 'arricam-lt',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'matyas-erdely', crewRoleSlug: 'director-of-photography',
    notes: 'Erdély kept the camera at shoulder height, close behind Saul\'s head throughout. The shallow depth of field (around T1.3) kept the Holocaust horror in soft, impressionistic focus behind him — by design, never allowing the viewer to see it clearly.' },

  // Moonlight — ALEXA Mini
  { productionSlug: 'moonlight-2016', sceneSlug: 'beach-swimming-lesson',
    seriesSlug: 'arri-alexa-family', itemSlug: 'arri-alexa-mini',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'james-laxton', crewRoleSlug: 'director-of-photography',
    notes: 'Laxton and Jenkins used the ALEXA Mini\'s handheld capability for the immersive, close-to-body beach scenes. The ocean sequences used circular tracking moves that became the film\'s visual motif.' },
  { productionSlug: 'moonlight-2016', sceneSlug: 'diner-reunion',
    seriesSlug: 'arri-alexa-family', itemSlug: 'arri-alexa-mini',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    notes: 'The diner reunion scene\'s specific blue-gray light palette was achieved with Laxton\'s gel work on fluorescent practicals, evoking the color world of the third act.' },

  // La La Land — Panavision Millennium XL2 + Panavision anamorphic
  { productionSlug: 'la-la-land-2016', sceneSlug: 'griffith-observatory-dance',
    seriesSlug: 'panavision-millennium-xl', itemSlug: 'panavision-millennium-xl2',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'linus-sandgren', crewRoleSlug: 'director-of-photography',
    notes: 'Sandgren used Panavision Millennium XL2 35mm film with anamorphic lenses throughout. The Griffith Observatory dance was shot on a single long lens with a craned move, the flares and oval bokeh of anamorphic glass central to the romantic magic-hour look.' },
  { productionSlug: 'la-la-land-2016', sceneSlug: 'freeway-opening',
    seriesSlug: 'panavision-millennium-xl', itemSlug: 'panavision-millennium-xl2',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    notes: 'The freeway opening one-take number was filmed over two days at dawn on the I-105 freeway shutdown. Sandgren used saturated primary-color lighting gels on the cars to create a painterly composition at the 2.55:1 CinemaScope ratio.' },

  // Arrival — ALEXA + Zeiss Master Anamorphic
  { productionSlug: 'arrival-2016', sceneSlug: 'heptapod-first-contact',
    seriesSlug: 'arri-alexa-family', itemSlug: 'arri-alexa-mini',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'bradford-young', crewRoleSlug: 'director-of-photography',
    notes: 'Bradford Young kept the visual palette deliberately desaturated and haze-heavy to suggest the thin line between the present and past. The interior of the shell was a practical set lit only from the glowing floor.' },
  { productionSlug: 'arrival-2016', sceneSlug: 'heptapod-first-contact',
    seriesSlug: 'zeiss-master-anamorphic', itemSlug: 'zeiss-master-anamorphic-35mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens' },

  // Cold War — ARRICAM LT 35mm B&W
  { productionSlug: 'cold-war-2018', sceneSlug: 'polish-folk-concert',
    seriesSlug: 'arricam-lt-st', itemSlug: 'arricam-lt',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'lukasz-zal', crewRoleSlug: 'director-of-photography',
    notes: 'Żal shot on 35mm B&W in a 1.37 Academy ratio, referencing European art cinema of the 1950s–60s. The concert staging scenes used hard frontal light to create the high-contrast graphic quality of newsreel photography.' },
  { productionSlug: 'cold-war-2018', sceneSlug: 'paris-jazz-club',
    seriesSlug: 'arricam-lt-st', itemSlug: 'arricam-lt',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    notes: 'In the Paris sequences, Żal shifted to a slightly more diffuse lighting approach, evoking the Left Bank photography of Henri Cartier-Bresson — looser framing, available-light sources from neon signs and practical lamps.' },

  // First Man — ARRI 416 Super 16mm + IMAX 65mm
  { productionSlug: 'first-man-2018', sceneSlug: 'x15-test-flight',
    seriesSlug: 'arri-416', itemSlug: 'arri-416-body',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'linus-sandgren', crewRoleSlug: 'director-of-photography',
    notes: 'All Earth-based and home sequences were shot on Super 16mm to create the intimate, domestic texture Chazelle wanted — deliberately imprecise and human-scale in contrast to the precision of the mission footage.' },
  { productionSlug: 'first-man-2018', sceneSlug: 'lunar-landing',
    seriesSlug: 'imax-film-camera', itemSlug: 'imax-msm-9802',
    setupLabel: 'IMAX-Cam', usageRole: 'a_cam',
    notes: 'The Moon surface was the sole use of IMAX 65mm — the shift from Super 16mm to IMAX for the Moon sequences created a radical resolution and scale jump that Sandgren and Chazelle used to represent transcendence from the intimate to the cosmic.' },

  // The Favourite — 35mm ARRICAM
  { productionSlug: 'the-favourite-2018', sceneSlug: 'queen-duck-races',
    seriesSlug: 'arricam-lt-st', itemSlug: 'arricam-lt',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'robbie-ryan', crewRoleSlug: 'director-of-photography',
    notes: 'Robbie Ryan used wide-angle Canon K-35 and fisheye lenses with ARRICAM bodies on 35mm. The fisheye distortion — particularly at room corners — was intentional: Lanthimos uses the curved perspective to suggest an unstable, paranoid court world.' },

  // Midsommar — ALEXA Mini + Cooke S4/i
  { productionSlug: 'midsommar-2019', sceneSlug: 'maypole-dance',
    seriesSlug: 'arri-alexa-family', itemSlug: 'arri-alexa-mini',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'pawel-pogorzelski', crewRoleSlug: 'director-of-photography',
    notes: 'Pogorzelski and Aster shot the entire Swedish sequences in near-constant natural daylight. The uncanny brightness — never resorting to darkness for horror cues — was achieved without diffusion, embracing the harsh Nordic sun as a disorienting force.' },
  { productionSlug: 'midsommar-2019', sceneSlug: 'ättestupa-cliff',
    seriesSlug: 'cooke-s4i', itemSlug: 'cooke-s4i-32mm-t2',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    notes: 'Cooke S4/i primes chosen for their clinical sharpness in the broad daylight — the "organic" warmth of Cooke glass was deliberately used unfiltered to make the horror feel mundane and sunlit.' },

  // Once Upon a Time in Hollywood — Panavision 35mm anamorphic
  { productionSlug: 'once-upon-a-time-in-hollywood-2019', sceneSlug: 'sunset-strip-cruise',
    seriesSlug: 'panavision-millennium-xl', itemSlug: 'panavision-millennium-xl2',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'robert-richardson', crewRoleSlug: 'director-of-photography',
    notes: 'Richardson shot on Panavision 35mm anamorphic to match the visual grammar of late-1960s Hollywood studio films. Kodak reversal stocks were incorporated for the production-within-film sequences to evoke period television stock.' },

  // Portrait of a Lady on Fire — ALEXA Mini LF
  { productionSlug: 'portrait-of-a-lady-on-fire-2019', sceneSlug: 'bonfire-cliffs',
    seriesSlug: 'arri-alexa-mini-lf-series', itemSlug: 'arri-alexa-mini-lf',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'claire-mathon', crewRoleSlug: 'director-of-photography',
    notes: 'Claire Mathon shot in the 1.37 Academy ratio on the Mini LF to evoke 18th-century oil painting compositions. The bonfire night sequence — shot on natural fire and no supplemental lighting — is a technical feat of exposure control.' },
  { productionSlug: 'portrait-of-a-lady-on-fire-2019', sceneSlug: 'portrait-session',
    seriesSlug: 'arri-alexa-mini-lf-series', itemSlug: 'arri-alexa-mini-lf',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    notes: 'Interior daylight from windows was the sole light source for the portrait sessions — Mathon refused artificial lighting throughout, achieving the diffuse quality of Vermeer-style north light.' },

  // The Lighthouse — ARRICAM LT 35mm B&W (1.19:1)
  { productionSlug: 'the-lighthouse-2019', sceneSlug: 'storm-confrontation',
    seriesSlug: 'arricam-lt-st', itemSlug: 'arricam-lt',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'jarin-blaschke', crewRoleSlug: 'director-of-photography',
    notes: 'Blaschke and Eggers shot on Kodak Double-X 5222 B&W 35mm in a 1.19:1 ratio matching 1900s orthochromatic photography. Filming in Nova Scotia\'s harsh weather, Blaschke embraced the actual storm conditions rather than simulating them.' },
  { productionSlug: 'the-lighthouse-2019', sceneSlug: 'lighthouse-interior-night',
    seriesSlug: 'zeiss-super-speed', itemSlug: 'zeiss-super-speed-35mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    notes: 'The lighthouse interiors were lit entirely by practical lanterns and fire; Zeiss Super Speed lenses rated at T1.3 allowed shooting in this minimal practical light without noise or supplemental sources.' },

  // Joker — ALEXA LF + Cooke S4/i
  { productionSlug: 'joker-2019', sceneSlug: 'subway-vigilante',
    seriesSlug: 'arri-alexa-family', itemSlug: 'arri-alexa-lf',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'lawrence-sher', crewRoleSlug: 'director-of-photography',
    notes: 'Sher used the ALEXA LF for its large-format rendering of New York\'s subway — the warmer skin tones against the cold institutional fluorescents created the film\'s characteristic yellow-green palette.' },
  { productionSlug: 'joker-2019', sceneSlug: 'stairs-dance',
    seriesSlug: 'arri-alexa-family', itemSlug: 'arri-alexa-lf',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    notes: 'The Bronx staircase dance was shot in natural afternoon sun — the saturated red costume against the decaying urban environment was a rare un-graded shot in an otherwise heavily graded film.' },

  // Marriage Story — 35mm ARRICAM
  { productionSlug: 'marriage-story-2019', sceneSlug: 'apartment-argument',
    seriesSlug: 'arricam-lt-st', itemSlug: 'arricam-lt',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'robbie-ryan', crewRoleSlug: 'director-of-photography',
    notes: 'Robbie Ryan and Baumbach shot the argument scene on 35mm film in a single set-up per actor, long takes without cutting — the emotional escalation was performance-led, the camera observational rather than editorial.' },

  // ===================================================================
  // 2020–2024
  // ===================================================================

  // Mank — ALEXA LF + Leitz Summilux-C
  { productionSlug: 'mank-2020', sceneSlug: 'san-simeon-party',
    seriesSlug: 'arri-alexa-family', itemSlug: 'arri-alexa-lf',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'erik-messerschmidt', crewRoleSlug: 'director-of-photography',
    notes: 'Messerschmidt and Fincher shot on ALEXA LF with Leitz Summilux-C lenses, then graded to B&W. The combination produced tonal gradations replicating 1940s orthochromatic nitrate prints.' },
  { productionSlug: 'mank-2020', sceneSlug: 'san-simeon-party',
    seriesSlug: 'leitz-summilux-c', itemSlug: 'leitz-summilux-c-35mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    notes: 'Leitz Summilux-C chosen for its microcontrast and falloff characteristics that replicated classical Hollywood lens rendering when graded to B&W.' },

  // The Power of the Dog — ALEXA LF + Zeiss Supreme Prime
  { productionSlug: 'the-power-of-the-dog-2021', sceneSlug: 'smoke-ring-saddle',
    seriesSlug: 'arri-alexa-family', itemSlug: 'arri-alexa-lf',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'ari-wegner', crewRoleSlug: 'director-of-photography',
    notes: 'Ari Wegner and Campion shot in the Otago region of New Zealand\'s South Island. The large-format ALEXA LF allowed Wegner to compress the epic Montana landscape into a psychologically imposing backdrop.' },
  { productionSlug: 'the-power-of-the-dog-2021', sceneSlug: 'smoke-ring-saddle',
    seriesSlug: 'zeiss-supreme-prime', setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    notes: 'Zeiss Supreme Primes used for their combination of sharpness and organic falloff — critical for the tonal range of the New Zealand tussock landscapes in Montana-simulated light.' },

  // Nightmare Alley — ALEXA 65
  { productionSlug: 'nightmare-alley-2021', sceneSlug: 'carnival-night',
    seriesSlug: 'arri-alexa-65-series', itemSlug: 'arri-alexa-65',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'dan-laustsen', crewRoleSlug: 'director-of-photography',
    notes: 'Laustsen and del Toro used the ALEXA 65 for its ability to render the carnival\'s lurid practical lights — neon, bare tungsten bulbs, fire torches — without any fill, capturing the seedy atmosphere of pre-war America.' },

  // Spencer — ALEXA Mini LF
  { productionSlug: 'spencer-2021', sceneSlug: 'balmoral-breakfast',
    seriesSlug: 'arri-alexa-mini-lf-series', itemSlug: 'arri-alexa-mini-lf',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'claire-mathon', crewRoleSlug: 'director-of-photography',
    notes: 'Mathon lit the Balmoral scenes (shot in Germany) from large, cold-gray north windows, creating the airless, over-bright quality of an institutional space rather than a home.' },
  { productionSlug: 'spencer-2021', sceneSlug: 'diana-scarecrow-walk',
    seriesSlug: 'arri-alexa-mini-lf-series', itemSlug: 'arri-alexa-mini-lf',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    notes: 'The magic-hour exterior at the scarecrow was shot during actual golden hour in Norfolk — a rare warm palette in the film, suggesting Diana\'s connection to the land outside the palace constraints.' },

  // Babylon — ALEXA 65 + Panavision T-Series anamorphic
  { productionSlug: 'babylon-2022', sceneSlug: 'opening-party',
    seriesSlug: 'arri-alexa-65-series', itemSlug: 'arri-alexa-65',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'linus-sandgren', crewRoleSlug: 'director-of-photography',
    notes: 'Sandgren and Chazelle chose ALEXA 65 with Panavision T-Series anamorphic lenses for the sweeping 1920s Hollywood party sequences. The combination of large format and anamorphic glass produced the wide, enveloping image of old Hollywood studio productions.' },
  { productionSlug: 'babylon-2022', sceneSlug: 'opening-party',
    seriesSlug: 'panavision-t-series', setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    notes: 'Panavision T-Series anamorphics paired with ALEXA 65 for a contemporary large-format take on the CinemaScope era aesthetic.' },

  // Elvis — ALEXA 65 + Mini LF
  { productionSlug: 'elvis-2022', sceneSlug: 'beale-street-discovery',
    seriesSlug: 'arri-alexa-65-series', itemSlug: 'arri-alexa-65',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'mandy-walker', crewRoleSlug: 'director-of-photography',
    notes: 'Walker and Luhrmann used the ALEXA 65 for the sweeping period recreations. The Beale Street sequence was shot on the Gold Coast standing set with extreme overhead neon recreations of 1950s Memphis.' },
  { productionSlug: 'elvis-2022', sceneSlug: 'international-hotel-concert',
    seriesSlug: 'arri-alexa-mini-lf-series', itemSlug: 'arri-alexa-mini-lf',
    setupLabel: 'B-Cam', usageRole: 'b_cam',
    notes: 'Handheld ALEXA Mini LF units were used for the concert sequences to create kinetic energy, inter-cut with locked-off ALEXA 65 wide shots.' },

  // Tár — ALEXA 65 + Mini LF
  { productionSlug: 'tar-2022', sceneSlug: 'juilliard-masterclass',
    seriesSlug: 'arri-alexa-65-series', itemSlug: 'arri-alexa-65',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'florian-hoffmeister', crewRoleSlug: 'director-of-photography',
    notes: 'The Juilliard scene was shot in a single sustained long take on the ALEXA 65 without cuts — Hoffmeister developed a custom in-camera celluloid emulation system for the production that was later commercialized as the ALEXA 35\'s Textures feature.' },
  { productionSlug: 'tar-2022', sceneSlug: 'conducting-rehearsal',
    seriesSlug: 'arri-alexa-mini-lf-series', itemSlug: 'arri-alexa-mini-lf',
    setupLabel: 'B-Cam', usageRole: 'b_cam',
    notes: 'The Berlin Philharmonie rehearsal scenes used a combination of the ALEXA 65 for wide orchestral views and ALEXA Mini LF for close observational work on Blanchett, maintaining visual intimacy within the vast concert hall.' },

  // All Quiet on the Western Front — ALEXA 65 + Mini LF
  { productionSlug: 'all-quiet-on-the-western-front-2022', sceneSlug: 'trench-night-assault',
    seriesSlug: 'arri-alexa-65-series', itemSlug: 'arri-alexa-65',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'james-friend', crewRoleSlug: 'director-of-photography',
    notes: 'Friend used the ALEXA 65 for the large-format trench warfare sequences; the wider field of view made the soldiers appear diminished against the mechanized landscape, amplifying the war\'s dehumanizing scale.' },
  { productionSlug: 'all-quiet-on-the-western-front-2022', sceneSlug: 'armistice-morning',
    seriesSlug: 'arri-alexa-mini-lf-series', itemSlug: 'arri-alexa-mini-lf',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    notes: 'The armistice morning attack was shot in a flat, colorless dawn light to render the final deaths as futile and drained of meaning — Friend deliberately kept all warmth from the frame as a moral statement.' },

  // The Substance — ALEXA Mini LF + Leitz Thalia
  { productionSlug: 'the-substance-2024', sceneSlug: 'transformation-sequence',
    seriesSlug: 'arri-alexa-mini-lf-series', itemSlug: 'arri-alexa-mini-lf',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'benjamin-kracun', crewRoleSlug: 'director-of-photography',
    notes: 'The transformation sequences were achieved primarily through practical prosthetic effects on the ALEXA Mini LF; Kračun and Fargeat developed a custom Kodachrome/Ektachrome LUT blend to give the film a retro-horror warmth beneath the contemporary setting.' },
  { productionSlug: 'the-substance-2024', sceneSlug: 'tv-studio-performance',
    seriesSlug: 'leitz-thalia', itemSlug: 'leitz-thalia-25mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    notes: 'The TV studio sequences were kept at original 4K sharpness (vs. the 2K-upscaled look for other scenes) using Leitz Thalia large-format lenses — the crisper TV image differentiated the mediated screen reality from the "real" world.' },

  // Anora — ARRICAM LT + Lomo Round Front anamorphic 35mm
  { productionSlug: 'anora-2024', sceneSlug: 'night-club-dance',
    seriesSlug: 'arricam-lt-st', itemSlug: 'arricam-lt',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'drew-daniels', crewRoleSlug: 'director-of-photography',
    notes: 'Daniels and Baker used a single ARRICAM LT for the entire film. Kodak 35mm push-processed one stop allowed shooting in the nightclub\'s available strobe and DJ light at ASA rated one stop over.' },
  { productionSlug: 'anora-2024', sceneSlug: 'night-club-dance',
    seriesSlug: 'lomo-round-front', itemSlug: 'lomo-round-front-50mm',
    setupLabel: 'A-Cam', usageRole: 'a_cam_lens',
    notes: 'The 1970s Lomo Round Front anamorphic lenses were chosen for their organic imperfections — mild oval flare, soft bokeh edges, and gentle distortion at the frame corners — evoking Baker\'s brief that the film "feel like it was shot in 1974."' },
  { productionSlug: 'anora-2024', sceneSlug: 'brighton-beach-winter',
    seriesSlug: 'arricam-lt-st', itemSlug: 'arricam-lt',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    notes: 'The push-processed 35mm in the low winter light of Brighton Beach produced grain structures that Baker and Daniels embraced as consistent with the film\'s period-texture ambition.' },

  // Conclave — RED V-RAPTOR 8K
  { productionSlug: 'conclave-2024', sceneSlug: 'sistine-chapel-ballot',
    seriesSlug: 'red-camera-family', itemSlug: 'red-v-raptor-8k',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    crewPersonSlug: 'stephane-fontaine', crewRoleSlug: 'director-of-photography',
    notes: 'Fontaine used the RED V-RAPTOR 8K throughout — shot almost entirely with available light from the large windows of Vatican-adjacent locations and the set recreation. The 2.39:1 anamorphic frame embedded characters in vast architectural negative space.' },
  { productionSlug: 'conclave-2024', sceneSlug: 'opening-360-steadicam',
    seriesSlug: 'red-camera-family', itemSlug: 'red-v-raptor-8k',
    setupLabel: 'A-Cam', usageRole: 'a_cam',
    notes: 'The opening 360° Steadicam shot (operated by Alex Brambilla) following Cardinal Lawrence through the chaos of the Pope\'s death was the sole moment of visual disorientation before the visual language became controlled and restrained.' },
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
