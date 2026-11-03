# Mirza AI Engineering Team

A **development-time** engineering system for Mirza (formerly the GoCart Pakistan migration).
Eight roles, one orchestrator, human approval before anything merges, except where a standing owner delegation covers it (see "Standing owner delegations" in [docs/GATES.md](./docs/GATES.md)).

> **The application never depends on this.** Delete `.claude/` and Mirza still
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
    ├── EXECUTION_POLICY.md  Recommended Model + Mode + Effort by task type
    └── NO_PRODUCTION_AI.md  The production-isolation guarantee
```

## The team

```
HUMAN → Engineering Manager → { Product · Architecture · UI/UX · Full-Stack
                                · QA · Security/Performance · DevOps/Release }
      → GitHub PR → HUMAN APPROVAL (or a standing delegation, GATES.md) → merge → (production only with the owner's go-ahead)
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
2. **A human approves before anything merges or deploys, unless a standing owner delegation covers it.** The owner has delegated the test environment (Vercel Hobby + Neon Free + Vercel Blob), ADR-049 work and routine technical, governance and documentation decisions; the list, each scope, and the absolute stops none of them lifts (`M109` and all production work until the client's go-ahead, paid actions, changing an Accepted ADR's decision, force push and history rewrite, deleting resources outside the test scope, auth/payment/order-total/rate-limiting changes, secrets) are in "Standing owner delegations" in [docs/GATES.md](./docs/GATES.md).
