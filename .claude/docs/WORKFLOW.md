# Milestone workflow

The one path work takes through the Mirza AI engineering team.

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
HUMAN APPROVAL   ←  the team stops here, unless a standing owner delegation covers it (GATES.md, "Standing owner delegations")
  ↓
Merge → (production only after the owner's go-ahead; never under a delegation)
```

## Gate sequence

Each gate is described in full in [GATES.md](./GATES.md).

| Gate | Owner | Passes when |
|---|---|---|
| **G0 Dependency** | Engineering Manager | Every milestone on the `Dependencies` line is `Done` in `docs/TASKS.md`; the milestone is not already claimed |
| **G1 Scope** | Engineering Manager + Product Manager | Goal, acceptance criteria, non-goals, and the `Files` boundary are unambiguous |
| **G2 Architecture** | Software Architect | No Accepted Architecture Decision Record or hard constraint is contradicted; any new Architecture Decision Record is written |
| **G3 Design** | User Interface and User Experience Designer | Mobile-first, all states designed, no dead user interface, copy is true |
| **G4 Implementation** | Full-Stack Engineer | Code written inside the `Files` boundary; `type-check` and `build` pass |
| **G5 Verification** | Quality Assurance Engineer | Every acceptance criterion checked against a live server, with evidence |
| **G6 Security / Performance** | Security / Performance Engineer | No access-control, personally identifiable information, validation, or cost regression |
| **G7 Release** | DevOps / Release Engineer | Correct branch, one commit, pull request body prepared |
| **G8 Human approval** | **HUMAN**, or a standing owner delegation | A person reviewed and approved, or a standing owner delegation in [GATES.md](./GATES.md) ("Standing owner delegations") covers the action and every other gate passed with continuous integration green |

A skipped gate is a failed gate. A gate that was not run is reported as *not run* —
never as passed.

## Role selection is a decision, not a default

Not every milestone needs every role. Milestone 29 (two files, no schema change, no new
customer-visible surface) does not need the User Interface and User Experience Designer. A collection change does
not need one either, but absolutely needs the Architect.

The Engineering Manager records which roles were assigned **and why each other role
was skipped**. Running all seven on a trivial change buries the signal that matters.

## Closing a milestone

1. All assigned roles reported; all gates passed.
2. `docs/TASKS.md` updated — status only, never execution order.
3. `docs/CHANGELOG.md` updated with what actually happened, including scope changes
   and anything found-but-not-fixed.
4. Any new Architecture Decision Record is in `docs/DECISIONS.md`.
5. The commit message is a brief, clear, professional one-line message in plain English (see `.claude/rules/documentation-style.md`); the milestone's stored `Commit message` line is only a suggestion.
6. Pull request prepared. **Not opened, not merged** — that is the human's call. (Exception: inside the owner's 2026-10-30 test-deployment delegation the team may open and merge once all applicable gates pass and continuous integration is green; the out-of-scope list in [GATES.md](./GATES.md), "Owner delegation", stays human-owned.)

## When something goes wrong

**STOP and escalate.** Do not guess. See the escalation rules in
[GATES.md](./GATES.md#conflict-escalation) and use the `C`/`D`/`R` taxonomy from
`docs/PHASE_1_READINESS_REPORT.md`.

Surfacing a conflict is a success condition of the team, not a failure of it.
