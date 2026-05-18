import type { AwardOrg } from '@bts/db';

/**
 * Display labels for each award_org enum value. Used by every awards
 * surface (crew page, vfx page, stunt-company page, awards index) so a
 * label change here propagates everywhere.
 *
 * The enum lives in migrations/0018 + 0057 + earlier. Any new enum value
 * MUST land here, otherwise the UI shows the raw snake_case identifier.
 */
export const ORG_LABELS: Record<AwardOrg, string> = {
  academy_awards: 'Academy Award',
  bafta: 'BAFTA',
  cannes: 'Cannes',
  venice: 'Venice',
  berlin: 'Berlin',
  golden_globes: 'Golden Globe',
  critics_choice: 'Critics Choice',
  asc_award: 'ASC Award',
  aso_award: 'ASO Award',
  csc_award: 'CSC Award',
  bsc_award: 'BSC Award',
  spirit_awards: 'Independent Spirit Award',
  camerimage: 'Camerimage',
  ves_award: 'VES Award',
  eca: 'Emerging Cinematographer Award',
  taurus_world_stunt_awards: 'Taurus World Stunt Award',
  sag_stunt_ensemble: 'SAG Stunt Ensemble',
  // Migration 0077 — sound/music/craft society additions.
  academy_stunt_design: 'Academy Award (Stunt Design)',
  mpse_golden_reel: 'MPSE Golden Reel',
  cas_award: 'CAS Award',
  hpa_award: 'HPA Award',
  ace_eddie: 'ACE Eddie',
  scl_award: 'SCL Award',
  ascap_film_award: 'ASCAP Film Music Award',
  bmi_film_award: 'BMI Film Music Award',
  ivor_novello: 'Ivor Novello',
  gms_award: 'Guild of Music Supervisors',
  adg_award: 'ADG Award',
  cdg_award: 'CDG Award',
  muahs_award: 'MUAHS Award',
  other: 'Other',
};

export function orgLabel(org: AwardOrg | string): string {
  return ORG_LABELS[org as AwardOrg] ?? org;
}
