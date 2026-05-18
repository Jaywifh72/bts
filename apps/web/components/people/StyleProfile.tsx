import { SectionHeader } from '@/components/ui/SectionHeader';

/**
 * Generic "learn from the greats" style profile — renders on
 * /crew/[slug] for any practitioner with a person_style_profiles row.
 * Works equally for DPs, colorists, editors, composers, costume
 * designers, production designers, makeup department heads,
 * stunt coordinators.
 *
 * Self-hides every sub-block when the field is empty. The whole
 * section disappears if there's nothing to render.
 */
export type StyleProfileProps = {
  profile: {
    philosophy: string | null;
    signature_techniques: string[];
    tools_of_choice: string[];
    tells: string | null;
    process_notes: string | null;
    influences: string[];
    career_arc: string | null;
    references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
    curated_by: string | null;
    curated_by_url: string | null;
    last_verified_at: string | null;
  } | null;
};

export function StyleProfile({ profile }: StyleProfileProps) {
  if (!profile) return null;
  const hasAnything =
    profile.philosophy ||
    profile.signature_techniques.length > 0 ||
    profile.tools_of_choice.length > 0 ||
    profile.tells ||
    profile.process_notes ||
    profile.influences.length > 0 ||
    profile.career_arc;
  if (!hasAnything) return null;

  return (
    <div className="mb-10 rounded border border-amber-900/30 bg-amber-950/5 p-5">
      <SectionHeader label="Learn from the greats" heading="Style profile" />

      {profile.philosophy && (
        <section className="mt-4">
          <h3 className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Philosophy</h3>
          <div className="max-w-3xl space-y-2 text-sm leading-relaxed text-zinc-300">
            {profile.philosophy.split(/\n\n+/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {profile.signature_techniques.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Signature techniques</h3>
          <ul className="space-y-1 text-sm text-zinc-200">
            {profile.signature_techniques.map((t, i) => (
              <li key={i} className="border-l-2 border-amber-700/60 pl-2.5">
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.tools_of_choice.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Tools of choice</h3>
          <ul className="flex flex-wrap gap-1.5">
            {profile.tools_of_choice.map((t, i) => (
              <li key={i} className="rounded border border-zinc-700 bg-zinc-900/40 px-2 py-0.5 text-xs text-zinc-300">
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.tells && (
        <section className="mt-5">
          <h3 className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">How to recognize their work</h3>
          <p className="max-w-3xl text-sm leading-relaxed text-zinc-300">{profile.tells}</p>
        </section>
      )}

      {profile.process_notes && (
        <section className="mt-5">
          <h3 className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Process</h3>
          <div className="max-w-3xl space-y-2 text-sm leading-relaxed text-zinc-300">
            {profile.process_notes.split(/\n\n+/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {profile.influences.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Influences</h3>
          <p className="text-sm text-zinc-300">{profile.influences.join(' · ')}</p>
        </section>
      )}

      {profile.career_arc && (
        <section className="mt-5">
          <h3 className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Career arc</h3>
          <div className="max-w-3xl space-y-2 text-sm leading-relaxed text-zinc-300">
            {profile.career_arc.split(/\n\n+/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {profile.references.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">References</h3>
          <ul className="space-y-1 text-sm">
            {profile.references.map((r, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                <a
                  href={r.url}
                  target="_blank" rel="noopener noreferrer"
                  className="text-zinc-200 hover:text-amber-400"
                >
                  {r.title}
                </a>
                {r.publication && (
                  <span className="text-xs text-zinc-500">— {r.publication}</span>
                )}
                {r.kind && (
                  <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                    {r.kind}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(profile.curated_by || profile.last_verified_at) && (
        <p className="mt-5 text-[11px] text-zinc-500">
          {profile.curated_by && (
            <>
              Curated by{' '}
              {profile.curated_by_url ? (
                <a href={profile.curated_by_url} className="text-amber-400/80 hover:text-amber-400">
                  {profile.curated_by}
                </a>
              ) : (
                <span className="text-zinc-300">{profile.curated_by}</span>
              )}
            </>
          )}
          {profile.curated_by && profile.last_verified_at && ' · '}
          {profile.last_verified_at && (
            <>
              Last verified{' '}
              <time dateTime={profile.last_verified_at} className="font-mono">
                {profile.last_verified_at.slice(0, 10)}
              </time>
            </>
          )}
        </p>
      )}
    </div>
  );
}
