import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEntityConfig, type FieldConfig } from '@/lib/admin/entity-registry';
import { getEntityForEdit } from '@/lib/admin/entity-inserters';
import { EntityFormField } from '@/components/admin/form/EntityFormField';
import { updateEntityAction } from '../../../actions';

interface Props {
  params: Promise<{ type: string; slug: string }>;
  searchParams: Promise<{ error?: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const config = getEntityConfig(params.type);
  if (!config) return { robots: { index: false, follow: false } };
  return {
    title: `Edit ${config.label}: ${params.slug}`,
    robots: { index: false, follow: false },
  };
}

function FieldSection({
  title,
  blurb,
  fields,
  values,
}: {
  title: string;
  blurb?: string;
  fields: FieldConfig[];
  values: Record<string, unknown>;
}) {
  if (fields.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="font-serif text-base text-zinc-100">{title}</h2>
      {blurb && <p className="mt-1 text-xs text-zinc-500">{blurb}</p>}
      <div className="mt-3 grid gap-4">
        {fields.map((f) => (
          <EntityFormField
            key={f.name}
            field={f}
            existingValue={values[f.name]}
          />
        ))}
      </div>
    </section>
  );
}

export default async function EditEntityPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const config = getEntityConfig(params.type);
  if (!config) notFound();
  const existing = await getEntityForEdit(params.type, params.slug);
  if (!existing) notFound();

  const error = searchParams.error;

  return (
    <div>
      <nav className="mb-6 text-xs uppercase tracking-wide text-zinc-500">
        <Link href="/admin/curate" className="hover:text-amber-400">Curate</Link>
        <span className="mx-2 text-zinc-700">/</span>
        <Link href={`${config.publicRoutePrefix}/${params.slug}`} className="hover:text-amber-400">
          {String(existing.name ?? existing.title ?? params.slug)}
        </Link>
        <span className="mx-2 text-zinc-700">/</span>
        <span className="text-zinc-300">Edit</span>
      </nav>

      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-2xl text-zinc-50">
            Edit {config.label.toLowerCase()}:{' '}
            <span className="text-zinc-300">{String(existing.name ?? existing.title ?? params.slug)}</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            All fields below are pre-populated from the row&apos;s
            current values. Saving runs an UPDATE keyed on the slug
            you arrived with — slug changes are supported.
          </p>
        </div>
        <Link
          href={`${config.publicRoutePrefix}/${params.slug}`}
          className="text-xs text-zinc-500 hover:text-amber-400"
        >
          View public page →
        </Link>
      </header>

      {error && (
        <div className="mb-6 rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
          <strong className="font-serif">Update failed:</strong>{' '}
          <span className="font-mono text-xs">{error}</span>
        </div>
      )}

      <form action={updateEntityAction} className="max-w-3xl">
        <input type="hidden" name="_entity_type" value={config.type} />
        <input type="hidden" name="_original_slug" value={params.slug} />

        <FieldSection title="Identification" fields={config.identification} values={existing} />
        <FieldSection title="Editorial" fields={config.editorial} values={existing} />
        <FieldSection title="Structured fields" fields={config.structured} values={existing} />
        <FieldSection title="JSONB fields" fields={config.jsonb} values={existing} />

        <div className="mt-8 flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-xs text-zinc-500">
            <span className="font-mono text-zinc-300">{config.table}</span> ·{' '}
            On success, redirects to{' '}
            <code className="font-mono text-amber-400">{config.publicRoutePrefix}/&lt;slug&gt;</code>.
          </div>
          <div className="flex gap-2">
            <Link
              href={`${config.publicRoutePrefix}/${params.slug}`}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded bg-amber-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-950 hover:bg-amber-500"
            >
              Save changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
