import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, getProductionWithFullDetail } from '@bts/db';
import { siteUrl, absoluteUrl } from '@/lib/site';
import { PrintButtonClient } from '@/components/productions/PrintButtonClient';

/**
 * T9-1 — printable single-page loadout sheet for a production. Layout
 * is tuned for portrait letter/A4 print. The user prints to PDF via
 * the browser dialog (Cmd/Ctrl-P on the page) — no server-side PDF
 * library required, no @vercel/og/font issues, no extra dependency.
 *
 * Doubles as T8-3 (print stylesheet) for the rest of the site by
 * borrowing the same `print:` Tailwind utilities.
 */

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getProductionWithFullDetail(db, params.slug);
  if (!data) return {};
  return {
    title: `${data.production.title} — Loadout`,
    robots: { index: false, follow: false },
  };
}

export default async function LoadoutPage({ params }: { params: { slug: string } }) {
  const data = await getProductionWithFullDetail(db, params.slug);
  if (!data) notFound();
  const { production, formats, crew, scenes, productionSources } = data;

  // Group crew by department
  type CrewMember = (typeof crew)[number];
  const crewByCategory = crew.reduce<Record<string, CrewMember[]>>((acc, c) => {
    (acc[c.role_category] ??= []).push(c);
    return acc;
  }, {});

  // Aggregate gear by series/item across all scenes
  type GearAgg = {
    manufacturer_slug: string;
    series_slug: string;
    series_name: string;
    series_category: string;
    item_slug: string | null;
    item_name: string | null;
    scene_count: number;
  };
  const gearMap = new Map<string, GearAgg>();
  for (const sc of scenes) {
    const key = `${sc.series_slug}:${sc.item_slug ?? ''}`;
    const existing = gearMap.get(key);
    if (existing) {
      existing.scene_count++;
    } else {
      gearMap.set(key, {
        manufacturer_slug: sc.manufacturer_slug,
        series_slug: sc.series_slug,
        series_name: sc.series_name,
        series_category: sc.series_category,
        item_slug: sc.item_slug,
        item_name: sc.item_name,
        scene_count: 1,
      });
    }
  }
  const gearByCategory = [...gearMap.values()].reduce<Record<string, GearAgg[]>>((acc, g) => {
    (acc[g.series_category] ??= []).push(g);
    return acc;
  }, {});
  for (const list of Object.values(gearByCategory)) {
    list.sort((a, b) => b.scene_count - a.scene_count);
  }

  return (
    <article className="mx-auto max-w-3xl print:max-w-none">
      {/* Print-only print button (hidden when printing) */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/films/${production.slug}`} className="text-sm text-zinc-400 hover:text-amber-400">
          ← Back to {production.title}
        </Link>
        <PrintButton />
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-950 p-8 print:border-0 print:bg-white print:p-0 print:text-black">
        {/* Header */}
        <header className="mb-6 border-b border-zinc-800 pb-4 print:border-zinc-300">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 print:text-gray-500">
            Studio Pro · Loadout sheet
          </p>
          <h1 className="mt-1 font-serif text-3xl text-zinc-100 print:text-black">
            {production.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-400 print:text-gray-700">
            {[
              production.release_year ? String(production.release_year) : null,
              production.production_country,
              production.runtime_minutes
                ? `${Math.floor(production.runtime_minutes / 60)}h ${production.runtime_minutes % 60}m`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </header>

        {/* Format */}
        {formats.length > 0 && (
          <Section title="Acquisition format">
            <ul className="space-y-1 text-sm">
              {formats.map((f, i) => (
                <li key={i}>
                  <span className="font-medium">{f.aspect_ratio}</span>
                  <span className="ml-2 text-zinc-500 print:text-gray-600">{f.acquisition_format}</span>
                  {f.label && (
                    <span className="ml-2 text-xs text-zinc-600 print:text-gray-500">{f.label}</span>
                  )}
                  {f.color_space && (
                    <span className="ml-2 text-xs text-zinc-600 print:text-gray-500">{f.color_space}</span>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Camera crew & directors */}
        {Object.keys(crewByCategory).length > 0 && (
          <Section title="Crew">
            {['direction', 'camera', 'electric', 'grip', 'sound', 'art', 'wardrobe', 'makeup_hair', 'vfx', 'post', 'music', 'production', 'writing'].map((cat) => {
              const list = crewByCategory[cat];
              if (!list || list.length === 0) return null;
              return (
                <div key={cat} className="mb-3">
                  <p className="mb-0.5 text-[10px] uppercase tracking-widest text-zinc-500 print:text-gray-500">
                    {cat.replace(/_/g, ' ')}
                  </p>
                  <ul className="space-y-0.5 text-sm">
                    {list.map((m, i) => (
                      <li key={`${m.person_slug}-${i}`}>
                        <span className="font-medium">{m.credit_name_override ?? m.display_name}</span>
                        <span className="ml-2 text-zinc-500 print:text-gray-600">{m.role_name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </Section>
        )}

        {/* Equipment by category */}
        {Object.keys(gearByCategory).length > 0 && (
          <Section title="Equipment">
            {['camera_body', 'lens_set', 'lighting_fixture', 'filter', 'recorder', 'mount', 'accessory'].map((cat) => {
              const list = gearByCategory[cat];
              if (!list || list.length === 0) return null;
              return (
                <div key={cat} className="mb-3">
                  <p className="mb-0.5 text-[10px] uppercase tracking-widest text-zinc-500 print:text-gray-500">
                    {cat.replace(/_/g, ' ')}
                  </p>
                  <ul className="space-y-0.5 text-sm">
                    {list.map((g, i) => (
                      <li key={`${g.series_slug}-${g.item_slug ?? ''}-${i}`}>
                        <span className="font-medium">{g.item_name ?? g.series_name}</span>
                        {g.item_name && g.series_name !== g.item_name && (
                          <span className="ml-2 text-zinc-500 print:text-gray-600">{g.series_name}</span>
                        )}
                        <span className="ml-2 text-xs text-zinc-600 print:text-gray-500">
                          {g.scene_count} {g.scene_count === 1 ? 'scene' : 'scenes'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </Section>
        )}

        {/* Sources */}
        {productionSources.length > 0 && (
          <Section title="Sources">
            <ol className="list-decimal pl-5 text-xs text-zinc-400 print:text-gray-600">
              {productionSources.map((s, i) => (
                <li key={i} className="mb-1">
                  {s.publication ? <span className="italic">{s.publication}</span> : null}
                  {s.author ? <span> — {s.author}</span> : null}
                  {s.title ? <span>, "{s.title}"</span> : null}
                  {s.published_at ? <span> ({s.published_at})</span> : null}
                  {s.url ? <span> · {s.url}</span> : null}
                  <span className="ml-2 rounded bg-zinc-800 px-1.5 py-px text-[9px] text-zinc-300 print:bg-gray-200 print:text-gray-700">
                    {s.confidence}
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        <footer className="mt-8 border-t border-zinc-800 pt-3 text-[10px] text-zinc-500 print:border-zinc-300 print:text-gray-500">
          Compiled from {' '}
          <a href={absoluteUrl(`/films/${production.slug}`)} className="underline">
            {siteUrl()}/films/{production.slug}
          </a>
          {' '}— {new Date().toISOString().slice(0, 10)}
        </footer>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 print:mb-3">
      <h2 className="mb-2 font-serif text-base text-zinc-200 print:text-black">{title}</h2>
      {children}
    </section>
  );
}

function PrintButton() {
  return <PrintButtonClient />;
}
