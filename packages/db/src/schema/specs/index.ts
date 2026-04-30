export { lensSpecsSchema, type LensSpecs } from './lens.ts';
export { cameraSpecsSchema, type CameraSpecs } from './camera.ts';
export { lightingSpecsSchema, type LightingSpecs } from './lighting.ts';
export { filterSpecsSchema, type FilterSpecs } from './filter.ts';

import { lensSpecsSchema } from './lens.ts';
import { cameraSpecsSchema } from './camera.ts';
import { lightingSpecsSchema } from './lighting.ts';
import { filterSpecsSchema } from './filter.ts';

export type SeriesCategoryForSpecs =
  | 'lens_set' | 'camera_body' | 'lighting_fixture' | 'filter';

export function validateSpecs(category: string, specs: unknown): unknown {
  switch (category) {
    case 'lens_set':         return lensSpecsSchema.parse(specs);
    case 'camera_body':      return cameraSpecsSchema.parse(specs);
    case 'lighting_fixture': return lightingSpecsSchema.parse(specs);
    case 'filter':           return filterSpecsSchema.parse(specs);
    default:                  return specs;   // categories without a defined shape pass through
  }
}
