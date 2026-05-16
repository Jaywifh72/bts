/**
 * E-48 — single badge surfacing a production's citation rigor as a 0-100
 * score with per-tier counts on hover. The colour ladder mirrors how a
 * working pro would read it: amber = strongly-sourced, zinc-blue =
 * adequately-sourced, red-orange = lean-heavy-on-marketing-claims.
 *
 * Self-hides when the production has no attributions (would render a
 * meaningless 0 otherwise).
 *
 * Renamed from `ConfidenceBadge` during the QA pass — the old name
 * collided with `ClaimConfidenceBadge`, which is a completely different
 * component (8-value enum badge for individual claim attributions).
 *
 * Brand-system pass — the leading 0/25/50/75/100 confidence glyph
 * (CineCanon brand primitive) sits left of the score so the rigor tier
 * is scannable at a glance across long lists. The glyph's level is
 * bucketed from `score` via `confidenceLevelFromScore`; bucket
 * boundaries match this file's tier-label ladder so the two never
 * disagree.
 */
import { ConfidenceMark } from '@/components/brand/ConfidenceMark';
import { confidenceLevelFromScore } from '@/components/brand/confidence-paths';

export type CitationRigorData = {
  score: number;
  total: number;
  primary_count: number;
  secondary_count: number;
  manufacturer_count: number;
  speculative_count: number;
};

function tierStyle(score: number): { bg: string; text: string; label: string } {
  if (score >= 85) return { bg: 'bg-amber-900/40 border border-amber-700/50', text: 'text-amber-300', label: 'Well-cited' };
  if (score >= 70) return { bg: 'bg-emerald-900/40 border border-emerald-700/50', text: 'text-emerald-300', label: 'Cited' };
  if (score >= 50) return { bg: 'bg-blue-900/40 border border-blue-700/50', text: 'text-blue-300', label: 'Lightly cited' };
  return { bg: 'bg-zinc-800 border border-zinc-700', text: 'text-zinc-400', label: 'Sparse citations' };
}

export function CitationRigorBadge({ data }: { data: CitationRigorData | null }) {
  if (!data) return null;
  const style = tierStyle(data.score);
  const tooltip = [
    data.primary_count && `${data.primary_count} primary`,
    data.secondary_count && `${data.secondary_count} secondary`,
    data.manufacturer_count && `${data.manufacturer_count} manufacturer`,
    data.speculative_count && `${data.speculative_count} speculative`,
  ].filter(Boolean).join(' · ');
  const level = confidenceLevelFromScore(data.score);
  return (
    <span
      className={`inline-flex items-center gap-2 rounded px-2 py-0.5 text-xs ${style.bg} ${style.text}`}
      title={`Citation rigor — ${tooltip}. Higher means more primary sources per claim.`}
      aria-label={`Citation confidence: ${style.label} (${data.score} of 100, ${data.total} sources)`}
    >
      <ConfidenceMark
        level={level}
        subject="Citation rigor"
        size="body"
        title={tooltip || `${data.total} source${data.total === 1 ? '' : 's'}`}
      />
      <span className="font-mono">{data.score}</span>
      <span className="text-[10px] uppercase tracking-wide">{style.label}</span>
    </span>
  );
}
