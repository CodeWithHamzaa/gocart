# Milestone workflow

The one path work takes through the GoCart AI engineering team.

```
HUMAN
  ↓  /milestone M29
ENGINEERING MANAGER  ── intake, dependency check, scope, role assignment
  ↓
Product Manager        (when scope or acceptance criteria are unclear)
  ↓
Software Architect     (when schema, structure, dependencies, or an ADR is touched)
  ↓
UI/UX Designer         (when a customer-visible surface changes)
  ↓
Full-Stack Engineer    (always, when code changes)
  ↓
QA Engineer            (always, when code changes)
  ↓
Security / Performance (when auth, PII, Orders, public API, queries, or bundle)
  ↓
DevOps / Release       (branch, commit, PR preparation)
  ↓
GitHub PR
  ↓
HUMAN APPROVAL   ←  the team stops here, every time
  ↓
Merge → Production
```

## Gate sequence

Each gate is described in full in [GATES.md](./GATES.md).

| Gate | Owner | Passes when |
|---|---|---|
| **G0 Dependency** | Engineering Manager | Every milestone on the `Dependencies` line is `Done` in `docs/TASKS.md`; the milestone is not already claimed |
| **G1 Scope** | Engineering Manager + Product Manager | Goal, acceptance criteria, non-goals, and the `Files` boundary are unambiguous |
| **G2 Architecture** | Software Architect | No Accepted ADR or hard constraint is contradicted; any new ADR is written |
| **G3 Design** | UI/UX Designer | Mobile-first, all states designed, no dead UI, copy is true |
| **G4 Implementation** | Full-Stack Engineer | Code written inside the `Files` boundary; `type-check` and `build` pass |
| **G5 Verification** | QA Engineer | Every acceptance criterion checked against a live server, with evidence |
| **G6 Security / Performance** | Security / Performance Engineer | No access-control, PII, validation, or cost regression |
| **G7 Release** | DevOps / Release Engineer | Correct branch, one commit, PR body prepared |
| **G8 Human approval** | **HUMAN** | A person reviewed and approved. Non-delegable |

A skipped gate is a failed gate. A gate that was not run is reported as *not run* —
never as passed.

## Role selection is a decision, not a default

Not every milestone needs every role. `M29` (two files, no schema change, no new
customer-visible surface) does not need the UI/UX Designer. A collection change does
not need one either, but absolutely needs the Architect.

The Engineering Manager records which roles were assigned **and why each other role
was skipped**. Running all seven on a trivial change buries the signal that matters.

## Closing a milestone

1. All assigned roles reported; all gates passed.
2. `docs/TASKS.md` updated — status only, never execution order.
3. `docs/CHANGELOG.md` updated with what actually happened, including scope changes
   and anything found-but-not-fixed.
4. Any new ADR is in `docs/DECISIONS.md`.
5. Commit uses the milestone's own `Commit message` line verbatim.
6. PR prepared. **Not opened, not merged** — that is the human's call.

## When something goes wrong

**STOP and escalate.** Do not guess. See the escalation rules in
[GATES.md](./GATES.md#conflict-escalation) and use the `C`/`D`/`R` taxonomy from
`docs/PHASE_1_READINESS_REPORT.md`.

Surfacing a conflict is a success condition of the team, not a failure of it.
