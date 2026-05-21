---
name: cinecanon-legal-review
description: Legal and compliance review for CineCanon — third-party data and media licensing, TMDb attribution, trademark/brand usage, scraping and AI-bot policy, CC-BY attribution, user data, and defamation exposure on crew biographical data. Wraps the legal-counsel agent and maintains the license inventory and risk register. Use proactively for any change touching third-party data/media/brand/user-data, and for the quarterly compliance audit.
---

# cinecanon-legal-review

## What this skill is

The Legal & Compliance procedure (Domain G). It runs the `legal-counsel` agent
against a specific change or on a quarterly schedule, and keeps the compliance
memory current: `vault/wiki/legal/licenses.md` and
`vault/wiki/legal/risk-register.md`.

## When this skill triggers — use proactively

Any change that touches: third-party data ingestion; displayed third-party
media (posters, stills, video, scripts, PDFs); trademark/brand names in UI
copy; user data, uploads, accounts, payments, ads, analytics; pricing,
terms/privacy/cookie surfaces; `robots.txt` / scraping / AI-bot policy; CC-BY
attribution; Wayback embedding; crew biographical data (defamation). Also the
quarterly audit and any "is this legal / are we allowed to show this" question.

## Procedure

### Mode A — review a change

1. Identify every third-party touchpoint in the change.
2. Spawn the **`legal-counsel`** agent with the change as input. It assesses
   against the obligations in `vault/wiki/legal/licenses.md`.
3. Check the concrete recurring obligations:
   - **TMDb** — any page surfacing TMDb data carries the attribution footer:
     *"Movie metadata courtesy of TMDb — this product uses the TMDb API but is
     not endorsed or certified by TMDb."*
   - **CC-BY 4.0** — the `/api/v1` surface keeps its `_meta` license +
     attribution block; inbound CC-BY sources keep their attribution.
   - **Posters/stills/video** — licensed for the displayed use, or removed.
   - **Crew bios** — factual, sourced, non-defamatory.
4. Record any new finding as a row in `risk-register.md` (append-only; STATUS +
   RESOLUTION fields). Add new sources to `licenses.md`.
5. Verdict: **CLEAR**, **CLEAR WITH CONDITIONS** (list them), or **BLOCK**.

### Mode B — quarterly audit

Triggered by `.github/workflows/quarterly-compliance-review.yml`. Review every
entry in `licenses.md` and every open row in `risk-register.md`; confirm
attribution coverage across surfaces; report deltas since last quarter.

## Guardrails

- Legal review *gates* — a BLOCK is a BLOCK until resolved.
- This skill is not a substitute for counsel on novel/high-stakes questions;
  it flags those for a human lawyer rather than guessing.
- Never delete a `risk-register.md` row — resolve in place.

## Finish

Append to `vault/learnings/cinecanon-legal-review.md`: what was reviewed, the
verdict, any new license obligation or risk row created.
