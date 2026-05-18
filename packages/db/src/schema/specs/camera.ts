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
  // E-15 — sensor benchmarks (CineD lab tests). All optional;
  // populated from CineD test reports, manufacturer datasheets, or
  // equivalent cited sources. Latitude is asymmetric (above key vs
  // below key) following CineD's exposure-latitude convention.
  dynamic_range_stops: z.number().positive().max(20).optional(),
  rolling_shutter_ms: z.number().nonnegative().max(50).optional(),
  latitude_above_key_stops: z.number().nonnegative().max(12).optional(),
  latitude_below_key_stops: z.number().nonnegative().max(12).optional(),
  /** URL of the CineD/no-film-school/etc. lab report this came from. */
  benchmark_url: z.string().url().optional(),
  // Tier-1 spec-sheet additions — what working DPs actually consult.
  /** Native ISO. Single number, or dual-native [low, high]. */
  native_iso: z.union([z.number().positive(), z.array(z.number().positive()).length(2)]).optional(),
  /** Sensor width × height in mm — for image-circle / format calcs. */
  sensor_w_mm: z.number().positive().optional(),
  sensor_h_mm: z.number().positive().optional(),
  /** Optical low-pass filter type. e.g. "None", "Removable", "Fixed OLPF". */
  olpf_type: z.string().optional(),
  /** Recording media options ('CFast 2.0', 'SxS PRO+', 'AXS-R7', 'CFexpress Type B'). */
  recording_media: z.array(z.string()).optional(),
  /** Log curves available — LogC3, LogC4, S-Log3, REDLog3G10, V-Log, N-Log. */
  log_curves: z.array(z.string()).optional(),
  /** Internal bit depth at primary codec. */
  bit_depth: z.number().int().positive().max(20).optional(),
  /** Highest FPS achievable per resolution. e.g. {'4K': 120, '2K': 240}. */
  max_fps_by_resolution: z.record(z.string(), z.number().positive()).optional(),
  /** Built-in NDs. "0/0.6/1.2/1.8 internal" or "Variable 2-7 stops". */
  built_in_nd: z.string().optional(),
  /** Power input description. "24V XLR-4 / V-mount / Gold mount". */
  power_input: z.string().optional(),
  /** Year introduced. Useful for "what shot in 2017" cross-cuts. */
  year_introduced: z.number().int().min(1900).max(2099).optional(),
  /** Free-text DP-relevant notes (color science quirks, IR pollution, fan noise). */
  dp_notes: z.string().optional(),
}).strict();

export type CameraSpecs = z.infer<typeof cameraSpecsSchema>;
