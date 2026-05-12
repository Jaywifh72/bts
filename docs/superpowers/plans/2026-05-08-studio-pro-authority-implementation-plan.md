# Studio Pro Authority Implementation Plan

Date: 2026-05-08

Purpose: turn Studio Pro into the definitive authority for production-craft knowledge: gear, VFX, BTS videos, making-of evidence, scene-level technical data, source-backed claims, and practical tools for film professionals.

This document is intentionally task-heavy. It is meant to be used as an execution checklist while coding, not as a pitch deck.

## North Star

Studio Pro should answer production-craft questions faster, more accurately, and with better evidence than a professional could assemble from scattered sources in 20 minutes.

Examples:

- What camera/lens/filter package was used on a specific production or scene?
- Which source proves that claim?
- Where in a BTS video is the gear visible?
- Which VFX house handled a specific sequence?
- Which productions used this lens/camera/workflow?
- Which scenes share a similar technical approach?
- Which claims are verified, disputed, stale, or imported-only?

## Guiding Principles

- Every important technical fact is a claim with provenance.
- Imported data is clearly separate from verified editorial data.
- Scene-level and shot-level context are first-class, not optional extras.
- BTS videos are not just media embeds; they are evidence containers.
- Gear pages are reference hubs, not simple product listings.
- VFX house pages separate credited work from confirmed sequence work.
- The UI must make confidence, source quality, and freshness visible.
- Public APIs should expose stable, citation-friendly data contracts.
- The editorial workflow should make uncertainty explicit.

## Phase 0: Baseline Stabilization

### QA And Environment

- [ ] Confirm local development startup path works outside the restricted sandbox.
- [ ] Document supported startup commands for Windows PowerShell.
- [ ] Add a `README` troubleshooting note for `spawn EPERM` sandbox limitations.
- [ ] Confirm `pnpm typecheck` runs from root in normal developer shell.
- [ ] Confirm `pnpm db:test` runs against `bts_test`.
- [ ] Confirm `pnpm web:build` completes in normal developer shell.
- [ ] Add CI job for DB typecheck.
- [ ] Add CI job for web typecheck.
- [ ] Add CI job for scraper typecheck.
- [ ] Add CI job for DB tests.
- [ ] Add CI job for web production build.
- [ ] Add CI artifact upload for failed test logs.

### Encoding And Copy Cleanup

- [ ] Audit all source files for mojibake sequences.
- [ ] Replace corrupted arrows, em dashes, degree symbols, multiplication signs, and quote marks.
- [ ] Decide whether project text should be ASCII-only or UTF-8-rich.
- [ ] If ASCII-only, replace decorative characters with plain equivalents.
- [ ] If UTF-8-rich, add editorconfig or docs explaining UTF-8 expectation.
- [ ] Add a lightweight script to detect mojibake patterns.
- [ ] Add the mojibake script to CI.

### Existing Data Integrity

- [ ] Audit seeded productions for missing required technical fields.
- [ ] Audit curated productions for missing source rows.
- [ ] Audit scene rows for orphaned or weakly named slugs.
- [ ] Audit equipment usage rows for source coverage.
- [ ] Audit VFX credits for missing house/source attribution.
- [ ] Audit gear specs for inconsistent JSON keys.
- [ ] Add integrity tests for curated production completeness.
- [ ] Add integrity tests for source-backed technical claims.

## Phase 1: Claim-Level Authority System

### Schema: Claims

- [ ] Create `claims` table.
- [ ] Add `claims.id`.
- [ ] Add `claims.slug`.
- [ ] Add `claims.claim_type`.
- [ ] Add `claims.statement`.
- [ ] Add `claims.normalized_statement`.
- [ ] Add `claims.status`.
- [ ] Add `claims.confidence`.
- [ ] Add `claims.editorial_note`.
- [ ] Add `claims.created_at`.
- [ ] Add `claims.updated_at`.
- [ ] Add `claims.last_verified_at`.
- [ ] Add `claims.verified_by`.
- [ ] Add indexes for `claim_type`, `status`, `confidence`, `last_verified_at`.

### Claim Types

- [ ] Define claim type enum.
- [ ] Add `production_camera`.
- [ ] Add `production_lens`.
- [ ] Add `production_filter`.
- [ ] Add `production_format`.
- [ ] Add `production_lighting`.
- [ ] Add `production_color_pipeline`.
- [ ] Add `production_post_house`.
- [ ] Add `production_vfx_house`.
- [ ] Add `production_vfx_sequence`.
- [ ] Add `scene_camera`.
- [ ] Add `scene_lens`.
- [ ] Add `scene_lighting`.
- [ ] Add `scene_vfx`.
- [ ] Add `scene_location`.
- [ ] Add `gear_spec`.
- [ ] Add `person_credit`.
- [ ] Add `video_evidence`.
- [ ] Add `general_bts_fact`.

### Claim Status

- [ ] Define status enum.
- [ ] Add `candidate`.
- [ ] Add `needs_source`.
- [ ] Add `sourced`.
- [ ] Add `reviewed`.
- [ ] Add `verified`.
- [ ] Add `disputed`.
- [ ] Add `deprecated`.
- [ ] Add `rejected`.

### Claim Confidence

- [ ] Define confidence enum.
- [ ] Add `primary`.
- [ ] Add `secondary`.
- [ ] Add `manufacturer`.
- [ ] Add `rental_house`.
- [ ] Add `bts_visual`.
- [ ] Add `inferred`.
- [ ] Add `speculative`.
- [ ] Add `conflicting`.

### Schema: Claim Sources

- [ ] Create `claim_sources` table.
- [ ] Link `claim_sources.claim_id`.
- [ ] Link `claim_sources.source_id`.
- [ ] Add `claim_sources.confidence`.
- [ ] Add `claim_sources.quote`.
- [ ] Add `claim_sources.timestamp_seconds`.
- [ ] Add `claim_sources.page_number`.
- [ ] Add `claim_sources.url_fragment`.
- [ ] Add `claim_sources.editorial_note`.
- [ ] Enforce uniqueness on claim/source/timestamp where applicable.
- [ ] Add indexes for claim and source lookups.

### Schema: Claim Entity Links

- [ ] Create `claim_entities` table.
- [ ] Add polymorphic entity type enum.
- [ ] Support production links.
- [ ] Support scene links.
- [ ] Support person links.
- [ ] Support role links.
- [ ] Support equipment manufacturer links.
- [ ] Support equipment series links.
- [ ] Support equipment item links.
- [ ] Support VFX house links.
- [ ] Support source links.
- [ ] Support video links.
- [ ] Support post house links.
- [ ] Support location links.
- [ ] Add indexes for entity reverse lookups.

### Schema: Claim Conflicts

- [ ] Create `claim_conflicts` table.
- [ ] Link `claim_a_id`.
- [ ] Link `claim_b_id`.
- [ ] Add `conflict_kind`.
- [ ] Add `resolution_status`.
- [ ] Add `resolution_note`.
- [ ] Add `resolved_by`.
- [ ] Add `resolved_at`.
- [ ] Build query helper for conflicts by production.
- [ ] Build query helper for unresolved conflicts.

### Claim Query Layer

- [ ] Add `src/queries/claims.ts`.
- [ ] Implement `getClaimsForProduction`.
- [ ] Implement `getClaimsForScene`.
- [ ] Implement `getClaimsForGear`.
- [ ] Implement `getClaimsForPerson`.
- [ ] Implement `getClaimsForVfxHouse`.
- [ ] Implement `getClaimDetail`.
- [ ] Implement `listClaimsForReview`.
- [ ] Implement `createClaim`.
- [ ] Implement `updateClaimStatus`.
- [ ] Implement `attachClaimSource`.
- [ ] Implement `attachClaimEntity`.
- [ ] Implement `listUnresolvedClaimConflicts`.

### Claim Seed Migration

- [ ] Convert existing production format facts into claims.
- [ ] Convert existing equipment usage facts into claims.
- [ ] Convert existing VFX credits into claims.
- [ ] Convert existing color pipeline rows into claims.
- [ ] Convert existing lighting setup rows into claims.
- [ ] Convert existing post house rows into claims.
- [ ] Convert existing source attribution joins into `claim_sources`.
- [ ] Write migration script for backfilling claims from existing curated data.
- [ ] Add idempotency to migration script.
- [ ] Add tests for migration idempotency.

## Phase 2: Source And Evidence Model

### Source Quality

- [x] Extend source kind taxonomy.
- [x] Add `asc_article`.
- [x] Add `icg_article`.
- [x] Add `cinematographer_interview`.
- [x] Add `director_interview`.
- [x] Add `vfx_supervisor_interview`.
- [x] Add `official_epk`.
- [x] Add `bts_video`.
- [x] Add `vfx_breakdown_video`.
- [x] Add `manufacturer_documentation`.
- [x] Add `rental_house_confirmation`.
- [x] Add `studio_press_kit`.
- [x] Add `award_submission`.
- [x] Add `trade_article`.
- [x] Add `database_import`.
- [x] Add `community_submission`.

### Source Health

- [x] Ensure every URL source has `last_status`.
- [x] Ensure every URL source has `last_checked_at`.
- [x] Add `content_hash` for source drift detection.
- [x] Add `canonical_url`.
- [x] Add `paywall_status`.
- [x] Add `archive_status`.
- [ ] Add Wayback archive URL capture where possible.
- [x] Add source health dashboard.
- [x] Add stale source warning in UI.

### Evidence Objects

- [x] Create `evidence_items` table.
- [x] Add evidence kind enum.
- [x] Support `video_timestamp`.
- [x] Support `video_still`.
- [x] Support `article_quote`.
- [x] Support `image_crop`.
- [x] Support `pdf_page`.
- [x] Support `social_post`.
- [x] Support `manual_editor_note`.
- [x] Link evidence to claim.
- [x] Link evidence to source.
- [x] Add `thumbnail_url`.
- [x] Add `asset_url`.
- [x] Add `caption`.
- [x] Add `rights_note`.
- [x] Add `created_by`.
- [x] Add review status.

### Evidence UI

- [x] Add evidence gallery component.
- [ ] Add evidence timeline component for videos.
- [x] Add evidence badges on claim rows.
- [ ] Add “view evidence” drawer.
- [ ] Add image zoom modal.
- [x] Add source quote display.
- [ ] Add timestamp deep-link buttons.
- [ ] Add copy citation button.

## Phase 3: BTS Video Intelligence

### Video Schema Expansion

- [x] Add transcript table.
- [x] Add transcript segment table.
- [x] Add video chapter table.
- [x] Add video evidence tag table.
- [ ] Add detected visible gear table.
- [ ] Add detected people table.
- [ ] Add detected VFX technique table.
- [ ] Add video rights/status fields.
- [x] Add editorial category locking.
- [ ] Add video source health checks.

### Video Categories

- [ ] Expand categories to include camera test.
- [ ] Expand categories to include lens test.
- [ ] Expand categories to include lighting breakdown.
- [ ] Expand categories to include color workflow.
- [ ] Expand categories to include DI breakdown.
- [ ] Expand categories to include VFX breakdown.
- [ ] Expand categories to include virtual production.
- [ ] Expand categories to include stunt breakdown.
- [ ] Expand categories to include production design.
- [ ] Expand categories to include sound design.
- [ ] Expand categories to include animation breakdown.
- [ ] Expand categories to include previs/postvis.
- [ ] Expand categories to include interview.
- [ ] Expand categories to include press junket.
- [ ] Expand categories to include EPK package.

### Video Ingestion

- [ ] Improve YouTube discovery query templates.
- [ ] Improve Vimeo discovery query templates.
- [ ] Add official studio channel priority.
- [ ] Add VFX house channel priority.
- [ ] Add manufacturer channel priority.
- [ ] Add cinematographer interview channel priority.
- [ ] Add duplicate detection across platforms.
- [ ] Add duration filters.
- [ ] Add language detection.
- [ ] Add transcript fetch where available.
- [ ] Add transcript storage.
- [ ] Add transcript search indexing.
- [ ] Add video thumbnail caching policy.
- [ ] Add video confidence scoring.

### Timestamp Tagging

- [x] Build admin UI for timestamp annotations.
- [x] Add start/end timestamp fields.
- [x] Add annotation type.
- [ ] Add related entities picker.
- [ ] Add claim creation from timestamp annotation.
- [ ] Add still capture workflow.
- [ ] Add “visible gear” tag.
- [ ] Add “VFX before/after” tag.
- [ ] Add “lighting setup visible” tag.
- [ ] Add “monitor/LUT visible” tag.
- [ ] Add “rigging/stunt visible” tag.
- [ ] Add “virtual production visible” tag.

### Public Video Experience

- [x] Add video timeline on film pages.
- [x] Add BTS evidence section on film pages.
- [x] Add video filters by category.
- [x] Add “jump to timestamp” links.
- [x] Add “claims proven by this video” list.
- [x] Add “gear visible in this video” list.
- [ ] Add “VFX techniques shown” list.
- [ ] Add video pages if a detail view becomes necessary.

## Phase 4: Scene-Level Technical Knowledge

### Scene Detail Pages

- [x] Add route `/films/[slug]/scenes/[sceneSlug]`.
- [x] Add scene hero section.
- [ ] Add final still/keyframe support.
- [x] Add scene synopsis.
- [x] Add runtime position.
- [x] Add interior/exterior and time-of-day display.
- [x] Add location display.
- [x] Add camera package section.
- [x] Add lens/filter section.
- [x] Add lighting section.
- [ ] Add VFX section.
- [ ] Add post/color section.
- [x] Add BTS evidence section.
- [x] Add sources section.
- [ ] Add related scenes section.
- [x] Add corrections form.

### Scene Claims

- [x] Link scene pages to claims.
- [x] Surface claim confidence per section.
- [ ] Surface unresolved scene conflicts.
- [x] Add scene-specific citation markers.
- [x] Add source quote snippets.
- [ ] Add scene claim freshness indicator.

### Scene Similarity

- [ ] Generate scene embeddings from synopsis, technical claims, and tags.
- [ ] Add visual embeddings for keyframes where available.
- [ ] Add related scenes by gear.
- [ ] Add related scenes by lighting.
- [ ] Add related scenes by VFX technique.
- [ ] Add related scenes by composition/format.
- [ ] Add related scenes by location/time-of-day.

### Scene Admin

- [ ] Add scene creation/edit form.
- [ ] Add scene reorder controls.
- [ ] Add scene keyframe assignment.
- [ ] Add scene claim editor.
- [ ] Add scene evidence editor.
- [ ] Add scene source editor.

## Phase 5: Gear Authority

### Gear Data Model

- [ ] Audit current manufacturer/series/item split.
- [ ] Add gear aliases.
- [ ] Add gear variant table.
- [ ] Add rehousing relationships.
- [ ] Add rental-only status.
- [ ] Add image circle as structured field.
- [ ] Add sensor coverage fields.
- [ ] Add mount compatibility fields.
- [ ] Add front diameter fields.
- [ ] Add weight fields.
- [ ] Add close focus fields.
- [ ] Add squeeze factor fields.
- [ ] Add coating/version fields.
- [ ] Add manufacturer documentation source links.

### Gear Page Enhancements

- [ ] Add specs summary panel.
- [ ] Add manufacturer docs links.
- [ ] Add “used on productions” table.
- [ ] Add “used by crew” table.
- [ ] Add “commonly paired with” section.
- [ ] Add “compatible sensors” section.
- [ ] Add “known variants” section.
- [ ] Add “source-backed usage” section.
- [ ] Add “BTS appearances” section.
- [ ] Add “coverage checker” link with prefilled state.
- [ ] Add “compare” action.
- [ ] Add correction action.

### Gear Relationship Graph

- [ ] Build query for camera/lens pairings.
- [ ] Build query for lens/filter pairings.
- [ ] Build query for camera/format pairings.
- [ ] Build query for DP/gear pairings.
- [ ] Build query for production/gear clusters.
- [ ] Add graph visualization component.
- [ ] Add table fallback for accessibility.

### Gear Tools

- [ ] Expand sensor coverage checker with more cameras.
- [ ] Expand lens coverage checker with more lenses.
- [ ] Add frame-line export.
- [ ] Add data rate calculator.
- [ ] Add field-of-view calculator.
- [ ] Add crop factor calculator.
- [ ] Add depth-of-field calculator.
- [ ] Add matte box compatibility checker.
- [ ] Add loadout weight/cost estimator.
- [ ] Add shareable tool URLs.

## Phase 6: VFX Authority

### VFX House Model

- [ ] Add VFX house aliases.
- [ ] Add parent company relationships.
- [ ] Add office/location data.
- [ ] Add official website.
- [ ] Add official reel links.
- [ ] Add social links.
- [ ] Add specialty tags.
- [ ] Add software/pipeline tags where sourced.
- [ ] Add source-backed profile fields.

### VFX Credits Expansion

- [ ] Separate credited house from confirmed sequence work.
- [ ] Add sequence name.
- [ ] Add shot count.
- [ ] Add supervisor.
- [ ] Add producer.
- [ ] Add departments involved.
- [ ] Add technique tags.
- [ ] Add source confidence.
- [ ] Add award submission links.
- [ ] Add breakdown video links.

### VFX Technique Taxonomy

- [ ] Define technique categories.
- [ ] Add compositing.
- [ ] Add roto/paint.
- [ ] Add matchmove/tracking.
- [ ] Add creature animation.
- [ ] Add character FX.
- [ ] Add crowd simulation.
- [ ] Add destruction simulation.
- [ ] Add fluid simulation.
- [ ] Add environment extension.
- [ ] Add digital double.
- [ ] Add de-aging.
- [ ] Add virtual production.
- [ ] Add LED volume.
- [ ] Add miniatures.
- [ ] Add practical/VFX hybrid.
- [ ] Add previs.
- [ ] Add postvis.
- [ ] Add color pipeline integration.

### VFX Pages

- [ ] Upgrade VFX house index.
- [ ] Add VFX house detail sections.
- [ ] Add house filmography.
- [ ] Add house sequences.
- [ ] Add breakdown videos.
- [ ] Add technique distribution.
- [ ] Add award nominations/wins.
- [ ] Add cited sources.
- [ ] Add corrections.

### VFX Production Sections

- [ ] Show VFX houses by confirmed role.
- [ ] Show sequence-level VFX work.
- [ ] Show shot counts where known.
- [ ] Show VFX supervisor links.
- [ ] Show breakdown videos with timestamps.
- [ ] Show VFX technique tags.
- [ ] Show disputed/uncertain VFX claims.

## Phase 7: Editorial And Contributor Workflow

### Auth And Roles

- [ ] Replace shared admin token with user accounts.
- [ ] Add role enum.
- [ ] Add contributor role.
- [ ] Add editor role.
- [ ] Add verifier role.
- [ ] Add admin role.
- [ ] Add session management.
- [ ] Add audit logging.
- [ ] Add permission checks.

### Submission Workflow

- [ ] Expand public correction form.
- [ ] Add claim submission form.
- [ ] Add source submission form.
- [ ] Add video submission form.
- [ ] Add gear correction form.
- [ ] Add VFX correction form.
- [ ] Add duplicate detection for submissions.
- [ ] Add submission status tracking.
- [ ] Add submitter email optional field.
- [ ] Add spam protection.

### Review Queues

- [ ] Add claims review queue.
- [ ] Add corrections review queue.
- [ ] Add source review queue.
- [ ] Add video review queue.
- [x] Add evidence review queue.
- [ ] Add conflict review queue.
- [ ] Add stale claims queue.
- [ ] Add filters by production, type, status, confidence, assignee.
- [ ] Add bulk status actions.
- [ ] Add reviewer notes.

### Audit Trail

- [ ] Create `editorial_events` table.
- [ ] Log claim creation.
- [ ] Log claim status changes.
- [ ] Log source attachment.
- [ ] Log evidence attachment.
- [ ] Log conflict resolution.
- [ ] Log public correction decisions.
- [ ] Log destructive edits.
- [ ] Show changelog on admin pages.
- [ ] Show public changelog on entity pages where useful.

## Phase 8: Search And Discovery

### Structured Search

- [ ] Add claim search.
- [ ] Add source search.
- [ ] Add evidence search.
- [ ] Add video timestamp search.
- [ ] Add gear spec search.
- [ ] Add VFX technique search.
- [ ] Add scene search.

### Natural Language Search

- [ ] Expand filter extraction schema.
- [ ] Extract camera names.
- [ ] Extract lens names.
- [ ] Extract format terms.
- [ ] Extract lighting terms.
- [ ] Extract VFX techniques.
- [ ] Extract VFX houses.
- [ ] Extract source confidence requirements.
- [ ] Extract time period.
- [ ] Extract production type.
- [ ] Extract “only verified” intent.
- [ ] Extract “show evidence” intent.
- [ ] Add tests for query extraction.

### Search Modes

- [ ] Add “All” mode.
- [ ] Add “Prep” mode.
- [ ] Add “Research” mode.
- [ ] Add “Gear” mode.
- [ ] Add “VFX” mode.
- [ ] Add “BTS Videos” mode.
- [ ] Add “Scenes” mode.
- [ ] Add “Sources” mode.

### Result Design

- [ ] Show confidence badge in results.
- [ ] Show source count in results.
- [ ] Show verified date in results.
- [ ] Show entity type.
- [ ] Show matching claim snippet.
- [ ] Show matching timestamp when relevant.
- [ ] Show “open evidence” action.
- [ ] Show filters used by natural-language parser.

### Saved Research

- [ ] Add saved searches.
- [ ] Add research collections.
- [ ] Add public collection pages.
- [ ] Add private local collections.
- [ ] Add collection notes.
- [ ] Add collection export.
- [ ] Add collection share links.

## Phase 9: Public API And Citation Layer

### API Contracts

- [ ] Version all public endpoints.
- [ ] Add OpenAPI spec.
- [ ] Add endpoint for production claims.
- [ ] Add endpoint for scene claims.
- [ ] Add endpoint for gear claims.
- [ ] Add endpoint for VFX house claims.
- [ ] Add endpoint for sources.
- [ ] Add endpoint for evidence.
- [ ] Add endpoint for video timestamps.
- [ ] Add endpoint for search.
- [ ] Add endpoint for recent verified changes.

### API Stability

- [ ] Add schema validation for responses.
- [ ] Add API contract tests.
- [ ] Add snapshot tests for representative payloads.
- [ ] Add API changelog.
- [ ] Add deprecation policy.
- [ ] Add CORS policy review.
- [ ] Add rate limiting by endpoint.
- [ ] Add cache headers by endpoint.

### Citation Widgets

- [ ] Add “cite this page” button.
- [ ] Add “cite this claim” button.
- [ ] Add citation formats.
- [ ] Support plain text citation.
- [ ] Support Markdown citation.
- [ ] Support BibTeX citation.
- [ ] Support JSON citation.
- [ ] Add embeddable badge.
- [ ] Add oEmbed for claims.
- [ ] Add oEmbed for gear.
- [ ] Add oEmbed for VFX houses.

## Phase 10: Methodology And Trust UX

### Methodology Pages

- [ ] Create `/methodology`.
- [ ] Explain curated vs imported.
- [ ] Explain claim statuses.
- [ ] Explain source confidence.
- [ ] Explain conflict resolution.
- [ ] Explain video evidence rules.
- [ ] Explain source health.
- [ ] Explain corrections workflow.
- [ ] Explain editorial roles.
- [ ] Explain API attribution.

### Trust Components

- [ ] Build `ClaimConfidenceBadge`.
- [ ] Build `ClaimStatusBadge`.
- [ ] Build `SourceQualityBadge`.
- [ ] Build `FreshnessBadge`.
- [ ] Build `ConflictNotice`.
- [ ] Build `ImportedDataDisclosure`.
- [ ] Build `VerifiedClaimList`.
- [ ] Build `EvidenceDrawer`.
- [ ] Build `CitationButton`.

### Page-Level Trust

- [ ] Add dossier completeness score.
- [ ] Add “verified facts” count.
- [ ] Add “open questions” count.
- [ ] Add “disputed claims” count.
- [ ] Add source quality summary.
- [ ] Add last verified timestamp.
- [ ] Add editorial changelog link.

## Phase 11: Data Ingestion Expansion

### TMDb / IMDb / Wikidata

- [ ] Keep TMDb breadth import.
- [ ] Add safe refresh policies.
- [ ] Add Wikidata identifier resolution.
- [ ] Add award ingestion.
- [ ] Add film school ingestion for people.
- [ ] Add IMDb technical spec import research.
- [ ] Avoid presenting imported technical specs as verified.
- [ ] Map imported specs to candidate claims.

### Trade Publications

- [ ] Add source registry for ASC Magazine.
- [ ] Add source registry for ICG Magazine.
- [ ] Add source registry for British Cinematographer.
- [ ] Add source registry for Definition Magazine.
- [ ] Add source registry for VFX Voice.
- [ ] Add source registry for befores & afters.
- [ ] Add source registry for Art of VFX.
- [ ] Add source registry for CineD.
- [ ] Add source registry for manufacturer case studies.
- [ ] Store source terms and scraping permissions notes.

### RSS / Monitoring

- [ ] Monitor relevant RSS feeds.
- [ ] Detect new production-craft articles.
- [ ] Match articles to productions.
- [ ] Create source candidates.
- [ ] Create claim candidates where possible.
- [ ] Add admin review queue for feed discoveries.

### Social / Web Sources

- [ ] Research social source policy.
- [ ] Support public Instagram/Twitter/Threads source URLs when stable.
- [ ] Capture archive URLs where possible.
- [ ] Add source fragility warnings.
- [ ] Avoid relying on social-only claims unless explicitly marked.

## Phase 12: UI Information Architecture

### Navigation

- [ ] Add `Sources` or `Methodology` nav entry.
- [ ] Add `Tools` nav entry.
- [ ] Consider `Scenes` discovery page.
- [ ] Consider `Videos` discovery page.
- [ ] Consider `Collections` discovery page.
- [ ] Keep primary nav compact.

### Home Page

- [ ] Add authority positioning line.
- [ ] Add verified claims count.
- [ ] Add curated productions count.
- [ ] Add indexed BTS videos count.
- [ ] Add source count.
- [ ] Add recently verified claims.
- [ ] Add featured research collections.
- [ ] Add “open questions” editorial transparency block.

### Film Page

- [ ] Reorganize into dossier tabs or anchored sections.
- [ ] Add sticky section navigation.
- [ ] Add claim counts by section.
- [ ] Add evidence drawer.
- [ ] Add scene cards with technical summaries.
- [ ] Add source quality summary.
- [ ] Add open questions/disputed claims.

### Gear Page

- [ ] Add authority header.
- [ ] Add specs panel.
- [ ] Add compatibility panel.
- [ ] Add production usage panel.
- [ ] Add crew usage panel.
- [ ] Add evidence panel.
- [ ] Add source panel.

### VFX Page

- [ ] Add VFX house cards with specialties.
- [ ] Add confirmed sequence count.
- [ ] Add breakdown video count.
- [ ] Add source quality indicator.
- [ ] Add filters by technique and country.

## Phase 13: Analytics And Quality Metrics

### Internal Metrics

- [ ] Count verified claims.
- [ ] Count candidate claims.
- [ ] Count disputed claims.
- [ ] Count stale claims.
- [ ] Count sources by kind.
- [ ] Count BTS videos indexed.
- [ ] Count timestamps tagged.
- [ ] Count evidence stills.
- [ ] Count productions with complete dossiers.
- [ ] Count gear pages with source-backed usage.
- [ ] Count VFX houses with sequence-level data.

### Product Metrics

- [ ] Track search queries with no results.
- [ ] Track searches that click evidence.
- [ ] Track most requested missing films.
- [ ] Track most requested missing gear.
- [ ] Track correction submissions.
- [ ] Track API usage.
- [ ] Track citation button usage.

### Editorial Metrics

- [ ] Track time from submission to review.
- [ ] Track time from candidate to verified.
- [ ] Track stale source backlog.
- [ ] Track conflict backlog.
- [ ] Track contributor acceptance rate.

## Phase 14: Testing Strategy

### Unit Tests

- [ ] Test claim confidence calculations.
- [ ] Test source quality mapping.
- [ ] Test safe admin redirects.
- [ ] Test rate-limit behavior.
- [ ] Test claim source formatting.
- [ ] Test citation formatting.
- [ ] Test gear spec validation.
- [ ] Test video timestamp parsing.

### Query Tests

- [ ] Test claims by production.
- [ ] Test claims by scene.
- [ ] Test claims by gear.
- [ ] Test claims by source.
- [ ] Test unresolved conflicts.
- [ ] Test dossier completeness.
- [ ] Test VFX sequence queries.
- [ ] Test gear pairing queries.

### Integration Tests

- [ ] Test public API production payload.
- [ ] Test public API crew payload.
- [ ] Test public API claims payload.
- [ ] Test corrections submission.
- [ ] Test admin claim review.
- [ ] Test video review workflow.
- [ ] Test source attachment workflow.

### UI Tests

- [ ] Test homepage renders authority stats.
- [ ] Test film page renders claim sections.
- [ ] Test scene page renders evidence.
- [ ] Test gear page renders specs and usage.
- [ ] Test VFX house page renders sequences.
- [ ] Test search modes.
- [ ] Test methodology page.

### Accessibility Tests

- [ ] Check keyboard navigation.
- [ ] Check focus states.
- [ ] Check color contrast.
- [ ] Check evidence drawers with screen readers.
- [ ] Check video timestamp controls.
- [ ] Check table accessibility.

## Phase 15: Launch Strategy

### Initial Authority Corpus

- [ ] Pick 25 flagship productions.
- [ ] Fully verify camera package for each.
- [ ] Fully verify lens package for each.
- [ ] Add at least 3 source-backed claims per production.
- [ ] Add at least 1 BTS/video evidence item per production where available.
- [ ] Add VFX sequence data for VFX-heavy productions.
- [ ] Add scene-level dossiers for 3-5 key scenes per flagship production.

### Editorial Guides

- [ ] Publish “Large Format Modern Cinema” collection.
- [ ] Publish “ALEXA 65 Productions” collection.
- [ ] Publish “VistaVision Revival” collection.
- [ ] Publish “Dune: Part Two Technical Dossier”.
- [ ] Publish “Magic-Hour Lighting References”.
- [ ] Publish “Practical + Digital VFX Hybrid References”.

### Trust Launch

- [ ] Publish methodology page.
- [ ] Publish API docs.
- [ ] Publish correction policy.
- [ ] Publish source confidence guide.
- [ ] Publish changelog.

## Implementation Order

1. Stabilize checks and encoding.
2. Add claim schema.
3. Backfill claims from existing curated data.
4. Add claim query layer.
5. Add claim/source/evidence UI components.
6. Add admin claim review.
7. Add BTS timestamp schema.
8. Add video timestamp admin.
9. Upgrade production pages into dossiers.
10. Upgrade gear pages.
11. Upgrade VFX house pages.
12. Add scene detail pages.
13. Expand search modes.
14. Expand public API.
15. Add methodology and citation layer.

## Immediate Next Coding Tasks

- [x] Create claim enums and tables.
- [x] Generate migration.
- [x] Add claim query module.
- [x] Add claim seed backfill script.
- [x] Add `ClaimStatusBadge`.
- [x] Add `ClaimConfidenceBadge`.
- [x] Add `SourcesForClaim`.
- [x] Add production page claim section.
- [x] Add admin claims review route.
- [x] Add tests for claim insertion and lookup.
