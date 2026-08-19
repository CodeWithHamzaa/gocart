# AI Engineering Team — Readiness Report

**Date**: 2026-08-19
**Scope**: Establish the development-time AI engineering team. No application
functionality was changed, and `M29` was **not** implemented.

---

## 1. What was implemented

An eight-role, development-time engineering system under [`.claude/`](../.claude/),
executing the project's existing milestone and ADR system rather than replacing it.

```
HUMAN
  ↓
Engineering Manager  ── orchestrator
  ↓
├── Product Manager
├── Software Architect
├── QA Engineer
├── Full-Stack Engineer
├── Senior UI/UX Designer
├── Security / Performance Engineer
└── DevOps / Release Engineer
  ↓
GitHub PR  →  HUMAN APPROVAL  →  merge  →  production
```

```
.claude/
├── settings.json                          permissions: deny / ask / allow
├── README.md                              entry point
├── agents/    engineering-manager · product-manager · software-architect
│              uiux-designer · fullstack-engineer · qa-engineer
│              security-performance-engineer · devops-release-engineer
├── commands/  milestone · milestone-dryrun · team-status · write-adr · escalate
└── docs/      WORKFLOW · ROLES · GATES · PARALLELISM · CONVENTIONS · NO_PRODUCTION_AI
```

Deliberately **not** built: databases, vector stores, message buses, AI runtimes,
external orchestration services, or an autonomous agent platform. The system is
Markdown role definitions, slash commands, and a permissions file.

Responsibilities that might have become separate agents were folded in as instructed:
Milestone Planner and Docs Steward → Engineering Manager; Constraint Reviewer →
Software Architect; Verifier → QA; Payload Engineer and Storefront Engineer →
Full-Stack Engineer.

## 2. Role responsibilities

| Role | Owns | May write | Never writes |
|---|---|---|---|
| **Engineering Manager** | Orchestration, milestone planning, dependency checks, scope, gate enforcement, status | `TASKS.md`, `CHANGELOG.md`, PR bodies | Application code, `DECISIONS.md` |
| **Product Manager** | Requirements, testable acceptance criteria, non-goals, scope verdicts | Acceptance-criteria notes | Application code, ADRs |
| **Software Architect** | Architectural integrity; **sole ADR author** | `DECISIONS.md`, `ARCHITECTURE.md` | Application code |
| **UI/UX Designer** | Mobile-first, accessibility, all states, copy honesty | `components/`, route files *when assigned* | Collections, `payload.config.ts` |
| **Full-Stack Engineer** | Implementation | `app/`, `components/`, `lib/`, `collections/`, `globals/`, `scripts/` | `DECISIONS.md` |
| **QA Engineer** | Independent verification, gate execution | Test files only | The implementation it judges |
| **Security / Performance** | Access control, PII, validation, query/render/bundle cost | **Nothing — review-only** | Anything |
| **DevOps / Release** | Git, branches, PRs, CI, Docker, env, migrations | `.github/`, Docker, `.env.example` | Application code |

**Separation rules that must not collapse**: the implementer never verifies its own
work; the reviewer never patches what it reviewed; the orchestrator never implements;
only the Architect writes ADRs; **only a human approves and merges.**

## 3. Workflow and gates

| Gate | Owner | Passes when |
|---|---|---|
| **G0** Dependency | Engineering Manager | Every `Dependencies` milestone is `Done`; not already claimed |
| **G1** Scope | EM + Product | Testable criteria, non-goals, `Files` boundary understood |
| **G2** Architecture | Architect | No Accepted ADR or hard constraint contradicted |
| **G3** Design | UI/UX | Mobile-first, all states, no dead UI, copy true |
| **G4** Implementation | Full-Stack | `type-check` + `build` pass; scope respected |
| **G5** Verification | QA | Every criterion checked on a live server, with evidence |
| **G6** Security / Performance | Sec/Perf | No access-control, PII, validation, or cost regression |
| **G7** Release | DevOps | Correct branch, one commit, PR body prepared |
| **G8** **Human approval** | **HUMAN** | **A person approved. Non-delegable** |

A skipped gate is a failed gate. A gate not run is reported as *not run* — never as
passed. Role assignment is a deliberate decision per milestone, and skipped roles must
be named with a reason; not every milestone needs every role.

## 4. Permissions

`.claude/settings.json` enforces the mechanical subset of the human-approval rules:

- **Denied**: force-push, `push origin main`, hard reset, `git clean -fd`, branch/tag
  deletion, `filter-branch`, `rm -rf`, `docker compose down -v`, `docker volume rm`,
  `dropdb`, `npm publish`, and reading `.env`.
- **Ask**: any push, merge, rebase, `checkout main`, package install/uninstall,
  `npm run seed`, `payload migrate`, `docker build`, `docker compose up/down`.
- **Allowed**: read-only inspection, `npm run type-check`, `npm run build`.

Additional human-approval actions — changing an Accepted ADR, major architecture/schema
changes, auth/authorization changes, payment changes, production infrastructure
changes, production deployment, and merging a production-impacting PR — are enforced by
role instructions and by the human at G8.

## 5. Classification of the previously identified blockers

As instructed, each item from the earlier inspection was classified before acting, and
only what was necessary was implemented.

| # | Item | Classification | Action taken |
|---|---|---|---|
| 1 | **`main` branch reconciliation** | **Required before parallel execution** — human-owned | **Not actioned.** Reconciling the trunk is a destructive-Git / production-impacting decision reserved for a human (G8). Mitigated instead: the DevOps role and `GATES.md` forbid branching from `main`, and `settings.json` denies `git push origin main`. **Remains an open blocker.** |
| 2 | **`CONTRIBUTING.md` contradicts ADR-006** | **Direct safety blocker** | **Fixed.** Rewritten for single-store reality with an explicit "Out of scope" table citing ADR-004/005/006/016/017. |
| 3 | **Stale root `README.md`** | **Required before AI-team operation** | **Fixed.** Status corrected to `M1`–`M28` Done, `M29` next; setup instructions made real; stale CONTRIBUTING endorsement removed. |
| 4 | **Broken `npm run lint`** | **Required before parallel execution** | **Neutralized, not repaired.** Repair needs `npm install`, which `CLAUDE.md` forbids without explicit instruction. Instead, `GATES.md` and the QA role state it is broken and **must never be reported as passing**. **Remains an open blocker.** |
| 5 | **Missing CI** | **Required before parallel execution** — *not* required for the AI-team foundation | **Deferred deliberately.** Adding a workflow now would go red immediately on the broken `lint` and on a build with no reachable database, training everyone to ignore CI. The DevOps role carries the exact intended pipeline for when item 4 is resolved. |
| 6 | **Missing test infrastructure** | **Optional hardening now; required before parallel execution** | **Deferred.** Owned by `M56a` (readiness finding `R7`). Pulling it forward would change `M56a`'s scope and needs an ADR + human approval. QA's manual protocol is the interim net and says so explicitly. |
| 7 | **Missing `tsx` dependency** | **Required before executing any milestone whose testing needs seed data** | **Not actioned** — adding a dependency is an `ask` action and forbidden without instruction. Documented in the DevOps role and flagged in the `M29` dry run below. **Remains an open blocker.** |
| 8 | **`prompts/` vs `.claude/commands/`** | **Required before AI-team operation** | **Fixed.** `.claude/commands/` is canonical; `prompts/README.md` now points there and forbids adding files. |
| 9 | **Documentation/status ownership** | **Already resolved by the approved role model** | Engineering Manager is the single writer of `TASKS.md`/`CHANGELOG.md`; Architect is the single writer of `DECISIONS.md`. Recorded in `ROLES.md`. |
| 10 | **`.claude/` shipped into the Docker image** | **New finding — direct safety blocker for the no-AI guarantee** | **Fixed.** The `Dockerfile` does `COPY . .`, so `.claude/` would have been baked into every image. Added to `.dockerignore`. |

## 6. Production AI-dependency verification

The application must operate completely independently after handover. Verified:

| Check | Result |
|---|---|
| AI/LLM package in `package.json` | ✅ **None** — manifest untouched by this work |
| Application code referencing `.claude/` | ✅ **None** across `app/`, `components/`, `lib/`, `collections/`, `globals/`, `scripts/`, `payload.config.ts` |
| AI provider keys in `.env.example` / `docker-compose.yml` / `Dockerfile` | ✅ **None** |
| `.claude/` referenced by build config | ✅ **None** in `next.config.mjs`, `tsconfig.json`, `postcss.config.mjs` |
| `.claude/` excluded from Docker images | ✅ **Now excluded** via `.dockerignore` (was not) |
| Application files modified by this work | ✅ **Zero** |

The binding test — *the application builds with `.claude/` deleted* — is recorded in
`.claude/docs/NO_PRODUCTION_AI.md` as check 4. It could not be executed here because
`node_modules` is not installed in this environment; it is listed as a prerequisite
below. By construction it must pass: nothing in the application references `.claude/`.

## 7. `M29` dry run — analysis only, nothing implemented

### Contract (`docs/MIGRATION_PLAN.md`)

| Field | Value |
|---|---|
| **Goal** | Replace the in-memory `.includes()` Redux-array search with a real query against Payload/Postgres so it scales past a handful of seeded products |
| **Files** | `app/(public)/shop/page.jsx`, `lib/payload/products.ts` |
| **Dependencies** | `M24` |
| **Testing** | A seeded product name returns correct results; a non-matching term returns an empty state, not an error |
| **Rollback** | Revert both files |
| **Commit message** | `Replace client-side array search with real product query` |

### G0 — Dependency check: **PASS**

`M24` is **Done (2026-08-18)** per `docs/TASKS.md` (both the narrative entry and the
`M22`–`M28` roll-up row). No other milestone claims either file. No branch is in
progress on `M29`.

### Current state of the target files

- `app/(public)/shop/page.jsx` — already an async **server component** (`M24`). It calls
  `getProducts()` with no arguments, then filters in memory:
  `products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))`.
- `lib/payload/products.ts` — `getProducts()` accepts `{ limit = 0, page = 1, sort }`
  and calls `payload.find({ collection: 'products', ... })`. **There is no `where`
  clause and no search parameter.** `limit = 0` means "return every product".

The change is therefore: add a search option to `GetProductsOptions`, translate it into
a Payload `where` clause, and have the page pass `search` through instead of filtering
the fetched array.

### G2 — Architecture check: **PASS, with one decision to make**

No Accepted ADR is contradicted. The page is already a server component (ADR-007), the
query stays inside Payload's Local API (ADR-002/ADR-003), and nothing touches auth,
payments, or the vendor surface.

**One genuine `D`-class question the milestone does not answer**: what are the match
semantics? Today's behavior is a case-insensitive substring match on `name` only. The
implementation must decide, and state, whether the new query preserves exactly that —
and whether `description` becomes searchable. This is a small decision, but it is a
**behavior contract**, so it belongs in the acceptance criteria before code is written.

### Role assignment

| Role | Assigned? | Reason |
|---|---|---|
| **Product Manager** | ✅ Yes | Match semantics and case sensitivity must be pinned as testable criteria first |
| **Software Architect** | ✅ Light | Confirm no ADR is needed and that the query stays within Payload's Local API |
| **UI/UX Designer** | ❌ **Skipped** | No visual change. The empty state, the back-link, and the grid all already exist and are unchanged by `M29` |
| **Full-Stack Engineer** | ✅ Yes | Two-file implementation |
| **QA Engineer** | ✅ Yes | Behavior change on a customer-facing route |
| **Security / Performance** | ✅ Yes | User-controlled input now flows into a database query, and removing the unbounded `limit: 0` fetch is the milestone's actual point |
| **DevOps / Release** | ✅ Light | Branch, commit, PR preparation only |

### Acceptance criteria (draft — Product Manager confirms)

1. `?search=Bluetooth` returns every product whose name contains `Bluetooth`, and no others.
2. Matching is **case-insensitive**, preserving current behavior exactly.
3. A non-matching term renders the existing empty grid — HTTP 200, no error.
4. No `search` parameter returns the full listing, unchanged.
5. Filtering happens **in the database**, not in memory — verified by the absence of a
   full-catalog fetch.
6. An empty-string or whitespace-only `search` behaves as no search.
7. `/shop` still renders server-side with no client-side data fetching.

### G7 gate readiness — **the real blockers**

| Gate | Can it run today? |
|---|---|
| `npm run type-check` | ✅ Yes, once `node_modules` is installed |
| `npm run build` | ✅ Yes |
| `npm run lint` | ❌ **Broken** — must be reported as unavailable |
| Automated tests | ❌ **None exist** (`M56a`, Not Started) |
| **QA manual verification** | ⚠️ **Blocked without seeded data** |

The last row is the binding one. `M29`'s own Testing line requires *"a seeded product
name"*. That requires a running Postgres **and** a successful `npm run seed` — and
`npm run seed` invokes `tsx`, which is **not declared in `devDependencies`**, and has
**never been executed successfully** (a `tsx`/Node ESM-interop issue). Until seeding is
proven, `M29` cannot be verified, only written.

### Risks

1. **Case-sensitivity regression (highest).** Postgres `LIKE` is case-sensitive; the
   current behavior is case-insensitive. Whether Payload's `like` operator maps to a
   case-insensitive comparison on the Postgres adapter **must be verified empirically
   against a live database**, not assumed. Getting this wrong silently breaks search
   for every lowercase query.
2. **Pagination interaction.** `getProducts()` still defaults to `limit: 0`. Moving the
   filter into the query without addressing the unbounded fetch only half-solves the
   milestone's stated goal.
3. **Other consumers of `getProducts()`.** `app/(public)/page.jsx` (`M23`) also calls
   it. Any signature change must stay backward-compatible — this is exactly the
   consumer-check discipline the `M28` cart bug taught.
4. **`lib/payload/products.ts` types are hand-written mirrors.** A change to
   `GetProductsOptions` must keep them consistent; `payload-types.ts` has never been
   generated.

### Parallelism

`M29` ∥ `M30` is **safe** — verified against all six tests in
`.claude/docs/PARALLELISM.md`:

- `M29` files: `app/(public)/shop/page.jsx`, `lib/payload/products.ts`
- `M30` files: `lib/features/cart/cartSlice.js`, `app/StoreProvider.js`
- Disjoint; `M30` has **no dependencies**; no schema change on either side.

Shared documentation (`CHANGELOG.md`, `TASKS.md`) must still be written serially by the
Engineering Manager.

### Verdict: **READY WITH PREREQUISITES**

`M29` is well-scoped, its dependency is satisfied, and it contradicts nothing. It cannot
be *verified* until seed data works:

1. `npm install` (`node_modules` is absent) — **human-approved action**
2. Declare `tsx` in `devDependencies` — **human-approved action**
3. `docker compose up -d postgres` and a successful `npm run seed`
4. Empirically confirm Payload `like` case-sensitivity on the Postgres adapter

## 8. Remaining blockers

| # | Blocker | Severity | Owner |
|---|---|---|---|
| 1 | `main` still holds the pristine upstream multi-vendor app; `origin/HEAD` unset | **Critical** | **Human** — destructive/production-impacting |
| 2 | `npm run lint` broken; repairing it needs a package install | **High** | Human approval, then DevOps |
| 3 | No CI | **High** | DevOps, once blocker 2 clears |
| 4 | No test framework (`M56a`, blocked behind `M33a`/`M56`) | **High** | Human decision on pulling it forward |
| 5 | `tsx` undeclared; `npm run seed` never executed | **High** — blocks `M29` verification | Human approval, then DevOps |
| 6 | `payload-types.ts` never generated; hand-written type mirrors can drift | Medium | Architect + Full-Stack |
| 7 | `MIGRATION_PLAN.md` header says *"63 milestones"*; there are **68** `### M…` entries (`M33a`, `M48a`, `M52a`, `M55a`, `M56a` were added later). Flagged, not edited — the roadmap is authoritative and should be corrected deliberately | Low | Engineering Manager |
| 8 | `docker build` never verified against a real registry | Medium | DevOps |
| 9 | Open findings `C5`, `C11`, `C12`, `D7`, `D8`, `R10`; `D8` (order notifications) has **no milestone at all** | Low–Medium | Product + Architect |

Blockers 1–4 are the ones that gate **parallel** execution. None of them gate a single
sequential milestone run under human supervision.

## 9. Readiness verdict

### The team is **READY TO EXECUTE `M29` SEQUENTIALLY**, under human supervision, once the four `M29` prerequisites in §7 are met.

- ✅ Eight roles defined with enforced separation
- ✅ Engineering Manager established as sole orchestrator
- ✅ Human approval gates defined and mechanically enforced where possible
- ✅ Existing milestone/ADR system preserved and authoritative
- ✅ No production AI dependency; `.claude/` now excluded from Docker images
- ✅ Conflict escalation defined against the existing `C`/`D`/`R` taxonomy
- ✅ Parallelism rules defined, defaulting to sequential

### **NOT READY FOR PARALLEL EXECUTION**

Blockers 1–4 must clear first. With no CI, no tests, and a broken lint gate, manual QA
is the only regression net — and `M28` already demonstrated what that misses: a cart
bug that shipped at `M25` and stayed invisible for three milestones. Parallel agents
without an automated net compound that failure mode instead of exposing it.
