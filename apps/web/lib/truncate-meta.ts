/**
 * Truncate a long string to fit a meta description / og:description
 * without breaking mid-word. Prefers sentence boundaries, then word
 * boundaries; appends an ellipsis only if truncation actually occurred.
 *
 * Default max is 155 (Google currently truncates SERP descriptions
 * around 158 on desktop). Returns undefined for null/empty input so
 * Next.js drops the tag entirely instead of emitting an empty one.
 */
export function truncateForMeta(text: string | null | undefined, max = 155): string | undefined {
  if (!text) return undefined;
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;

  const window = trimmed.slice(0, max);
  const lastSentence = Math.max(
    window.lastIndexOf('. '),
    window.lastIndexOf('! '),
    window.lastIndexOf('? '),
  );
  if (lastSentence >= max * 0.6) {
    return window.slice(0, lastSentence + 1);
  }
  const lastSpace = window.lastIndexOf(' ');
  const cut = lastSpace > 0 ? window.slice(0, lastSpace) : window;
  return `${cut.replace(/[.,;:!?\s]+$/, '')}…`;
}
