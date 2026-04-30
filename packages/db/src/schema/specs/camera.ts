import { z } from 'zod';

export const sensorSizeEnum = z.enum(['s16', 's35', 'full_frame', 'LF', 'imax_65', 'medium_format', 'vista_vision']);
export const cameraMountEnum = z.enum(['PL', 'LPL', 'PV', 'EF', 'B4', 'F', 'M', 'other']);

export const cameraSpecsSchema = z.object({
  sensor_size: sensorSizeEnum.optional(),
  sensor_resolution_max: z.string().optional(),     // e.g. "4448x3096"
  sensor_format_options: z.array(z.string()).optional(),
  max_frame_rate_fps: z.number().positive().optional(),
  internal_codecs: z.array(z.string()).optional(),
  mount: cameraMountEnum.optional(),
  color_science: z.string().optional(),
  weight_kg: z.number().positive().optional(),
}).strict();

export type CameraSpecs = z.infer<typeof cameraSpecsSchema>;
