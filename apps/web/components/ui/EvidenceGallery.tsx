import type { EvidenceItem } from '@bts/db';

function label(value: string): string {
  return value.replace(/_/g, ' ');
}

function formatTimestamp(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function EvidenceGallery({ evidence }: { evidence: readonly EvidenceItem[] }) {
  if (evidence.length === 0) return null;

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {evidence.map((item) => {
        const mediaUrl = item.thumbnail_url ?? item.asset_url;
        return (
          <div key={item.id} className="border border-zinc-800 bg-zinc-950/35 p-2">
            {mediaUrl && (
              <a
                href={item.asset_url ?? mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2 block overflow-hidden bg-zinc-950"
              >
                <img
                  src={mediaUrl}
                  alt=""
                  className="aspect-video w-full object-cover opacity-90"
                  loading="lazy"
                />
              </a>
            )}
            <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-600">
              <span>{label(item.kind)}</span>
              {item.review_status === 'pending' && <span>pending review</span>}
              {item.timestamp_seconds !== null && (
                <span className="font-mono">{formatTimestamp(item.timestamp_seconds)}</span>
              )}
              {item.page_number !== null && (
                <span className="font-mono">p. {item.page_number}</span>
              )}
            </div>
            {item.caption && (
              <p className="mt-1 text-xs text-zinc-400">{item.caption}</p>
            )}
            {item.source_title && (
              <p className="mt-1 truncate text-[11px] text-zinc-600">{item.source_title}</p>
            )}
            {item.rights_note && (
              <p className="mt-1 text-[11px] text-zinc-700">{item.rights_note}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
