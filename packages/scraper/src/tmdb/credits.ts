import 'dotenv/config';
import { db, sql } from '@bts/db';
import { fetchMovieCredits, type TmdbCrewMember } from './client.ts';

/**
 * Bulk-import TMDb crew credits for productions in our DB.
 *
 * Strategy:
 *   - For every production with tmdb_id, fetch /movie/{id}/credits.
 *   - Filter the crew list to roles we surface (the long tail of "Catering"
 *     and "Stand-ins" are dropped).
 *   - Upsert people by tmdb_person_id (or fall back to display_name slug).
 *   - Upsert crew_assignments on the unique (production, person, role) key.
 *
 * Skipped:
 *   - cast (TMDb returns it but our schema doesn't have actor support yet)
 *   - rows already attributed by hand-curated seed data are preserved by the
 *     ON CONFLICT DO NOTHING clause on crew_assignments.
 */

export type CreditsStats = {
  productions_processed: number;
  productions_skipped: number;
  people_inserted: number;
  people_updated: number;
  assignments_inserted: number;
  assignments_skipped: number;
};

/**
 * Maps a TMDb job string to one of our role slugs. The TMDb job catalog has
 * ~600 distinct strings; we only surface the technically-meaningful ones for
 * this site's audience. Returning null skips the credit entirely.
 */
function jobToRoleSlug(job: string, department: string): string | null {
  // Direct matches against our role slugs / common names
  const j = job.trim();
  const map: Record<string, string> = {
    'Director': 'director',
    'Director of Photography': 'director-of-photography',
    'Cinematography': 'director-of-photography',
    'Camera Operator': 'camera-operator',
    'A Camera Operator': 'a-camera-operator',
    'B Camera Operator': 'b-camera-operator',
    'First Assistant Camera': 'first-ac',
    '"A" Camera First Assistant': 'first-ac',
    'Second Assistant Camera': 'second-ac',
    'Loader': 'loader',
    'Digital Imaging Technician': 'dit',
    'DIT': 'dit',
    'Steadicam Operator': 'steadicam-operator',
    'Aerial Director of Photography': 'aerial-dp',
    'Aerial Camera': 'aerial-dp',
    'Underwater Director of Photography': 'underwater-dp',
    'Editor': 'editor',
    'Co-Editor': 'editor',
    'Production Designer': 'production-designer',
    'Art Director': 'art-director',
    'Property Master': 'prop-master',
    'Prop Master': 'prop-master',
    'Set Decoration': 'set-decorator',
    'Set Decorator': 'set-decorator',
    'Costume Design': 'costume-designer',
    'Costume Designer': 'costume-designer',
    'Makeup Department Head': 'makeup-dept-head',
    'Hair Department Head': 'hair-dept-head',
    'Makeup Effects': 'makeup-effects-supervisor',
    'Special Makeup Effects': 'makeup-effects-supervisor',
    'Production Sound Mixer': 'production-sound-mixer',
    'Sound Mixer': 'production-sound-mixer',
    'Boom Operator': 'boom-operator',
    'Re-Recording Mixer': 're-recording-mixer',
    'Sound Re-Recording Mixer': 're-recording-mixer',
    'Sound Designer': 'sound-designer',
    'Supervising Sound Editor': 'supervising-sound-editor',
    'Sound Editor': 'sound-editor',
    'Dialogue Editor': 'dialog-editor',
    'Foley Artist': 'foley-artist',
    'Music Editor': 'music-editor',
    'Music Supervisor': 'music-supervisor',
    'Original Music Composer': 'composer',
    'Composer': 'composer',
    'Music': 'composer',
    'Gaffer': 'gaffer',
    'Best Boy Electric': 'best-boy-electric',
    'Lamp Operator': 'lamp-operator',
    'Lighting Technician': 'lamp-operator',
    'Electrician': 'lamp-operator',
    'Key Grip': 'key-grip',
    'Best Boy Grip': 'best-boy-grip',
    'Dolly Grip': 'dolly-grip',
    'Crane Grip': 'crane-grip',
    'Producer': 'producer',
    'Executive Producer': 'producer',
    'Co-Producer': 'producer',
    'Line Producer': 'line-producer',
    'First Assistant Director': 'first-ad',
    'Second Assistant Director': 'second-ad',
    'Visual Effects Supervisor': 'vfx-supervisor',
    'VFX Supervisor': 'vfx-supervisor',
    'Visual Effects Producer': 'vfx-producer',
    'Compositing Supervisor': 'compositing-supervisor',
    'Colorist': 'colorist',
    'Color Timer': 'colorist',
    'Color Grading': 'colorist',
    'Stunt Coordinator': 'stunt-coordinator',
    'Stunts': 'stunts',
    'Post Production Supervisor': 'post-supervisor',
    'Screenplay': 'screenwriter',
    'Writer': 'screenwriter',
    'Story': 'screenwriter',
    'Novel': 'screenwriter',
  };
  if (map[j]) return map[j]!;

  // Department-level fallbacks for jobs we don't explicitly map but want to
  // capture as a coarse role. We deliberately DON'T map "Crew", "Catering",
  // "Stand-ins", "Drivers" etc. — return null to skip them.
  if (department === 'Directing' && j.startsWith('Assistant Director')) return 'first-ad';

  return null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function loadRoleSlugMap(): Promise<Map<string, number>> {
  const rows = await db.execute<{ slug: string; id: number }>(sql`
    SELECT slug, id FROM roles
  `);
  return new Map(rows.map((r) => [r.slug, r.id]));
}

async function ensureRolesExist(slugs: Set<string>) {
  // Some role slugs we map to may not exist yet (second-ac, steadicam-operator,
  // underwater-dp, vfx-producer, set-decorator, sound-designer,
  // supervising-sound-editor, sound-editor, screenwriter, second-ad, stunts,
  // stunt-coordinator). Insert missing ones with a sensible category.
  const newRoleDefs: Record<string, { name: string; category: string }> = {
    'second-ac': { name: 'Second Assistant Camera', category: 'camera' },
    'steadicam-operator': { name: 'Steadicam Operator', category: 'camera' },
    'underwater-dp': { name: 'Underwater Director of Photography', category: 'camera' },
    'set-decorator': { name: 'Set Decorator', category: 'art' },
    'sound-designer': { name: 'Sound Designer', category: 'sound' },
    'supervising-sound-editor': { name: 'Supervising Sound Editor', category: 'sound' },
    'sound-editor': { name: 'Sound Editor', category: 'sound' },
    'vfx-supervisor': { name: 'Visual Effects Supervisor', category: 'vfx' },
    'vfx-producer': { name: 'Visual Effects Producer', category: 'vfx' },
    'screenwriter': { name: 'Screenwriter', category: 'writing' },
    'second-ad': { name: 'Second Assistant Director', category: 'production' },
    'stunts': { name: 'Stunt Performer', category: 'production' },
    'stunt-coordinator': { name: 'Stunt Coordinator', category: 'production' },
  };

  for (const slug of slugs) {
    const def = newRoleDefs[slug];
    if (!def) continue;
    await db.execute(sql`
      INSERT INTO roles (slug, name, category)
      VALUES (${slug}, ${def.name}, ${def.category}::role_category_enum)
      ON CONFLICT (slug) DO NOTHING
    `);
  }
}

async function upsertPerson(crewMember: TmdbCrewMember): Promise<{ id: number; created: boolean }> {
  const slug = slugify(crewMember.name);
  // First try by tmdb_person_id (most reliable)
  const [existingByTmdb] = await db.execute<{ id: number }>(sql`
    SELECT id FROM people WHERE tmdb_person_id = ${crewMember.id}
  `);
  if (existingByTmdb) {
    // Backfill profile_path if it's missing
    if (crewMember.profile_path) {
      await db.execute(sql`
        UPDATE people SET profile_path = COALESCE(profile_path, ${crewMember.profile_path})
        WHERE id = ${existingByTmdb.id}
      `);
    }
    return { id: existingByTmdb.id, created: false };
  }

  // Then try by slug (covers legacy hand-seeded people without tmdb_person_id)
  const [existingBySlug] = await db.execute<{ id: number; tmdb_person_id: number | null }>(sql`
    SELECT id, tmdb_person_id FROM people WHERE slug = ${slug}
  `);
  if (existingBySlug) {
    // Adopt the tmdb_person_id and profile_path on the existing row
    await db.execute(sql`
      UPDATE people
      SET tmdb_person_id = COALESCE(tmdb_person_id, ${crewMember.id}),
          profile_path = COALESCE(profile_path, ${crewMember.profile_path})
      WHERE id = ${existingBySlug.id}
    `);
    return { id: existingBySlug.id, created: false };
  }

  // New person
  const [created] = await db.execute<{ id: number }>(sql`
    INSERT INTO people (slug, display_name, tmdb_person_id, profile_path)
    VALUES (${slug}, ${crewMember.name}, ${crewMember.id}, ${crewMember.profile_path})
    ON CONFLICT (slug) DO UPDATE SET
      tmdb_person_id = COALESCE(people.tmdb_person_id, EXCLUDED.tmdb_person_id),
      profile_path = COALESCE(people.profile_path, EXCLUDED.profile_path)
    RETURNING id
  `);
  return { id: created!.id, created: true };
}

async function upsertCrewAssignment(
  productionId: number,
  personId: number,
  roleId: number,
): Promise<boolean> {
  const result = await db.execute<{ inserted: boolean }>(sql`
    INSERT INTO crew_assignments (production_id, person_id, role_id)
    VALUES (${productionId}, ${personId}, ${roleId})
    ON CONFLICT (production_id, person_id, role_id) DO NOTHING
    RETURNING TRUE AS inserted
  `);
  return result.length > 0;
}

export async function importTmdbCredits(opts: { limit?: number } = {}): Promise<CreditsStats> {
  const stats: CreditsStats = {
    productions_processed: 0,
    productions_skipped: 0,
    people_inserted: 0,
    people_updated: 0,
    assignments_inserted: 0,
    assignments_skipped: 0,
  };

  if (!process.env.TMDB_READ_ACCESS_TOKEN) {
    console.error('TMDB_READ_ACCESS_TOKEN not set; aborting.');
    return stats;
  }

  // We'll insert any missing roles up front based on the map, before walking
  // productions. That way a single MISS doesn't need a per-iteration upsert.
  await ensureRolesExist(new Set([
    'second-ac', 'steadicam-operator', 'underwater-dp', 'set-decorator',
    'sound-designer', 'supervising-sound-editor', 'sound-editor',
    'vfx-supervisor', 'vfx-producer', 'screenwriter', 'second-ad',
    'stunts', 'stunt-coordinator',
  ]));

  let roleMap = await loadRoleSlugMap();

  // Productions to process: those with tmdb_id, ordered most-popular-first so
  // a partial run still produces useful coverage. We'll also skip ones that
  // already have many crew_assignments (likely hand-curated) — for those we
  // still want TMDb on top, but the ON CONFLICT DO NOTHING handles it.
  const productions = await db.execute<{ id: number; tmdb_id: number; title: string }>(sql`
    SELECT id, tmdb_id, title FROM productions
    WHERE tmdb_id IS NOT NULL
    ORDER BY popularity DESC NULLS LAST, vote_average DESC NULLS LAST
    ${opts.limit ? sql`LIMIT ${opts.limit}` : sql``}
  `);

  console.log(`tmdb:credits — ${productions.length} productions to process`);

  for (const prod of productions) {
    try {
      const credits = await fetchMovieCredits(prod.tmdb_id);
      if (!credits) {
        stats.productions_skipped++;
        continue;
      }
      stats.productions_processed++;

      for (const crew of credits.crew) {
        const roleSlug = jobToRoleSlug(crew.job, crew.department);
        if (!roleSlug) continue;

        const roleId = roleMap.get(roleSlug);
        if (!roleId) {
          // Lazily reload role map if we mapped to a slug we don't have id for
          roleMap = await loadRoleSlugMap();
          const reloaded = roleMap.get(roleSlug);
          if (!reloaded) continue;
        }

        const { created } = await upsertPerson(crew);
        if (created) stats.people_inserted++;
        else stats.people_updated++;

        // Re-resolve in case map was reloaded
        const finalRoleId = roleMap.get(roleSlug)!;
        const personRow = await db.execute<{ id: number }>(sql`
          SELECT id FROM people WHERE tmdb_person_id = ${crew.id} OR slug = ${slugify(crew.name)} LIMIT 1
        `);
        if (!personRow[0]) continue;
        const inserted = await upsertCrewAssignment(prod.id, personRow[0].id, finalRoleId);
        if (inserted) stats.assignments_inserted++;
        else stats.assignments_skipped++;
      }

      if (stats.productions_processed % 25 === 0) {
        console.log(
          `  ${stats.productions_processed}/${productions.length} — people +${stats.people_inserted}, assignments +${stats.assignments_inserted}`,
        );
      }
    } catch (e) {
      stats.productions_skipped++;
      console.error(
        `  ✗ tmdb_id=${prod.tmdb_id} (${prod.title}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  console.log(
    `tmdb:credits done — productions ${stats.productions_processed} (skipped ${stats.productions_skipped}), ` +
      `people +${stats.people_inserted} (updated ${stats.people_updated}), ` +
      `assignments +${stats.assignments_inserted} (skipped ${stats.assignments_skipped})`,
  );
  return stats;
}
