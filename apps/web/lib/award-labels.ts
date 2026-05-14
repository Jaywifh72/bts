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
  other: 'Other',
};

export function orgLabel(org: AwardOrg | string): string {
  return ORG_LABELS[org as AwardOrg] ?? org;
}
