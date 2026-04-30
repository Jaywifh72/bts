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
}).strict();

export type LightingSpecs = z.infer<typeof lightingSpecsSchema>;
