# Learnings

Append-only memory. One file per skill: `vault/learnings/<skill-name>.md`.

## The contract

Every skill ends its run by appending one dated entry to its learnings file —
terse, a few lines:

```
## 2026-05-21 — <one-line context>
- What worked / what the run produced.
- What surprised it or went wrong.
- What to do differently next time.
```

Before running, a skill reads its own learnings file so it does not repeat a
known mistake. This is the same habit the `cinecanon-sentinel` skill already
practises (its `learnings/aeo-chief.md` and the weekly `learnings-synthesizer`
sub-agent) — generalized to every skill.

## Rules

- **Append, never edit.** A learning is a timestamped fact. If it is later
  wrong, append a correction; do not rewrite history.
- **Terse.** Three to six lines per run. If a learning is big enough to need
  prose, it is a `wiki/` note — codify it there and leave a one-line pointer.
- **One file per skill.** `cinecanon-qa-sweep.md`, `cinecanon-dossier-builder.md`,
  and so on. Files are created lazily on a skill's first run.

## Periodic review

The monthly memory-consolidation pass reads every learnings file from the past
period, lifts cross-cutting patterns into `wiki/`, and proposes skill-file
updates. Runs alongside the Sentinel monthly architecture review.

> The historical `cinecanon-sentinel` learnings stay in that skill's own
> `learnings/` folder. New skills append here.
