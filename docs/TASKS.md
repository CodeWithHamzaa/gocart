# Tasks — GoCart Pakistan

Status roll-up for the migration. **This file tracks status; it does not define execution order.**

The authoritative implementation sequence is **`M1`–`M59` plus `M2a`, `M27a`, `M27b`** in
[MIGRATION_PLAN.md](./MIGRATION_PLAN.md), ordered by each milestone's stated dependencies.
Group names below are labels for reporting only — never schedule or reference work by group.

Status legend: `Not Started` · `In Progress` · `Blocked` · `Done`

---

## Planning & documentation — **Done** (2026-08-14)

- [x] Audit existing GoCart codebase (stack, data model, routes) → [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md)
- [x] Create `docs/`, `prompts/` structure and core docs
- [x] Feature-by-feature disposition → [FEATURE_MATRIX.md](./FEATURE_MATRIX.md)
- [x] Milestone-level migration plan → [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)
- [x] **Resolved**: multi-vendor vs. single-store → [ADR-006](./DECISIONS.md), Accepted 2026-08-07. **Closed — single store, no vendors, admin-managed commerce.**
- [x] **Resolved**: Prisma schema retirement → [ADR-003](./DECISIONS.md), Accepted 2026-08-14
- [x] **Resolved**: Payload deployment topology → [ADR-009](./DECISIONS.md), Accepted 2026-08-14 (embedded in the Next.js app)
- [x] Phase 1 readiness audit and correction pass → [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md)
- [x] Category-browsing audit and specification (2026-08-16) → [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md), [ADR-013](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy), new milestones `M27a`/`M27b`. **Closes readiness finding `C8`.**
- [ ] Confirm the six remaining open questions in [PROJECT_SPEC.md](./PROJECT_SPEC.md) with the stakeholder — **not an `M1` blocker**; blocks `M6` and later (see the `M6` gate below)

---

## Implementation status by milestone

Implementation has begun. `M1` added local development infrastructure (`docker-compose.yml`,
`.env.example`), `M2` added Payload dependencies, and `M2a` added the TypeScript toolchain
(`tsconfig.json`, `next-env.d.ts`; `jsconfig.json` retired). `M16`, `M17`, and `M19` then deleted the
legacy admin surface — `app/admin/**` and `components/admin/**` (plus `components/OrdersAreaChart.jsx`)
are gone, clearing `/admin` ahead of `M3`.

**Customer-facing behavior is unchanged.** The only application code touched so far is deletion, and
what was deleted was the hand-built admin — a surface with no real authentication (`isAdmin` was
hardcoded `true`) that rendered only `assets/assets.js` dummy data. Nothing imports Payload, no `.jsx`
file has been converted, and the storefront renders exactly as inherited.

**`/admin` currently returns 404.** This is the expected interim state between `M17` and `M3`,
documented in [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) — not a regression. `M3` closes it.

| Milestones | Group | Status |
|---|---|:---|
| `M16`, `M17`, `M19` | Clear `app/admin/**` — **runs before `M3`** | **Done** (2026-08-14) |
| `M1` | Foundation: Dockerized PostgreSQL for local development | **Done** (2026-08-14) |
| `M2` | Foundation: Payload v3, Postgres adapter, `sharp` dependencies | **Done** (2026-08-14) |
| `M2a` | Foundation: TypeScript toolchain | **Done** (2026-08-14) |
| `M3`, `M4`, `M5` | Foundation: scaffold Payload, retire Prisma, dev Dockerfile | Not Started |
| `M14`, `M15`, `M18` | Remove remaining multi-vendor routes (no dependencies) | Not Started |
| `M6`–`M13` | Payload collections: Users, Media, Categories, Products, Orders | Not Started |
| `M20`–`M21` | Confirm admin-only auth end to end | Not Started |
| `M22`–`M28` (incl. `M27a`, `M27b`) | Storefront on real Payload data; category browsing routes; dummy data removed | Not Started |
| `M29` | Real search | Not Started |
| `M30`–`M36` | Cart persistence, guest checkout, real COD order creation | Not Started |
| `M37`–`M39` | Admin order fulfillment | Not Started |
| `M40`–`M43` | SEO: server rendering, metadata, sitemap, structured data | Not Started |
| `M44`–`M45` | Mobile-first audit and performance | Not Started |
| `M46`–`M48` | Reviews/Coupons: decide and land minimal v1 scope | Not Started |
| `M49`–`M54` | Docker production hardening, health checks, backups | Not Started |
| `M55`–`M56` | PKR currency, Pakistani address/phone validation | Not Started |
| `M57`–`M59` | Regression pass, docs, launch | Not Started |

---

## Gates

### `M1` gate — **OPEN** (cleared; `M1`, `M2`, `M2a`, `M16`, `M17`, `M19` complete)

The six pre-`M1` corrections from the readiness audit are applied. Foundation work has begun:
`M1`, `M2`, and `M2a` are **Done**, and `M16`, `M17`, `M19` have cleared `app/admin/**`.
**The next milestone is `M3`** — its route-collision precondition (`app/admin/` must not exist)
is satisfied, and scheduling it promptly keeps the `/admin` 404 window short.

### `M6` gate — **BLOCKED**

Collection design must not start until these are decided and recorded as ADRs:

- [ ] Reviews: in or out for v1 (`M46`)
- [ ] Coupons: in or out for v1 (`M47`)
- [ ] Shipping/delivery model — the `Orders` collection must model it
- [ ] Order status set — is `CANCELLED`/`RETURNED` needed for COD refusal-at-door?
- [ ] Media storage backend: local volume vs. S3-compatible
- [ ] `Orders` shape for guests: embedded address vs. lightweight `Customers` collection
- [x] **Resolved**: `Categories` hierarchy and category-browsing scope → [ADR-013](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy), Accepted 2026-08-16. `M9`'s field list, the two-level `parent` self-relation, and `Products.category` cardinality (`M10`) are settled; spec in [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md)

### Later, non-blocking

- [ ] PKR formatting convention (blocks `M55`)
- [ ] Order notifications: SMS/WhatsApp/email — **no milestone exists yet**
- [ ] Guest order-lookup key and abuse controls (reconciles `M13` access rules with `M36`)
- [ ] Cart state mechanism: Redux vs. simpler client-side store (`M30` assumes Redux + `localStorage`)
- [ ] Unscheduled gaps tracked in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md): store Settings global, test framework + CI, Newsletter disposition, storefront copy pass, production `payload migrate` step
  - *(the category listing route is no longer among these — scheduled as `M27a`/`M27b`, closing finding `C8`)*
