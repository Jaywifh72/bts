import type { ClaimSourceRow } from '@bts/db';
import { ClaimConfidenceBadge } from './ClaimConfidenceBadge';

function isRotted(status: number | null): boolean {
  return status !== null && (status === 0 || status >= 400);
}

function isStale(checkedAt: string | null): boolean {
  if (!checkedAt) return true;
  const checked = new Date(checkedAt).getTime();
  if (Number.isNaN(checked)) return true;
  return Date.now() - checked > 30 * 86_400_000;
}

export function SourcesForClaim({ sources }: { sources: readonly ClaimSourceRow[] }) {
  if (sources.length === 0) {
    return <p className="mt-2 text-xs text-zinc-600">No source attached yet.</p>;
  }

  return (
    <ul className="mt-2 space-y-2">
      {sources.map((source) => {
        const url = isRotted(source.last_status) ? source.archive_url : (source.url ?? source.archive_url);
        return (
          <li key={source.id} className="border-l border-zinc-800 pl-3 text-xs text-zinc-500">
            <div className="flex flex-wrap items-baseline gap-2">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-zinc-300 hover:text-amber-400"
                >
                  {source.title}
                </a>
              ) : (
                <span className="font-medium text-zinc-300">{source.title}</span>
              )}
              <ClaimConfidenceBadge confidence={source.confidence} />
              {source.timestamp_seconds !== null && (
                <span className="font-mono text-zinc-600">
                  {Math.floor(source.timestamp_seconds / 60)}:{String(source.timestamp_seconds % 60).padStart(2, '0')}
                </span>
              )}
              {source.page_number !== null && (
                <span className="font-mono text-zinc-600">p. {source.page_number}</span>
              )}
              {isRotted(source.last_status) && (
                <span className="text-red-400">original link rotted</span>
              )}
              {!isRotted(source.last_status) && source.url && isStale(source.last_checked_at) && (
                <span className="text-amber-300">stale check</span>
              )}
              {source.paywall_status !== 'unknown' && source.paywall_status !== 'open' && (
                <span className="text-zinc-500">{source.paywall_status.replace(/_/g, ' ')}</span>
              )}
            </div>
            <div className="mt-0.5">
              {[source.publication, source.author, source.published_at].filter(Boolean).join(' / ')}
            </div>
            {source.quote && (
              <blockquote className="mt-1 text-zinc-400">&quot;{source.quote}&quot;</blockquote>
            )}
          </li>
        );
      })}
    </ul>
  );
}
