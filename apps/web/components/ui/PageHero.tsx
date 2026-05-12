import type { ReactNode } from 'react';

/**
 * Section-index hero. Replaces 5 ad-hoc variations across the index
 * pages (home, stunts, references, films, gear) that all rendered the
 * same anatomy with slightly different colour intensities and gradient
 * presence.
 *
 * `accent` controls the eyebrow-label colour + the optional top-glow
 * gradient. Set to 'none' to skip the gradient (used by neutral
 * sections like /films and /crew).
 *
 * `stats` is an optional grid of label/value pairs. `actions` is an
 * optional row of inline links that appears below the description.
 *
 * Layout invariants the caller doesn't need to think about:
 *   - Hero is `mb-10` (`mb-12` if stats are present)
 *   - Eyebrow is text-[10px] uppercase tracking-[0.25em]
 *   - Heading is font-serif text-5xl
 *   - Description has max-w-2xl
 */
export type PageHeroAccent = 'red' | 'amber' | 'purple' | 'blue' | 'emerald' | 'zinc' | 'none';

const ACCENT: Record<PageHeroAccent, { eyebrow: string; gradient: string | null }> = {
  red:     { eyebrow: 'text-red-500/80',     gradient: 'from-red-950/40' },
  amber:   { eyebrow: 'text-amber-500/80',   gradient: 'from-amber-950/40' },
  purple:  { eyebrow: 'text-purple-500/80',  gradient: 'from-purple-950/40' },
  blue:    { eyebrow: 'text-blue-500/80',    gradient: 'from-blue-950/40' },
  emerald: { eyebrow: 'text-emerald-500/80', gradient: 'from-emerald-950/40' },
  zinc:    { eyebrow: 'text-zinc-500',       gradient: null },
  none:    { eyebrow: 'text-zinc-500',       gradient: null },
};

export function PageHero({
  eyebrow,
  title,
  description,
  accent = 'zinc',
  stats,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  accent?: PageHeroAccent;
  stats?: ReactNode;
  actions?: ReactNode;
}) {
  const a = ACCENT[accent];
  const showGradient = a.gradient !== null;
  return (
    <header
      className={`relative overflow-hidden border-b border-zinc-800 pb-${stats ? '10' : '8'} ${stats ? 'mb-12' : 'mb-10'}`}
    >
      {showGradient && (
        <div
          aria-hidden
          className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${a.gradient} via-zinc-950/0 to-transparent`}
        />
      )}
      <div className="relative">
        <p className={`text-[11px] uppercase tracking-[0.25em] ${a.eyebrow}`}>
          {eyebrow}
        </p>
        <h1 className="mt-2 font-serif text-5xl leading-none text-zinc-50">{title}</h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            {description}
          </p>
        )}
        {stats && <div className="mt-6">{stats}</div>}
        {actions && (
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * Convenience wrapper for the common label/value stat tile used inside
 * the hero. Pure presentation; doesn't need to know the underlying data.
 */
export function PageHeroStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="font-mono text-2xl text-zinc-50 tabular-nums">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}
