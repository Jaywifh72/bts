import { VFX_HOUSE_YOUTUBE_CHANNELS, VFX_HOUSE_VIMEO_CHANNELS } from './channels.ts';

type VideoCategory =
  | 'vfx_breakdown' | 'compositing' | 'making_of' | 'behind_the_scenes'
  | 'director_interview' | 'dp_interview' | 'production_design'
  | 'stunts' | 'sound' | 'music' | 'other';

interface CategoriseInput {
  source: 'youtube' | 'vimeo';
  channelId: string | null;
  title: string;
}

/**
 * Keyword lists per category. Checked in priority order.
 *
 * Ordering rules:
 *   - compositing before vfx_breakdown — "compositing breakdown"
 *     should not be swallowed by the broader "breakdown" keyword.
 *   - stunts before making_of and behind_the_scenes — a video
 *     titled "BTS — Stunt Coordination" or "Making of the Mission
 *     Impossible Stunts" is fundamentally a stunt video, not a
 *     generic BTS or making-of. The previous order produced 0
 *     stunt-categorised rows in the entire corpus.
 *   - vfx_breakdown after stunts so "stunt breakdown" doesn't get
 *     swallowed; the "breakdown" keyword is broad.
 */
const KEYWORD_CATEGORIES: Array<{ category: VideoCategory; keywords: string[] }> = [
  {
    category: 'compositing',
    keywords: ['compositing', 'nuke', 'colour grade', 'color grade'],
  },
  {
    category: 'stunts',
    keywords: [
      // Bare 'stunt' covers stunt/stunts/coordinator/double/sequence.
      'stunt',
      // Bare 'fight' / 'fights' is broad but in a film-discovery
      // context (titles already scoped to a production) almost
      // always indicates stunt or fight-choreography content.
      'fight', 'fights',
      // Common chase / action-sequence vocabulary.
      'car chase', 'chase scene', 'chase sequence',
      'action design', 'action choreography', 'action sequence',
      'action set piece', 'action set-piece',
      // Specific rigs / choreography languages from the rigging glossary.
      'cannon roll', 'high fall', 'wirework', 'wire work',
      'free fall',
      // Working studio / coordinator vocabulary.
      '87eleven', '87 eleven',
      'gun fu', 'gun-fu', 'martial arts choreography',
    ],
  },
  {
    category: 'vfx_breakdown',
    keywords: ['vfx', 'visual effects', 'breakdown', 'cgi'],
  },
  {
    category: 'making_of',
    keywords: ['making of', 'making-of', 'the making'],
  },
  {
    category: 'behind_the_scenes',
    keywords: ['behind the scenes', 'bts', 'on set', 'onset'],
  },
  {
    category: 'dp_interview',
    keywords: ['cinematography', 'director of photography', 'dp', 'cameraman', 'lenses'],
  },
  {
    category: 'director_interview',
    keywords: ['director', 'directed by'],
  },
  {
    category: 'production_design',
    keywords: ['production design', 'set design', 'art department'],
  },
  {
    category: 'sound',
    keywords: ['sound design', 'score', 'audio'],
  },
  {
    category: 'music',
    keywords: ['soundtrack', 'composer', 'musical score'],
  },
];

export function categoriseVideo(input: CategoriseInput): VideoCategory {
  const { source, channelId, title } = input;

  // 1. VFX house channel identity — wins regardless of title
  if (channelId) {
    if (source === 'youtube' && VFX_HOUSE_YOUTUBE_CHANNELS.has(channelId)) {
      return 'vfx_breakdown';
    }
    if (source === 'vimeo' && VFX_HOUSE_VIMEO_CHANNELS.has(channelId)) {
      return 'vfx_breakdown';
    }
  }

  // 2. Title keyword matching (compositing checked first)
  const lowerTitle = title.toLowerCase();
  for (const { category, keywords } of KEYWORD_CATEGORIES) {
    if (keywords.some((kw) => lowerTitle.includes(kw))) {
      return category;
    }
  }

  // 3. Fallback
  return 'other';
}
