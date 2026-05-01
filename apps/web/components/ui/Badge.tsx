type BadgeVariant =
  | 'confidence-primary'
  | 'confidence-secondary'
  | 'confidence-manufacturer'
  | 'confidence-speculative'
  | 'category'
  | 'type'
  | 'status'
  | 'default';

const variantClasses: Record<BadgeVariant, string> = {
  'confidence-primary':
    'bg-zinc-50 text-zinc-900 border border-zinc-300',
  'confidence-secondary':
    'bg-transparent text-zinc-400 border border-zinc-600',
  'confidence-manufacturer':
    'bg-amber-400/10 text-amber-400 border border-amber-400/30',
  'confidence-speculative':
    'bg-transparent text-zinc-500 border border-dashed border-zinc-600',
  category:
    'bg-zinc-800 text-zinc-300 border border-zinc-700',
  type:
    'bg-zinc-800 text-zinc-300 border border-zinc-700',
  status:
    'bg-zinc-800 text-zinc-300 border border-zinc-700',
  default:
    'bg-zinc-800 text-zinc-300 border border-zinc-700',
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: string;
}

export function Badge({ label, variant = 'default', icon }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${variantClasses[variant]}`}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {label}
    </span>
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
