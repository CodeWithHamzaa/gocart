# Gates

Every milestone passes through these. A gate that was not run is reported as
**not run** — never as passed.

---

## G0 — Dependency  ·  Engineering Manager

- Every milestone on the `Dependencies` line is `Done` in `docs/TASKS.md`.
- Read the actual status roll-up. **Ascending milestone ID does not imply order** —
  `M14`, `M16`, `M17`, and `M19` run before `M3` (ADR-014).
- The milestone is not already claimed by another branch or in-progress task.
- **Fail** → stop and name the blocking dependency.

## G1 — Scope  ·  Engineering Manager + Product Manager

- Goal restated in one testable sentence.
- Acceptance criteria are independently checkable, including edge cases.
- Non-goals stated, each deferred item pointing at the milestone that owns it.
- The `Files` line is the scope boundary and is understood.
- **Fail** → the plan and spec disagree; escalate as a `C`-class finding.

## G2 — Architecture  ·  Software Architect

- No Accepted ADR (ADR-001 … ADR-024) is contradicted.
- No hard constraint from `CLAUDE.md` is weakened.
- Server/client data-access boundary respected (`lib/payload/*` is server-only).
- Any new non-obvious decision is written as an ADR.
- **Fail** → the ADR wins. Stop. Do not implement around it.

## G3 — Design  ·  UI/UX Designer *(customer-visible changes only)*

- Works at the smallest breakpoint first.
- Loading, empty, error, and not-found states all designed.
- No dead UI — no control without a handler.
- Copy is true; contact details come from the `Settings` global.
- **Fail** → return to design before implementation.

## G4 — Implementation  ·  Full-Stack Engineer

```
npm run type-check     # MUST pass
npm run build          # MUST pass
```

- Changes stay inside the `Files` boundary, or the excursion is explicitly reported.
- House conventions followed (see [CONVENTIONS.md](./CONVENTIONS.md)).
- **Fail** → fix before handing to QA. Never hand over a failing build.

## G5 — Verification  ·  QA Engineer

- Every acceptance criterion and the milestone's own `Testing` line checked against a
  **live server**, with recorded evidence.
- HTTP status codes asserted, not just page content.
- Consumers of any changed shared shape or utility also checked.
- **Fail** → back to the Full-Stack Engineer. QA does not fix.

### Known gate limitations — state these, do not paper over them

| Check | State |
|---|---|
| `npm run type-check` | ✅ Available |
| `npm run build` | ✅ Available |
| `npm run lint` | ❌ **Broken** — `next lint` with no ESLint dependency and no config. **Must not be reported as passing.** |
| Automated tests | ❌ **None exist.** `M56a` schedules one Playwright golden-path test + CI; it depends on `M33a` and `M56`, both Not Started |
| CI | ❌ **None.** No `.github/workflows/` |

Until those are repaired, **manual verification is the only regression net.** Treat it
accordingly.

## G6 — Security / Performance  ·  Security / Performance Engineer

- Access control unchanged unless the milestone explicitly owns changing it.
- **`Orders` read access never widened** (ADR-024).
- No PII in logs, errors, or unauthenticated responses.
- Guest-submittable input validated server-side.
- Query shape, render strategy, and bundle cost reviewed.
- **Fail** → findings returned to the Full-Stack Engineer. This role never patches.

## G7 — Release  ·  DevOps / Release Engineer

- Correct branch — **never branched from `main`**, which still holds the pristine
  upstream multi-vendor app.
- One reviewable commit using the milestone's own `Commit message` line.
- PR body prepared: milestone ID, changes, real gate output, scope changes,
  found-but-not-fixed items, rollback step.
- No secrets anywhere in the diff or the PR body.

## G8 — Human approval  ·  **HUMAN — non-delegable**

The team stops here. Every time.

---

## Actions requiring explicit human approval

No role may perform any of these on its own initiative:

- Changing, superseding, or reversing an **Accepted ADR**
- Major **architectural** changes
- Major **database or schema** changes
- **Authentication or authorization** changes
- **Payment** changes of any kind
- **Destructive database** operations (drop, truncate, volume removal)
- **Destructive Git** operations (force-push, hard reset, history rewrite, branch
  deletion)
- **Production infrastructure** changes
- **Production deployment**
- **Merging** a production-impacting PR
- Installing or removing a package (`CLAUDE.md` working agreement)
- Running a migration against any non-local database

`.claude/settings.json` enforces the mechanical subset: destructive Git and Docker
operations are **denied**, and pushes, merges, installs, seeds, and migrations are
**ask**. The rest is enforced by these instructions and by the human at G8.

## Conflict escalation

**STOP and surface** — never guess — when you find:

| Trigger | Class |
|---|---|
| Milestone contradicts an Accepted ADR or hard constraint | `C` — contradiction |
| Two documents disagree on a fact you need | `C` |
| A dependency is `Done` in one document, `Not Started` in another | `C` |
| The spec is silent on something the milestone requires | `D` — missing decision |
| A defect in already-shipped code, found incidentally | `R` — risk |
| The work would need a human-approval action | escalate directly |

Use the `C` / `D` / `R` taxonomy from `docs/PHASE_1_READINESS_REPORT.md`. Report the
conflict, both sides of it, and your recommendation — then wait.

`CLAUDE.md` puts it plainly: **surface the conflict rather than guessing.**
