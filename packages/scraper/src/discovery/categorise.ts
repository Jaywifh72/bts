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
 * compositing MUST be checked before vfx_breakdown to avoid being swallowed.
 */
const KEYWORD_CATEGORIES: Array<{ category: VideoCategory; keywords: string[] }> = [
  {
    category: 'compositing',
    keywords: ['compositing', 'nuke', 'colour grade', 'color grade'],
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
    category: 'stunts',
    keywords: ['stunts', 'stunt'],
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
