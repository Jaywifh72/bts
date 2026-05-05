import Link from 'next/link';

/**
 * Quick-scan tech panel for the top of /films/[slug]. Pros want to find
 * the DP, director, primary camera + lens combo, and aspect ratio in
 * three seconds without scrolling through the long department list.
 *
 * All fields are optional — the panel hides any row that's missing.
 */

type CrewRow = {
  person_slug: string;
  display_name: string;
  role_slug: string;
  role_name: string;
  role_category: string;
  credit_name_override: string | null;
};

type SceneEquipment = {
  series_slug: string;
  series_name: string;
  series_category: string;
  manufacturer_slug: string;
  item_slug: string | null;
  item_name: string | null;
};

type FormatRow = {
  label: string | null;
  aspect_ratio: string;
  acquisition_format: string;
  is_primary: boolean;
};

export function TechPanel({
  crew,
  formats,
  scenes,
  shootingWindow,
  locations,
}: {
  crew: CrewRow[];
  formats: FormatRow[];
  scenes: SceneEquipment[];
  shootingWindow: { start: string | null; end: string | null };
  locations: string[];
}) {
  // Pull out the headline crew (one per role, first match).
  function findRole(...roleSlugs: string[]): CrewRow | undefined {
    for (const slug of roleSlugs) {
      const hit = crew.find((c) => c.role_slug === slug);
      if (hit) return hit;
    }
    return undefined;
  }

  const director = findRole('director');
  const dp = findRole('director-of-photography');
  const composer = findRole('composer');
  const editor = findRole('editor');
  const productionDesigner = findRole('production-designer');
  const costumeDesigner = findRole('costume-designer');

  // Primary format
  const primaryFormat = formats.find((f) => f.is_primary) ?? formats[0];

  // Primary camera + lens (most-frequent cam-body and lens-set across scenes)
  const cameraCounts = new Map<string, { name: string; count: number; manufacturer: string; series: string }>();
  const lensCounts = new Map<string, { name: string; count: number; manufacturer: string; series: string }>();
  for (const s of scenes) {
    const key = `${s.series_slug}:${s.item_slug ?? ''}`;
    const bucket = s.series_category === 'camera_body' ? cameraCounts
                 : s.series_category === 'lens_set' ? lensCounts
                 : null;
    if (!bucket) continue;
    const existing = bucket.get(key);
    if (existing) {
      existing.count++;
    } else {
      bucket.set(key, {
        name: s.item_name ?? s.series_name,
        count: 1,
        manufacturer: s.manufacturer_slug,
        series: s.series_slug,
      });
    }
  }
  const topCamera = [...cameraCounts.values()].sort((a, b) => b.count - a.count)[0];
  const topLens = [...lensCounts.values()].sort((a, b) => b.count - a.count)[0];

  // Hide the panel entirely if we have nothing to show
  const hasAnything = director || dp || composer || editor || primaryFormat || topCamera || topLens || shootingWindow.start || locations.length > 0;
  if (!hasAnything) return null;

  return (
    <section className="mb-8 rounded border border-zinc-800 bg-zinc-900/40 p-4">
      <h2 className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">At a glance</h2>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {director && (
          <Row label="Director" href={`/crew/${director.person_slug}`} value={director.credit_name_override ?? director.display_name} />
        )}
        {dp && (
          <Row label="Cinematography" href={`/crew/${dp.person_slug}`} value={dp.credit_name_override ?? dp.display_name} />
        )}
        {editor && (
          <Row label="Editor" href={`/crew/${editor.person_slug}`} value={editor.credit_name_override ?? editor.display_name} />
        )}
        {composer && (
          <Row label="Music" href={`/crew/${composer.person_slug}`} value={composer.credit_name_override ?? composer.display_name} />
        )}
        {productionDesigner && (
          <Row label="Production Design" href={`/crew/${productionDesigner.person_slug}`} value={productionDesigner.credit_name_override ?? productionDesigner.display_name} />
        )}
        {costumeDesigner && (
          <Row label="Costume" href={`/crew/${costumeDesigner.person_slug}`} value={costumeDesigner.credit_name_override ?? costumeDesigner.display_name} />
        )}
        {topCamera && (
          <Row
            label="Primary camera"
            href={`/gear/${topCamera.manufacturer}/${topCamera.series}`}
            value={topCamera.name}
            note={topCamera.count > 1 ? `${topCamera.count} scenes` : undefined}
          />
        )}
        {topLens && (
          <Row
            label="Primary lens"
            href={`/gear/${topLens.manufacturer}/${topLens.series}`}
            value={topLens.name}
            note={topLens.count > 1 ? `${topLens.count} scenes` : undefined}
          />
        )}
        {primaryFormat && (
          <Row
            label="Format"
            value={`${primaryFormat.aspect_ratio} · ${primaryFormat.acquisition_format}`}
            note={primaryFormat.label ?? undefined}
          />
        )}
        {shootingWindow.start && (
          <Row
            label="Photographed"
            value={formatWindow(shootingWindow.start, shootingWindow.end)}
          />
        )}
        {locations.length > 0 && (
          <Row
            label="Locations"
            value={locations.slice(0, 3).join(' · ')}
            note={locations.length > 3 ? `+${locations.length - 3} more` : undefined}
          />
        )}
      </dl>
    </section>
  );
}

function Row({ label, value, href, note }: { label: string; value: string; href?: string; note?: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-100">
        {href ? (
          <Link href={href} className="hover:text-amber-400">{value}</Link>
        ) : value}
        {note && <span className="ml-2 text-xs text-zinc-500">{note}</span>}
      </dd>
    </div>
  );
}

function formatWindow(start: string, end: string | null): string {
  const s = parseDate(start);
  if (!end) return s;
  const e = parseDate(end);
  return `${s} – ${e}`;
}

function parseDate(s: string): string {
  // 'YYYY-MM-DD' → 'Mon YYYY'
  const [y, m] = s.split('-');
  if (!y || !m) return s;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(m, 10) - 1;
  return `${months[monthIdx] ?? m} ${y}`;
}
