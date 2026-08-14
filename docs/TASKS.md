# Tasks — GoCart Pakistan

Status roll-up for the migration. **This file tracks status; it does not define execution order.**

The authoritative implementation sequence is **`M1`–`M59` plus `M2a`** in
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
- [ ] Confirm the six remaining open questions in [PROJECT_SPEC.md](./PROJECT_SPEC.md) with the stakeholder — **not an `M1` blocker**; blocks `M6` and later (see the `M6` gate below)

---

## Implementation status by milestone

Nothing below has started. No application code has been changed.

| Milestones | Group | Status |
|---|---|:---|
| `M16`, `M17`, `M19` | Clear `app/admin/**` — **runs before `M3`** | Not Started |
| `M1`, `M2`, `M2a`, `M3`, `M4`, `M5` | Foundation: Docker Postgres, Payload, TypeScript, sharp, retire Prisma | Not Started |
| `M14`, `M15`, `M18` | Remove remaining multi-vendor routes (no dependencies) | Not Started |
| `M6`–`M13` | Payload collections: Users, Media, Categories, Products, Orders | Not Started |
| `M20`–`M21` | Confirm admin-only auth end to end | Not Started |
| `M22`–`M28` | Storefront on real Payload data; dummy data removed | Not Started |
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

### `M1` gate — **OPEN**

The six pre-`M1` corrections from the readiness audit are applied. Foundation work may begin.
Start with `M16`, `M17`, `M19` (clear `/admin`), then `M1` → `M2` → `M2a` → `M3`.

### `M6` gate — **BLOCKED**

Collection design must not start until these are decided and recorded as ADRs:

- [ ] Reviews: in or out for v1 (`M46`)
- [ ] Coupons: in or out for v1 (`M47`)
- [ ] Shipping/delivery model — the `Orders` collection must model it
- [ ] Order status set — is `CANCELLED`/`RETURNED` needed for COD refusal-at-door?
- [ ] Media storage backend: local volume vs. S3-compatible
- [ ] `Orders` shape for guests: embedded address vs. lightweight `Customers` collection

### Later, non-blocking

- [ ] PKR formatting convention (blocks `M55`)
- [ ] Order notifications: SMS/WhatsApp/email — **no milestone exists yet**
- [ ] Guest order-lookup key and abuse controls (reconciles `M13` access rules with `M36`)
- [ ] Cart state mechanism: Redux vs. simpler client-side store (`M30` assumes Redux + `localStorage`)
- [ ] Unscheduled gaps tracked in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md): category listing route, store Settings global, test framework + CI, Newsletter disposition, storefront copy pass, production `payload migrate` step
