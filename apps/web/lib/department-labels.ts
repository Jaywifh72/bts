/**
 * Display labels for the role_category_enum values used by production_
 * awards + crew_assignments. The raw enum values are snake_case
 * lowercase (camera, makeup_hair, post, vfx, etc.) so any UI that renders
 * them directly looks like a debug artifact.
 *
 * Single source of truth — every department-heading surface should
 * route through `departmentLabel()`.
 */

export type RoleCategory =
  | 'camera' | 'grip' | 'electric' | 'sound' | 'art' | 'wardrobe'
  | 'makeup_hair' | 'production' | 'post' | 'vfx' | 'direction'
  | 'writing' | 'music' | 'stunts';

export const DEPARTMENT_LABELS: Record<RoleCategory, string> = {
  camera: 'Camera',
  grip: 'Grip',
  electric: 'Electric / Lighting',
  sound: 'Sound',
  art: 'Art Department',
  wardrobe: 'Costume',
  makeup_hair: 'Makeup & Hair',
  production: 'Production',
  post: 'Post-production',
  vfx: 'Visual Effects',
  direction: 'Direction',
  writing: 'Writing',
  music: 'Music',
  stunts: 'Stunts',
};

export function departmentLabel(cat: RoleCategory | string): string {
  return DEPARTMENT_LABELS[cat as RoleCategory] ?? cat;
}
