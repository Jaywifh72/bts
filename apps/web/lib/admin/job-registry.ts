/**
 * Job registry — single source of truth for the admin /ingest page.
 *
 * Each job wraps either a scraper CLI command (packages/scraper/src/cli.ts)
 * or a seed script (packages/db/scripts/*.ts). The runner (job-runner.ts)
 * spawns the wrapped command and captures stdout/stderr into a job_runs
 * row; this module only knows about the metadata.
 *
 * Adding a job:
 *   1. Append a new entry to JOBS below.
 *   2. The /ingest page picks it up automatically.
 *   3. If the underlying script doesn't already exist, write it first
 *      under packages/db/scripts/ or the scraper module.
 */

export type JobInputField = {
  /** Canonical key for the param. Passed to the script as --<name> <value>. */
  name: string;
  /** Human label shown in the form. */
  label: string;
  type: 'number' | 'text' | 'boolean';
  /** Optional placeholder / hint. */
  placeholder?: string;
  /** Optional default; injected when the form leaves the field blank. */
  default?: string | number | boolean;
};

export type JobDef = {
  id: string;
  group:
    | 'tmdb'
    | 'wikidata'
    | 'sources'
    | 'embeddings'
    | 'editorial'
    | 'social';
  /** Short human label. Becomes the card title. */
  label: string;
  /** One-line description of what this job does. */
  description: string;
  /** Argv for the spawned process. cwd is the monorepo root. */
  command: {
    /** Executable. Defaults to 'pnpm'. */
    bin?: string;
    /** Args to pass. Form field values append as --<name> <value>. */
    args: string[];
    /** Working directory relative to monorepo root. */
    cwd?: string;
  };
  inputs?: JobInputField[];
  /**
   * Estimated duration tier. Used to badge the card so the operator
   * doesn't accidentally kick off a 90-minute embedding run.
   */
  weight: 'fast' | 'medium' | 'long';
};

// ── TMDb sync ──────────────────────────────────────────────────────

const TMDB_JOBS: JobDef[] = [
  {
    id: 'tmdb:import',
    group: 'tmdb',
    label: 'TMDb — bulk import top-rated',
    description:
      'Import top-rated movies from TMDb /discover, gated by min vote count. Idempotent on tmdb_id; safe to re-run.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'tmdb:import'] },
    inputs: [
      { name: 'limit', label: 'Limit', type: 'number', placeholder: '500' },
      { name: 'min-votes', label: 'Min vote count', type: 'number', placeholder: '200' },
      { name: 'start-page', label: 'Start page', type: 'number', placeholder: '1' },
    ],
    weight: 'long',
  },
  {
    id: 'tmdb:enrich',
    group: 'tmdb',
    label: 'TMDb — enrich existing rows',
    description:
      'Default (no flags): backfill posters/genres/popularity for productions that have a tmdb_id but no poster_path yet — re-running on a healthy DB is a no-op. Toggle "Refresh existing" to re-touch EVERY tmdb-linked row instead (periodic sync). Safety guard skips rows whose stored title diverges sharply from TMDb; enable Force to override.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'tmdb:enrich'] },
    inputs: [
      { name: 'refresh', label: 'Refresh existing (re-touch every tmdb-linked row)', type: 'boolean' },
      { name: 'force', label: 'Force (override title-similarity safety guard)', type: 'boolean' },
    ],
    weight: 'long',
  },
  {
    id: 'tmdb:credits',
    group: 'tmdb',
    label: 'TMDb — import credits',
    description:
      'For every production, fetch its full crew credit list from TMDb and upsert into people + crew_assignments.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'tmdb:credits'] },
    inputs: [
      { name: 'limit', label: 'Limit', type: 'number', placeholder: 'all' },
    ],
    weight: 'long',
  },
  {
    id: 'tmdb:persons',
    group: 'tmdb',
    label: 'TMDb — enrich persons',
    description:
      'For every person referenced by a credit, fetch /person/{id} and refresh bio, profile path, birth/death dates.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'tmdb:persons'] },
    inputs: [
      { name: 'limit', label: 'Limit', type: 'number', placeholder: 'all' },
      { name: 'refresh', label: 'Refresh existing', type: 'boolean' },
    ],
    weight: 'long',
  },
  {
    id: 'tmdb:release-dates',
    group: 'tmdb',
    label: 'TMDb — release dates',
    description:
      'Fetch release-date variants by region from TMDb (theatrical, premiere, digital) for every production.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'tmdb:release-dates'] },
    inputs: [
      { name: 'limit', label: 'Limit', type: 'number', placeholder: 'all' },
      { name: 'refresh', label: 'Refresh existing', type: 'boolean' },
    ],
    weight: 'medium',
  },
];

// ── Wikidata ───────────────────────────────────────────────────────

const WIKIDATA_JOBS: JobDef[] = [
  {
    id: 'wikidata:resolve-productions',
    group: 'wikidata',
    label: 'Wikidata — resolve production IDs',
    description:
      'For productions missing a wikidata_id, search by IMDb ID + title to resolve the canonical Wikidata Q-number.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'wikidata:resolve'] },
    inputs: [
      { name: 'limit', label: 'Limit', type: 'number', placeholder: 'all' },
    ],
    weight: 'medium',
  },
  {
    id: 'wikidata:resolve-people',
    group: 'wikidata',
    label: 'Wikidata — resolve person IDs',
    description:
      'For people missing a wikidata_id, search by IMDb ID + display name to resolve the canonical Q-number.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'wikidata:resolve', '--target=people'] },
    inputs: [
      { name: 'limit', label: 'Limit', type: 'number', placeholder: 'all' },
    ],
    weight: 'medium',
  },
  {
    id: 'wikidata:awards',
    group: 'wikidata',
    label: 'Wikidata — backfill awards',
    description:
      'Pull awards data from Wikidata for productions and people, populating the awards table.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'wikidata:awards'] },
    inputs: [
      { name: 'limit', label: 'Limit', type: 'number', placeholder: 'all' },
      { name: 'refresh', label: 'Refresh existing', type: 'boolean' },
    ],
    weight: 'medium',
  },
  {
    id: 'wikidata:education',
    group: 'wikidata',
    label: 'Wikidata — backfill education',
    description:
      'Pull alma-mater / film-school affiliations from Wikidata into the people.film_schools array.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'wikidata:education'] },
    inputs: [
      { name: 'limit', label: 'Limit', type: 'number', placeholder: 'all' },
      { name: 'refresh', label: 'Refresh existing', type: 'boolean' },
    ],
    weight: 'medium',
  },
];

// ── Sources / archive ──────────────────────────────────────────────

const SOURCE_JOBS: JobDef[] = [
  {
    id: 'sources:health',
    group: 'sources',
    label: 'Source health check',
    description:
      'For every reference URL in the corpus, perform a HEAD request and update source_health rows. Stale-after-days gates which URLs to re-check.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'sources:health'] },
    inputs: [
      { name: 'limit', label: 'Limit', type: 'number', placeholder: 'all' },
      { name: 'stale-days', label: 'Stale after (days)', type: 'number', placeholder: '14' },
    ],
    weight: 'long',
  },
  {
    id: 'wayback:archive',
    group: 'sources',
    label: 'Wayback — archive pending sources',
    description:
      'Submit reference URLs to the Internet Archive Wayback Machine for permanent archival. Targets sources without a recent archive snapshot.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'wayback:archive'] },
    inputs: [
      { name: 'limit', label: 'Limit', type: 'number', placeholder: 'all' },
    ],
    weight: 'long',
  },
];

// ── Embeddings + media ─────────────────────────────────────────────

const EMBEDDING_JOBS: JobDef[] = [
  {
    id: 'embed:productions',
    group: 'embeddings',
    label: 'Embed productions',
    description:
      'Compute and store text embeddings for productions (title + synopsis) for semantic search.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'embed:productions'] },
    inputs: [
      { name: 'limit', label: 'Limit', type: 'number', placeholder: 'all' },
      { name: 'refresh', label: 'Refresh existing', type: 'boolean' },
    ],
    weight: 'long',
  },
  {
    id: 'embed:people',
    group: 'embeddings',
    label: 'Embed people',
    description:
      'Compute and store text embeddings for crew bios for semantic similarity matching.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'embed:people'] },
    inputs: [
      { name: 'limit', label: 'Limit', type: 'number', placeholder: 'all' },
      { name: 'refresh', label: 'Refresh existing', type: 'boolean' },
    ],
    weight: 'long',
  },
  {
    id: 'palette:extract',
    group: 'embeddings',
    label: 'Key-frame palette extraction',
    description:
      'For every key frame, extract the dominant colour palette (k-means in LAB) and store on the row.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'palette:extract'] },
    inputs: [
      { name: 'limit', label: 'Limit', type: 'number', placeholder: 'all' },
      { name: 'refresh', label: 'Refresh existing', type: 'boolean' },
    ],
    weight: 'medium',
  },
  {
    id: 'phash:extract',
    group: 'embeddings',
    label: 'Key-frame perceptual hash',
    description:
      'Compute pHash for every key frame to enable near-duplicate detection across the keyframe set.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'phash:extract'] },
    inputs: [
      { name: 'limit', label: 'Limit', type: 'number', placeholder: 'all' },
      { name: 'refresh', label: 'Refresh existing', type: 'boolean' },
    ],
    weight: 'medium',
  },
  {
    id: 'embed:visual',
    group: 'embeddings',
    label: 'Key-frame visual embedding',
    description:
      'Compute CLIP-style visual embeddings for every key frame to power the "frames that look like this" cross-link.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'embed:visual'] },
    inputs: [
      { name: 'limit', label: 'Limit', type: 'number', placeholder: 'all' },
      { name: 'refresh', label: 'Refresh existing', type: 'boolean' },
    ],
    weight: 'long',
  },
];

// ── Editorial seeds ────────────────────────────────────────────────
// These are the curated seeds shipped under packages/db/scripts/. They
// are idempotent and safe to re-run; re-running refreshes the editorial
// pass without disturbing TMDb-sourced fields.

const EDITORIAL_JOBS: JobDef[] = [
  {
    id: 'seed:vfx-house-editorial',
    group: 'editorial',
    label: 'VFX house editorial',
    description:
      'Seed editorial prose (tagline + summary + references) onto curated VFX-house rows. Idempotent.',
    command: { args: ['tsx', 'scripts/seed-vfx-house-editorial.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:gear-editorial',
    group: 'editorial',
    label: 'Gear editorial',
    description:
      'Seed editorial prose onto manufacturer + equipment-series rows.',
    command: { args: ['tsx', 'scripts/seed-gear-editorial.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:item-editorial',
    group: 'editorial',
    label: 'Equipment-item editorial',
    description:
      'Seed product blurbs, value-statement, and compatibility data onto curated equipment items.',
    command: { args: ['tsx', 'scripts/seed-item-editorial.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:stunt-editorial',
    group: 'editorial',
    label: 'Stunt companies + schools',
    description:
      'Seed editorial prose for stunt companies and schools (Phase 1).',
    command: { args: ['tsx', 'scripts/seed-stunt-editorial.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:stunt-performers',
    group: 'editorial',
    label: 'Stunt performers + coordinators',
    description:
      '15 marquee performers with disciplines, doubling history, training credentials (Phase 2).',
    command: { args: ['tsx', 'scripts/seed-stunt-performers.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:stunt-sequences',
    group: 'editorial',
    label: 'Stunt sequences',
    description:
      'Sequence-level rigging breakdowns with credits and references (Phase 3).',
    command: { args: ['tsx', 'scripts/seed-stunt-sequences.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:stunt-lineages',
    group: 'editorial',
    label: 'Stunt lineages',
    description:
      'Mentor → protégé chains across the documented stunt-coordination dynasties (Phase 4).',
    command: { args: ['tsx', 'scripts/seed-stunt-lineages.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:stunt-rigging',
    group: 'editorial',
    label: 'Stunt rigging glossary',
    description:
      '23 rigging techniques across 8 categories with mechanism + safety prose (Phase 5).',
    command: { args: ['tsx', 'scripts/seed-stunt-rigging.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:safety-bulletins',
    group: 'editorial',
    label: 'SAG-AFTRA safety bulletins',
    description:
      '11 indexed bulletins with scope + key requirements (Phase 6).',
    command: { args: ['tsx', 'scripts/seed-safety-bulletins.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:eca-awards',
    group: 'editorial',
    label: 'Emerging Cinematographer Awards',
    description:
      'Seed the ECA award rows from the curated list of recipients.',
    command: { args: ['tsx', 'scripts/seed-eca-awards.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  // ── Awards: hand-seeded org-recipient rows + auto-attribution backfills ──
  // Idempotent. Safe to re-run after any awards data change.
  {
    id: 'seed:org-recipient-awards',
    group: 'editorial',
    label: 'Awards — VFX/stunt org recipients',
    description:
      'Seed hand-verified org-recipient awards: VES wins routed to VFX houses (Framestore, ILM, DNEG) and SAG/Taurus when documented for stunt companies. Idempotent — re-running on a healthy DB no-ops.',
    command: { args: ['tsx', 'scripts/seed-org-recipient-awards.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'backfill:pre-2000-awards',
    group: 'editorial',
    label: 'Awards — pre-2000 backfill',
    description:
      'Hand-curated pre-2000 award rows for the marquee historic films (Apocalypse Now, Lawrence of Arabia, Barry Lyndon, etc.). 24 rows of Academy/BAFTA/Cannes/Venice provenance the public scrapers don’t reliably reach for older decades.',
    command: { args: ['tsx', 'scripts/backfill-pre-2000-awards.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'backfill:award-recipients',
    group: 'editorial',
    label: 'Awards — auto-attribute single-recipient categories',
    description:
      'Generalised backfill that joins production_awards (cinematography / directing / editing / screenplay / score / costume / production-design) to crew_assignments and populates recipient_person_id where exactly one crew member matches the category. Multi-credit rows are logged and skipped (run the splitter pass below for those). Pre-0057 duplicate rows are deduplicated. Idempotent.',
    command: { args: ['tsx', 'scripts/backfill-award-recipients.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'medium',
  },
  {
    id: 'backfill:award-recipients-multi',
    group: 'editorial',
    label: 'Awards — split multi-credit categories',
    description:
      'Second-pass backfill: for productions where 2+ people qualify (Coen brothers, screenwriter teams, multi-DP films), insert one award row per credited recipient and drop the NULL-recipient orphan. Per-bucket cap on candidate count guards against noisy seed data. Idempotent.',
    command: { args: ['tsx', 'scripts/backfill-award-recipients-multi.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'medium',
  },
  {
    id: 'seed:camera-benchmarks',
    group: 'editorial',
    label: 'Camera benchmarks',
    description:
      'Seed dynamic-range / native-ISO / sensor-readout benchmarks for curated camera bodies.',
    command: { args: ['tsx', 'scripts/seed-camera-benchmarks.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
];

// ── Social ─────────────────────────────────────────────────────────

const SOCIAL_JOBS: JobDef[] = [
  {
    id: 'social:post',
    group: 'social',
    label: 'Social — post newly curated',
    description:
      'Post the latest curated production / discovery to configured social channels. Defaults to dry-run.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'social:post'] },
    inputs: [
      { name: 'dry-run', label: 'Dry run (no live post)', type: 'boolean', default: true },
      { name: 'limit', label: 'Limit', type: 'number', placeholder: '1' },
    ],
    weight: 'fast',
  },
  {
    id: 'newsletter:draft',
    group: 'social',
    label: 'Newsletter draft',
    description:
      'Generate a draft newsletter covering the last N days of curated activity.',
    command: { args: ['--filter', '@bts/scraper', 'cli', 'newsletter:draft'] },
    inputs: [
      { name: 'since-days', label: 'Since (days)', type: 'number', placeholder: '7' },
      { name: 'dry-run', label: 'Dry run', type: 'boolean', default: true },
    ],
    weight: 'fast',
  },
];

export const JOBS: JobDef[] = [
  ...TMDB_JOBS,
  ...WIKIDATA_JOBS,
  ...SOURCE_JOBS,
  ...EMBEDDING_JOBS,
  ...EDITORIAL_JOBS,
  ...SOCIAL_JOBS,
];

export const JOB_GROUPS: Array<{
  key: JobDef['group'];
  label: string;
  blurb: string;
}> = [
  {
    key: 'tmdb',
    label: 'TMDb sync',
    blurb: 'Bulk import + incremental enrichment from The Movie Database.',
  },
  {
    key: 'wikidata',
    label: 'Wikidata',
    blurb: 'Wikidata Q-number resolution and structured-data backfills.',
  },
  {
    key: 'sources',
    label: 'Sources & archive',
    blurb: 'Reference URL health checks and Internet Archive submissions.',
  },
  {
    key: 'embeddings',
    label: 'Embeddings & media',
    blurb: 'Text embeddings, key-frame palette / pHash / visual embeddings.',
  },
  {
    key: 'editorial',
    label: 'Editorial seeds',
    blurb: 'Re-run any of the curated seed scripts. Idempotent and safe.',
  },
  {
    key: 'social',
    label: 'Social & newsletter',
    blurb: 'Post-publication channels — defaults to dry-run.',
  },
];

export function getJobById(id: string): JobDef | null {
  return JOBS.find((j) => j.id === id) ?? null;
}
