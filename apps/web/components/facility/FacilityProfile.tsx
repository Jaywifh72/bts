import Link from 'next/link';

/**
 * Shared editorial-profile block for facility entities (sound houses,
 * scoring stages, VP volumes, sound libraries). Renders the same
 * `summary` + `tagline` + `headquarters/parent/employees` stats +
 * `careers/reel` links + `references` list pattern as the VFX house
 * detail page.
 *
 * Each detail page renders <FacilityProfile {...row} /> below its
 * hero + tech-spec section.
 */
export type FacilityProfileProps = {
  // Core editorial.
  summary?: string | null;
  tagline?: string | null;
  // Company metadata.
  headquarters?: string | null;
  parent_company?: string | null;
  employee_count?: number | null;
  // Outbound links.
  website_url?: string | null;
  website?: string | null;            // post_houses uses 'website'
  careers_url?: string | null;
  reel_url?: string | null;
  wikidata_id?: string | null;
  // Citation list (JSONB).
  references?: Array<{
    title: string;
    url: string;
    publication?: string;
    kind?: string;
  }> | null;
  // Curation provenance.
  data_tier?: string | null;
  curated_by?: string | null;
  curated_by_url?: string | null;
  last_verified_at?: string | null;
};

export function FacilityProfile(props: FacilityProfileProps) {
  const website = props.website_url ?? props.website ?? null;
  const refs = props.references ?? [];
  const hasCompanyMeta = Boolean(
    props.headquarters || props.parent_company || props.employee_count != null,
  );
  const hasLinks = Boolean(website || props.careers_url || props.reel_url || props.wikidata_id);
  const hasAnything = props.summary || props.tagline || hasCompanyMeta || hasLinks || refs.length > 0;

  if (!hasAnything) return null;

  // Split summary into paragraphs while preserving line breaks.
  const paragraphs = (props.summary ?? '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      {/* Tagline (single italic line under hero). */}
      {props.tagline && !props.summary && (
        <p className="mb-6 max-w-2xl text-sm italic text-zinc-400">{props.tagline}</p>
      )}

      {/* Editorial summary — paragraphs. */}
      {paragraphs.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">About</h2>
          <div className="max-w-3xl space-y-3 text-sm leading-relaxed text-zinc-300">
            {props.tagline && (
              <p className="text-base italic text-zinc-200">{props.tagline}</p>
            )}
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {/* Company metadata + outbound links. */}
      {(hasCompanyMeta || hasLinks) && (
        <section className="mb-8">
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Company</h2>
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {props.headquarters && (
              <div><dt className="text-zinc-500">Headquarters</dt><dd className="text-zinc-200">{props.headquarters}</dd></div>
            )}
            {props.parent_company && (
              <div><dt className="text-zinc-500">Parent company</dt><dd className="text-zinc-200">{props.parent_company}</dd></div>
            )}
            {props.employee_count != null && (
              <div>
                <dt className="text-zinc-500">Headcount</dt>
                <dd className="font-mono text-zinc-200">~{props.employee_count.toLocaleString()}</dd>
              </div>
            )}
            {website && (
              <div>
                <dt className="text-zinc-500">Website</dt>
                <dd>
                  <a href={website} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
                    {website.replace(/^https?:\/\//, '').replace(/\/$/, '')} <span aria-hidden="true">↗</span>
                  </a>
                </dd>
              </div>
            )}
            {props.careers_url && (
              <div>
                <dt className="text-zinc-500">Careers</dt>
                <dd>
                  <a href={props.careers_url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
                    Open roles <span aria-hidden="true">↗</span>
                  </a>
                </dd>
              </div>
            )}
            {props.reel_url && (
              <div>
                <dt className="text-zinc-500">Reel</dt>
                <dd>
                  <a href={props.reel_url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
                    View reel <span aria-hidden="true">↗</span>
                  </a>
                </dd>
              </div>
            )}
            {props.wikidata_id && (
              <div>
                <dt className="text-zinc-500">Wikidata</dt>
                <dd>
                  <a
                    href={`https://www.wikidata.org/wiki/${props.wikidata_id}`}
                    target="_blank" rel="noopener noreferrer"
                    className="font-mono text-zinc-400 hover:text-amber-400"
                  >
                    {props.wikidata_id}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* References / sources. */}
      {refs.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">References</h2>
          <ul className="space-y-1.5 text-sm">
            {refs.map((r, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                <a
                  href={r.url}
                  target="_blank" rel="noopener noreferrer"
                  className="text-zinc-200 hover:text-amber-400"
                >
                  {r.title}
                </a>
                {r.publication && (
                  <span className="text-xs text-zinc-500">— {r.publication}</span>
                )}
                {r.kind && (
                  <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                    {r.kind}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Provenance footer — curated by / last verified. */}
      {(props.curated_by || props.last_verified_at) && (
        <p className="mb-12 text-[11px] text-zinc-500">
          {props.curated_by && (
            <>
              Curated by{' '}
              {props.curated_by_url ? (
                <a href={props.curated_by_url} className="text-amber-400/80 hover:text-amber-400">
                  {props.curated_by}
                </a>
              ) : (
                <span className="text-zinc-300">{props.curated_by}</span>
              )}
            </>
          )}
          {props.curated_by && props.last_verified_at && ' · '}
          {props.last_verified_at && (
            <>
              Last verified{' '}
              <time dateTime={props.last_verified_at} className="font-mono">
                {props.last_verified_at.slice(0, 10)}
              </time>
            </>
          )}
        </p>
      )}
    </>
  );
}
