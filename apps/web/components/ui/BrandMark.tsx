import { getBrandMark } from '@/lib/brand-marks';

type Size = 'sm' | 'md' | 'lg';

interface BrandMarkProps {
  slug: string;
  /** Used as the wordmark text when the slug isn't in the registry. */
  fallbackText?: string;
  size?: Size;
  /** Override the rendered text (e.g. show the manufacturer's full name). */
  text?: string;
  className?: string;
}

// Fixed-width tiles so the card grid stays evenly aligned regardless
// of mark text length. Long brand names shrink to fit; short marks
// (ARRI, MPC) sit centered with breathing room.
const SIZE_CLASSES: Record<Size, { tile: string; text: string }> = {
  sm: { tile: 'h-12 w-20 px-2',  text: 'text-sm'  },
  md: { tile: 'h-16 w-24 px-2',  text: 'text-base' },
  lg: { tile: 'h-20 w-28 px-3',  text: 'text-xl'  },
};

const FAMILY_CLASS: Record<'serif' | 'sans' | 'mono', string> = {
  serif: 'font-serif',
  sans:  'font-sans',
  mono:  'font-mono',
};

/**
 * Renders a typographic brand wordmark for the gear + VFX archive
 * cards. Uses brand-appropriate typeface, weight, case, tracking, and
 * accent color from `lib/brand-marks.ts`. The tile background is a
 * subtle dark gradient so the colored text reads on light AND dark
 * backgrounds without us shipping per-brand artwork.
 */
export function BrandMark({ slug, fallbackText, size = 'md', text, className = '' }: BrandMarkProps) {
  const mark = getBrandMark(slug, fallbackText);
  const sizeCls = SIZE_CLASSES[size];
  const display = text ?? mark.text;

  // Letter-case treatment.
  const cased =
    mark.case === 'upper' ? display.toUpperCase() :
    mark.case === 'small-caps' ? display : display;

  return (
    <div
      aria-hidden
      className={[
        'inline-flex items-center justify-center overflow-hidden rounded',
        'border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950',
        'shadow-inner',
        sizeCls.tile,
        className,
      ].join(' ')}
    >
      <span
        className={[
          'truncate leading-none',
          FAMILY_CLASS[mark.family],
          sizeCls.text,
        ].join(' ')}
        style={{
          color: mark.color,
          fontWeight: mark.weight,
          letterSpacing: `${mark.tracking}em`,
          fontStyle: mark.italic ? 'italic' : 'normal',
          textShadow: '0 1px 0 rgba(0,0,0,0.4)',
        }}
      >
        {cased}
      </span>
    </div>
  );
}
