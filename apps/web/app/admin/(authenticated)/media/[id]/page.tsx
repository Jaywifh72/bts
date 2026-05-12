import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, getMediaAssetById } from '@bts/db';
import { addAssociationAction, removeAssociationAction } from '../actions';

export const metadata: Metadata = {
  title: 'Media asset',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
  searchParams: { error?: string; attached?: string; detached?: string; created?: string };
}

const ENTITY_TYPES = [
  'production', 'person', 'vfx_house', 'stunt_company', 'stunt_school',
  'stunt_sequence', 'stunt_rigging_technique', 'safety_bulletin',
  'equipment_manufacturer', 'equipment_series', 'equipment_item',
  'post_house', 'scene',
];
const ROLES = ['subject', 'credit_holder', 'reference', 'reel', 'thumbnail', 'related'];

const KIND_BADGE: Record<string, string> = {
  video:    'bg-red-950/30 text-red-300 border-red-900/50',
  image:    'bg-emerald-950/30 text-emerald-300 border-emerald-900/50',
  link:     'bg-amber-950/30 text-amber-300 border-amber-900/50',
  document: 'bg-purple-950/30 text-purple-300 border-purple-900/50',
  audio:    'bg-sky-950/30 text-sky-300 border-sky-900/50',
};

const inputClass =
  'rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 focus:border-amber-700 focus:outline-none';

export default async function MediaAssetDetailPage({ params, searchParams }: Props) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const data = await getMediaAssetById(db, id);
  if (!data) notFound();
  const { asset, associations } = data;

  return (
    <div>
      <nav className="mb-6 text-xs uppercase tracking-wide text-zinc-500">
        <Link href="/admin/media" className="hover:text-amber-400">Media</Link>
        <span className="mx-2 text-zinc-700">/</span>
        <span className="text-zinc-300">#{asset.id}</span>
      </nav>

      <header className="mb-6">
        <div className="flex items-baseline gap-3">
          <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-xs uppercase tracking-wide ${KIND_BADGE[asset.kind] ?? 'border-zinc-700 text-zinc-400'}`}>
            {asset.kind}
          </span>
          <h1 className="font-serif text-2xl text-zinc-50">{asset.title}</h1>
        </div>
        <p className="mt-2 break-all font-mono text-xs text-zinc-500">
          <a
            href={asset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-400"
          >
            {asset.url} ↗
          </a>
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500">
          {asset.publication && (
            <span><span className="uppercase tracking-wide">Publication:</span> <span className="text-zinc-300">{asset.publication}</span></span>
          )}
          {asset.credit && (
            <span><span className="uppercase tracking-wide">Credit:</span> <span className="text-zinc-300">{asset.credit}</span></span>
          )}
          {asset.duration_seconds != null && (
            <span><span className="uppercase tracking-wide">Duration:</span> <span className="font-mono text-zinc-300">{Math.floor(asset.duration_seconds / 60)}:{String(asset.duration_seconds % 60).padStart(2, '0')}</span></span>
          )}
          {asset.published_at && (
            <span><span className="uppercase tracking-wide">Published:</span> <span className="font-mono text-zinc-300">{asset.published_at.slice(0, 10)}</span></span>
          )}
        </div>
      </header>

      {searchParams.created && (
        <div className="mb-6 rounded border border-emerald-900/40 bg-emerald-950/20 p-3 text-sm text-emerald-200">
          Asset created.
        </div>
      )}
      {searchParams.attached && (
        <div className="mb-6 rounded border border-emerald-900/40 bg-emerald-950/20 p-3 text-sm text-emerald-200">
          Attached to <span className="font-mono">{searchParams.attached}</span>.
        </div>
      )}
      {searchParams.detached && (
        <div className="mb-6 rounded border border-amber-900/40 bg-amber-950/20 p-3 text-sm text-amber-200">
          Association removed.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-6 rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
          <span className="font-mono text-xs">{searchParams.error}</span>
        </div>
      )}

      {asset.caption && (
        <p className="mb-6 max-w-3xl rounded border border-zinc-800 bg-zinc-900/40 p-3 text-sm leading-relaxed text-zinc-300">
          {asset.caption}
        </p>
      )}

      {/* Associations list */}
      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-base text-zinc-100">
            Associations <span className="text-sm text-zinc-500">({associations.length})</span>
          </h2>
        </div>
        {associations.length === 0 ? (
          <p className="rounded border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">
            Not yet associated to any entity. Use the form below.
          </p>
        ) : (
          <ul className="space-y-2">
            {associations.map((a) => (
              <li
                key={a.association_id}
                className="flex items-baseline justify-between gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-zinc-400">
                      {a.entity_type.replace(/_/g, ' ')}
                    </span>
                    <span className="rounded border border-amber-900/40 bg-amber-950/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber-300">
                      {a.role.replace(/_/g, ' ')}
                    </span>
                    {a.href ? (
                      <Link href={a.href} className="text-sm text-zinc-100 hover:text-amber-400">
                        {a.display_name}
                      </Link>
                    ) : (
                      <span className="text-sm text-zinc-100">{a.display_name}</span>
                    )}
                  </div>
                  {a.caption_override && (
                    <p className="mt-1 text-xs italic text-zinc-500">
                      Caption: {a.caption_override}
                    </p>
                  )}
                  <div className="mt-1 font-mono text-[10px] text-zinc-600">{a.slug}</div>
                </div>
                <form action={removeAssociationAction}>
                  <input type="hidden" name="asset_id" value={asset.id} />
                  <input type="hidden" name="entity_type" value={a.entity_type} />
                  <input type="hidden" name="entity_id" value={a.entity_id} />
                  <input type="hidden" name="role" value={a.role} />
                  <button
                    type="submit"
                    className="rounded border border-red-900/50 bg-red-950/20 px-2 py-1 text-[10px] uppercase tracking-wide text-red-300 hover:border-red-700 hover:bg-red-950/40"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Add-association form */}
      <section>
        <h2 className="mb-3 font-serif text-base text-zinc-100">Attach to entity</h2>
        <form
          action={addAssociationAction}
          className="grid gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-4 sm:grid-cols-12"
        >
          <input type="hidden" name="asset_id" value={asset.id} />

          <label className="sm:col-span-3">
            <span className="block text-[10px] uppercase tracking-wide text-zinc-500">Entity type</span>
            <select name="entity_type" required defaultValue="" className={`${inputClass} mt-1 w-full font-mono`}>
              <option value="" disabled>— choose —</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </label>

          <label className="sm:col-span-4">
            <span className="block text-[10px] uppercase tracking-wide text-zinc-500">Entity slug</span>
            <input
              type="text" name="entity_slug" required
              placeholder="e.g. avengers-endgame-2019"
              className={`${inputClass} mt-1 w-full font-mono`}
            />
          </label>

          <label className="sm:col-span-2">
            <span className="block text-[10px] uppercase tracking-wide text-zinc-500">Role</span>
            <select name="role" required defaultValue="related" className={`${inputClass} mt-1 w-full font-mono`}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </label>

          <label className="sm:col-span-3">
            <span className="block text-[10px] uppercase tracking-wide text-zinc-500">Caption override</span>
            <input
              type="text" name="caption_override"
              placeholder="optional, per-entity caption"
              className={`${inputClass} mt-1 w-full`}
            />
          </label>

          <div className="sm:col-span-12 flex justify-end">
            <button
              type="submit"
              className="rounded bg-amber-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-950 hover:bg-amber-500"
            >
              Attach
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
