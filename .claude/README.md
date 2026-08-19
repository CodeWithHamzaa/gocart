# GoCart AI Engineering Team

A **development-time** engineering system for the GoCart Pakistan migration.
Eight roles, one orchestrator, human approval before anything merges.

> **The application never depends on this.** Delete `.claude/` and GoCart still
> builds, runs, and deploys. See [docs/NO_PRODUCTION_AI.md](./docs/NO_PRODUCTION_AI.md).

## Structure

```
.claude/
├── settings.json      Permissions — denies destructive ops, asks before pushes/installs
├── agents/            The eight roles
├── commands/          /milestone  /milestone-dryrun  /team-status  /write-adr  /escalate
└── docs/
    ├── WORKFLOW.md          The pipeline and gate sequence
    ├── ROLES.md             Ownership boundaries and separation rules
    ├── GATES.md             Gate definitions + human-approval actions
    ├── PARALLELISM.md       When two milestones may run at once
    ├── CONVENTIONS.md       House style + the do-not-touch list
    └── NO_PRODUCTION_AI.md  The production-isolation guarantee
```

## The team

```
HUMAN → Engineering Manager → { Product · Architecture · UI/UX · Full-Stack
                                · QA · Security/Performance · DevOps/Release }
      → GitHub PR → HUMAN APPROVAL → merge → production
```

| Role | One-line charter |
|---|---|
| **Engineering Manager** | Orchestrates. Plans milestones, assigns roles, enforces gates, prepares the PR |
| **Product Manager** | Turns a Goal into testable acceptance criteria |
| **Software Architect** | Guards the architecture; sole author of ADRs |
| **UI/UX Designer** | Mobile-first, accessibility, honest copy, every state designed |
| **Full-Stack Engineer** | Implements — exactly the milestone, nothing more |
| **QA Engineer** | Independently verifies. Never fixes what it judges |
| **Security / Performance Engineer** | Reviews access control, PII, validation, cost. Review-only |
| **DevOps / Release Engineer** | Git, branches, PRs, CI, Docker, env, migrations |

## Getting started

```
/team-status            # where the project actually stands
/milestone-dryrun M29   # can this milestone run? (read-only)
/milestone M29          # run it through the full pipeline
```

## What this system does not change

`CLAUDE.md` remains the engineering constitution. `docs/MIGRATION_PLAN.md` remains the
authoritative implementation roadmap, and its milestone IDs remain the only units of
work. The Accepted ADRs in `docs/DECISIONS.md` remain binding. This team **executes**
that system — it does not replace it.

## Two rules that override everything else

1. **Surface the conflict rather than guessing.** Stopping to escalate is a success.
2. **A human approves before anything merges or deploys.** No role has that authority.
