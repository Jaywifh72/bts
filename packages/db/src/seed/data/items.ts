import { eq } from 'drizzle-orm';
import { equipmentItems, equipmentSeries } from '../../schema/index.ts';
import { validateSpecs } from '../../schema/specs/index.ts';
import type { SeedDb } from '../run.ts';

type ItemSeed = {
  slug: string; seriesSlug: string; name: string;
  status?: 'active' | 'discontinued' | 'rare' | 'prototype' | 'rehoused';
  specs?: Record<string, unknown>;
};

export const itemsData: ItemSeed[] = [
  // ===== ARRI ALEXA bodies =====
  { slug: 'arri-alexa-mini-lf', seriesSlug: 'arri-alexa-mini-lf-series',
    name: 'ARRI ALEXA Mini LF', status: 'active',
    specs: { sensor_size: 'LF', sensor_resolution_max: '4448x3096', max_frame_rate_fps: 90, mount: 'LPL', color_science: 'ARRI LogC4', weight_kg: 2.6 } },
  { slug: 'arri-alexa-65', seriesSlug: 'arri-alexa-65-series',
    name: 'ARRI ALEXA 65', status: 'active',
    specs: { sensor_size: 'imax_65', sensor_resolution_max: '6560x3100', max_frame_rate_fps: 60, mount: 'PL', color_science: 'ARRI LogC' } },
  { slug: 'arri-alexa-lf', seriesSlug: 'arri-alexa-family',
    name: 'ARRI ALEXA LF', status: 'active',
    specs: { sensor_size: 'LF', max_frame_rate_fps: 150, mount: 'LPL' } },
  { slug: 'arri-alexa-mini', seriesSlug: 'arri-alexa-family',
    name: 'ARRI ALEXA Mini', status: 'active',
    specs: { sensor_size: 's35', mount: 'PL' } },
  { slug: 'arri-alexa-xt', seriesSlug: 'arri-alexa-family',
    name: 'ARRI ALEXA XT', status: 'discontinued',
    specs: { sensor_size: 's35', mount: 'PL' } },

  // ===== SkyPanel sizes =====
  { slug: 'arri-skypanel-s30-c', seriesSlug: 'arri-skypanel',
    name: 'ARRI SkyPanel S30-C', status: 'active',
    specs: { fixture_kind: 'led_panel', color_temperature_range_k: '2800-10000', rgb_color_mixing: true, weight_kg: 5.1 } },
  { slug: 'arri-skypanel-s60-c', seriesSlug: 'arri-skypanel',
    name: 'ARRI SkyPanel S60-C', status: 'active',
    specs: { fixture_kind: 'led_panel', color_temperature_range_k: '2800-10000', rgb_color_mixing: true, weight_kg: 11 } },
  { slug: 'arri-skypanel-s120-c', seriesSlug: 'arri-skypanel',
    name: 'ARRI SkyPanel S120-C', status: 'active',
    specs: { fixture_kind: 'led_panel', color_temperature_range_k: '2800-10000', rgb_color_mixing: true, weight_kg: 19 } },
  { slug: 'arri-skypanel-s360-c', seriesSlug: 'arri-skypanel',
    name: 'ARRI SkyPanel S360-C', status: 'active',
    specs: { fixture_kind: 'led_panel', color_temperature_range_k: '2800-10000', rgb_color_mixing: true, weight_kg: 41 } },

  // ===== Orbiter =====
  { slug: 'arri-orbiter', seriesSlug: 'arri-orbiter',
    name: 'ARRI Orbiter', status: 'active',
    specs: { fixture_kind: 'led_fresnel', color_temperature_range_k: '2000-20000', rgb_color_mixing: true, weight_kg: 12 } },

  // ===== Cooke S4/i — workhorse Super 35 prime set =====
  { slug: 'cooke-s4i-18mm-t2', seriesSlug: 'cooke-s4i', name: 'Cooke S4/i 18mm T2.0', status: 'active',
    specs: { focal_length_mm: 18, max_aperture_t: 2.0, lens_format: 's35', mount: 'PL', is_anamorphic: false } },
  { slug: 'cooke-s4i-25mm-t2', seriesSlug: 'cooke-s4i', name: 'Cooke S4/i 25mm T2.0', status: 'active',
    specs: { focal_length_mm: 25, max_aperture_t: 2.0, lens_format: 's35', mount: 'PL', is_anamorphic: false } },
  { slug: 'cooke-s4i-32mm-t2', seriesSlug: 'cooke-s4i', name: 'Cooke S4/i 32mm T2.0', status: 'active',
    specs: { focal_length_mm: 32, max_aperture_t: 2.0, lens_format: 's35', mount: 'PL', is_anamorphic: false } },
  { slug: 'cooke-s4i-40mm-t2', seriesSlug: 'cooke-s4i', name: 'Cooke S4/i 40mm T2.0', status: 'active',
    specs: { focal_length_mm: 40, max_aperture_t: 2.0, lens_format: 's35', mount: 'PL', is_anamorphic: false } },
  { slug: 'cooke-s4i-50mm-t2', seriesSlug: 'cooke-s4i', name: 'Cooke S4/i 50mm T2.0', status: 'active',
    specs: { focal_length_mm: 50, max_aperture_t: 2.0, lens_format: 's35', mount: 'PL', is_anamorphic: false } },
  { slug: 'cooke-s4i-75mm-t2', seriesSlug: 'cooke-s4i', name: 'Cooke S4/i 75mm T2.0', status: 'active',
    specs: { focal_length_mm: 75, max_aperture_t: 2.0, lens_format: 's35', mount: 'PL', is_anamorphic: false } },
  { slug: 'cooke-s4i-100mm-t2', seriesSlug: 'cooke-s4i', name: 'Cooke S4/i 100mm T2.0', status: 'active',
    specs: { focal_length_mm: 100, max_aperture_t: 2.0, lens_format: 's35', mount: 'PL', is_anamorphic: false } },

  // ===== Cooke S7/i FF+ — full focal-length set =====
  { slug: 'cooke-s7i-18mm-t2', seriesSlug: 'cooke-s7i-ff-plus', name: 'Cooke S7/i 18mm T2.0', status: 'active',
    specs: { focal_length_mm: 18, max_aperture_t: 2.0, lens_format: 'full_frame_plus', mount: 'PL', is_anamorphic: false } },
  { slug: 'cooke-s7i-21mm-t2', seriesSlug: 'cooke-s7i-ff-plus', name: 'Cooke S7/i 21mm T2.0', status: 'active',
    specs: { focal_length_mm: 21, max_aperture_t: 2.0, lens_format: 'full_frame_plus', mount: 'PL', is_anamorphic: false } },
  { slug: 'cooke-s7i-25mm-t2', seriesSlug: 'cooke-s7i-ff-plus', name: 'Cooke S7/i 25mm T2.0', status: 'active',
    specs: { focal_length_mm: 25, max_aperture_t: 2.0, lens_format: 'full_frame_plus', mount: 'PL', is_anamorphic: false } },
  { slug: 'cooke-s7i-32mm-t2', seriesSlug: 'cooke-s7i-ff-plus', name: 'Cooke S7/i 32mm T2.0', status: 'active',
    specs: { focal_length_mm: 32, max_aperture_t: 2.0, lens_format: 'full_frame_plus', mount: 'PL', is_anamorphic: false } },
  { slug: 'cooke-s7i-40mm-t2', seriesSlug: 'cooke-s7i-ff-plus', name: 'Cooke S7/i 40mm T2.0', status: 'active',
    specs: { focal_length_mm: 40, max_aperture_t: 2.0, lens_format: 'full_frame_plus', mount: 'PL', is_anamorphic: false } },
  { slug: 'cooke-s7i-50mm-t2', seriesSlug: 'cooke-s7i-ff-plus', name: 'Cooke S7/i 50mm T2.0', status: 'active',
    specs: { focal_length_mm: 50, max_aperture_t: 2.0, lens_format: 'full_frame_plus', mount: 'PL', is_anamorphic: false } },
  { slug: 'cooke-s7i-65mm-t2', seriesSlug: 'cooke-s7i-ff-plus', name: 'Cooke S7/i 65mm T2.0', status: 'active',
    specs: { focal_length_mm: 65, max_aperture_t: 2.0, lens_format: 'full_frame_plus', mount: 'PL', is_anamorphic: false } },
  { slug: 'cooke-s7i-75mm-t2', seriesSlug: 'cooke-s7i-ff-plus', name: 'Cooke S7/i 75mm T2.0', status: 'active',
    specs: { focal_length_mm: 75, max_aperture_t: 2.0, lens_format: 'full_frame_plus', mount: 'PL', is_anamorphic: false } },
  { slug: 'cooke-s7i-100mm-t2', seriesSlug: 'cooke-s7i-ff-plus', name: 'Cooke S7/i 100mm T2.0', status: 'active',
    specs: { focal_length_mm: 100, max_aperture_t: 2.0, lens_format: 'full_frame_plus', mount: 'PL', is_anamorphic: false } },
  { slug: 'cooke-s7i-135mm-t2', seriesSlug: 'cooke-s7i-ff-plus', name: 'Cooke S7/i 135mm T2.0', status: 'active',
    specs: { focal_length_mm: 135, max_aperture_t: 2.0, lens_format: 'full_frame_plus', mount: 'PL', is_anamorphic: false } },

  // ===== Zeiss Master Anamorphic =====
  { slug: 'zeiss-master-anamorphic-35mm', seriesSlug: 'zeiss-master-anamorphic', name: 'Zeiss Master Anamorphic 35mm T1.9', status: 'active',
    specs: { focal_length_mm: 35, max_aperture_t: 1.9, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PL', lens_format: 's35' } },
  { slug: 'zeiss-master-anamorphic-50mm', seriesSlug: 'zeiss-master-anamorphic', name: 'Zeiss Master Anamorphic 50mm T1.9', status: 'active',
    specs: { focal_length_mm: 50, max_aperture_t: 1.9, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PL', lens_format: 's35' } },
  { slug: 'zeiss-master-anamorphic-75mm', seriesSlug: 'zeiss-master-anamorphic', name: 'Zeiss Master Anamorphic 75mm T1.9', status: 'active',
    specs: { focal_length_mm: 75, max_aperture_t: 1.9, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PL', lens_format: 's35' } },
  { slug: 'zeiss-master-anamorphic-100mm', seriesSlug: 'zeiss-master-anamorphic', name: 'Zeiss Master Anamorphic 100mm T1.9', status: 'active',
    specs: { focal_length_mm: 100, max_aperture_t: 1.9, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PL', lens_format: 's35' } },

  // ===== Zeiss Master Prime =====
  { slug: 'zeiss-master-prime-25mm', seriesSlug: 'zeiss-master-prime', name: 'Zeiss Master Prime 25mm T1.3', status: 'active',
    specs: { focal_length_mm: 25, max_aperture_t: 1.3, lens_format: 's35', mount: 'PL', is_anamorphic: false } },
  { slug: 'zeiss-master-prime-32mm', seriesSlug: 'zeiss-master-prime', name: 'Zeiss Master Prime 32mm T1.3', status: 'active',
    specs: { focal_length_mm: 32, max_aperture_t: 1.3, lens_format: 's35', mount: 'PL', is_anamorphic: false } },
  { slug: 'zeiss-master-prime-40mm', seriesSlug: 'zeiss-master-prime', name: 'Zeiss Master Prime 40mm T1.3', status: 'active',
    specs: { focal_length_mm: 40, max_aperture_t: 1.3, lens_format: 's35', mount: 'PL', is_anamorphic: false } },
  { slug: 'zeiss-master-prime-50mm', seriesSlug: 'zeiss-master-prime', name: 'Zeiss Master Prime 50mm T1.3', status: 'active',
    specs: { focal_length_mm: 50, max_aperture_t: 1.3, lens_format: 's35', mount: 'PL', is_anamorphic: false } },
  { slug: 'zeiss-master-prime-65mm', seriesSlug: 'zeiss-master-prime', name: 'Zeiss Master Prime 65mm T1.3', status: 'active',
    specs: { focal_length_mm: 65, max_aperture_t: 1.3, lens_format: 's35', mount: 'PL', is_anamorphic: false } },
  { slug: 'zeiss-master-prime-100mm', seriesSlug: 'zeiss-master-prime', name: 'Zeiss Master Prime 100mm T1.3', status: 'active',
    specs: { focal_length_mm: 100, max_aperture_t: 1.3, lens_format: 's35', mount: 'PL', is_anamorphic: false } },

  // ===== Zeiss Supreme Prime =====
  { slug: 'zeiss-supreme-prime-25mm', seriesSlug: 'zeiss-supreme-prime', name: 'Zeiss Supreme Prime 25mm T1.5', status: 'active',
    specs: { focal_length_mm: 25, max_aperture_t: 1.5, lens_format: 'full_frame', mount: 'PL', is_anamorphic: false } },
  { slug: 'zeiss-supreme-prime-29mm', seriesSlug: 'zeiss-supreme-prime', name: 'Zeiss Supreme Prime 29mm T1.5', status: 'active',
    specs: { focal_length_mm: 29, max_aperture_t: 1.5, lens_format: 'full_frame', mount: 'PL', is_anamorphic: false } },
  { slug: 'zeiss-supreme-prime-35mm', seriesSlug: 'zeiss-supreme-prime', name: 'Zeiss Supreme Prime 35mm T1.5', status: 'active',
    specs: { focal_length_mm: 35, max_aperture_t: 1.5, lens_format: 'full_frame', mount: 'PL', is_anamorphic: false } },
  { slug: 'zeiss-supreme-prime-50mm', seriesSlug: 'zeiss-supreme-prime', name: 'Zeiss Supreme Prime 50mm T1.5', status: 'active',
    specs: { focal_length_mm: 50, max_aperture_t: 1.5, lens_format: 'full_frame', mount: 'PL', is_anamorphic: false } },
  { slug: 'zeiss-supreme-prime-85mm', seriesSlug: 'zeiss-supreme-prime', name: 'Zeiss Supreme Prime 85mm T1.5', status: 'active',
    specs: { focal_length_mm: 85, max_aperture_t: 1.5, lens_format: 'full_frame', mount: 'PL', is_anamorphic: false } },
  { slug: 'zeiss-supreme-prime-100mm', seriesSlug: 'zeiss-supreme-prime', name: 'Zeiss Supreme Prime 100mm T1.5', status: 'active',
    specs: { focal_length_mm: 100, max_aperture_t: 1.5, lens_format: 'full_frame', mount: 'PL', is_anamorphic: false } },

  // ===== Panavision Sphero T-Series =====
  { slug: 'panavision-sphero-35mm', seriesSlug: 'panavision-sphero-anamorphic', name: 'Panavision Sphero 35mm T2.3', status: 'active',
    specs: { focal_length_mm: 35, max_aperture_t: 2.3, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PV', lens_format: 's35' } },
  { slug: 'panavision-sphero-50mm', seriesSlug: 'panavision-sphero-anamorphic', name: 'Panavision Sphero 50mm T2.3', status: 'active',
    specs: { focal_length_mm: 50, max_aperture_t: 2.3, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PV', lens_format: 's35' } },
  { slug: 'panavision-sphero-75mm', seriesSlug: 'panavision-sphero-anamorphic', name: 'Panavision Sphero 75mm T2.3', status: 'active',
    specs: { focal_length_mm: 75, max_aperture_t: 2.3, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PV', lens_format: 's35' } },
  { slug: 'panavision-sphero-100mm', seriesSlug: 'panavision-sphero-anamorphic', name: 'Panavision Sphero 100mm T2.3', status: 'active',
    specs: { focal_length_mm: 100, max_aperture_t: 2.3, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PV', lens_format: 's35' } },

  // ===== Atlas Orion Anamorphic =====
  { slug: 'atlas-orion-32mm', seriesSlug: 'atlas-orion-anamorphic', name: 'Atlas Orion 32mm T2.0', status: 'active',
    specs: { focal_length_mm: 32, max_aperture_t: 2.0, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PL', lens_format: 's35' } },
  { slug: 'atlas-orion-40mm', seriesSlug: 'atlas-orion-anamorphic', name: 'Atlas Orion 40mm T2.0', status: 'active',
    specs: { focal_length_mm: 40, max_aperture_t: 2.0, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PL', lens_format: 's35' } },
  { slug: 'atlas-orion-50mm', seriesSlug: 'atlas-orion-anamorphic', name: 'Atlas Orion 50mm T2.0', status: 'active',
    specs: { focal_length_mm: 50, max_aperture_t: 2.0, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PL', lens_format: 's35' } },
  { slug: 'atlas-orion-65mm', seriesSlug: 'atlas-orion-anamorphic', name: 'Atlas Orion 65mm T2.0', status: 'active',
    specs: { focal_length_mm: 65, max_aperture_t: 2.0, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PL', lens_format: 's35' } },
  { slug: 'atlas-orion-80mm', seriesSlug: 'atlas-orion-anamorphic', name: 'Atlas Orion 80mm T2.0', status: 'active',
    specs: { focal_length_mm: 80, max_aperture_t: 2.0, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PL', lens_format: 's35' } },
  { slug: 'atlas-orion-100mm', seriesSlug: 'atlas-orion-anamorphic', name: 'Atlas Orion 100mm T2.0', status: 'active',
    specs: { focal_length_mm: 100, max_aperture_t: 2.0, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PL', lens_format: 's35' } },

  // ===== ARRI Rental DNA LF Vintage Primes (rehoused Canon K-35) =====
  { slug: 'arri-rental-dna-lf-vintage-32mm', seriesSlug: 'arri-rental-dna-lf-vintage', name: 'ARRI Rental DNA LF Vintage 32mm', status: 'rehoused',
    specs: { focal_length_mm: 32, lens_format: 'large_format', mount: 'LPL', is_anamorphic: false } },
  { slug: 'arri-rental-dna-lf-vintage-40mm', seriesSlug: 'arri-rental-dna-lf-vintage', name: 'ARRI Rental DNA LF Vintage 40mm', status: 'rehoused',
    specs: { focal_length_mm: 40, lens_format: 'large_format', mount: 'LPL', is_anamorphic: false } },
  { slug: 'arri-rental-dna-lf-vintage-50mm', seriesSlug: 'arri-rental-dna-lf-vintage', name: 'ARRI Rental DNA LF Vintage 50mm', status: 'rehoused',
    specs: { focal_length_mm: 50, lens_format: 'large_format', mount: 'LPL', is_anamorphic: false } },
  { slug: 'arri-rental-dna-lf-vintage-75mm', seriesSlug: 'arri-rental-dna-lf-vintage', name: 'ARRI Rental DNA LF Vintage 75mm', status: 'rehoused',
    specs: { focal_length_mm: 75, lens_format: 'large_format', mount: 'LPL', is_anamorphic: false } },
  { slug: 'arri-rental-dna-lf-vintage-100mm', seriesSlug: 'arri-rental-dna-lf-vintage', name: 'ARRI Rental DNA LF Vintage 100mm', status: 'rehoused',
    specs: { focal_length_mm: 100, lens_format: 'large_format', mount: 'LPL', is_anamorphic: false } },

  // ===== Tiffen Black Pro-Mist (each strength is its own item) =====
  { slug: 'tiffen-black-pro-mist-1-8', seriesSlug: 'tiffen-black-pro-mist', name: 'Tiffen Black Pro-Mist 1/8', status: 'active',
    specs: { filter_kind: 'diffusion', subkind: 'black_pro_mist', strengths_available: [0.125] } },
  { slug: 'tiffen-black-pro-mist-1-4', seriesSlug: 'tiffen-black-pro-mist', name: 'Tiffen Black Pro-Mist 1/4', status: 'active',
    specs: { filter_kind: 'diffusion', subkind: 'black_pro_mist', strengths_available: [0.25] } },
  { slug: 'tiffen-black-pro-mist-1-2', seriesSlug: 'tiffen-black-pro-mist', name: 'Tiffen Black Pro-Mist 1/2', status: 'active',
    specs: { filter_kind: 'diffusion', subkind: 'black_pro_mist', strengths_available: [0.5] } },
  { slug: 'tiffen-black-pro-mist-1', seriesSlug: 'tiffen-black-pro-mist', name: 'Tiffen Black Pro-Mist 1', status: 'active',
    specs: { filter_kind: 'diffusion', subkind: 'black_pro_mist', strengths_available: [1.0] } },
  { slug: 'tiffen-black-pro-mist-2', seriesSlug: 'tiffen-black-pro-mist', name: 'Tiffen Black Pro-Mist 2', status: 'active',
    specs: { filter_kind: 'diffusion', subkind: 'black_pro_mist', strengths_available: [2.0] } },

  // ===== Tiffen IRND =====
  { slug: 'tiffen-irnd-0-3', seriesSlug: 'tiffen-irnd', name: 'Tiffen IRND 0.3', status: 'active',
    specs: { filter_kind: 'ir_nd', strengths_available: [0.3] } },
  { slug: 'tiffen-irnd-0-6', seriesSlug: 'tiffen-irnd', name: 'Tiffen IRND 0.6', status: 'active',
    specs: { filter_kind: 'ir_nd', strengths_available: [0.6] } },
  { slug: 'tiffen-irnd-0-9', seriesSlug: 'tiffen-irnd', name: 'Tiffen IRND 0.9', status: 'active',
    specs: { filter_kind: 'ir_nd', strengths_available: [0.9] } },
  { slug: 'tiffen-irnd-1-2', seriesSlug: 'tiffen-irnd', name: 'Tiffen IRND 1.2', status: 'active',
    specs: { filter_kind: 'ir_nd', strengths_available: [1.2] } },

  // ===== ARRI ALEXA M (modular) =====
  { slug: 'arri-alexa-m', seriesSlug: 'arri-alexa-family', name: 'ARRI ALEXA M', status: 'discontinued',
    specs: { sensor_size: 's35', mount: 'PL', weight_kg: 1.8 } },

  // ===== ARRICAM film cameras =====
  { slug: 'arricam-lt', seriesSlug: 'arricam-lt-st', name: 'ARRICAM LT (35mm)', status: 'discontinued',
    specs: { sensor_size: 's35', mount: 'PL' } },
  { slug: 'arricam-st', seriesSlug: 'arricam-lt-st', name: 'ARRICAM ST (35mm)', status: 'discontinued',
    specs: { sensor_size: 's35', mount: 'PL' } },

  // ===== ARRI 416 Super 16mm =====
  { slug: 'arri-416-body', seriesSlug: 'arri-416', name: 'ARRI 416 (Super 16mm)', status: 'discontinued',
    specs: { sensor_size: 's16', mount: 'PL' } },

  // ===== Panavision System 65 =====
  { slug: 'panavision-system-65-studio', seriesSlug: 'panavision-system-65', name: 'Panavision Panaflex System 65 Studio', status: 'discontinued',
    specs: { sensor_size: 'LF', mount: 'PV' } },
  { slug: 'panavision-panaflex-hr', seriesSlug: 'panavision-system-65', name: 'Panavision Panaflex 65 HR', status: 'discontinued',
    specs: { sensor_size: 'LF', mount: 'PV' } },

  // ===== Panavision Millennium XL2 =====
  { slug: 'panavision-millennium-xl2', seriesSlug: 'panavision-millennium-xl', name: 'Panavision Millennium XL2 (35mm)', status: 'discontinued',
    specs: { sensor_size: 's35', mount: 'PV' } },

  // ===== IMAX film cameras =====
  { slug: 'imax-msm-9802', seriesSlug: 'imax-film-camera', name: 'IMAX MSM 9802 (65mm 15-perf)', status: 'discontinued',
    specs: { sensor_size: 'imax_65', mount: 'PL' } },
  { slug: 'imax-mkiv', seriesSlug: 'imax-film-camera', name: 'IMAX MKIV (65mm 15-perf)', status: 'discontinued',
    specs: { sensor_size: 'imax_65', mount: 'PL' } },

  // ===== RED cameras =====
  { slug: 'red-one-mx', seriesSlug: 'red-camera-family', name: 'RED One MX (Mysterium-X)', status: 'discontinued',
    specs: { sensor_size: 's35', sensor_resolution_max: '4096x2304', mount: 'PL' } },
  { slug: 'red-helium-8k', seriesSlug: 'red-camera-family', name: 'RED Helium 8K', status: 'discontinued',
    specs: { sensor_size: 's35', sensor_resolution_max: '8192x4320', mount: 'PL' } },
  { slug: 'red-monstro-8k', seriesSlug: 'red-camera-family', name: 'RED Monstro 8K VV', status: 'discontinued',
    specs: { sensor_size: 'vista_vision', sensor_resolution_max: '8192x4320', mount: 'PL' } },
  { slug: 'red-v-raptor-8k', seriesSlug: 'red-camera-family', name: 'RED V-RAPTOR 8K VV', status: 'active',
    specs: { sensor_size: 'vista_vision', sensor_resolution_max: '8192x4320', mount: 'PL' } },

  // ===== Sony Venice =====
  { slug: 'sony-venice-2-body', seriesSlug: 'sony-venice-family', name: 'Sony VENICE 2', status: 'active',
    specs: { sensor_size: 'full_frame', sensor_resolution_max: '8640x5760', mount: 'PL', color_science: 'S-Cinetone' } },
  { slug: 'sony-hdw-f900-body', seriesSlug: 'sony-hdw-f900', name: 'Sony HDW-F900 (HD video)', status: 'discontinued',
    specs: { sensor_size: 's16', color_science: '2/3" CCD HDV — HD 1080i/24p native, no interchangeable mount' } },

  // ===== Mitchell BNCR =====
  { slug: 'mitchell-bncr-body', seriesSlug: 'mitchell-bncr', name: 'Mitchell BNCR (35mm reflex)', status: 'discontinued',
    specs: { sensor_size: 's35', mount: 'M' } },

  // ===== Panavision anamorphic families =====
  { slug: 'panavision-c-series-35mm', seriesSlug: 'panavision-c-series', name: 'Panavision C35 T2.3', status: 'active',
    specs: { focal_length_mm: 35, max_aperture_t: 2.3, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PV', lens_format: 's35' } },
  { slug: 'panavision-c-series-50mm', seriesSlug: 'panavision-c-series', name: 'Panavision C50 T2.3', status: 'active',
    specs: { focal_length_mm: 50, max_aperture_t: 2.3, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PV', lens_format: 's35' } },
  { slug: 'panavision-e-series-35mm', seriesSlug: 'panavision-e-series', name: 'Panavision E35 T2.0', status: 'active',
    specs: { focal_length_mm: 35, max_aperture_t: 2.0, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PV', lens_format: 's35' } },
  { slug: 'panavision-e-series-50mm', seriesSlug: 'panavision-e-series', name: 'Panavision E50 T2.0', status: 'active',
    specs: { focal_length_mm: 50, max_aperture_t: 2.0, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PV', lens_format: 's35' } },
  { slug: 'panavision-h-series-40mm', seriesSlug: 'panavision-h-series', name: 'Panavision H40 (LF Anamorphic)', status: 'active',
    specs: { focal_length_mm: 40, is_anamorphic: true, anamorphic_squeeze: 1.65, mount: 'PL', lens_format: 'large_format' } },
  { slug: 'ultra-panavision-70-40mm', seriesSlug: 'ultra-panavision-70', name: 'Ultra Panavision 70 40mm (2.76:1)', status: 'rare',
    specs: { focal_length_mm: 40, is_anamorphic: true, anamorphic_squeeze: 1.25, mount: 'PV', lens_format: 'large_format' } },
  { slug: 'ultra-panatar-65mm', seriesSlug: 'panavision-ultra-panatar', name: 'Panavision Ultra Panatar 65mm (1.3×)', status: 'active',
    specs: { focal_length_mm: 65, is_anamorphic: true, anamorphic_squeeze: 1.3, mount: 'LPL', lens_format: 'large_format' } },
  { slug: 'panavision-va-40mm', seriesSlug: 'panavision-va', name: 'Panavision VA 40mm', status: 'active',
    specs: { focal_length_mm: 40, is_anamorphic: false, mount: 'PL', lens_format: 'large_format' } },
  { slug: 'panavision-super-speed-40mm', seriesSlug: 'panavision-super-speed', name: 'Panavision Ultra High Speed 40mm T1.1', status: 'active',
    specs: { focal_length_mm: 40, max_aperture_t: 1.1, is_anamorphic: false, mount: 'PV', lens_format: 's35' } },

  // ===== Zeiss additional =====
  { slug: 'zeiss-ultra-prime-25mm', seriesSlug: 'zeiss-ultra-prime', name: 'Zeiss Ultra Prime 25mm T1.9', status: 'active',
    specs: { focal_length_mm: 25, max_aperture_t: 1.9, is_anamorphic: false, mount: 'PL', lens_format: 's35' } },
  { slug: 'zeiss-ultra-prime-40mm', seriesSlug: 'zeiss-ultra-prime', name: 'Zeiss Ultra Prime 40mm T1.9', status: 'active',
    specs: { focal_length_mm: 40, max_aperture_t: 1.9, is_anamorphic: false, mount: 'PL', lens_format: 's35' } },
  { slug: 'zeiss-super-speed-35mm', seriesSlug: 'zeiss-super-speed', name: 'Zeiss Super Speed 35mm T1.3', status: 'discontinued',
    specs: { focal_length_mm: 35, max_aperture_t: 1.3, is_anamorphic: false, mount: 'PL', lens_format: 's35' } },
  { slug: 'zeiss-planar-50mm-f07', seriesSlug: 'zeiss-planar-f07', name: 'Zeiss Planar 50mm f/0.7 (NASA)', status: 'rare',
    specs: { focal_length_mm: 50, max_aperture_t: 0.7, is_anamorphic: false, mount: 'M', lens_format: 's35' } },

  // ===== Hawk V-Lite =====
  { slug: 'hawk-v-lite-40mm', seriesSlug: 'hawk-v-lite', name: 'Hawk V-Lite Vintage 40mm T2.2', status: 'active',
    specs: { focal_length_mm: 40, max_aperture_t: 2.2, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PL', lens_format: 's35' } },

  // ===== Angénieux Optimo Anamorphic =====
  { slug: 'angenieux-optimo-anam-30-76', seriesSlug: 'angenieux-optimo-anamorphic', name: 'Angénieux Optimo Anamorphic 30–76mm T2.8', status: 'active',
    specs: { focal_length_mm: 30, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PL', lens_format: 's35' } },

  // ===== Bausch & Lomb Baltar (vintage) =====
  { slug: 'bausch-lomb-baltar-40mm', seriesSlug: 'bausch-lomb-baltar', name: 'Bausch & Lomb Super Baltar 40mm', status: 'rare',
    specs: { focal_length_mm: 40, is_anamorphic: false, mount: 'M', lens_format: 's35' } },

  // ===== LOMO Round Front Anamorphic =====
  { slug: 'lomo-round-front-50mm', seriesSlug: 'lomo-round-front', name: 'Lomo Round Front 50mm Anamorphic', status: 'rare',
    specs: { focal_length_mm: 50, is_anamorphic: true, anamorphic_squeeze: 2.0, mount: 'PL', lens_format: 's35' } },

  // ===== Leitz additional =====
  { slug: 'leitz-summilux-c-35mm', seriesSlug: 'leitz-summilux-c', name: 'Leitz Summilux-C 35mm T1.4', status: 'active',
    specs: { focal_length_mm: 35, max_aperture_t: 1.4, is_anamorphic: false, mount: 'PL', lens_format: 's35' } },
  { slug: 'leitz-summilux-c-50mm', seriesSlug: 'leitz-summilux-c', name: 'Leitz Summilux-C 50mm T1.4', status: 'active',
    specs: { focal_length_mm: 50, max_aperture_t: 1.4, is_anamorphic: false, mount: 'PL', lens_format: 's35' } },
  { slug: 'leitz-thalia-25mm', seriesSlug: 'leitz-thalia', name: 'Leitz Thalia 25mm T2.6', status: 'active',
    specs: { focal_length_mm: 25, max_aperture_t: 2.6, is_anamorphic: false, mount: 'PL', lens_format: 'large_format' } },
];

export async function seedItems(db: SeedDb) {
  for (const it of itemsData) {
    const [series] = await db.select({ id: equipmentSeries.id, category: equipmentSeries.category })
      .from(equipmentSeries)
      .where(eq(equipmentSeries.slug, it.seriesSlug));
    if (!series?.id) throw new Error(`unknown series slug: ${it.seriesSlug}`);
    const validatedSpecs = validateSpecs(series.category, it.specs ?? {});
    await db.insert(equipmentItems)
      .values({
        slug: it.slug, name: it.name, seriesId: series.id,
        status: it.status ?? 'active',
        specs: validatedSpecs as object,
      })
      .onConflictDoUpdate({
        target: equipmentItems.slug,
        set: {
          name: it.name, seriesId: series.id, status: it.status ?? 'active',
          specs: validatedSpecs as object, updatedAt: new Date(),
        },
      });
  }
}
