# Legal

Compliance memory for CineCanon. Maintained by the `legal-counsel` agent and
the `cinecanon-legal-review` skill (Domain G).

- [`licenses.md`](licenses.md) — the canonical inventory of every third-party
  data source, media source, and trademark rendered on CineCanon, and what
  each obligates now and at monetization. Append a new section whenever a new
  external source is added; review every entry at the quarterly audit.
- [`risk-register.md`](risk-register.md) — append-only log of legal /
  compliance findings. One row per finding. Resolve in place by editing the
  STATUS and RESOLUTION fields; never delete rows — superseded findings stay as
  history.

> These two files were moved here from `.claude/agents/`, where they sat
> alongside the agent definitions but are not agents — they are the agent's
> memory. The vault is their correct home.

The quarterly license + risk-register audit runs via
`.github/workflows/quarterly-compliance-review.yml`, which invokes
`cinecanon-legal-review` in audit mode.
