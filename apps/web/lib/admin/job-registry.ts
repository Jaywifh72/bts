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

  // ── Deep-dive film seeds ────────────────────────────────────────
  // One card per hand-curated marquee production. Each seeds scenes,
  // crew, formats, color pipelines, lighting, locations, post-houses,
  // VFX credits, and awards for that single film. Idempotent (UPSERTs).
  // Re-run after schema changes touch any of those tables.
  {
    id: 'seed:anora',
    group: 'editorial',
    label: 'Deep-dive — Anora (2024)',
    description:
      "Sean Baker's 5-Oscar sweep (Picture, Director, Original Screenplay, Actress, Editing) + Cannes Palme d'Or. Shot 35mm Kodak film by Drew Daniels.",
    command: { args: ['tsx', 'scripts/seed-anora.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:blade-runner-2049',
    group: 'editorial',
    label: 'Deep-dive — Blade Runner 2049 (2017)',
    description:
      "Roger Deakins's first Oscar + Best VFX. Adds color pipeline, lighting setups, post-houses, BAFTA + ASC + the second Oscar (VFX) the prior audit missed.",
    command: { args: ['tsx', 'scripts/seed-blade-runner-2049.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:children-of-men',
    group: 'editorial',
    label: 'Deep-dive — Children of Men (2006)',
    description:
      "Lubezki's first major Cinematography nomination. Car-ambush long-take built from six sections + four locations; Tim Webber's Framestore CG newborn.",
    command: { args: ['tsx', 'scripts/seed-children-of-men.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:gravity',
    group: 'editorial',
    label: 'Deep-dive — Gravity (2013)',
    description:
      "7-Oscar sweep (Cinematography, VFX, Director, Editing, Sound × 2, Score). Lubezki's first Oscar + Webber's Light Box invention. Six prior-audit gaps filled.",
    command: { args: ['tsx', 'scripts/seed-gravity.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:no-country-for-old-men',
    group: 'editorial',
    label: 'Deep-dive — No Country for Old Men (2007)',
    description:
      "Coen Brothers + Roger Deakins. 4 Oscars (Picture, Director, Adapted Screenplay, Supporting Actor). 35mm Panavision spherical, deliberate non-DI photochemical finish.",
    command: { args: ['tsx', 'scripts/seed-no-country-for-old-men.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:parasite',
    group: 'editorial',
    label: 'Deep-dive — Parasite (2019)',
    description:
      "First non-English Best Picture winner. Bong Joon-ho's 4-Oscar sweep + Palme d'Or. Patches the prior 5-row audit (incl. a misattributed Cinematography row).",
    command: { args: ['tsx', 'scripts/seed-parasite.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:the-brutalist',
    group: 'editorial',
    label: 'Deep-dive — The Brutalist (2024)',
    description:
      'Lol Crawley shot the first VistaVision narrative feature since 1961 (64-year gap). Won Cinematography + Actor + Score at the 2025 Oscars; Venice Silver Lion.',
    command: { args: ['tsx', 'scripts/seed-the-brutalist.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:the-revenant',
    group: 'editorial',
    label: 'Deep-dive — The Revenant (2015)',
    description:
      "Lubezki's record-setting third consecutive Best Cinematography Oscar. ARRI ALEXA 65 shot with a strict no-electric-lighting rule (natural daylight + practical fire only).",
    command: { args: ['tsx', 'scripts/seed-the-revenant.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:top-gun-maverick',
    group: 'editorial',
    label: 'Deep-dive — Top Gun: Maverick (2022)',
    description:
      "Most cinematographically-documented marquee release of the past decade. Miranda + Nowell's six-camera Sony VENICE Rialto rig + Light Iron / Company 3 pipeline + Tudhope's 2,400 invisible-VFX shots.",
    command: { args: ['tsx', 'scripts/seed-top-gun-maverick.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },

  // ── Cross-cutting editorial seeds ────────────────────────────────
  // Tables shared across multiple films — re-run after adding new film
  // seeds whose data overlaps these tables.
  {
    id: 'seed:color-pipelines',
    group: 'editorial',
    label: 'Color pipelines — marquee productions',
    description:
      'Camera-log → IDT → working-space → ODT → deliverable chains for ~10 marquee productions whose color science is well-documented in ASC/CML/trade-press sources.',
    command: { args: ['tsx', 'scripts/seed-color-pipelines.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:dune2-colorpipeline',
    group: 'editorial',
    label: 'Color pipeline — Dune: Part Two',
    description:
      'E-24 demo seed: ALEXA 65 LogC3 → ARRI Wide Gamut 3 → ACEScct → Rec.709 SDR / Rec.2020 PQ HDR-10. Subsumed by `seed:color-pipelines`; kept for the targeted demo path.',
    command: { args: ['tsx', 'scripts/seed-dune2-colorpipeline.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:lighting-setups',
    group: 'editorial',
    label: 'Lighting setups — per-scene plots',
    description:
      'Per-scene lighting plots for marquee scenes — setup_name + motivation + execution notes. Fixture-level rows (key / fill / back) are seeded by the film deep-dives.',
    command: { args: ['tsx', 'scripts/seed-lighting-setups.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:poor-things-lighting',
    group: 'editorial',
    label: 'Lighting setup — Poor Things rooftops',
    description:
      "E-22 demo seed: one curated lighting setup on Poor Things' Lisbon rooftops scene. Idempotent UPSERT.",
    command: { args: ['tsx', 'scripts/seed-poor-things-lighting.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:locations',
    group: 'editorial',
    label: 'Locations — geocoded shooting sites',
    description:
      'Fills production_locations for marquee films covered by the color/lighting seeds but missing from the geocoded dataset. WGS-84 coordinates to 6 decimals from public scout records / BTS interviews.',
    command: { args: ['tsx', 'scripts/seed-locations.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:post-house-links',
    group: 'editorial',
    label: 'Post-house production links',
    description:
      'Wires post_houses (Light Iron, Company 3, Park Road, etc.) to the productions they finished. Bridges the gap between color-pipeline editorial notes and the 13-facility post_houses table.',
    command: { args: ['tsx', 'scripts/seed-post-house-links.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:sequence-credits',
    group: 'editorial',
    label: 'Stunt — sequence credits',
    description:
      'Phase 12: credits for the 6 marquee stunt sequences. doubling_for_person_id ties a double to the actor they doubled so the sequence detail page renders both.',
    command: { args: ['tsx', 'scripts/seed-sequence-credits.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:stunt-memberships-doubling',
    group: 'editorial',
    label: 'Stunt — company memberships + doubling',
    description:
      'Phase 8: places existing stunt-people rows into their companies (surfaces "prominent members" on each company page) + records the doubler ↔ doubled-actor ↔ production triple for marquee shows.',
    command: { args: ['tsx', 'scripts/seed-stunt-memberships-doubling.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:stunt-doubling-expansion',
    group: 'editorial',
    label: 'Stunt — doubling expansion',
    description:
      "Phase 9: expands the doubling dataset beyond the 6-row Phase 8 proof. Adds the Avengers core-four primary doubles, Mad Max: Fury Road's lead, Matrix's Trinity double.",
    command: { args: ['tsx', 'scripts/seed-stunt-doubling-expansion.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'seed:stunt-sequences-marquee',
    group: 'editorial',
    label: 'Stunt — marquee fight/action sequences',
    description:
      'Phase 11: six iconic close-quarters + rigged-fall set-pieces for productions already in the doubling dataset. Complements the prior vehicle-heavy sequence seeds.',
    command: { args: ['tsx', 'scripts/seed-stunt-sequences-marquee.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },

  // ── Backfills + curation (post-load operations) ──────────────────
  {
    id: 'backfill:claims',
    group: 'editorial',
    label: 'Claims — backfill from curated rows',
    description:
      'Generates rows in the claims/evidence graph from existing curated production data (formats, equipment usage, VFX credits, color pipelines, lighting, post-houses). Idempotent.',
    command: { args: ['tsx', 'scripts/backfill-claims.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'medium',
  },
  {
    id: 'backfill:entity-images',
    group: 'editorial',
    label: 'Entity images — website + Wikidata IDs',
    description:
      "Backfills `website` (or Wikidata domain fallback) for studios + post-houses + VFX-houses so the BrandLogo component can hot-link Google's favicon service. Company-side counterpart to TMDb profile_path for people.",
    command: { args: ['tsx', 'scripts/backfill-entity-images.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'backfill:society-memberships',
    group: 'editorial',
    label: 'Society memberships — ASC / BSC / AFC etc.',
    description:
      'Hand-curated society memberships for the most-cited camera-department people. Public society directories only (ASC, BSC, AFC, ACS, CSC, AOP, IMAGO, etc.) — high-confidence E-E-A-T signal.',
    command: { args: ['tsx', 'scripts/backfill-society-memberships.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'fast',
  },
  {
    id: 'backfill:media-videos',
    group: 'editorial',
    label: 'Media — videos → media_assets',
    description:
      'Phase 23: backfills production_videos rows into the polymorphic media_assets + media_associations tables (kind=video). Idempotent natural-key URL upsert.',
    command: { args: ['tsx', 'scripts/backfill-media-videos.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'medium',
  },
  {
    id: 'backfill:media-keyframes',
    group: 'editorial',
    label: 'Media — keyframes → media_assets',
    description:
      'Phase 24: backfills production_keyframes into media_assets (kind=image) + media_associations (role=subject). Idempotent.',
    command: { args: ['tsx', 'scripts/backfill-media-keyframes.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'medium',
  },
  {
    id: 'backfill:media-references',
    group: 'editorial',
    label: 'Media — per-entity references → media_assets',
    description:
      'Phase 25: backfills the per-entity `references` jsonb arrays across editorial tables into media_assets + media_associations (role=reference). Deduplicates URLs shared across multiple entities.',
    command: { args: ['tsx', 'scripts/backfill-media-references.ts'], cwd: 'packages/db', bin: 'npx' },
    weight: 'medium',
  },

  // ── Equipment curation ───────────────────────────────────────────
  {
    id: 'curate:lens-specs-v2',
    group: 'editorial',
    label: 'Lens specs — v2 metadata patch',
    description:
      'E-21: patches equipment_items.specs JSONB with manufacturer-published numbers (image circle, weight, close focus, front diameter) for the highest-traffic lens series. Idempotent — merges over existing JSONB without stomping unrelated fields.',
    command: { args: ['tsx', 'scripts/curate-lens-specs-v2.ts'], cwd: 'packages/db', bin: 'npx' },
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
