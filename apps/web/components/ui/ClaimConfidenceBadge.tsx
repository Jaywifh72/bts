import type { ClaimConfidence } from '@bts/db';
import { EnumBadge } from './EnumBadge';

const CONFIDENCE_TONE: Record<ClaimConfidence, string> = {
  primary: 'border-zinc-200 bg-zinc-50 text-zinc-900',
  secondary: 'border-zinc-600 bg-zinc-900 text-zinc-300',
  manufacturer: 'border-amber-600/60 bg-amber-950/35 text-amber-300',
  rental_house: 'border-cyan-700/60 bg-cyan-950/35 text-cyan-300',
  bts_visual: 'border-indigo-700/60 bg-indigo-950/35 text-indigo-300',
  inferred: 'border-zinc-700 border-dashed bg-transparent text-zinc-400',
  speculative: 'border-orange-700/60 border-dashed bg-orange-950/30 text-orange-300',
  conflicting: 'border-red-700/60 bg-red-950/35 text-red-300',
};

// A11y: non-color cue so manufacturer/rental_house/bts_visual aren't
// distinguished only by hue. Glyphs are rendered with aria-hidden inside
// EnumBadge — the label text remains the accessible name.
const CONFIDENCE_GLYPH: Record<ClaimConfidence, string> = {
  primary:      '★',
  secondary:    '◆',
  manufacturer: '⚒',
  rental_house: '⌂',
  bts_visual:   '◉',
  inferred:     '◇',
  speculative:  '?',
  conflicting:  '⚠',
};

export function ClaimConfidenceBadge({ confidence }: { confidence: ClaimConfidence }) {
  return (
    <EnumBadge
      label={confidence.replace(/_/g, ' ')}
      tone={CONFIDENCE_TONE[confidence]}
      icon={CONFIDENCE_GLYPH[confidence]}
      size="sm"
    />
  );
}
