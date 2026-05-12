import type { ClaimStatus } from '@bts/db';
import { EnumBadge } from './EnumBadge';

const STATUS_TONE: Record<ClaimStatus, string> = {
  candidate: 'border-zinc-700 bg-zinc-800 text-zinc-300',
  needs_source: 'border-red-800/70 bg-red-950/40 text-red-300',
  sourced: 'border-blue-700/60 bg-blue-950/40 text-blue-300',
  reviewed: 'border-violet-700/60 bg-violet-950/35 text-violet-300',
  verified: 'border-emerald-700/60 bg-emerald-950/35 text-emerald-300',
  disputed: 'border-amber-700/70 bg-amber-950/40 text-amber-300',
  deprecated: 'border-zinc-700 bg-zinc-900 text-zinc-500',
  rejected: 'border-zinc-700 bg-zinc-950 text-zinc-600 line-through',
};

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <EnumBadge
      label={status.replace(/_/g, ' ')}
      tone={STATUS_TONE[status]}
      size="sm"
    />
  );
}
