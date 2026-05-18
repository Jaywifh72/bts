import Link from 'next/link';

export type PartnershipsListProps = {
  /** Partnerships involving the current person — from listPartnershipsForPerson. */
  partnerships: Array<{
    slug: string;
    primary_slug: string;
    primary_name: string;
    partner_slug: string;
    partner_name: string;
    partner_role: string;
    arc_summary: string | null;
    film_count: number;
    year_first: number | null;
    year_last: number | null;
  }>;
  /** Slug of the current person — so we render the OTHER person's name as the link. */
  currentSlug: string;
};

export function PartnershipsList({ partnerships, currentSlug }: PartnershipsListProps) {
  if (partnerships.length === 0) return null;
  return (
    <div className="mb-8">
      <p className="mb-2 text-[10px] uppercase tracking-widest text-amber-500/80">
        Long-term partnerships
      </p>
      <ul className="space-y-2 text-sm">
        {partnerships.map((p) => {
          const isPrimary = p.primary_slug === currentSlug;
          const otherSlug = isPrimary ? p.partner_slug : p.primary_slug;
          const otherName = isPrimary ? p.partner_name : p.primary_name;
          const yearRange = p.year_first && p.year_last
            ? (p.year_first === p.year_last ? `${p.year_first}` : `${p.year_first}–${p.year_last}`)
            : null;
          return (
            <li key={p.slug} className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <Link href={`/partnerships/${p.slug}`} className="font-medium text-zinc-100 hover:text-amber-400">
                  with <Link href={`/crew/${otherSlug}`} className="text-amber-400 hover:text-amber-300">{otherName}</Link>
                </Link>
                <span className="text-xs text-zinc-400">({p.partner_role})</span>
                <span className="ml-auto flex items-baseline gap-3 font-mono text-xs">
                  <span className="text-amber-400">{p.film_count}</span>
                  <span className="text-zinc-500">{p.film_count === 1 ? 'film' : 'films'}</span>
                  {yearRange && <span className="text-zinc-500">· {yearRange}</span>}
                </span>
              </div>
              {p.arc_summary && (
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  {(p.arc_summary.split(/\n\n+/)[0] ?? '').slice(0, 240)}
                  {p.arc_summary.length > 240 && '…'}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
