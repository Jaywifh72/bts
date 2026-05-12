import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEntityConfig, type FieldConfig } from '@/lib/admin/entity-registry';
import { EntityFormField } from '@/components/admin/form/EntityFormField';
import { createEntityAction } from '../../actions';

interface Props {
  params: { type: string };
  searchParams: { error?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const config = getEntityConfig(params.type);
  if (!config) return { robots: { index: false, follow: false } };
  return {
    title: `New ${config.label}`,
    robots: { index: false, follow: false },
  };
}

function FieldSection({
  title,
  blurb,
  fields,
}: {
  title: string;
  blurb?: string;
  fields: FieldConfig[];
}) {
  if (fields.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="font-serif text-base text-zinc-100">{title}</h2>
      {blurb && <p className="mt-1 text-xs text-zinc-500">{blurb}</p>}
      <div className="mt-3 grid gap-4">
        {fields.map((f) => (
          <EntityFormField key={f.name} field={f} />
        ))}
      </div>
    </section>
  );
}

export default function NewEntityPage({ params, searchParams }: Props) {
  const config = getEntityConfig(params.type);
  if (!config) notFound();
  const error = searchParams.error;

  return (
    <div>
      <nav className="mb-6 text-xs uppercase tracking-wide text-zinc-500">
        <Link href="/admin/curate" className="hover:text-amber-400">Curate</Link>
        <span className="mx-2 text-zinc-700">/</span>
        <span className="text-zinc-300">New {config.label.toLowerCase()}</span>
      </nav>

      <header className="mb-6">
        <h1 className="font-serif text-2xl text-zinc-50">
          New {config.label.toLowerCase()}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          {config.description}
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
          <strong className="font-serif">Insert failed:</strong>{' '}
          <span className="font-mono text-xs">{error}</span>
        </div>
      )}

      <form action={createEntityAction} className="max-w-3xl">
        <input type="hidden" name="_entity_type" value={config.type} />

        <FieldSection
          title="Identification"
          blurb="Slug is the URL path; it must be unique within the table. The button next to it derives a slug from the name."
          fields={config.identification}
        />

        <FieldSection
          title="Editorial"
          blurb="Original prose. Tagline shows on cards; summary shows on the detail page. Markdown-style line breaks render as paragraph splits."
          fields={config.editorial}
        />

        <FieldSection
          title="Structured fields"
          fields={config.structured}
        />

        <FieldSection
          title="JSONB fields"
          blurb="References are normalised across the archive. Photo and variant editors save inline as JSON."
          fields={config.jsonb}
        />

        <div className="mt-8 flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-xs text-zinc-500">
            <span className="font-mono text-zinc-300">{config.table}</span> ·{' '}
            On success, redirects to the public page at{' '}
            <code className="font-mono text-amber-400">{config.publicRoutePrefix}/&lt;slug&gt;</code>.
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/curate"
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded bg-amber-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-950 hover:bg-amber-500"
            >
              Insert
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
