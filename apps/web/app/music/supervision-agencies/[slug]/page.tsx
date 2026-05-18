import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db, getMusicSupervisionAgencyBySlug } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { FacilityProfile } from '@/components/facility/FacilityProfile';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  let r: Awaited<ReturnType<typeof getMusicSupervisionAgencyBySlug>> = null;
  try { r = await getMusicSupervisionAgencyBySlug(db, slug); } catch {}
  if (!r) return { title: 'Music supervision agency' };
  return {
    title: `${r.name} — music supervision`,
    description: r.tagline ?? r.summary?.slice(0, 160) ?? `${r.name} music supervision agency.`,
    alternates: { canonical: `${siteUrl()}/music/supervision-agencies/${slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let r: Awaited<ReturnType<typeof getMusicSupervisionAgencyBySlug>> = null;
  try { r = await getMusicSupervisionAgencyBySlug(db, slug); } catch (e) { console.warn(e); }
  if (!r) notFound();
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Organization', '@id': absoluteUrl(`/music/supervision-agencies/${slug}`), name: r.name, url: r.website ?? undefined }} />
      <PageHero
        eyebrow="Music supervision agency"
        title={r.name}
        accent="amber"
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
