import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

/**
 * E-20 v1 — Cinematography society queries.
 *
 * Membership is stored as a text[] of uppercase codes on
 * `people.member_societies` (e.g. ['ASC', 'BSC']). The `societies`
 * lookup carries canonical metadata for each code. Joins use the
 * containment operator `@>` so we can lean on the GIN index added in
 * migration 0058.
 */

export type SocietyWithCount = {
  slug: string;
  code: string;
  name: string;
  full_name: string;
  country: string | null;
  founded_year: number | null;
  member_count: number;
};

/**
 * Index page query — every catalogued society with a count of curated
 * people credited as a member. Societies with zero members still
 * render (they're real societies, just no member in our corpus yet);
 * the count tells the visitor what the page contains before they click.
 */
export async function listSocietiesWithCounts(
  db: SeedDb = defaultDb,
): Promise<SocietyWithCount[]> {
  const rows = await db.execute<SocietyWithCount>(sql`
    SELECT
      s.slug, s.code, s.name, s.full_name, s.country, s.founded_year,
      COALESCE((
        SELECT COUNT(*)::int FROM people p
        WHERE p.member_societies @> ARRAY[s.code]
      ), 0) AS member_count
    FROM societies s
    ORDER BY s.sort_order ASC, s.name ASC
  `);
  return [...rows];
}

export type SocietyDetail = {
  slug: string;
  code: string;
  name: string;
  full_name: string;
  country: string | null;
  founded_year: number | null;
  website: string | null;
  wikipedia_url: string | null;
  description: string | null;
};

export type SocietyMember = {
  slug: string;
  display_name: string;
  country: string | null;
  // Other societies this member belongs to — small slug+code projection so
  // the detail page can render "Also: BSC · AFC" chips without a second
  // query per row.
  other_societies: { code: string; slug: string }[];
  // Departments the person has crew credits in (lets the page group
  // members by camera / lighting / etc.) — small int array.
  primary_categories: string[];
};

export type SocietyWithMembers = {
  society: SocietyDetail;
  members: SocietyMember[];
};

/**
 * Detail page query — society metadata plus its member list.
 *
 * Returns null when the slug doesn't match (caller renders notFound()).
 */
export async function getSocietyWithMembers(
  db: SeedDb = defaultDb,
  slug: string,
): Promise<SocietyWithMembers | null> {
  const [society] = await db.execute<SocietyDetail>(sql`
    SELECT
      slug, code, name, full_name, country, founded_year,
      website, wikipedia_url, description
    FROM societies
    WHERE slug = ${slug}
    LIMIT 1
  `);
  if (!society) return null;

  const memberRows = await db.execute<{
    slug: string;
    display_name: string;
    country: string | null;
    other_codes: string[] | null;
    primary_categories: string[] | null;
  }>(sql`
    SELECT
      p.slug,
      p.display_name,
      p.country,
      -- Other society codes this person belongs to, minus the current
      -- society. Returned as a string[] so the page can map back to slugs
      -- via the catalogue without another query.
      ARRAY(
        SELECT UNNEST(p.member_societies)
        EXCEPT
        SELECT ${society.code}
      ) AS other_codes,
      -- Distinct role_category enums this person has crew credits in.
      -- Used to group the members by department on the detail page.
      ARRAY(
        SELECT DISTINCT r.category::text
        FROM crew_assignments ca
        JOIN roles r ON r.id = ca.role_id
        WHERE ca.person_id = p.id
        ORDER BY 1
      ) AS primary_categories
    FROM people p
    WHERE p.member_societies @> ARRAY[${society.code}]::text[]
    ORDER BY p.display_name ASC
  `);

  // Resolve other-society codes back to (code, slug) pairs using one
  // lookup query rather than N. Limits the round-trip count.
  const allOtherCodes = new Set<string>();
  for (const m of memberRows) {
    for (const c of m.other_codes ?? []) allOtherCodes.add(c);
  }
  const codeToSlug = new Map<string, string>();
  if (allOtherCodes.size > 0) {
    const lookup = await db.execute<{ code: string; slug: string }>(sql`
      SELECT code, slug FROM societies WHERE code = ANY(${[...allOtherCodes]}::text[])
    `);
    for (const r of lookup) codeToSlug.set(r.code, r.slug);
  }

  const members: SocietyMember[] = memberRows.map((m) => ({
    slug: m.slug,
    display_name: m.display_name,
    country: m.country,
    other_societies: (m.other_codes ?? [])
      .map((code) => {
        const s = codeToSlug.get(code);
        // Codes that aren't catalogued (e.g. 'CBE' — an honour, not a
        // society) still surface but with no link. Slug is empty string
        // to signal "uncatalogued" downstream.
        return { code, slug: s ?? '' };
      })
      .sort((a, b) => a.code.localeCompare(b.code)),
    primary_categories: m.primary_categories ?? [],
  }));

  return { society, members };
}

/**
 * Lookup helper for the badge renderer on /crew/[slug]. Returns the
 * subset of catalogued society codes (slug + code + name) given the
 * `people.member_societies` text[] on a single person — uncatalogued
 * codes are dropped here so the caller can render them as plain text
 * without a link.
 */
export async function lookupSocieties(
  db: SeedDb = defaultDb,
  codes: string[],
): Promise<Array<{ code: string; slug: string; name: string }>> {
  if (codes.length === 0) return [];
  const rows = await db.execute<{ code: string; slug: string; name: string }>(sql`
    SELECT code, slug, name FROM societies
    WHERE code = ANY(${codes}::text[])
    ORDER BY sort_order ASC
  `);
  return [...rows];
}
