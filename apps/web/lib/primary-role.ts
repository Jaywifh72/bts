/**
 * Pick the most-prominent role from a person's filmography. The DB
 * sometimes has the same person credited twice on the same film
 * (e.g. Deakins as both Camera Operator and Director of Photography
 * on 1917), and the filmography query sorts year-DESC then title — so
 * `filmography[0].role_name` can land on a less-prominent credit.
 *
 * Priority: senior camera-dept / direction roles win, then operating,
 * then assistant/loader roles, then anything else.
 */
const ROLE_PRIORITY: Record<string, number> = {
  director: 0,
  'director-of-photography': 1,
  cinematographer: 1,
  'second-unit-director-of-photography': 2,
  'underwater-director-of-photography': 2,
  'aerial-director-of-photography': 2,
  'b-camera-operator': 4,
  'steadicam-operator': 4,
  'camera-operator': 5,
  'first-assistant-camera': 7,
  'second-assistant-camera': 8,
  'digital-imaging-technician': 8,
  loader: 9,
};

export function pickPrimaryRole(
  filmography: ReadonlyArray<{ role_name: string; role_slug?: string }>,
): string | null {
  if (filmography.length === 0) return null;
  let bestIdx = 0;
  let bestPriority = ROLE_PRIORITY[filmography[0]?.role_slug ?? ''] ?? 100;
  for (let i = 1; i < filmography.length; i++) {
    const slug = filmography[i]?.role_slug ?? '';
    const p = ROLE_PRIORITY[slug] ?? 100;
    if (p < bestPriority) {
      bestPriority = p;
      bestIdx = i;
    }
  }
  return filmography[bestIdx]?.role_name ?? null;
}
