# CineCanon — Legal & Compliance Risk Register

Append-only log of findings issued by the `legal-counsel` agent (and any
human reviewer). One row per finding. Resolve in place by editing the
STATUS and RESOLUTION fields; do not delete rows — superseded findings
remain in the file as history.

## Conventions

- **ID**: `LR-YYYY-NNN` (year + 3-digit sequence).
- **Severity**: `blocking | high | medium | low`.
- **Status**: `open | in-progress | resolved | wontfix | needs-counsel`.
- **Confidence**: `low | medium | high` — the agent's confidence in the legal
  read, not in the technical fact.
- **Area**: one of the 10 audit areas defined in the agent spec.
- **Source**: how the finding was raised (`audit-2026-05-15`, `diff-PR#NN`,
  `incident-...`, `human`).
- **Resolution**: short description of the fix, plus the PR or commit that
  shipped it. Required when status flips to `resolved`.

## Index

| ID         | Severity | Status | Area                              | One-liner                                                                 |
|------------|----------|--------|-----------------------------------|---------------------------------------------------------------------------|
| LR-2026-001 | high     | open   | Trademark & brand naming          | Frame-line tool described as "Clone of ARRI's Frame Line + Lens Illum. Tool" |
| LR-2026-002 | high     | open   | Third-party data & media          | TMDb posters/backdrops rendered without confirmed commercial license      |
| LR-2026-003 | medium   | open   | Third-party data & media          | YouTube view-count metadata displayed; commercial-tier review pending     |
| LR-2026-004 | medium   | open   | Outbound link policy              | Per-film "Script (IMSDb)" link of mixed copyright status                  |
| LR-2026-005 | medium   | open   | Third-party data & media          | Methodology promises inline Wayback snapshots on link-rot                 |
| LR-2026-006 | medium   | open   | Editorial integrity & citations   | CC BY 4.0 declaration lacks scoping language re third-party content       |
| LR-2026-007 | medium   | open   | Crew/talent data                  | Stunt performers + SAG-AFTRA bulletin associations need primary cites     |
| LR-2026-008 | medium   | open   | Crew/talent data (GDPR/CCPA)      | No published privacy notice or data-subject erasure pathway               |
| LR-2026-009 | low      | open   | User data, uploads, accounts      | CDL XML parser upload — confirm XXE disabled and retention zero           |
| LR-2026-010 | low      | open   | User data, uploads, accounts      | Frame-line still upload — confirm retention zero, no training use        |
| LR-2026-011 | low      | open   | User data, uploads, accounts      | Loadout URL-as-state — confirm no PII can be encoded in URL              |
| LR-2026-012 | medium   | open   | Legal-surface pages               | No ToS, Privacy Policy, Cookie Policy, DMCA agent, or AI/bot policy live  |
| LR-2026-013 | low      | open   | Outbound link policy              | EU commercial-linker exposure re script repos resurfaces at monetization  |
| LR-2026-014 | medium   | open   | Editorial integrity & citations   | Factual claim that Anora shot "guerrilla without permits" — verify cite   |

---

## Finding rows

### LR-2026-001 — Frame-line tool described as a "clone" of ARRI's tool

- **Severity**: high
- **Status**: open
- **Confidence**: high
- **Area**: Trademark & brand naming
- **Source**: audit-2026-05-15
- **Location**: `/tools` page copy; likely sourced from `content/tools/index.mdx`
  or equivalent and the `/tools/frame-lines` page header.
- **Observed copy**: *"Clone of ARRI's Frame Line + Lens Illumination Tool."*
- **Issue**: The word *clone* paired with a registered trademark and a specific
  product name implies origin/affiliation with ARRI and invites a Lanham Act
  §43(a) false-designation-of-origin read, on top of any copyright concern
  if UI elements or frame-line presets were lifted from ARRI's tool.
- **Why it matters**: Nominative fair use exists for naming a real product when
  describing facts about it, but it is narrower when the mark is used to name
  your *own* feature. "Clone" worsens the framing.
- **Recommended fix**: Replace with independent-development language. Suggested:
  *"ARRI-compatible frame-line overlay, built independently from manufacturer-
  published image-circle specifications. Not affiliated with or endorsed by
  ARRI."* Audit the SVG presets, default sensor list, and any embedded UI text
  for material copied from ARRI's tool; if anything was copied, replace with
  values re-derived from public spec sheets.
- **Resolution**: _pending_

### LR-2026-002 — TMDb posters/backdrops without confirmed commercial license

- **Severity**: high
- **Status**: open
- **Confidence**: high
- **Area**: Third-party data & media
- **Source**: audit-2026-05-15
- **Location**: `/films` grid, all film detail pages, anywhere `image.tmdb.org`
  is referenced.
- **Issue**: TMDb's free API is for non-commercial use with attribution. The
  posters and backdrops surfaced via TMDb are licensed *through* TMDb but the
  underlying copyrights belong to studios/distributors. As soon as CineCanon
  takes revenue of any kind, the non-commercial assumption is invalid.
- **Why it matters**: This is the single most common copyright friction point
  for film-database sites at scale.
- **Recommended fix (pre-monetization)**: Confirm TMDb attribution renders on
  every page that displays TMDb-derived data; add a dedicated attribution page;
  ensure the TMDb logo treatment matches their brand guidelines.
- **Recommended fix (at monetization)**: Sign a TMDb commercial agreement, or
  migrate poster/backdrop display to a licensed source, or remove poster
  imagery from monetized surfaces.
- **Gate**: Blocks any merge that introduces a monetization code path until
  the commercial agreement is signed.
- **Resolution**: _pending_

### LR-2026-003 — YouTube metadata display; commercial-tier review pending

- **Severity**: medium
- **Status**: open
- **Confidence**: medium
- **Area**: Third-party data & media
- **Source**: audit-2026-05-15
- **Location**: All film pages with a Videos section (e.g., `/films/anora-2024`).
- **Issue**: The site displays YouTube view counts and channel metadata. This
  implies use of the YouTube Data API. Free-tier use has commercial restrictions
  and caching limits; embedded video is fine via the official iframe, but
  rehosted thumbnails or aggressive caching are not.
- **Recommended fix**: Confirm all video display uses `youtube.com/embed`
  iframes or the official IFrame Player API; confirm thumbnails are loaded
  from `i.ytimg.com` rather than self-hosted; confirm view-count caching
  respects the API's TTL guidance. At monetization, review YouTube Data API
  commercial terms and budget for any required tier change.
- **Resolution**: _pending_

### LR-2026-004 — "Script (IMSDb)" outbound link of mixed copyright status

- **Severity**: medium
- **Status**: open
- **Confidence**: medium
- **Area**: Outbound link policy
- **Source**: audit-2026-05-15
- **Location**: Film header link strip, e.g., `/films/anora-2024` shows
  *"Script (IMSDb) ↗"* alongside IMDb/TMDb links.
- **Issue**: IMSDb hosts screenplays whose authorization status varies. In the
  US, linking alone is rarely direct infringement and contributory liability
  requires more. In the EU, *GS Media* treats commercial linkers as presumed
  to know about infringement on the target.
- **Recommended fix (now)**: Add `rel="nofollow noopener"` on these links;
  consider routing through a script-source-selection logic that prefers
  studio-released drafts (e.g., FYC PDFs hosted by distributors) where
  available.
- **Recommended fix (at monetization)**: Re-evaluate this entire link class.
  Consider gating the link behind an interstitial that names the third-party
  host, or removing it for EU IPs.
- **Resolution**: _pending_

### LR-2026-005 — Methodology promises inline Wayback snapshots on link-rot

- **Severity**: medium
- **Status**: open
- **Confidence**: medium
- **Area**: Third-party data & media
- **Source**: audit-2026-05-15
- **Location**: `/methodology` page, "Link-rot policy" section; implementation
  likely in `lib/citations/*` or `lib/link-health/*`.
- **Issue**: Linking to archive.org snapshots is fine. Iframing or otherwise
  inlining archived bodies of in-copyright trade-press articles is contested
  republication.
- **Recommended fix**: Confirm implementation links to the snapshot rather
  than embedding it. If embedding is necessary, respect publisher opt-out
  signals and add an explicit notice that the rendered content is an
  Internet Archive snapshot, not CineCanon's own copy.
- **Resolution**: _pending_

### LR-2026-006 — CC BY 4.0 declaration missing scoping language

- **Severity**: medium
- **Status**: open
- **Confidence**: high
- **Area**: Editorial integrity & citations
- **Source**: audit-2026-05-15
- **Location**: `/methodology` page, "How to cite CineCanon" section.
- **Observed copy**: *"The license on editorial content is CC BY 4.0 —
  attribution required."*
- **Issue**: Without scoping, downstream reusers may read the CC BY grant as
  covering posters, backdrops, embedded video, trade-press quotes, and other
  third-party content that CineCanon cannot relicense.
- **Recommended fix**: Append: *"This license applies to CineCanon's own
  editorial prose only. Third-party content (posters, backdrops, video,
  trade-press quotes, manufacturer specs, etc.) is owned by its respective
  rights holders and is used under fair use, license, or attribution as
  cited on each page."*
- **Resolution**: _pending_

### LR-2026-007 — Stunt performer + SAG-AFTRA bulletin associations

- **Severity**: medium
- **Status**: open
- **Confidence**: medium
- **Area**: Crew/talent data (defamation, publicity, GDPR/CCPA)
- **Source**: audit-2026-05-15
- **Location**: Anywhere a named individual is associated with a SAG-AFTRA
  safety bulletin; data model likely in `db/schema*`, render in stunt-
  sequence and people pages.
- **Issue**: Tying a named performer or coordinator to a safety bulletin is
  defensible journalism when the association is cited to a primary source; it
  reads as imputation of fault when it is not.
- **Recommended fix**: Audit every person-to-bulletin edge in the data and
  require at least one PRIMARY-tier citation per association; fall back to
  SECONDARY with the conflicting-claim label if no primary source exists;
  remove the association entirely if neither exists. Render the cite inline
  on the person page, not just on the bulletin page.
- **Resolution**: _pending_

### LR-2026-008 — No privacy notice or data-subject erasure pathway

- **Severity**: medium
- **Status**: open
- **Confidence**: high
- **Area**: Crew/talent data (GDPR/CCPA)
- **Source**: audit-2026-05-15
- **Location**: Site-wide; no `/privacy` route observed.
- **Issue**: CineCanon stores biographical data on identifiable individuals,
  some of whom are EU/UK data subjects (e.g., European DPs, German crew on
  Netflix shows). Under GDPR/UK GDPR this triggers a lawful-basis obligation,
  a privacy notice obligation, and a data-subject rights pathway (access,
  rectification, erasure, objection). The existing corrections form covers
  rectification but is not labeled as a data-subject-rights channel.
- **Recommended fix**: Publish `/privacy` (use the agent's draft template).
  Add a `data-subjects@` mailbox or repurpose corrections to triage erasure
  requests. Document the legitimate-interest balancing test for editorial
  use. At monetization, consider whether legitimate interest still holds for
  commercialized surfaces or whether named-individual data needs to be
  segregated.
- **Resolution**: _pending_

### LR-2026-009 — CDL XML upload — confirm XXE disabled, retention zero

- **Severity**: low
- **Status**: open
- **Confidence**: medium (legal); security review owns the technical verdict
- **Area**: User data, uploads, accounts (legal adjacency to security)
- **Source**: audit-2026-05-15
- **Location**: `/tools` page references ASC CDL parser; implementation in
  `tools/cdl/*` or similar.
- **Issue**: Legal concern is dual: (a) a user-supplied CDL/CCC XML file may
  contain identifiable metadata about an in-progress production under NDA,
  and (b) XXE/SSRF on the parser can pull data from the server's network.
  Both are privacy/contract exposures if retained or logged.
- **Recommended fix**: Disable external entity resolution in whichever XML
  parser is in use; reject uploads larger than N KB; do not persist the file
  beyond the request; log only success/failure, not contents; document
  retention in the privacy policy.
- **Resolution**: _pending_

### LR-2026-010 — Frame-line still upload — retention zero, no training

- **Severity**: low
- **Status**: open
- **Confidence**: medium
- **Area**: User data, uploads, accounts
- **Source**: audit-2026-05-15
- **Location**: `/tools/frame-lines`, "Reference image" upload control.
- **Issue**: User-uploaded reference stills may carry third-party rights or
  embargoed material. Persisting them, including them in any training corpus,
  or making them publicly addressable would create a downstream rights issue.
- **Recommended fix**: Render client-side only where feasible; if server
  processing is required, retention zero and explicit privacy-policy
  disclosure; no inclusion in training corpora; no public addressability.
- **Resolution**: _pending_

### LR-2026-011 — Loadout URL-as-state — confirm no PII in URL

- **Severity**: low
- **Status**: open
- **Confidence**: medium
- **Area**: User data, uploads, accounts
- **Source**: audit-2026-05-15
- **Location**: `/tools/loadout` (per /tools index).
- **Issue**: URLs leak to referrer headers and server logs. If the loadout
  state includes anything beyond equipment selections (notes, names, project
  identifiers), that data leaks.
- **Recommended fix**: Restrict URL-encoded state to equipment selections.
  If free-text notes are supported, store server-side keyed by an opaque ID;
  the URL carries only the ID. Document in privacy policy.
- **Resolution**: _pending_

### LR-2026-012 — No ToS, Privacy, Cookie, DMCA, or AI/bot policy live

- **Severity**: medium (escalates to blocking on monetization)
- **Status**: open
- **Confidence**: high
- **Area**: Legal-surface pages
- **Source**: audit-2026-05-15
- **Location**: site-wide; no `/terms`, `/privacy`, `/cookies`, `/dmca`,
  `/ai-policy` routes observed; no DMCA designated agent registered.
- **Issue**: Pre-monetization, the absence is mostly hygiene. At monetization
  and at any meaningful traffic threshold, ToS and Privacy become mandatory
  contractual surfaces; DMCA §512(c) safe harbor requires a designated
  agent registered with the US Copyright Office; the EU DSA requires a
  contact point and transparent content-moderation terms.
- **Recommended fix**: Publish all five pages, in this priority order: Privacy
  Policy → DMCA / Notice & Takedown → ToS → AI/Bot Policy → Cookie Policy.
  Register a DMCA designated agent at https://www.copyright.gov/dmca-directory/.
  Version-stamp each page and link from the footer.
- **Gate**: Blocks any merge that introduces monetization until live.
- **Resolution**: _pending_

### LR-2026-013 — EU commercial-linker exposure re script repos at monetization

- **Severity**: low (now), medium (at monetization)
- **Status**: open
- **Confidence**: medium
- **Area**: Outbound link policy
- **Source**: audit-2026-05-15
- **Location**: All film-page outbound links to script repositories.
- **Issue**: Same root issue as LR-2026-004 but specifically the *GS Media*
  presumption-of-knowledge doctrine in the EU applies to commercial linkers.
  Re-evaluate at the moment any revenue lands.
- **Recommended fix**: Re-audit this link class as part of the monetization
  gate. Consider geo-conditional rendering or removal for EU visitors.
- **Resolution**: _pending_

### LR-2026-014 — "Guerrilla without permits" claim on Anora

- **Severity**: medium
- **Status**: open
- **Confidence**: medium
- **Area**: Editorial integrity & citations
- **Source**: audit-2026-05-15
- **Location**: `/films/anora-2024`, Locations section, Brighton Beach and
  Las Vegas entries.
- **Observed copy**: *"…exterior boardwalk + street coverage filmed guerrilla
  without permits."* and *"Baker shot guerrilla-style with no major venue
  permits…"*
- **Issue**: This is a factual claim about a third party's behavior that
  could attract regulatory or commercial scrutiny. If Sean Baker or his
  production company has said this on record, it is straightforward
  journalism. If it is inferred or sourced to a non-primary, it is the
  kind of claim that draws defamation / commercial-interference attention.
- **Recommended fix**: Confirm a PRIMARY-tier citation (Baker interview, DP
  interview, on-record producer comment) supports the claim; render the
  citation inline next to the assertion; drop or soften the claim if no
  primary exists.
- **Resolution**: _pending_

---

## Audit cadence

The agent runs Mode 2 audits on the following cadence:

- **Weekly**: triage new diff-mode findings; refresh the index above.
- **Quarterly**: full Mode 2 audit; produce a report at
  `legal/audits/YYYY-MM-DD.md`.
- **Pre-launch / pre-monetization**: mandatory full Mode 2 audit, plus a
  gate-checklist run-through (see agent spec § "Monetization gates").

## Revision history

- 2026-05-15 — Register created. Seeded with 14 findings from the initial
  CineCanon site assessment.