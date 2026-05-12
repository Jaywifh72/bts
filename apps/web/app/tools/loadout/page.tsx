import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db, listLoadoutPickerItems, getLoadoutItemsByPaths, type LoadoutPickerItem } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PrintButton } from '@/components/tools/PrintButton';

export const metadata: Metadata = {
  title: 'Loadout calculator',
  description:
    'Build a camera + lens + filter + lighting kit from Studio Pro\'s curated equipment list. Share via URL, save as PDF.',
};

const CATEGORY_LABELS: Record<string, string> = {
  camera_body: 'Camera bodies',
  lens_set: 'Lenses',
  filter: 'Filters',
  lighting_fixture: 'Lighting',
  recorder: 'Recorders',
  mount: 'Mounts',
  accessory: 'Accessories',
};
const CATEGORY_ORDER = ['camera_body', 'lens_set', 'filter', 'lighting_fixture', 'recorder', 'mount', 'accessory'];

type Props = { searchParams: { items?: string; add?: string } };

function parsePicks(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/.test(s));
}

function rebuildUrl(picks: string[]): string {
  if (picks.length === 0) return '/tools/loadout';
  return `/tools/loadout?items=${picks.join(',')}`;
}

const SLUG_PATH_RE = /^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/;

export default async function LoadoutPage({ searchParams }: Props) {
  // Merge `?add=...` into items + redirect to the canonical URL so
  // shareable links always reflect the kit fully via `?items=...`.
  if (searchParams.add && SLUG_PATH_RE.test(searchParams.add)) {
    const current = parsePicks(searchParams.items);
    if (!current.includes(searchParams.add)) current.push(searchParams.add);
    redirect(rebuildUrl(current));
  }

  const picks = parsePicks(searchParams.items);
  const [allItems, picked] = await Promise.all([
    listLoadoutPickerItems(db),
    getLoadoutItemsByPaths(db, picks),
  ]);

  // Group all items by category for the picker dropdown.
  const allByCategory = new Map<string, LoadoutPickerItem[]>();
  for (const it of allItems) {
    const list = allByCategory.get(it.category) ?? [];
    list.push(it);
    allByCategory.set(it.category, list);
  }

  // Group picked items by category for the kit display.
  const pickedByCategory = new Map<string, LoadoutPickerItem[]>();
  for (const it of picked) {
    const list = pickedByCategory.get(it.category) ?? [];
    list.push(it);
    pickedByCategory.set(it.category, list);
  }

  const totalWeight = picked.reduce((sum, it) => sum + (it.weight_kg ?? 0), 0);
  const knownWeightCount = picked.filter((it) => it.weight_kg != null).length;

  return (
    <article className="print:bg-white print:text-black">
      <header className="mb-6 print:hidden">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Tools</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">Loadout calculator</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Build a kit from Studio Pro's curated equipment. State persists in
          the URL — share the page to share the kit. Print-as-PDF turns the
          kit into a paper-sides one-pager.
        </p>
      </header>

      {/* Print header — only shows when printed */}
      <header className="mb-6 hidden print:block">
        <h1 className="font-serif text-2xl">Studio Pro — Loadout</h1>
        <p className="text-sm text-zinc-700">{new Date().toISOString().slice(0, 10)}</p>
      </header>

      {/* Add-item form. Self-submits a GET with the new picks list. */}
      <form
        action="/tools/loadout"
        method="get"
        className="mb-6 flex flex-wrap items-end gap-2 rounded border border-zinc-800 bg-zinc-900/40 p-3 print:hidden"
      >
        <input type="hidden" name="items" value={[...picks].join(',')} />
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Add item
          <select
            name="add"
            defaultValue=""
            required
            className="min-w-72 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none"
          >
            <option value="" disabled>
              Pick category &amp; item…
            </option>
            {CATEGORY_ORDER.flatMap((cat) => {
              const list = allByCategory.get(cat) ?? [];
              if (list.length === 0) return [];
              return [
                <optgroup key={cat} label={CATEGORY_LABELS[cat] ?? cat}>
                  {list.map((it) => (
                    <option key={it.slug_path} value={it.slug_path}>
                      {it.manufacturer} {it.series} — {it.item}
                    </option>
                  ))}
                </optgroup>,
              ];
            })}
          </select>
        </label>
        <button
          type="submit"
          className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-500"
        >
          Add to kit
        </button>
        {picks.length > 0 && (
          <Link
            href="/tools/loadout"
            className="text-xs text-zinc-500 hover:text-amber-400"
          >
            Clear kit
          </Link>
        )}
        <PrintButton />
      </form>

      {picked.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500 print:border-zinc-300">
          No items in your kit yet. Pick from the dropdown above.
        </div>
      ) : (
        <>
          <SectionHeader
            label="Kit"
            heading={`${picked.length} ${picked.length === 1 ? 'item' : 'items'}`}
          />
          <div className="mt-3 space-y-5">
            {CATEGORY_ORDER.flatMap((cat) => {
              const list = pickedByCategory.get(cat);
              if (!list) return [];
              return [
                <section key={cat}>
                  <h3 className="mb-2 text-xs uppercase tracking-wide text-zinc-500 print:text-zinc-700">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </h3>
                  <ul className="divide-y divide-zinc-800 rounded border border-zinc-800 print:divide-zinc-300 print:border-zinc-300">
                    {list.map((it) => {
                      const remaining = picks.filter((p) => p !== it.slug_path);
                      return (
                        <li
                          key={it.slug_path}
                          className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2 text-sm"
                        >
                          <Link
                            href={`/gear/${it.slug_path}`}
                            className="text-zinc-100 hover:text-amber-400 print:text-black"
                          >
                            {it.manufacturer} {it.series}
                          </Link>
                          <span className="text-zinc-300 print:text-zinc-700">{it.item}</span>
                          <span className="ml-auto text-xs text-zinc-500 print:text-zinc-600">
                            {it.weight_kg != null ? `${it.weight_kg.toFixed(2)} kg` : '—'}
                          </span>
                          <Link
                            href={rebuildUrl(remaining)}
                            className="text-xs text-zinc-500 hover:text-red-400 print:hidden"
                            aria-label={`Remove ${it.item}`}
                          >
                            ×
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>,
              ];
            })}
          </div>

          <div className="mt-6 rounded border border-zinc-800 bg-zinc-900/40 p-3 text-sm print:border-zinc-300 print:bg-white">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="text-zinc-400 print:text-zinc-700">Total weight</span>
              <span className="font-mono text-zinc-100 print:text-black">
                {totalWeight > 0 ? `${totalWeight.toFixed(2)} kg` : '—'}
                {knownWeightCount < picked.length && (
                  <span className="ml-2 text-xs text-zinc-500 print:text-zinc-600">
                    ({knownWeightCount} of {picked.length} items have specced weight)
                  </span>
                )}
              </span>
            </div>
          </div>
        </>
      )}

      <p className="mt-6 text-xs text-zinc-600 print:hidden">
        Weights pulled from <code>equipment_items.specs.weight_kg</code> when
        available. Most items don't have it specced yet — the calculator
        shows "—" rather than guessing. Curate against manufacturer
        spec sheets for full accuracy.
      </p>
    </article>
  );
}
