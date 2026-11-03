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

- No Accepted ADR is contradicted (the record starts at ADR-001; `grep -n '^## ADR-' docs/DECISIONS.md | tail -3` gives the current range, ADR-049 on 2026-11-03).
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
| Automated tests | ◐ Script tests run in CI on every PR: `test:env`, `test:turnstile`, `test:category-filters`, `test:demo-images`, `test:seo`, `test:rollout-demo-photos` (job `checks`) and `test:idempotency`, `test:users-guard` (job `e2e`); `test:rollout-demo-photos:db` is manual. Plus one Playwright golden-path test (+ an out-of-stock check) in `e2e/` (`M56a`): `npm run test:e2e` against a production build and a seeded throwaway PostgreSQL. It is deliberately minimal — **no unit tests, and no coverage of admin, lookup edge cases, validation rules or copy**; `e2e/seo.spec.ts` (`M40`–`M43`) also checks what a crawler receives (initial HTML, metadata, sitemap, robots, JSON-LD), and `e2e/mobile.spec.ts` (`M44`) guards 320px layout, 44px header targets and mobile cart/address flows |
| CI | ✅ `.github/workflows/ci.yml`: `checks` (type-check, lint, script tests), `turnstile-contract` (real Cloudflare test keys), `e2e` (PostgreSQL service, seed, **`build`**, golden-path test), the migration job, `prod-stack` and the production-image build, on every PR and push to `main` |

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

## G8 — Human approval  ·  **HUMAN, or a standing owner delegation below**

The team stops here. Every time — **except** where a standing owner delegation listed in
"Standing owner delegations" below covers the action. Outside those delegations, nothing in
this file is relaxed. Each delegation's own scope and its absolute stops apply.

---

## Actions requiring explicit human approval

No role may perform any of these on its own initiative, except where a standing owner
delegation below covers that exact action (each delegation lists what it covers and what it
does not):

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

`.claude/settings.json` enforces a mechanical subset (reconciled 2026-11-03; rule precedence
is deny, then ask, then allow):

- **deny**: force push (`--force`, `-f`, `--force-with-lease`, `+refspec`, `--mirror`), pushing
  to or deleting a remote branch by name (`git push origin main`, `HEAD:main`, `:branch`,
  `--delete`, `--prune`), `git reset --hard`, `git clean -fd/-fdx`, `git branch -D/-f/--force`,
  `git checkout -f`, `git tag -d`, history rewrite (`filter-branch`, `filter-repo`), Docker
  volume removal and prune, `dropdb`, `npm publish`, and reading `.env` (`Read`, `cat`, `head`,
  `tail`). The `main` rules are prefixes, so they also block branches whose names start with
  `main` (for example `main-fix`); name branches otherwise.
- **ask**: every other `git push` (including feature-branch pushes), `git merge`, `git rebase`,
  `npm install`/`uninstall`, seeds, `payload migrate`/`deploy:migrate`, the M108 rollout and its
  DB test, `docker compose up/down`, `rm -rf`, and reading `.env.*` files such as `.env.example`.
- **allow**: read-only commands, `git fetch`, `git checkout main`, `npm ci`, type-check, lint,
  build and the network-free script tests, `docker build`.

These rules match command prefixes only: reordered flags (`git push -u origin feat --force`) or
an unusual refspec (`feat:main`) can slip past them. They are a backstop; **branch protection on
`main` (no force push, no deletion, required CI) is the real control** for the remote, and these
instructions for everything else. Connector tools (GitHub, Vercel, Neon MCP) are not covered by them at
all: for those, these instructions, the delegations below and branch protection are the control.
The rest is enforced by these instructions and by the human at G8.

## Standing owner delegations (read this first)

The owner (Abdul) has recorded four delegations. They are cumulative; where they differ, the
narrower stop wins. Every one of them keeps the absolute stops listed after the table.

| Date | Section below | What it delegates |
|---|---|---|
| 2026-10-09 | "Smart Execution & Scope-Based QA" (above) | Scoped QA for scoped changes; merging such PRs once the named checks and CI pass |
| 2026-10-30 | "Owner delegation: free test deployment" | Everything needed to run the Vercel Hobby + Neon Free + Vercel Blob test environment |
| 2026-11-03 | "Owner delegation: technical decisions and approvals for the test environment" | Accepting Proposed ADRs, resolving blockers, accepting milestones, merging to the default branch for ADR-046/ADR-049 work (`M103`-`M108`) |
| 2026-11-03 (later) | "Owner delegation: governance and documentation remediation, standing technical autonomy" | Routine technical decisions, governance, agent-instruction and documentation corrections, ADR status reconciliation, and merging such PRs, without asking the owner each time |

**Absolute stops under every delegation** (only the owner, in words, lifts one):

- `M109` and **any production work** (the VPS, the client's production database, domain,
  Cloudflare production setup, production deployment) until the owner gives the client's
  go-ahead. Preparing `M109` counts.
- Purchasing, provisioning or modifying a VPS; any paid action.
- Changing or superseding the *decision* of an Accepted ADR (a status annotation that points to a
  later ADR which already supersedes or amends it is allowed, see the 2026-11-03 (later) section).
- Force push, history rewrite, remote branch deletion, `git reset` on shared branches; bypassing
  branch protection, required CI checks or required reviews.
- Deleting resources or data outside the authorised test scope, or resources the session did not create.
- Changes to authentication, authorization or collection access control (including any widening of
  `Orders` read, ADR-024), payment, order-total validation or rate-limiting logic.
- Printing, logging, committing or requesting in chat any token, connection string,
  `PAYLOAD_SECRET` or Blob token. A task that needs credentials the session lacks is reported
  as blocked on access, never worked around.
- The test environment (Vercel `gocart-test`, Neon `gocart-test`, Blob `gocart-test-media`) and the
  future production VPS stay strictly separate: no shared database, Blob store, secret or data.

## Owner delegation: free test deployment (2026-10-30)

**Authority:** the project owner, Abdul, recorded this on 2026-10-30. Verbatim:

> I authorize the AI agent team to perform, without waiting for my manual action, all
> steps needed to deploy GoCart as a free, non-commercial, personal test environment on
> Vercel Hobby + Neon Free + Vercel Blob, including: installing/uninstalling packages,
> Accepting new ADRs, merging PRs to main after all gates pass and CI is green, creating
> and configuring the Vercel project, Blob store, and Neon project, setting environment
> variables, running database migrations and seeding on the new Neon test database,
> deploying, and creating the first Payload admin user. This delegation is recorded by a
> governance commit made under this authorization.

**Scope: exactly that, and nothing wider.**

- It applies only to a free, non-commercial, personal **test** environment on Vercel
  Hobby + Neon Free + Vercel Blob. It is **not** a production deployment, does not touch
  the ADR-015 production baseline, and does not authorize any commercial or client use.
- For that purpose only, the steps in the quotation above are delegated to the agent team
  and G8 for them is satisfied by this record, provided every other gate that applies
  has passed and CI is green. "Merging PRs to main" means merging after those conditions,
  never a push to `main`.
- "Running database migrations and seeding" means against the Neon test database that the
  session itself created. Every other non-local database stays a human-approval action.
- New ADRs may be Accepted under this delegation, citing the governance commit. An
  Accepted ADR already in `docs/DECISIONS.md` is not modified or superseded by it.

**Out of scope of this delegation — these remain human-owned, absolute stops:**

- Modifying or superseding any **existing** Accepted ADR.
- Force push, history rewrite, branch deletion on a remote, `git reset` on shared branches.
- Deleting any Vercel project, Neon project, database, or Blob store that this session did
  not create.
- Any paid action: buying domains, starting Pro trials, upgrading plans, adding a card.
- Changes to authentication, payment, order-total validation, or rate-limiting logic.
- Printing, logging, committing, or echoing `VERCEL_TOKEN`, `NEON_API_KEY`, connection
  strings, `PAYLOAD_SECRET`, or `BLOB_READ_WRITE_TOKEN` anywhere (chat, files, commits, PRs).

On any conflict with `CLAUDE.md`, `docs/MIGRATION_PLAN.md`, or an Accepted ADR: **STOP and
report.** A gate that was not run is reported as "not run". This section overrides the
general statements elsewhere in `.claude/` ("a human merges", "non-delegable") **only** for
the scope above.

## Owner delegation: technical decisions and approvals for the test environment (2026-11-03)

**Authority:** the project owner, Abdul, instructed this in the session of 2026-11-03 (relayed through the owner's own chat message; recorded here by the governance commit that carries this section). Verbatim extracts:

> I am delegating full technical decision-making and approval authority to my AI Engineering Team. [...]
> You are authorized to evaluate, amend, and accept technical ADRs, resolve milestone blockers, update documentation, and approve implementation approaches within the existing project governance and authorized scope.
> Resume M108 [...] Resolve all identified blockers, complete ADR-049 evaluation and M107 review, and proceed with M108 implementation, testing, PR review, and merging when all checks pass. [...]
> Never bypass security controls, production safeguards, branch protection, or required CI checks.
> M109 MUST remain on hold. Do not execute any M109 or production-related operations until I explicitly provide the client's go-ahead.

**What this delegation covers (and G8 for it is satisfied by this record, provided every other gate that applies has passed and CI is green):**

- Evaluating, amending and accepting technical ADRs that are **Proposed** (not an already-Accepted ADR: modifying or superseding one stays human-owned unless the owner names it), resolving milestone blockers, and approving implementation approaches.
- Reviewing and accepting a finished milestone, and opening and merging its PR **to the repository's default branch** after all gates pass, CI is green and branch protection is satisfied (never a push to `main`, never a bypass of a required check).
- The test environment of ADR-046 (Neon Free + Vercel Blob) and the demo-photography work of ADR-049 (`M103`-`M108`).

**Not delegated by this section, still absolute stops:**

- `M109` (demo cleanup and original-catalogue import) and **any production operation or deployment**, until the owner gives the client's go-ahead in words. Preparing nothing for `M109` counts as part of this stop.
- Anything the 2026-10-30 delegation lists as out of scope that this message does not override: force push, history rewrite, remote branch deletion, deleting Vercel/Neon/Blob resources the session did not create, paid actions, changes to authentication, payment, order-total validation or rate-limiting logic, and printing or committing any token, connection string or `PAYLOAD_SECRET`.
- Credentials and access the session does not have. A task that needs them is reported as blocked on access, never worked around.

On any conflict with `CLAUDE.md`, `docs/MIGRATION_PLAN.md`, or an Accepted ADR: **STOP and report.**

## Owner delegation: governance and documentation remediation, standing technical autonomy (2026-11-03, later)

**Authority:** the project owner instructed this in the session of 2026-11-03 (the owner's own chat message, after the project knowledge audit); recorded here by the governance commit that carries this section. Verbatim extracts:

> The AI Engineering Team has authority to independently: Research and investigate all identified issues. [...] Determine which ADRs are current, amended, superseded or obsolete. Make technical decisions and resolve conflicting instructions. Update governance policies, agent instructions and documentation. Implement safe technical corrections. Run tests, builds, lint, security checks and independent reviews. Create PRs and merge them when all required checks and safeguards pass.
> Engineering Manager is responsible for coordinating specialists and making final technical decisions after considering their reviews.
> Do not repeatedly ask me to approve routine technical decisions, documentation changes, ADR updates or security improvements.
> M109 MUST remain on hold until I explicitly communicate the client's go-ahead. All production work MUST remain on hold until explicit client authorization. Do not purchase, provision or modify a VPS. [...] Do not bypass branch protection, CI, security controls or required reviews. Do not expose secrets or credentials. Do not delete resources or data outside the explicitly authorized scope.
> The current Vercel deployment is the test environment. Future client production will be a separate VPS deployment. Keep these environments strictly isolated.
> Future AI Engineering Team sessions should be able to continue independently without unnecessary owner approvals.

**Standing until the owner revokes or narrows it.** It covers, with G8 satisfied by this record once every other applicable gate has passed and CI is green:

- Routine technical decisions; the Engineering Manager decides after the specialists' reviews and records the reasoning in the PR body (and in an ADR when the decision is non-obvious).
- Corrections to governance files, agent definitions, commands and documentation, including `.claude/settings.json`, as long as no absolute stop above is weakened. A change to `.claude/settings.json` or to this file needs an independent Security/Performance (G6) review recorded in the PR before merge.
- ADR status reconciliation: accepting a **Proposed** ADR; adding a status annotation to an Accepted ADR that points to a later Accepted ADR which already supersedes or amends it. Changing what an Accepted ADR decides still needs a new ADR approved by the owner.
- Security improvements that do not change authentication, payment, order-total or rate-limiting logic.
- Opening PRs for the above and merging them to the default branch when CI is green and branch protection is satisfied.
- Read-only inspection of the test environment through the authorised connectors (Vercel, Neon), and test-environment operations the 2026-10-30 and 2026-11-03 delegations already cover. A milestone's own spec can be narrower (for example `M108`: "no deploy by the AI team unless the owner asks"); the narrower rule wins.

**Not covered:** every absolute stop in "Standing owner delegations" above; major architectural or schema changes, installing or removing packages, and migrations against any non-local database, unless an earlier delegation names that exact action for the test environment; non-routine product or business decisions (scope, pricing, catalogue, client commitments), which go to the owner with a recommendation.

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
