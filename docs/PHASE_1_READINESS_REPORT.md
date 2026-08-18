# Phase 1 Readiness Report — GoCart Pakistan

**Branch**: `migration/payload-cod`

| Audit | Date | Verdict |
|---|---|---|
| Audit 1 — initial | 2026-08-14 | **NOT READY** — 3 critical blockers |
| **Audit 2 — post-correction** | **2026-08-14** | ✅ **READY FOR M1** |

> **Scope of this verdict**: READY **for `M1`** — and for the pre-`M1` admin clearance and the
> foundation milestones through `M5`. It is **not** a claim that the whole plan is ready.
> The `M6` gate (start of Payload collection design) remains **BLOCKED** on six decisions.

Both audits are documentation-only. **No application code has been changed, no packages installed,
no `package.json` edits, no Payload initialization, no database changes, and no migration milestone
has begun.**

---

# Audit 2 — post-correction verification

## Corrections Applied Before M1

All six required corrections are **applied and verified**.

### ✅ Correction 1 — Single-store decision de-staled

[ADR-006](./DECISIONS.md) has been Accepted since 2026-08-07, but three documents still framed
multi-vendor vs. single-store as an open question. All now state it as closed.

| Document | Change |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | "Major open architecture question" section **replaced** with "Settled structural decisions", stating single store / no vendors / no sellers / no seller dashboard / no vendor registration / admin-managed commerce, with the legacy surface named as removal work (`M14`–`M17`, `M19`) |
| [CLAUDE.md](../CLAUDE.md) | Stale "Reconciling this is an open decision" replaced; single-store added to **Hard constraints** as explicitly closed |
| [TASKS.md](./TASKS.md) | Unchecked "Resolve open question: multi-vendor vs. single-store" → checked and marked **Resolved** |
| [DECISIONS.md](./DECISIONS.md) | ADR-006 gains an explicit closing statement: documentation implying the question is open is stale and should be corrected against the ADR |
| [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md) | Forward-pointing phase references updated to milestone IDs |

The decision was **not weakened or reopened**. No new hedging language was introduced.

### ✅ Correction 2 — ADR-003 accepted

Evidence was sufficient; nothing was invented. [ADR-003](./DECISIONS.md) is now
**Accepted (2026-08-14)** with its supporting evidence recorded in the ADR itself:
`@prisma/client`/`prisma` absent from `package.json`, no Prisma client import anywhere in
`app/`/`components/`/`lib/`, `DATABASE_URL`/`DIRECT_URL` referenced only inside `schema.prisma`,
ADR-001 and ADR-002 already Accepted, and the schema encoding the multi-vendor domain that ADR-006
removed from scope. Because the layer was never live, retirement cannot regress runtime behavior.

Consequences were made consistent: `M4` executes the deletion, `M9`–`M12` should mine the schema for
domain concepts first, `.gitignore` cleanup is included, and `git revert` of `M4` is the recovery path.
[ARCHITECTURE.md](./ARCHITECTURE.md)'s "decision to confirm" language was corrected.

**`prisma/schema.prisma` was not modified.**

### ✅ Correction 3 — One authoritative numbering system

**`M1`–`M59` plus `M2a` is now the only implementation sequence.** Phase/group names are demoted to
reporting labels everywhere. *(The scheme is unchanged; the set has since grown — `M27a` and `M27b`
were added on 2026-08-16 as decimal insertions, again without renumbering. Current total: 62.)*

| Document | Change |
|---|---|
| [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) | New **"Milestone IDs are the only execution reference"** section with a critical-path diagram; all fourteen `## Phase N — …` headings renamed to `## Group: … — M-range`; summary table re-keyed to milestones with an explicit **Order** column |
| [TASKS.md](./TASKS.md) | **Rewritten** as a milestone-keyed status roll-up with explicit `M1` and `M6` gates; the conflicting Phase 0–8 scheme is gone |
| [DECISIONS.md](./DECISIONS.md) | Referencing convention added to the header; **ADR-007** "TASKS.md Phases 4–6" → `M22`–`M28`, `M40`–`M43`, `M44`–`M45`; **ADR-006** "Phase 2" → `M10`, `M11` |
| [CLAUDE.md](../CLAUDE.md) | New "Milestone numbering — the one authoritative sequence" section stating that execution order is **not** ascending ID |
| [README.md](./README.md) | Doc index completed and the referencing convention stated |
| [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md) | Five stale phase references → milestone IDs |

Stale references named in Audit 1, all fixed:

- **ADR-007** → now cites `M22`–`M28`, `M40`–`M43`, `M44`–`M45`
- **`M19`** → "per Phase 11" is now "at `M47`"
- **`M30`** → "any time after Phase 0" is now "no dependencies; may land at any point"
- **MIGRATION_PLAN:12 "see Phase 12"** → now states plainly that **no milestone establishes a test
  framework**, pointing here rather than at a phase that never contained one

Completed planning work is marked **Done (2026-08-14)** in [TASKS.md](./TASKS.md), not left as an
unresolved implementation phase. **`M1`–`M59` were not renumbered**; `M2a` uses a decimal ID.

### ✅ Correction 4 — `/admin` route order fixed

The circular dependency and route collision are resolved. **`M16`, `M17`, `M19` now precede `M3`.**

- **`M17`** — dependency on `M3` **removed** (was circular). Goal rewritten: it clears `/admin` *ahead of*
  Payload rather than following it. Added an explicit justification that nothing is lost by going first
  (the dashboard has no real auth — `isAdmin` is hardcoded `true` — and renders only dummy data), plus
  the interim-404 note and corrected testing/rollback steps.
- **`M16`, `M19`** — marked **must land before `M3`**; both delete routes under `app/admin/`.
- **`M3`** — dependencies now `M2a` + `M16`/`M17`/`M19`; gains a **route-collision precondition** block
  explaining that Next.js route groups contribute no path segment, so `app/(payload)/admin/[[...segments]]`
  and `app/admin/page.jsx` are parallel routes for `/admin`, and that the catch-all also collides with
  `admin/stores`, `admin/approve`, `admin/coupons`. Testing now begins with a `ls app/admin` precondition check.
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — new "`/admin` route ownership" subsection.
- **[ADR-009](./DECISIONS.md)** — records `/admin` ownership and the required ordering as a consequence.
- **[TASKS.md](./TASKS.md)** — `M16`/`M17`/`M19` listed **first** in the status table.

**At no point do two implementations own `/admin`.** The documented gap is the reverse: `/admin` returns
404 between `M17` and `M3`, which is safe because the route was never an authenticated surface.

### ✅ Correction 5 — Payload deployment topology decided

**[ADR-009](./DECISIONS.md#adr-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service):
Payload runs embedded inside the Next.js application. Status: Accepted (2026-08-14).**

Both options were evaluated across all thirteen requested dimensions (development complexity, deployment
complexity, operating cost, performance, shared types, database access, media handling, authentication,
scaling, monitoring, maintenance, future evolution, single-store suitability). **Embedded wins eleven of
thirteen**; the two it loses — independent scaling and future evolution — are not live constraints for a
single store with one admin user, and the second is bounded because all Payload access funnels through
the `lib/payload/*` utilities introduced at `M22`.

Decisive factors: [ADR-007](./DECISIONS.md) makes server-rendered product/category pages non-negotiable,
and a separate service taxes exactly those renders with a network hop while adding a failure mode
(CMS unreachable → storefront degraded) that the embedded topology cannot produce. This is the simplest
architecture that delivers production reliability without distributed-system complexity the project
does not need.

Recorded with Decision, Status, Context, Options considered, Decision rationale, and Consequences.
Propagated to [ARCHITECTURE.md](./ARCHITECTURE.md), [CLAUDE.md](../CLAUDE.md), [TASKS.md](./TASKS.md),
and `M3` in [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) — which previously cited a "mounting decision in
ARCHITECTURE.md" that did not exist. **Payload was not installed.**

### ✅ Correction 6 — TypeScript (`M2a`) and `sharp`

**`M2a` — Establish the TypeScript toolchain**, inserted between `M2` and `M3` without renumbering
anything. It explicitly covers every required element:

| Required | Covered by `M2a` |
|---|---|
| `typescript` | `devDependencies` |
| `tsconfig.json` | New; carries over the `@/*` alias from `jsconfig.json`, which is deleted as superseded |
| Required `@types` packages | `@types/node`, `@types/react`, `@types/react-dom` |
| Next.js compatibility | Next 15 first-class TS support; `next-env.d.ts` committed; version confirmed against both Next 15 and the Payload v3 release from `M2` |
| JS/TS coexistence | `"allowJs": true`, `"checkJs": false`; **no milestone converts existing `.jsx` to `.tsx`** — new files only |
| Type-check command | `"type-check": "tsc --noEmit"`, joining `npm run build` as a standard per-milestone check |
| Required configuration | `"strict": true` (cheapest to adopt at zero TS files), Next plugin, `.gitignore` entries |

`M3` now depends on `M2a`. **`sharp`** was added to **`M2`**, with the rationale recorded: it is a
native-binary dependency needed by both `M8` (Media image processing) and `M51` (re-enabling Next.js
image optimization), so installing it at the foundation avoids a mid-migration native rebuild inside the
Docker image. `M2` testing now includes a `sharp` resolution check.

**Neither TypeScript nor `sharp` was installed.** `package.json` was not modified.

### Additional reference-hygiene fixes (disclosed, not decisions)

Made under the cross-document consistency check. Each replaces a broken pointer with the correct
existing target; none changes a planning decision:

- **`M39`** — "Orders shape from M11/**M16**" → `M11`/`M12` (M16 deletes vendor admin routes and has no
  bearing on the Orders schema)
- **`M15`, `M18`** — the unfilled `"see M... Footer cleanup, Phase 5"` placeholder now names `M48`, the
  milestone that actually performs Footer cleanup, with a recommendation to remove the newly-dead links
  inline rather than leave them broken for ~30 milestones
- **[README.md](./README.md)** — doc index completed (it listed 5 of 9 files)
- **[CHANGELOG.md](./CHANGELOG.md)** — entry recording this documentation pass

### ✅ Post-audit correction — C8, category browsing scheduled (2026-08-16)

Not a pre-`M1` correction — recorded here because it closes a HIGH contradiction that the correction
pass above explicitly left open. Discharges the category-listing-route half of **required correction
#14**, using the decimal-ID approach that correction prescribed. (Audit 1's text below is preserved
verbatim as history and was not edited.)

A read-only re-audit confirmed C8's finding in full: no `/categories` or `/category/[slug]` route
exists; `CategoriesMarquee.jsx` still renders bare `<button>`s with no `onClick` and no `href`;
`prisma/schema.prisma` has **no `Category` model at all** (just a free-text `String` on `Product`);
and `M9` specified **no fields whatsoever** — no `slug`, no `parent`, nothing the four dependent
milestones assumed.

| Change | Where |
|---|---|
| **`M27a`** — `/category/[slug]` detail + paginated product listing; also converts the marquee to links and the product breadcrumb to a link | [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) |
| **`M27b`** — `/categories` landing index | [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) |
| **`M9` gains a real field list** — `slug` (unique, indexed, stable), `parent` (self-relation, two levels), `description`, `image`, SEO overrides, `displayOrder` — plus an `M8` dependency for the upload field | [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) |
| **`M10`** fixes `Products.category` at `hasMany: false` | [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) |
| **`M22`** owns the descendant rollup as a shared utility | [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) |
| **`M27`'s false acceptance test corrected** — *"clicking one filters/links correctly"* was asserting behavior the component does not have and this milestone does not add | [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) |
| **`M41`, `M42`, `M44`** gain `M27a`/`M27b` dependencies — `M42`'s sitemap could not previously have listed the category URLs its own goal describes | [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) |
| **ADR-013** records the four sub-decisions and the rejected alternatives | [DECISIONS.md](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy) |
| **Filters ≠ category browsing** boundary drawn, closing the second-order ambiguity where a Future-Phase Filters row could be read as deferring browsing itself | [FEATURE_MATRIX.md](./FEATURE_MATRIX.md), [PROJECT_SPEC.md](./PROJECT_SPEC.md), MIGRATION_PLAN scope note |
| **Behavior specification** — routes, URL structure, hierarchy, product relationship, SEO, empty/loading/error states, pagination, out-of-scope filtering | [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md) (new) |

**No application code was changed.** `M27a` and `M27b` are planned, not built. The milestone count
moves from 60 to **62** with no renumbering of `M1`–`M59`.

### ✅ Post-audit correction — `M14`→`M3` dependency and initial infrastructure baseline (2026-08-16)

Not a pre-`M1` correction — recorded here as newly approved/discovered decisions since Audit 2.
(Audit 1's text below is preserved verbatim as history and was not edited.)

1. **`M3` analysis surfaced a second precondition** beyond the `app/admin/**` route collision already
   tracked for `M16`/`M17`/`M19`: mounting Payload requires restructuring the app into Next.js's
   multiple-root-layouts pattern (one root layout per top-level route group). `app/store/**` —
   deleted by `M14` — sits outside any route group and collides with that restructuring if still
   present. **`M14` is now a hard prerequisite of `M3`**, not the order-independent milestone it was
   previously classified as. See [ADR-014](./DECISIONS.md#adr-014-m14-is-a-hard-prerequisite-of-m3-not-an-order-independent-milestone).
   [MIGRATION_PLAN.md](./MIGRATION_PLAN.md), [TASKS.md](./TASKS.md), and [CLAUDE.md](../CLAUDE.md)
   are updated accordingly. **`M14`, not `M3`, is the next milestone to execute** — `M1`, `M2`, `M2a`,
   `M16`, `M17`, and `M19` are already **Done**.
2. **Initial production infrastructure baseline approved** ([ADR-015](./DECISIONS.md#adr-015-initial-production-infrastructure-baseline)):
   Cloudflare Free + a single ~$10–12/month VPS running the Dockerized app and PostgreSQL + Resend's
   free email tier + COD-only checkout. SMS is deferred to a future phase (partially resolves `D8`
   below). Backups are managed manually at launch — `M54` remains the milestone that formalizes
   persistence/backup strategy. The baseline is chosen to stay replaceable/upgradable without an
   application rewrite (partially resolves `D12` below; full production migration/CI mechanics remain
   open).

**No application code was changed by either decision above.**

### ✅ Post-audit correction — `M6` gate cleared: Reviews, Coupons, shipping, order status, media, guest-order shape decided (2026-08-16)

Not a pre-`M1` correction — recorded here as newly approved/discovered decisions since Audit 2.
(Audit 1's text below is preserved verbatim as history and was not edited.)

All six decisions the `M6` gate was waiting on are now made and recorded as ADRs:

| Decision | Outcome | ADR |
|---|---|---|
| Reviews in/out for v1 (`D3`) | **Out.** `M46` executes removal (delete `RatingModal.jsx` + entry points) | [ADR-016](./DECISIONS.md#adr-016-reviews-are-out-of-scope-for-v1) |
| Coupons in/out for v1 (`D2`) | **Out.** `M47` executes removal (remove coupon input from `OrderSummary.jsx`) | [ADR-017](./DECISIONS.md#adr-017-coupons-are-out-of-scope-for-v1) |
| Shipping/delivery model (`D4`) | Flat rate + free-shipping threshold, admin-configurable via a new Settings global (`M13a`), snapshotted onto each order at creation | [ADR-018](./DECISIONS.md#adr-018-shipping-model--flat-rate-with-a-free-shipping-threshold-snapshotted-per-order) |
| Order status set (`D5`) | Adds `CONFIRMED`, `CANCELLED`, `RETURNED` to the enum | [ADR-019](./DECISIONS.md#adr-019-order-status-set-includes-confirmed-cancelled-and-returned) |
| Media storage backend (`D6`) | Local Docker volume for v1; Cloudflare R2 named as the designated successor | [ADR-020](./DECISIONS.md#adr-020-media-storage-backend-is-a-local-docker-volume-for-v1-with-cloudflare-r2-as-the-designated-successor) |
| `Orders` shape for guests (`D11`) | Embedded address fields, no `Customers` collection — formally records what `M11` already assumed | [ADR-021](./DECISIONS.md#adr-021-guest-orders-use-embedded-address-fields-not-a-customers-collection) |

This also closes contradictions `C3` and `C4` (Coupons' and Reviews' conflicting dispositions are now
a single decided disposition each) and closes risk `R6` (no store Settings global) via the new `M13a`
milestone. `C5` ("no blog" never stated) is **unaffected** — still open, unrelated to this decision set.
[MIGRATION_PLAN.md](./MIGRATION_PLAN.md), [TASKS.md](./TASKS.md), [PROJECT_SPEC.md](./PROJECT_SPEC.md),
[ARCHITECTURE.md](./ARCHITECTURE.md), and [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) are updated
accordingly. **`M6` gate is cleared** — `M6`–`M13` and `M13a` may now proceed.

**No application code was changed by this decision set.**

### ✅ Post-audit correction — `M6`–`M13`/`M13a` implemented (2026-08-17)

Not a pre-`M1` correction — recorded here as implementation work completed since the `M6` gate
cleared above. All five Payload collections (`Users`, `Media`, `Categories`, `Products`, `Orders`)
and the `Settings` global are implemented and registered in `payload.config.ts`, with `M13`'s access
control applied. Every milestone's stated testing criteria was verified against a live Postgres-backed
dev server via REST and GraphQL.

This closes `R4` and `R6` above (both flip from partial/scheduled to **Resolved**) and closes the
`Categories`/`Products`/`Orders` half of what `C8` and `D11` were blocking. Two things surfaced during
implementation that are **not** resolved by it:

- **`C7` was confirmed, not fixed, at the time `M13` was implemented** — `M13`'s Orders access
  (admin-only read) matched `MIGRATION_PLAN.md` exactly, reconfirming rather than resolving the
  conflict `C7` flagged. **Since resolved**: [ADR-024](./DECISIONS.md#adr-024-guest-order-lookup-via-a-dedicated-ordernumber-phone-endpoint--orders-collection-access-stays-admin-only)
  (2026-08-18) records the reconciling mechanism — a dedicated `(orderNumber, phone)` lookup, rate
  limited by IP, with `M13`'s collection access left unchanged. Implementation is still `M36`'s job;
  this closes the *design* gap, not the code.
- **`scripts/seed.ts` (part of `M13`) is implemented but unverified by direct execution.** Running it
  via `tsx` failed in the authoring sandbox with a Node 22.22/ESM-interop error inside
  `@payloadcms/db-postgres`'s own import chain — the same class of tooling issue as the
  `generate:importmap` problem noted during `M3`, unrelated to the seed script's logic. Its behavior
  was validated indirectly via equivalent REST calls (creating categories, products, and media through
  the API produced identical results to what the script does via the Local API). `npm run seed` should
  be confirmed directly in a normal environment before being relied on.

One factual correction from `M12`'s original text: "the field type would accept an added value later
without a data migration" overstated it. Payload materializes a `select` field as a native Postgres
`ENUM`, so adding a `paymentMethod` option later is an `ALTER TYPE ... ADD VALUE`, not literally zero
migration — though still no data transformation/backfill. Corrected in `MIGRATION_PLAN.md`'s `M12`
entry; `type: 'select'` remains the correct field choice.

**No application code was changed by this correction pass** — the code was already committed as part of
the `M6`–`M13a` implementation; this section documents it against the readiness audit.

## Remaining contradictions

Eleven of Audit 1's twelve are closed. **None of the remainder blocks `M1`.**

| # | Finding | Status | Blocks |
|---|---|:---:|---|
| C1 | Single-store framed as open in 3 docs | ✅ **Resolved** | — |
| C2 | ADR-003 `Proposed` while depended upon | ✅ **Resolved** | — |
| C3 | Coupons: four conflicting dispositions | ✅ **Resolved** (2026-08-16) — [ADR-017](./DECISIONS.md#adr-017-coupons-are-out-of-scope-for-v1) | — |
| C4 | Reviews: unresolved triple-marking | ✅ **Resolved** (2026-08-16) — [ADR-016](./DECISIONS.md#adr-016-reviews-are-out-of-scope-for-v1) | — |
| C5 | "No blog" never stated anywhere | ⚠️ **Open** | Nothing — but unstated scope in a CMS build |
| C6 | Two conflicting phase-numbering systems | ✅ **Resolved** | — |
| C7 | `M13` access rules forbid what `M36` requires | ✅ **Resolved** (2026-08-18) — [ADR-024](./DECISIONS.md#adr-024-guest-order-lookup-via-a-dedicated-ordernumber-phone-endpoint--orders-collection-access-stays-admin-only) | — |
| C8 | Category browsing assumed by 4 milestones, built by none | ✅ **Resolved** (2026-08-16) | — |
| C9 | `M39` cites wrong dependency | ✅ **Resolved** | — |
| C10 | `M15`/`M18` Footer reference | ◐ **Partial** — pointer fixed to `M48`; the dead-link window until `M48` remains a scheduling gap | Nothing |
| C11 | FEATURE_MATRIX Sanity row misuses "Replace" | ⚠️ **Open** (cosmetic) | Nothing |
| C12 | `M55` currency file list stale | ⚠️ **Open** (low) | `M55` |

**C5 remains a contradiction against the stated target** ("no blog"). `C3` and `C4` are resolved as of
2026-08-16 — see the post-audit correction above.

## Remaining blocking decisions

Seven of Audit 1's twelve are closed. **None blocks `M1`.**

| # | Decision | Status | Gate |
|---|---|:---:|---|
| D1 | Payload deployment topology | ✅ **Resolved** — [ADR-009](./DECISIONS.md) | — |
| D2 | Coupons in/out for v1 | ✅ **Resolved** (2026-08-16) — [ADR-017](./DECISIONS.md#adr-017-coupons-are-out-of-scope-for-v1) | — |
| D3 | Reviews in/out for v1 | ✅ **Resolved** (2026-08-16) — [ADR-016](./DECISIONS.md#adr-016-reviews-are-out-of-scope-for-v1) | — |
| D4 | Shipping/delivery model | ✅ **Resolved** (2026-08-16) — [ADR-018](./DECISIONS.md#adr-018-shipping-model--flat-rate-with-a-free-shipping-threshold-snapshotted-per-order) | — |
| D5 | Order status set (`CANCELLED`/`RETURNED` for COD) | ✅ **Resolved** (2026-08-16) — [ADR-019](./DECISIONS.md#adr-019-order-status-set-includes-confirmed-cancelled-and-returned) | — |
| D6 | Media storage backend (local volume vs. S3) | ✅ **Resolved** (2026-08-16) — [ADR-020](./DECISIONS.md#adr-020-media-storage-backend-is-a-local-docker-volume-for-v1-with-cloudflare-r2-as-the-designated-successor) | — |
| D7 | PKR formatting convention | ⚠️ Open | `M55` |
| D8 | Order notifications (SMS/WhatsApp/email) | ◐ **Partial** (2026-08-16) — SMS deferred to a future phase, email infra (Resend) decided; [ADR-015](./DECISIONS.md#adr-015-initial-production-infrastructure-baseline). WhatsApp and which emails are sent remain open, still **no milestone exists** | Unscheduled |
| D9 | Guest order-lookup key + abuse controls | ✅ **Resolved** (2026-08-18) — [ADR-024](./DECISIONS.md#adr-024-guest-order-lookup-via-a-dedicated-ordernumber-phone-endpoint--orders-collection-access-stays-admin-only): `(orderNumber, phone)`, IP rate-limited | — |
| D10 | Cart state: Redux vs. simpler store | ✅ **Resolved** (2026-08-18) — [ADR-023](./DECISIONS.md#adr-023-cart-state-stays-redux-with-localstorage-persistence-added) | — |
| D11 | `Orders` shape: embedded vs. `Customers` collection | ✅ **Resolved** (2026-08-16) — [ADR-021](./DECISIONS.md#adr-021-guest-orders-use-embedded-address-fields-not-a-customers-collection) | — |
| D12 | Deployment target + production migration strategy | ◐ **Partial** (2026-08-16) — hosting baseline decided: Cloudflare Free + ~$10–12/mo VPS + PostgreSQL + Resend Free + COD; [ADR-015](./DECISIONS.md#adr-015-initial-production-infrastructure-baseline). Production migration/CI mechanics still open | `M49`–`M59` |

D10 and D11 were once decided-in-prose but unrecorded as ADRs — both are now recorded
([ADR-021](./DECISIONS.md#adr-021-guest-orders-use-embedded-address-fields-not-a-customers-collection)
for D11, [ADR-023](./DECISIONS.md#adr-023-cart-state-stays-redux-with-localstorage-persistence-added)
for D10), closing that violation of [CLAUDE.md](../CLAUDE.md)'s working agreement.

## Remaining risks

Six of Audit 1's thirteen are closed — including all three critical ones.

| # | Risk | Status |
|---|---|:---:|
| R1 | `/admin` route collision, circular `M3`↔`M17` | ✅ **Resolved** — Correction 4 |
| R2 | No TypeScript toolchain for 12+ `.ts` milestones | ✅ **Resolved** — `M2a` |
| R3 | `sharp` never installed | ✅ **Resolved** — folded into `M2` |
| R4 | `Orders` schema omits order reference, total, shipping, price snapshot | ✅ **Resolved** (2026-08-17) — `M11` implemented `orderNumber` (auto-generated), `orderTotal`, `shippingCost`, and a per-line-item `unitPrice` snapshot on `collections/Orders.ts`; verified via REST |
| R5 | Out-of-stock enforcement called launch-critical, never implemented | ⚠️ Open |
| R6 | No store Settings global despite being launch scope | ✅ **Resolved** (2026-08-17) — implemented as `M13a`, `globals/Settings.ts`; public read, admin-only write, verified via REST |
| R7 | No test or CI milestone in the plan | ⚠️ Open — broken pointer fixed, **gap still unscheduled** |
| R8 | Decision milestones (`M46`/`M47`) sit downstream of the code they invalidate | ✅ **Resolved** (2026-08-16) — both decisions made ahead of collection design via [ADR-016](./DECISIONS.md#adr-016-reviews-are-out-of-scope-for-v1)/[ADR-017](./DECISIONS.md#adr-017-coupons-are-out-of-scope-for-v1); `M46`/`M47` now execute a decided removal rather than deciding |
| R9 | No production `payload migrate` step | ⚠️ Open |
| R10 | Env var drift (`DATABASE_URL` vs `DATABASE_URI`; missing public base URL) | ◐ **Half closed** — the database name is settled as `DATABASE_URI` by [ADR-010](./DECISIONS.md) at `M1`; the missing public base URL is still open against `M42`/`M52` |
| R11 | `Newsletter.jsx` neither wired nor dropped | ⚠️ Open |
| R12 | No owner for storefront copy ("Free shipping worldwide") | ⚠️ Open |
| R13 | `next dev --turbopack` unverified against Payload v3 | ✅ **Resolved** — `M3` mounted Payload and confirmed both `npm run build` and `npm run start` serve `/admin` correctly with no server errors |

**R10 deserves attention during `M1` itself**, since `M1` is the milestone that adds the variable.
It is not a blocker — a wrong name fails loudly at `M3` — but it is free to get right now.

## M1 gate status

## ✅ **READY FOR M1**

All six required pre-`M1` corrections are applied and verified. The opening critical path is
unblocked and internally consistent:

```
M16, M17, M19  →  M1  →  M2  →  M2a  →  M3  →  M4, M5
(clear /admin)    (db)  (deps)  (TS)   (mount)
```

Every remaining open item was checked against this path and none touches it:

- `M16`/`M17`/`M19` delete legacy routes with no dependencies
- `M1` stands up Dockerized Postgres — depends on no open decision
- `M2` installs dependencies; `M2a` establishes TypeScript
- `M3` mounts Payload per the now-accepted [ADR-009](./DECISIONS.md), with `/admin` already cleared
- `M4` retires Prisma under the now-accepted [ADR-003](./DECISIONS.md)
- `M5` adds the dev Dockerfile

**The `M6` gate is BLOCKED** and must stay closed until D2–D6 are decided and recorded as ADRs.
Starting collection design before then risks exactly the rework Audit 1 flagged as R8.

**Recommended next actions**: (1) begin `M16`/`M17`/`M19`, then `M1`; (2) in parallel, book the
stakeholder session covering D2–D7 so the `M6` gate opens before foundation work completes.

---

# Audit 1 — initial audit (2026-08-14)

*Preserved verbatim as the evidence base. Findings resolved by the correction pass are marked in the
Audit 2 tables above; the text below describes the state of the documentation **before** those
corrections and should be read as history, not as current fact.*

## 1. PASS items

Thirteen of the sixteen required target properties are defined consistently across the documentation
set, each traceable to at least two independent documents.

| # | Target property | Status | Evidence |
|---|---|:---:|---|
| 1 | Single-store ecommerce platform | **PASS** ⚠️ | [ADR-006](./DECISIONS.md) (Accepted 2026-08-07); PROJECT_SPEC.md:7,55; FEATURE_MATRIX Vendor/Seller rows = Remove; MIGRATION_PLAN M14–M16. *Caveat: still framed as unresolved in three places — see [C1](#c1--single-store-is-settled-in-two-documents-and-still-open-in-three).* |
| 2 | Pakistani market | **PASS** | PROJECT_SPEC.md:47,51 (mobile/network/localization NFRs); MIGRATION_PLAN Phase 13 (M55–M56); CLAUDE.md:46 |
| 3 | Cash on Delivery only, Phase 1 | **PASS** | [ADR-004](./DECISIONS.md); PROJECT_SPEC.md:15,26; ARCHITECTURE.md:61-63; FEATURE_MATRIX Stripe row; MIGRATION_PLAN M12, M32 |
| 4 | Guest checkout only | **PASS** | [ADR-005](./DECISIONS.md); PROJECT_SPEC.md:16,32,40; MIGRATION_PLAN M31, M33, M36 |
| 5 | No customer authentication | **PASS** | [ADR-005](./DECISIONS.md), [ADR-006](./DECISIONS.md); PROJECT_SPEC.md:32; MIGRATION_PLAN M21 (removes the dead Login button) |
| 6 | Admin authentication only | **PASS** | [ADR-006](./DECISIONS.md); ARCHITECTURE.md:54; TASKS.md Phase 3; MIGRATION_PLAN M6, M7, M20 |
| 7 | Payload CMS | **PASS** ⚠️ | [ADR-001](./DECISIONS.md); ARCHITECTURE.md:50-54; MIGRATION_PLAN M2, M3. *Caveat: deployment topology undecided — see [D1](#d1--payload-deployment-topology-blocking).* |
| 8 | PostgreSQL | **PASS** | [ADR-002](./DECISIONS.md); ARCHITECTURE.md:56-59; CLAUDE.md:18; MIGRATION_PLAN M1 |
| 9 | Product media/images retained | **PASS** ⚠️ | FEATURE_MATRIX Media row (Keep ✓ + Replace ✓); ARCHITECTURE.md:53; MIGRATION_PLAN M8. The deletion of placeholder imagery in M28 is a separate concern from the retained capability — consistent, not contradictory. *Caveat: storage backend undecided — see [D6](#d6--media-storage-backend-blocking-before-m6).* |
| 10 | No vendors | **PASS** | [ADR-006](./DECISIONS.md); REPOSITORY_ANALYSIS DELETE classifications; MIGRATION_PLAN M14–M16 |
| 11 | No seller dashboard | **PASS** | [ADR-006](./DECISIONS.md); FEATURE_MATRIX Seller row = Remove; REPOSITORY_ANALYSIS.md:224; MIGRATION_PLAN M14 |
| 12 | No vendor registration | **PASS** | [ADR-006](./DECISIONS.md); FEATURE_MATRIX Vendor row = Remove; REPOSITORY_ANALYSIS.md:213; MIGRATION_PLAN M15 |
| 13 | No Stripe | **PASS** | [ADR-004](./DECISIONS.md); REPOSITORY_ANALYSIS.md:114-120 (confirmed absent from the codebase); MIGRATION_PLAN M32. Retaining an extensible `paymentMethod` field is deliberate design headroom, not a scope violation |
| 14 | No Sanity | **PASS** | REPOSITORY_ANALYSIS.md:122-124 (confirmed absent repo-wide). Minor legend nit at [C11](#c11--feature_matrix-sanity-row-misuses-the-replace-marker) |
| 15 | No brands | **PASS** | FEATURE_MATRIX Brands row = Future Phase only; excluded from MIGRATION_PLAN by the scope note at :18. Correctly out of Phase 1 |
| 16 | No customer accounts | **PASS** | [ADR-005](./DECISIONS.md), [ADR-006](./DECISIONS.md); PROJECT_SPEC.md:17,28,32 |

### Not PASS

| Target property | Status | Why |
|---|:---:|---|
| **No coupons** | **FAIL** | Never decided; four documents give four different dispositions — see [C3](#c3--coupons-carry-four-conflicting-dispositions-and-no-decision) |
| **No reviews** | **FAIL** | Never decided; same triple-marking and deferral pattern — see [C4](#c4--reviews-carry-the-same-unresolved-triple-marking) |
| **No blog** | **FAIL** | Never stated anywhere in the documentation set — see [C5](#c5--no-blog-is-never-stated-anywhere) |

---

## 2. Contradictions

Twelve found. Severity reflects the likelihood of causing incorrect work, not the effort to fix.

### C1 — Single-store is settled in two documents and still open in three

**Severity: HIGH**

[ADR-006](./DECISIONS.md) is **Accepted (stakeholder decision, 2026-08-07)** and PROJECT_SPEC.md:55 lists it
under "Resolved decisions". But three documents still present it as an unresolved question:

- **ARCHITECTURE.md:79-81** — an entire section headed *"Major open architecture question"* stating the
  multi-vendor question *"should be explicitly decided (see `DECISIONS.md`) before any Payload collection
  design starts"*
- **CLAUDE.md:44** — *"Reconciling this is an open decision"*
- **TASKS.md:13** — unchecked: `[ ] Resolve open question: multi-vendor vs. single-store`

An agent that reads ARCHITECTURE.md before DECISIONS.md will conclude the project's single largest
structural decision is still open and stall — or worse, re-litigate it.

### C2 — ADR-003 is `Proposed` but four documents treat it as Accepted, and M4 executes it

**Severity: HIGH**

DECISIONS.md:33 records ADR-003 (retire the Prisma schema) as
**"Status: Proposed — confirm before Phase 1 build work starts"**. Yet:

- **DECISIONS.md:15** — ADR-001's own Consequences assert it as settled fact: *"`prisma/schema.prisma` is
  retired as a live schema (kept only as design reference, per ADR-003)"*
- **FEATURE_MATRIX.md:9** and **REPOSITORY_ANALYSIS.md:197** both cite ADR-003 as authority
- **MIGRATION_PLAN M4** deletes `prisma/schema.prisma` outright, citing ADR-003

ADR-003's own text names the precondition that has not been met. M4 would delete a file on the authority
of an unconfirmed decision.

### C3 — Coupons carry four conflicting dispositions and no decision

**Severity: HIGH** · Directly contradicts the stated target "no coupons"

| Source | Says |
|---|---|
| PROJECT_SPEC.md:33 | Admin manages "products, categories, orders, and coupons **(if retained)**" |
| PROJECT_SPEC.md:66 | Open question #6 — coupon targeting "needs rethinking under guest checkout" |
| ARCHITECTURE.md:53 | `Coupons` collection **"(optional for v1)"** |
| TASKS.md:34 | Listed under **Phase 2 — Data modeling**: "`Coupons` (if retained…)" |
| FEATURE_MATRIX.md:22 | Marked **Keep ✓ + Replace ✓ + Future Phase ✓** simultaneously |
| MIGRATION_PLAN M19 / M47 | Stub page removed at M19; the actual decision deferred to **M47, Phase 11** |

So coupons are concurrently a Phase 2 data-modeling task, an optional v1 collection, a launch-scope
"Keep", and a Phase 11 open decision. The documentation never chooses. If the intended target is
genuinely *no coupons*, nothing records that.

### C4 — Reviews carry the same unresolved triple-marking

**Severity: HIGH** · Directly contradicts the stated target "no reviews"

- **FEATURE_MATRIX.md:21** — **Keep ✓ + Replace ✓ + Future Phase ✓**, resolved as "treat the real
  implementation as a later phase"
- **PROJECT_SPEC.md:64** — open question #4, unanswered
- **MIGRATION_PLAN M46** — decision deferred to Phase 11
- **REPOSITORY_ANALYSIS.md:244** — "reviews tab logic can stay pending the ratings-under-guest-checkout
  decision", while **:260** deletes `ratingSlice.js` and **:247** keeps `RatingModal.jsx` as MODIFY
  ("needs a real backend call")

Internally inconsistent even within the analysis document, and undecided across the set.

### C5 — "No blog" is never stated anywhere

**Severity: MEDIUM**

*Verified*: the string "blog" appears **zero times** across all files in `docs/`. FEATURE_MATRIX
enumerates eighteen features with explicit dispositions and omits it entirely; PROJECT_SPEC's
"Out of scope for launch" list does not mention it.

This is an absent exclusion rather than a conflict, but it matters specifically because the target
backend is a CMS. Content collections are the path of least resistance in Payload, and nothing in the
documentation currently says not to add one.

### C6 — Two incompatible phase-numbering systems are in active cross-reference

**Severity: HIGH** — the most likely single cause of executing the wrong work

| Phase | TASKS.md means | MIGRATION_PLAN.md means |
|:---:|---|---|
| 1 | Payload + Postgres foundation | Foundation & tooling (M1–M5) |
| 3 | Admin-only authentication | Remove the multi-vendor surface (M14–M19) |
| 5 | SEO | Storefront wired to real data (M22–M28) |
| 7 | Docker & production readiness | Cart persistence & guest checkout (M30–M36) |
| 12 | *(does not exist — TASKS ends at 8)* | Dockerization & production readiness (M49–M54) |

Four cross-references are already ambiguous or wrong as a result:

- **DECISIONS.md:91** (ADR-007) — "docs/TASKS.md Phases 4–6" (TASKS numbering)
- **MIGRATION_PLAN M19:179** — "redesigned later per Phase 11" (MIGRATION_PLAN numbering)
- **MIGRATION_PLAN M30:285** — "can land any time after Phase 0" (TASKS numbering — MIGRATION_PLAN has no Phase 0)
- **MIGRATION_PLAN:12** — "No test framework exists yet — **see Phase 12**"; Phase 12 is Dockerization and
  contains no test milestone (see [R7](#r7--no-test-or-ci-milestone-exists-in-59))

**Related**: the work described in this review as "Phase 1 planning" is **TASKS.md Phase 0**, which is
still marked `Status: In Progress` (TASKS.md:9) with two unchecked items — one of which is C1's stale
multi-vendor question.

### C7 — M13's access-control rules forbid exactly what M36 requires

**Severity: HIGH** — security-relevant. **✅ Resolved (2026-08-18)** — see
[ADR-024](./DECISIONS.md#adr-024-guest-order-lookup-via-a-dedicated-ordernumber-phone-endpoint--orders-collection-access-stays-admin-only).

- **M13:128** sets Orders access to public-create/admin-read and asserts as an acceptance test:
  *"anonymous `GET /api/orders` fails"*
- **M36:330-336** requires guest order lookup by order reference, with no account, from the public storefront

Both are correct in isolation and mutually exclusive as written. No milestone defined the reconciling
mechanism (a scoped lookup endpoint, field-level access, or a signed token) — until ADR-024: a
dedicated `(orderNumber, phone)` server action, `overrideAccess: true` used only server-side inside
that one scoped query, IP rate-limited, with `M13`'s collection-level access rule left untouched.
`M13`'s original acceptance test (anonymous `GET /api/orders` fails) remains true and becomes part of
`M36`'s testing criteria too, to prove the fix didn't relax collection access as a side effect.

### C8 — Category browsing is assumed by four milestones and built by none

**Severity: HIGH**

- **M27:254** acceptance test: *"clicking one filters/links correctly"*. *Verified*:
  `components/CategoriesMarquee.jsx:10` renders a bare `<button>` with no `onClick` and no link — the
  behavior the test asserts does not exist today
- **FEATURE_MATRIX.md:12** classes Filters as **Future Phase only**, and MIGRATION_PLAN's scope note (:18)
  explicitly excludes them — so category filtering is out of Phase 1
- Yet **FEATURE_MATRIX.md:10** justifies the Categories collection by *"category pages"*, **M41:380** adds
  metadata to *"product, category/shop, and home pages"*, and **M42** generates a sitemap listing
  *"real seeded products/categories"* — which requires category URLs

*Verified*: no category route exists in `app/(public)/`, and no milestone in M1–M59 creates one.
Categories are modeled, seeded, marqueed, and sitemapped — but never browsable.

### C9 — M39 cites the wrong dependency milestone

**Severity: LOW**

M39:359 — *"align it to the real `Orders` collection shape from M11/**M16**"*. M16 deletes vendor
admin-management routes and has no bearing on the Orders schema. The intended reference is M11/M12.

### C10 — M15 and M18 reference a Phase 5 Footer milestone that does not exist

**Severity: MEDIUM**

M15:150 reads literally: *"confirm `Footer.jsx`'s 'Create Your Store' link is addressed (see **M...**
Footer cleanup, Phase 5)"* — an unfilled placeholder. M18:174 makes the same reference for
"Become Plus Member". Phase 5 is M22–M28, entirely storefront data wiring; Footer cleanup appears only
at **M48**, in Phase 11.

Consequence: M15 and M18 delete the destinations of two live Footer links, which then remain dead for
roughly thirty milestones. REPOSITORY_ANALYSIS.md:234 already classifies `Footer.jsx` as MODIFY for
exactly this reason.

### C11 — FEATURE_MATRIX Sanity row misuses the Replace marker

**Severity: LOW**

FEATURE_MATRIX.md:19 marks Sanity **Replace ✓** while its own reason cell states *"Nothing to remove since
it was never integrated"*. Per the legend at :5, Replace means "the capability stays, but today's
implementation is superseded" — there is no implementation here. Cosmetic, but it makes the matrix's
markers less trustworthy as a mechanical checklist.

### C12 — M55's currency file list is stale

**Severity: LOW**

M55:509-510 inherits the "duplicated across 9 files" figure from REPOSITORY_ANALYSIS.md:138. Three of
those nine (`app/store/page.jsx`, `app/store/manage-product/page.jsx`, `app/admin/page.jsx`) are deleted
earlier by M14 and M17. The hedge "plus any admin-adjacent pages retained" keeps it from being wrong,
but the count misleads.

---

## 3. Missing decisions

### Blocking before M1

#### D1 — Payload deployment topology *(blocking)*

Embedded in the Next.js app vs. a separate service. ARCHITECTURE.md:85 lists it under **"Not yet decided"**;
TASKS.md:20 is unchecked. **But M3:41 states it will mount Payload inside Next.js *"per the mounting
decision in [ARCHITECTURE.md](./ARCHITECTURE.md)"* — a decision that document explicitly does not make.**
ARCHITECTURE.md:47 states a *preference*, not a decision.

Blocks: M3, M5, M49, M50. No ADR exists.

#### D2 — Coupons in or out for v1 *(blocking)*

See [C3](#c3--coupons-carry-four-conflicting-dispositions-and-no-decision). Deferring past Phase 2 forces
rework of the Orders schema and `OrderSummary.jsx` — see [R8](#r8--decision-milestones-sit-downstream-of-the-code-they-invalidate).

#### D3 — Reviews in or out for v1 *(blocking)*

See [C4](#c4--reviews-carry-the-same-unresolved-triple-marking). Affects the Products/Reviews collection
design and the product detail page.

### Blocking before M6 (data modeling)

#### D4 — Shipping and delivery model

PROJECT_SPEC.md:62, open question #2 — flat, free, weight-based, or city-based? Unanswered.
Blocks M34, and more consequentially the **Orders schema itself**: M11/M12 define no shipping or total
fields (see [R4](#r4--the-orders-schema-omits-launch-critical-fields)).

#### D5 — Order status set

PROJECT_SPEC.md:63, open question #3 — is `CANCELLED`/`RETURNED` needed? For COD in Pakistan,
refusal-at-door is an ordinary outcome, not an edge case; the spec itself flags this. Blocks M12, M38.

#### D6 — Media storage backend *(blocking before M6)*

Local Docker volume vs. S3-compatible object storage. ARCHITECTURE.md:87 lists it under "Not yet decided";
M8 does not specify; M54 depends on the answer for its persistence and backup strategy. Changing this
after M8 means migrating already-uploaded media. No ADR exists.

### Needed before their own milestone

#### D7 — PKR formatting convention

PROJECT_SPEC.md:61, open question #1 — `Rs. 1,500` vs `₨1,500`. Blocks M55.

#### D8 — Order notifications

PROJECT_SPEC.md:65, open question #5 — SMS/WhatsApp/email confirmation. **No milestone in M1–M59 covers
this at all.** For a COD business in Pakistan this is operationally load-bearing, not a nicety: order
confirmation contact is standard practice for suppressing fake and duplicate orders before dispatch.
Currently neither decided nor planned.

#### D9 — Guest order-lookup key and abuse controls

**✅ Resolved (2026-08-18)** — see [C7](#c7--m13s-access-control-rules-forbid-exactly-what-m36-requires)
and [ADR-024](./DECISIONS.md#adr-024-guest-order-lookup-via-a-dedicated-ordernumber-phone-endpoint--orders-collection-access-stays-admin-only).
The identifying key is `(orderNumber, phone)`; enumeration is blunted by IP rate limiting on the
lookup endpoint.

#### D10 — Cart state mechanism

**✅ Resolved (2026-08-18)** — see [ADR-023](./DECISIONS.md#adr-023-cart-state-stays-redux-with-localstorage-persistence-added).
ARCHITECTURE.md:86 listed "Redux Toolkit vs. a simpler client-side cart" as undecided; `M30`'s silent
assumption (Redux + `localStorage`) is now the recorded decision, not an unrecorded one.

#### D11 — Orders shape for guest customers

ARCHITECTURE.md:88 lists "embedded address vs. relation to a lightweight `Customers` collection" as
undecided. **M11 silently assumes embedded fields.**

#### D12 — Deployment target and production migration strategy

No hosting target is named, and no milestone covers running Payload's database migrations in production
(see [R9](#r9--no-production-database-migration-step)).

> **Process note**: D10 and D11 are, in practice, *decided inside MIGRATION_PLAN* — but never recorded in
> DECISIONS.md. That is precisely the failure mode CLAUDE.md:25 exists to prevent
> (*"don't let decisions live only in chat history"*). A decision buried in a milestone's prose is only
> marginally more discoverable than one in chat.

---

## 4. Migration risks

### R1 — `/admin` route collision will break the build between M3 and M17

**Severity: CRITICAL** · *Verified against the repository*

- **M3** creates `app/(payload)/admin/[[...segments]]/page.tsx`
- `app/admin/page.jsx` and `app/admin/layout.jsx` **exist today** (verified)
- Next.js route groups contribute no path segment, so both resolve to `/admin` — a parallel-pages
  conflict that fails the build

M3's own acceptance test (*"`/admin` serves Payload's admin shell locally"*) cannot pass while the old
admin exists. **And the ordering is circular**: M17, which deletes the hand-built admin, declares
`Dependencies: M3`. Each waits on the other.

Fix: land M17 (with M16, M19, which also live under `app/admin/`) *before* M3, or mount Payload at a
temporary path in M3 and relocate it in M17.

### R2 — The repository has no TypeScript, but 12+ milestones create `.ts` files

**Severity: CRITICAL** · *Verified against the repository*

Verified: `jsconfig.json` only, **no `tsconfig.json`**; `package.json` contains no `typescript` and no
`@types/*`; every application file is `.js`/`.jsx`. M2 installs only Payload and the Postgres adapter.

Yet M3 creates `payload.config.ts`, M6–M13 create `collections/*.ts` and `scripts/seed.ts`, M22 creates
`lib/payload/*.ts`, M42/M53 create `app/sitemap.ts`, `app/robots.ts`, `app/api/health/route.ts`. Payload v3
additionally generates a `payload-types.ts` and expects a TS toolchain.

No milestone adds TypeScript. M3 fails immediately.

### R3 — `sharp` is never installed

**Severity: HIGH**

REPOSITORY_ANALYSIS.md:162 explicitly flags `sharp` as *"commonly required by both Payload and Next.js
image optimization once `images.unoptimized` is removed"* — and then no milestone adds it. M2's file list
covers only Payload plus the adapter. Both **M8** (Media uploads with image processing) and **M51**
(removing `images.unoptimized`) depend on it.

### R4 — The Orders schema omits launch-critical fields

**Severity: HIGH**

M11 defines guest customer/address fields and a line-items array; M12 adds `paymentMethod` and `status`.
Neither defines:

| Missing field | Required by |
|---|---|
| Order reference / order number | M35 (confirmation shows "order number"), M36 (lookup by reference) |
| Order total | M33, M34, M39 |
| Shipping cost | M34 — and blocked on [D4](#d4--shipping-and-delivery-model) |
| Per-line price snapshot | Any order whose product price later changes |

M35 and M36 are written against fields no milestone creates. The price-snapshot omission is the quiet one:
without it, historical orders silently re-price when a product's price is edited.

### R5 — Out-of-stock enforcement is called launch-critical and then never implemented

**Severity: HIGH**

FEATURE_MATRIX.md:24 states basic in-stock/out-of-stock is *"launch-critical for COD (must not accept
orders for unavailable items)"*. But M10 (Products collection) does not name a stock field, and M33
(order creation) includes no stock validation in its goal or its acceptance test. Nothing in the plan
enforces the matrix's own launch-critical requirement.

### R6 — No store Settings global, despite being in launch scope

**Severity: MEDIUM**

FEATURE_MATRIX.md:27 places minimal Settings — store name, contact info, currency — **in launch scope**,
*"likely via a Payload Global"*, deferring only broader configuration. MIGRATION_PLAN's scope note (:18)
correspondingly excludes only *advanced* Settings. But **no milestone creates the Global.**

M55 (currency) and M48/Footer (real business contact details, per REPOSITORY_ANALYSIS.md:234) both
implicitly need somewhere for this to live.

### R7 — No test or CI milestone exists in 59

**Severity: HIGH**

MIGRATION_PLAN:12 defers the question — *"No test framework exists yet — see Phase 12"* — and Phase 12
(M49–M54) is Dockerization, containing no such milestone. Searching all 59: no test framework, no CI
pipeline. REPOSITORY_ANALYSIS.md:177 flags *"No tests, no CI"* as existing debt.

Consequence: **M57**, the end-to-end regression pass over a 59-milestone rewrite of every data path in
the application, is entirely manual with no automated safety net beneath it.

### R8 — Decision milestones sit downstream of the code they invalidate

**Severity: HIGH**

M46 (Reviews scope) and M47 (Coupons scope) are in **Phase 11** — after M25 builds the product page, and
after M33/M34 build checkout and order totals. A "keep" outcome on either forces rework of
`OrderSummary.jsx`, the Orders schema, and the product detail page. TASKS.md:34 meanwhile places `Coupons`
in **Phase 2**, contradicting the plan's own sequencing ([C3](#c3--coupons-carry-four-conflicting-dispositions-and-no-decision)).

Decisions belong before the code they constrain, not after.

### R9 — No production database migration step

**Severity: MEDIUM**

Payload's Postgres adapter requires an explicit migration step for production deployments (development
mode's schema push is not appropriate there). M50 (compose), M52 (secrets), M53 (health checks), and M59
(deploy runbook) never mention it. The first production deploy will improvise its schema strategy.

### R10 — Environment variable drift

**Severity: LOW** (cheap to fix, expensive to debug)

- **M1** adds `DATABASE_URL` — the Prisma-era name carried over from `schema.prisma`. Payload's Postgres
  adapter conventionally reads `DATABASE_URI`. Worth confirming at M2 rather than at M3's first failure
- **M42** generates `sitemap.xml`/`robots.txt`, both of which need an absolute public base URL
  (e.g. `NEXT_PUBLIC_SERVER_URL`). No milestone adds it to `.env.example`, including M52, which is meant
  to finalize that file

### R11 — `Newsletter.jsx` is left in limbo

**Severity: MEDIUM**

REPOSITORY_ANALYSIS.md:238 classifies it MODIFY — *"Form has no submit handler at all today — either wire
to a real subscribe mechanism or drop"*. No milestone does either. It ships as a form that silently
discards input: precisely the defect class (`toast.promise` over an empty handler) that this entire
migration exists to eliminate.

### R12 — No milestone owns storefront copy correctness

**Severity: MEDIUM**

REPOSITORY_ANALYSIS.md:245 flags `ProductDetails.jsx`'s *"Free shipping worldwide"* — false for a
Pakistan-only COD store, and a COD-specific liability since customers can refuse delivery at the door
over a shipping charge they were promised wouldn't exist. Only M44 (mobile audit) and M55 (currency)
touch these files, and neither is scoped to copy. REPOSITORY_ANALYSIS.md:234-235 flags the same for
`Footer.jsx` contact details and `Hero.jsx`'s hardcoded "$4.90".

### R13 — Turbopack dev script unverified against Payload v3

**Severity: LOW**

`package.json:6` runs `next dev --turbopack`. Confirm compatibility with the Payload v3 version installed
at M2 before relying on the dev script; fall back to the standard dev server if needed.

---

## 5. Required corrections

Documentation-only. Ordered by when they must land.

### Before M1 (foundation work can begin)

1. **Resolve the C1 staleness.** Rewrite ARCHITECTURE.md:79-81 from "Major open architecture question" into
   a resolved statement citing [ADR-006](./DECISIONS.md); update CLAUDE.md:44; tick TASKS.md:13.
2. **Flip [ADR-003](./DECISIONS.md) from `Proposed` to `Accepted`** (or explicitly confirm it), since four
   documents and M4 already depend on it. *(C2)*
3. **Adopt one phase-numbering scheme.** Recommended: MIGRATION_PLAN's M-numbers become the single
   execution reference; TASKS.md phases are relabeled to match or reduced to a status roll-up. Fix the four
   stale cross-references (ADR-007, M19, M30, MIGRATION_PLAN:12). Restate the completed planning work as
   **TASKS.md Phase 0** and mark it Done once corrections 1–6 land. *(C6)*
4. **Reorder Phase 3 ahead of Phase 1**: M17, M16, and M19 must land **before** M3, and M17's dependency on
   M3 must be removed. *(R1)*
5. **Write an ADR for [D1](#d1--payload-deployment-topology-blocking)** (Payload topology), and correct
   M3:41, which currently cites a decision that does not exist.
6. **Insert a TypeScript setup milestone between M2 and M3** (`tsconfig.json`, `typescript`, `@types/*`),
   and **add `sharp` to M2**. *(R2, R3)*

### Before M6 (data modeling)

7. **Hold one stakeholder session** covering all six open questions — Coupons, Reviews, shipping model,
   order status set, PKR format, notifications — and record each as an ADR. *(D2, D3, D4, D5, D7, D8)*
8. **Collapse the triple-marked FEATURE_MATRIX rows** (Reviews:21, Coupons:22) to a single disposition each
   once decided, and re-scope or delete M46/M47 accordingly. *(C3, C4, R8)*
9. **Write ADRs for [D6](#d6--media-storage-backend-blocking-before-m6) (media storage),
   [D10](#d10--cart-state-mechanism) (cart state), and [D11](#d11--orders-shape-for-guest-customers)
   (orders shape).** The latter two are already decided inside MIGRATION_PLAN but unrecorded — a direct
   violation of CLAUDE.md:25.
10. **Expand M11/M12's field lists**: order reference, order total, shipping cost, per-line price snapshot. *(R4)*
11. **Add stock validation** to M33's goal and acceptance test. *(R5)*
12. **Define the guest order-lookup access mechanism** in M13 or M36 so the two stop contradicting each
    other, and record the abuse-control approach. *(C7, D9)*

### Before their respective milestones

13. **Add explicit "not in scope" entries for Blog** to FEATURE_MATRIX and to PROJECT_SPEC's
    "Out of scope for launch" list — plus any other CMS-tempting content type. *(C5)*
14. **Insert the missing milestones**: category listing route (C8), store Settings Global (R6), test
    framework + CI (R7), Newsletter disposition (R11), storefront copy pass (R12), production
    `payload migrate` step (R9). Use decimal IDs (M2a, M27a…) to avoid renumbering all 59.
15. **Fix the small errors**: M39's dependency (M11/M12, not M11/M16); M15/M18's unfilled `M...`
    placeholder and the missing Footer cleanup milestone; M55's stale file list; FEATURE_MATRIX's Sanity
    marker. *(C9, C10, C11, C12)*
16. **Confirm environment variable names** (`DATABASE_URI` vs `DATABASE_URL`, public base URL) at M2 and
    M52. *(R10)*

---

## 6. Final recommendation

## **NOT READY**

The planning work is substantive and unusually well cross-referenced — the migration plan's milestone
granularity, rollback notes, and per-milestone testing are genuinely production-grade, and thirteen of
sixteen target properties are defined consistently. The blockers are **documentation-level only**. No code
has been written, and no code change is needed to clear any of them.

Three findings would each independently break the build or corrupt scope if execution began today:

1. **[R1](#r1---admin-route-collision-will-break-the-build-between-m3-and-m17)** — the `/admin` route
   collision, with circular M3↔M17 dependencies. M3 cannot pass its own acceptance test.
2. **[R2](#r2--the-repository-has-no-typescript-but-12-milestones-create-ts-files)** — 12+ milestones write
   `.ts` files into a repository with no TypeScript toolchain and no milestone that adds one.
3. **[C6](#c6--two-incompatible-phase-numbering-systems-are-in-active-cross-reference)** — two live,
   conflicting phase-numbering systems already producing four wrong cross-references.

And three of the sixteen stated target properties — **no coupons, no reviews, no blog** — are not
established anywhere in the documentation. Two are actively deferred to Phase 11; the third is never
mentioned.

### Gate to READY

| Gate | Requires |
|---|---|
| **Before M1** | Corrections 1–6 |
| **Before M6** | Corrections 7–12 |
| **Alongside their milestone** | Corrections 13–16 |

**Estimated effort**: one documentation-only editing pass, plus one stakeholder session covering the six
open questions in PROJECT_SPEC.md:57-66. No code changes.

Re-run this verification after corrections 1–6 land to clear the M1 gate.

---

*Prepared read-only on 2026-08-14 against branch `migration/payload-cod`. No application code and no
existing documentation was modified. Acting on the corrections above is a separate task requiring
explicit scope confirmation, per CLAUDE.md's working agreement.*
