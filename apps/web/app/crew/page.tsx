import type { Metadata } from 'next';
import { db, listPeople } from '@bts/db';
import { PersonCard } from '@/components/people/PersonCard';

export const metadata: Metadata = { title: 'Crew' };

export default async function CrewPage() {
  const rows = await listPeople(db);

  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Archive</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">Crew</h1>
        <p className="mt-1 text-sm text-zinc-400">{rows.length} people</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <PersonCard
            key={row.slug}
            slug={row.slug}
            displayName={row.display_name}
            nationality={row.nationality}
            primaryRole={row.primary_role}
          />
        ))}
      </div>
    </>
  );
}
