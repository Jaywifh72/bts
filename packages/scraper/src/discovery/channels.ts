/**
 * Seeded authority channel lists for video discovery.
 *
 * YouTube: maps channel ID → human-readable label
 * Vimeo: maps user ID (string) → human-readable label
 *
 * A video whose channel appears in an authority list receives the 0.25 authority score bonus.
 * VFX-house channels also trigger automatic vfx_breakdown category assignment
 * regardless of title keywords.
 *
 * To add a VFX house: add it to VFX_HOUSE_YOUTUBE_CHANNELS or VFX_HOUSE_VIMEO_CHANNELS.
 * To add a non-VFX authority: add it directly to YOUTUBE_AUTHORITY_CHANNELS or VIMEO_AUTHORITY_CHANNELS.
 * The derived Set exports update automatically.
 */

// ── VFX house sub-records (source of truth for Set exports) ────────────────

const VFX_HOUSE_YOUTUBE: Record<string, string> = {
  'UCT0jMpCT_arLJlBBFdpSP5A': 'ILM',
  'UCqGMZKaMU7pMOi6f4R6c3iA': 'Weta Digital',
  'UCEjBr1BjDu4aW4r9Ev1RfWA': 'DNEG',
  'UCiQ2EKz7YFwHBMC5aKLXtaA': 'MPC Film',
  'UCxM4hOlbSEy4aMzXeRJbIuA': 'Framestore',
  'UCrVk8lCZZ5j2lBiGHcYQIiA': 'Rodeo FX',
  'UCi_DaFzOvPsjoP2Wy1-VQBA': 'Scanline VFX',
  'UCuSrRpFEoN9b8VZ-ZOgR1Tg': 'Rising Sun Pictures',
  'UCYEoFpU4p3hJQqBY9rF7V3Q': 'Luma Pictures',
};

const VFX_HOUSE_VIMEO: Record<string, string> = {
  '6415759': 'ILM',
  '22765372': 'Weta Digital',
  '5396634': 'DNEG',
  '3116364': 'MPC Film',
  '1579234': 'Framestore',
  '7041135': 'Rodeo FX',
};

// ── Exported authority maps (VFX houses + generalist + studios) ────────────

/** YouTube channel IDs → human-readable label */
export const YOUTUBE_AUTHORITY_CHANNELS: Record<string, string> = {
  ...VFX_HOUSE_YOUTUBE,

  // Generalist / editorial
  'UCSpFnDQr88xCZ80N-X7t0nQ': 'Corridor Crew',
  'UC2wfKFjB6hc4H8sYTT-G0zA': 'Corridor Digital',
  'UCHpKO7HjLOFCXoOjJFLTT_A': 'befores&afters',
  'UCkLiXCMUmO0K7kKlKl-iSpA': 'The Art of VFX',

  // Studios (official)
  'UCjmJDjHkXo4VJCkFjLME2dA': 'Warner Bros',
  'UCu4AkKRY17PLRzT5dKMKHXA': 'Universal Pictures',
  'UCF9imwFMN1vD54DtjBcJsYA': 'Paramount Pictures',
  'UCM9b6V4bMO0ACjnKGRbvKqA': 'Sony Pictures',
  'UCzWQYUVCpZqtN93H8RR44Qg': 'Walt Disney Studios',
  'UCJwoTxHkT4-q2BYqeVWFb7A': 'A24',
  'UCNbHJFv5pUBDcL5v1SFdhnA': 'Apple TV+',
  'UCi6WGj9HCmjCgiFVJqWGaFg': 'Netflix Film',
};

/** Vimeo user IDs (as strings) → human-readable label */
export const VIMEO_AUTHORITY_CHANNELS: Record<string, string> = {
  ...VFX_HOUSE_VIMEO,

  // Generalist / editorial
  '2600480': 'Corridor Crew',
  '14654697': 'befores&afters',
};

// ── VFX house Sets (derived — single source of truth above) ───────────────

/** Channel IDs that belong to known VFX houses — these force vfx_breakdown category */
export const VFX_HOUSE_YOUTUBE_CHANNELS = new Set(Object.keys(VFX_HOUSE_YOUTUBE));

export const VFX_HOUSE_VIMEO_CHANNELS = new Set(Object.keys(VFX_HOUSE_VIMEO));
