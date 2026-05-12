import { EnumBadge } from './EnumBadge';

/**
 * Legacy badge with a small fixed variant set. New code should prefer
 * EnumBadge directly with an explicit `tone` string — that lets the
 * caller carry the semantic mapping rather than expanding this union.
 */
type BadgeVariant =
  | 'confidence-primary'
  | 'confidence-secondary'
  | 'confidence-manufacturer'
  | 'confidence-speculative'
  | 'category'
  | 'type'
  | 'status'
  | 'default';

const variantTone: Record<BadgeVariant, string> = {
  'confidence-primary':
    'bg-zinc-50 text-zinc-900 border-zinc-300',
  'confidence-secondary':
    'bg-transparent text-zinc-400 border-zinc-600',
  'confidence-manufacturer':
    'bg-amber-400/10 text-amber-400 border-amber-400/30',
  'confidence-speculative':
    'bg-transparent text-zinc-500 border-dashed border-zinc-600',
  category:
    'bg-zinc-800 text-zinc-300 border-zinc-700',
  type:
    'bg-zinc-800 text-zinc-300 border-zinc-700',
  status:
    'bg-zinc-800 text-zinc-300 border-zinc-700',
  default:
    'bg-zinc-800 text-zinc-300 border-zinc-700',
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: string;
}

export function Badge({ label, variant = 'default', icon }: BadgeProps) {
  return (
    <EnumBadge
      label={label}
      tone={variantTone[variant]}
      icon={icon}
      size="md"
      uppercase={false}
    />
  );
}

export function confidenceBadgeVariant(confidence: string): BadgeVariant {
  switch (confidence) {
    case 'primary': return 'confidence-primary';
    case 'secondary': return 'confidence-secondary';
    case 'manufacturer_marketing': return 'confidence-manufacturer';
    case 'speculative': return 'confidence-speculative';
    default: return 'default';
  }
}
