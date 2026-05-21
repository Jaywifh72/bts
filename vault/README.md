# CineCanon Vault

The project's persistent memory. Plain markdown, version-controlled with the
code, so memory and codebase stay in lockstep. This file is the map — read it
before navigating the vault.

> Part of the **CineCanon Agentic OS**. The companion pieces are the root
> `CLAUDE.md` (project purpose + OS map + skills index), the skills under
> `.claude/skills/`, the agents under `.claude/agents/`, and the automations in
> `.github/workflows/`.

## The four tiers

```
vault/
  raw/         STAGING       short-lived, not codified yet — never load-bearing
  wiki/        CODIFIED      durable, deduplicated, current article-style notes
  output/      DELIVERABLES  finished, dated, immutable artifacts
  learnings/   APPEND-ONLY   one file per skill — what each run learned
```

### `raw/` — staging

Dumped research, pasted Claude sessions, scrape findings, anything unfiled.
A skill writes here first, then **either** promotes the durable parts into
`wiki/` **or** abandons them. Nothing in `raw/` is a source of truth — treat it
as a scratchpad that survives between sessions.

- `raw/research/` — web research, competitor findings, raw scrape output
- `raw/chat-dumps/` — pasted Claude Code sessions worth keeping
- `raw/inbox/` — anything not yet sorted

### `wiki/` — codified knowledge

One concept, one note. **Edited in place** when facts change — never appended
to. This is where drift gets fixed and stays fixed.

- `wiki/domains/` — the eight working domains: purpose, recurring tasks, the
  skills and agents that own them. Start here for "what kind of work is this?"
- `wiki/patterns/` — repeatable recipes: the entity-type buildout, the T7
  confidence rubric, the plan/spec workflow
- `wiki/stack/` — stack conventions and deploy runbooks (pointer to
  `docs/runbooks/` until that content is consolidated here)
- `wiki/competitors/` — citation-competitor profiles (IMDb Pro, fxguide, ASC,
  Wikipedia); the live detail lives in the Sentinel skill's `references/`
- `wiki/legal/` — `licenses.md` (third-party license inventory) and
  `risk-register.md` (compliance findings), both maintained by the
  `legal-counsel` agent / `cinecanon-legal-review` skill

### `output/` — finished deliverables

Immutable and dated: `YYYY-MM-DD-<slug>.md`. A finished audit is never edited;
a follow-up is a new dated file.

- `output/specs/` — feature design specs
- `output/plans/` — dated implementation plans
- `output/audits/` — UX and accessibility audits
- `output/qa-reports/` — site crawl reports
- `output/aeo-digests/` — Sentinel digests of record

> **Note on the existing `docs/` tree.** Today the team writes specs and plans
> to `docs/superpowers/{specs,plans}/`, audits to `docs/audits/`, QA reports to
> `docs/qa-reports/`, and runbooks to `docs/runbooks/`. Those are the *current*
> homes and remain valid. The `vault/output/` and `vault/wiki/stack/` folders
> are the *intended* homes; migrating the existing `docs/` content into the
> vault is a deliberate, separate follow-up so nothing that links to
> `docs/...` paths breaks unreviewed. Until then, treat both as canon and
> prefer the vault for net-new files.

### `learnings/` — append-only

One file per skill (`vault/learnings/<skill-name>.md`). Every skill ends its
run by appending a dated, terse note: what worked, what surprised it, what to
do differently. This is the raw material for periodic review. See
`learnings/README.md`.

> The `cinecanon-sentinel` skill keeps its own `learnings/` folder inside the
> skill directory (historical). New skills append to `vault/learnings/`.

## Navigation rule for any task

```
CLAUDE.md  →  vault/wiki/domains/README.md  →  the relevant SKILL.md
           →  that skill's references/ (if any) and vault/learnings/<skill>.md
```

1. **`CLAUDE.md`** — project purpose, the OS map, the skills index.
2. **`vault/wiki/domains/README.md`** — which domain owns this work, and which
   skill/agent to reach for.
3. **The skill** — `.claude/skills/<name>/SKILL.md` is the procedure.
4. **Learnings** — `vault/learnings/<skill>.md` for prior lessons before
   running; append to it after.

## Maintenance

A monthly **memory-consolidation pass** keeps the vault honest: merge duplicate
`wiki/` notes, fix stale facts, prune `raw/`, refresh this index. Run it
alongside the Sentinel monthly architecture review (first Sunday). Until that
is scheduled, any skill that notices drift should fix the `wiki/` note in the
same run.
