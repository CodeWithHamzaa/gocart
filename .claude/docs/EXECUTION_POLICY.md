# Execution policy — Model, Mode, Effort

Which **Claude Code UI settings** (Model, Mode, Effort) to use for each kind of
AI-team work. This is a **development-time** control — it configures how the team
does its job, never the shipped application. See
[NO_PRODUCTION_AI.md](./NO_PRODUCTION_AI.md).

- **Model** — `Opus` or `Sonnet`, set with `/model`.
- **Mode** — `Plan` (proposes, stops for human approval before acting) or `Auto`
  (executes directly, within the permissions in `.claude/settings.json`).
- **Effort** — the reasoning-effort level, `Low` / `Medium` / `High`.

None of these three are controllable mid-task by an agent — they are session-level
settings the **human sets in the Claude Code UI**. An agent's job is to state what a
task needs and ask for the switch, not to assume it already matches.

## Recommended setting by task type

| Task type | Roles it maps to | Model | Mode | Effort |
|---|---|---|---|---|
| Architecture / complex planning | Software Architect (schema, ADRs, cross-cutting design); Engineering Manager on ambiguous intake | Opus | Plan | High |
| Dry-runs / reviews | `/milestone-dryrun`; any read-only analysis pass | Opus | Plan | High |
| Implementation | Full-Stack Engineer; UI/UX Designer when assigned implementation | Sonnet | Auto | High |
| QA / testing | QA Engineer | Sonnet | Auto | High |
| Security / performance review | Security / Performance Engineer | Opus | Plan | High |
| Documentation | Product Manager acceptance criteria; Engineering Manager's `TASKS.md`/`CHANGELOG.md` updates | Sonnet | Auto | Medium |
| DevOps / routine operations | DevOps / Release Engineer | Sonnet | Auto | Medium/High — High for anything deploy-facing (CI, Docker, migrations); Medium for routine branch/PR mechanics |

**Rule of thumb**: analysis and judgment that a human should check *before* anything
happens → Opus + Plan + High. Bounded, well-scoped execution against a plan someone
already reviewed → Sonnet + Auto. Effort drops to Medium only for low-stakes,
mechanical writing (status notes, routine ops) — never for anything touching
architecture, security, or an ADR.

## What the Engineering Manager must do with this

Before starting work on any task, the Engineering Manager:

1. **Determines** the task type from the table above (a milestone may span more than
   one — e.g. implementation *and* a security review need different settings for
   different phases; state each phase's requirement separately).
2. **Reports** the required Model, Mode, and Effort to the human, explicitly, before
   proceeding.
3. **Tells the human when the Claude Code UI needs to change** — i.e., whenever the
   session's current Model, Mode, or Effort doesn't match what the upcoming phase
   needs. Name the exact switch (e.g. "switch to Opus and enable Plan mode before the
   architecture review; Sonnet + Auto is fine for the implementation phase after").
   Do not proceed past a mismatched setting for a high-stakes phase (Architecture,
   Dry-run/review, Security/Performance) without flagging it first — this is not a
   gate that blocks work outright, but the human's setting choice must be an informed
   one, not a silent default.

This policy does not override the human-approval gates in
[GATES.md](./GATES.md) — it governs *how* the team works, not *whether* a human
still approves before anything merges or deploys.
