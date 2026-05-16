import { Badge, confidenceBadgeVariant } from './Badge';
import { SectionHeader } from './SectionHeader';

type Source = {
  number: number;
  id: number;
  title: string;
  publication: string | null;
  author: string | null;
  published_at: string | null;
  url: string | null;
  archive_url: string | null;
  confidence: string;
  /** E-47 — last HTTP status from the link-rot monitor. null = never checked. */
  last_status: number | null;
};

function isRotted(status: number | null): boolean {
  return status !== null && (status === 0 || status >= 400);
}

/**
 * Numbered bibliography rendered at the bottom of the production page.
 * Each entry has a stable `id="source-N"` anchor so inline `[N]` markers
 * (rendered by `<CitationMarker>`) can scroll to it.
 */
export function SourcesList({ sources }: { sources: readonly Source[] }) {
  if (sources.length === 0) return null;
  return (
    <section id="sources" className="mt-10 scroll-mt-6 border-t border-zinc-800 pt-6">
      <SectionHeader label="Provenance" heading="Sources" anchorId="sources" />
      <ol className="mt-2 space-y-3 text-sm text-zinc-400">
        {sources.map((s) => (
          <li
            id={`source-${s.number}`}
            key={s.id}
            className="scroll-mt-6 border-l border-zinc-800 pl-3"
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-xs text-amber-300">[{s.number}]</span>
              <span className="font-medium text-zinc-200">{s.title}</span>
              <Badge
                label={s.confidence.replace('_', ' ')}
                variant={confidenceBadgeVariant(s.confidence)}
              />
            </div>
            <div className="mt-0.5 text-xs text-zinc-400">
              {[s.publication, s.author, s.published_at].filter(Boolean).join(' · ')}
              {(s.url || s.archive_url) && (
                <>
                  {(s.publication || s.author || s.published_at) && ' · '}
                  {/* E-47 — when the original URL has rotted, route the
                      reader to the Wayback snapshot if we have one and
                      flag the broken state. */}
                  {isRotted(s.last_status) ? (
                    <>
                      <span
                        className="text-red-400"
                        title={`Original returned ${s.last_status === 0 ? 'network error' : 'HTTP ' + s.last_status} on last check`}
                      >
                        <span aria-hidden="true">⚠ </span>link rotted (broken)
                      </span>
                      {s.archive_url && (
                        <>
                          {' · '}
                          <a
                            href={s.archive_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 hover:underline"
                          >
                            archive <span aria-hidden="true">↗</span>
                          </a>
                        </>
                      )}
                    </>
                  ) : (
                    <a
                      href={s.url ?? s.archive_url ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:underline"
                    >
                      {s.url ? 'link' : 'archive'} <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
