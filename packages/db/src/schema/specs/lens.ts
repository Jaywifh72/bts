import { z } from 'zod';

export const lensFormatEnum = z.enum([
  's16', 's35', 'full_frame', 'full_frame_plus', 'large_format', 'imax',
  'vista_vision',
]);

export const lensMountEnum = z.enum(['PL', 'LPL', 'PV', 'EF', 'B4', 'F', 'M', 'other']);

export const lensBreathingEnum = z.enum(['negligible', 'low', 'moderate', 'noticeable', 'pronounced']);

export const lensSpecsSchema = z.object({
  focal_length_mm: z.number().positive().optional(),
  max_aperture_t: z.number().positive().optional(),
  min_aperture_t: z.number().positive().optional(),
  image_circle_mm: z.number().positive().optional(),
  lens_format: lensFormatEnum.optional(),
  is_anamorphic: z.boolean().optional(),
  anamorphic_squeeze: z.number().positive().nullable().optional(),
  minimum_focus_m: z.number().positive().optional(),
  weight_kg: z.number().positive().optional(),
  front_diameter_mm: z.number().positive().optional(),
  mount: lensMountEnum.optional(),
  // E-21 v2 additions
  breathing: lensBreathingEnum.optional(),
  focus_throw_deg: z.number().positive().max(360).optional(),
  mtf_chart_url: z.string().url().optional(),
}).strict();

export type LensSpecs = z.infer<typeof lensSpecsSchema>;
