import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db, listProductions, getProductionWithFullDetail } from '@bts/db';
import { ProductionDetail } from '@/components/productions/ProductionDetail';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const rows = await listProductions(db);
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getProductionWithFullDetail(db, params.slug);
  if (!data) return {};
  return { title: data.production.title };
}

export default async function FilmDetailPage({ params }: Props) {
  const data = await getProductionWithFullDetail(db, params.slug);
  if (!data) notFound();
  return <ProductionDetail data={data} />;
}
