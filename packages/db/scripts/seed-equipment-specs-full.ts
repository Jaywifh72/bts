// Tier-1 spec sheets — comprehensive technical data for the cameras,
// lenses, and lighting fixtures working pros consult day-to-day.
//
// Sources: ARRI / Sony / RED / Cooke / Panavision / Aputure datasheets,
// AbelCine spec pages, CineD lab reports, individual manufacturer PDFs,
// IMDb tech specs page, ASC magazine reviews.
//
// Pattern: UPDATE equipment_items SET specs = specs || $patch::jsonb.
// Existing benchmark fields are preserved; new fields merge in. Rows
// whose slug doesn't exist yet warn but don't fail.
//
// Usage: pnpm --filter @bts/db exec tsx scripts/seed-equipment-specs-full.ts
import { db, sql } from '../src/index.ts';

type Patch = { slug: string; patch: Record<string, unknown> };

// ── Cameras ──────────────────────────────────────────────────────────
const CAMERAS: Patch[] = [
  {
    slug: 'arri-alexa-35',
    patch: {
      sensor_size: 's35', sensor_resolution_max: '4608x3164',
      sensor_w_mm: 27.99, sensor_h_mm: 19.22,
      native_iso: [800, 2560],
      max_frame_rate_fps: 120,
      max_fps_by_resolution: { '4.6K Open Gate': 75, '4K 16:9': 120, '2K': 240 },
      internal_codecs: ['ARRIRAW', 'Apple ProRes 4444 XQ', 'Apple ProRes 422 HQ'],
      bit_depth: 13,
      log_curves: ['LogC4'],
      olpf_type: 'Fixed OLPF',
      mount: 'LPL', color_science: 'REVEAL Color Science', weight_kg: 2.9,
      built_in_nd: 'Internal FSND 0.6/1.2/1.8/2.1/2.4',
      power_input: '24V XLR-3 / B-mount',
      year_introduced: 2022,
      recording_media: ['Codex Compact Drive 1TB/2TB'],
      dp_notes: 'New ALEV 4 sensor + LogC4. First ARRI with dual native ISO. REVEAL color science distinct from LogC3-era ALEXAs. Best-in-class shadow latitude as of release.',
    },
  },
  {
    slug: 'arri-alexa-mini-lf',
    patch: {
      sensor_size: 'LF', sensor_resolution_max: '4448x3096',
      sensor_w_mm: 36.7, sensor_h_mm: 25.54,
      native_iso: 800,
      max_frame_rate_fps: 90,
      internal_codecs: ['ARRIRAW', 'ProRes 4444 XQ', 'ProRes 4444', 'ProRes 422 HQ'],
      bit_depth: 12, log_curves: ['LogC3'],
      olpf_type: 'Fixed OLPF', mount: 'LPL',
      color_science: 'LogC3 / ARRI Wide Gamut', weight_kg: 2.6,
      built_in_nd: 'Internal FSND 0.6/1.2/1.8',
      power_input: '11-34V XLR-3 / B-mount',
      year_introduced: 2019,
      recording_media: ['Codex Compact Drive 1TB/2TB'],
      dp_notes: 'Large-format ALEV III sensor. Workhorse on Dune (2021), No Time to Die, BR2049 (later units). LogC3 → ACES IDT well-supported across DI labs.',
    },
  },
  {
    slug: 'arri-alexa-65',
    patch: {
      sensor_size: 'imax_65', sensor_resolution_max: '6560x3100',
      sensor_w_mm: 54.12, sensor_h_mm: 25.58,
      native_iso: 800,
      max_frame_rate_fps: 60,
      internal_codecs: ['ARRIRAW'],
      bit_depth: 12, log_curves: ['LogC3'],
      mount: 'PV-extended (custom)', color_science: 'LogC3 / ARRI Wide Gamut', weight_kg: 10.5,
      power_input: '24V Lemo / D-Tap not supported',
      year_introduced: 2014,
      recording_media: ['Codex XR Capture Drive 480GB'],
      dp_notes: 'Rental-exclusive. 65mm-equivalent capture used on The Revenant, BR2049 (large-format inserts), Rogue One, The Hateful Eight 70mm-DI sources. Body too heavy for handheld; tripod / dolly / Stabileye operation typical.',
    },
  },
  {
    slug: 'arri-alexa-mini',
    patch: {
      sensor_size: 's35', sensor_resolution_max: '3424x2202',
      sensor_w_mm: 28.25, sensor_h_mm: 18.17,
      native_iso: 800,
      max_frame_rate_fps: 200,
      internal_codecs: ['ARRIRAW', 'ProRes 4444 XQ', 'ProRes 4444', 'ProRes 422 HQ'],
      bit_depth: 12, log_curves: ['LogC3'],
      olpf_type: 'Fixed OLPF', mount: 'PL', color_science: 'LogC3 / ARRI Wide Gamut', weight_kg: 2.3,
      built_in_nd: 'Internal FSND 0.6/1.2/1.8',
      power_input: '11-34V Lemo / B-mount available',
      year_introduced: 2015,
      recording_media: ['CFast 2.0'],
      dp_notes: 'Most-shot camera of the past decade. ALEV III sensor in compact body — chosen for Steadicam, drone, gimbal, action B-cam. The standard-by-default for narrative features 2016-2022 until Mini LF + 35 split the market.',
    },
  },
  {
    slug: 'arri-alexa-xt',
    patch: {
      sensor_size: 's35', sensor_resolution_max: '3414x2198',
      sensor_w_mm: 28.25, sensor_h_mm: 18.17,
      native_iso: 800,
      max_frame_rate_fps: 120,
      internal_codecs: ['ARRIRAW', 'ProRes 4444 XQ', 'ProRes 4444'],
      bit_depth: 12, log_curves: ['LogC3'],
      mount: 'PL', color_science: 'LogC3 / ARRI Wide Gamut', weight_kg: 6.7,
      year_introduced: 2013,
      recording_media: ['Codex XR Capture Drive 480GB / 240GB'],
      dp_notes: 'The studio A-cam workhorse 2013-2018. Big body, integrated VFX-grade SDI outputs, optical viewfinder. BR2049 A-cam, many tentpoles.',
    },
  },
  {
    slug: 'sony-venice-2-body',
    patch: {
      sensor_size: 'LF', sensor_resolution_max: '8640x5760',
      sensor_w_mm: 35.9, sensor_h_mm: 24.0,
      native_iso: [800, 3200],
      max_frame_rate_fps: 90,
      max_fps_by_resolution: { '8K Full Frame': 60, '6K': 90, '4K': 120 },
      internal_codecs: ['X-OCN XT/ST/LT', 'ProRes 4444', 'XAVC'],
      bit_depth: 16, log_curves: ['S-Log3'],
      olpf_type: 'Fixed OLPF', mount: 'PL/E-mount',
      color_science: 'S-Gamut3.Cine', weight_kg: 4.0,
      built_in_nd: '8-stop optical clear-to-2.4 internal ND wheel',
      power_input: '24V XLR-4 / B-mount',
      year_introduced: 2022,
      recording_media: ['AXS-A1TS66 cards', 'CFexpress Type A (XAVC)'],
      dp_notes: '8.6K full-frame. Dune Part Two A-cam. Internal 8-stop ND is a huge advantage on bright exteriors. Best dynamic range Sony has shipped per CineD.',
    },
  },
  {
    slug: 'sony-venice',
    patch: {
      sensor_size: 'LF', sensor_resolution_max: '6048x4032',
      sensor_w_mm: 36.2, sensor_h_mm: 24.1,
      native_iso: [500, 2500],
      max_frame_rate_fps: 60,
      internal_codecs: ['X-OCN XT/ST/LT', 'ProRes 4444', 'XAVC'],
      bit_depth: 16, log_curves: ['S-Log3'],
      mount: 'PL/E-mount', color_science: 'S-Gamut3.Cine', weight_kg: 4.1,
      built_in_nd: '8-stop optical clear-to-2.4 internal ND wheel',
      year_introduced: 2017,
      recording_media: ['AXS-A1TS66 cards'],
      dp_notes: 'The Mandalorian Volume A-cam (Stagecraft). Used on Top Gun: Maverick aerial cockpit rigs. Internal ND wheel is the most-cited Venice feature.',
    },
  },
  {
    slug: 'red-v-raptor-8k',
    patch: {
      sensor_size: 'LF', sensor_resolution_max: '8192x4320',
      sensor_w_mm: 40.96, sensor_h_mm: 21.6,
      native_iso: [800, 5000],
      max_frame_rate_fps: 120,
      internal_codecs: ['REDCODE RAW (compressed)'],
      bit_depth: 16, log_curves: ['REDLog3G10', 'Log3G12'],
      mount: 'RF/PL (interchangeable)', color_science: 'IPP2 / REDWideGamutRGB',
      weight_kg: 2.7,
      year_introduced: 2021,
      recording_media: ['RED MAG 1TB CFexpress'],
      dp_notes: 'KOMODO\'s big sibling — dual-native ISO + global-shutter rolling-shutter on VV sensor. Lighter than Alexa class. Common B-cam on tentpoles needing 8K coverage.',
    },
  },
  {
    slug: 'red-komodo-6k',
    patch: {
      sensor_size: 's35', sensor_resolution_max: '6144x3240',
      sensor_w_mm: 27.03, sensor_h_mm: 14.26,
      native_iso: 800,
      max_frame_rate_fps: 120,
      internal_codecs: ['REDCODE RAW (compressed)'],
      bit_depth: 16, log_curves: ['REDLog3G10'],
      mount: 'RF', color_science: 'IPP2 / REDWideGamutRGB', weight_kg: 1.0,
      year_introduced: 2020,
      recording_media: ['CFast 2.0'],
      dp_notes: 'Global-shutter Super-35. Cubic compact body. Drone + crash-cam + steadicam B-rig of choice for action work. The Fall Guy + many recent stunt-heavy shoots use it.',
    },
  },
  {
    slug: 'sony-fx9',
    patch: {
      sensor_size: 'full_frame', sensor_resolution_max: '6048x4032',
      sensor_w_mm: 35.7, sensor_h_mm: 18.8,
      native_iso: [800, 4000],
      max_frame_rate_fps: 120,
      internal_codecs: ['XAVC-I 4K 10-bit'],
      bit_depth: 10, log_curves: ['S-Log3'],
      mount: 'E', color_science: 'S-Gamut3.Cine', weight_kg: 2.0,
      built_in_nd: 'Variable internal ND 1/4 to 1/128',
      year_introduced: 2019,
      recording_media: ['CFexpress Type A'],
      dp_notes: 'Doc + episodic workhorse. Variable internal ND is the marquee feature for run-and-gun. Not commonly used on theatrical features but heavily on prestige TV.',
    },
  },
  {
    slug: 'blackmagic-pyxis-6k',
    patch: {
      sensor_size: 'full_frame', sensor_resolution_max: '6048x4032',
      sensor_w_mm: 36.0, sensor_h_mm: 24.0,
      native_iso: [400, 3200],
      max_frame_rate_fps: 100,
      internal_codecs: ['Blackmagic RAW'],
      bit_depth: 12, log_curves: ['Gen 5 Color Science'],
      mount: 'PL/L/EF (interchangeable)', weight_kg: 0.97,
      year_introduced: 2024,
      recording_media: ['CFexpress Type B', 'USB-C SSD'],
      dp_notes: 'Box-camera factor. Aggressive price-to-spec — under $3K body. Dual native ISO, full-frame, internal BRAW. Indie + budget commercial work.',
    },
  },
];

// ── Lenses ───────────────────────────────────────────────────────────
const LENSES: Patch[] = [
  // Master Anamorphic — modern flagship anamorphic set
  {
    slug: 'arri-master-anamorphic-50mm',
    patch: {
      focal_length_mm: 50, max_aperture_t: 1.9, min_aperture_t: 22,
      image_circle_mm: 31.5, lens_format: 's35', mount: 'PL',
      is_anamorphic: true, anamorphic_squeeze: 2,
      minimum_focus_m: 0.85, weight_kg: 2.6, front_diameter_mm: 114,
      breathing: 'negligible', focus_throw_deg: 280,
      iris_blade_count: 9,
      year_introduced: 2013,
      character_notes: 'Sharp, neutral, low-distortion anamorphic — designed for digital era. Oval bokeh + horizontal flares. Optical-element-stabilized for minimal breathing. The "Master Prime of anamorphics."',
    },
  },
  // Cooke S7/i — large-format prime workhorse
  {
    slug: 'cooke-s7i-50mm',
    patch: {
      focal_length_mm: 50, max_aperture_t: 2.0, min_aperture_t: 22,
      image_circle_mm: 46.31, lens_format: 'large_format', mount: 'PL',
      minimum_focus_m: 0.51, weight_kg: 1.6, front_diameter_mm: 110,
      breathing: 'low', focus_throw_deg: 270, iris_blade_count: 8,
      year_introduced: 2017,
      character_notes: 'Cooke Look — warm color cast, slightly soft wide open. Image circle covers LF/VistaVision. The "Cooke Look" — celebrated by DPs preferring romantic skin tones over clinical sharpness.',
    },
  },
  // Cooke Speed Panchro — vintage S35 character lens
  {
    slug: 'cooke-speed-panchro-50mm-rehoused',
    patch: {
      focal_length_mm: 50, max_aperture_t: 2.3, min_aperture_t: 22,
      image_circle_mm: 28, lens_format: 's35', mount: 'PL',
      minimum_focus_m: 0.5, weight_kg: 1.4, front_diameter_mm: 95,
      breathing: 'moderate', iris_blade_count: 10,
      year_introduced: 1930,
      character_notes: 'Vintage Cooke (1930s-1960s) rehoused for modern PL mounts by TLS / Whitepoint / Z+P. Warm, soft, dreamy. Used on prestige period pieces — The Lighthouse, The Brutalist, much A24 fare.',
    },
  },
  // ARRI Signature Prime — modern LF flagship
  {
    slug: 'arri-signature-prime-50mm',
    patch: {
      focal_length_mm: 50, max_aperture_t: 1.8, min_aperture_t: 22,
      image_circle_mm: 46, lens_format: 'large_format', mount: 'LPL',
      minimum_focus_m: 0.45, weight_kg: 1.7, front_diameter_mm: 95,
      breathing: 'negligible', focus_throw_deg: 300, iris_blade_count: 11,
      filter_thread_mm: 95,
      year_introduced: 2018,
      character_notes: 'Designed natively for LPL + Alexa LF/Mini LF. Magnesium body — light vs Cooke S7. T1.8 wide-open across the set. Smooth bokeh + low distortion. Adopted aggressively by Mini-LF-era productions.',
    },
  },
  // Panavision Sphero — Lubezki anamorphic of choice
  {
    slug: 'panavision-sphero-65-50mm',
    patch: {
      focal_length_mm: 50, max_aperture_t: 2.0, min_aperture_t: 22,
      image_circle_mm: 60, lens_format: 'large_format', mount: 'PV',
      is_anamorphic: true, anamorphic_squeeze: 1.65,
      minimum_focus_m: 0.6, weight_kg: 4.5,
      breathing: 'low', iris_blade_count: 8,
      year_introduced: 2017,
      character_notes: '1.65× squeeze designed for ALEXA 65 sensor. Used by Lubezki + Deakins on BR2049, also various Iñárritu collaborations. Massive front element. Spherical hybrid — flares horizontal but distortion controlled.',
    },
  },
  // Cooke Anamorphic/i
  {
    slug: 'cooke-anamorphic-i-50mm',
    patch: {
      focal_length_mm: 50, max_aperture_t: 2.3, min_aperture_t: 22,
      image_circle_mm: 28.5, lens_format: 's35', mount: 'PL',
      is_anamorphic: true, anamorphic_squeeze: 2,
      minimum_focus_m: 0.91, weight_kg: 3.4, front_diameter_mm: 110,
      iris_blade_count: 8,
      year_introduced: 2010,
      character_notes: 'Cooke Look + anamorphic flare/bokeh. SF (Special Flair) variant available — uncoated front element produces stronger flares. Used on many MCU + Edgar Wright features.',
    },
  },
  // Zeiss Supreme Prime
  {
    slug: 'zeiss-supreme-prime-50mm',
    patch: {
      focal_length_mm: 50, max_aperture_t: 1.5, min_aperture_t: 22,
      image_circle_mm: 46.3, lens_format: 'large_format', mount: 'PL/LPL',
      minimum_focus_m: 0.45, weight_kg: 1.7, front_diameter_mm: 95,
      breathing: 'low', focus_throw_deg: 300, iris_blade_count: 18,
      year_introduced: 2018,
      character_notes: 'T1.5 across the set — fastest LF cinema prime set on the market at release. eXtended-data metadata pipeline (electronics talk to ALEXA Mini LF). 18-blade iris = round bokeh.',
    },
  },
  // ARRI Master Prime
  {
    slug: 'arri-master-prime-50mm',
    patch: {
      focal_length_mm: 50, max_aperture_t: 1.3, min_aperture_t: 22,
      image_circle_mm: 34.5, lens_format: 's35', mount: 'PL',
      minimum_focus_m: 0.6, weight_kg: 2.2, front_diameter_mm: 114,
      breathing: 'negligible', focus_throw_deg: 270, iris_blade_count: 9,
      year_introduced: 2005,
      character_notes: 'Reference Super 35 prime. T1.3 max aperture — fastest cinema prime at release. Neutral rendering. Standard A-list set when LF wasn\'t yet adopted. Heavy.',
    },
  },
  // ARRI Ultra Prime — budget-conscious S35
  {
    slug: 'arri-ultra-prime-50mm',
    patch: {
      focal_length_mm: 50, max_aperture_t: 1.9, min_aperture_t: 22,
      image_circle_mm: 34, lens_format: 's35', mount: 'PL',
      minimum_focus_m: 0.6, weight_kg: 1.6, front_diameter_mm: 95,
      breathing: 'low', iris_blade_count: 9,
      year_introduced: 1998,
      character_notes: 'Workhorse S35 prime — lighter than Master Primes, still neutral. Common rental-house default set.',
    },
  },
  // Leitz Thalia
  {
    slug: 'leitz-thalia-50mm',
    patch: {
      focal_length_mm: 50, max_aperture_t: 2.2, min_aperture_t: 22,
      image_circle_mm: 60, lens_format: 'imax', mount: 'PL',
      minimum_focus_m: 0.5, weight_kg: 1.6, front_diameter_mm: 95,
      iris_blade_count: 15,
      year_introduced: 2018,
      character_notes: 'Designed for ALEXA 65 + 65mm formats. Image circle covers 65mm. Used on the IMAX-cert sequences of various tentpoles. Leitz-Cine\'s flagship.',
    },
  },
  // DZOFilm Vespid — budget cinema prime
  {
    slug: 'dzofilm-vespid-50mm',
    patch: {
      focal_length_mm: 50, max_aperture_t: 2.1, min_aperture_t: 22,
      image_circle_mm: 46, lens_format: 'full_frame_plus', mount: 'EF/PL/L',
      minimum_focus_m: 0.6, weight_kg: 1.06, front_diameter_mm: 80,
      breathing: 'low', iris_blade_count: 16, filter_thread_mm: 77,
      year_introduced: 2020,
      character_notes: 'Budget-friendly LF coverage cinema prime. Under $1.5K per lens. Indie + commercial workhorse. Surprisingly neutral rendering for the price tier.',
    },
  },
];

// ── Lighting fixtures ────────────────────────────────────────────────
const LIGHTS: Patch[] = [
  {
    slug: 'arri-skypanel-s60',
    patch: {
      fixture_kind: 'led_panel',
      color_temperature_range_k: '2800-10000',
      cct_min_k: 2800, cct_max_k: 10000,
      cri: 95, tlci: 95, duv: 0.0,
      rgb_color_mixing: true,
      max_output_lumens: 13800,
      lux_at_3m: 2960,
      beam_angle_min_deg: 95, beam_angle_max_deg: 115,
      power_watts: 450,
      dmx_channels: 16,
      power_inputs: ['100-240V AC', '24V DC via Sky-LINK'],
      ip_rating: 'Indoor only',
      form_factor: '60x30cm soft panel',
      weight_kg: 12.7,
      year_introduced: 2015,
      gaffer_notes: 'Industry-standard RGBW soft panel. Color-mix mode allows gel emulation. Honeycomb + Snapbag accessories ubiquitous on every union shoot. S30 / S60 / S120 form-factor variants. S60 is the workhorse size.',
    },
  },
  {
    slug: 'arri-skypanel-s30',
    patch: {
      fixture_kind: 'led_panel',
      color_temperature_range_k: '2800-10000',
      cct_min_k: 2800, cct_max_k: 10000,
      cri: 95, tlci: 95,
      rgb_color_mixing: true,
      max_output_lumens: 6900,
      lux_at_3m: 1480,
      beam_angle_min_deg: 95, beam_angle_max_deg: 115,
      power_watts: 225,
      dmx_channels: 16,
      form_factor: '30x30cm soft panel',
      weight_kg: 7.3,
      year_introduced: 2016,
      gaffer_notes: 'Half-size Skypanel. Same color science as S60 in lighter package — handheld + cramped-set + book-light bounce work.',
    },
  },
  {
    slug: 'arri-skypanel-s120',
    patch: {
      fixture_kind: 'led_panel',
      color_temperature_range_k: '2800-10000',
      cct_min_k: 2800, cct_max_k: 10000,
      cri: 95, tlci: 95,
      rgb_color_mixing: true,
      max_output_lumens: 27200,
      lux_at_3m: 5950,
      power_watts: 850,
      dmx_channels: 16,
      form_factor: '120x30cm soft panel',
      weight_kg: 24.9,
      year_introduced: 2016,
      gaffer_notes: '4-foot Skypanel — large soft-source replacement for Kino Flo 4-bank. Common book light + ambient fill in studio interiors.',
    },
  },
  {
    slug: 'arri-orbiter',
    patch: {
      fixture_kind: 'led_fresnel',
      color_temperature_range_k: '2000-20000',
      cct_min_k: 2000, cct_max_k: 20000,
      cri: 95, tlci: 96,
      rgb_color_mixing: true,
      max_output_lumens: 25000,
      lux_at_3m: 5500,
      beam_angle_min_deg: 15, beam_angle_max_deg: 60,
      power_watts: 500,
      dmx_channels: 16,
      power_inputs: ['100-240V AC', '24-36V DC'],
      ip_rating: 'IP54 (optics swappable)',
      form_factor: 'Point-source LED with swappable optics',
      weight_kg: 11.0,
      year_introduced: 2020,
      gaffer_notes: 'Directional sister to Skypanel. Swappable optic accessories (15° / 30° / 60° Fresnel, Open Face, dome, projection). Best CRI/TLCI/Duv of any LED hard source on the market.',
    },
  },
  {
    slug: 'arri-m40',
    patch: {
      fixture_kind: 'hmi_par',
      color_temperature_range_k: '5600-6000',
      cct_min_k: 5600, cct_max_k: 6000,
      cri: 95,
      max_output_lumens: 470000,
      power_watts: 4000,
      power_inputs: ['208/240V via 4kW electronic ballast'],
      beam_angle_min_deg: 20, beam_angle_max_deg: 56,
      form_factor: 'M-Series open-face HMI',
      weight_kg: 17.0,
      year_introduced: 2010,
      gaffer_notes: 'Open-face 4kW HMI — softens lighting truck quick-set with Chimera / scrim. Cooler color than tungsten — paired with full CTO for tungsten match. M40 is the workhorse; M18 (1.8kW) is the smaller cousin.',
    },
  },
  {
    slug: 'arri-m18',
    patch: {
      fixture_kind: 'hmi_par',
      color_temperature_range_k: '5600-6000',
      cct_min_k: 5600, cct_max_k: 6000,
      cri: 95,
      max_output_lumens: 220000,
      power_watts: 1800,
      beam_angle_min_deg: 20, beam_angle_max_deg: 56,
      form_factor: 'M-Series open-face HMI',
      weight_kg: 9.5,
      year_introduced: 2008,
      gaffer_notes: '1.8kW HMI open-face. Most-used HMI on union shoots. Single phase 110/220V — runs off a typical 20A circuit + electronic ballast.',
    },
  },
  {
    slug: 'aputure-light-storm-600x-pro',
    patch: {
      fixture_kind: 'led_fresnel',
      color_temperature_range_k: '2700-6500',
      cct_min_k: 2700, cct_max_k: 6500,
      cri: 96, tlci: 98,
      max_output_lumens: 27000,
      lux_at_3m: 5400,
      beam_angle_min_deg: 15, beam_angle_max_deg: 60,
      power_watts: 720,
      power_inputs: ['100-240V AC', '48V DC via two V-mount in series'],
      form_factor: 'COB LED with swappable Bowens-mount optics',
      weight_kg: 5.3,
      year_introduced: 2021,
      gaffer_notes: '600W bi-color COB LED. Bowens mount = $20 reflectors + softboxes. Skypanel-tier output at fraction of cost. Indie + commercial workhorse. Adopted by some union gaffers as B-rig.',
    },
  },
  {
    slug: 'aputure-light-storm-1200-pro',
    patch: {
      fixture_kind: 'led_fresnel',
      color_temperature_range_k: '2700-6500',
      cct_min_k: 2700, cct_max_k: 6500,
      cri: 96, tlci: 98,
      max_output_lumens: 55000,
      lux_at_3m: 11200,
      power_watts: 1500,
      power_inputs: ['100-240V AC'],
      form_factor: 'COB LED with swappable Bowens-mount optics',
      weight_kg: 9.0,
      year_introduced: 2022,
      gaffer_notes: '1.2kW LED replacement for 2.5kW HMI. Bowens mount. Significantly quieter than HMI (no ballast fans). Used as ambient fill replacement.',
    },
  },
  {
    slug: 'aputure-nova-p600c',
    patch: {
      fixture_kind: 'led_panel',
      color_temperature_range_k: '2000-10000',
      cct_min_k: 2000, cct_max_k: 10000,
      cri: 96, tlci: 98,
      rgb_color_mixing: true,
      max_output_lumens: 23500,
      lux_at_3m: 4700,
      power_watts: 720,
      dmx_channels: 16,
      form_factor: '60x60cm RGBWW panel',
      weight_kg: 6.1,
      year_introduced: 2022,
      gaffer_notes: 'Skypanel-class RGB panel at half the price. Indie + commercial choice for tunable soft source.',
    },
  },
  {
    slug: 'astera-titan-tube',
    patch: {
      fixture_kind: 'practical',
      color_temperature_range_k: '1750-20000',
      cct_min_k: 1750, cct_max_k: 20000,
      cri: 96, tlci: 96,
      rgb_color_mixing: true,
      max_output_lumens: 2070,
      power_watts: 72,
      dmx_channels: 18,
      power_inputs: ['Internal battery 1-20h', 'USB-C charge'],
      ip_rating: 'IP65',
      form_factor: '1m RGBW tube',
      weight_kg: 1.0,
      year_introduced: 2017,
      gaffer_notes: 'Battery-powered, wireless DMX (LumenRadio), waterproof. Set-dressing + practical effect powerhouse. Used on every modern blockbuster as in-shot practical / car-window glow / underwater. Titan + Helios (smaller) + Hyperion sizes.',
    },
  },
  {
    slug: 'kino-flo-image-4',
    patch: {
      fixture_kind: 'kino',
      color_temperature_range_k: '2700-6500',
      cct_min_k: 2700, cct_max_k: 6500,
      cri: 95, tlci: 98,
      rgb_color_mixing: true,
      power_watts: 320,
      lux_at_3m: 2100,
      form_factor: '4-tube linear soft source',
      weight_kg: 6.4,
      year_introduced: 2020,
      gaffer_notes: 'LED replacement for the classic Kino Flo 4-bank fluorescent. Tunable + RGB. Most-used soft source on dialogue interiors before Skypanel dominance; still widely used by older gaffers.',
    },
  },
  {
    slug: 'mole-richardson-tweenie-junior',
    patch: {
      fixture_kind: 'tungsten_fresnel',
      color_temperature_range_k: '3200-3200',
      cct_min_k: 3200, cct_max_k: 3200,
      cri: 100, tlci: 100,
      power_watts: 650,
      beam_angle_min_deg: 12, beam_angle_max_deg: 65,
      form_factor: 'Tungsten Fresnel',
      weight_kg: 4.6,
      year_introduced: 1965,
      gaffer_notes: '650W tungsten Fresnel — the workhorse hard-light fixture for decades. Continuous tungsten draws ZERO color tint vs LED (CRI/TLCI 100). Used heavily by photochemical-era DPs and gaffers who insist on tungsten warmth.',
    },
  },
  {
    slug: 'bbs-area-48',
    patch: {
      fixture_kind: 'led_panel',
      color_temperature_range_k: '2700-6000',
      cct_min_k: 2700, cct_max_k: 6000,
      cri: 95, tlci: 96,
      max_output_lumens: 2400,
      power_watts: 180,
      dmx_channels: 4,
      form_factor: '12x16in soft panel',
      weight_kg: 3.5,
      year_introduced: 2014,
      gaffer_notes: 'Compact LED soft source — popular as on-set close-quarter eye light + dialogue fill on episodic and indie features. Quiet (no fans).',
    },
  },
  {
    slug: 'litepanels-astra-6x',
    patch: {
      fixture_kind: 'led_panel',
      color_temperature_range_k: '3200-5600',
      cct_min_k: 3200, cct_max_k: 5600,
      cri: 96, tlci: 95,
      max_output_lumens: 6135,
      power_watts: 130,
      dmx_channels: 4,
      form_factor: '1x1 panel',
      weight_kg: 4.5,
      year_introduced: 2018,
      gaffer_notes: 'The "1x1" — first popular LED soft 1x1 panel size. Still common on episodic / interview / doc work.',
    },
  },
];

const ALL_PATCHES = [...CAMERAS, ...LENSES, ...LIGHTS];

let updated = 0;
let missing = 0;
for (const { slug, patch } of ALL_PATCHES) {
  const r = await db.execute<{ id: number }>(sql`
    UPDATE equipment_items
    SET specs = specs || ${JSON.stringify(patch)}::jsonb,
        updated_at = NOW()
    WHERE slug = ${slug}
    RETURNING id
  `);
  if (r.length === 0) { missing++; console.warn(`  [miss] ${slug}`); }
  else updated++;
}
console.log(`equipment specs: ${updated} updated, ${missing} missing (items not in DB yet)`);
process.exit(0);
