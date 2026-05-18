import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db, getCostumeConstructionHouseBySlug } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { FacilityProfile } from '@/components/facility/FacilityProfile';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  let r: Awaited<ReturnType<typeof getCostumeConstructionHouseBySlug>> = null;
  try { r = await getCostumeConstructionHouseBySlug(db, slug); } catch {}
  if (!r) return { title: 'Costume construction house' };
  return {
    title: `${r.name} — costume construction`,
    description: r.tagline ?? r.summary?.slice(0, 160) ?? `${r.name} costume workroom.`,
    alternates: { canonical: `${siteUrl()}/costume-hair-makeup/construction-houses/${slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let r: Awaited<ReturnType<typeof getCostumeConstructionHouseBySlug>> = null;
  try { r = await getCostumeConstructionHouseBySlug(db, slug); } catch (e) { console.warn(e); }
  if (!r) notFound();
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Organization', '@id': absoluteUrl(`/costume-hair-makeup/construction-houses/${slug}`), name: r.name, url: r.website ?? undefined }} />
      <PageHero
        eyebrow="Costume construction house"
        title={r.name}
        accent="red"
        description={r.tagline ?? r.summary?.split('\n\n')[0]}
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="HQ" value={r.headquarters ?? [r.city, r.country].filter(Boolean).join(', ') ?? '—'} />
            <PageHeroStat label="Founded" value={r.founded_year ?? '—'} />
            <PageHeroStat label="Employees" value={r.employee_count ?? '—'} />
            <PageHeroStat label="Parent" value={r.parent_company ?? '—'} />
          </div>
        }
      />
      <FacilityProfile {...r} />
    </>
  );
}
