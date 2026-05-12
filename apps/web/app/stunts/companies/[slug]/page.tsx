import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  db,
  listStuntCompanies,
  getStuntCompanyBySlug,
  listCompanyMembers,
  listCompanyProductions,
} from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { PersonAvatar } from '@/components/people/PersonAvatar';
import { JsonLd, buildOrganizationJsonLd } from '@/lib/jsonLd';
import { posterUrl } from '@/lib/tmdb-image';

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const rows = await listStuntCompanies(db);
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const c = await getStuntCompanyBySlug(db, params.slug);
  if (!c) return {};
  return {
    title: c.name,
    description: c.tagline ?? c.summary?.split('\n')[0]?.slice(0, 160) ?? undefined,
  };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-serif text-2xl text-zinc-50">{value}</div>
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}

export default async function StuntCompanyPage(props: Props) {
  const params = await props.params;
  const c = await getStuntCompanyBySlug(db, params.slug);
  if (!c) notFound();

  // Phase-8 — pull members + productions in parallel with the
  // existing company fetch so the page renders in one DB roundtrip
  // wave rather than chained queries.
  const [members, productions] = await Promise.all([
    listCompanyMembers(db, c.slug),
    listCompanyProductions(db, c.slug, 60),
  ]);
  const principals = members.filter((m) => m.is_principal);
  const otherMembers = members.filter((m) => !m.is_principal);

  const jsonLd = buildOrganizationJsonLd({
    slug: `stunt-company-${c.slug}`,
    name: c.name,
    website: c.website,
    country: c.country,
  });

  const paragraphs = (c.summary ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      <JsonLd data={jsonLd} />
      <article>
        {/* Header band — red-accented to maintain section identity. */}
        <header className="relative mb-10 overflow-hidden border-b border-zinc-800 pb-8">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-red-950/40 via-zinc-950/0 to-transparent"
          />
          <div className="relative">
            <p className="text-xs text-zinc-500">
              <Link href="/stunts" className="hover:text-amber-400">Stunts</Link>
              {' › '}
              <span className="text-zinc-600">Companies</span>
              {' › '}
            </p>
            <div className="mt-3 flex items-start gap-5">
              <BrandLogo
                slug={c.slug}
                website={c.website}
                name={c.name}
                size="lg"
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h1 className="font-serif text-4xl text-zinc-50">{c.name}</h1>
                {c.tagline && (
                  <p className="mt-1 text-sm text-zinc-400">{c.tagline}</p>
                )}
                <p className="mt-2 text-xs uppercase tracking-wide text-zinc-500">
                  Stunt company
                  {(c.headquarters ?? c.country) ? ` · ${c.headquarters ?? c.country}` : ''}
                  {c.founded_year ? ` · Est. ${c.founded_year}` : ''}
                  {c.parent_company ? ` · ${c.parent_company}` : ''}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
              {c.member_count != null && (
                <Stat label="Members" value={`~${c.member_count.toLocaleString()}`} />
              )}
              {c.founded_year && <Stat label="Founded" value={c.founded_year} />}
              {c.specialties.length > 0 && (
                <Stat label="Specialties" value={c.specialties.length} />
              )}
              {c.references.length > 0 && (
                <Stat label="References" value={c.references.length} />
              )}
            </div>
          </div>
        </header>

        {/* Editorial summary */}
        {paragraphs.length > 0 && (
          <section className="mb-10">
            <SectionHeader label="About" heading={c.name} />
            <div className="mt-3 max-w-3xl space-y-4 text-sm leading-relaxed text-zinc-300">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}

        {/* Founders + specialties side-by-side */}
        {(c.founder_names.length > 0 || c.specialties.length > 0) && (
          <section className="mb-10 grid gap-4 sm:grid-cols-2">
            {c.founder_names.length > 0 && (
              <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Founders</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-200">
                  {c.founder_names.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
            {c.specialties.length > 0 && (
              <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Specialties</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.specialties.map((s) => (
                    <span
                      key={s}
                      className="rounded border border-red-900/40 bg-red-950/20 px-2 py-0.5 text-xs text-red-200/90"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Members — principals first, then alumni / associates. */}
        {members.length > 0 && (
          <section className="mb-10">
            <SectionHeader
              label="Roster"
              heading={`${members.length} ${members.length === 1 ? 'member' : 'members'}`}
            />
            <p className="-mt-2 mb-4 max-w-2xl text-xs text-zinc-500">
              The stunt performers and coordinators associated with
              this company. Principals are the prominent members
              identified with the company’s working identity;
              associates and alumni are the broader roster.
            </p>

            {principals.length > 0 && (
              <div className="mb-5">
                <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-red-400/80">
                  Principals
                </p>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {principals.map((m) => (
                      <li key={m.person_slug}>
                        <Link
                          href={`/crew/${m.person_slug}`}
                          className="group flex items-start gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-red-900/50 hover:bg-red-950/10 transition-colors"
                        >
                          <PersonAvatar
                            slug={m.person_slug}
                            displayName={m.display_name}
                            profilePath={m.profile_path}
                            size="md"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-serif text-sm text-zinc-100 group-hover:text-amber-400">
                              {m.display_name}
                            </span>
                            <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
                              {m.member_role.replace(/_/g, ' ')}
                              {m.joined_year && ` · since ${m.joined_year}`}
                              {m.left_year && ` · left ${m.left_year}`}
                            </span>
                            {m.primary_role && (
                              <span className="mt-0.5 block text-[10px] text-zinc-500">
                                {m.primary_role}
                              </span>
                            )}
                            {m.credit_count > 0 && (
                              <span className="mt-0.5 inline-block text-[10px] font-mono text-amber-500/70">
                                {m.credit_count} credit{m.credit_count === 1 ? '' : 's'}
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {otherMembers.length > 0 && (
              <div>
                <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  Other members
                </p>
                <ul className="flex flex-wrap gap-2">
                  {otherMembers.map((m) => (
                    <li key={m.person_slug}>
                      <Link
                        href={`/crew/${m.person_slug}`}
                        className="inline-block rounded border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-300 hover:border-red-900/50 hover:text-amber-400"
                      >
                        {m.display_name}
                        <span className="ml-1.5 text-[10px] text-zinc-600">
                          {m.member_role.replace(/_/g, ' ')}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Productions — derived from the union of crew_assignments
            (stunts category), stunt_sequence_credits, and
            stunt_doubling_credits whose member is on this company. */}
        {productions.length > 0 ? (
          <section className="mb-10">
            <SectionHeader
              label="Filmography"
              heading={`${productions.length} ${productions.length === 1 ? 'production' : 'productions'}`}
            />
            <p className="-mt-2 mb-4 max-w-2xl text-xs text-zinc-500">
              Derived from the working credits of every member on this
              roster — stunt-department crew assignments, sequence
              credits, and primary-double records collapsed by film
              and ordered newest first.
            </p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {productions.map((p) => {
                const poster = posterUrl(p.poster_path, 'w154');
                return (
                  <li key={p.production_slug}>
                    <Link
                      href={`/films/${p.production_slug}`}
                      className="group flex gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-red-900/50 hover:bg-red-950/10 transition-colors"
                    >
                      <span className="block h-20 w-14 shrink-0 overflow-hidden rounded border border-zinc-800 bg-zinc-900">
                        {poster ? (
                          <Image
                            src={poster}
                            alt={p.title}
                            width={56}
                            height={80}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-mono text-[10px] text-zinc-500">
                          {p.release_year ?? '—'}
                        </span>
                        <span className="block truncate font-serif text-sm text-zinc-100 group-hover:text-amber-400">
                          {p.title}
                        </span>
                        <span className="mt-1 block text-[10px] text-zinc-500">
                          {p.member_count} member{p.member_count === 1 ? '' : 's'}:{' '}
                          <span className="text-zinc-400">
                            {p.member_names.slice(0, 2).join(', ')}
                            {p.member_names.length > 2 && ` +${p.member_names.length - 2}`}
                          </span>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <section className="mb-10">
            <SectionHeader label="Filmography" heading="No production credits yet" />
            <p className="mt-3 rounded border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-600">
              Once the roster’s working credits are linked into the
              archive, every film their members worked on will surface
              here — derived from stunt-department crew assignments,
              sequence credits, and doubling records.
            </p>
          </section>
        )}

        {/* Further reading */}
        {c.references.length > 0 && (
          <section className="mb-10">
            <SectionHeader label="References" heading="Further reading" />
            <ul className="mt-3 space-y-2 text-sm">
              {c.references.map((ref, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-100 hover:text-amber-400"
                  >
                    {ref.title}
                  </a>
                  {ref.publication && (
                    <span className="text-xs text-zinc-500">{ref.publication}</span>
                  )}
                  {ref.kind && (
                    <span className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                      {ref.kind.replace(/_/g, ' ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Resources footer */}
        <footer className="border-t border-zinc-800 pt-6">
          <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Resources</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {c.website && (
              <a
                href={c.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-300 hover:text-amber-400"
              >
                Official website ↗
              </a>
            )}
            {c.careers_url && (
              <a
                href={c.careers_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-300 hover:text-amber-400"
              >
                Careers ↗
              </a>
            )}
            {c.reel_url && (
              <a
                href={c.reel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-300 hover:text-amber-400"
              >
                Showreel ↗
              </a>
            )}
          </div>
        </footer>
      </article>
    </>
  );
}
