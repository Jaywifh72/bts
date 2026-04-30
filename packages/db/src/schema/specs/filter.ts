import { z } from 'zod';

export const filterKindEnum = z.enum([
  'diffusion', 'nd', 'ir_nd', 'polarizer', 'graduated_nd', 'color_correction',
  'streak', 'mist', 'other',
]);

export const filterSpecsSchema = z.object({
  filter_kind: filterKindEnum.optional(),
  subkind: z.string().optional(),                    // e.g. "black_pro_mist"
  strengths_available: z.array(z.number().nonnegative()).optional(),
  size_mm_round: z.number().positive().optional(),
  size_inch_square: z.string().optional(),           // e.g. "4x5.65"
}).strict();

export type FilterSpecs = z.infer<typeof filterSpecsSchema>;
