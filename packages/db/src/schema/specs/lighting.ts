import { z } from 'zod';

export const fixtureKindEnum = z.enum([
  'led_panel', 'led_fresnel', 'hmi_par', 'hmi_fresnel', 'tungsten_fresnel',
  'kino', 'space_light', 'practical', 'other',
]);

export const lightingSpecsSchema = z.object({
  fixture_kind: fixtureKindEnum.optional(),
  color_temperature_range_k: z.string().optional(),  // "2800-10000"
  max_output_lumens: z.number().positive().optional(),
  cri: z.number().min(0).max(100).optional(),
  tlci: z.number().min(0).max(100).optional(),
  rgb_color_mixing: z.boolean().optional(),
  weight_kg: z.number().positive().optional(),
  // Tier-1 spec-sheet additions — what working gaffers actually consult.
  /** Numeric CCT bounds (in K). Easier than parsing the range string. */
  cct_min_k: z.number().positive().optional(),
  cct_max_k: z.number().positive().optional(),
  /** Delta-uv — chromaticity deviation from blackbody curve. */
  duv: z.number().optional(),
  /** Beam angle bounds (degrees). Some fixtures fixed; some zoom. */
  beam_angle_min_deg: z.number().positive().optional(),
  beam_angle_max_deg: z.number().positive().optional(),
  /** Power draw at max output (W). */
  power_watts: z.number().positive().optional(),
  /** DMX channels needed at full mode. */
  dmx_channels: z.number().int().positive().optional(),
  /** Lux at 3m, full output (manufacturer datasheet figure). */
  lux_at_3m: z.number().positive().optional(),
  /** Power sources accepted. */
  power_inputs: z.array(z.string()).optional(),
  /** IP rating. "IP65", "IP54", "Indoor only". */
  ip_rating: z.string().optional(),
  /** Form factor description. "1x1 panel", "1x4 tube", "spotlight", etc. */
  form_factor: z.string().optional(),
  /** Year introduced. */
  year_introduced: z.number().int().min(1900).max(2099).optional(),
  /** Free-text gaffer-relevant notes (fan noise, magnet mounts, accessory ecosystem). */
  gaffer_notes: z.string().optional(),
}).strict();

export type LightingSpecs = z.infer<typeof lightingSpecsSchema>;
