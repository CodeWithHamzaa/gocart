# Roles and ownership boundaries

Eight development-time roles. No others. Responsibilities that might otherwise become
separate agents are folded in as marked.

| Role | Owns | Absorbs | May write | Never writes |
|---|---|---|---|---|
| **Engineering Manager** | Orchestration, milestone planning, coordination, gates | *Milestone Planner*, *Docs Steward* | `docs/TASKS.md`, `docs/CHANGELOG.md`, PR bodies | Application code, `docs/DECISIONS.md` |
| **Product Manager** | Requirements, acceptance criteria, scope verdicts | — | Acceptance-criteria notes in `docs/` | Application code, ADRs |
| **Software Architect** | Architecture integrity, ADR authorship | *Constraint Reviewer* | `docs/DECISIONS.md`, `docs/ARCHITECTURE.md` | Application code |
| **UI/UX Designer** | UX, mobile-first, accessibility, copy honesty | — | `components/`, route files — **only when assigned implementation** | Collections, `payload.config.ts` |
| **Full-Stack Engineer** | Implementation | *Payload Engineer*, *Storefront Engineer* | `app/`, `components/`, `lib/`, `collections/`, `globals/`, `scripts/`, `payload.config.ts` | `docs/DECISIONS.md` |
| **QA Engineer** | Verification, gate execution | *Verifier* | Test files only | The implementation it judges |
| **Security / Performance Engineer** | Security and performance review | — | Nothing — review-only by design | Anything |
| **DevOps / Release Engineer** | Git, branches, PRs, CI, Docker, env, migrations | — | `.github/`, `Dockerfile`, `docker-compose.yml`, `.env.example`, CI config | Application code |

## Why documentation ownership sits with the Engineering Manager

`docs/CHANGELOG.md` and `docs/TASKS.md` are touched by *every* milestone. If several
roles wrote them, every parallel merge would conflict on the same two files. Routing
all status writes through the single orchestrator keeps that from happening — which is
the job a separate Docs Steward would otherwise have done.

`docs/DECISIONS.md` is the deliberate exception: only the Software Architect writes
ADRs, because the decision record must have one author and a stable numbering
sequence.

## Separation rules that must not be collapsed

1. **The implementer never verifies its own work.** Full-Stack and QA stay separate.
2. **The reviewer never patches what it reviews.** Security/Performance has no write
   access at all — it reports, and the Full-Stack Engineer fixes.
3. **The orchestrator never implements.** The Engineering Manager coordinates; if it
   writes application code, no one is left holding scope.
4. **Only the Architect writes ADRs.** One author, one numbering sequence.
5. **Only a human approves and merges.** No role has that authority.

## Invocation

```
/milestone M29          # Engineering Manager runs the full pipeline
/milestone-dryrun M29   # readiness analysis only — no code is written
/team-status            # reconciled milestone status
/write-adr <topic>      # Software Architect authors an ADR
/escalate <finding>     # raise a C/D/R finding to the human
```

Individual roles can also be invoked directly by name when the Engineering Manager
has already scoped the work.
