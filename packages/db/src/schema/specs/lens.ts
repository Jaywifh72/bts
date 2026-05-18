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
  // Tier-1 spec-sheet additions — what working DPs actually consult.
  /** Number of iris diaphragm blades — affects bokeh shape. */
  iris_blade_count: z.number().int().positive().max(24).optional(),
  /** Free-text vintage lineage / character notes. */
  character_notes: z.string().optional(),
  /** Year introduced. */
  year_introduced: z.number().int().min(1900).max(2099).optional(),
  /** Filter thread diameter at front (mm). */
  filter_thread_mm: z.number().positive().optional(),
  /** Physical length (mm) — matte-box clearance check. */
  length_mm: z.number().positive().optional(),
}).strict();

export type LensSpecs = z.infer<typeof lensSpecsSchema>;
