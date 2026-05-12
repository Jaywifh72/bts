import type { ReactNode } from 'react';

/**
 * Single render-path for every enum-valued status / kind / category /
 * confidence pill in the app. Three thin wrappers (`Badge`,
 * `ClaimConfidenceBadge`, `ClaimStatusBadge`) delegate to this — they
 * exist for ergonomic call sites + enum type-checking. The visual
 * shape (border, radius, font weight, tracking, padding) lives here in
 * one place.
 *
 * `tone` is the Tailwind class string for border/bg/text — no
 * semantic mapping, just the rendered colour. Each caller wrapper
 * owns the enum → tone lookup.
 */
export type EnumBadgeSize = 'sm' | 'md';

const SIZE_CLASSES: Record<EnumBadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px] tracking-wide',
  md: 'px-2 py-0.5 text-xs',
};

export function EnumBadge({
  label,
  tone,
  size = 'sm',
  icon,
  uppercase = true,
  className = '',
}: {
  label: string;
  /** Tailwind classes for border/bg/text colour — caller supplies the semantic mapping. */
  tone: string;
  size?: EnumBadgeSize;
  icon?: ReactNode;
  /** Defaults to true (the canonical enum-pill look). Pass false for proper-cased labels. */
  uppercase?: boolean;
  className?: string;
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded border font-medium',
        SIZE_CLASSES[size],
        uppercase ? 'uppercase' : '',
        tone,
        className,
      ].filter(Boolean).join(' ')}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {label}
    </span>
  );
}
