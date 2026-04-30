import { describe, it, expect } from 'vitest';
import { validateSpecs, lensSpecsSchema } from '../schema/specs/index.ts';

describe('lensSpecsSchema', () => {
  it('accepts a valid Cooke S7/i 32mm shape', () => {
    const specs = {
      focal_length_mm: 32, max_aperture_t: 2.0, min_aperture_t: 22,
      image_circle_mm: 46.31, lens_format: 'full_frame_plus' as const,
      is_anamorphic: false, anamorphic_squeeze: null,
      minimum_focus_m: 0.36, weight_kg: 1.6, front_diameter_mm: 110,
      mount: 'PL' as const,
    };
    expect(() => lensSpecsSchema.parse(specs)).not.toThrow();
  });

  it('rejects unknown keys (strict mode)', () => {
    expect(() => lensSpecsSchema.parse({ foo: 1 })).toThrow();
  });

  it('rejects invalid lens_format value', () => {
    expect(() => lensSpecsSchema.parse({ lens_format: 'bogus' })).toThrow();
  });
});

describe('validateSpecs dispatch', () => {
  it('routes to camera schema for camera_body category', () => {
    expect(() => validateSpecs('camera_body', { sensor_size: 'LF', max_frame_rate_fps: 90 })).not.toThrow();
    expect(() => validateSpecs('camera_body', { sensor_size: 'bogus' })).toThrow();
  });
  it('passes through unknown categories', () => {
    expect(validateSpecs('mount', { whatever: true })).toEqual({ whatever: true });
  });
});
