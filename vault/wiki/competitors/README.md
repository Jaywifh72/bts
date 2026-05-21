# Competitors

Who else gets cited when AI engines answer working-pro cinema queries — and
where CineCanon should be earning citations but isn't.

## Citation competitors

The recurring set CineCanon measures share-of-answer against: **IMDb Pro**,
**Wikipedia**, **fxguide**, **ASC.org**, **Variety**, the **Roger Deakins
forum**, **Letterboxd**, and the **Cinematography Database**. Plus the
incumbents that dominate camera-spec queries (`shotonwhat.com`, `arri.com`,
`ymcinema.com`, `4kshooters.net`).

## Where the live detail lives

This is a pointer note. The maintained, machine-read competitor data lives in
the Sentinel skill:

- `.claude/skills/cinecanon-sentinel/references/competitor_targets.md` — the
  tracked citation pools.
- The `aeo_citation_pools` table (migrations `0091`, `0094`) — live
  share-of-answer measurement.
- The `citation-landscape-watcher` Sentinel sub-agent — tracks pool deltas and
  drafts earned-media briefs.

Use this folder for longer-form competitor profiles and earned-media strategy
notes that do not belong in the Sentinel's machine-read references.
