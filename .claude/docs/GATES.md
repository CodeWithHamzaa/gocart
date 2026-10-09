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
| `npm run lint` | ✅ Available since 2026-10-09 (`eslint.config.mjs`, `next/core-web-vitals`). Report its real output |
| Automated tests | ❌ **None exist.** `M56a` schedules one Playwright golden-path test + CI; it depends on `M33a` and `M56`, both Not Started |
| CI | ◐ `.github/workflows/ci.yml` runs `npm ci`, type-check and lint only — **not `build`** (needs a reachable database, `M49`) and no tests |

Until those are repaired, **manual verification is the only regression net.** Treat it
accordingly.

## Smart Execution & Scope-Based QA — owner override (2026-10-09)

**Authority:** the project owner (the human at G8) directed this on 2026-10-09 to cut cycle time. It **overrides the
"every gate, every milestone" reading of G4/G5 below** for the cases listed here, and nothing else. Pull requests that satisfy
it may be opened and merged under the owner's standing authorization once the checks named below pass and CI is green.

**Classify the change first.** *Scoped* = minor UI, text, or a localized component fix that touches no server code,
shared type, or configuration. *Full* = anything else.

1. **Incremental checks (scoped changes).** Run `eslint <changed files>` first, then `npm run type-check`.
   `tsc` cannot be pointed at individual files while also using `tsconfig.json`, so type-checking stays project-wide;
   it takes seconds, and CI runs it and lint on every PR. **Skip the full `npm run build`** unless a shared type or
   configuration (`tsconfig.json`, `next.config.mjs`, `payload.config.ts`, `package.json`, ESLint config) changed.
2. **Targeted QA.** Do **not** start the throwaway PostgreSQL unless the change touches backend logic, API endpoints, access control, or the
   schema. Frontend-only work is verified against the running app with mocked or seeded browser state (e.g. `sessionStorage` /
   `localStorage` entries, intercepted requests) and static UI checks.
3. **Batch tightly related small items** (same files or same user-visible flow) into one change, and run QA and build **once at the end**,
   not after each micro-step.
4. **Fast-fail order.** Lint → type-check → logic checks → only then the full build or any database-dependent QA. Stop at the first failure.

**These are never relaxed — always run the full gates (build, live-server QA with a database, and a G6 review):**
order creation or lookup; `Orders` or any collection's access control; rate limiting; authentication; schema or migrations;
anything handling PII (names, phones, addresses); shared types and configuration; dependency changes; and any new or
changed ADR-level behaviour. A scoped classification is the Engineering Manager's call and must be stated in the PR body together with
which checks were skipped and why. When in doubt, classify as *Full*.

Skipped checks are reported as **skipped by the owner's rule**, never as passed.

---

## G6 — Security / Performance  ·  Security / Performance Engineer

- Access control unchanged unless the milestone explicitly owns changing it.
- **`Orders` read access never widened** (ADR-024).
- No PII in logs, errors, or unauthenticated responses.
- Guest-submittable input validated server-side.
- Query shape, render strategy, and bundle cost reviewed.
- **Fail** → findings returned to the Full-Stack Engineer. This role never patches.

## G7 — Release  ·  DevOps / Release Engineer

- Correct branch — **branched from current `main`**, the canonical baseline through
  `M28`, unless a human explicitly instructs otherwise. Historical pre-reconciliation
  branches (`migration/payload-cod`, `claude/sync-project-docs-2w09ea`,
  `claude/post-m23-next-steps`) are not valid development bases.
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
