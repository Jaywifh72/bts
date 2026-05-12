import Link from 'next/link';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { CitationMarker } from '@/components/ui/CitationMarker';

interface SceneRow {
  scene_id: number; scene_slug: string; scene_title: string;
  scene_synopsis: string | null; time_of_day: string | null;
  interior_exterior: string | null; location: string | null;
  equipment_usage_id: number;
  series_slug: string; series_name: string; series_category: string;
  manufacturer_slug: string;
  item_slug: string | null; item_name: string | null;
  setup_label: string | null; usage_role: string | null;
}

interface SceneListProps {
  rows: SceneRow[];
  productionSlug: string;
  /** T6-1 — equipment_usage_id → ordered source numbers for inline citations. */
  citationsByUsage?: Record<number, number[]>;
}

interface GearRow {
  equipment_usage_id: number;
  series_slug: string; series_name: string; series_category: string;
  manufacturer_slug: string;
  item_slug: string | null; item_name: string | null;
  setup_label: string | null; usage_role: string | null;
}

interface Scene {
  scene_id: number; scene_slug: string; scene_title: string;
  scene_synopsis: string | null; time_of_day: string | null;
  interior_exterior: string | null; location: string | null;
  gear: GearRow[];
}

function groupScenes(rows: SceneRow[]): Scene[] {
  const map = new Map<number, Scene>();
  for (const row of rows) {
    if (!map.has(row.scene_id)) {
      map.set(row.scene_id, {
        scene_id: row.scene_id, scene_slug: row.scene_slug,
        scene_title: row.scene_title, scene_synopsis: row.scene_synopsis,
        time_of_day: row.time_of_day, interior_exterior: row.interior_exterior,
        location: row.location, gear: [],
      });
    }
    map.get(row.scene_id)!.gear.push({
      equipment_usage_id: row.equipment_usage_id,
      series_slug: row.series_slug, series_name: row.series_name,
      series_category: row.series_category, manufacturer_slug: row.manufacturer_slug,
      item_slug: row.item_slug, item_name: row.item_name,
      setup_label: row.setup_label, usage_role: row.usage_role,
    });
  }
  return Array.from(map.values());
}

export function SceneList({ rows, productionSlug, citationsByUsage }: SceneListProps) {
  const scenes = groupScenes(rows);

  if (scenes.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <SectionHeader label="Production" heading="Scenes & Equipment" />
      <div className="space-y-4">
        {scenes.map((scene) => (
          <div
            key={scene.scene_id}
            id={`scene-${scene.scene_slug}`}
            className="scroll-mt-6 rounded border border-zinc-800 bg-zinc-900"
          >
            <div className="border-b border-zinc-800 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/films/${productionSlug}/scenes/${scene.scene_slug}`}
                  className="font-medium text-zinc-100 hover:text-amber-400"
                >
                  {scene.scene_title}
                </Link>
                {scene.interior_exterior && (
                  <Badge label={scene.interior_exterior.toUpperCase()} variant="category" />
                )}
                {scene.time_of_day && (
                  <Badge label={scene.time_of_day.replace('_', ' ')} variant="category" />
                )}
              </div>
              {scene.location && (
                <p className="mt-0.5 text-xs text-zinc-500">{scene.location}</p>
              )}
            </div>
            <div className="divide-y divide-zinc-800/50">
              {scene.gear.map((g, i) => (
                <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
                  <Badge label={g.series_category} variant="category" />
                  {g.setup_label && (
                    <span className="text-xs text-zinc-500">{g.setup_label}</span>
                  )}
                  <Link
                    href={`/gear/${g.manufacturer_slug}/${g.series_slug}`}
                    className="text-zinc-200 hover:text-amber-400"
                  >
                    {g.series_name}
                  </Link>
                  {g.item_slug && g.item_name && (
                    <>
                      <span className="text-zinc-600">›</span>
                      <Link
                        href={`/gear/${g.manufacturer_slug}/${g.series_slug}/${g.item_slug}`}
                        className="text-zinc-400 hover:text-amber-400"
                      >
                        {g.item_name}
                      </Link>
                    </>
                  )}
                  {g.usage_role && (
                    <span className="text-xs text-zinc-600">{g.usage_role}</span>
                  )}
                  <CitationMarker numbers={citationsByUsage?.[g.equipment_usage_id] ?? []} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
