import { Badge, confidenceBadgeVariant } from './Badge';

interface Source {
  title: string;
  publication: string | null;
  author: string | null;
  published_at: string | null;
  url: string | null;
  archive_url: string | null;
  confidence: string;
  claim_quote: string | null;
}

interface SourceCitationProps {
  sources: Source[];
}

function highestConfidence(sources: Source[]): string {
  const order = ['primary', 'secondary', 'manufacturer_marketing', 'speculative'];
  for (const conf of order) {
    if (sources.some((s) => s.confidence === conf)) return conf;
  }
  return sources[0]?.confidence ?? 'secondary';
}

export function SourceCitation({ sources }: SourceCitationProps) {
  if (sources.length === 0) return null;

  const topConf = highestConfidence(sources);
  const label = `${sources.length} source${sources.length > 1 ? 's' : ''}`;

  return (
    <details className="mt-1">
      <summary className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300">
        {label}
        <Badge label={topConf.replace('_', ' ')} variant={confidenceBadgeVariant(topConf)} />
      </summary>
      <ul className="mt-2 space-y-3 pl-2">
        {sources.map((s, i) => (
          <li key={i} className="border-l border-zinc-800 pl-3 text-xs text-zinc-400">
            <p className="font-medium text-zinc-300">{s.title}</p>
            {s.publication && <p>{s.publication}{s.author ? ` — ${s.author}` : ''}</p>}
            {s.published_at && <p>Published {s.published_at}</p>}
            {(s.url || s.archive_url) && (
              <a
                href={s.url ?? s.archive_url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:underline"
              >
                {s.url ? 'Source' : 'Archive'}
              </a>
            )}
            {s.claim_quote && (
              <blockquote className="mt-1 border-l border-zinc-700 pl-2 italic text-zinc-500">
                "{s.claim_quote}"
              </blockquote>
            )}
            <Badge
              label={s.confidence.replace('_', ' ')}
              variant={confidenceBadgeVariant(s.confidence)}
            />
            {s.confidence === 'manufacturer_marketing' && (
              <span className="ml-1 text-amber-400" aria-label="Manufacturer claim">⚠</span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
