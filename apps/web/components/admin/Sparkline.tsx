/**
 * Inline-SVG sparkline. No JS, no chart-lib dep — server-rendered, accessible.
 *
 * Renders a smooth area under the curve plus a foreground line. Designed for
 * dense /admin/aeo tiles, so it auto-adapts to the container width and stays
 * useful at heights as small as 28px.
 *
 * Empty/short data series render an "—" placeholder instead of a degenerate
 * line, so callers can pass raw query results without guards.
 */

export interface SparklineProps {
  /** Numeric series, oldest first. */
  values: ReadonlyArray<number>;
  /** Optional matching x labels (e.g. dates), shown only in the SR-text. */
  labels?: ReadonlyArray<string>;
  /** SVG width in px (defaults to 160). Stretches if not specified. */
  width?: number;
  /** SVG height in px. Defaults to 36. */
  height?: number;
  /** Stroke color (CSS color, including hex with leading #). */
  color?: string;
  /** Optional area-fill color. Defaults to a 12% alpha of the stroke. */
  fillColor?: string;
  /** A11y label describing what the series represents. */
  ariaLabel: string;
  /** Hide the final-value dot. */
  hideDot?: boolean;
}

export function Sparkline({
  values,
  labels,
  width = 160,
  height = 36,
  color = '#f59e0b',
  fillColor,
  ariaLabel,
  hideDot = false,
}: SparklineProps) {
  if (!values || values.length < 2) {
    return (
      <span
        aria-label={`${ariaLabel}: insufficient data`}
        className="inline-block font-mono text-xs text-zinc-500"
        style={{ minWidth: width, height }}
      >
        —
      </span>
    );
  }

  // Pad to avoid edge artifacts when stroke-width > 1.
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const stepX = values.length > 1 ? w / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / span) * h;
    return [x, y] as const;
  });

  // Build a smooth path using bezier control-point smoothing
  // (Catmull-Rom-ish; keeps tangents soft without spline lib).
  let linePath = `M ${points[0]![0]} ${points[0]![1]}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1]!;
    const [cx, cy] = points[i]!;
    const midX = (px + cx) / 2;
    linePath += ` Q ${px} ${py} ${midX} ${(py + cy) / 2} T ${cx} ${cy}`;
  }
  const areaPath = `${linePath} L ${points[points.length - 1]![0]} ${height} L ${points[0]![0]} ${height} Z`;

  const finalPoint = points[points.length - 1]!;
  const lastValue = values[values.length - 1]!;
  const lastLabel = labels?.[labels.length - 1];

  // Compute area fill with alpha if not provided.
  const area = fillColor ?? withAlpha(color, 0.14);

  return (
    <svg
      role="img"
      aria-label={`${ariaLabel}: ${describeTrend(values)} — latest ${formatVal(lastValue)}${lastLabel ? ` at ${lastLabel}` : ''}`}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      className="block"
    >
      <path d={areaPath} fill={area} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {!hideDot && (
        <circle cx={finalPoint[0]} cy={finalPoint[1]} r={2.5} fill={color} />
      )}
    </svg>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const c = hex.replace(/^#/, '');
  if (c.length !== 6) return hex;
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `#${c}${a}`;
}

function formatVal(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

function describeTrend(values: ReadonlyArray<number>): string {
  if (values.length < 2) return 'flat';
  const first = values[0]!;
  const last = values[values.length - 1]!;
  if (Math.abs(last - first) < 0.0001) return 'flat';
  const pct = first === 0 ? Infinity : ((last - first) / Math.abs(first)) * 100;
  if (pct === Infinity) return 'climbing from zero';
  if (pct > 0) return `up ${pct.toFixed(0)}%`;
  return `down ${Math.abs(pct).toFixed(0)}%`;
}
