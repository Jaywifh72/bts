# CineCanon — Third-Party License Obligations

This is the canonical inventory of every third-party data source, media
source, and trademark currently rendered on CineCanon, and what each one
obligates us to do — now and at monetization.

Maintained by the `legal-counsel` agent. Append a new section whenever a
new external source is added; review every entry at the quarterly audit.

## Conventions

- **Status now** describes what CineCanon does today (pre-revenue, local
  development, no public traffic guarantees).
- **Status at monetization** describes what must be true the moment any
  revenue lands — ads, subscription, paid tier, paid B2B, sponsorship,
  affiliate links, paid API.
- **Owner**: the team member or agent responsible for keeping the entry
  current. Default: `legal-counsel`.

---

## 1. The Movie Database (TMDb)

- **Source URL**: https://www.themoviedb.org/
- **What we use**: film metadata (titles, synopses, release dates, genres,
  cast/crew names, runtime), poster art, backdrop art, video metadata
  (in some contexts).
- **License**: TMDb API Terms of Use. Free non-commercial tier with
  attribution; commercial use requires a separate agreement.
- **Obligations**:
  1. Attribution on every page that surfaces TMDb-derived data.
  2. TMDb logo treatment must match their brand guidelines.
  3. Do not imply TMDb endorses CineCanon.
  4. Respect rate limits and caching guidance.
- **Status now**: Attributing on at least the film detail page release-date
  section ("Source: TMDb."). Posters and backdrops served from
  `image.tmdb.org`. No commercial agreement.
- **Status at monetization**: Must hold a TMDb commercial agreement before
  any revenue-bearing surface ships. Alternatively, replace TMDb-sourced
  imagery on monetized surfaces with licensed sources, or remove imagery
  from those surfaces.
- **Open items**:
  - [ ] Add a dedicated `/attribution` page that consolidates all data-source
        credits. (Tracks LR-2026-002.)
  - [ ] Confirm TMDb logo and "Powered by TMDb"-equivalent treatment matches
        current brand guidelines (they update these; recheck at audit time).
  - [ ] Budget and schedule the TMDb commercial review at least 60 days
        before any monetization launch.
- **Owner**: legal-counsel

## 2. YouTube Data API & YouTube embeds

- **Source URL**: https://developers.google.com/youtube/v3
- **What we use**: video metadata (titles, channel, view counts, duration,
  category) on film pages; embedded video via the official IFrame Player.
- **License**: YouTube API Services Terms of Service + YouTube ToS for
  embedding.
- **Obligations**:
  1. Use official embeds; do not download, rehost, or modify video content.
  2. Do not cache API data beyond TTL guidance.
  3. Do not use the API to build a service that substitutes for YouTube.
  4. Do not collect viewer PII via the embed without disclosure.
- **Status now**: Metadata displayed on film pages. Embeds via the official
  iframe (verify implementation).
- **Status at monetization**: Free-tier commercial restrictions become
  binding. May require migration to a paid tier or removal of certain
  cached metadata. Cookie/consent management must cover YouTube's
  embed cookies (use `youtube-nocookie.com` domain to reduce friction).
- **Open items**:
  - [ ] Confirm all embeds use `www.youtube-nocookie.com` or are
        cookie-gated behind consent.
  - [ ] Confirm thumbnails load from `i.ytimg.com` rather than self-hosted.
  - [ ] Audit cache TTLs for view counts and titles.
- **Owner**: legal-counsel

## 3. OpenStreetMap (map tiles & geocoded location data)

- **Source URL**: https://www.openstreetmap.org/
- **What we use**: location coordinates for shooting locations; map tile
  display (per film locations page).
- **License**: Open Database License (ODbL 1.0) on the data; tile usage
  policy on map tiles served from OSM infrastructure.
- **Obligations**:
  1. Attribution: "© OpenStreetMap contributors" visible on any rendered
     map or derived data display.
  2. ODbL share-alike on substantial derivative databases. Editorial use
     of a coordinate next to a fact does not normally trigger share-alike.
  3. Tile usage policy: do not hammer the public tile servers in
     production; use a tile provider with appropriate capacity.
- **Status now**: Attribution rendered on film detail pages
  ("Maps © OpenStreetMap contributors."). Locations stored as lat/lng
  in the database.
- **Status at monetization**: No change to obligations. Confirm tile
  serving uses a licensed provider (e.g., MapTiler, Mapbox, Stadia)
  rather than OSM's public tile servers.
- **Open items**:
  - [ ] Confirm production tile serving is not pointed at OSM's public
        servers.
  - [ ] Decide whether the geocoded-locations table itself is being
        published as a downloadable derivative; if yes, share-alike
        obligations attach.
- **Owner**: legal-counsel

## 4. Wikipedia (and Wikimedia projects)

- **Source URL**: https://en.wikipedia.org/
- **What we use**: occasional citation as a source row in the references
  index (e.g., "Stunt rigging — practical effects (Wikipedia)").
- **License**: CC BY-SA 4.0 (most text). Some media items carry other
  licenses; check per asset.
- **Obligations**:
  1. Attribution to Wikipedia and to the article when quoting or reusing
     text.
  2. CC BY-SA viral share-alike on substantial reuse — this conflicts
     with the CC BY 4.0 license we apply to our own editorial corpus.
- **Status now**: Used only as a cited source link, not as reused text.
  No reuse problem.
- **Status at monetization**: No change, provided we continue not to reuse
  Wikipedia text. If any future feature ingests Wikipedia content into our
  editorial corpus, we must either license that subcorpus separately as
  CC BY-SA or restrict to non-reused factual references.
- **Open items**:
  - [ ] Add a guardrail in the ingest pipeline that rejects Wikipedia-
        sourced body text from being stored as CineCanon editorial.
- **Owner**: legal-counsel

## 5. Internet Archive — Wayback Machine

- **Source URL**: https://web.archive.org/
- **What we use**: fallback rendering for cited URLs that have rotted
  (4xx/5xx), per the methodology page.
- **License**: archive.org provides snapshots under their own terms; the
  archived content remains owned by the original publisher.
- **Obligations**:
  1. Treat snapshots as third-party content of the original publisher,
     not as Wayback's grant to republish.
  2. Linking to a snapshot is fine; iframing or inlining the snapshot body
     is contested and varies by publisher's opt-out status.
- **Status now**: Methodology page describes inline surfacing.
  Implementation needs to be confirmed to be a link, not an embed.
- **Status at monetization**: Same obligations; commercial use sharpens
  publisher attention. Consider linking only, with a UI note that the
  citation is being served from the Internet Archive.
- **Open items**:
  - [ ] Confirm implementation links to snapshots rather than embedding
        them (tracks LR-2026-005).
  - [ ] If embedding is required, respect publisher opt-outs and label
        clearly.
- **Owner**: legal-counsel

## 6. SAG-AFTRA safety bulletins

- **Source URL**: https://www.sagaftra.org/production-center/safety
- **What we use**: indexed bulletins cited on stunt sequences, stunt
  companies, and stunt-rigging entries.
- **License**: Bulletin text is copyright SAG-AFTRA. Public distribution
  does not grant reuse rights.
- **Obligations**:
  1. Short, attributed quotation is fair-use posture in the US.
  2. Full-text reproduction is not.
  3. Do not use bulletin text in a way that imputes fault to a named
     individual without a primary-tier corroborating cite.
- **Status now**: Bulletins indexed by reference; text not reproduced.
  Associations to named individuals need primary cites (LR-2026-007).
- **Status at monetization**: Same; review whether linking to bulletins
  on monetized pages changes the fair-use balance.
- **Open items**:
  - [ ] Audit person-to-bulletin associations for primary cites.
- **Owner**: legal-counsel

## 7. Trade press (Variety, fxguide, befores & afters, Hollywood Reporter, IndieWire, American Cinematographer, British Cinematographer, Vulture, VFX Voice, StudioBinder)

- **Source URLs**: variety.com, fxguide.com, beforesandafters.com,
  hollywoodreporter.com, indiewire.com, ascmag.com (American Cinematographer),
  britishcinematographer.co.uk, vulture.com, vfxvoice.com, studiobinder.com.
- **What we use**: cited as primary or secondary sources on film, crew, VFX,
  and stunt pages. Occasional short quotations.
- **License**: All-rights-reserved editorial copyright. Some have explicit
  republication policies; most do not.
- **Obligations**:
  1. Short, attributed quotation under US fair use (§107) — name the
     publication, the author where known, the date, and link to the
     canonical URL.
  2. No full-text reproduction, no scraping body text into our database,
     no displacive summary (substantial paraphrase that substitutes for
     the article).
  3. Some publications (notably American Cinematographer) have specific
     reuse policies for screenshots and PDF reproductions; treat their
     PDFs as protected.
- **Status now**: Used as cited sources; quotations, where present, are
  short and attributed. Confidence-tier rendering surfaces the publication
  name and author on each cite. Link-rot fallback policy applies (see
  §5 Wayback).
- **Status at monetization**: Fair-use balance shifts slightly when the
  use is commercial. The other three §107 factors (nature of the use,
  amount taken, market effect) still favor our use if quotations remain
  short and citations remain factual. Do not introduce a feature that
  ingests body text into a generative/summarization surface — that flips
  the analysis.
- **Open items**:
  - [ ] Audit every stored quotation in the citations table for length;
        flag anything ≥ 50 words for editor review.
  - [ ] Confirm no ingest path stores full article body text.
  - [ ] Add a rule to the agent: any new citation row with `body_text`
        populated beyond a quote field triggers a finding.
- **Owner**: legal-counsel

## 8. Manufacturer marks (ARRI, RED, Sony, Kodak, Panavision, IMAX, VistaVision, Cooke, Zeiss, Leitz/Leica, Angenieux, Atomos, Dolby, FotoKem, Lomo, Lumière, ASC, ACES)

- **Source**: trademark holders.
- **What we use**: descriptive references in editorial copy (camera body,
  lens, lighting fixture, lab, color science). Manufacturer-published
  image-circle and sensor specs in tool calculations.
- **License**: Trademark, not copyright. The names themselves are
  protected as source identifiers under the Lanham Act (US) and
  equivalents abroad.
- **Obligations** (nominative fair use test, US):
  1. The product or company must be hard to identify without using the
     mark.
  2. Use only as much of the mark as is necessary.
  3. Do nothing that suggests sponsorship or endorsement by the holder.
- **Status now**: Mostly compliant — marks are used to identify real
  products and companies in editorial dossiers. **Exception**: the
  frame-line tool currently described as a *"Clone of ARRI's Frame Line
  + Lens Illumination Tool"* fails test 3. (Tracks LR-2026-001.)
- **Status at monetization**: Stricter scrutiny. Holders are more
  likely to send a takedown over a marked feature on a paid product
  than a free one. Audit all UI strings that name a manufacturer in a
  feature name or marketing context.
- **Open items**:
  - [ ] Rename the frame-line tool description (LR-2026-001).
  - [ ] Maintain an allowlist of marks used in UI strings and flag new
        additions.
  - [ ] Add a generic disclaimer on `/attribution`: *"All trademarks are
        the property of their respective owners. Mention of a product or
        company on CineCanon does not imply endorsement of or by that
        company."*
  - [ ] Confirm any manufacturer-published specs used in calculators were
        sourced from public datasheets, not lifted from manufacturer
        tools.
- **Owner**: legal-counsel

## 9. IMSDb and other script repositories

- **Source URL**: imsdb.com (current), plus any other script host we link.
- **What we use**: outbound links from film header strips
  ("Script (IMSDb) ↗") to the corresponding screenplay page.
- **License**: Each individual screenplay has its own copyright status.
  Studio-released drafts (FYC PDFs, etc.) are typically authorized;
  third-party uploads frequently are not. IMSDb itself does not warrant
  authorization.
- **Obligations**:
  1. US: linking alone is rarely direct infringement.
  2. EU: *GS Media* — commercial linkers are presumed aware of
     infringement on the target. Pre-monetization, low risk; at
     monetization, real risk.
  3. Defamation/contractual: linking to a script that contains an early
     draft a studio later disclaimed could attract complaint even when
     copyright is not the hook.
- **Status now**: Links rendered on film pages; no nofollow noted in the
  audit. (Tracks LR-2026-004 and LR-2026-013.)
- **Status at monetization**: Re-evaluate the entire link class. Options:
  (a) prefer studio-released drafts where available; (b) interstitial
  that names the third-party host; (c) geo-conditional rendering;
  (d) remove the link.
- **Open items**:
  - [ ] Add `rel="nofollow noopener"` on script outbound links.
  - [ ] Build a preference order in the data model: studio FYC → guild
        archive → academic archive → IMSDb.
  - [ ] Decide monetization-time policy.
- **Owner**: legal-counsel

## 10. IMDb

- **Source URL**: https://www.imdb.com/
- **What we use**: outbound link ("IMDb ↗") on every film page; possibly
  IMDb IDs stored for cross-reference.
- **License**: IMDb data is proprietary; the IMDb Conditions of Use
  prohibit scraping and commercial reuse. Storing an IMDb ID for
  cross-link purposes is generally tolerated; reproducing IMDb body
  content is not.
- **Obligations**:
  1. Do not scrape IMDb pages.
  2. Do not display IMDb-sourced ratings, body text, or trivia as if
     they were CineCanon's.
  3. Linking is fine.
- **Status now**: Outbound link only; no IMDb scraping observed.
- **Status at monetization**: No change to obligations. If we ever
  consider building a feature that benchmarks against IMDb ratings or
  scrapes structured data, route through a licensed source instead.
- **Open items**:
  - [ ] Confirm `lib/ingest/*` contains no IMDb scraper paths.
- **Owner**: legal-counsel

## 11. Distributor / studio logos and marks (NEON, A24, Warner Bros., Apple, Netflix, Searchlight, Focus Features, etc.)

- **Source**: the distributors and studios named on each film page.
- **What we use**: studio name as a credit (e.g., "NEON · distributor");
  occasionally a logo if rendered via TMDb's `production_companies`
  surface.
- **License**: Trademark on the names and logos. Nominative fair use
  covers the textual credit. Logo rendering is more sensitive — even
  when sourced via TMDb, the underlying mark is the distributor's.
- **Obligations**:
  1. Same nominative-fair-use posture as §8.
  2. Do not use distributor logos in a way that suggests partnership
     or sponsorship.
  3. Do not use a distributor logo as a CineCanon UI affordance (e.g.,
     a button styled with their logo).
- **Status now**: Textual credits only (verified on `/films/anora-2024`
  showing "NEON · distributor" as text). No logo misuse observed.
- **Status at monetization**: Confirm no distributor logo appears on
  pricing or marketing pages; confirm the `/attribution` disclaimer
  covers distributor marks.
- **Open items**:
  - [ ] Lint rule against rendering distributor logos on
        `/pricing`, `/subscribe`, marketing routes.
- **Owner**: legal-counsel

## 12. Open-source code dependencies

- **Source**: `package.json` and `package-lock.json` / `pnpm-lock.yaml`.
- **What we use**: the full transitive dep tree of the application.
- **License**: per-package; the inventory must be generated and kept
  current.
- **Obligations**:
  1. Honor each package's license (MIT, Apache-2.0, BSD, ISC, MPL-2.0,
     GPL family, AGPL, custom).
  2. AGPL packages trigger source-availability obligations for hosted
     SaaS — flag at ingest, not at audit.
  3. Apache-2.0 requires NOTICE preservation.
  4. Custom or "non-commercial" licenses (rare but real) must be
     reviewed individually.
- **Status now**: No SBOM published; no license inventory generated.
- **Status at monetization**: A published SBOM and a third-party
  license notice page are expected hygiene for any commercial product.
- **Open items**:
  - [ ] Generate an SBOM (`npm ls --all`, `pnpm licenses list`, or a
        proper tool) and commit a snapshot to `legal/third-party.md`.
  - [ ] Add a CI check that fails on a new AGPL or "non-commercial"
        license in the tree.
  - [ ] Surface a third-party license page at `/legal/third-party`.
- **Owner**: legal-counsel + engineering

## 13. Fonts, icons, and visual assets

- **Source**: whatever font foundries, icon sets, and image assets are
  in `public/`, `assets/`, or loaded via CDN.
- **License**: per-asset. SIL OFL fonts (Google Fonts, most open
  foundries) are permissive with attribution. Commercial foundry fonts
  require per-use licenses. Icon sets vary widely.
- **Obligations**:
  1. Inventory fonts in use; confirm each is licensed for web display
     and for the actual traffic volume (some commercial licenses tier
     by pageviews).
  2. Inventory icon sets; honor attribution requirements.
  3. Inventory any stock or editorial photography in `public/` that
     is not TMDb-sourced.
- **Status now**: Not inventoried in this audit.
- **Status at monetization**: Pageview-tiered font licenses become
  immediately relevant. Audit before launch.
- **Open items**:
  - [ ] Inventory fonts, icons, and static images. Record per-asset
        license, source, and (where applicable) pageview tier.
  - [ ] Add an `assets/LICENSE.md` mapping each asset to its license.
- **Owner**: legal-counsel + design

## 14. Analytics, error monitoring, and any third-party SDK that touches user data

- **Source**: anything added to the app that calls home — analytics
  (PostHog, Plausible, GA4), error monitoring (Sentry), session replay
  (FullStory, LogRocket), feature flags (LaunchDarkly), ad/affiliate
  SDKs (later).
- **License + obligations**:
  1. Disclosed in the privacy policy by name and purpose.
  2. Cookie banner / consent management gates any cookie-setting SDK
     for EU/UK users.
  3. CPRA "Do Not Sell or Share" link required if the SDK qualifies
     as a "sale" or "sharing" under California law (ad and analytics
     SDKs frequently do).
  4. Session replay carries elevated privacy obligations — mask all
     PII server-side before transmission; some jurisdictions treat
     session replay as wiretapping if not properly disclosed.
- **Status now**: Not yet inventoried in this audit.
- **Status at monetization**: Mandatory inventory before launch. Each
  SDK named in the privacy policy with purpose, retention, and
  third-party recipient.
- **Open items**:
  - [ ] Inventory all `<script src="…">` external scripts and any SDK
        imports in the app code.
  - [ ] Map each to a privacy-policy entry.
  - [ ] Implement consent management before the first cookie-setting
        SDK ships.
- **Owner**: legal-counsel + engineering

## 15. AI services used in production or build (if any)

- **Source**: any LLM API, embeddings API, image-model API, or third-
  party AI feature that runs against CineCanon data or user input.
- **License + obligations**:
  1. Vendor ToS — confirm the vendor does not train on our data unless
     we explicitly opt in (most enterprise tiers do not; consumer tiers
     may).
  2. If user data is sent to the vendor, the vendor must be named in
     the privacy policy as a sub-processor.
  3. EU AI Act: transparency obligations for AI-generated content shown
     to users; logging obligations for certain use cases.
  4. Outputs that paraphrase trade-press articles into editorial copy
     re-create the copyright concern in §7; do not let AI bypass the
     "no displacive summary" rule.
- **Status now**: The "Ask →" interface on the homepage implies an LLM
  feature. Inventory not yet captured in this file.
- **Status at monetization**: Mandatory disclosure; mandatory
  sub-processor naming; mandatory editorial guardrails so that AI
  output cannot reintroduce a copyright finding.
- **Open items**:
  - [ ] Inventory all AI vendor relationships, including any used at
        build time (embeddings for the "thematically similar" feature,
        any text generation for editorial drafts).
  - [ ] Confirm "no training on our data" clauses are in place.
  - [ ] Add an editorial guardrail: AI cannot publish to the curated
        corpus without human editor sign-off and citation attachment.
- **Owner**: legal-counsel + engineering

---

## Global obligations summary

A condensed view of what each source obligates us to do, used by the
agent for quick lookup during diff review.

| Source              | Attribution required | Commercial license required | No scraping | No body-text reuse | Sub-processor disclosure |
|---------------------|----------------------|-----------------------------|-------------|--------------------|--------------------------|
| TMDb                | yes                  | yes, at monetization        | n/a (API)   | partial            | yes (privacy policy)     |
| YouTube Data API    | embed marks          | review at monetization      | yes         | yes                | yes                      |
| OpenStreetMap       | yes                  | no (tile provider only)     | n/a         | n/a                | yes (tile provider)      |
| Wikipedia (CC BY-SA)| yes                  | no                          | n/a         | yes (share-alike)  | no                       |
| Internet Archive    | yes (label snapshot) | no                          | n/a         | yes (publisher)    | no                       |
| SAG-AFTRA bulletins | yes                  | no                          | n/a         | yes                | no                       |
| Trade press         | yes                  | no                          | yes         | yes                | no                       |
| Manufacturer marks  | trademark notice     | no                          | n/a         | n/a                | no                       |
| IMSDb               | label outbound       | re-eval at monetization     | yes         | yes                | no                       |
| IMDb                | label outbound       | no (link-only)              | yes         | yes                | no                       |
| Distributor marks   | trademark notice     | no                          | n/a         | n/a                | no                       |
| OSS dependencies    | per-license          | per-license (AGPL flag)     | n/a         | n/a                | n/a                      |
| Fonts/icons         | per-license          | tier-dependent              | n/a         | n/a                | n/a                      |
| Analytics SDKs      | privacy policy       | n/a                         | n/a         | n/a                | yes                      |
| AI services         | privacy policy       | n/a                         | n/a         | yes (output rule)  | yes                      |

## Pre-monetization checklist

Before any revenue-bearing surface ships, every item in this list must
be either resolved or explicitly waived in writing by the founder.

- [ ] TMDb commercial agreement signed and stored in
      `legal/contracts/tmdb-commercial-YYYY.pdf`.
- [ ] YouTube Data API commercial posture reviewed; embeds migrated to
      `youtube-nocookie.com` and consent-gated.
- [ ] OSM tile serving migrated to a licensed provider.
- [ ] All trademark-in-feature-name violations resolved (frame-line tool,
      any future "Clone of …" copy).
- [ ] DMCA designated agent registered with the US Copyright Office;
      `/dmca` page live.
- [ ] Privacy Policy, ToS, Cookie Policy, AI/Bot Policy live and
      version-stamped.
- [ ] Consent management implemented for EU/UK; CPRA "Do Not Sell or
      Share" link implemented for California.
- [ ] SBOM and third-party license page published.
- [ ] Font and icon inventory complete; pageview-tiered licenses confirmed.
- [ ] Analytics / SDK inventory complete; all vendors named in privacy
      policy.
- [ ] AI vendor inventory complete; "no training on our data" clauses
      confirmed; editorial guardrail enforced.
- [ ] Re-audit of named-individual data under right-of-publicity lens
      (Cal §3344, NY §50/51, Tennessee ELVIS Act).
- [ ] Re-audit of EU outbound-link exposure (*GS Media*).
- [ ] Methodology page CC BY 4.0 scoping language deployed.
- [ ] Risk register (`legal/risk-register.md`) shows zero open BLOCKING
      or HIGH findings.

## Revision history

- 2026-05-15 — File created. Seeded with 15 source families covering
  every external dependency surfaced in the initial CineCanon audit.
  Global obligations table and pre-monetization checklist added.