# Migration Plan — Mirza (formerly GoCart Pakistan)

Milestones 1 to 59, the redesign group Milestones 60 to 72, the pre-launch close-out group Milestones 73 to 76, 78, 79, 80 and 81 (Milestone 77 is deferred and not counted), Milestones 90 to 99, the test-environment and brand group Milestones 100 to 102, and the demo-photography group Milestones 103 to 109 (Milestone 109 on hold; count the entries with `grep -c '^### M' docs/MIGRATION_PLAN.md`, 112 headings on 2026-11-03; Milestones 82 to 89 were never assigned; see the numbering note in the Summary), plus Milestones 2a, 13a, 27a, 27b, 33a, 45a, 48a, 52a, 52b, 52c, 55a and 56a) taking the codebase from its current state (documented in [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md): a user interface prototype with no real backend, no real auth, and a multi-vendor feature surface) to the target described in [PROJECT_SPEC.md](./PROJECT_SPEC.md): a single-store, Payload CMS v3 + PostgreSQL, guest-checkout, cash-on-delivery-only, search-engine-optimization-first, mobile-first, Dockerized platform.

Each milestone is scoped to be one reviewable commit (or a small, tightly related handful). This document is a plan only — **no code was written to produce it**.

## How to read a milestone

- **Goal** — what changes and why, in one or two sentences.
- **Files** — the concrete files/directories touched, taken from the classifications in [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md) and [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) wherever those apply.
- **Dependencies** — which prior milestone(s) must land first.
- **Testing** — the minimum manual/automated check before moving on. (Automated checks now exist: `scripts/*.test.ts`, run by `npm run test:env`, `test:turnstile`, `test:idempotency` and `test:users-guard`, and the Playwright specs in `e2e/`, run by `npm run test:e2e` (Milestone 56a, Done; continuous integration runs both). They are deliberately minimal, so a Testing line may still ask for manual verification plus `npm run build`; entries written before Milestone 56a describe the state when they were written. The coverage gap is tracked in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md), finding `R7`.)
- **Rollback** — how to undo this specific milestone if it turns out to be wrong, without unwinding unrelated work.
- **Commit message** — a ready-to-use commit subject line.

## Milestone IDs are the only execution reference

**Every `### M…` entry in this file is part of the authoritative implementation sequence** (Milestones 1 to 59, 60 to 72, the pre-launch close-out group from Milestones 73, 90 to 109); a Proposed, Deferred (Milestone 77) or On-hold (Milestone 109) entry becomes work only when the owner approves it. Group headings below ("Foundation & tooling", "Payload data model", …) are **labels for navigation and status reporting only** — they carry no execution order, and nothing should ever be scheduled, referenced, or reported by group number. Cite work as Milestone 12, never as "Phase 2".

**Execution order is defined by each milestone's `Dependencies` line, not by ascending ID.** Two deliberate exceptions to ID order exist and matter:

> **Milestones 16 and 17, and Milestone 19 run *before* Milestone 3.** Payload mounts its admin user interface at `/admin` (per [Architecture Decision Record 009](./DECISIONS.md#architecture-decision-record-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service)), and the inherited hand-built admin at `app/admin/*` resolves to the same path. Next.js route groups contribute no path segment, so `app/(payload)/admin/[[...segments]]/page.tsx` and `app/admin/page.jsx` are parallel routes for `/admin` and the build fails. The legacy admin must be gone before Payload arrives.

> **Milestone 14 also runs *before* Milestone 3.** A second, independent precondition surfaced during Milestone 3 analysis: mounting Payload requires restructuring the app into Next.js's multiple-root-layouts pattern (each top-level route group, `(public)` and `(payload)`, defining its own root layout). `app/store/**` — the vendor dashboard Milestone 14 deletes — sits outside any route group and collides with that restructuring if still present when Milestone 3 lands. Per [Architecture Decision Record 014](./DECISIONS.md#architecture-decision-record-014-milestone-14-is-a-hard-prerequisite-of-milestone-3-not-an-order-independent-milestone), Milestone 14 is a hard prerequisite of Milestone 3, not an order-independent milestone. **Milestone 3 must not be implemented before Milestone 14.**

### Critical-path order for the opening milestones

```
M1  → M2 → M2a ───────┐
                       ├→ M3 → M4, M5, M6 …
M14, M16, M17, M19 ────┘        (M17 → M19)
```

Milestones 15 and 18 have no dependencies and may land at any point; they are grouped with Milestones 14, 16, 17 and 19 below for narrative reasons only. Everything from Milestone 3 onward follows the stated dependency graph in ascending ID order.

**Between Milestones 17 and 3, `/admin` returns 404.** This is acceptable and expected: the route it replaces was never an authenticated surface (`isAdmin` was hardcoded `true`, per [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md)) and served only dummy data, so nothing of value is unavailable during the gap. Keep the gap short by scheduling Milestone 3 immediately after.

## Scope note

Items the [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) marks **Future Phase only** (Filters, Wishlist, Brands, advanced Inventory, advanced Settings) are intentionally **not** milestones in this plan — they're post-launch. Reviews and Coupons appear here only as *decision + minimal-scope-or-removal* milestones, per their Future-Phase-leaning status in the matrix, not as full feature builds.

> **Filters ≠ category browsing — read this before scoping Milestones 27a and 27b.** Deferring Filters defers *faceted filtering user interface*: price ranges, brand, rating, in-stock toggles, sort controls, multi-facet selection, and any `/shop?category=` parameter. It does **not** defer **category browsing**, which is launch scope and is built by Milestone 27a (`/category/[slug]`) and Milestone 27b (`/categories`) per [Architecture Decision Record 013](./DECISIONS.md#architecture-decision-record-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy). Category browsing is navigation over a slug-based URL space; filtering is query refinement over a result set. The full boundary is enumerated in [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md).

---

## Group: Foundation & tooling — Milestones 1, 2, 2a, 3, 4 and 5

> Runs after Milestones 16, 17 and 19 clear the `/admin` route. See the execution order above.

### Milestone 1 — Dockerized PostgreSQL for local development
- **Goal**: Stand up a local Postgres instance in Docker so every later milestone has a real database to work against.
- **Files**: `docker-compose.yml` (new, Postgres service only), `.env.example` (add `DATABASE_URI`)
- **Env var naming**: the connection string is `DATABASE_URI`, the name Payload's Postgres adapter conventionally reads — **not** the Prisma-era `DATABASE_URL` this milestone originally specified, and not both. Settled by [Architecture Decision Record 010](./DECISIONS.md#architecture-decision-record-010-the-postgresql-connection-string-is-named-database_uri), which closes risk `R10` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).
- **Dependencies**: none
- **Testing**: `docker compose up postgres`; connect with `psql`/a database client and confirm the container is healthy.
- **Rollback**: Remove `docker-compose.yml` and the added env var; stop/remove the container. No application code is touched.
- **Commit message**: `Add Dockerized PostgreSQL for local development`

### Milestone 2 — Install Payload CMS v3, the Postgres adapter, and `sharp`
- **Goal**: Add the core dependencies the entire backend will be built on, including the image-processing library both Payload media and Next.js image optimization depend on.
- **Packages**: `payload`, `@payloadcms/db-postgres`, `@payloadcms/next`, a Payload richtext editor package, `graphql`, and **`sharp`**. Confirm the exact set and versions against the Payload v3 release being installed — Payload's own installer is the authority, not this list.
- **Why `sharp` here and not later**: it is a native-binary dependency needed by two separate milestones — Milestone 8 (Media collection image processing on upload) and Milestone 51 (removing `images.unoptimized: true`, which re-enables Next.js's optimizer). Installing it once at the foundation avoids a mid-migration native rebuild inside the Docker image, and surfaces any platform/binary issues while the app still has nothing to break.
- **Files**: `package.json`, `package-lock.json`
- **Next.js floor**: `@payloadcms/next` requires a Next version the repository did not have (`15.3.5` satisfied none of its peer ranges), so Milestone 2 also bumps `next` to `15.3.9`. Versions, the rejected `--legacy-peer-deps` workaround, and the `sharp` version choice are settled by [Architecture Decision Record 011](./DECISIONS.md#architecture-decision-record-011-payload-v3-dependency-set--exact-pins-a-raised-nextjs-floor-and-patched-sharp).
- **Dependencies**: Milestone 1
- **Testing**: `npm install` completes without peer-dependency errors; `sharp` resolves on the target platform (`node -e "require('sharp')"`); `npm run build` still succeeds (nothing references Payload yet, so the app is unchanged at runtime).
- **Rollback**: `git checkout -- package.json package-lock.json && npm install`.
- **Commit message**: `Add Payload CMS v3, Postgres adapter, and sharp dependencies`

### Milestone 2a — Establish the TypeScript toolchain
- **Goal**: Add TypeScript to a repository that currently has none, **before** any milestone authors a `.ts` file. Every milestone from Milestone 3 onward (`payload.config.ts`, `collections/*.ts`, `lib/payload/*.ts`, `scripts/seed.ts`, `app/sitemap.ts`, `app/robots.ts`, `app/api/health/route.ts`) assumes a working TypeScript setup, and Payload v3 additionally generates a `payload-types.ts` that the storefront imports.
- **Current state**: `jsconfig.json` only — no `tsconfig.json`, no `typescript` dependency, and every application file is `.js`/`.jsx`. Verified in [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md).
- **Files**: `tsconfig.json` (new), `jsconfig.json` (deleted — superseded; `tsconfig.json` takes over the `@/*` path alias), `package.json` (dev dependencies + `type-check` script), `next.config.mjs` (only if build-time type-check behavior needs pinning), `.gitignore` (ignore `*.tsbuildinfo` and Payload's generated types if they are not committed)
- **Scope, explicitly**:
  - **Packages**: `typescript`, `@types/node`, `@types/react`, `@types/react-dom` as `devDependencies`.
  - **`tsconfig.json`**: generated by Next.js on first TS build, then adjusted. Must carry over the `@/*` path alias from `jsconfig.json`, include Next's plugin, and set `"strict": true` — strictness is far cheaper to adopt now, with zero TS files, than after fifty.
  - **JavaScript/TypeScript coexistence**: set `"allowJs": true` so the existing `.jsx` storefront keeps compiling untouched. This migration is incremental by design — **no milestone converts existing `.jsx` files to `.tsx`**, and none should be converted opportunistically. New files are `.ts`/`.tsx`; existing files stay `.jsx` unless a milestone has its own reason to rewrite them.
  - **`"checkJs": false`** — do not type-check the existing JavaScript. Turning it on would surface hundreds of errors in code that is scheduled for deletion or rewrite anyway.
  - **Type-check command**: add `"type-check": "tsc --noEmit"` to `package.json` scripts. From this milestone forward, `npm run type-check` joins `npm run build` as a standard per-milestone verification step.
  - **Next.js compatibility**: Next 15 has first-class TS support and generates `next-env.d.ts` on first run — commit it. Confirm the TypeScript version satisfies both Next 15 and the Payload v3 release installed at Milestone 2.
- **TypeScript version**: pinned to `^5.9.3`, the latest `5.x` release — not the `latest` npm tag, which resolved to `7.0.2` (a same-day-fresh native compiler rewrite). Next 15.3.9 itself is built against TypeScript `5.8.2`. Settled by [Architecture Decision Record 012](./DECISIONS.md#architecture-decision-record-012-typescript-pinned-to-the-5x-line-not-the-latest-tag).
- **Dependencies**: Milestone 2
- **Testing**: `npm run type-check` passes on a repository with no `.ts` files yet (a clean no-op); `npm run build` still succeeds and the existing `.jsx` storefront renders unchanged; a throwaway `.ts` file is type-checked and resolves the `@/*` alias correctly, then is deleted.
- **Rollback**: Delete `tsconfig.json`, `next-env.d.ts`, and the `type-check` script; restore `jsconfig.json`; `git checkout -- package.json package-lock.json && npm install`. No application code is touched by this milestone, so rollback is clean.
- **Commit message**: `Establish TypeScript toolchain ahead of Payload configuration`

### Milestone 3 — Scaffold and mount Payload inside the Next.js app
- **Goal**: Create an empty Payload config wired to Postgres, and mount its admin user interface and REST/GraphQL API inside the existing Next.js App Router, per [Architecture Decision Record 009](./DECISIONS.md#architecture-decision-record-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service) (Payload embedded in the Next.js app, Accepted 2026-08-14).
- **Files**: `payload.config.ts` (new, no collections yet), `app/(payload)/layout.tsx` (new — Payload's own root layout; required because `RootLayout` from `@payloadcms/next/layouts` renders its own `<html>`/`<body>`), `app/(payload)/admin/[[...segments]]/page.tsx` (new), `app/(payload)/admin/importMap.js` (new/generated), `app/(payload)/api/[...slug]/route.ts` (new, REST), `app/(payload)/api/graphql/route.ts` and `app/(payload)/api/graphql-playground/route.ts` (new, GraphQL — actually added at Milestone 10, when a milestone's own testing bar first required GraphQL access; belongs here since it completes this milestone's stated goal), `next.config.mjs` (Payload's Next.js integration wrapper), `.env.example` (add `PAYLOAD_SECRET`), `tsconfig.json` (`moduleResolution` changed `node` → `bundler` to resolve Payload's package `exports`; `@payload-config` path alias added), `app/layout.jsx` (deleted — merged into `app/(public)/layout.jsx`, which becomes the storefront's own root layout)
- **Dependencies**: Milestone 2a (TypeScript must exist — every file this milestone creates is `.ts`/`.tsx`); **Milestones 16, 17 and 19** (`app/admin/**` must be gone first); and **Milestone 14** (`app/store/**` must be gone first — see the multiple-root-layouts precondition below, per [Architecture Decision Record 014](./DECISIONS.md#architecture-decision-record-014-milestone-14-is-a-hard-prerequisite-of-milestone-3-not-an-order-independent-milestone)).
- **⚠️ Route-collision precondition**: Payload mounts at `/admin`. Next.js route groups contribute no path segment, so `app/(payload)/admin/[[...segments]]/page.tsx` and the inherited `app/admin/page.jsx` both resolve `/admin` — a parallel-route build failure. The optional catch-all also collides with `app/admin/stores`, `app/admin/approve`, and `app/admin/coupons`. **Verify `app/admin/` no longer exists before starting this milestone.**
- **⚠️ Multiple-root-layouts precondition**: mounting Payload requires restructuring the app so `(public)` and `(payload)` each own a root layout. `app/store/**`, outside any route group, collides with that restructuring if still present. **Verify `app/store/` no longer exists (i.e. Milestone 14 is done) before starting this milestone.**
- **Testing**: `ls app/admin` returns nothing (precondition); `/admin` serves Payload's (collection-less) admin shell locally; `npm run type-check` and `npm run build` both pass; no errors in server logs.
- **Rollback**: Delete the new route files and `payload.config.ts`; revert `next.config.mjs`. Note that rolling back Milestone 3 leaves `/admin` returning 404 rather than restoring the old admin — recovering that requires also reverting Milestone 17.
- **Commit message**: `Scaffold and mount empty Payload CMS v3 instance in Next.js`

### Milestone 4 — Retire the unwired Prisma schema
- **Goal**: Remove the Prisma schema now that Payload/Postgres is the live data layer, per [Architecture Decision Record 003](./DECISIONS.md). Nothing in the app imports it today, so this is a pure cleanup.
- **Files**: `prisma/schema.prisma` (deleted), `prisma/` (deleted if empty), `.gitignore` (remove the now-meaningless `/app/generated/prisma` line)
- **Dependencies**: Milestone 3 (Payload confirmed as the replacement data layer)
- **Testing**: `npm run build` succeeds; `grep -r "prisma" app components lib` returns nothing.
- **Rollback**: `git revert` the commit to restore the file from history.
- **Commit message**: `Retire unused Prisma schema in favor of Payload collections (ADR-003)`

### Milestone 5 — Add development Dockerfile for the app
- **Goal**: Containerize the Next.js/Payload app for local development, matching the Postgres container from Milestone 1.
- **Files**: `Dockerfile` (new, dev stage), `.dockerignore` (new)
- **Dependencies**: Milestone 3
- **Testing**: `docker build --target dev .` succeeds; container starts and serves `/admin`.
- **Rollback**: Delete `Dockerfile` and `.dockerignore`.
- **Commit message**: `Add development Dockerfile for the Next.js + Payload app`

---

## Group: Payload data model — Milestones 6 to 13, 13a

> **Milestone 6 gate cleared (2026-08-16).** Reviews, Coupons, shipping model, order status set, media storage
> backend, and the guest `Orders` shape are decided — [Architecture Decision Record 016](./DECISIONS.md#architecture-decision-record-016-reviews-are-out-of-scope-for-v1)
> through [Architecture Decision Record 021](./DECISIONS.md#architecture-decision-record-021-guest-orders-use-embedded-address-fields-not-a-customers-collection).
> This group's milestones below already reflect those decisions.

### Milestone 6 — Users collection (admin-only auth)
- **Goal**: Create the single authenticated role in the system, per [Architecture Decision Record 006](./DECISIONS.md).
- **Files**: `collections/Users.ts` (new), `payload.config.ts` (register collection)
- **Dependencies**: Milestone 3
- **Testing**: Create the first admin user via Payload's CLI/local API; log into `/admin` with it.
- **Rollback**: Remove the collection file and its registration.
- **Commit message**: `Add Users collection as the sole admin-only auth role`

### Milestone 7 — Lock down Users access control
- **Goal**: Ensure only an existing admin can create another admin — no public self-registration.
- **Files**: `collections/Users.ts` (access rules)
- **Dependencies**: Milestone 6
- **Testing**: Anonymous REST `POST` to create a user is rejected; an authenticated admin session can create one.
- **Rollback**: Revert the access-control changes.
- **Commit message**: `Restrict Users collection creation to authenticated admins`

### Milestone 8 — Media collection
- **Goal**: Real file upload/storage for product images and future media, replacing the client-only `URL.createObjectURL()` previews found in `add-product`/`create-store` today.
- **Files**: `collections/Media.ts` (new), `payload.config.ts`
- **Storage backend**: Payload's local-storage adapter, backed by a named Docker volume — **not** S3-compatible object storage, for v1. Cloudflare R2 is the designated successor if/when object storage is needed; migrating later is a storage-adapter config swap, not a schema change. Per [Architecture Decision Record 020](./DECISIONS.md#architecture-decision-record-020-media-storage-backend-is-a-local-docker-volume-for-v1-with-cloudflare-r2-as-the-designated-successor).
- **Dependencies**: Milestone 3
- **Testing**: Upload an image through `/admin`; confirm the file is stored and served back correctly.
- **Rollback**: Remove the collection file and its registration.
- **Commit message**: `Add Media collection with real upload storage`

### Milestone 9 — Categories collection
- **Goal**: Replace the hardcoded category string array with a real, admin-editable entity that supports the two-level hierarchy and slug-based URLs the storefront category routes (Milestones 27a and 27b) require.
- **Files**: `collections/Categories.ts` (new), `payload.config.ts` (register collection)
- **Fields** — every one has a named reader in [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md); nothing here is speculative:

  | Field | Type | Required | Read by |
  |---|---|:---:|---|
  | `title` | text | ✓ | `<h1>`, cards, breadcrumbs, metadata fallback |
  | `slug` | text, unique, indexed | ✓ | Every category URL; `generateStaticParams`; sitemap (Milestone 42) |
  | `parent` | relationship → `categories`, `hasMany: false` | — | Hierarchy, product rollup, breadcrumbs, `/categories` grouping |
  | `description` | textarea / richtext | — | Category page intro copy; meta-description fallback |
  | `image` | upload → `media` | — | `/categories` landing cards (Milestone 27b) |
  | `seo.metaTitle` / `seo.metaDescription` | text / textarea | — | `generateMetadata` overrides |
  | `displayOrder` | number | — | Deterministic ordering on `/categories` and child navigation |

- **Constraints**: `slug` generated from `title` on create and then **stable** — never auto-regenerated on a title edit, since renaming a category must not orphan its live URL; `slug` unique across the entire collection (parent and child share one flat URL space); a category whose `parent` already has a `parent` is **rejected** (two levels only, per [Architecture Decision Record 013](./DECISIONS.md#architecture-decision-record-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy)); a category may not be its own parent.
- **Why the field list is here and not left to implementation**: this milestone previously specified no fields at all, while four downstream milestones assumed category URLs and hierarchy existed — readiness finding **C8**. The `parent` self-relation and the `slug` field are the two that close it.
- **Dependencies**: Milestones 3 and 8 (the `image` upload field targets the Media collection)
- **Testing**: Create a parent and a child category via `/admin`; confirm the child's `parent` resolves. Attempt to create a grandchild — rejected. Attempt a duplicate slug — rejected. Rename a category's title — confirm its slug does **not** change. Retrieve both via the REST API.
- **Rollback**: Remove the collection file and its registration.
- **Commit message**: `Add Categories collection with two-level hierarchy and stable slugs`

### Milestone 10 — Products collection
- **Goal**: Real product catalog storage, using the existing Prisma schema's field shape as reference per [Architecture Decision Record 003](./DECISIONS.md), with relations to Categories and Media.
- **Files**: `collections/Products.ts` (new)
- **Category relation — cardinality is decided, not left open**: `category` is a `relationship` to `categories` with **`hasMany: false`**. A product belongs to exactly one category, the most specific one that applies (normally a child). Parent category pages get their inventory by rolling up their children (Milestones 22 and 27a) rather than by admins double-filing a product under both a parent and its child. Per [Architecture Decision Record 013](./DECISIONS.md#architecture-decision-record-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy).
- **Dependencies**: Milestones 8 and 9
- **Testing**: Create a product with a category relation and an uploaded image via `/admin`; confirm it's retrievable via REST and GraphQL. Confirm the category field accepts exactly one value.
- **Later addition**: Milestone 23 added an `isFeatured` checkbox to this collection ([Architecture Decision Record 022](./DECISIONS.md#architecture-decision-record-022-best-selling-is-an-admin-curated-flag-not-a-computed-ranking)) to back the home page's admin-curated "Best Selling" section. Additive; does not change anything above.
- **Rollback**: Remove the collection file.
- **Commit message**: `Add Products collection with category and media relations`

### Milestone 11 — Orders collection with guest fields and line items
- **Goal**: Model orders for guest checkout — embedded customer/address fields instead of a `User` relation, plus a line-items array instead of a separate join table, per [Architecture Decision Record 005](./DECISIONS.md).
- **Files**: `collections/Orders.ts` (new)
- **Guest shape — embedded, not a `Customers` collection**: name, phone, address, city, area are embedded fields on the order itself. No relation to a separate `Customers` collection. Per [Architecture Decision Record 021](./DECISIONS.md#architecture-decision-record-021-guest-orders-use-embedded-address-fields-not-a-customers-collection).
- **Fields beyond the guest address and line items** (closing the shipping/total half of readiness risk `R4`):
  - `orderNumber` / order reference — a human-referenceable ID, distinct from Payload's internal `id`. Read by Milestone 35 (confirmation) and Milestone 36 (guest lookup).
  - `orderTotal` — the resolved total at creation time.
  - `shippingCost` — the resolved flat rate or `0` if the free-shipping threshold was met, per [Architecture Decision Record 018](./DECISIONS.md#architecture-decision-record-018-shipping-model--flat-rate-with-a-free-shipping-threshold-snapshotted-per-order).
  - Each line item carries a **price snapshot** (the product's unit price at order time), not a live reference to `Products.price` — a later product price edit must not silently re-price historical orders.
  - `discountAmount` — nullable. No coupon engine exists in v1 ([Architecture Decision Record 017](./DECISIONS.md#architecture-decision-record-017-coupons-are-out-of-scope-for-v1)), but reserving the field now avoids an `Orders` migration if one is added later.
- **Dependencies**: Milestone 10
- **Testing**: Create a sample order via `/admin` with an embedded guest address and multiple line items; confirm it renders correctly with no login prompt beyond the admin's own. Confirm `orderTotal`/`shippingCost`/line-item price snapshots persist independently of the live `Products` values.
- **Rollback**: Remove the collection file.
- **Commit message**: `Add Orders collection with guest checkout and line-item fields`

### Milestone 12 — Payment method and status fields on Orders
- **Goal**: Add a cash-on-delivery-only `paymentMethod` field (extensible enum, per [Architecture Decision Record 004](./DECISIONS.md)) and an order status workflow field.
- **Files**: `collections/Orders.ts`
- **Status set — decided, not left open**: `PLACED` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED`, plus terminal `CANCELLED` and `RETURNED`. `CONFIRMED` exists specifically so admins can phone-confirm an order before dispatch, suppressing fake/duplicate orders — standard practice for Pakistani cash on delivery stores. `CANCELLED` (killed before dispatch) and `RETURNED` (came back after dispatch — refused at door/RTO) are operationally distinct: `RETURNED` implies courier cost was already incurred and stock must be restored. No transition-validation state machine in v1 — a flat enum, admin-selected. Per [Architecture Decision Record 019](./DECISIONS.md#architecture-decision-record-019-order-status-set-includes-confirmed-cancelled-and-returned).
- **Dependencies**: Milestone 11
- **Testing**: Confirm only `COD` is selectable in `/admin` today — verified via REST (`PATCH` with `paymentMethod: "STRIPE"` correctly rejected as an invalid selection). Confirm all seven status values are selectable — verified. **Correction (2026-08-17)**: "without a data migration" overstated it — Payload materializes a `select` field as a native Postgres `ENUM`, so adding a value later is `ALTER TYPE ... ADD VALUE`, not literally zero migration, though still no data transformation/backfill. `type: 'select'` remains the right field for an admin-picked dropdown regardless.
- **Rollback**: Revert the field additions.
- **Commit message**: `Add COD-only paymentMethod and status fields to Orders`

### Milestone 13 — Collection access control pass + dev seed script
- **Goal**: Set public-read/admin-write access on `Products`/`Categories`/`Media`, public-create/admin-read on `Orders` (guest checkout), and seed a handful of dev records so later milestones have real data to build against.
- **Files**: `collections/Products.ts`, `Categories.ts`, `Media.ts`, `Orders.ts` (access functions), `scripts/seed.ts` (new)
- **Dependencies**: Milestones 9, 10, 11 and 12
- **Testing**: Anonymous `GET /api/products` succeeds; anonymous `POST /api/products` fails; anonymous `POST /api/orders` succeeds; anonymous `GET /api/orders` fails — all verified via REST (2026-08-17). Seed script populates a clean dev database — implemented, but unverified by direct execution; see the note below.
- **⚠️ Known gap, implemented as specified, not resolved here**: this milestone's Orders access (admin-only read) is exactly what readiness finding [C7](./PHASE_1_READINESS_REPORT.md#c7--milestone-13s-access-control-rules-forbid-exactly-what-milestone-36-requires) flags as conflicting with Milestone 36's guest-order-lookup requirement. No reconciling mechanism (scoped lookup endpoint, field-level access, signed token) exists yet — Milestone 36 needs to design one.
- **⚠️ `scripts/seed.ts` execution note**: `npx tsx scripts/seed.ts` failed in the authoring sandbox with a Node 22.22/`tsx` ESM-interop error inside `@payloadcms/db-postgres`'s import chain (same class of issue as Milestone 3's `generate:importmap` problem) — unrelated to the script's own logic, which was instead validated via equivalent REST calls. Confirm `npm run seed` directly in a real environment before relying on it.
- **Rollback**: Revert access functions; delete seed script.
- **Commit message**: `Set collection access control for public storefront and guest checkout`
- **⚠️ Amended by [Architecture Decision Record 026](./DECISIONS.md#architecture-decision-record-026-orders-are-created-only-by-a-server-side-function--orders-collection-create-access-closes-to-admins) (Accepted 2026-10-09)**: the *"anonymous `POST /api/orders` succeeds"* criterion above is historical — `Orders.create` is admin-only as of Milestone 33, and guests create orders through a server-side function instead. The other criteria stand.

### Milestone 13a — Settings global
- **Goal**: A single admin-editable Payload **Global** (not a collection — one record, not a list) holding store-wide configuration, closing readiness risk `R6` (no Settings global despite launch scope).
- **Files**: `globals/Settings.ts` (new), `payload.config.ts` (register global)
- **Fields**: store name, contact info (phone/email/address for Milestone 48's Footer cleanup), `shippingFlatRate` and `freeShippingThreshold` (both per [Architecture Decision Record 018](./DECISIONS.md#architecture-decision-record-018-shipping-model--flat-rate-with-a-free-shipping-threshold-snapshotted-per-order) — admin-configurable, read by Milestones 33 and 34 at order-creation time only, then snapshotted onto the order), currency-format fields for Milestone 55 to consume.
- **Dependencies**: Milestone 6 (admin auth must exist to secure write access; read access is public — the storefront needs shipping/contact info)
- **Testing**: Edit shipping rate/threshold via `/admin`; confirm the values are readable via REST/Local API. Confirm anonymous write is rejected.
- **Rollback**: Remove the global file and its registration.
- **Commit message**: `Add Settings global for shipping, contact, and currency configuration`

---

## Group: Remove the multi-vendor surface — Milestones 14 to 19

Per [Architecture Decision Record 006](./DECISIONS.md) (Accepted) and the **Remove** rows for Vendor/Seller in [FEATURE_MATRIX.md](./FEATURE_MATRIX.md).

> **Ordering — read before scheduling.** Milestones 16 and 17, and Milestone 19 delete `app/admin/**` and **must land before Milestone 3**, which mounts Payload's admin user interface at the same `/admin` path (see [Architecture Decision Record 009](./DECISIONS.md#architecture-decision-record-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service)). Running Milestone 3 first produces a Next.js parallel-route build failure. **Milestone 14 must also land before Milestone 3** — a second, independent precondition found during Milestone 3 analysis: `app/store/**` collides with the multiple-root-layouts restructuring Payload's mount requires (see [Architecture Decision Record 014](./DECISIONS.md#architecture-decision-record-014-milestone-14-is-a-hard-prerequisite-of-milestone-3-not-an-order-independent-milestone)). Only Milestones 15 and 18 touch no admin routes and are genuinely order-independent — they may land at any time.

### Milestone 14 — Delete the vendor dashboard
- **Goal**: Remove the entire hand-built seller area, including its hardcoded `isSeller = true` auth bypass.
- **Files**: `app/store/**` (deleted: `layout.jsx`, `page.jsx`, `add-product/`, `manage-product/`, `orders/`), `components/store/**` (deleted: `StoreLayout.jsx`, `StoreNavbar.jsx`, `StoreSidebar.jsx`)
- **Dependencies**: none — but **Milestone 3 depends on this milestone**, per [Architecture Decision Record 014](./DECISIONS.md#architecture-decision-record-014-milestone-14-is-a-hard-prerequisite-of-milestone-3-not-an-order-independent-milestone): `app/store/**` collides with the multiple-root-layouts restructuring Payload's mount (Milestone 3) requires. **Milestone 14 is the next milestone to execute.**
- **Testing**: `npm run build` succeeds; confirm no remaining file imports anything from `app/store` or `components/store`.
- **Rollback**: `git revert` to restore the deleted files.
- **Commit message**: `Remove vendor dashboard — single-store platform (ADR-006)`

### Milestone 15 — Delete vendor signup and per-vendor storefront
- **Goal**: Remove the "become a seller" flow and the `/shop/[username]` per-vendor storefront route.
- **Files**: `app/(public)/create-store/page.jsx` (deleted), `app/(public)/shop/[username]/page.jsx` (deleted)
- **Dependencies**: none
- **Testing**: `npm run build` succeeds. Note that `Footer.jsx`'s "Create Your Store" link now points at a deleted route; the Footer cleanup that resolves it is Milestone 48, which lands much later. Removing the link inline here is preferable to leaving it dead — see the dead-link window flagged in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).
- **✅ Done (2026-08-17)**. Both files deleted; `Footer.jsx`'s "Create Your Store" entry removed inline as directed. `npm run type-check` and `npm run build` both pass; `/create-store` and `/shop/[username]` verified to 404 at runtime. **One dead link remains, deliberately not fixed here**: `components/ProductDescription.jsx`'s "view store" link still points at `/shop/${product.store.username}`. Not an oversight of this milestone — Milestone 26 already exists to remove that entire attribution block, already depends on Milestone 15, and its own text anticipates the route being gone. `components/Loading.jsx` (imported by both deleted pages, plus the also-deleted Milestone 18 loading stub) was left in place — a generic shared component, not itself dead, not in this milestone's Files list.
- **Rollback**: `git revert`.
- **Commit message**: `Remove vendor signup and per-vendor storefront routes`

### Milestone 16 — Delete admin vendor-management routes
- **Goal**: Remove vendor approval and activation screens.
- **Files**: `app/admin/stores/page.jsx` (deleted), `app/admin/approve/page.jsx` (deleted)
- **Dependencies**: none. **Must land before Milestone 3** — these routes sit under `app/admin/`, which Payload's optional catch-all also matches.
- **Testing**: `npm run build` succeeds.
- **Rollback**: `git revert`.
- **Commit message**: `Remove vendor approval and store-management admin routes`

### Milestone 17 — Delete the hand-built admin dashboard shell
- **Goal**: Remove the custom admin panel — including its hardcoded `isAdmin = true` auth bypass — to clear the `/admin` route **before** Payload takes ownership of it at Milestone 3. Per the **Replace** classification in [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md) and [Architecture Decision Record 009](./DECISIONS.md#architecture-decision-record-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service).
- **Files**: `app/admin/layout.jsx`, `app/admin/page.jsx` (deleted), `components/admin/AdminLayout.jsx`, `AdminNavbar.jsx`, `AdminSidebar.jsx`, `StoreInfo.jsx` (deleted), `components/OrdersAreaChart.jsx` (deleted)
- **Dependencies**: none. **Must land before Milestone 3** — this is the milestone that frees `/admin`.
- **Why this precedes Payload rather than following it**: the earlier plan had Milestone 17 depend on Milestone 3 ("so nothing is lost"), which is circular — Milestone 3 cannot build while `app/admin/page.jsx` exists. Nothing is in fact lost by going first: this dashboard has no real authentication (`isAdmin` is hardcoded `true`, so it is public today) and displays only `assets/assets.js` dummy data. There is no live functionality to preserve during the gap.
- **Interim state**: `/admin` returns 404 from this milestone until Milestone 3 mounts Payload. Schedule the two close together. **`/admin/coupons` stays live and returns 200** — it is deleted by Milestone 19, not Milestone 17, and never imported anything from `components/admin/**`, so it survives this milestone unaffected by the deletion. What it loses is its layout: `app/admin/layout.jsx` (the `AdminLayout` wrapper — navbar, sidebar, the fake `isAdmin` gate) is gone, so `/admin/coupons` falls back to the bare root `app/layout.jsx` (`<html>`/`<body>` + Redux provider + toaster only, no chrome of any kind) until Milestone 19 removes the page entirely. This is expected migration debt, not a regression — the auth gate it loses was never real. Do not "fix" it with a scoped layout; Milestone 19 is the fix.
- **Testing**: `npm run build` succeeds; `/admin` returns 404; `grep -r "components/admin\|OrdersAreaChart" app components` returns nothing.
- **Rollback**: `git revert`. Only meaningful before Milestone 3 lands — afterwards, restoring these files would recreate the very route collision this ordering exists to prevent.
- **Commit message**: `Remove hand-built admin dashboard — superseded by Payload CMS admin UI`

### Milestone 18 — Delete orphaned stub routes
- **Goal**: Remove the empty pricing stub and the vendor-approval-only redirect page, both dead weight with no place in the target product.
- **Files**: `app/(public)/pricing/page.jsx` (deleted), `app/(public)/loading/page.jsx` (deleted)
- **Dependencies**: none
- **Testing**: `npm run build` succeeds. As with Milestone 15, `Footer.jsx`'s "Become Plus Member" link now points at a deleted route; Milestone 48 is the scheduled cleanup, so remove the link inline here rather than leaving it dead.
- **✅ Done (2026-08-17)**. Both files deleted; `Footer.jsx`'s "Become Plus Member" entry removed inline as directed. `npm run type-check` and `npm run build` both pass; `/pricing` and `/loading` verified to 404 at runtime. No other file referenced either route.
- **Rollback**: `git revert`.
- **Commit message**: `Remove orphaned pricing stub and vendor-redirect loading page`

### Milestone 19 — Remove the admin coupons stub page
- **Goal**: Remove the non-functional coupon CRUD screen for now; real coupon support (if any) is redesigned at Milestone 47, since account-based targeting (`forNewUser`/`forMember`) doesn't fit guest checkout.
- **Files**: `app/admin/coupons/page.jsx` (deleted)
- **Dependencies**: Milestone 17. **Must land before Milestone 3** — this route sits under `app/admin/`.
- **Testing**: `npm run build` succeeds.
- **Rollback**: `git revert`.
- **Commit message**: `Remove non-functional coupon admin page pending guest-checkout-compatible redesign`

---

## Group: Confirm admin-only auth end to end — Milestones 20 to 21

### Milestone 20 — Verify no route bypasses Payload auth
- **Goal**: Audit that the only authenticated surface left in the app is Payload's own `/admin`, with no leftover custom auth checks anywhere.
- **Files**: none changed — audit only; fixes (if any) land as follow-up commits scoped to whatever is found
- **Dependencies**: Milestones 17 and 19
- **Testing**: Manually browse every remaining route while logged out of `/admin`; confirm nothing customer-facing requires or fakes a login.
- **✅ Audit result (2026-08-17) — PASS, no fixes required.** Static sweep found no `isAdmin`/`isSeller`/session/`useAuth` construct anywhere in `app/`, `components/`, or `lib/`; no `middleware.ts`; no auth provider in `package.json`. The multi-vendor era's hardcoded bypasses went with Milestones 14, 17 and 19. Runtime: all nine customer-facing routes (`/`, `/shop`, `/cart`, `/orders`, `/pricing`, `/loading`, `/create-store`, `/product/[id]`, `/shop/[username]`) return 200 logged out with no redirect; `/admin` logged out serves Payload's login screen and leaks no collection data; unauthenticated `GET /api/users` and `GET /api/orders` return 403, and `GET /api/users/me` returns `{"user":null}` (Payload's normal unauthenticated response, not a bypass). The only auth-adjacent artifact found anywhere was the dead Login button in `Navbar.jsx` — which is exactly what Milestone 21 removes.
- **Rollback**: N/A (audit milestone).
- **Commit message**: `Audit: confirm Payload admin auth is the only authenticated surface`

### Milestone 21 — Remove the non-functional customer "Login" button
- **Goal**: The storefront `Navbar` has a "Login" button with no handler; remove it since customers never authenticate under guest-checkout-only ([Architecture Decision Record 005](./DECISIONS.md)).
- **Files**: `components/Navbar.jsx`
- **Dependencies**: Milestone 20
- **Testing**: Visual check — navbar renders correctly on mobile and desktop without the button; no console errors.
- **Rollback**: Revert the file.
- **Commit message**: `Remove non-functional customer login button from navbar`

---

## Group: Storefront — real product & category data — Milestones 22 to 28

### Milestone 22 — Product/category data-fetching utility
- **Goal**: A small server-side utility to fetch Products/Categories from Payload (local API when server-rendered, REST/GraphQL when client-rendered), replacing ad hoc dummy-data assignment.
- **Files**: `lib/payload/products.ts` (new), `lib/payload/categories.ts` (new)
- **Category functions this must expose** — Milestones 27, 27a and 27b, and Milestone 42 all consume them, so they belong here rather than being reimplemented per route:
  - `getTopLevelCategories()` — categories with no `parent`, each with its children resolved, ordered by `displayOrder` then title. Backs `/categories` (Milestone 27b).
  - `getCategoryBySlug(slug)` — a single category with its `parent` and `children` resolved, for the page body and breadcrumbs. Returns null for an unknown slug so the route can `notFound()`.
  - `getProductsByCategory(slug, { page, limit })` — paginated products for a category, **including all descendants when the category is a parent** (the rollup from [Architecture Decision Record 013](./DECISIONS.md#architecture-decision-record-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy)). Returns products plus total count and page count.
- **Why rollup lives here**: "which products are in this category" must have exactly one implementation. Duplicating the descendant query into route code is how a parent page and the sitemap end up disagreeing about the same category.
- **Dependencies**: Milestone 13
- **Testing**: Call each function from a temporary script/route and confirm it returns seeded data from Milestone 13. Specifically confirm `getProductsByCategory()` on a **parent** slug returns products filed under its children, and on a **child** slug returns only that child's products.
- **✅ Done (2026-08-17)**. Verified with a temporary route against seeded data (Electronics → Headphones, Speakers; one product on the parent directly, one on each child): `getProductsByCategory('electronics')` returned all three (rollup correct); `getProductsByCategory('headphones')` and `('speakers')` each returned exactly their own one product; `getTopLevelCategories()`/`getCategoryBySlug()` resolved parent/children correctly with `parent`/`children` populated as specified; unknown slug and unknown product id both returned `null` rather than throwing. The temporary route was deleted before committing. `npm run type-check` and `npm run build` both pass.
- **Two implementation notes not decided by the milestone text**:
  - **`products.ts`'s exact function surface wasn't specified** (unlike categories', which lists three named functions). Grounded it in the actual consumers instead of guessing: Milestone 23 needs "latest" (sort + limit), Milestone 24 needs "all", Milestone 25 needs "by id" — so a single flexible `getProducts({ sort, limit, page })` plus `getProductById(id)` covers all three without inventing a bespoke function per caller. **"Best selling" (Milestone 23's `BestSelling.jsx`) has no defined ranking in the current schema** — the dummy data sorted by review count, but Reviews are out of scope ([Architecture Decision Record 016](./DECISIONS.md#architecture-decision-record-016-reviews-are-out-of-scope-for-v1)) and no sales-count field exists anywhere. `getProducts()` supports any sort key; it does not itself define what "best selling" means. Milestone 23 must pick one when it wires that component.
  - **Types are hand-written, not generated from `payload-types.ts`** — `payload generate:types` hit the same Node 22.22/`tsx` ESM-interop class of failure as `generate:importmap` (Milestone 3) and `scripts/seed.ts` (Milestone 13) in the authoring sandbox. `Product`/`Category`/`Media` types in `lib/payload/*.ts` are hand-written to mirror `collections/*.ts` exactly; swap for generated types once `payload-types.ts` can be produced in a normal environment.
- **Rollback**: Delete the new files; nothing else references them yet.
- **Commit message**: `Add server-side data-fetching utilities for Products and Categories`

### Milestone 23 — Wire home page product sections to real data
- **Goal**: Replace dummy-data-backed `LatestProducts`/`BestSelling` with real Payload data; convert what can be server-rendered for search engine optimization.
- **Files**: `components/LatestProducts.jsx`, `components/BestSelling.jsx`, `app/(public)/page.jsx`, **`components/ProductCard.jsx`** (moved here from Milestone 46 — see below), plus `collections/Products.ts` and `lib/payload/products.ts` for the `isFeatured` field ([Architecture Decision Record 022](./DECISIONS.md#architecture-decision-record-022-best-selling-is-an-admin-curated-flag-not-a-computed-ranking)) and `scripts/seed.ts` to seed it
- **`ProductCard.jsx` moved from Milestone 46 to here.** It was listed under Milestone 46 (reviews removal), ~23 milestones later, but it is **not optional for this milestone**: the card called `product.rating.reduce(...)` on a field real Payload products do not have (a `TypeError`, not a cosmetic issue) and passed `images[0]` — a Media *object* — where `next/image` needs a URL string. Milestone 23 cannot render real data at all until both are fixed, so the file belongs to whichever milestone first forces the change, which is this one. Milestone 46 retains `RatingModal.jsx`, `ProductDescription.jsx`, and `ProductDetails.jsx`.
- **"Best selling" ranking is decided here** — [Architecture Decision Record 022](./DECISIONS.md#architecture-decision-record-022-best-selling-is-an-admin-curated-flag-not-a-computed-ranking): admin-curated `isFeatured` flag, not a computed metric. Reviews (the dummy data's ranking basis) are out of scope per [Architecture Decision Record 016](./DECISIONS.md#architecture-decision-record-016-reviews-are-out-of-scope-for-v1) and no sales aggregation exists.
- **Dependencies**: Milestone 22
- **Testing**: Home page renders real seeded products; no console errors; page still builds/loads under `npm run build && npm run start`.
- **✅ Done (2026-08-17)**. Home page is a server component (`force-dynamic`, per [Architecture Decision Record 022](./DECISIONS.md#architecture-decision-record-022-best-selling-is-an-admin-curated-flag-not-a-computed-ranking) — admin curation must not require a redeploy, and the production build must not require a live database). Verified against seeded data in both `npm run dev` and `npm run build && npm run start`: real product names and `/api/media/file/*` URLs appear in the **initial HTML** (server-rendered, not hydrated in); no dummy names remain; star-rating markup is gone; "Best Selling" renders `null` when nothing is flagged and updates live when `isFeatured` is toggled in `/admin` with no rebuild; no server or console errors. `/` moved from `○ Static` to `ƒ Dynamic`, and the home page's client JS shrank (2.88 kB → 1.97 kB) as the sections stopped shipping Redux.
- **Rollback**: Revert the touched files. Note the `isFeatured` column stays in the database; it is additive and harmless if unused.
- **Commit message**: `Wire home page product sections to real Payload data`

### Milestone 24 — Wire shop listing page to real data
- **Goal**: Replace the Redux-dummy-list-backed shop page with a real Products query.
- **Files**: `app/(public)/shop/page.jsx`
- **Dependencies**: Milestone 22
- **Testing**: `/shop` lists real seeded products; existing name-based search still filters correctly against real data.
- **✅ Done (2026-08-17)**. Converted to a server component reading `searchParams` directly (Architecture Decision Record 007 — search-engine-optimization-first applies to all storefront user interface, not just Milestone 23's) and fetching via `getProducts()`. The name filter stays a simple in-memory `.includes()` over the fetched list, unchanged in behavior from the dummy-data version — Milestone 29 is still the milestone that replaces it with a real query. The "go back" control changed from an `onClick`+`router.push` (client-only) to a plain `<Link href="/shop">`, equivalent behavior in a server component. Verified: real product names render server-side; `?search=` correctly includes matches and excludes non-matches; a non-matching search renders a clean empty grid, not an error. `/shop` moved `○ Static` → `ƒ Dynamic`. `npm run type-check` and `npm run build` both pass.
- **Rollback**: Revert the file.
- **Commit message**: `Wire shop listing page to real Payload product data`

### Milestone 25 — Wire product detail page to real data
- **Goal**: Replace the Redux-lookup-based product page with a real per-product fetch.
- **Files**: `app/(public)/product/[productId]/page.jsx`, `components/ProductDetails.jsx`, `components/ProductDescription.jsx`
- **Dependencies**: Milestone 22
- **Testing**: Visiting `/product/[id]` for a seeded product renders correct name/price/images; a non-existent ID renders a proper not-found state instead of a blank page.
- **Rollback**: Revert the three files.
- **Commit message**: `Wire product detail page to real Payload product data`
- **✅ Done (2026-08-18)**: `page.jsx` converted to an async server component reading `getProductById()`
  (already implemented at Milestone 22), calling `notFound()` when it returns `null` — matches Next.js's
  default not-found page, satisfying the milestone's testing requirement without a custom
  `not-found.jsx`. `force-dynamic` set for the same reason as Milestone 23's home page (admin price/stock
  edits must show without a redeploy; the production build at Milestone 49 cannot assume a reachable
  database). **`ProductDetails.jsx` and `ProductDescription.jsx`'s star-rating user interface moved from Milestone 46
  into Milestone 25**, the same class of forced pull-forward as `ProductCard.jsx` at Milestone 23: both read
  `product.rating`, which real products don't have, and would have thrown before rendering —
  Milestone 46's entry is updated to note there is nothing left in these two files for it to strip.
  `ProductDescription.jsx`'s Reviews tab is removed outright (not just guarded), since it existed
  solely to render that same missing field and Reviews are out of scope for v1 (Architecture Decision Record 016). Image
  handling for both files switched to resolving Media relationships' `.url` field, mirroring
  `ProductCard.jsx`'s Milestone 23 fix — `images[0]`/`image` were never valid URL strings for real products.
  The store-attribution block in `ProductDescription.jsx` is left in place but guarded
  (`{product.store && (...)}`) rather than deleted: real products have no `store` relationship so it
  now renders nothing, but the actual deletion (and its now-dead `/shop/[username]` link) stays
  Milestone 26's job as scoped, since it isn't a render-blocking fix. Verified against a live `npm run start`
  server with seeded data: `/product/3` renders the correct name ("Bluetooth Speaker"), price, category
  ("Speakers"), and image, with no "Reviews" text and no server-side errors; `/product/99999` (a
  non-existent ID) returns a real HTTP 404 via Next's default not-found page. `npm run type-check` and
  `npm run build` both pass; `/product/[productId]` moved `○ Static` → `ƒ Dynamic`.

### Milestone 26 — Remove multi-vendor "Product by {store}" attribution
- **Goal**: Now that products aren't vendor-owned, drop the store-attribution block and its link to the (already-deleted) per-vendor storefront.
- **Files**: `components/ProductDescription.jsx`
- **Dependencies**: Milestones 25 and 15
- **Testing**: Product detail page renders correctly with no broken link and no reference to a store/vendor.
- **Rollback**: Revert the file.
- **Commit message**: `Remove vendor attribution block from product page`
- **✅ Done (2026-08-18)**: Deleted the guarded store-attribution block Milestone 25 left in place
  (`{product.store && (...)}`), its `Image`/`Link`/`ArrowRight` imports, and its `next/link` to the
  already-deleted `/shop/[username]` route. Since Milestone 25 had already removed the file's only client
  state (the Reviews tab), the file also dropped `'use client'` and now renders as a server
  component — no interactivity remains to require it, same direction as Milestone 23's Redux-shedding
  cleanup. Verified against a live `npm run start` server: `/product/3` still renders correctly
  (name, price, category, image, description), and the response body contains no "view store",
  "/shop/", or "Product by" text. `npm run type-check` and `npm run build` both pass;
  `/product/[productId]`'s client JS dropped 123 kB → 120 kB First Load JS.

### Milestone 27 — Wire CategoriesMarquee to real categories
- **Goal**: Replace the hardcoded `categories` array `CategoriesMarquee` imports from `assets/assets.js` with the real `Categories` collection. **Data source only** — the marquee's items stay non-interactive in this milestone.
- **Files**: `components/CategoriesMarquee.jsx`
- **Dependencies**: Milestone 22
- **⚠️ Corrected acceptance test**: this milestone previously asserted *"clicking one filters/links correctly"* — behavior that does not exist in the component and that this milestone does not add. `CategoriesMarquee.jsx` renders bare `<button>`s with no `onClick` and no `href`. **Milestone 27a is the milestone that makes them links**; Milestone 27 only re-points the data. Keeping the items inert here is deliberate: it preserves today's behavior exactly rather than opening a dead-link window before Milestone 27a lands. Recorded as readiness finding **C8** in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).
- **Testing**: Marquee renders the seeded categories from Milestones 9 and 13 instead of the hardcoded six; items remain non-interactive, unchanged from today; no console errors.
- **Rollback**: Revert the file.
- **Commit message**: `Wire category marquee to real Payload categories`
- **✅ Done (2026-08-18)**: `CategoriesMarquee.jsx` gained `'use client'` and now fetches all categories
  from Payload's public-read REST API (`GET /api/categories?limit=0&sort=displayOrder,title&depth=0`)
  in a `useEffect`, replacing the hardcoded `assets/assets.js` array. **REST, not the Milestone 22 Local API
  utilities** — `CategoriesMarquee` is nested inside `Hero.jsx`, which is `'use client'` (`Hero`'s own
  server-component conversion is Milestone 40's pass, out of this milestone's scope), and a client component
  can't call Payload's Local API. This is exactly the fallback path `lib/payload/categories.ts`'s own
  header comment already documents for client components. Items are unchanged bare `<button>`s — no
  `onClick`, no `href` — preserving today's inert behavior exactly, per the corrected acceptance test
  above; Milestone 27a still owns turning them into links. Verified in a real headless-Chromium browser
  (Playwright, `page.goto` + `waitForTimeout` against a live `npm run start` server with seeded data,
  since the fetch runs client-side after hydration and won't appear in a `curl`'d response): the
  marquee renders "Electronics & Gadgets", "Headphones", "Speakers" (the three seeded categories, each
  repeated 4× by the existing loop-duplication), with zero console or page errors. `npm run type-check`
  and `npm run build` both pass.

### Milestone 27a — Category detail and product listing route (`/category/[slug]`)
- **Goal**: Build the customer-facing category page the storefront has never had — a server-rendered, slug-based, publicly browsable listing of a category's products, with parent/child navigation and pagination. Implements [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md) per [Architecture Decision Record 013](./DECISIONS.md#architecture-decision-record-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy).
- **Files**: `app/(public)/category/[slug]/page.tsx` (new), `loading.tsx` (new), `error.tsx` (new), `not-found.tsx` (new); `components/CategoriesMarquee.jsx` (inert `<button>`s → `next/link` anchors); `app/(public)/product/[productId]/page.jsx` (the plain-text `Home / Products / {category}` breadcrumb becomes a link)
- **`.tsx`, not `.jsx`** — per Milestone 2a's rule that new files are TypeScript. The route reads Payload's generated types through `lib/payload/*`.
- **Scope**:
  - **Parent slug** → `<h1>`, description, child-category navigation, and products rolled up from the parent plus every child.
  - **Child slug** → `<h1>`, description, its own products, and a breadcrumb linking back to its parent.
  - **Pagination** — `?page=N`, 24 per page, rendered as real `<a>` links; page 1 canonicalizes to the bare URL; out-of-range → 404.
  - **Search engine optimization ships here, not at Milestone 41** — `generateMetadata`, `generateStaticParams` over published slugs, one `<h1>`, canonical URLs on paginated variants, `rel=prev`/`next`. [Architecture Decision Record 007](./DECISIONS.md#architecture-decision-record-007-search-engine-optimization-first-and-mobile-first-are-default-requirements-not-a-later-pass) makes search engine optimization part of definition-of-done, not a later pass.
  - **States** — an empty category renders **200** with an empty state (never 404: emptiness is a temporary property of inventory, and 404-ing would churn the sitemap on ordinary stock movement); unknown/unpublished slug → real 404; query failure → `error.tsx`, never a silent empty grid.
  - **No filtering user interface of any kind** — see the Filters boundary in the scope note above.
- **Dependencies**: Milestone 13 (seeded parent/child categories with products, public read access), Milestone 22 (the three category query functions), Milestone 27 (marquee already on real category data — this milestone converts it to links)
- **Testing**: A parent slug lists its children and their rolled-up products; a child slug lists only its own with a working parent breadcrumb; a category with no products returns **200** with an empty state; an unknown slug returns **404**; `?page=2` paginates and an out-of-range page returns 404; page source contains the product grid (server-rendered, not hydrated in); marquee items and the product breadcrumb now navigate correctly; no login prompt anywhere in the flow; `npm run type-check` and `npm run build` pass.
- **Rollback**: Delete `app/(public)/category/`; revert the two component edits. The marquee returns to inert items — its pre-Milestone 27a state — so no dead links are left behind.
- **Commit message**: `Add category detail and product listing route`
- **✅ Done (2026-08-18)**: `app/(public)/category/[slug]/page.tsx`, `not-found.tsx`, and `error.tsx`
  added; `CategoriesMarquee.jsx`'s bare `<button>`s became `next/link` anchors to
  `/category/[slug]`; the product-page breadcrumb (Milestone 25) now links its category segment.
  `generateStaticParams` (built from Milestone 22's `getTopLevelCategories()`, no new lib function needed)
  plus `revalidate = 3600` deliver the spec's "static-by-default, revalidated" requirement.
  Parent-slug rollup and child-slug isolation both use Milestone 22's `getProductsByCategory()` directly.
  Pagination, canonical URLs, and `rel=prev`/`next` (rendered as literal `<link>` tags in the page
  body, which Next.js hoists into `<head>` — a documented App Router capability, not a hack) are all
  implemented per spec.
  - **⚠️ `loading.tsx` was deliberately dropped — spec conflict, not an oversight.** Empirical testing
    (isolating each segment file one at a time against a live `npm run start` server) proved that
    adding a `loading.tsx` file to this route makes `notFound()` return **HTTP 200** instead of 404,
    for both the unknown-slug and out-of-range-page cases — confirmed independent of `error.tsx`,
    `generateMetadata`, and the SSG/`revalidate` vs. `force-dynamic` choice; only `loading.tsx`'s
    presence flips the result. This is a real Next.js 15 App Router limitation: `loading.tsx` wraps
    the segment in a `<Suspense>` boundary, and Next flushes that boundary's shell with a 200 status
    *before* the awaited page component can run `notFound()` — by the time the correct body content
    (`not-found.tsx`) streams in, the status line is already sent and can't change. A `layout.tsx`-based
    workaround (checking category existence outside the Suspense boundary) fixed the unknown-slug case
    alone, but layouts don't receive `searchParams`, so it couldn't cover the out-of-range-page case —
    and `generateMetadata` calling `notFound()` didn't help either (Next 15's metadata streams
    independently of the body and doesn't block the shell flush). Given correct HTTP status codes are
    this milestone's whole point (soft-404s directly undermine Architecture Decision Record 007's search-engine-optimization-first mandate, and
    crawlers never see a `loading.tsx` skeleton anyway — that's purely a real-user CLS concern), status
    correctness won over the skeleton. `min-h-[70vh]` on the content wrapper still reserves layout
    space, avoiding a hard blank-page flash. Revisit if Next.js fixes this upstream, or if Milestone 45's
    caching pass wants Partial Prerendering (which is designed to solve exactly this class of problem
    but is experimental in this Next.js version and out of scope to enable here).
  - **`?category=` was not added to `/shop`** — `/category/[slug]` is the single canonical URL for
    products-by-category, per `CATEGORY_REQUIREMENTS.md`'s explicit no-duplicate-content rule.
  - Verified against a live `npm run start` server (fresh build each time during isolation testing):
    `/category/electronics` (parent) lists its own plus both children's products (`Bluetooth Speaker`,
    `Wireless Headphones`); `/category/speakers` (child) lists only its own product with a working
    parent breadcrumb link; a genuinely empty category (created and deleted via a temporary debug route
    during verification only, per the same pattern Milestone 22 used, since every seeded category has stock)
    renders **200** with the empty state; an unknown slug and an out-of-range `?page=` both return a
    real **404**; a simulated query failure (temporary forced throw, removed before committing) returns
    **500** via `error.tsx`; canonical tag is correct on page 1; marquee links and the product
    breadcrumb link both navigate to real category pages; no login prompt anywhere. One expected,
    temporary gap: the breadcrumb's `/categories` link 404s until Milestone 27b lands (next in this same
    session) — `Link` prefetching that URL logs a console 404 in the interim, self-resolving once
    Milestone 27b ships. `npm run type-check` and `npm run build` both pass; `/category/[slug]` is `●` SSG
    with three pre-rendered params (`electronics`, `headphones`, `speakers`).

### Milestone 27b — Categories landing page (`/categories`)
- **Goal**: A browsable index of the whole catalog structure — every top-level category with its children — giving customers and crawlers a single entry point into category browsing.
- **Files**: `app/(public)/categories/page.tsx` (new), `loading.tsx` (new)
- **Scope**: All top-level categories as cards (title, image, description), each listing its children as sub-links; ordered by `displayOrder` then title; every card and sub-link targets a live `/category/[slug]`; `generateMetadata`; server-rendered; a neutral empty state if no categories exist.
- **Dependencies**: Milestone 27a (every link on this page must resolve — building the index before the detail route would ship a page of 404s), Milestone 22
- **Testing**: All seeded top-level categories render with their children; every link resolves to a real category page; a parent with no children renders as a plain card without error; metadata is present and distinct; layout is correct at mobile, tablet, and desktop widths; no login required; `npm run type-check` and `npm run build` pass.
- **Rollback**: Delete `app/(public)/categories/`. Nothing else references it.
- **Commit message**: `Add categories landing page`
- **✅ Done (2026-08-18)**: `app/(public)/categories/page.tsx` and `loading.tsx` added. Cards render
  every top-level category from Milestone 22's `getTopLevelCategories()` — already ordered by `displayOrder`
  then title, matching the spec — with each child rendered as a sub-link chip. Every card and chip
  targets `/category/[slug]`. `revalidate = 3600`, same static-by-default reasoning as Milestone 27a. Unlike
  Milestone 27a's detail route, **this route has no `notFound()` path** (an empty catalog renders an empty
  state, not a 404), so it doesn't hit the `loading.tsx`/Suspense status-code conflict documented
  there — `loading.tsx` is included here exactly as scoped, safely. Verified against a live
  `npm run start` server: both seeded top-level categories ("Electronics & Gadgets", "Fashion" — the
  visible set depends on what's currently seeded) render with their children as working links; `<title>
  Categories</title>` metadata present. Also re-verified `Milestone 27a`'s product-page and marquee links to
  `/category/[slug]` still resolve, and confirmed the temporary gap noted in Milestone 27a's entry is now
  closed: the breadcrumb's `/categories` link returns 200, and the Playwright console-error check on
  `/category/electronics` (prefetching that link) now shows zero errors, versus one 404-fetch error
  before this milestone. `npm run type-check` and `npm run build` both pass; `/categories` is `○`
  Static with a 1h revalidate window.

> **Deliberately unchanged by the category work**: Milestone 24 (`/shop` stays the all-products + search listing — no `category` param is introduced, per [Architecture Decision Record 013](./DECISIONS.md#architecture-decision-record-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy)'s single-canonical-URL rule), Milestones 25, 28 and 40 (the new routes are server components from birth), and Milestone 43 (JSON-LD stays scoped to `Product` on product detail pages; category structured data is explicitly not Phase 1). These omissions are decided, not overlooked.

### Milestone 28 — Remove dummy data source and orphaned Redux slices
- **Goal**: Now that every storefront consumer has been re-pointed, delete the dummy-data file and the Redux slices that existed only to hold it.
- **Files**: `assets/assets.js` (deleted), `lib/features/product/productSlice.js` (deleted), `lib/features/rating/ratingSlice.js` (deleted), `lib/store.js` (trimmed to remaining reducers), `assets/product_img*.png`, `hero_*`, `happy_store.webp`, `profile_pic*.jpg` (deleted — placeholder imagery tied to the dummy dataset; real product/marketing photography to be supplied separately)
- **Dependencies**: Milestones 23, 24, 25, 26 and 27
- **Testing**: `npm run build` succeeds; `grep -r "assets/assets"` and `grep -r "productDummyData\|dummyRatingsData"` across `app`/`components`/`lib` return nothing.
- **Rollback**: `git revert` to restore all deleted files at once.
- **Commit message**: `Remove dummy data source and orphaned Redux slices now that storefront uses real data`
- **✅ Done (2026-08-18)**: `assets/assets.js` and every image it imported (`product_img1`–`product_img16.png`
  — four more than the file actually used, `hero_model_img.png`, `hero_product_img1.png`,
  `hero_product_img2.png`, `happy_store.webp`, `profile_pic1–3.jpg`, plus the unreferenced-anywhere
  `gs_logo.jpg` and `upload_area.svg`) are deleted. `lib/features/product/productSlice.js` and
  `lib/features/rating/ratingSlice.js` are deleted; `lib/store.js` trimmed to `cart` + `address`.
  - **⚠️ This milestone's own premise — "every storefront consumer has been re-pointed" — was false,
    and one of the two real gaps it hid was a live customer-facing bug, not a documentation nit.**
    `assets.js` had **five** consumers beyond the ones Milestones 23 to 27 migrated, none in this milestone's
    file list:
    1. **`app/(public)/cart/page.jsx` resolved cart line items against `state.product.list`
       (`productSlice.js`), populated only from the dummy dataset.** Since Milestones 23 to 25 gave every
       reachable product page a real Payload ID, and nothing has populated that Redux slice with real
       data since, **the cart has been silently dropping every item added from a real product page
       since Milestone 25 shipped** — `products.find(product => product.id === key)` never matched, so
       `cartArray` stayed empty and the page rendered "Your cart is empty" regardless of what was
       actually in `cartItems`. This is a correctness bug already live on `main`, not something this
       milestone would have introduced by deleting `productSlice.js` — deleting it only removes the
       broken crutch. **Fixed**, not deferred: `cart/page.jsx` now fetches real products via
       `GET /api/products?limit=0&depth=1` (a client component can't use the Local API — same
       sanctioned REST pattern `CategoriesMarquee.jsx` uses, Milestone 27) instead of the dead Redux slice,
       with the same `.url`/Media-relationship image resolution `ProductCard.jsx` uses and a
       `typeof category === 'object'` guard so a real `Category` relationship object renders its
       `.title` instead of throwing "Objects are not valid as a React child." No milestone in Milestones 30 to 36
       explicitly owns "resolve cart line items to real product data" (Milestone 30 is persistence only, Milestone 34
       is shipping totals only) — this was an orphaned fix, not one deferred by design, so it was made
       here rather than left broken for six more milestones.
    2. **`components/OrderItem.jsx` read `state.rating`** (`ratingSlice.js`, deleted this milestone)
       for its "Rate Product" / star-rating block. Deleting the slice without touching this file would
       have crashed `/orders` immediately. Same class of forced pull-forward as `ProductCard.jsx`
       (Milestone 23) and `ProductDetails.jsx`/`ProductDescription.jsx` (Milestone 25): the block is removed, not
       guarded — Reviews are out of scope for v1 (Architecture Decision Record 016) regardless. **Milestone 46's file list should have
       named `OrderItem.jsx` from the start and never did**; its entry below is corrected to note this.
    3. **`components/OurSpec.jsx`** (`ourSpecsData` — site USP copy/icons, not product data) and
       **`lib/features/address/addressSlice.js`** (`addressDummyData` — the checkout address form's
       still-dummy default, Milestone 31's job to replace) both imported small, self-contained data literals
       from `assets.js` that had nothing to do with the dummy product/rating dataset. Both are inlined
       into their sole consumer, unchanged in content, so `assets.js` could be deleted outright without
       forcing either file's real migration ahead of its own milestone.
    4. **`app/(public)/orders/page.jsx`** imports `orderDummyData`, which embeds `productDummyData`
       (with the now-deleted `product_img*.png` imports), `dummyUserData`, `addressDummyData`, and
       `couponDummyData` — a genuinely out-of-scope page: Milestone 36 is explicitly the milestone that
       replaces its dummy listing with real guest order lookup, and this milestone group's own
       "deliberately unchanged" note (above Milestone 28's entry) does not list `/orders` only because the
       category work never touched it, not because it was already handled. A trimmed, self-contained,
       image-free `orderDummyData` (same shape, same values, `images: []`) is now inlined directly in
       `orders/page.jsx` instead — the page's behavior is byte-for-byte the same dummy listing it was
       before this milestone; only the data's location and its dependency on now-deleted image files
       changed. `OrderItem.jsx` already guards a missing `product.images[0]` (`{item.product.images?.[0] &&
       ...}`) rather than rendering a broken image icon.
    5. **`components/Hero.jsx`** used `assets.hero_model_img`/`hero_product_img1`/`hero_product_img2`
       for its banner artwork. This milestone's own file list already commits to deleting those exact
       images ("real product/marketing photography to be supplied separately"), so `Hero.jsx` was
       always going to need this fix regardless of whether it appeared in the file list. The three
       `<Image>` elements are replaced with plain gradient placeholder `<div>`s at the same dimensions
       (no layout shift), not left as broken image references or removed outright (which would have
       collapsed the hero's layout).
  - The literal testing text ("`grep -r "assets/assets"` ... return nothing") is satisfied for live
    code — no `import`/`from` statement references it anywhere. A handful of `// M28: ...` comments
    that name `assets/assets.js` for historical/migration context (in `OurSpec.jsx`, `addressSlice.js`,
    `orders/page.jsx`) remain, since stripping accurate history to satisfy a literal grep would be
    worse than the comments themselves.
  - Verified against a live `npm run start` server: `npm run type-check` and `npm run build` both pass;
    `/`, `/shop`, `/product/3`, `/cart`, `/orders`, `/category/electronics`, `/categories` all return
    200. The cart fix specifically verified in a real headless-Chromium browser (Playwright, using
    client-side `<Link>` navigation rather than `page.goto` — a hard reload would wipe Redux state
    since Milestone 30's persistence fix hasn't landed yet, which is a separate, expected limitation, not a
    regression): adding "Bluetooth Speaker" from `/product/3` and navigating to `/cart` now renders the
    product's name, category, price, quantity, running total, and image — previously it rendered "Your
    cart is empty." Zero console errors throughout.

---

## Group: Search — Milestone 29

### Milestone 29 — Replace client-array search with a real query
- **Goal**: The current search filters an in-memory Redux array with `.includes()` — replace with a real query against Payload/Postgres so it scales past a handful of seeded products.
- **Files**: `app/(public)/shop/page.jsx`, `lib/payload/products.ts`
- **Dependencies**: Milestone 24
- **Testing**: Search for a seeded product name returns correct results; search for a non-matching term returns an empty state, not an error.
- **Rollback**: Revert both files.
- **Commit message**: `Replace client-side array search with real product query`
- **✅ Done (2026-08-26)**. Search semantics locked ahead of implementation as [Architecture Decision Record 025](./DECISIONS.md#architecture-decision-record-025-milestone-29-product-search-is-a-case-insensitive-contains-match-on-name-only) — case-insensitive substring match on `name` only, using Payload's `contains` operator, verified empirically to map to Postgres `ILIKE`. `getProducts()` gained an optional `search` parameter applying `where: { name: { contains: search } } }`; `shop/page.jsx` passes it straight through instead of filtering the fetched array. Verified against a live `npm run start` server with seeded data: exact/case-varied/mid-string matches all correct, non-matching term renders an empty grid at HTTP 200, empty search returns the full listing, and a description-only term correctly returns nothing (confirming `description` is excluded). The home page's unrelated `getProducts()` call is unaffected. `npm run type-check` and `npm run build` both pass; `/shop` stays `ƒ Dynamic`.

---

## Group: Cart persistence & guest checkout (cash on delivery) — Milestones 30 to 36

### Milestone 30 — Fix cart persistence
- **Goal**: The cart is currently in-memory-only and empties on refresh — a real problem with no account to recover it from. Persist it (e.g. `localStorage`).
- **Decided**: [Architecture Decision Record 023](./DECISIONS.md#architecture-decision-record-023-cart-state-stays-redux-with-localstorage-persistence-added) (2026-08-18) — Redux stays; `localStorage` persistence is added to the existing slice, not a state-library swap. Closes readiness finding [D10](./PHASE_1_READINESS_REPORT.md#d10--cart-state-mechanism).
- **Files**: `lib/features/cart/cartSlice.js`, `app/StoreProvider.js`
- **Dependencies**: none — independent of all Payload work; may land at any point in the sequence.
- **Testing**: Add items to cart, refresh the page, confirm the cart still shows the same items.
- **Rollback**: Revert both files.
- **Commit message**: `Persist cart state across page reloads`
- **✅ Done (2026-08-26)**. `cartSlice.js` gained a `hydrateCart` reducer that recomputes `total` from the restored `cartItems` rather than persisting `total` directly. `StoreProvider.js` hydrates from `localStorage` inside a `useEffect` (after mount, avoiding an SSR/client hydration mismatch on the server-rendered navbar badge) and persists via `store.subscribe` on every mutation, including `clearCart`. Both directions are guarded against malformed/absent storage. Verified with a scripted headless-Chromium session against a live `npm run start` server: cart survives a reload, corrupted storage (malformed JSON / non-object / array) degrades to an empty cart with no crash, `clearCart` empties storage and stays empty after reload, and a directly-seeded cart hydrates to the correct derived total. `lib/store.js` was not touched. `npm run type-check` and `npm run build` both pass.

### Milestone 31 — Redesign guest address capture
- **Goal**: `AddressModal`'s submit handler currently does nothing. Wire it to real guest-checkout address capture with Pakistani address field conventions (phone-first, city/area), per [PROJECT_SPEC.md](./PROJECT_SPEC.md).
- **Files**: `components/AddressModal.jsx`
- **Dependencies**: none
- **Testing**: Fill out the form, submit, confirm the address is available to the checkout flow that consumes it (verified together with Milestone 33).
- **Rollback**: Revert the file.
- **Commit message**: `Wire guest address form to real checkout state with Pakistani address fields`
- **✅ Done (2026-08-26)**. Field set is now `name`, `phone`, `email`, `address`, `city`, `area` — phone ordered ahead of email, matching `collections/Orders.ts`'s embedded guest-address fields exactly ([Architecture Decision Record 021](./DECISIONS.md#architecture-decision-record-021-guest-orders-use-embedded-address-fields-not-a-customers-collection)). `email` is kept per stakeholder decision even though `Orders` has no email column today. `handleSubmit` now dispatches the pre-existing, previously-unused `addAddress` reducer instead of just closing the modal. Phone gets an HTML5 pattern (`03XXXXXXXXX`). **Scope excursion, stakeholder-approved**: `components/OrderSummary.jsx`'s two address-display lines referenced the removed `state`/`zip` fields and were fixed alongside — left as-is they would have shown blank fields for every newly submitted address. The still-present dummy seed address (`lib/features/address/addressSlice.js`, not on this milestone's Files line) now displays with blank fields rather than its old US-shaped ones — found, not fixed. Verified with a scripted headless-Chromium session (18 checks) against a live `npm run start` server: correct field set/order, submitted address appears and renders correctly in `OrderSummary`'s dropdown with no "undefined", required and phone-pattern validation both work, multiple additions persist in one session. `npm run type-check` and `npm run build` both pass; `/cart` remains `○ Static`.

### Milestone 32 — Remove the Stripe option from checkout user interface
- **Goal**: Cash on delivery is the only payment method for launch, per [Architecture Decision Record 004](./DECISIONS.md); the Stripe radio button was never functional and shouldn't be presented as a choice.
- **Files**: `components/OrderSummary.jsx`
- **Dependencies**: none
- **Testing**: Checkout user interface shows cash on delivery only, no radio group needed.
- **Rollback**: Revert the file.
- **Commit message**: `Remove non-functional Stripe option from checkout UI (COD-only for launch)`
- **✅ Done (2026-08-26)**. Both radio inputs removed (not just Stripe's — a single always-true option has no business being a radio group, per the Testing line). Cash on delivery now renders as a plain `"Cash on Delivery (COD)"` label. `paymentMethod` changed from `useState` to a plain `const` — nothing can set it to anything else anymore. [Architecture Decision Record 004](./DECISIONS.md#architecture-decision-record-004-cash-on-delivery-only-for-launch-architecture-stays-payment-extensible)'s Consequences line already specified this exact outcome; no open decision existed. Verified with a scripted headless-Chromium session against a live `npm run start` server: no "Stripe" text anywhere, zero radio inputs, cash on delivery still shown, "Place Order" still navigates to `/orders`. `npm run type-check` and `npm run build` both pass; `/cart` remains `○ Static`.

### Milestone 33 — Real order creation on "Place Order"
- **Goal**: Replace the `router.push('/orders')` stub with real order creation, using the cart contents and guest address. **Per [Architecture Decision Record 026](./DECISIONS.md#architecture-decision-record-026-orders-are-created-only-by-a-server-side-function--orders-collection-create-access-closes-to-admins) (Accepted 2026-10-09) this is a server action calling a server-side function that derives prices, shipping, totals, and status itself — not a client `POST` to the `Orders` collection**, whose `create` access is closed to admins.
- **Files**: `components/OrderSummary.jsx`, `lib/payload/orders.ts` (new); **per Architecture Decision Record 026 also** `collections/Orders.ts` (`create` access), `app/(public)/cart/actions.ts` (new server action), `lib/rate-limit.ts` (new, shared with Milestone 36)
- **Dependencies**: Milestones 13, 30, 31 and 32
- **Testing**: Add items, fill address, place order; confirm a real `Order` record appears in `/admin` with correct line items, total, and `paymentMethod: COD`. **Also (Architecture Decision Record 026):** anonymous `POST /api/orders` and the GraphQL `createOrder` mutation are refused; a tampered client price/total/status is ignored; invalid carts and guest details create nothing; creation is rate-limited by IP.
- **Rollback**: Revert the files above, **including the `Orders.create` access change**.
- **Commit message**: `Create real orders on checkout instead of navigating to a stub page`
- **✅ Done (2026-10-09)**. Implemented per Architecture Decision Record 026: `createOrder` (`lib/payload/orders.ts`) behind the `placeOrder` server action (`app/(public)/cart/actions.ts`), `lib/rate-limit.ts` (shared with Milestone 36), `Orders.create` closed to admins, `OrderSummary.jsx` wired with double-submit guard and success toast showing the order number. **Scope excursions**: the shipping/total *display* from Milestone 34 was pulled forward (the user interface must not show "Free" while the order records a shipping charge); the dummy US address was removed from `addressSlice.js`; stale lint and continuous integration notes corrected in `GATES.md`/`CONVENTIONS.md`. Verified by quality assurance on a live server and reviewed by Security/Performance; see `CHANGELOG.md` for findings not fixed.

### Milestone 33a — Enforce stock at order creation
- **New milestone, inserted 2026-08-18** — closes readiness risk [R5](./PHASE_1_READINESS_REPORT.md#r5--out-of-stock-enforcement-is-called-launch-critical-and-then-never-implemented):
  `FEATURE_MATRIX.md` calls in-stock/out-of-stock enforcement *"launch-critical for cash on delivery (must not accept
  orders for unavailable items)"*, `Products.inStock` has existed since Milestone 10, and yet no milestone
  ever validated it at order creation — Milestone 33's original goal and acceptance test say nothing about
  stock. For cash on delivery specifically this is a direct cost, not a cosmetic gap: accepting an order for
  something unavailable means a wasted dispatch attempt or a cancellation call, and failed-delivery/RTO
  cost is already the dominant margin risk in this market (per `PROJECT_SPEC.md`'s Pakistan-market
  context). Hiding the "Add to Cart" button for an out-of-stock product is necessary but not
  sufficient: stock can change between when a page was rendered/cached and when "Place Order" is
  clicked, and a client-side-only check is trivially bypassed by anyone calling the order-creation
  endpoint directly.
- **Goal**: At order creation, re-check every line item's `Products.inStock` **server-side**, using
  current data at the moment of creation — never a value cached from an earlier page render or trusted
  from the client. If any line item's product is out of stock, reject the entire order (no partial
  orders) with a clear error identifying which product(s) failed, and create nothing.
- **Files**: `lib/payload/orders.ts` (the order-creation function Milestone 33 adds), `components/OrderSummary.jsx`
  (surface the rejection — which product(s), so the customer can remove them and retry, not a generic
  failure)
- **Dependencies**: Milestone 33 (the order-creation function this validates against must exist first)
- **Testing**: Placing an order where every line item is in stock succeeds exactly as Milestone 33 already
  tests. Placing an order containing an out-of-stock line item is rejected **server-side** — verified
  by calling the order-creation path directly (a script or a temporary debug route, not just clicking
  through the user interface with an already-hidden button), confirming no `Order` record is created and the
  customer sees which product(s) blocked the order. A product going out of stock *after* the cart page
  loaded but *before* "Place Order" is clicked is still caught (proves the check reads current data,
  not a stale client-side value).
- **Rollback**: Revert both files.
- **Commit message**: `Enforce server-side stock validation at order creation`
- **✅ Done (2026-10-09)**. Implemented at the seam Milestone 33 left in `createOrder`: stock is read from the same `payload.find` as prices, fail-closed (`inStock !== true` is unavailable), whole-order rejection with a new `OUT_OF_STOCK` code carrying `unavailable: [{id, name}]`; `OrderSummary.jsx` shows one toast naming the blocked products and keeps the cart. No scope excursions. Verified by quality assurance against a live server: direct calls (all in stock, one/mixed/multiple out of stock, unknown + out-of-stock, `inStock = NULL` fails closed), stock flipped after the cart loaded, Milestone 33 regression, no personally identifiable information in logs.

### Milestone 34 — Confirm shipping/total calculation rules
- **Goal**: Wire the cart/checkout total calculation to the decided shipping model: flat rate + free-shipping threshold, both read from the `Settings` global (Milestone 13a) at order-creation time and snapshotted onto the order — never recomputed live. Per [Architecture Decision Record 018](./DECISIONS.md#architecture-decision-record-018-shipping-model--flat-rate-with-a-free-shipping-threshold-snapshotted-per-order).
- **Files**: `app/(public)/cart/page.jsx`, `components/OrderSummary.jsx`
- **Dependencies**: Milestone 33, **Milestone 13a** (reads `shippingFlatRate`/`freeShippingThreshold` from Settings)
- **Testing**: Totals shown at checkout apply the flat rate below the threshold and `0` shipping at/above it, for a sample order.
- **Rollback**: Revert both files.
- **Commit message**: `Apply confirmed shipping/total calculation rules at checkout`
- **✅ Done (2026-10-09) — no separate commit.** The rule is implemented in `createOrder` (`lib/payload/orders.ts`: `shippingCost = subtotal >= freeShippingThreshold ? 0 : shippingFlatRate`, both read from `Settings` at order time and snapshotted onto the order) from Milestone 33, and the checkout display (`OrderSummary.jsx` fetches the same two Settings values; `Free` when shipping is `0`) was pulled forward at the same time. Verified in Milestone 33's quality assurance (boundaries 2999 / 3000, rate 0 and 350, price-change snapshot) and the cleanup batch's scoped quality assurance with mocked Settings. `app/(public)/cart/page.jsx` needed no change.

### Milestone 35 — Order confirmation flow
- **Goal**: After a successful cash on delivery order, show a real confirmation (order number, summary) instead of the current dummy `/orders` listing.
- **Files**: `app/(public)/orders/page.jsx` or a new `app/(public)/order-confirmation/[orderId]/page.jsx`
- **Dependencies**: Milestone 33
- **Testing**: Placing an order lands on a confirmation view showing that order's real data.
- **Rollback**: Revert/delete the new/changed route.
- **Commit message**: `Add real order confirmation flow after guest checkout`
- **✅ Done (2026-10-09)**. Per [Architecture Decision Record 027](./DECISIONS.md#architecture-decision-record-027-milestone-35-order-confirmation-is-rendered-from-the-placeorder-response-held-in-sessionstorage--no-server-read-of-orders) the route is a fixed `app/(public)/order-confirmation/` page (client-rendered, `noindex`) fed by the `placeOrder` response in `sessionStorage` — **not** a `[orderId]` route reading `Orders`. **Files beyond the plan line**: `lib/payload/orders.ts` (result gains `items`), `lib/order-confirmation.ts` (new, client-safe storage helpers + validator), `components/OrderSummary.jsx` (store the response and navigate). Verified by quality assurance on a live server: real data incl. server-snapshot prices, reload, empty-storage state, 13 malformed-storage cases, escaped text, storage-blocked fallback, no order-data network reads, Milestones 33 and 33a regression.

### Milestone 36 — Guest order lookup
- **Goal**: Since there are no accounts, "My Orders" needs a non-account lookup mechanism (e.g. order ID + phone/email), replacing the current dummy-data table.
- **Decided**: [Architecture Decision Record 024](./DECISIONS.md#architecture-decision-record-024-guest-order-lookup-via-a-dedicated-ordernumber-phone-endpoint--orders-collection-access-stays-admin-only) (2026-08-18) — a dedicated server action/route taking `(orderNumber, phone)`, returning exactly one order, rate-limited by IP. `Orders`' Milestone 13 collection access (admin-read-only) does **not** change; the lookup uses `overrideAccess: true` internally, server-side only. Closes readiness findings [C7](./PHASE_1_READINESS_REPORT.md#c7--milestone-13s-access-control-rules-forbid-exactly-what-milestone-36-requires) and [D9](./PHASE_1_READINESS_REPORT.md#d9--guest-order-lookup-key-and-abuse-controls).
- **Files**: `app/(public)/orders/page.jsx`, `components/OrderItem.jsx`, `lib/payload/orders.ts`
- **Dependencies**: Milestones 33 and 35
- **Testing**: A correct `(orderNumber, phone)` pair returns exactly that order; a wrong phone with a correct order number returns nothing; the lookup endpoint is rate-limited by IP (repeated bad attempts get throttled, not silently retried forever); anonymous `GET /api/orders`/`GET /api/orders/[id]` still fail per Milestone 13's original acceptance test, confirming collection access itself was never relaxed.
- **Rollback**: Revert the three files.
- **Commit message**: `Add guest order lookup by order reference`
- **✅ Done (2026-10-09)**. Implemented per Architecture Decision Record 024 (its text says `guestPhone`; the real field is `phone`): `lookupOrder` in `lib/payload/orders.ts` (strict string validation, one `find` on order number + phone, `overrideAccess: true` server-side, whitelisted result, identical `NOT_FOUND` for any mismatch), `lookupOrderAction` in `app/(public)/orders/actions.ts`, the `/orders` form (`page.tsx` + `OrderLookup.tsx`, `noindex`, prefilled from the tab's last order), `components/OrderItem.jsx` rewritten to the real order shape (this also covers the substance of Milestone 39), `lib/client-ip.ts` (shared with order placement). **Owner-approved rate limits**: 20 lookups/hour per IP (every request counts); 5 **failed** lookups/hour per order number — successful lookups and malformed phones do not count — via `createBucketLimiter` in `lib/rate-limit.ts` (fixed 65,536 HMAC-keyed buckets, never evicts, slot reserved before the query and refunded unless the result is `NOT_FOUND`). Accepted trade-off: someone who knows an order number can use up its 5 failed attempts for an hour. Verified by quality assurance on a live server in two rounds (correctness, no-oracle, injection-style inputs, both limits through the real action path, parallel burst, 5,000-key flood resistance, failures-only counting, unchanged access control, personally-identifiable-information-free logs) and a full G6 security review (no Blocker).

---

## Group: Orders & admin fulfillment — Milestones 37 to 39

### Milestone 37 — Verify admin order management via Payload
- **Goal**: Confirm the store admin can view and manage all incoming orders directly in Payload's `/admin` — no custom user interface needed for the base case.
- **Files**: none changed — verification only; `collections/Orders.ts` admin user interface config tweaks if list/detail views need field visibility adjustments
- **Dependencies**: Milestone 33
- **Testing**: Place a few test orders; confirm an admin can see, open, and read full details of each in `/admin`.
- **Rollback**: Revert any admin user interface config tweaks made.
- **Commit message**: `Tune Orders admin UI for fulfillment visibility`
- **✅ Done (2026-10-09)**. Quality assurance first evaluated the admin as-is, then `collections/Orders.ts` was tuned with **admin-UI configuration only**: `admin.listSearchableFields` (order number, name, phone, city — search previously matched only the order number), `admin.defaultColumns` (phone and city added), `defaultSort: '-createdAt'`, and snapshot-field descriptions. Verified on a live admin: schema byte-identical (`pg_dump --schema-only` before/after), access unchanged, search/filters/sort work on desktop and mobile.

### Milestone 38 — Order status update flow for admin
- **Goal**: Ensure the admin can move an order through its status workflow (`PLACED` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED`, plus terminal `CANCELLED`/`RETURNED` — per [Architecture Decision Record 019](./DECISIONS.md#architecture-decision-record-019-order-status-set-includes-confirmed-cancelled-and-returned)) — via Payload's native admin editing unless a dedicated view is required.
- **Files**: `collections/Orders.ts` (status field admin config)
- **Dependencies**: Milestones 12 and 37
- **Testing**: Update a test order's status via `/admin`, including to `CONFIRMED`, `CANCELLED`, and `RETURNED`; confirm it persists and is reflected wherever order status is displayed to the guest (Milestone 36).
- **Rollback**: Revert config changes.
- **Commit message**: `Enable order status updates through Payload admin`
- **✅ Done (2026-10-09)**. Payload's native editing already supported the workflow; the config now puts `status` and `isPaid` in the sidebar next to Save with guidance text (any status can follow any other, Architecture Decision Record 019; for cash on delivery tick Is Paid when the cash is collected — it is not set automatically). Verified through the user interface: PLACED → CONFIRMED → PROCESSING → SHIPPED → DELIVERED, CANCELLED and RETURNED each saved, persisted after reload, and were shown correctly to the guest by `lookupOrder` and the `/orders` page. Not done (owner decisions): locking `orderNumber` at the API level.

### Milestone 39 — Align OrderItem component to the real Orders schema
- **Goal**: `OrderItem.jsx` currently assumes the dummy order shape; align it to the real `Orders` collection shape from Milestones 11 and 12.
- **Files**: `components/OrderItem.jsx`
- **Dependencies**: Milestone 36
- **Testing**: Guest order lookup (Milestone 36) renders order line items correctly with no shape mismatches.
- **Rollback**: Revert the file.
- **Commit message**: `Align OrderItem component to real Orders collection schema`
- **✅ Done (2026-10-09) — delivered inside Milestone 36** (no separate commit): `components/OrderItem.jsx` was rewritten to the real lookup result shape (lines, totals, status badge for all seven statuses, delivery details, Paid/Unpaid) and verified by Milestone 36's quality assurance.

---

## Group: Search engine optimization — Milestones 40 to 43

### Milestone 40 — Convert storefront layout/pages to server components
- **Goal**: Remove unnecessary `'use client'` directives from the public layout and home page so they render server-side, per the search-engine-optimization-first requirement.
- **Files**: `app/(public)/layout.jsx`, `app/(public)/page.jsx`
- **Dependencies**: Milestone 23 (real data already server-fetchable)
- **Testing**: View page source and confirm product content is present in the initial HTML response, not only after client hydration.
- **Rollback**: Revert both files.
- **Commit message**: `Convert public layout and home page to server components`

### Milestone 41 — Per-page metadata
- **Goal**: Add `generateMetadata` to product, shop, and home pages, replacing the single site-wide static title/description, and normalize canonical/Open Graph tags across every storefront route.
- **Files**: `app/(public)/product/[productId]/page.jsx`, `app/(public)/shop/page.jsx`, `app/(public)/page.jsx`, `app/layout.jsx`, `app/(public)/category/[slug]/page.tsx`, `app/(public)/categories/page.tsx`
- **Scope on the category routes is normalization, not creation**: Milestones 27a and 27b ship their own `generateMetadata` and canonicals, since [Architecture Decision Record 007](./DECISIONS.md#architecture-decision-record-007-search-engine-optimization-first-and-mobile-first-are-default-requirements-not-a-later-pass) makes search engine optimization part of a storefront route's definition of done. This milestone verifies them and brings them into line with the site-wide canonical/OG conventions it establishes.
- **Dependencies**: Milestones 25 and 40, **Milestones 27a and 27b** (the category routes must exist before this pass can cover them)
- **Testing**: Inspect rendered `<head>` per route; each shows a distinct, relevant title/description. Category and paginated category pages carry correct canonicals.
- **Rollback**: Revert the touched files.
- **Commit message**: `Add per-page SEO metadata via generateMetadata`

### Milestone 42 — sitemap.xml and robots.txt
- **Goal**: Add Next.js file-convention sitemap and robots files, generated from real product/category data.
- **Files**: `app/sitemap.ts` (new), `app/robots.ts` (new)
- **Category entries**: the sitemap lists `/categories` plus one `/category/{slug}` per published category, parent and child alike, sourced from `getTopLevelCategories()`/`getCategoryBySlug()` (Milestone 22) so it cannot drift from what the routes actually serve. Paginated variants (`?page=N`) are **not** listed — they are reachable via `rel=next` from page 1.
- **Dependencies**: Milestone 22, **Milestones 27a and 27b** (previously Milestone 22 alone — but the goal's "real seeded products/categories" requires category URLs to exist, and no milestone created them until now)
- **Testing**: `/sitemap.xml` and `/robots.txt` return valid content listing real seeded products/categories. Every category URL in the sitemap resolves to a 200; `/categories` is present.
- **Rollback**: Delete both new files.
- **Commit message**: `Add sitemap.xml and robots.txt generated from real catalog data`

### Milestone 43 — JSON-LD structured data for products
- **Goal**: Add `Product` structured data to product detail pages for rich search results.
- **Files**: `app/(public)/product/[productId]/page.jsx`
- **Dependencies**: Milestones 25 and 41
- **Testing**: Validate the rendered JSON-LD against Google's Rich Results structured-data requirements for the `Product` type.
- **Rollback**: Revert the file.
- **Commit message**: `Add JSON-LD structured data to product pages`

---

## Group: Mobile-first audit — Milestones 44 to 45

### Milestone 44 — Component-by-component mobile review
- **Goal**: Audit every storefront component and route for mobile-first correctness (tap targets, layout at small widths, readable type), per [PROJECT_SPEC.md](./PROJECT_SPEC.md).
- **Files**: `components/**` (storefront-facing; fixes scoped per component found to need them), plus the category routes `app/(public)/categories/**` and `app/(public)/category/**`
- **Category routes are in scope**: `/categories` and `/category/[slug]` must work at mobile, tablet, and desktop widths — grid column counts, category-name wrapping, breadcrumb degradation on narrow viewports, and pagination tap targets. Expectations are enumerated in [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md).
- **⚠️ Known gap carried in from Milestone 21 (2026-08-17)**: `components/Navbar.jsx` renders **nothing but the logo below the `sm` breakpoint**. Its real navigation (Home/Shop/search/Cart) is `hidden sm:flex`, and the only mobile-visible element used to be the dead Login button that Milestone 21 removed. So mobile currently has **no cart access and no navigation**. Milestone 21 did not introduce this — mobile never had a cart link — and fixing it was correctly out of Milestone 21's single-button scope, but it is a direct [Architecture Decision Record 007](./DECISIONS.md#architecture-decision-record-007-search-engine-optimization-first-and-mobile-first-are-default-requirements-not-a-later-pass) violation for a majority-mobile market and should be among the first things this milestone fixes.
- **Dependencies**: Milestone 28 (real data in place, so the audit reflects real content, not placeholders), **Milestones 27a and 27b**
- **Testing**: Manually test the golden path (browse → category → product → cart → checkout) at common mobile, tablet, and desktop viewport widths; no horizontal scroll, no unreachable controls.
- **Rollback**: Revert whichever specific component fixes are found to be wrong.
- **Commit message**: `Mobile-first layout and interaction fixes across storefront components`

### Milestone 45 — Mobile performance pass
- **Goal**: Address load performance on mid-tier mobile devices/slower connections — image sizing, font loading, bundle size.
- **Files**: `next.config.mjs`, `app/layout.jsx`, image-heavy components identified in Milestone 44
- **Dependencies**: Milestone 44
- **Testing**: Run a mobile Lighthouse/PageSpeed pass on the storefront; confirm meaningful improvement over the pre-audit baseline.
- **Rollback**: Revert the specific performance changes found to regress anything.
- **Commit message**: `Improve mobile load performance (images, fonts, bundle size)`

### Milestone 45a — Premium storefront visual refresh
- **Goal**: Give the storefront a premium look ("Graphite & Jade" design tokens in `app/globals.css`: graphite ink on a warm canvas, a jade accent, large radii, soft shadows) without changing behaviour, data, Payload config, checkout or the order guards. Hero with floating tiles of real products; round, tinted category row; rounded product cards with real badges only (discount from `mrp`/`price`, out of stock); product page with an arched image well, an image counter, pill badges and one action bar (Add to Cart + Buy Now) pinned to the bottom below `lg`. Out of scope, deliberately: size/colour selectors (products have no variants; that needs a schema milestone), wishlist hearts, ratings (Architecture Decision Record 016), a profile tab (no customer login) and any claim the store does not back.
- **Files**: `app/globals.css`, `app/(public)/layout.jsx`, `app/(public)/page.jsx`, `app/(public)/product/[productId]/page.jsx`, `app/(public)/shop/page.jsx`, `app/(public)/category*`, `components/{AnnouncementBar,CategoryRow}.tsx` (new), `components/{Hero,Navbar,ProductCard,ProductDetails,ProductDescription,Counter,Title,LatestProducts,BestSelling,OurSpec,Footer}.jsx`; colour-token swaps only in the cart/checkout/order components. Removes `components/CategoriesMarquee.jsx`.
- **Dependencies**: Milestones 44, 45, 55a and 56a
- **Testing**: `npm run type-check`, `npm run lint` (0 errors), `npm run build`; no horizontal scroll at 320/390/1440px on every storefront route; the full Playwright suite (one "Add to Cart", the Milestone 40 category links and product in the home HTML, 44px header targets) passes in continuous integration.
- **Rollback**: Revert the pull request; no data or schema involved.
- **Commit message**: `Premium storefront visual refresh (M45a)`
- **✅ Done** — merged to `main` in pull request #24 (`67a9102`); status confirmed by the owner on 2026-10-23 (TASKS.md had still said "In review"). Its tokens are superseded by Milestone 60.

---

## Group: Reviews & Coupons — decide and land minimal scope — Milestones 46 to 48

Per [FEATURE_MATRIX.md](./FEATURE_MATRIX.md), both are **Future Phase**–leaning with an open identity/targeting question in [PROJECT_SPEC.md](./PROJECT_SPEC.md). These milestones resolve that ambiguity rather than assuming an outcome.

### Milestone 46 — Remove review submission for v1
- **Goal**: Reviews are decided out of scope for v1 — [Architecture Decision Record 016](./DECISIONS.md#architecture-decision-record-016-reviews-are-out-of-scope-for-v1). Execute the removal path: delete `RatingModal.jsx` and its entry points, and strip the dummy star-rating display.
- **Files**: `components/RatingModal.jsx`, `components/ProductDescription.jsx`, `components/ProductDetails.jsx`
- **`components/ProductCard.jsx` moved to Milestone 23** (2026-08-17). Its star-rating block read `product.rating`, which real Payload products do not have, so Milestone 23 could not render real data on the home page until the block was removed — the change was forced ~23 milestones earlier than this milestone sits. Already done; nothing left here for that file.
- **`components/ProductDetails.jsx` and `components/ProductDescription.jsx` moved to Milestone 25** (2026-08-18), same reasoning: both read `product.rating` and would have thrown before rendering the product detail page on real data. Already done; nothing left here for either file.
- **`components/OrderItem.jsx` moved to Milestone 28** (2026-08-18) — **this file should have been in this milestone's file list from the start and never was.** It read `state.rating` (`ratingSlice.js`), which Milestone 28 deletes as one of the two orphaned Redux slices; deleting the slice without touching this file would have crashed `/orders`. The "Rate Product" / star-rating block is removed, not guarded — Reviews are out of scope for v1 (Architecture Decision Record 016) regardless of which milestone happened to force the fix. Already done; nothing left here for that file. `RatingModal.jsx` itself is untouched — deleting it (and its now-orphaned import in this file, already gone) remains this milestone's job.
- **Dependencies**: Milestone 25
- **Testing**: No dead entry points remain; no star-rating user interface references the removed dummy rating data; `npm run build` succeeds.
- **Rollback**: Revert the touched files.
- **Commit message**: `Remove review submission for v1 (ADR-016)`
- **✅ Done (2026-10-09)**, in the fast-track cleanup batch. `Rating.jsx` and `RatingModal.jsx` were already orphaned (no importers) and are deleted; the star-rating code in `ProductCard`/`ProductDetails`/`ProductDescription` had been removed earlier (Milestones 23 and 25).

### Milestone 47 — Remove coupon input for v1
- **Goal**: Coupons are decided out of scope for v1 — [Architecture Decision Record 017](./DECISIONS.md#architecture-decision-record-017-coupons-are-out-of-scope-for-v1). Execute the removal path: remove the coupon-code input from `OrderSummary.jsx`.
- **Files**: `components/OrderSummary.jsx`
- **Dependencies**: Milestone 33
- **Testing**: No non-functional coupon input remains in the checkout user interface; `npm run build` succeeds.
- **Rollback**: Revert the file.
- **Commit message**: `Remove coupon input for v1 (ADR-017)`
- **✅ Done (2026-10-09)**. All coupon state, handler, markup and total-line branches removed from `OrderSummary.jsx`; shipping/total logic and order placement untouched. Verified with a database-free dev server and mocked network responses.

### Milestone 48 — Clean up any remaining dead ends from Milestones 46 and 47
- **Goal**: Sweep for any leftover references (nav links, footer copy, unused imports) tied to whichever paths were removed in Milestones 46 and 47.
- **Files**: identified during Milestones 46 and 47, likely `components/Footer.jsx`
- **Dependencies**: Milestones 46 and 47
- **Testing**: `npm run build` succeeds; manual click-through finds no dead links or references to removed functionality.
- **Rollback**: Revert the specific cleanup commit.
- **Commit message**: `Clean up references to deferred/removed reviews and coupons functionality`
- **✅ Done (2026-10-09)**. The sweep found one real leftover: `components/Banner.jsx`, rendered on every page by `app/(public)/layout.jsx`, advertised "Get 20% OFF on Your First Order!" and copied the non-existent coupon code `NEW20` — deleted with its layout usage (coupons are out of scope, Architecture Decision Record 017). Footer copy was **not** changed here: its dead links and fake contact details belong to Milestone 55a.

### Milestone 48a — Remove non-functional Newsletter signup
- **New milestone, inserted 2026-08-18** — closes readiness risk [R11](./PHASE_1_READINESS_REPORT.md#r11--newsletterjsx-is-left-in-limbo):
  `Newsletter.jsx`'s form has no submit handler at all — it silently discards whatever a customer
  types, the same defect class (a `toast.promise` wrapped around nothing, or in this case not even
  that) that the dead Login button (Milestone 21) and the dead coupon input (Milestone 47) were removed for. No
  milestone wired it to a real subscribe mechanism or dropped it. Kept separate from Milestone 48 rather than
  folded into it, since Milestone 48's own scope is explicitly leftover references *from Milestones 46 and 47* —
  `Newsletter.jsx` is unrelated to Reviews/Coupons and deserves its own commit, not scope creep into a
  differently-scoped cleanup milestone.
- **Goal**: Remove the non-functional newsletter signup form. There is no email-marketing plan or
  provider decided for v1 (Resend's free tier, per Architecture Decision Record 015, is transactional email — order
  confirmations, not marketing lists) — revisit if/when one exists, as new, real functionality, not by
  resurrecting this form.
- **Files**: `components/Newsletter.jsx` (deleted), `app/(public)/page.jsx` (remove the import/usage)
- **Dependencies**: none
- **Testing**: No newsletter form renders anywhere on the storefront; `npm run build` succeeds; no dead
  import remains.
- **Rollback**: `git revert` to restore both files.
- **Commit message**: `Remove non-functional newsletter signup form`
- **✅ Done (2026-10-09)**. `Newsletter.jsx` deleted and removed from the home page (closes readiness risk `R11`).

---

## Group: Dockerization & production readiness — Milestones 49 to 54

> **Target infrastructure baseline is decided** — [Architecture Decision Record 015](./DECISIONS.md#architecture-decision-record-015-initial-production-infrastructure-baseline): Cloudflare Free + a single ~$10–12/month virtual private server running the Dockerized app and PostgreSQL + Resend free-tier email + cash on delivery only. SMS is deferred to a future phase; backups are managed manually at launch. These milestones should target that baseline, kept replaceable/upgradable without an application rewrite.

### Milestone 49 — Production Dockerfile stage
- **Goal**: Add a production build stage to the Dockerfile (multi-stage, non-root user, minimal final image), building on the dev stage from Milestone 5.
- **Files**: `Dockerfile`
- **Dependencies**: Milestone 5
- **Testing**: `docker build --target production .`; resulting container starts and serves the app correctly with `NODE_ENV=production`.
- **Rollback**: Revert `Dockerfile` to the dev-only version.
- **Commit message**: `Add production build stage to Dockerfile`

### Milestone 50 — Full-stack docker-compose (dev and prod variants)
- **Goal**: Compose the app and Postgres together (extending Milestone 1), with separate dev/prod configurations.
- **Files**: `docker-compose.yml` (extended), `docker-compose.prod.yml` (new)
- **Dependencies**: Milestones 1 and 49
- **Testing**: `docker compose up` brings up app + Postgres together locally; `docker compose -f docker-compose.prod.yml up` runs the production target successfully.
- **Rollback**: Revert compose files to the Postgres-only version from Milestone 1.
- **Commit message**: `Add full-stack docker-compose for dev and production`

### Milestone 51 — Real image optimization for self-hosted deployment
- **Goal**: Remove `images.unoptimized: true` (a Vercel-shortcut default) and configure Next.js image optimization to work correctly under Docker.
- **Files**: `next.config.mjs`
- **Dependencies**: Milestone 49
- **Testing**: Product images on the storefront load correctly and are actually optimized (check response headers/sizes) when served from the Dockerized app.
- **Rollback**: Revert `next.config.mjs`.
- **Commit message**: `Enable real image optimization for self-hosted production deployment`

### Milestone 52 — Production environment/secrets handling
- **Goal**: Document and structure how `DATABASE_URI` (per [Architecture Decision Record 010](./DECISIONS.md#architecture-decision-record-010-the-postgresql-connection-string-is-named-database_uri)), `PAYLOAD_SECRET`, and any other secrets are supplied in production (without committing real values).
- **Files**: `.env.example` (finalized; **still open**, not yet changed), `docker-compose.prod.yml`, `docs/DEPLOYMENT.md`, `.github/workflows/ci.yml`, `scripts/check-env.ts`, `scripts/check-env.test.ts`, `lib/client-ip.ts`, `next.config.mjs`, `package.json` (`check-env`, `test:env`, `deploy:migrate`), `docs/DECISIONS.md` ([Architecture Decision Record 033](./DECISIONS.md))
- **Scope expansion (recorded 2026-10-11)**: the original two-file scope grew to the list above when the launch-blocking origin requirement below was resolved by [Architecture Decision Record 033](./DECISIONS.md) (owner decision: Cloudflare Tunnel is the origin boundary) and production environment validation became a deploy gate. Mechanism: `cloudflared` as a compose service (pinned `cloudflare/cloudflared:2026.10.0`), no host ports, `backend` (internal) and `edge` networks, `check-env` as the first step of `deploy:migrate`. Not done at this milestone: the real-tunnel verification (owner), `.env.example`.
- **Dependencies**: Milestone 50
- **Testing**: A fresh clone can be configured for production using only `.env.example` as a guide and real secrets supplied out-of-band.
- **Rollback**: Revert the files above (`git revert` the milestone commit); the stack returns to the Milestone 52a compose file with its loopback-published app port.
- **Commit message**: `Document production environment and secrets configuration`
- **🚧 Launch-blocking requirement (security review of Milestone 36, owner-recorded 2026-10-09)**: the app derives the client IP for rate limiting from `cf-connecting-ip` / the first `x-forwarded-for` entry (`lib/client-ip.ts`). Those headers are client-controlled unless the origin accepts traffic **only** from Cloudflare. Before launch, the production setup (Milestones 50 and 52) must restrict the origin (originally worded as a virtual private server firewall or reverse-proxy allowlist of Cloudflare ranges; **resolved by design as a Cloudflare Tunnel, [Architecture Decision Record 033](./DECISIONS.md)**, which removes the published port altogether; the real-tunnel path is verified only by the owner), and should verify that Next server actions work behind the proxy (`experimental.serverActions.allowedOrigins` may be needed). Without this, the per-IP limits on order placement and order lookup can be bypassed. Not verifiable in the dev sandbox.
- **Status (2026-10-24, Milestone 81)**: Implemented, verification partial (`docs/TASKS.md` row Milestone 52; Architecture Decision Record 033). On `main`; continuous integration `prod-stack` and `migrations` green (run 40093971126, `6c0a22f`). Not done, owner-only: the real Cloudflare Tunnel and header behaviour.

### Milestone 52a — Run Payload migrations as an explicit production deploy step
- **New milestone, inserted 2026-08-18** — closes readiness risk [R9](./PHASE_1_READINESS_REPORT.md#r9--no-production-database-migration-step):
  development relies on Payload's schema auto-push (`next dev`), which is not appropriate for
  production — Milestone 50 (compose), Milestone 52 (secrets), Milestone 53 (health checks), and Milestone 59 (deploy runbook)
  never named an explicit migration step, so the first production deploy would have improvised its
  schema strategy against a real database.
- **Goal**: Production deploys run `payload migrate` as an explicit step — before the app starts
  serving traffic — with schema auto-push disabled in the production build/runtime. A failed migration
  must block the deploy, not silently fall through to a stale or partially-migrated schema.
- **Files**: `Dockerfile` (new `migrate` target, placed before `production`), `docker-compose.prod.yml`
  (one-shot `migrate` service; `app` waits for it), `payload.config.ts` (`migrationDir`), `package.json`
  (`migrate`, `migrate:create`, `migrate:status`, `deploy:migrate`), `migrations/` (the committed
  initial migration + snapshot + `index.ts`), `scripts/verify-migrations.ts` (post-migration verifier),
  `eslint.config.mjs` (ignore `migrations/**`), `.github/workflows/ci.yml` (schema-drift + empty-database
  bootstrap job; `docker build --target migrate`), `docs/DEPLOYMENT.md` (new: the migration workflow, so
  Milestone 59's runbook doesn't improvise it)
- **Scope expansion (recorded)**: the original Files line named only the compose file and the docs.
  Design per [Architecture Decision Record 032](./DECISIONS.md): migrations had to be generated and committed (none existed), the
  Payload CLI cannot run in the standalone image (so a Dockerfile target), and a verifier plus a continuous integration drift
  check close the fail-open paths found in design.
- **Dependencies**: Milestone 50 (compose), Milestone 52 (`DATABASE_URI`/secrets available to run migrations against)
- **Testing**: Deploying against a database one schema version behind actually migrates rather than
  silently pushing or skipping; a deliberately broken migration blocks the app from starting rather
  than starting against a mismatched schema.
- **Rollback**: Revert the compose/entrypoint changes.
- **Commit message**: `Run Payload database migrations as an explicit production deploy step`

### Milestone 52b — Turnstile verification, CGNAT-safe order limits and the pre-launch security batch
- **New milestone, inserted 2026-10-11 (owner-approved).** Pakistani mobile carriers put many customers
  behind one IP address (CGNAT), so the per-IP limit of 5 orders per 15 minutes blocked real buyers.
  Design: [Architecture Decision Record 035](./DECISIONS.md#architecture-decision-record-035-cloudflare-turnstile-on-order-placement-and-lookup-a-per-phone-order-limit-and-a-per-ip-flood-ceiling--cgnat-safe-rate-limits-milestone-52b),
  **amended the same day by [Architecture Decision Record 036](./DECISIONS.md#architecture-decision-record-036-strict-turnstile-policy-idempotent-orders-no-victim-lock-out-a-closed-first-admin-window-separate-database-roles-and-interim-nextjs-mitigations-milestone-52b-security-batch)**,
  which also closes the findings of the Milestone 52b security assessment (finding labels B1-B2, H1-H4, M1-M6, L1-L3, explained in [GLOSSARY.md](./GLOSSARY.md); the M labels are findings, not milestones). Where the
  two disagree, Architecture Decision Record 036 wins. `Orders` access, guest checkout and cash-on-delivery-only are unchanged.
- **Goal**:
  - **Turnstile is required** (H1): an order or lookup without a verified token is refused. The server
    classifies each token as `verified`, `rejected` (security validation: missing, malformed, invalid,
    expired or spent, wrong action or hostname) or `unavailable` (Cloudflare unreachable, a bad answer, our
    50-call concurrency cap, or a configuration fault); both non-verified outcomes refuse, with different
    codes and messages (Milestone 1). There is no degraded path.
  - **CGNAT-safe limits without a victim lock-out** (M2, M3, L3): an attempts gate per IP (bounding
    siteverify calls and database lookups), a verified-order ceiling per IP (30 / 15 min), and
    per-(phone, IP) limits (3 / hour, 10 / day) that count successful verified orders only; a store-wide
    per-phone count is a log-only alert. All use the non-evicting bucket limiter. A production request
    with no valid client IP is refused (Milestone 4).
  - **Order idempotency** (H3): an `idempotencyKey` per checkout attempt, a unique index, and a replay that
    needs no token.
  - **First admin from a secret** (B2) and **separate database roles** (H4): see Architecture Decision Record 036 decisions 5 and 6.
  - **Interim Next.js mitigations** (B1): optimizer off, `/_next/image` closed, narrower upload types. The
    Next 16 upgrade is **not** part of this milestone and remains a launch blocker.
  - **Read-only root filesystem** for `app` and `migrate` (Milestone 6).
  - No new npm packages. siteverify is called with `fetch`: 3 s timeout, no retries, `redirect: 'error'`, a
    16 KB body cap, at most 50 concurrent calls.
- **Files** (as built):
  - **New**: `lib/turnstile.ts`, `lib/order-guard.ts`, `lib/idempotency.ts`,
    `components/TurnstileWidget.tsx`, `scripts/turnstile.test.ts`, `scripts/idempotency.test.ts`,
    `scripts/bootstrap-admin.ts`, `scripts/db-roles.ts`, `scripts/prod-stack-check.sh`,
    `e2e/turnstile-fallback.spec.ts`, `e2e/idempotency.spec.ts`,
    `migrations/20261011_181740_order_idempotency_key.{ts,json}`.
  - **Changed**: `lib/client-ip.ts`, `lib/rate-limit.ts` (`reserve` returns `retryAfterSec`),
    `lib/payload/orders.ts` (idempotency key, `findOrderByIdempotencyKey`), `collections/Orders.ts`
    (`idempotencyKey`), `collections/Users.ts` (first-register guard), `collections/Media.ts` (upload
    types), `app/(public)/cart/actions.ts`, `app/(public)/orders/actions.ts`, `components/OrderSummary.jsx`,
    `app/(public)/orders/OrderLookup.tsx`, `next.config.mjs`, `scripts/check-env.ts` (+ test),
    `package.json` (`deploy:migrate` runs `db-roles` and `bootstrap-admin`; `test:idempotency`),
    `Dockerfile` (messages), `docker-compose.prod.yml`, `docker-compose.yml`, `playwright.config.ts`,
    `.github/workflows/ci.yml`, `e2e/golden-path.spec.ts`, `e2e/mobile.spec.ts`, `.env.example`, and the docs
    (`DEPLOYMENT.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `CHANGELOG.md`, `TASKS.md`, `CLAUDE.md`,
    `PHASE_1_READINESS_REPORT.md`).
- **Dependencies**: Milestones 52, 33 and 36
- **Testing** (what exists; the result of each run is under *Verification status*):
  - **Unit** (`npm run test:turnstile`, injected `fetch`, no network): every classification row (missing
    token, oversize token, unset secret, test secret without the flag, matching and mismatching
    action/hostname, missing fields, redirect, oversized body, the 51st concurrent call, `invalid-input-response`
    and `timeout-or-duplicate` alone and mixed, `internal-error`, the secret error codes, unknown codes,
    non-200, malformed JSON, a thrown fetch, a hanging fetch and a stalled body); the request body; the
    environment handling; and the guard (tokenless, rejected, unavailable and a throwing verifier are all
    refused; the attempts gate; the CGNAT ceiling; per-(phone, IP) limits including the case where an
    attacker's connection cannot lock out the victim's; the phone-volume alert; refunds; atomic
    reservation under 20 concurrent requests; replay; a missing client IP; the lookup caps).
  - **`check-env`** (`npm run test:env`): the two Turnstile keys, `APP_DB_PASSWORD`, the bootstrap
    credentials, and the refusal of `TURNSTILE_ALLOW_TEST_KEYS` / `PAYLOAD_ALLOW_FIRST_REGISTER`.
  - **Real database** (`npm run test:idempotency`, after `npm run seed`): sequential and 12-way concurrent
    requests with one key create one order; distinct keys create distinct orders; the unique index;
    the key is immutable. Continuous integration `migrations` job: the deploy step bootstraps an empty database, a second run
    is a no-op, the app role cannot change the schema, and the step fails closed with no bootstrap credentials.
  - **End-to-end** (continuous integration; Cloudflare's public test keys and the allow flags; the app runs as `gocart_app`): the golden
    path reaches `verified`; a dropped response followed by a retry creates exactly one order;
    `turnstile-fallback.spec.ts` blocks the script and checks that no order or lookup can be made;
    the 320 px no-overflow test; no indexable page loads Turnstile.
  - **Continuous integration `prod-stack`** (the real compose stack): migrate exits 0; the app runs read-only as uid 1000 and
    connects as `gocart_app` holding no superuser or bootstrap secret; `/_next/image` is 404;
    `first-register` and `POST /api/users` return 403 **with an empty users table**; re-running migrate
    recreates the admin; a PNG upload works on the read-only container and AVIF/SVG are refused.
  - **Continuous integration `turnstile-contract`**: the real siteverify response shapes for the `1x`/`2x`/`3x` test secrets and
    an unknown secret, and that `api.js` returns 200.
  - **Owner, at launch**: with real keys on the real hostname, a verified order and a lookup with no
    `[turnstile]` log lines; the items marked UNVERIFIED in Architecture Decision Records 035 and 036; the Next 16 upgrade
    (`docs/DEPLOYMENT.md`, "Launch blockers").
- **Verification status (2026-10-11)**: the authoring sandbox could not reach Cloudflare, and could not
  pull base images inside Docker builds. Observed there, outside Docker: the unit tests, `check-env`,
  type-check and lint; the deploy step and the role privileges on a real PostgreSQL 16; the idempotency
  test (and its mutation check); all 15 Playwright tests and seven provider failure modes against a
  **local simulation** of Cloudflare, with the app running as `gocart_app`; `first-register` refused with an
  empty users table; `/_next/image` closed; a read-only container. **Added by continuous integration on commit `95bf3b1` (all six jobs green)**: the repository's Dockerfile images in the real
  compose stack (`prod-stack`: read-only `app` and `migrate`, restricted role, first-register 403 on an empty
  users table, uploads), and the golden path through the real widget and real siteverify with Cloudflare's
  PUBLIC TEST keys. **Not observed by anyone**: real keys on the real hostname (the real `hostname`/`action`
  values) and the widget at 320 px. The earlier "quality assurance result: passed on the real production stack" for the first
  design was observed with every request degraded and is **withdrawn as a statement about the current
  design**: its verified-path items were never observed on a real stack.
- **Rollback**: `git revert` the milestone commit. The `idempotency_key` column and its unique index are
  harmless to leave in place (nothing reads them after the revert); to remove them run
  `payload migrate:down` for `20261011_181740_order_idempotency_key` first. Reverting restores the open
  first-admin flow and the single database role, so do not revert on a deployed stack without reading
  Architecture Decision Record 036.
- **Commit message**: `Add Turnstile verification, order idempotency and the pre-launch security batch`
- **Status (2026-10-24, Milestone 81)**: Implemented, verification partial (`docs/TASKS.md` row Milestone 52b; Architecture Decision Records 035 and 036). On `main`; continuous integration `turnstile-contract` and `prod-stack` green (run 40093971126, `6c0a22f`). Not done, owner-only: real Turnstile keys on the real hostname and the Cloudflare WAF rule (`docs/DEPLOYMENT.md`, "Launch blockers" items 2 and 4).

### Milestone 52c — Next.js 16 upgrade (closes the framework-advisory launch blocker)
- **New milestone, inserted 2026-10-11 (owner-approved: start the Next.js 16 upgrade on a separate branch and a separate pull request).**
  Design: [Architecture Decision Record 037](./DECISIONS.md#architecture-decision-record-037-nextjs-1638--closing-the-framework-advisories-milestone-52c).
- **Goal**: Move `next` from 15.4.11 (30 advisories, two critical) to a patched release inside Payload
  3.90.x's peer range (`>=16.3.3 <17`), with no behaviour change for customers or admins.
- **Files**: `package.json` / `package-lock.json` (`next` and `eslint-config-next` `16.3.8`, `lint` = `eslint .`,
  `overrides.undici` = `7.29.1`), `eslint.config.mjs` (native flat config), `tsconfig.json` and
  `next-env.d.ts` (rewritten by Next 16), `components/Hero.jsx` (escaped apostrophes), docs.
- **Dependencies**: Milestone 52b
- **Testing**: `npm audit` shows no `next` advisory and no critical; type-check, lint (0 errors), the unit and
  database tests, the production build (Turbopack), every public route and the 404 paths, the admin user interface in a
  real browser, and the full Playwright suite with the app as `gocart_app`; in continuous integration, all six jobs (including
  `image`, `prod-stack` and the golden path through the real Turnstile widget).
- **Rollback**: `git revert` the milestone commit and `npm ci` (restores 15.4.11 and `next lint`). No schema or
  data change.
- **Commit message**: `Upgrade Next.js to 16.3.8 and close the framework advisories`

### Milestone 53 — Health checks and logging
- **Goal**: Add container health checks and baseline error/log capture suitable for a small production deployment.
- **Files**: `docker-compose.prod.yml` (healthcheck blocks), `app/api/health/route.ts` (new), `scripts/prod-stack-check.sh` (Milestone 53 section)
- **Status (2026-10-11)**: **Done** ([Architecture Decision Record 038](./DECISIONS.md)). The route is verified locally against PostgreSQL 16; the compose healthcheck and the `healthy` container state are asserted by `scripts/prod-stack-check.sh` in the continuous integration `prod-stack` job (green on pull request #23).
- **Dependencies**: Milestone 50
- **Testing**: `docker compose -f docker-compose.prod.yml ps` shows the app container as healthy; hitting `/api/health` returns a 200.
- **Rollback**: Remove the healthcheck config and the new route.
- **Commit message**: `Add health check endpoint and container health checks`

### Milestone 54 — Backup/persistence strategy for Postgres and media
- **Goal**: Ensure Postgres data and uploaded media survive container restarts/redeploys, with a documented backup approach.
- **Media is a local Docker volume, not object storage** ([Architecture Decision Record 020](./DECISIONS.md#architecture-decision-record-020-media-storage-backend-is-a-local-docker-volume-for-v1-with-cloudflare-r2-as-the-designated-successor)), so it carries the same manual-backup burden as Postgres under [Architecture Decision Record 015](./DECISIONS.md#architecture-decision-record-015-initial-production-infrastructure-baseline) — this milestone's persistent-volumes scope must cover both, not just the database.
- **Files**: `docker-compose.prod.yml` (named volumes, already present; comments only), `scripts/backup.sh`, `scripts/backup-verify.sh` (new), `scripts/prod-stack-check.sh` (Milestone 54 section), `docs/DEPLOYMENT.md`, `docs/ARCHITECTURE.md`
- **Status (2026-10-24, Milestone 74)**: Done for the stated scope. Scripts tested on a local PostgreSQL 16 (plain and encrypted, restore into a scratch database, wrong passphrase and truncated dump refused, retention). The Docker paths and the stop/start persistence check passed in continuous integration `prod-stack` on pull request #22 head `bec4670` (run 38175670202, job 114577417717: `backup-verify.sh restored the dump into a scratch database`; `full stop/start (volumes kept): database rows and uploaded media survive`). Unverified and owner-only: the manual restore drill and a real-VPS backup (`docs/DEPLOYMENT.md`, "Launch blockers").
- **Dependencies**: Milestones 50 and 8
- **Testing**: Stop and restart the full stack; confirm previously seeded/created data and uploaded media are still present.
- **Rollback**: Revert compose volume changes.
- **Commit message**: `Add persistent volumes and backup strategy for Postgres and media`

---

## Group: Currency & localization sweep — Milestones 55 to 56

### Milestone 55 — PKR currency formatting sweep
- **Goal**: Replace the hardcoded `$`-fallback currency pattern (currently duplicated across 9 files) with a single PKR-aware formatting utility, per the confirmed answer to the currency open question in [PROJECT_SPEC.md](./PROJECT_SPEC.md).
- **Files**: `lib/currency.ts` (new), and every consumer currently reading `process.env.NEXT_PUBLIC_CURRENCY_SYMBOL` directly: `components/Hero.jsx`, `OrderSummary.jsx`, `OrderItem.jsx`, `ProductCard.jsx`, `ProductDetails.jsx`, plus any admin-adjacent pages retained
- **Dependencies**: Milestone 28
- **Testing**: All prices across the storefront render in the confirmed PKR format consistently.
- **Rollback**: Revert all touched files.
- **Commit message**: `Replace hardcoded currency fallback with PKR formatting utility`

### Milestone 56 — Pakistani address/phone validation
- **Goal**: Apply the confirmed Pakistani address format (city/area conventions, phone-first) as real validation, not just field labels, across guest checkout.
- **Files**: `components/AddressModal.jsx`, `collections/Orders.ts` (field validation)
- **Dependencies**: Milestones 31 and 11
- **Testing**: Submitting an invalid Pakistani phone number/address is rejected with a clear message; a valid one succeeds.
- **Rollback**: Revert both files.
- **Commit message**: `Add Pakistani address and phone format validation to guest checkout`

### Milestone 55a — Storefront copy correctness pass
- **New milestone, inserted 2026-08-18** — closes readiness risk [R12](./PHASE_1_READINESS_REPORT.md#r12--no-milestone-owns-storefront-copy-correctness):
  verified still live in the repo — `Footer.jsx` shows a US phone number, a `.com` example email, and a
  San Francisco address; `ProductDetails.jsx` promises **"Free shipping worldwide,"** false under
  Architecture Decision Record 018's flat-rate, Pakistan-only shipping model; `Hero.jsx` had a hardcoded `$4.90` (the currency
  symbol itself was fixed ahead of Milestone 24, but the copy around it — "worldwide," non-Pakistani framing —
  was not in scope of that one-line fix). Only Milestone 44 (mobile audit) and Milestone 55 (currency formatting)
  touch these files, and neither is scoped to copy correctness. For a market where customers are
  already wary of online scams, foreign contact details and false shipping claims on a Pakistani cash on delivery
  store read as a fraud signal, not a cosmetic nit — worth fixing before any real traffic, not after.
- **Goal**: Replace fake/foreign placeholder copy with real values. Wire `Footer.jsx`'s contact display
  to the `Settings` global's `contactPhone`/`contactEmail`/`contactAddress` fields (Milestone 13a already built
  these; nothing has read them yet). Remove `ProductDetails.jsx`'s "Free shipping worldwide" claim,
  replacing it with copy that matches the actual flat-rate/free-threshold model (Architecture Decision Record 018) — read from
  `Settings`, not hardcoded, so an admin changing the threshold doesn't leave the storefront claiming
  something false.
- **Files**: `components/Footer.jsx`, `components/ProductDetails.jsx`, `lib/payload/settings.ts` (new,
  mirroring the `lib/payload/products.ts`/`categories.ts` pattern — a server-side Local API reader for
  the `Settings` global)
- **Dependencies**: Milestone 13a (the `Settings` global and its fields already exist), Milestone 55 (currency
  formatting should land first so this pass isn't fixing copy around a value that's about to reformat)
- **Testing**: `grep -r "example.com\|+1-212\|94102\|worldwide"` across `components/` returns nothing;
  Footer's displayed contact info matches whatever is configured in `/admin`'s Settings; changing the
  admin-configured phone/email/address updates the storefront without a redeploy.
- **Rollback**: Revert all three files.
- **Commit message**: `Replace placeholder contact info and false shipping claims with real Settings-backed copy`

### Milestone 56a — Golden-path end-to-end test and continuous integration pipeline
- **New milestone, inserted 2026-08-18** — closes readiness risk [R7](./PHASE_1_READINESS_REPORT.md#r7--no-test-or-continuous-integration-milestone-exists-in-59):
  no test framework and no continuous integration pipeline exist anywhere in the 59-milestone plan, which means Milestone 57, the
  end-to-end regression pass over a total rewrite of every data path in the application, would otherwise
  run with **zero automated safety net** beneath it — entirely manual, one-time, and never re-run again
  after launch. Deliberately minimal by design, not a full test pyramid: a v1 cash on delivery storefront's actual
  risk is a broken money path, not missing unit-test coverage.
- **Goal**: One Playwright end-to-end test covering the golden path — browse → product detail → add to
  cart → guest checkout → cash on delivery order created — running against a seeded database, plus a continuous integration job (GitHub
  Actions, matching this repo's host) that runs `npm run type-check`, `npm run build`, and that test on
  every push and pull request. Playwright is already available in this environment (confirmed while verifying Milestone 27's
  and Milestone 27a's client-rendered content), so no new tool needs introducing.
  - **The route/component set this test depends on**: `/`, `/shop`, `/product/[id]`, `/cart`,
    `/category/[slug]`, checkout (Milestones 31 to 33, 33a's stock enforcement). Sequenced after Milestone 56 (last
    of the pre-launch functional milestones) so the golden path this test walks is the real, final one —
    an end-to-end test written mid-sequence would need rewriting as each subsequent milestone changed the flow
    it exercises.
- **Files**: `e2e/golden-path.spec.ts` (new), `playwright.config.ts` (new), `.github/workflows/ci.yml` (new)
- **Dependencies**: Milestone 33a (order creation must actually validate stock for the test to exercise a real
  order), Milestone 56 (last functional milestone the golden path touches)
- **Testing**: The golden-path test passes locally against a freshly seeded database; the continuous integration job runs
  and passes on a pushed branch; a deliberately broken golden-path step (e.g. reverting Milestone 33
  temporarily) makes both the local test and the continuous integration job fail, proving the test actually exercises the
  flow rather than trivially passing.
- **Rollback**: Revert/delete the three new files.
- **Commit message**: `Add golden-path E2E test and CI pipeline`

---

## Group: Launch cutover — Milestones 57 to 59

### Milestone 57 — End-to-end regression pass
- **Goal**: Walk the full core flow from [PROJECT_SPEC.md](./PROJECT_SPEC.md) end to end — browse → cart → guest checkout → cash on delivery order → admin fulfillment — and fix anything broken by the cumulative migration.
- **Files**: scoped to whatever the regression pass finds
- **Dependencies**: all prior milestones
- **Testing**: The core flow completes successfully, on both desktop and mobile viewports, against a freshly seeded database.
- **Rollback**: Revert whichever specific fix commit is found to be wrong.
- **Commit message**: `Fix regressions found in end-to-end launch readiness pass`
- **Status (2026-10-24, Milestone 81)**: In review. Merged to `main` via pull request #30 (`33a9a6c`); awaiting owner sign-off. The pass was a local narrative walk; continuous integration `e2e` covers guest checkout and lookup. Continuous integration: all six jobs green on the `main` push run 40093971126 (`6c0a22f`).

### Milestone 58 — Update documentation to reflect the live architecture
- **Goal**: Bring `README.md` in line with the live system (single-store cash on delivery storefront, Payload 3 + PostgreSQL, Next.js 16, the two compose stacks, the migrate step, Turnstile, the Cloudflare Tunnel). Confirm `CLAUDE.md`, `docs/ARCHITECTURE.md` and `docs/TASKS.md` still match the code and edit only what has drifted.
- **Amended 2026-10-24 (owner-approved) because** (checked 2026-10-24): `README.md:11` says "Milestones 1 to 28 are Done … Milestone 29 next"; `README.md:72-74` says migrations are not run until Milestone 52a; `README.md:82` says "eight roles" (there are seven specialists plus the Engineering Manager). `CLAUDE.md` was corrected in pull request #30.
- **Files**: `README.md` (status banner, Getting started, Production image, role count), `docs/ARCHITECTURE.md` (collection and access tables), `docs/TASKS.md` (stale rows), `CLAUDE.md` (only if drifted; owner approval needed for any edit)
- **Dependencies**: Milestone 57
- **Testing**: a new contributor following `README.md` alone gets the dev stack running, and its production section points to `docs/DEPLOYMENT.md` instead of describing a pre-Milestone 52a flow. `grep -n "M1.*M28\|Until then a brand-new database\|eight roles" README.md` returns nothing.
- **Rollback**: Revert the doc changes.
- **Commit message**: `Update documentation to reflect the live Payload CMS + PostgreSQL architecture`
- **Status (2026-10-24, Milestone 81)**: In review. Merged to `main` via pull request #32 (`762e69a`); awaiting owner sign-off. A clean-clone dev start in Docker was not run. Continuous integration: all six jobs green on the `main` push run 40093971126 (`6c0a22f`).

### Milestone 59 — Production deploy runbook and release tag
- **Goal**: Complete `docs/DEPLOYMENT.md` into the single production runbook (ordered first-deploy checklist, release, rollback, backup schedule, launch checklist) and prepare the first release. The release tag (`v1.0.0`) is cut by the owner after the launch checks pass, not by the agent.
- **Amended 2026-10-24 (owner-approved) because** (checked 2026-10-24): the earlier Files line said `docs/DEPLOYMENT.md (new)` but the file exists (about 594 lines) and ends with "the full deploy runbook (Milestone 59)" under "Not covered yet"; the earlier Rollback said N/A while the runbook it points to has no rollback section yet.
- **Files**: `docs/DEPLOYMENT.md` (extend), `docs/CHANGELOG.md` (release entry)
- **Launch decisions this milestone needs from the owner** (recommended defaults and sources are in the pull request body and the Decision Packet): hostname; Turnstile keys; Cloudflare WAF rule; tunnel token; env file location; bootstrap admin removal; backup schedule, encryption and off-host copies; restore drill; uptime monitor; email (Resend is decided in Architecture Decision Record 015 but no code uses it); image optimizer; memory limits and read-only `cloudflared`/`postgres`; `npm audit` re-run.
- **Dependencies**: Milestone 58; Milestone 74 done, or Milestones 52, 52b and 54 verification explicitly accepted by the owner
- **Testing**: following the runbook on a clean virtual private server deploys a working instance; every "Launch blockers" item in `docs/DEPLOYMENT.md` is Done or owner-accepted; `TURNSTILE_ALLOW_TEST_KEYS` and `PAYLOAD_ALLOW_FIRST_REGISTER` are unset in the production env file.
- **Rollback**: Revert the doc commit if wrong. A failed production deploy is rolled back via the runbook's own rollback section, which this milestone must add.
- **Commit message**: `Add production deployment runbook and cut v1.0.0` (the `v1.0.0` tag itself is owner-run, after the launch checks)
- **Status (2026-10-24, Milestone 81)**: In review. Merged to `main` via pull request #32 (`762e69a`); awaiting owner sign-off. The runbook has NOT been run on a clean virtual private server and the release tag is not cut (both owner-only, `docs/DEPLOYMENT.md`, "Not covered yet"). Continuous integration: all six jobs green on the `main` push run 40093971126 (`6c0a22f`).

---

## Group: Storefront redesign — Milestone 60 onward

The owner-supplied redesign (`design/DESIGN_HANDOFF.md`, `design/*.dc.html`, `design/screens/*`, on the
`redesign` branch / pull request #25): a violet palette, Plus Jakarta Sans and pastel image tiles. Split into
small milestones, each added here only once the owner has approved its draft. user-interface-only milestones
change no data, schema, server action, Redux slice or order logic. The design is a visual target
only: its sample data, placeholder brand, and features the store does not have (wishlist, customer
sign-in, card/wallet payments, coupons, express delivery, filters) are not built.

### Milestone 60 — Storefront design tokens and Plus Jakarta Sans
- **Goal**: Replace Milestone 45a's "Graphite & Jade" theme values in `app/globals.css`'s `@theme` with the handoff token set (colours, category tints, product-tile pastels, radii, shadows), load Plus Jakarta Sans with `next/font/google` (latin, `display: swap`, only the weights the design uses: 400/500/600/700/800), and add one visible keyboard focus ring. Milestone 45a's token names stay as aliases of the nearest new token, so pages not yet redesigned keep rendering until Milestone 66 deletes the aliases.
- **Files**: `app/globals.css`, `app/(public)/layout.jsx` (font only), `docs/TASKS.md`, `docs/CHANGELOG.md`, `docs/MIGRATION_PLAN.md` (this entry and the Milestone 45a ✅ fix)
- **Dependencies**: Milestones 45a and 52c
- **Testing**: the body's computed `font-family` is Plus Jakarta Sans and `/` requests exactly one font file; every text/background pair in the design meets 4.5:1 (white on `pink` is 4.1, so small white text uses `pink-dark`); `npm run lint`, `npm run type-check`, `npm run build` pass; the full Playwright suite passes (in continuous integration for the Turnstile-dependent tests); no horizontal scroll at 320px on `/`, `/shop`, a product, `/category/electronics`, `/categories`, `/cart`, `/orders`; screenshots at 390/768/1440 differ from `main` only in palette and font.
- **Rollback**: Revert the commit; CSS and font only, no data.
- **Commit message**: `Add redesign tokens and Plus Jakarta Sans (M60)`

### Milestone 61 — Shared storefront components
- **Goal**: Rebuild the shared storefront components on the Milestone 60 tokens, matching the design's header, product card, footer and mobile tab bar. Every existing prop, handler and accessible name stays the same; nothing changes in data, Redux, server actions or order logic.
- **Files**:
  - Edited in place: `components/{Navbar,Footer,ProductCard,Title,Counter,CategoryRow}.jsx|tsx`, `components/AnnouncementBar.tsx`, `app/(public)/layout.jsx` (mounts `CategoryNav` and `MobileTabBar`, passes the store name to the header).
  - New under `components/ui/`: `Badge`, `CategoryTile` (tile and circle), `QuantityStepper`, `RadioCard`, `MobileTabBar`, `MobileActionBar`, `Breadcrumb`, `TrustRow`, `EmptyState`, `CategoryNav` (server), `QuickAddButton` (client).
  - New: `lib/category-style.tsx` (the icon and tint mapping moved out of `CategoryRow`).
  - Read-only memoisation, no query change: `lib/payload/categories.ts` adds `getTopLevelCategoriesCached`, and `lib/payload/settings.ts` exports `getSettings` through React `cache`, so the header, announcement bar, footer, metadata and page share one read of each per request.
  - Docs: `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`.
- **Spec**:
  - Header: the store's own name (Settings `storeName`), a search form with a button named "Search", a visible Shop link, and a cart link named "Cart, N items" with a count badge. Left out on purpose: Sign in (admin-only auth), wishlist, notification bell and the menu button (no destination exists for them).
  - Category row (desktop only): the real top-level categories plus "All categories". Announcement bar: the delivery sentence from Settings, "Cash on delivery across Pakistan" and "Track order" → `/orders`. Footer: shop, help and contact columns, contact from Settings (Milestone 55a); no "Sell on…", newsletter, careers or card/wallet lines.
  - Product card: a pastel tile around the real image, category, name, violet price with the MRP struck through, "% OFF" chip, "Out of stock" pill. One link (to the product) wraps category, name and price and is stretched over the card; the quick-add button ("Add {name} to cart", the existing `addToCart`) is a sibling above it, disabled and named "{name} is out of stock" when the product is not in stock. It sits over the image tile at every width (the design puts it in the price row; that row has no room at 320px).
  - Mobile tab bar (below `lg`): Home, Categories, Products, Orders, no Cart/Shop/Search (the header owns those). It steps aside on the product page and the cart, which get `MobileActionBar` in Milestones 64 and 65.
  - The header's Search button is `type="button"` and asks its form to submit: `/orders`' end-to-end expects its own form to hold the only `button[type=submit]`. Enter in the field submits as before.
- **Dependencies**: Milestone 60
- **Testing**: the end-to-end constraints hold (one `<a href="/product/…">` per card containing name and price; exactly one Shop link, Search button and `/^Cart/` link in the header at 320px; one `Add to Cart` button on a product page and none on a listing); quick-add increments the header count and is disabled out of stock; keyboard tab order and visible focus on header, cards and tab bar; every target ≥ 44px; 4.5:1 for every text pair; no horizontal scroll at 320px on the seven routes; `npm run lint`, `type-check` and `build` pass; the full Playwright suite passes (in continuous integration for the Turnstile-dependent tests); 390/768/1440 screenshots of `/shop` against the design's header, card and footer.
- **Rollback**: Revert the commit.
- **Commit message**: `Rebuild shared storefront components on the redesign tokens (M61)`

### Milestone 62 — Home page redesign
- **Goal**: Lay out `/` like the design's `Main`/`Mobile` home using only real data and true copy. The section formerly titled "Best Selling" is titled **"Featured"** (the `isFeatured` flag is a curated list, not a sales ranking; [Architecture Decision Record 022](./DECISIONS.md) left the label as a copy decision).
- **Files**: `app/(public)/page.jsx`, `components/{Hero,LatestProducts,BestSelling,OurSpec,CategoryRow,ui/CategoryTile,ui/TrustRow}`, `docs/ARCHITECTURE.md` (route table wording), `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**:
  - Hero: lavender panel, the existing honest headline, "Starts from {lowest price}", real in-stock product tiles, a `pink-dark` circle showing the lowest price (not drawn when there is none), and three chips (delivery note, cash on delivery, guest checkout). The design's "Mega Sale", "up to 60% off", free-shipping, secure-payment and returns copy is not used.
  - Shop by category: a phone shows a row of round category chips and the first four pastel tiles; wider screens show every top-level tile. A tile's subtitle is its real child links, so every parent and child link stays in the initial HTML.
  - "Latest products" and "Featured" use the redesigned card in an auto-fill grid (two columns on a phone). The page now reads up to 5 latest and 10 featured products (was 4 and 8) so a wide screen fills rows of five; Featured is hidden when nothing is flagged. A value-prop row (delivery, cash on delivery, guest checkout, order tracking) replaces "How ordering works".
  - Not built: the limited-offer band (coupons, [Architecture Decision Record 017](./DECISIONS.md)), promo cards (Milestone 71), countdown, newsletter (Milestone 48a), category tabs (Milestone 68).
- **Dependencies**: Milestone 61
- **Testing**: the home HTML contains "Modern Table Lamp", `href="/category/electronics"` and `href="/category/speakers"`; the HTML has no "Best Sell", "Popular", "Mega", "Rangla" or "returns"; no horizontal scroll at 320px; the full Playwright suite passes (Turnstile-dependent tests in continuous integration); 390/768/1440 screenshots against `desktop-01`/`mobile-01`.
- **Rollback**: Revert the commit.
- **Commit message**: `Redesign the home page with real data and Featured section (M62)`

### Milestone 63 — Categories index and category listing redesign
- **Goal**: Lay out `/categories` like the design's `AllCategories`/`CategoriesMobile` and `/category/[slug]` like `Category`/`CategoryMobile`, without the filter sidebar or sort control.
- **Files**: `app/(public)/categories/{page,loading}.tsx`, `app/(public)/category/[slug]/{page,not-found,error}.tsx` (**no `loading.tsx`**: do-not-touch, Milestone 27a), `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**:
  - `/categories`: a white card per top-level category with a large pastel circle (its image if an admin uploaded one, else a tinted icon) and its child categories as pills beneath, as `docs/CATEGORY_REQUIREMENTS.md` requires (the design's circles carry no children; the spec wins). Empty state: "No categories yet".
  - Category page: breadcrumb, a tinted heading panel (title, description, and on a parent page its subcategories as pills), the product count, a full-width auto-fill grid (two columns on a phone) and link-based pagination at every width. There is no "load more": it would need client fetching, and every page stays its own crawlable URL. `rel` prev/next, canonicals and metadata are unchanged; the empty, 404 and error states use the shared panel.
  - Not built: filter sidebar, sort control (Future Phase in `docs/CATEGORY_REQUIREMENTS.md`), colour dots (no variants).
- **Dependencies**: Milestone 61
- **Testing**: an unknown slug returns **404**; `?page=999` returns **404**; an empty category returns **200** with the empty state; no horizontal scroll at 320px on `/categories` and `/category/electronics`; the full Playwright suite passes (Turnstile-dependent tests in continuous integration), including the "created after the build renders on demand, and paginates" test; 390/768/1440 screenshots against `desktop-02/03`, `mobile-02/03`.
- **Rollback**: Revert the commit.
- **Commit message**: `Redesign categories index and category listing (M63)`

### Milestone 64 — Product detail redesign
- **Goal**: Lay out the product page like the design's `Product`/`ProductMobile`, keeping the add-to-cart, buy-now and stock behaviour exactly as it is.
- **Files**: `app/(public)/product/[productId]/page.jsx`, `components/{ProductDetails,ProductDescription,ui/MobileActionBar}`, `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**:
  - Images: a pastel tile around the real image; a thumbnail rail beside it from `lg`, a strip below it on a phone; the tile is full-bleed on a phone, with view dots.
  - Text: category label, name, a price card (price, MRP struck through, "% OFF" chip, the delivery sentence from Settings) and a stock pill. The design's "Inclusive of all taxes" is **not** shown: nothing in the store states tax treatment.
  - Actions (unchanged logic): "Add to Cart" + "Buy Now"; after adding, the quantity control + "View Cart"; out of stock shows a disabled "Out of Stock" button. There is **one** action group in the DOM: fixed to the bottom below `lg`, inline in the column from `lg` (`MobileActionBar` gains an `inline` option).
  - Info rows: delivery note and cash on delivery. Below: two native `<details>` sections (Description, open by default; Delivery & payment) at every width. The design's desktop tab card is simplified to the same accordions; there is no size guide, returns or reviews content to show.
  - Not built: colour/size/stitching options, SKU, brand (no variants), the pre-add quantity stepper (it would change the add handler), share, wishlist, reviews ([Architecture Decision Record 016](./DECISIONS.md)), "You may also like" (Milestone 67).
- **Dependencies**: Milestone 61
- **Testing**: on an in-stock product there is exactly one "Add to Cart" button, "View Cart" appears after adding and "Add to Cart" is gone; on an out-of-stock product there is a disabled "Out of Stock" button and no "Add to Cart"; JSON-LD and metadata are unchanged (`e2e/seo.spec.ts`); an unknown id returns 404; no horizontal scroll at 320px; the full Playwright suite passes (Turnstile-dependent tests in continuous integration); 390/768/1440 screenshots against `desktop-04`/`mobile-04`.
- **Rollback**: Revert the commit.
- **Commit message**: `Redesign the product detail page (M64)`

### Milestone 65 — Cart redesign (checkout stays on /cart)
- **Goal**: Lay out `/cart` like the design's `Cart`/`CartMobile`, with a checkout-styled summary panel taken from `Checkout`/`CheckoutMobile`. No change to the place-order logic, state, address flow or Turnstile (owner decision: checkout stays on `/cart`, no `/checkout` route).
- **Files**: `app/(public)/cart/page.jsx`, `components/{OrderSummary,AddressModal}.jsx` (markup and classes only), `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**:
  - Items: the table becomes cards (pastel tile, name linking to the product, category, price, quantity control, "Item total", and one 44px "Remove {name}" button at every width), then "Continue shopping". The page width is 1120px.
  - Summary panel: 1 Delivery address (the existing select, "Add Address" and modal, restyled); 2 Delivery (one "Standard delivery" card showing Free or the flat fee and the Settings sentence); 3 Payment (one "Cash on Delivery (COD)" card). Then Subtotal, "You save" (the sum of (MRP − price) × quantity over lines with a real discount, hidden when 0), Delivery, Total, the Turnstile widget and "Place Order".
  - Below `lg` the total and the Place Order button are pinned in a fixed bar; it is the same button element, moved by CSS, so there is still exactly one.
  - Empty state: the shared panel with "Browse categories". "Restore items" from the design is dropped (there is no state to restore).
  - Not built: promo code ([Architecture Decision Record 017](./DECISIONS.md)), express delivery ([Architecture Decision Record 018](./DECISIONS.md)), card/wallet/bank payments ([Architecture Decision Record 004](./DECISIONS.md)), the step-indicator header.
- **Dependencies**: Milestone 61
- **Testing**: the golden-path, idempotency, turnstile-fallback and mobile specs pass unchanged (Turnstile-dependent ones in continuous integration); "Place Order" stays disabled until Turnstile is verified and shipping settings have loaded; "You save" is hidden when 0; one "Remove …" button per line; the saved address appears as one text node; no horizontal scroll at 320px; 390/1440 screenshots against `desktop-05/05b/06`, `mobile-05/05b/06`.
- **Rollback**: Revert the commit; `OrderSummary`'s logic is untouched, so the diff is markup and classes only.
- **Commit message**: `Redesign the cart with a checkout-styled summary (M65)`

### Milestone 66 — Remaining storefront pages and legacy token removal
- **Goal**: Apply the redesign's tokens and components to the order confirmation (designed like "Order placed"), the guest order lookup (`/orders`) and `/shop`, then delete the Milestone 60 legacy token aliases. (No global `not-found`/`error` page exists in the storefront; the category route's own ones were restyled in Milestone 63.)
- **Files**: `app/(public)/order-confirmation/OrderConfirmation.tsx`, `app/(public)/orders/OrderLookup.tsx`, `components/{OrderItem,PageTitle,Loading}.jsx`, `app/(public)/shop/page.jsx`, `app/globals.css` (delete the aliases), `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**:
  - Confirmation: a green check, "Order placed!", the real order number with Copy, a summary row (total to pay, payment = Cash on Delivery, delivery = Free or the fee), then items, delivery details and the buttons "Track order" (`/orders`) and "Continue shopping". The copy stays what the store really does (no SMS claim: SMS is deferred, [Architecture Decision Record 015](./DECISIONS.md)); the design's "Back to checkout (prototype)" link is not built. The order number and status text are never upper-cased by CSS (end-to-end reads them back).
  - `/orders`: the lookup form in a white card with the new field style; the result card (`OrderItem`) uses tinted status pills. `/shop`: the heading and the auto-fill grid.
  - Legacy cleanup: before deleting, a search for `brand-*`, `canvas`, `well`, `ink-soft`, `sale-600`, `shadow-soft` and `shadow-lift` found uses only in the files above.
- **Dependencies**: Milestones 62, 63, 64 and 65
- **Testing**: no remaining use of any deleted alias in `app`, `components` or `lib`; the golden-path test still reads the order number, "Placed" and totals (Turnstile-dependent: Continuous integration); no horizontal scroll at 320px on `/shop` and `/orders`; lint and type-check pass.
- **Rollback**: Revert the commit.
- **Commit message**: `Restyle confirmation, lookup and shop pages; drop legacy tokens (M66)`

### Milestone 67 — "You may also like" on the product page
- **Goal**: Show up to four in-stock products from the viewed product's category below its description, never the viewed product. The section is hidden when there are none.
- **Files**: `app/(public)/product/[productId]/page.jsx`, `components/RelatedProducts.tsx` (new, async server component), `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**:
  - Data: the existing `getProductsByCategory(category.slug, { limit: 8 })` (2–3 queries: the category, its children when it is a parent, then the products at depth 1), filtered on the server to `id !== current` and `inStock === true`, first four kept. The shared helper is **not** modified (the category routes and the sitemap use it). If fewer than four qualify the section shows fewer; it is hidden at zero. The order is the helper's default (Payload's default for the collection).
  - States: loading is a four-card skeleton inside `<Suspense>` (safe: `notFound()` has already run above the boundary, so the status code is unchanged); empty, no category, or a failed read render nothing (the failure logs the category slug only).
  - Layout: a grid of cards from `sm`, a sideways-scrolling row of 148px cards on a phone; "View all in {category}" links to `/category/{slug}`.
- **Dependencies**: Milestone 64
- **Testing**: a product with siblings shows up to four, not itself and no out-of-stock ones; a product alone in its category shows no heading in the HTML; a forced read error still returns 200; the product page keeps exactly one "Add to Cart" button (quick-add labels read "Add {name} to cart"); no horizontal scroll at 320px; lint and type-check pass.
- **Rollback**: Revert the commit (removes one read).
- **Commit message**: `Show related in-stock products on the product page (M67)`

### Milestone 68 — Featured products with category tabs on the home page
- **Goal**: The home page's "Featured" section gets an "All" tab plus one tab per real top-level category that has at least one featured product. The admin controls it only through `isFeatured`.
- **Files**: `app/(public)/page.jsx`, `components/BestSelling.jsx` (still a server component; it builds the tabs), `components/ui/FeaturedTabs.tsx` (new client island), `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**:
  - Data: client-side filtering of the one featured fetch, with **no extra query**. Home already loads `getFeaturedProducts` and the top-level categories; a server-rendered tab per request would cost a query each, or a `?tab=` parameter on a `force-dynamic` page. Every card stays in the initial HTML (crawlers keep all links, [Architecture Decision Record 007](./DECISIONS.md)); the island only toggles `hidden`. A product's top-level category is its category's parent when it has one, else the category itself. The featured fetch limit goes from 10 to 12 so smaller categories still get a tab.
  - Accessibility: WAI-ARIA tabs (`tablist`/`tab`/`tabpanel`, `aria-selected`, roving `tabindex`, arrow keys plus Home/End, selection follows focus). With fewer than two category tabs no tablist is rendered. A tab cannot be empty by construction; with no featured products the section is hidden (unchanged).
- **Dependencies**: Milestone 62
- **Testing**: two featured products in different top-level categories give "All" plus two tabs, each filtering correctly; every featured card is in the raw HTML; keyboard operation works; with one category there is no tablist; lint and type-check pass.
- **Rollback**: Revert the commit.
- **Commit message**: `Add category tabs to the Featured section (M68)`

### Milestone 69 — Automatic product labels
- **Goal**: One rule, used everywhere a product is shown, that derives its badges from real fields.
- **Files**: `lib/product-badges.ts` (new; pure and client-safe, no Payload import), `components/ProductCard.jsx`, `components/ProductDetails.jsx`, `components/ui/Badge.tsx`, `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**:
  - Status pill (top-left of the image, **at most one**), by precedence: **Out of stock** (`inStock !== true`, fail closed) > an admin label (`label`: New / Limited edition / Sale; a field Milestone 70 may add, ignored while no product carries it) > **Featured** (`isFeatured`, [Architecture Decision Record 022](./DECISIONS.md)).
  - Discount chip (in the price row, **at most one**): "{n}% OFF" where `n = Math.round((mrp − price) / mrp × 100)`, shown only when `mrp > price` and `n ≥ 1` (the same formula as before). An out-of-stock product keeps its chip (the price is real); only quick-add is disabled.
  - Maximum two badges per card. Colours: Out of stock neutral, Featured and New `primary`, Limited edition `pink-dark`, Sale `sale-blue`; every pair is at least 4.5:1.
  - Never labelled "Best seller" or "Popular".
- **Dependencies**: Milestone 61 (Milestone 64 for the detail page)
- **Testing**: the six-case precedence/discount table passes (run with `tsx`); "Featured" appears only on `isFeatured` products; no user interface string says "Best seller" or "Popular"; lint and type-check pass.
- **Rollback**: Revert the commit.
- **Commit message**: `Derive product badges from real product fields (M69)`

### Milestone 72 — Self-host Plus Jakarta Sans
- **Goal**: Stop fetching the font from `fonts.googleapis.com` at build time. `next/font/google` downloads the font when `next build` runs; when that request fails (it did once in the Docker `image` job on pull request #25) the whole build fails. The font file is committed with its licence and loaded with `next/font/local` instead, with the same weights, CSS variable and `display` setting. Approved by the owner on 2026-10-24 (batch approval, ratified retroactively after pull request #26 merged).
- **Files**: `app/(public)/layout.jsx` (font loading only: lines 1 and 12–23 today), `app/fonts/PlusJakartaSans-Variable.ttf` (new, unmodified upstream `PlusJakartaSans[wght].ttf`), `app/fonts/OFL.txt` (new, the upstream licence), `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**: the font and its licence come from `github.com/google/fonts` (`ofl/plusjakartasans/`); the file is renamed (brackets in a file name are awkward in paths) but its bytes are unchanged. `localFont` declares the `400 800` weight range of the one variable file (the design uses 400/500/600/700/800), `display: "swap"`, `variable: "--font-jakarta"`; `app/globals.css` is untouched (`--font-sans` still reads `--font-jakarta`). Trade-off: the upstream TTF (about 176 KB) is larger than the 27 KB Latin-only WOFF2 Google served; it is one cached, preloaded file, and a subset or WOFF2 conversion can follow as its own change.
- **Dependencies**: Milestone 60
- **Testing**: no `fonts.googleapis.com` or `next/font/google` reference in source or in the build output (`.next`); the body's computed font family is Plus Jakarta Sans and `/` requests exactly one font file; lint, type-check and `npm run build` pass; the Docker `image` job passes in continuous integration.
- **Rollback**: Revert the commit (the Google-fetched font returns).
- **Commit message**: `Self-host Plus Jakarta Sans with next/font/local (M72)`

### Milestone 70 — Optional product `label` field
- **Goal**: Let an admin tag a product as New, Limited edition or Sale so the Milestone 69 badge rule has a real source. Approved by the owner on 2026-10-24; decision recorded in [Architecture Decision Record 039](./DECISIONS.md) (Accepted 2026-10-24).
- **Files**: `collections/Products.ts`, `lib/payload/products.ts` (mirrored type only), `migrations/<timestamp>_product_label.{ts,json}` and `migrations/index.ts` (generated by `payload migrate:create`), `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**: add an optional `select` field `label` to `Products` with options `new` ("New"), `limited` ("Limited edition") and `sale` ("Sale"); no default, not required, so existing rows stay null. Place it in the admin sidebar near `isFeatured`. `Product` in `lib/payload/products.ts` gains `label?: 'new' | 'limited' | 'sale' | null`. `lib/product-badges.ts` already consumes the field and is not changed. One migration, additive (a nullable enum column).
- **Dependencies**: Milestone 69
- **Testing**: `payload migrate:create --skip-empty` creates no further files (drift check); the migration applies to an empty and to a populated database and a second run is a no-op; an admin can set and clear a label; a labelled in-stock product shows its pill on the card and detail page, an out-of-stock one still shows Out of stock, an unlabelled featured one shows Featured; anonymous REST cannot write the field; lint, type-check and build pass.
- **Rollback**: Revert the commit; before reverting after a deploy, ship a corrective forward migration dropping the column ([Architecture Decision Record 032](./DECISIONS.md) is forward-only).
- **Commit message**: `Add optional product label field (M70)`

### Milestone 71 — Admin-managed home promo cards
- **Goal**: Show the design's promo cards on the home page from admin-created records, with no invented copy: no card exists until an admin creates one, and the section is hidden when none is active. Approved by the owner on 2026-10-24; decision recorded in [Architecture Decision Record 039](./DECISIONS.md) (Accepted 2026-10-24).
- **Files**: `collections/PromoCards.ts` (new), `payload.config.ts` (register the collection), `lib/payload/promo-cards.ts` (new, server-only), `components/PromoCards.tsx` (new, server component), `app/(public)/page.jsx`, `migrations/<timestamp>_promo_cards.{ts,json}` and `migrations/index.ts` (generated), `docs/ARCHITECTURE.md` (collection list and access table), `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**:
  - Collection `promoCards`: `title` (text, required), `eyebrow` (text, optional, short), `ctaText` (text, required), `link` (text, required; `validate` accepts only an internal path that starts with a single `/`, rejecting `//`, `/\`, any scheme and any `:`), `tone` (select: `pink`, `blue`, `lavender`, `mint`, over existing pastel tokens), `image` (optional upload relation to `media`), `order` (number), `active` (checkbox, default `true`).
  - Access: create/update/delete admin-only; `read` returns `true` for an admin and `{ active: { equals: true } }` otherwise, so inactive cards are never public.
  - `lib/payload/promo-cards.ts` (Local API, `active` filter, ascending `order`, depth 1) is imported by server components only; a failed read renders nothing. `PromoCards` is hidden when the list is empty.
  - Layout from the old design: per card an eyebrow, a 30px title, a CTA with an arrow and the image circle when an image is set, else none; two columns from `md`, stacked on a phone; the whole card is one link; targets at least 44px; contrast at least 4.5:1 on every tone. The design source is deleted, so copy, count and ordering come only from admin data.
  - No seed data and no default records in the migration.
- **Dependencies**: Milestones 62 and 70 (the second migration is generated on top of the first)
- **Testing**: with no cards, or only inactive ones, the home HTML has no promo section; an active card appears with its link, ordered by `order`; anonymous `GET /api/promoCards` (the collection slug is `promoCards`) returns only active cards and anonymous writes return 403; a `link` of `https://x`, `//x`, `javascript:` or `foo` is rejected, `/category/electronics` is accepted; the drift check is clean; the migration applies on an empty database; no horizontal scroll at 320px; lint, type-check, build and the full Playwright suite pass (Turnstile-dependent tests in continuous integration).
- **Rollback**: Revert the commit; after a deploy, ship a corrective forward migration dropping the new tables.
- **Commit message**: `Add admin-managed home promo cards (M71)`

---

## Group: Pre-launch close-out — Milestone 73 onward

**Status: approved by the owner on 2026-10-24 (Stage 1 Decision Packet, "approve all"), except Milestone 77, which the owner deferred (optional; it keeps a `####` heading and is not counted).** Drafted 2026-10-24 by the Engineering Manager role with the Software Architect (Milestones 74, 75, 78, 58 and 59 amendments) and User Interface and User Experience Designer (Milestones 73 and 76) roles. Per-entry Status lines (added by Milestone 81) record what is merged; no entry is Done without the owner's sign-off.

Order (by dependency, not by ID): Milestone 74 (docs only) first; then Milestones 73, 75, 76 and 78 in any order (they are independent of each other); then Milestone 58; then Milestone 59 last. Milestone 57's regression pass predates Milestones 73 to 78; each of them is checked by the continuous integration `e2e` job instead of a new manual pass.

### Milestone 73 — Promo card without an image: no empty circle
- **Goal**: A promo card with no image no longer shows an empty white circle from 640px up. The circle appears only when the admin attached an image, and a card without one lets its text use the full width. Cards that do have an image stop their text running under the circle at `md`. Found in the Milestone 57 pass; changes the Milestone 71 spec line "else a tinted decorative circle" (the code uses `bg-white`, not a tint; `components/PromoCards.tsx:29`). Approved by the owner on 2026-10-24 (Stage 1 Decision Packet, 'approve all').
- **Files**: `components/PromoCards.tsx`, `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**:
  - Render the circle `<div>` only when `image?.url` is set; it stays `aria-hidden`, `hidden sm:flex`, with `<Image alt="">`. No new copy, glyph or colour; Tailwind tokens only, no hex.
  - With an image: `sm:pr-48` on the card so the title cannot overlap the circle at 768–1023px (the title is `max-w-[280px]` and the circle starts about 168px from the left of a 352px card; derived from the classes, not screenshotted). Without one: replace `max-w-[280px]` with `max-w-[28rem]`.
  - Add `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary` to the card link (today only the browser default outline; `ProductCard.jsx:49` sets an explicit one).
  - The whole card stays one link, the CTA row stays `min-h-11`, contrast is unchanged. Update the Milestone 71 Spec layout bullet to "the image circle when an image is set, else none".
  - No change to the collection, access, data or migrations.
- **Dependencies**: Milestone 71
- **Testing**: no circle without an image at 320, 768, 1024 and 1440px; with an image the circle stays and the title does not overlap it at 768px; a mixed row has equal heights; no horizontal scroll at 320px; keyboard focus shows a visible ring; lint, type-check, build and the Playwright suite pass.
- **Rollback**: Revert the commit.
- **Commit message**: `Hide promo card circle when no image is set (M73)`
- **Status (2026-10-24, Milestone 81)**: In review. Merged to `main` via pull request #32 (`762e69a`); awaiting owner sign-off. Continuous integration: all six jobs green on the `main` push run 40093971126 (`6c0a22f`).

### Milestone 74 — Close the implemented-but-not-Done milestones with continuous integration evidence
- **Goal**: Verification-only and docs-only. Milestones 52, 52b, 52c and 54 are implemented but not marked Done. Where the missing evidence already exists in continuous integration, record it and correct stale status text; where only the owner can supply it (real Cloudflare account, real hostname, real virtual private server), say so and leave the status honest. **No code work is invented.** Approved by the owner on 2026-10-24 (Stage 1 Decision Packet, 'approve all').
- **Files**: `docs/TASKS.md` (rows Milestones 52, 52b, 52c and 54), `docs/CHANGELOG.md`, `docs/MIGRATION_PLAN.md` (status lines of those four entries only)
- **Spec** (each line is a proposal for the owner to confirm):
  - Milestone 52c → Done: the `TASKS` row says "continuous integration pending on the pull request", but pull request #21 ran continuous integration on head `303f806` (run 38169357779, conclusion success) and the merge to `main` also passed (run 38172920361, success). Executing this milestone must read the per-job results from those run pages and cite them; the per-job list is unverified until then.
  - Milestone 54 → Done for its stated scope (stop/start persistence; scripts) if the `prod-stack` Milestone 54 section is confirmed green in run 38175670202 (pull request #22 head `bec4670`) and 38177262468 (merge). The real-VPS items (first real backup, `backup-verify.sh`, restore drill, off-host copy, schedule) stay in `docs/DEPLOYMENT.md` "Launch blockers" and are owner actions.
  - Milestones 52 and 52b stay "Implemented" unless the owner accepts the remaining real-key and real-tunnel checks as launch blockers rather than milestone gaps. Stale text to correct either way: Milestone 52's "first-admin guard is an open owner decision" (closed by Architecture Decision Record 036) and Milestone 52b's "Next.js upgrade remains a launch blocker" (closed by Milestone 52c, Architecture Decision Record 037).
- **Dependencies**: Milestones 52, 52b, 52c and 54 (all merged)
- **Testing**: every status change cites a continuous integration run id and job; `/team-status` shows no reconciliation difference between `TASKS`, `MIGRATION_PLAN` and `CHANGELOG`.
- **Rollback**: Revert the commit.
- **Commit message**: `Record CI evidence and close verification-only gaps for M52c and M54 (M74)`
- **Status (2026-10-24, Milestone 81)**: In review. Merged to `main` via pull request #32 (`762e69a`); awaiting owner sign-off. Milestones 52 and 52b stay "Implemented, verification partial". Continuous integration: all six jobs green on the `main` push run 40093971126 (`6c0a22f`).

### Milestone 75 — Reject whitespace and control characters in promo links
- **Goal**: Close a gap in the Milestone 71 link validator. `validatePromoLink` accepts `"/\t/evil.com"`: it starts with `/`, and contains no `//`, `/\` or `:`. The WHATWG URL parser strips tab and newline, so the value resolves to an external host: `new URL('/\t/evil.com','https://shop.example.com').href` returned `https://evil.com/` (node, 2026-10-24); same for a newline. Exposure is limited because only admins can write a card, but the Milestone 71 spec says the link must be an internal path. Approved by the owner on 2026-10-24 (Stage 1 Decision Packet, 'approve all').
- **Files**: `collections/PromoCards.ts` (`validatePromoLink` only), `docs/DECISIONS.md` (the Architecture Decision Record 039 decision 2 clause is already recorded in the 2026-10-24 amendment; no further Architecture Decision Record edit), `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**: also reject any value that contains whitespace or a control character (`/[\s\u0000-\u001f\u007f]/`). No schema change, no migration, no data change; before shipping, list existing `promo_cards.link` values to confirm none become invalid.
- **Dependencies**: Milestone 71
- **Testing**: the existing 8 validator cases still pass; `"/\t/x"`, `"/\n/x"`, `"/ x"` and `"/a b"` are rejected; `/category/electronics` is accepted; an anonymous write is still 403; lint, type-check and build pass. Gate G6 by the Security/Performance role (public-output surface).
- **Rollback**: Revert the commit.
- **Commit message**: `Reject whitespace and control characters in promo card links (M75)`
- **Status (2026-10-24, Milestone 81)**: In review. Merged to `main` via pull request #32 (`762e69a`); awaiting owner sign-off; the G6 (Security/Performance) review is recorded as pending in `docs/TASKS.md`. Continuous integration: all six jobs green on the `main` push run 40093971126 (`6c0a22f`).

### Milestone 76 — Storefront accessibility polish
- **Goal**: Fix the small accessibility defects found in a read-only G3 review of Milestones 60 to 72. User interface only. Approved by the owner on 2026-10-24 (Stage 1 Decision Packet, 'approve all').
- **Files**: `components/ui/FeaturedTabs.tsx`, `components/ui/MobileTabBar.tsx` (only if the contrast check fails), `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**:
  - `FeaturedTabs.tsx:74`: the `<ul>` carries `role="tabpanel"`, which removes the list semantics from its `<li>` children and the panel is not focusable. Wrap the list in `<div role="tabpanel" tabIndex={0}>` and leave the `<ul>` plain.
  - `FeaturedTabs.tsx:79` (unverified): confirm the parent builds tabs only from categories that have items, so no tab opens an empty panel. Change code only if this fails.
  - `MobileTabBar.tsx:33` (unverified): the 11px labels use `text-muted`; measure its contrast on the bar background and raise the size or darken the token only if it is below 4.5:1.
- **Dependencies**: Milestones 68 and 61
- **Testing**: screen-reader semantics of the Featured panel checked with the accessibility tree; keyboard reaches the panel; measured contrast recorded; no layout change at 320, 390 and 1440px; lint, type-check, build and the Playwright suite pass.
- **Rollback**: Revert the commit.
- **Commit message**: `Fix Featured tab panel semantics and verify tab bar contrast (M76)`
- **Status (2026-10-24, Milestone 81)**: In review. Merged to `main` via pull request #32 (`762e69a`); awaiting owner sign-off. Continuous integration: all six jobs green on the `main` push run 40093971126 (`6c0a22f`).

### Milestone 78 — Declare `tsx` as a devDependency
- **Goal**: `scripts/*` and `npm run seed`/`deploy:migrate` call `tsx`, which today only resolves transitively from `node_modules/.bin`; declare it so a dependency update cannot silently remove it. Approved by the owner on 2026-10-24 (Decision Packet #8, a package change).
- **Files**: `package.json`, `package-lock.json`, `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**: pin the exact version already resolved in the lockfile (`4.22.4` at `package-lock.json:11201-11202` on 2026-10-24; re-check before editing), as an exact pin like the other dependencies, in `devDependencies` only; no other change.
- **Dependencies**: Milestone 2a
- **Testing**: `npm ci`, `npm run type-check`, `npm run lint`, `npm run test:env`, `npm run build`; `git diff package-lock.json` shows only the `tsx` root entry change; continuous integration all six jobs, especially `migrations` and `prod-stack` (they run the `tsx` scripts); `npm audit` count unchanged.
- **Rollback**: Revert the commit.
- **Commit message**: `Declare tsx as a devDependency (M78)`
- **Status (2026-10-24, Milestone 81)**: In review. Merged to `main` via pull request #32 (`762e69a`); awaiting owner sign-off. Continuous integration: all six jobs green on the `main` push run 40093971126 (`6c0a22f`).

### Milestone 79 — Close the Next.js advisories published after Milestone 52c
- **Goal**: `npm audit` on 2026-10-24 reports `next@16.3.8` as critical (vulnerable range `16.0.0 – 16.4.0`; fixed from `16.4.1`; all three share the range `>=16.0.0 <=16.4.0`): GHSA-2464-fhr4-w9xw (unauthenticated RCE in the Image Optimization API), GHSA-p3m5-59mp-jv5r (denial of service in App Router Server Actions) and GHSA-673q-mjm6-r5xr (RCE in `use cache` functions). `docs/DEPLOYMENT.md` "Launch blockers" item 1 and Architecture Decision Record 037 recorded "critical 2 → 0" on 2026-10-11, before these were published. Read-only G6 review (2026-10-24): the image-optimizer RCE is closed by configuration (`images.unoptimized: true`, `/_next/image` rewritten to 404, uploads limited to JPEG/PNG/WebP/GIF), the `use cache` RCE has no matching code in the app, but the **Server Actions DoS is reachable without authentication** (checkout and order lookup) and has no mitigation. Also raise the `undici` override to `7.30.1` (its current pin `7.29.1` is flagged high; `npm view undici@7.30.1` resolves). Approved by the owner on 2026-10-24 (Stage 3 message approving Milestone 79). **Version chosen with evidence (2026-10-24):** the release notes of `v16.4.1` list exactly these three advisories; `v16.4.2` adds Turbopack build-correctness backports and no security item; `v16.4.3` (published 2026-10-23, under a day old) adds no security item. `16.4.2` is therefore the newest release that is at least a week old; the minimum is `16.4.1` and the latest is `16.4.3`, and moving either way is a one-line pin the owner may ask for. The amending decision is Architecture Decision Record 040 (Accepted 2026-10-24; the owner confirmed 16.4.2).
- **Files**: `package.json`, `package-lock.json` (`next` and `eslint-config-next` exact `16.4.2`; `overrides.undici` `7.30.1`), `next.config.mjs` (the stale `next@15.4.11` comment only), `docs/DECISIONS.md` (a new Architecture Decision Record by the Software Architect that amends Architecture Decision Record 037's pin; Architecture Decision Record 037 itself is not edited), `docs/DEPLOYMENT.md` ("Launch blockers" item 1), `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**: no behaviour change. `16.4.2` is inside `@payloadcms/next@3.90.2`'s peer range (`>=16.3.3 <17`; `npm view @payloadcms/next@3.90.2 peerDependencies.next`). Publish times from `npm view next time`: 16.4.0 2026-10-06, 16.4.1 2026-10-14, 16.4.2 2026-10-15, 16.4.3 2026-10-23. Do **not** apply the `npm audit` "fix" for `@payloadcms/richtext-lexical` (it proposes a downgrade to 3.78.0); the `dompurify`, `happy-dom` and `@lexical/headless` findings are admin-side or dormant and wait for a Payload release.
- **Dependencies**: Milestones 52c and 78
- **Testing**: `npm audit` shows no `next` advisory and no critical `next`; lint, type-check, `npm run build`, `test:env`, `test:turnstile`, `test:idempotency`, `test:users-guard`; `/_next/image` still returns 404; the checkout and order-lookup server actions work (continuous integration `e2e` golden path); all six continuous integration jobs green; `npm audit` before and after recorded.
- **Rollback**: `git revert` the commit and `npm ci` (restores 16.3.8). No schema or data change.
- **Commit message**: `Upgrade Next.js to 16.4.2 and close the post-M52c advisories (M79)`
- **Status (2026-10-29)**: **Done**; owner sign-off 2026-10-29 (`docs/TASKS.md` row Milestone 79). Merged to `main` via pull request #33 (into `stage2/close-out`, `5bf7615`) and pull request #34 (`a7918a7`). Architecture Decision Record 040 is Accepted. `npm audit` on the release commit and the deploy are owner steps. Continuous integration: all six jobs green on the `main` push run 40093971126 (`6c0a22f`).

### Milestone 80 — Make the deploy step prove that migrations were applied
- **Goal**: Pull request #32's continuous integration run 40084395694 (attempt 1) showed `payload migrate` exiting 0 after about 1.4 s with **no output at all** (not even Payload's `No email adapter provided` line), creating no schema; the next step, `db-roles`, then failed with `relation "payload_migrations" does not exist`. The deploy step still failed closed (non-zero exit), but with a misleading message from `db-roles`, and the continuous integration assertion `select count(*) from users` failed for the wrong reason. The same job passed on attempt 2, and 40 local repeat runs on a one-core-pinned machine could not reproduce it, so the root cause is **unverified** (best-supported mechanism: `node_modules/payload/bin.js` runs `void start()` and, on Node 22.15+, disables `module.registerHooks` and falls back to tsx's async worker hooks; a never-settling promise with an empty event loop makes Node exit 0 silently). Whatever the cause, a silent no-op migrate must never be mistaken for success. Approved by the owner on 2026-10-24 ("Accept Architecture Decision Record 040 with 16.4.2, approve Milestone 80").
- **Files**: `package.json` (`deploy:migrate` order only), `scripts/verify-migrations.ts`, `.github/workflows/ci.yml` (the "fails closed" step's assertion), `docs/DEPLOYMENT.md`, `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**:
  - Run the verifier **immediately after** `payload migrate` and before `db-roles` (`tsx scripts/check-env.ts && payload migrate && tsx scripts/verify-migrations.ts && tsx scripts/db-roles.ts && tsx scripts/bootstrap-admin.ts`).
  - `verify-migrations.ts` additionally fails with one clear line when `payload_migrations` does not exist, when any migration file has no row (it already checks the second), or when the `users` table does not exist, naming the missing item and saying "`payload migrate` exited 0 but the schema is incomplete".
  - The continuous integration step "The deploy step fails closed on an empty database with no bootstrap credentials" asserts the non-zero exit and, when the schema exists, `users` has 0 rows; it must not treat a missing schema as a pass of the second assertion.
  - No change to `payload migrate`, to the role model (Architecture Decision Record 036) or to what `deploy:migrate` creates.
- **Dependencies**: Milestones 52a and 52b
- **Testing**: on a fresh database the full chain still succeeds; with bootstrap credentials empty it fails at `bootstrap-admin` with `users` at 0 rows; a simulated no-op migrate (run the verifier against an empty database) exits non-zero with the new message; a second run is still a no-op; continuous integration `migrations` and `prod-stack` green; lint and type-check pass.
- **Rollback**: Revert the commit.
- **Commit message**: `Verify migrations right after payload migrate in the deploy step (M80)`
- **Status (2026-10-24, Milestone 81)**: In review. Merged to `main` via pull request #35 (`6c0a22f`); awaiting owner sign-off. Continuous integration green on the pull request head `cee6756` (run 40093734346) and on `main` (run 40093971126). The root cause of the pull request #32 no-op migrate (run 40084395694, attempt 1) is still unverified.

### Milestone 81 — Documentation sync after pull requests #32, #34 and #35
- **Goal**: Make the status documents say what is already merged to `main` (pull requests #30, #32, #33, #34, #35), with no behaviour change: replace the stale "branch `stage2/close-out` / `m79/next-16-4`" wording, give Milestones 52, 52b, 57 to 59 and 73 to 80 a per-entry Status line, fix the stale "no test framework" sentence, and close the Readiness Report rows that code and Done milestones already resolve, each with cited evidence.
- **Files**: `docs/TASKS.md`, `docs/CHANGELOG.md`, `docs/MIGRATION_PLAN.md`, `docs/PHASE_1_READINESS_REPORT.md`
- **Dependencies**: Milestone 80 (merged via pull request #35, `6c0a22f`)
- **Testing**: `git diff --stat` lists only the four files; the header and Summary milestone count equals `grep -c '^### M[0-9]' docs/MIGRATION_PLAN.md`; every status change names the pull request or commit that supports it; every Readiness row closed names the milestone, file and line read; no row is moved to Done that needs the owner's verification or sign-off; the Readiness Report's verification snapshot records each gate as observed (passed / failed / not run, with the reason).
- **Rollback**: `git revert` of the single Milestone 81 commit.
- **Commit message**: `docs(m81): sync TASKS, CHANGELOG, plan and readiness report with merged PRs #32/#34/#35`
- **Status (2026-10-29)**: In review. Merged to `main` via pull request #36 (`4fb0e06`, 2026-10-24); awaiting owner sign-off. Requested by the owner, including a one-time exception that lets the Engineering Manager edit `docs/MIGRATION_PLAN.md` and `docs/PHASE_1_READINESS_REPORT.md`, which no role file lists as writable. Docs only; no Architecture Decision Record changed.

#### Milestone 77 — Smaller self-hosted font file (Deferred by owner decision 2026-10-24; optional)
- **Goal**: Milestone 72 ships the unmodified upstream variable TTF (about 176 KB) where Google used to serve a 27 KB Latin WOFF2. Convert to a Latin WOFF2 subset with the same 400–800 range to cut the first-load font cost. Optional performance work, not a launch requirement.
- **Files**: `app/fonts/` (the font file and `OFL.txt`), `app/(public)/layout.jsx` (the font path only), `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**: check the font's `OFL.txt` for a Reserved Font Name before modifying the file (unverified: if one is reserved, a subset must be renamed); keep the licence file; same `weight`, `variable` and `display`.
- **Dependencies**: Milestone 72
- **Testing**: the home page requests exactly one font file; its size is recorded before and after; the body's computed font is still the same family; Latin product names and the `Rs. 1,500` format render; no `fonts.googleapis.com` in source or build output; lint, type-check, build and the Docker `image` job pass.
- **Rollback**: Revert the commit.
- **Commit message**: `Serve Plus Jakarta Sans as a Latin WOFF2 subset (M77)`

---

## Summary

Groups are labels, not a sequence. Read the **Order** column for execution.

| Milestones | Group | Order |
|---|---|---|
| Milestones 14, 16, 17 and 19 | Remove the multi-vendor surface (`app/store/**` and admin routes) | **First — must precede Milestone 3** (see [Architecture Decision Record 014](./DECISIONS.md#architecture-decision-record-014-milestone-14-is-a-hard-prerequisite-of-milestone-3-not-an-order-independent-milestone)) |
| Milestones 1, 2, 2a, 3, 4 and 5 | Foundation & tooling: Docker Postgres, Payload, TypeScript, retire Prisma | After the Milestone 14/`/admin` clearance above |
| Milestones 15 and 18 | Remove the multi-vendor surface (remaining non-admin routes) | Any time — no dependencies |
| Milestones 6 to 13, 13a | Payload collections: Users, Media, Categories, Products, Orders, Settings global | After Milestone 3 (Milestone 13a after Milestone 6) |
| Milestones 20 to 21 | Confirm admin-only auth end to end | After Milestones 17 and 19 |
| Milestones 22 to 28 (incl. Milestones 27a and 27b) | Storefront wired to real product/category data; category browsing routes; dummy data removed | After Milestone 13 |
| Milestone 29 | Real search | After Milestone 24 |
| Milestones 30 to 36 | Cart persistence, guest checkout, real cash on delivery order creation | After Milestone 13 (Milestone 30 any time) |
| Milestones 37 to 39 | Admin order fulfillment | After Milestone 33 |
| Milestones 40 to 43 | Search engine optimization: server rendering, metadata, sitemap, structured data | After Milestones 23 and 25 |
| Milestones 44 to 45 | Mobile-first audit and performance | After Milestone 28 |
| Milestones 46 to 48 | Reviews/Coupons: decide and land minimal v1 scope | After Milestones 25 and 33 |
| Milestones 49 to 54 (incl. Milestones 52a and 52b) | Docker production hardening, health checks, backups; Turnstile and CGNAT-safe rate limits (Milestone 52b) | After Milestone 5 (Milestone 52b after Milestones 52, 33 and 36) |
| Milestones 55 to 56 | PKR currency and Pakistani address/phone validation | After Milestone 28 |
| Milestones 57 to 59 | Regression pass, docs, launch | Last |

**102 milestone entries** (counted 2026-10-29 as `### M…` headings) — Milestones 1 to 59 (59), the storefront redesign group Milestones 60 to 72 (13), the pre-launch close-out group Milestones 73 to 76, 78, 79, 80 and 81 (8; Milestone 77 is deferred, kept as a `####` entry, and not counted), Milestones 90 to 99 (10; Milestone 99 in progress), and twelve decimal insertions (Milestones 2a, 13a, 27a, 27b, 33a, 45a, 48a, 52a, 52b, 52c, 55a and 56a). The decimal-insertion text that follows is historical (written when the total was 69): ten decimal insertions (the four named here, plus Milestones 33a, 48a, 52a, 55a and 56a added 2026-08-18, and Milestone 52b added 2026-10-11 per [Architecture Decision Record 035](./DECISIONS.md#architecture-decision-record-035-cloudflare-turnstile-on-order-placement-and-lookup-a-per-phone-order-limit-and-a-per-ip-flood-ceiling--cgnat-safe-rate-limits-milestone-52b)) that avoid renumbering the rest: Milestone 2a (TypeScript toolchain), Milestones 27a and 27b (category browsing routes, closing readiness finding **C8** per [Architecture Decision Record 013](./DECISIONS.md#architecture-decision-record-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy)), and Milestone 13a (Settings global, closing readiness risk **R6** per [Architecture Decision Record 018](./DECISIONS.md#architecture-decision-record-018-shipping-model--flat-rate-with-a-free-shipping-threshold-snapshotted-per-order)).

**Numbering gap Milestones 82 to 89 (intentional).** These IDs were never assigned: no milestone, branch, pull request or document uses them, and the sequence resumes at Milestone 90. They are not missing work and are not counted above.

### Milestone 90 — Demo catalogue seed for client preview
- **Goal**: An idempotent, local-only `npm run seed:demo` that fills a development database with a believable catalogue for showing the storefront and `/admin` to a client. No schema, dependency or production change.
- **Files**: `scripts/seed-demo.ts`, `scripts/demo-data/{catalogue,art}.ts`, `demo-assets/README.md`, `package.json` (script only), `.gitignore`, `docs/{TASKS,CHANGELOG}.md`
- **Spec**: 15 categories (4 parents, 11 children), 24 invented brand-neutral products with PKR prices and 2 generated images each, `Settings` with clearly fake contact placeholders, and with `--with-orders` 8 fake sample orders. Find-or-create only: never updates or deletes a row it did not create and never touches users. Fails closed on `NODE_ENV=production`, `TUNNEL_TOKEN`, `APP_DB_PASSWORD`, the `gocart_app` database role or a non-local database host. Optional real photos from `demo-assets/` (never committed).
- **Dependencies**: Milestones 13, 13a, 33 and 70 (the draft listed Milestone 52b by mistake; corrected with owner approval, see CHANGELOG)
- **Status (2026-10-29)**: In review. Merged to `main` via pull request #37 (`a4b7db9`, 2026-10-26); awaiting owner sign-off. This entry was added after the merge: the milestone was tracked only in `docs/TASKS.md` and `docs/CHANGELOG.md` until then.
- **Testing**: as recorded in `docs/TASKS.md` row Milestone 90: verified in the sandbox on a throwaway PostgreSQL 16, not via `docker compose exec` (no Docker daemon there). The idempotency and fail-closed cases are described in `docs/CHANGELOG.md`; this entry does not add evidence of its own.
- **Rollback**: Revert the commit; remove demo rows by hand in `/admin` (steps in `demo-assets/README.md`).
- **Commit message**: `Add idempotent demo catalogue seed for client preview (M90)`

### Milestone 91 — Deals of the day and browser-only wishlist
- **Goal**: Build the two design-only home features the owner approved on 2026-10-27, on real data only ([Architecture Decision Record 041](./DECISIONS.md)).
- **Files**: `collections/Products.ts`, `migrations/<timestamp>_deal_ends_at.{ts,json}` and `migrations/index.ts` (generated), `lib/payload/products.ts` (`getDealProducts`), `components/DealsOfTheDay.tsx`, `components/ui/{Countdown,WishlistButton}.tsx`, `components/{ProductCard,Navbar}.jsx`, `app/(public)/page.jsx`, `app/(public)/wishlist/`, `lib/features/wishlist/wishlistSlice.js`, `lib/store.js`, `app/StoreProvider.js`, `docs/{DECISIONS,TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**: see Architecture Decision Record 041. A heart on every card (name `Wishlist: {name}`, `aria-pressed`), a header link "Wishlist, N items" before the cart, and `/wishlist`.
- **Dependencies**: Milestones 62 and 70
- **Testing**: no deal set means no section; a product with a future `dealEndsAt` and `mrp > price` appears with a running countdown, and one with a past date or no discount does not; the heart toggles, survives a reload and updates the header count; `/wishlist` lists the saved products and shows an empty state otherwise; the migration applies on an empty database; no horizontal scroll at 390px; lint, type-check and build pass; the Playwright suite passes in continuous integration.
- **Rollback**: Revert the commit; after a deploy, ship a forward migration dropping `deal_ends_at`.
- **Commit message**: `Add deals of the day and browser-only wishlist (M91)`

### Milestone 92 — Category sort and filter, and cart Undo
- **Goal**: Build the Category and Cart gaps the owner approved from the redesign audit on 2026-10-29, on real data only ([Architecture Decision Record 042](./DECISIONS.md)). Product and Checkout gaps were rejected by Architecture Decision Records 004, 016, 017 and 018 or need data that does not exist; checkout stays on `/cart` (Milestone 65).
- **Files**: `lib/category-filters.ts`, `lib/payload/categories.ts`, `components/ui/CategoryControls.tsx`, `app/(public)/category/[slug]/page.tsx`, `app/(public)/cart/page.jsx`, `lib/features/cart/cartSlice.js`, `scripts/category-filters.test.ts`, `package.json`, `.github/workflows/ci.yml`, `docs/{DECISIONS,TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**: see Architecture Decision Record 042.
- **Dependencies**: Milestones 63 and 65
- **Testing**: sort by price orders cards low to high and high to low; price range and discount filters narrow the count; a no-match filter shows "No products match" with Clear all; invalid params show the plain category; a refined URL is `noindex` with the plain canonical, the plain listing is unchanged; removing a cart line shows Undo, which restores the line and quantity (also after removing the last line) and survives a reload; no horizontal scroll at 390px; `npm run test:category-filters`, lint, type-check and build pass; Playwright passes in continuous integration.
- **Rollback**: Revert the commit; no migration.
- **Commit message**: `Add category sort and filter and cart undo (M92)`

### Milestone 93 — Logo mark and scrolling announcement bar
- **Goal**: Show the redesign's logo (four-bar mark, two-tone store name) in the header and make the announcement bar's message scroll left to right, as the owner asked on 2026-10-29. User interface only; no schema, no dependency.
- **Files**: `components/ui/BrandLogo.tsx`, `components/{Navbar,Footer}.jsx`, `components/AnnouncementBar.tsx`, `app/globals.css`, `scripts/seed-demo.ts` (placeholder store name), `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**: the name comes from Settings `storeName` (renamed in /admin, not hard-coded); its last two letters use the brand colour. The scrolling text stays the real delivery note (Settings) plus "Cash on delivery across Pakistan"; it pauses on hover and focus, stands still under `prefers-reduced-motion`, and is announced once to screen readers.
- **Dependencies**: Milestone 61
- **Testing**: header shows the mark and the two-tone name; the bar moves left to right, pauses on hover and does not move with reduced motion; no horizontal scroll at 390px; lint, type-check and build pass; Playwright passes in continuous integration.
- **Rollback**: Revert the commit; no migration.
- **Commit message**: `Add logo mark and scrolling announcement bar (M93)`

### Milestone 94 — Dev compose: share ./media with the host (no separate media volume)
- **Goal**: Stop broken product images when the dev app is run both ways. The dev `app` service mounted a named volume `app-media` over `/app/media`, hiding the host's `./media`, so pictures seeded on the host were invisible in Docker and the reverse. Owner-approved 2026-10-29. Dev stack only.
- **Files**: `docker-compose.yml`, `scripts/seed-demo.ts` (comment), `demo-assets/README.md`, `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**: remove the `app-media` mount and volume from the dev compose file; `.:/app` already maps `/app/media` to `./media`. `docker-compose.prod.yml`, its `app-media` volume and `scripts/backup.sh` (default project `gocart-prod`) are unchanged.
- **Dependencies**: Milestone 50
- **Testing**: after `docker compose up`, a file in `./media` is served at `/api/media/file/<name>` by the container, and an upload made in the container appears in `./media`; the compose file parses; continuous integration is unaffected (it uses only the prod compose file). Not run in the authoring sandbox, which has no Docker daemon (unverified until the owner tries it).
- **Rollback**: Revert the commit. Pictures already in `./media` stay on the host.
- **Commit message**: `Share ./media between host and dev container (M94)`

### Milestone 95 — Admin re-skin and Overview home
- **Goal**: Give `/admin` the storefront's look and an Overview home built from real data, from the sample admin screens the owner shared on 2026-10-29 ([Architecture Decision Record 043](./DECISIONS.md)). User interface only; Payload keeps owning `/admin`; no schema, no migration, no dependency.
- **Files**: `app/(payload)/custom.css`, `app/(payload)/layout.tsx`, `app/(payload)/admin/importMap.js` (generated), `payload.config.ts`, `components/admin/{Dashboard,Logo,NavLinks}.tsx`, `docs/{DECISIONS,TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**: see Architecture Decision Record 043.
- **Dependencies**: Milestones 3 and 61
- **Testing**: log in at `/admin`: the login page and sidebar show the logo and store name; the Overview shows the counts, sales and latest orders from real data (and an empty state with no orders); a signed-out visitor still cannot reach `/admin`; collection list and edit screens keep working and are restyled; no horizontal scroll of the Overview at 390px; type-check (with and without `payload-types.ts`), lint, build pass; Playwright passes in continuous integration.
- **Rollback**: Revert the commit; no migration.
- **Commit message**: `Re-skin the admin and add an Overview home (M95)`


### Milestone 96 — Orders list: pills, Rs. amounts, inline status and paid
- **Goal**: Make the admin Orders list readable and quick to work from: status pills, `Rs.` amounts, a Paid/Unpaid badge, and changing status or paid straight from a row ([Architecture Decision Record 044](./DECISIONS.md)). User interface only; no schema, no migration, no dependency.
- **Files**: `collections/Orders.ts`, `components/admin/{OrderCells,OrderAmountCell}.tsx`, `app/(payload)/custom.css`, `app/(payload)/admin/importMap.js` (generated), `docs/{DECISIONS,TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**: see Architecture Decision Record 044.
- **Dependencies**: Milestone 95
- **Testing**: in `/admin/collections/orders`: totals show as `Rs. 4,699`; changing a row's status and toggling Paid persist after a reload; a failed save reverts the control and shows "Not saved"; search, sort, filters and the edit page still work; type-check (with and without `payload-types.ts`), lint, build pass.
- **Rollback**: Revert the commit; no migration.
- **Commit message**: `Add inline status and paid to the Orders list (M96)`

### Milestone 97 — Dependency audit follow-up
- **Goal**: Clear the one critical `npm audit` finding and the safe fixes after Milestone 79, and record what is accepted ([Architecture Decision Record 045](./DECISIONS.md)). Package change only.
- **Files**: `package.json`, `package-lock.json`, `docs/{DECISIONS,TASKS,CHANGELOG,MIGRATION_PLAN,DEPLOYMENT}.md`
- **Spec**: see Architecture Decision Record 045.
- **Dependencies**: Milestone 79
- **Testing**: `npm ci`; `npm audit --omit=dev` shows no critical; `npm ls dompurify` shows 3.4.17; type-check, lint, `test:category-filters` and the production build pass; continuous integration green.
- **Rollback**: Revert the commit.
- **Commit message**: `Pin dompurify and update fast-uri to clear audit findings (M97)`

### Milestone 98 — Design review pass
- **Goal**: Fix the ten highest-impact design problems found by reviewing the running storefront (390px and 1440px) and `/admin`, as the owner asked on 2026-10-29. User interface only; no schema, no migration, no dependency.
- **Files**: `app/(public)/{not-found.tsx,[...missing]/page.tsx,shop/page.jsx,cart/page.jsx,category/[slug]/page.tsx}`, `components/{Navbar,Footer,ProductCard,ProductDetails}.jsx`, `components/{AnnouncementBar.tsx,ui/CategoryNav.tsx,ui/CategoryTile.tsx,admin/ProductCells.tsx}`, `collections/Products.ts` (list cells only), `payload.config.ts` (`admin.avatar`), `app/(payload)/admin/importMap.js` (generated), `docs/{TASKS,CHANGELOG,MIGRATION_PLAN}.md`
- **Spec**: (1) an unknown URL shows the store's own 404 inside the header and footer, still HTTP 404; (2) the announcement bar, header, category row and footer share the pages' content width, so the logo lines up with the content; (3) product card prices line up across a row whether or not there is a discount; (4) an out-of-stock card's image is dimmed; (5) the product page says the delivery note once and its gallery is square on desktop; (6) `/shop` gets a breadcrumb, a plain heading and a product count, and a search with no match shows an empty state with a way back; (7) the category banner icon is no longer clipped; (8) the home category tiles' links clear the corner icon; (9) the footer's Shop and Help lists sit side by side on phones; (10) the admin Products list shows `Rs.` prices and In stock / Sold out pills, and the admin avatar is Payload's local icon instead of Gravatar.
- **Dependencies**: Milestones 61 and 95
- **Testing**: before/after screenshots of every storefront page at 390px and 1440px and of `/admin`; unknown URLs return 404 while `/admin`, `/api`, `/robots.txt`, `/sitemap.xml` are unchanged; no sideways scroll at 320px; lint, type-check, `test:category-filters` and the production build pass; Playwright passes in continuous integration.
- **Rollback**: Revert the commit; no migration.
- **Commit message**: `Fix ten storefront and admin design problems from a review pass (M98)`

### Milestone 99 — Launch hardening: close the DEPLOYMENT.md launch blockers
- **Status (2026-10-29)**: **In progress** (blocker 1 audit recorded; (a) `scripts/backup-cron.sh` written and tested, first virtual private server run pending; (d) decided: launch without order email; blockers 2-5 owner-run). Drafted from `docs/DEPLOYMENT.md`, "Launch blockers", and approved by the owner on 2026-10-29 with scope items (a) and (d) included and (b) and (c) left out.
- **Goal**: Clear or explicitly accept each of the five launch blockers, with recorded evidence, so the stack can be declared cleared for launch and Milestone 59's release tag cut. Most of this is owner-run on the real virtual private server and Cloudflare account; the repository side is recording evidence and correcting the docs.
- **Files**: `docs/{DEPLOYMENT,TASKS,CHANGELOG,MIGRATION_PLAN}.md`; for (a), the backup schedule (a `cron` entry or wrapper beside `scripts/backup.sh`, documented in `docs/DEPLOYMENT.md`). No application code.
- **Spec** (one line per blocker; "owner" = needs the real virtual private server, domain or Cloudflare account; the AI team cannot do it):
  1. **`npm audit` on the release commit** (blocker 1). Repo: run `npm audit --omit=dev` on the commit to be deployed and record the counts; launch only with 0 critical, or an explicit written owner acceptance of what remains (the 15 Payload-owned findings accepted in Architecture Decision Record 045). Owner: deploy that commit.
  2. **Real Cloudflare checks with real keys** (blocker 2; closes Milestone 52b's partial verification). Owner: real Turnstile keys for the production hostname; one real order and one lookup; the app logs show no `[turnstile]` or `[order-guard]` lines.
  3. **First deploy checks** (blocker 3; closes Milestone 52's partial verification and runs Milestone 59's runbook for the first time). Owner: follow the Launch checklist on the clean virtual private server; the gated migrate step succeeds (Milestone 80 verifier); `/admin` login with the bootstrap credentials; both bootstrap variables removed from the env file and the gate re-run; `cloudflared` connects with the real tunnel token; continuous integration `prod-stack` green on the deployed commit.
  4. **Cloudflare WAF rate-limiting rule** (blocker 4). Owner: rule on `POST` to `/cart` and `/orders` per "Launch decisions" (paid plan about 30/min/IP; Free plan about 10 per 10 s per IP, Block); record the plan and the rule as configured.
  5. **Backups and health** (blocker 5; closes the open part of Milestone 54, uses Milestone 53). Owner: first real backup and a `backup-verify.sh` run on the virtual private server; one restore rehearsed on a scratch machine; `.gpg` copies kept off the host; a backup schedule chosen; an external uptime monitor on `https://<host>/api/health` (200); `docker compose ps` shows `app` healthy.
  6. **Docs**: each blocker in `docs/DEPLOYMENT.md` marked closed with date and evidence, or "accepted by the owner" with the reason; remove the stale "Not covered yet" line that says the Next.js fix is on branch `m79/next-16-4` (merged in pull request #34); Milestones 52, 52b and 59 moved to Done in `docs/TASKS.md` only on that evidence.
- **Scope decided by the owner (2026-10-29)**:
  - **(a) Included: a scheduled backup job**, written and verified. It runs `scripts/backup.sh` on the virtual private server on the schedule the owner chooses (default daily, per "Launch decisions"), with `BACKUP_PASSPHRASE_FILE` set and its output logged; verified by one scheduled run producing a backup that `scripts/backup-verify.sh` accepts. The repository side (the schedule entry and its docs) can be written and checked locally; the run on the virtual private server is owner-only.
  - **(d) Included: the order-email decision. Decided 2026-10-29: launch without any order email for now** (recorded in `docs/DEPLOYMENT.md`, "Launch decisions"). The owner records in `docs/DEPLOYMENT.md` ("Launch decisions") whether the store launches without any order email. Building order email (Resend, Architecture Decision Record 015) is not part of Milestone 99: it would add a dependency and needs its own milestone and Architecture Decision Record.
  - **(b) Left out:** memory limits and `read_only` for `cloudflared` and `postgres` stay "Open" in "Launch decisions" (deferred).
  - **(c) Left out:** GitHub Actions stay pinned by tag (deferred).
- **Dependencies**: Milestones 52, 52b, 53, 54, 59, 79, 80 and 97 (all merged; Milestones 52 and 52b partial, Milestone 59 In review)
- **Testing**: one scheduled backup run on the virtual private server verified with `backup-verify.sh`; the order-email decision recorded; every blocker has a dated evidence line (command output, log excerpt, screenshot or Cloudflare setting) or a written owner acceptance; `npm audit --omit=dev` on the release commit shows 0 critical; the six continuous integration jobs green on that commit; `https://<host>/api/health` returns 200 from outside; a backup restored once.
- **Rollback**: Docs only in the base scope: revert the commit. Infrastructure steps follow `docs/DEPLOYMENT.md` (Cloudflare rule and monitor can be removed; the deploy is rolled back per the runbook).
- **Commit message**: `Record launch-blocker evidence and clear the stack for launch (M99)`

### Milestone 100 — Free non-commercial test deployment: Vercel Hobby + Neon Free + Vercel Blob
- **Status (2026-11-03)**: **Done, deployed to test.** Evidence (Vercel and Neon connectors, read-only): project `gocart-test` with READY production deployments of 2026-10-30 and of `a6aedc1` (2026-11-01); Neon `gocart-test` with all 8 committed migrations and the `gocart_app` role; Blob store `gocart-test-media` connected (63 objects). The post-deploy checks of the Testing line were recorded with Milestones 101 and 102 (DEPLOYMENT_VERCEL_TEST.md); this session could not reach the site over HTTP. Checkout stays off (no Turnstile keys, owner decision).
- **Status (2026-10-30)**: Proposed and approved under the owner's 2026-10-30 delegation ([GATES.md](../.claude/docs/GATES.md), "Owner delegation"); governance commit `6d0edb8`, merged as `96fa6f3`. A **test** environment only: it is not production, does not change the [Architecture Decision Record 015](./DECISIONS.md) baseline and supersedes no Accepted Architecture Decision Record ([Architecture Decision Record 046](./DECISIONS.md)).
- **Goal**: GoCart can be deployed to Vercel Hobby with a Neon Free database and Vercel Blob media storage for non-commercial testing ([Architecture Decision Record 046](./DECISIONS.md)), while local Docker development and the Docker production stack behave exactly as before (local-volume media unless `BLOB_READ_WRITE_TOKEN` is set).
- **Files**:
  - `payload.config.ts`: `vercelBlobStorage` for the `media` collection, token from `BLOB_READ_WRITE_TOKEN`, `clientUploads: true`, `enabled` only when the token is set. `prodMigrations` stays unset ([Architecture Decision Record 032](./DECISIONS.md)).
  - `next.config.mjs`: the Blob host in `images.remotePatterns`. `images.unoptimized` is **not** touched ([Architecture Decision Record 036](./DECISIONS.md)).
  - `.env.example`: the new variables, documented, no real values.
  - `docs/DEPLOYMENT_VERCEL_TEST.md`: new runbook (architecture, env vars, limits, the 30-day lockout on Hobby/Blob overage, redeploying, revoking tokens, the non-commercial notice, checkout non-functional without Turnstile). `docs/DEPLOYMENT.md` is the production runbook and is not edited.
  - `package.json` and `package-lock.json`: `@payloadcms/storage-vercel-blob` pinned to `3.90.2` (the installed Payload version; the package's peer dependency is exactly `payload@3.90.2`).
  - `vercel.json`: **not needed**; `iad1` is set on the Vercel project instead.
  - **Scope additions found during implementation (2026-10-30):** the Blob adapter adds `prefix` and `_objectKey` columns to `media` when enabled, so `alwaysInsertFields: true` is set (one schema in every environment) and one additive migration is committed: `migrations/20261030_172753_media_storage_fields.{ts,json}` and `migrations/index.ts`. `app/(payload)/admin/importMap.js` is regenerated so the admin can do client uploads.
  - `docs/{DECISIONS,TASKS,CHANGELOG,MIGRATION_PLAN}.md`.
- **Spec**: no collection, access-control, auth, payment, order-total or rate-limit change. Migrations run as an explicit owner-role step, never `prodMigrations`; the runtime uses the restricted `gocart_app` role created by `scripts/db-roles.ts` (Architecture Decision Record 036). Known gaps on Vercel (shared in-memory rate-limit bucket, Turnstile not configured so checkout is non-functional) are recorded in Architecture Decision Record 046 and the runbook, not fixed here.
- **Dependencies**: Milestones 8, 20, 51, 52a, 52b and 79 (all merged)
- **Testing**: `npm run type-check`, `npm run lint` and `npm run build` pass; with `BLOB_READ_WRITE_TOKEN` unset, the config registers no storage adapter and uploads still use `./media`; `gocart_app` has `SELECT/INSERT/UPDATE` on `media.prefix` and `media._objectkey`; continuous integration green. After deploy: `/`, a product page and `/admin` return 200; admin login works; one test upload lands on the Blob host, is served 200 and is deleted; server-side order totals and rate limiting are covered by the continuous integration unit tests (`test:idempotency`, `test:turnstile`) and the `e2e` job, not by a live checkout.
- **Rollback**: Revert the commit. The Vercel project, Neon project and Blob store named `gocart-test*` can be deleted by the owner; nothing in production depends on them.
- **Commit message**: `Add free test deployment on Vercel Hobby, Neon Free and Vercel Blob (M100)`

### Milestone 101 — Mirza brand migration and the 10-issue storefront user experience pass
- **Status (2026-11-01)**: **Done.** Approved by the owner's Milestone 101 brief (2026-10-31); merged (pull request #53), deployed and migrated on Neon 2026-11-01; the live second review passed (`MIRZA_UX_REVIEW.md`, section 4).
- **Goal**: Mirza is the single brand in the application, its code defaults and the current-state docs ([Architecture Decision Record 047](./DECISIONS.md)), and the ten highest-impact user experience problems from a real-browser baseline review of the test site are fixed ([MIRZA_UX_REVIEW.md](./MIRZA_UX_REVIEW.md)).
- **Files**:
  - Brand: `globals/Settings.ts`, `lib/payload/settings.ts`, `components/Navbar.jsx` (default `Mirza`); `migrations/20261031_160131_mirza_store_name.{ts,json}` and `migrations/index.ts` (column default only); `lib/order-confirmation.ts` (`mirza:last-order`, reads `gocart:last-order` as a fallback); `scripts/seed-demo.ts` (store name `Mirza`, no fake contact details); `lib/seo.ts` and `app/(public)/page.jsx` (og:title no longer repeats the brand; multi-category description); `app/(public)/layout.jsx` (default title); `components/ui/BrandLogo.tsx`, `components/admin/Logo.tsx`, `app/(payload)/custom.css`, `app/icon.svg`, `app/favicon.ico` (monogram).
  - Design system: `app/globals.css` (`@theme` values, "lavender wash" by owner choice: faintly violet page, lavender wells, bright violet accent, hot-pink sale colour, amber "Limited" label, pill buttons and labels; the marquee CSS is removed). Home page layout (owner-chosen mockups): `components/Hero.jsx` with `components/HeroSlider.tsx` (banner slider) and `components/HeroShortcuts.tsx` (category chips and the promises strip), slides from `lib/hero-slides.ts` (real data only), `components/HomeCategories.tsx` (tiles from `md`; removed on phones by the owner, where the hero's category shortcuts cover it), `components/{ProductRail,RailCard}.tsx` and `components/ui/ScrollRail.tsx` (large-card rails for New arrivals and Featured; the Featured category tabs still work), `components/CodSteps.tsx` (replaces the trust row); `components/{OurSpec.jsx,CategoryRow.tsx}` and `components/ui/TrustRow.tsx` are removed (no other user), and `lib/payload/categories.ts` reads children at depth 1 so their images show.
  - User experience: `components/Hero.jsx`, `components/ProductCard.jsx`, `components/ui/{Badge,QuickAddButton,CategoryTile,EmptyState}.tsx`, `lib/product-badges.ts`, `components/CategoryRow.tsx`, `components/{LatestProducts,BestSelling,Title,AnnouncementBar,ProductDetails,ProductDescription,Footer,TurnstileWidget}`, `app/(public)/not-found.tsx`, and a 700-weight heading pass across storefront files.
  - Every other storefront page in the home page's style (after the owner approved the home page at `94b2eae`; layout and classes only, no behaviour change): `components/ProductCard.jsx` (the RailCard look in a grid cell), `components/ui/{CategoryTile,CategoryControls,CategoryNav,EmptyState,MobileTabBar,QuantityStepper,RadioCard}.tsx`, `components/{Navbar,ProductDetails,OrderSummary,AddressModal,OrderItem}.jsx`, `components/{RelatedProducts,TurnstileWidget}.tsx` ("You may also like" is now a RailCard rail), and `app/(public)/{shop/page.jsx,categories/page.tsx,categories/loading.tsx,category/[slug]/page.tsx,category/[slug]/not-found.tsx,category/[slug]/error.tsx,cart/page.jsx,orders/OrderLookup.tsx,order-confirmation/OrderConfirmation.tsx,wishlist/page.tsx,not-found.tsx}` (the category 404 now has an `<h1>`; the wishlist has a breadcrumb).
  - Docs: `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `docs/{DECISIONS,MIGRATION_PLAN,TASKS,CHANGELOG,README,ARCHITECTURE,PROJECT_SPEC,FEATURE_MATRIX,CATEGORY_REQUIREMENTS,DEPLOYMENT,DEPLOYMENT_VERCEL_TEST,MIRZA_UX_REVIEW}.md`, `demo-assets/README.md`, `.claude/` titles. Accepted Architecture Decision Records are not edited.
- **Spec**: no collection field, access-control, auth, payment, order-total, Turnstile-policy or rate-limit change, and no new dependency. The only schema change is the `settings.store_name` column default. The retained `gocart` identifiers are listed in Architecture Decision Record 047. No stock photos are added: the review machine could not reach Unsplash (network policy, 2026-10-31), and the owner chose to add photos later.
- **Dependencies**: Milestones 61, 62, 93, 98 and 100 (all merged)
- **Testing**: `npm run type-check`, `npm run lint` (no new warnings), `npm run build`, `test:env`, `test:turnstile`, `test:category-filters`, `verify-migrations`, and no schema drift after the migration. 60+ real-browser screenshots of the branch at 375/390/430/768/1024/1440 px (local production build). Continuous integration green (including end-to-end) on the pull request. After the owner merges and the test site is redeployed, the migration is run on Neon with the owner role, and the second review is repeated on `gocart-test-inky.vercel.app` at all six widths.
- **Rollback**: Revert the commit, then run the migration's `down` (it restores the `GoCart` column default). Saved Settings values are unaffected either way.
- **Commit message**: `Rebrand to Mirza and fix ten storefront UX problems (M101)`

### Milestone 102 — Flat categories (no sub-categories) and the home page's category row
- **Status (2026-11-01)**: **Done.** Approved by the owner's request of 2026-11-01 (choices recorded in Architecture Decision Record 048); merged (pull request #54), deployed to the test site and migrated on Neon the same day.
- **Goal**: Categories are one flat level holding products, everywhere (schema, admin, storefront, seeds); the home page loses the desktop "Shop by category" tiles, and its category shortcuts become a swipeable row of circles on a phone ([Architecture Decision Record 048](./DECISIONS.md)).
- **Files**: `collections/Categories.ts` (no `parent`), `collections/Products.ts` (comment), `migrations/20261101_205147_flat_categories.{ts,json}` and `migrations/index.ts`, `lib/payload/categories.ts` (flat `getCategories`/`getCategoriesCached`, no roll-up), `lib/hero-slides.ts`, `app/(public)/page.jsx`, `app/(public)/category/[slug]/page.tsx`, `app/(public)/categories/{page,loading}.tsx`, `app/sitemap.ts`, `components/{HeroShortcuts.tsx,BestSelling.jsx,Footer.jsx}`, `components/ui/{CategoryNav,CategoryTile}.tsx`; `components/HomeCategories.tsx` removed; `scripts/{seed.ts,seed-demo.ts}`, `scripts/demo-data/catalogue.ts`, `demo-assets/README.md`; docs `DECISIONS` (Architecture Decision Record 048), `MIGRATION_PLAN`, `TASKS`, `CHANGELOG`, `CATEGORY_REQUIREMENTS` (note).
- **Spec**: one schema change (drop `categories.parent_id`) with the data steps in Architecture Decision Record 048: Smart Watches merged into Watches, display order renumbered, empty former departments deleted, no product left without a category. No new dependency; no change to checkout, prices, Turnstile or access control.
- **Dependencies**: Milestone 101 (merged).
- **Testing**: `npx tsc --noEmit`, `npm run lint` (no new warnings), `npm run build`, `test:env`, `test:turnstile`, `test:category-filters`; the migration up, down and up again on a copy of the demo database, then `verify-migrations`; 10 categories and 24 of 24 products with a category afterwards; the storefront at six widths with no overflow, alt or heading problems; end-to-end `seo` and `mobile` specs against the continuous integration seed; continuous integration green on the pull request.
- **Rollback**: Revert the commit and run the migration's `down` (restores the column only). To get the old categories back, restore the database from a backup taken before the migration.
- **Commit message**: `Flat categories, no sub-categories, and circle category shortcuts on phones (M102)`

## Group: Demo visual assets — Milestone 103 onward

**Status (2026-11-03): Milestones 103 to 108 Done (Milestone 108 live on the test environment since 2026-11-05, test only); Milestone 109 Proposed and ON HOLD until the owner gives the client's go-ahead** ([VISUAL_ASSETS_PLAN.md](./VISUAL_ASSETS_PLAN.md) is the master objective and decision record; [Architecture Decision Record 049](./DECISIONS.md) is Accepted 2026-11-03). Goal of the group: the temporary demo catalogue shows genuine, licence-verified product photography instead of generated art and blank placeholders, and can be removed safely before launch. Constraints: `images.unoptimized: true` and Architecture Decision Record 036 stay; no new dependency, no new image store, no schema change unless the owner approves one separately; local first, then the approved test environment only; never production. Order (by dependency): Milestones 103, 104, 105, 106, 107 and 108; Milestone 109 last, before launch.

### Milestone 103 — Media audit (read-only)
- **Status (2026-11-01)**: **Done** (owner accepted the audit 2026-11-01; the measured database audit is skipped). Approved by the owner 2026-11-01 (D1), narrowed by the owner: everything on the project is demo, so demo-versus-real classification was skipped. Done as a code-reading audit; no database was available, so row counts, file sizes and dimensions in real databases are **unverified**.
- **Goal**: Know which images are generated art or blank, which assets are missing, and which seed and component behaviours constrain the later stages.
- **Files**: `docs/assets/MEDIA_AUDIT.md` (new); `docs/VISUAL_ASSETS_PLAN.md`, `docs/MIGRATION_PLAN.md`, `docs/TASKS.md` (status and decisions). No application code, schema, data or dependency change. `DEMO_INVENTORY.csv` is not created.
- **Spec**: audit of the seeds, components and metadata; D7 network re-test; D8 assessment.
- **Dependencies**: Stage 0 (merged or open as pull request #56).
- **Testing**: nothing was written to any database; findings are checkable against the cited files. A measured database audit (query on `media`) remains an optional follow-up.
- **Rollback**: Delete `docs/assets/MEDIA_AUDIT.md` and revert the status edits.
- **Commit message**: `Audit demo media and image surfaces (M103)`

### Milestone 104 — Photo brief, sourcing and licence verification
- **Status (2026-11-02)**: **Done.** Approved by the owner 2026-11-01. All 61 slots are sourced from Unsplash with author, photo page, licence URL, check date and SHA-256 recorded ([assets/MANIFEST.csv](./assets/MANIFEST.csv)); report, method and limits in [assets/PHOTO_INVENTORY.md](./assets/PHOTO_INVENTORY.md). The first pass (2026-11-01) filled 53 slots under a no-visible-brand rule; the owner then accepted visible brands in demo photos (everything is demo content) and the remaining 4 products were sourced on 2026-11-02. No Pexels photo was usable (Cloudflare challenge, API blocked; not bypassed). Author and licence lines were read through the WebFetch tool, not by opening the pages directly.
- **Goal**: A shot list and a set of owner-approved, licence-verified candidate photos for the 24 demo products, 10 categories, promo areas and a default share image.
- **Files**: `docs/assets/MANIFEST.csv`; photos only under git-ignored `demo-assets/_inbox/` and `_archive/`.
- **Spec**: Unsplash and Pexels preferred; licence text read per image and recorded; no visible third-party logos or identifiable people on products; if a source is unreachable, record it and use `_inbox/` (no bypass).
- **Dependencies**: Milestone 103; network access or owner-supplied files.
- **Testing**: every row has source URL, author (or "not shown"), licence URL and check date before `approved`; the owner has approved each image against its product.
- **Rollback**: Remove the manifest rows and the git-ignored files.
- **Commit message**: `Record candidate demo photos and licences (M104)`

### Milestone 105 — Local image-processing pipeline
- **Status (2026-11-01)**: **Done.** `scripts/process-demo-images.ts`, `scripts/demo-images-core.ts`, `scripts/demo-data/photos.ts` (provenance, crops, alt text), `npm run process:demo-images` and `npm run test:demo-images`. Sharp only; no dependency added; Architecture Decision Record 049 still Proposed.
- **Goal**: Originals archived, storefront WebP generated per placement, metadata stripped, size budgets enforced and validated before upload, with checksums in the manifest (VISUAL_ASSETS_PLAN.md section 7).
- **Files**: a new script and its test under `scripts/`; `package.json` (an npm script entry only); `docs/assets/MANIFEST.csv`; `demo-assets/README.md`.
- **Spec**: uses the existing `sharp` dependency; installs nothing; never modifies originals; rejects images too small, wrong format or over budget.
- **Dependencies**: Milestone 104 (at least one approved image); Architecture Decision Record 049 decision.
- **Testing**: outputs meet exact dimensions and byte budgets; no EXIF; archive checksums unchanged; bad inputs fail; `npm run type-check` and `npm run lint` pass.
- **Rollback**: Revert the commit; delete `demo-assets/_processed/`.
- **Commit message**: `Add local demo image processing and validation (M105)`

### Milestone 106 — Local integration of demo photos
- **Status (2026-11-01)**: **Done locally.** `scripts/seed-demo.ts` uses `demo-assets/_processed/` files byte for byte after re-validation, with alt text from the spec, plus category photos; temporary demo descriptions adjusted where a photo contradicts them (D3). Verified on a throwaway local PostgreSQL only; no remote upload, no deploy. No generated art remains in the demo seed; `scripts/seed.ts` (continuous integration) left unchanged on purpose.
- **Goal**: Replace generated art and the blank placeholders with the processed photos in the local demo data, without touching non-demo rows.
- **Files**: `scripts/seed-demo.ts`, `scripts/demo-data/*`, possibly `scripts/seed.ts`, `demo-assets/README.md`, `docs/assets/MANIFEST.csv`.
- **Spec**: existing find-or-create seed rules and database guards unchanged; replacement touches only inventory rows; `media_id` recorded with `media_env=local`.
- **Dependencies**: Milestone 105.
- **Testing**: no generated-art or blank image remains locally; every demo product has a matching photo; a rerun adds nothing; the seed still refuses production and non-local hosts.
- **Rollback**: Revert the commit; restore the local database from a pre-run dump.
- **Commit message**: `Use real demo photography in the demo seed (M106)`

### Milestone 107 — Storefront image-surface quality assurance
- **Status (2026-11-03)**: **Done: merged (pull request #58), accepted under the owner's delegation of 2026-11-03, and deployed to the test site** (`main` at `9183777`, checked live; DEPLOYMENT_VERCEL_TEST.md "Verified state"). Report: [assets/STOREFRONT_QA_M107.md](./assets/STOREFRONT_QA_M107.md). The crawl of 40 routes at 320/390/768/1024/1440 px found no broken image, horizontal overflow or missing alt. Fixes: the category page banner shows the category photo (`app/(public)/category/[slug]/page.tsx`); `shareImages()` in `lib/seo.ts` gives the home, shop, categories and category pages a share image from their own photo (no committed file, no schema field; the pipeline's `demo-og-default.jpg` is therefore unused); the product main image uses the photo's own alt (`components/ProductDetails.jsx`); `test:demo-images` and the new `test:seo` run in continuous integration. D2 respected: the hero stays product-driven.
- **Goal**: Every customer-facing image surface looks right with the new photos at all widths; fix only what the photos expose.
- **Files**: likely `lib/seo.ts`, `components/{HeroSlider,HeroShortcuts,PromoCards,ProductCard,RailCard,ProductDetails}.*`, end-to-end specs. A dedicated hero banner field would be a schema change and needs its own approval (VISUAL_ASSETS_PLAN.md, D2).
- **Spec**: no change to checkout, prices, Orders, access control, `images.unoptimized` or the `/_next/image` closure.
- **Dependencies**: Milestone 106.
- **Testing**: lint, type-check, build, `test:*`, Playwright including the checkout golden path; screenshots at 320, 390, 768, 1024, 1440 px; no broken image or horizontal scroll; page weight within the budgets.
- **Rollback**: Revert the commit.
- **Commit message**: `Fix image presentation across the storefront (M107)`

### Milestone 108 — Test-site rollout
- **Status (2026-11-05)**: **Done, deployed to test.** Owner-approved runs of `.github/workflows/m108-rollout.yml`: dry run [42019925812](https://github.com/CodeWithHamzaa/gocart/actions/runs/42019925812), apply [42020705613](https://github.com/CodeWithHamzaa/gocart/actions/runs/42020705613), rerun dry run [42021938362](https://github.com/CodeWithHamzaa/gocart/actions/runs/42021938362). Counts: dry run 58 to upload / 34 to relink / 0 created; apply 58 uploaded, 34 relinked, 0 created; rerun 0 to upload, 34 already correct. Verified afterwards: 58 new media rows (ids 66-123), all 24 products with both images and all 10 categories on the new media, no row deleted, `payload_migrations` unchanged, Blob 63 -> 121 objects; storefront pages return 200 with the new image files and new `/api/media/file/` URLs return 200 `image/webp` at the database byte size. `MANIFEST.csv` records `media_id` and `media_env=test`. New files are stored with Payload's collision suffixes (`-3`/`-4` for products, `-1` for categories) because the 2026-10-30 art held the plain names. Owner follow-up: delete the three environment secrets. Milestone 109 and production untouched.
- **Status (2026-11-03, execution route; superseded)**: the live run will go through the hand-started GitHub Actions workflow `.github/workflows/m108-rollout.yml` (credentials only in GitHub encrypted secrets of the `gocart-test` environment, masked in logs; main only; dry run by default). Waiting for the owner to protect the environment (branch rule `main` only, owner as required reviewer, both mandatory) and add three secrets; each run then needs the owner's approval click. No cloud-session secret or network change is needed.
- **Status (2026-11-03, after the redeploy; superseded)**: **Live rollout NOT run; blocked on access only.** Photos are ready: `scripts/fetch-demo-originals.ts` (`npm run fetch:demo-originals`, new) recovers the 24 originals byte-identical to the manifest's `original_sha256`, and `process:demo-images` rebuilds all 61 files byte-identical to `processed_sha256`. A rehearsal of `runRollout` with those photos on a throwaway local PostgreSQL in the test site's state gave dry run 58 / 34 / 0, apply 58 uploaded and 34 relinked, rerun 0 uploads, no schema change. Remaining: a Blob read-write token (write-only in Vercel since 2026-11-03) and the Neon `DATABASE_URI` on a machine that reaches Neon and `vercel.com/api/blob`; see DEPLOYMENT_VERCEL_TEST.md, "Demo photo rollout". The test site now runs `main` at `9183777` (deployed at the owner's request).
- **Status (2026-11-03, re-checked later the same day; superseded)**: **Live rollout NOT run; blocked on access.** Read-only checks through the Vercel and Neon connectors: the test site still holds the 63 generated-art media rows and Blob objects of 2026-10-30; all 24 demo products and 10 categories exist, so a run should upload 58 files, relink 34 rows and create nothing. The Blob adapter uploads server-side `payload.create` files itself (`@payloadcms/plugin-cloud-storage` `afterChange`, files without a `clientUploadContext`). Missing: the processed photos, a network route to Neon and the Blob API (denied by the cloud environment's network policy) and the test env file; no deploy by the AI team unless the owner asks. Details: DEPLOYMENT_VERCEL_TEST.md, "Verified state".
- **Status (2026-11-03, pull request #59; superseded)**: **Tooling Done; live rollout NOT yet run.** Approved under the owner's delegation of 2026-11-03 (GATES.md); Architecture Decision Record 049 Accepted with item 6. Built: `scripts/rollout-demo-photos.ts` (guarded entry), `rollout-demo-photos-core.ts`, `rollout-demo-photos-run.ts`, `npm run rollout:demo-photos`, `npm run test:rollout-demo-photos` (continuous integration), `npm run test:rollout-demo-photos:db` (manual). Independent quality assurance and Security review found and the team fixed a `?host=` guard bypass, Payload's connect-time dev schema push, rollback-log loss and orphan uploads (CHANGELOG). Verified on a throwaway local PostgreSQL seeded with generated art: dry run writes nothing, apply replaces the art, rerun adds nothing, missing products are skipped or created. **Blocked on access:** the cloud session has no Neon or Vercel credentials, no route to either service and no processed photos (`demo-assets/` is git-ignored). Needed to finish: the test env file, the processed photos and one `--apply` run; see DEPLOYMENT_VERCEL_TEST.md. Not verified on real Neon/Blob.
- **Status (2026-11-01)**: Proposed (superseded by the lines above).
- **Goal**: The validated demo photos appear on the approved test environment (Neon + Vercel Blob).
- **Files**: `docs/assets/MANIFEST.csv` (media ids, `media_env=test`). `DEMO_INVENTORY.csv` is **not** created here: Architecture Decision Record 049 item 1 (amendment of 2026-11-03) says Milestone 109 creates it. The upload route was approved 2026-11-03 as the guarded one-off tool of Architecture Decision Record 049 item 6 (`scripts/rollout-demo-photos*.ts`, merged in pull request #59).
- **Spec**: test environment only; never production; no deploy by the AI team unless the owner asks; seed database guards are not loosened.
- **Dependencies**: Milestone 107 (Done); upload route decided 2026-11-03 (guarded one-off tool, Architecture Decision Record 049 item 6).
- **Testing**: `/`, `/shop`, a category, a product and `/cart` checked on the test URL; uploads land on the Blob host; `media_id` recorded with `media_env=test`. Done 2026-11-05 (see the status line above).
- **Rollback**: Remove the uploaded demo media by inventory id after the reference check (section 6 of the plan).
- **Commit message**: `Record test-site demo photo rollout (M108)`

### Milestone 109 — Pre-launch demo cleanup and original-catalogue import
- **Status (2026-11-03)**: **ON HOLD by the owner.** Nothing for Milestone 109 is built or run, and nothing production-related is done, until the owner gives the client's go-ahead in words (GATES.md, 2026-11-03).
- **Status (2026-11-01)**: Proposed. Run only when the owner is ready to launch.
- **Goal**: Remove only demo records and demo-only media, import the owner's original catalogue, and verify the storefront and checkout.
- **Files**: a dry-run-by-default cleanup tool under `scripts/` and a runbook; `docs/assets/DEMO_INVENTORY.csv`, `docs/assets/MANIFEST.csv`.
- **Spec**: procedure of VISUAL_ASSETS_PLAN.md section 6: inventory, verified backup, orders first, products, media reference check, empty demo categories, import, verification, regression. Production use needs its own explicit owner approval.
- **Dependencies**: Milestone 103, the owner's catalogue, verified backups.
- **Testing**: dry run reviewed against the inventory; on a restored copy, cleanup then import leaves no demo rows or demo media and no broken image; a restore from backup is rehearsed; lint, type-check, build, `test:*` and Playwright pass.
- **Rollback**: Restore the database dump and re-upload the backed-up media files.
- **Commit message**: `Add demo catalogue cleanup runbook and tool (M109)`


### Milestone 110 — Admin-editable storefront content, sliding announcement bar, Featured grid
- **Status (2026-11-05)**: **Done, deployed to test** (pull request 66 merged; migration applied to the test Neon and `main` at `12d9454` deployed as `dpl_67jEB5hJ…` on 2026-11-05 at the owner's request; record in DEPLOYMENT_VERCEL_TEST.md). Built and verified locally first. Requested by the owner on 2026-11-05; decisions in [Architecture Decision Record 050](./DECISIONS.md) (Accepted 2026-11-05).
- **Goal**: (1) the announcement bar slides again; (2) the owner edits the bar text, the home banner slides (images and text), the Featured and New arrivals wording and the footer sentence in `/admin`; (3) the Featured section is a grid of up to 12 products with "View all", not a slider.
- **Files**: `globals/StorefrontContent.ts`, `collections/HeroSlides.ts`, `payload.config.ts`, migration `20261105_121934_storefront_content`, `lib/storefront-content.ts`, `lib/payload/storefront-content.ts`, `lib/payload/hero-slides.ts`, `lib/hero-slides.ts` (admin mapping), `components/AnnouncementBar.tsx`, `components/AnnouncementTicker.tsx`, `app/globals.css`, `components/BestSelling.jsx`, `components/RailCard.tsx` (`fluid`), `components/ProductRail.tsx`, `components/LatestProducts.jsx`, `components/Footer.jsx`, `app/(public)/page.jsx`, `scripts/storefront-content.test.ts`, continuous integration.
- **Spec**: see Architecture Decision Record 050. No change to checkout, orders, access control of existing collections, Settings fields or the delivery rule.
- **Dependencies**: none (no new package).
- **Testing**: `npm run test:storefront-content` (defaults, caps, checkboxes, unsafe links), type-check, lint, `npm run build`; migrations from an empty database and no schema drift (the continuous integration steps); verified on a throwaway local PostgreSQL with the demo seed: an admin message, slide, headings and footer sentence render; Featured shows 12 cards as 4x3 (desktop), 3x4 (tablet), 2x6 (phone) with no horizontal overflow; the bar's message moves right, the next message follows after 12 s, hover pauses it.
- **Rollback**: revert the pull request; the migration is additive (`down` drops the four tables) and nothing else reads them.
- **Commit message**: `Admin-editable storefront content, sliding announcement bar, Featured grid (M110)`

### Milestone 111 — Listing card hierarchy, 2/3/4 product grids, shorter header category row
- **Status (2026-11-05)**: **Done and merged.** It is part of the code deployed to the test site on 2026-11-11 (`main` at `e1e9e5a`); checked with git on 2026-11-13: this milestone's commit `e6e3b3a` is an ancestor of `e1e9e5a`. (Corrected from "Implemented, in review" by Milestone 121.) Requested by the owner on 2026-11-05; scope confirmed by the owner: the new layout in the Mirza palette (not black/grey), the first four categories in admin order (nothing hardcoded), the search bar left as it is, the 2/3/4 grid on every product listing.
- **Goal**: fix the listing card's visual hierarchy and row alignment, make every product grid 2 / 3 / 4 columns, and keep the desktop category row to four links plus "All categories".
- **Files**: `components/ProductCard.jsx`, `components/ui/Badge.tsx` (`shape="tag"`), `components/ui/QuickAddButton.tsx` (`variant="solid"`), `components/ui/CategoryNav.tsx`, `components/HeroShortcuts.tsx`, `components/BestSelling.jsx` (Featured grid now uses `ProductCard`), `components/DealsOfTheDay.tsx`, `app/(public)/shop/page.jsx`, `app/(public)/category/[slug]/page.tsx`, `app/(public)/wishlist/page.tsx`.
- **Spec**: card order is a square photo tile (status and discount tags float top-left, heart top-right), the category in small uppercase, the name clamped to two lines (full text stays in the DOM), then the price row at the bottom (`mt-auto`) with a 44px round brand-colour add-to-cart button that is disabled and dimmed when out of stock. Cards fill the row height. Grids: `grid-cols-2 gap-3`, `md:grid-cols-3`, `lg:grid-cols-4 lg:gap-6`; card padding `p-3`, `lg:p-4`. The home "New arrivals" rail keeps the Milestone 101 `RailCard`. No data, schema, checkout or access-control change; no new package.
- **Dependencies**: none.
- **Testing**: type-check, lint (0 errors), `npm run build`; on a throwaway local PostgreSQL with the dev seed: 2/3/4 columns at 320/390, 820 and 1280px, no horizontal overflow, quick-add 44x44, a Rs. 125,000 price clears the button at 320px; end-to-end `mobile.spec.ts` and `seo.spec.ts` pass, and `golden-path.spec.ts` passes every card step (it stops later at Turnstile, whose script this sandbox cannot load; continuous integration covers it).
- **Rollback**: revert the pull request.
- **Commit message**: `Listing card hierarchy, 2/3/4 product grids, shorter header category row (M111)`

### Milestone 113 — Mirza brand identity kit and ecommerce showcase
- **Status (2026-11-11)**: **Done, in review**. Requested by the owner on 2026-11-11 (portfolio, client, Fiverr and Upwork material); scope confirmed by the owner: screenshots from the live test site, no personal credit line, all exports committed. No application code, schema, dependency or deployment change.
- **Goal**: a client-ready brand book (logo, colour, type, imagery, interface language, do's and don'ts) plus desktop, mobile and responsive showcase boards built from real screenshots of the storefront.
- **Files**: `docs/brand-kit/` only: `README.md`, `tools/` (Playwright capture scripts, a Python layout source that writes both the HTML book and a native PowerPoint, a Chromium renderer), `source-assets/` (screenshots, monogram SVG, font with its OFL licence), `exports/` (`mirza-brand-kit.pdf`, `mirza-brand-showcase.pptx`, 26 PNG boards in `boards/{brand,desktop,mobile,responsive}`).
- **Spec**: 26 landscape pages (1920 x 1080; PNG at 2880 x 1620). Colours, type sizes, radii, shadows and badges are copied from `app/globals.css`, `components/ui/*` and computed styles on the test site; guidance (clear space, minimum size, personality, do's and don'ts) is worded as recommendations. The footer contact column and `tel:`/`mailto:` links are hidden before every capture. Mobile boards follow the owner's two reference compositions (floating phone row; screen wall); the references are not stored.
- **Dependencies**: none. Uses tools already present (Playwright Chromium, Pillow, python-pptx); nothing added to `package.json`.
- **Testing**: no application quality assurance (owner instruction). Deliverable integrity only: the PDF opens with 26 pages; 26 PNGs at 2880 x 1620; the PPTX opens in python-pptx and renders in LibreOffice with 26 slides; each board reviewed visually; contact redaction verified; security review of the folder for personal or deployment data.
- **Rollback**: revert the pull request (deletes `docs/brand-kit/`).
- **Commit message**: `Mirza brand identity kit and ecommerce showcase (M113)`

### Milestone 114 — Admin sign-in by username and password
- **Status (2026-11-11)**: **Done, deployed to test** (pull request #79; migration applied to the test Neon before merge, then `main` at `e1e9e5a` deployed; see `DEPLOYMENT_VERCEL_TEST.md`, "Deploying Milestone 114"). Owner request 2026-11-11; takes over pull request #70 (2026-11-06, username or email, no milestone) and narrows it to username only, as the owner chose. Architecture Decision Record 051 (amends the first-admin secret's name in Architecture Decision Record 036 point 5). The owner asked for a test deploy after merge (migration first).
- **Goal**: admins sign in to `/admin` with a username and password; an email no longer signs in.
- **Files**: `collections/Users.ts` (`loginWithUsername`, `allowEmailLogin: false`, `requireEmail: false`), `migrations/20261106_093227_username_login.{ts,json}` + `migrations/index.ts`, `payload-types.ts`, `scripts/bootstrap-admin.ts`, `scripts/check-env.ts` (+ test), `scripts/users-guard.test.ts`, `scripts/prod-stack-check.sh`, `.github/workflows/ci.yml`, `docker-compose.prod.yml`, `.env.example`, `e2e/admin.ts` and three specs (`E2E_ADMIN_USERNAME`), `docs/DEPLOYMENT.md`, `docs/DEPLOYMENT_VERCEL_TEST.md`.
- **Spec**: Architecture Decision Record 051. Existing admins are backfilled with `<email before the @>-<id>` and keep their password. The first admin comes from `ADMIN_BOOTSTRAP_USERNAME` (3-40 of `A-Z a-z 0-9 . _ -`) + `ADMIN_BOOTSTRAP_PASSWORD`. No storefront, checkout or order change.
- **Dependencies**: none (Milestone 52b bootstrap guard unchanged).
- **Testing**: `test:env`, `test:users-guard`, type-check, lint (0 errors); on a throwaway local PostgreSQL built from `main` in production mode with an email-created admin and one inserted with a mixed-case email: the migration applies (10 migrations, `verify-migrations` OK), they become `owner-1` and `second.adminx-2` and sign in by username (case-insensitive), a wrong password and the email are refused; `down` works when every admin has an email and refuses otherwise; a fresh database bootstraps an admin from a username with no email; `migrate:create --skip-empty` reports no drift. Continuous integration on the pull request. Test deploy: migration on the test Neon first, then the code, then a live sign-in check.
- **Rollback**: redeploy the previous test deployment, then run the migration's `down` (restores the unique email index, drops `username`, makes `email` required again). `down` refuses with a clear error and changes nothing while any admin has no email (checked locally).
- **Security review (2026-11-11)**: no blockers. Fixed: backfilled usernames are lower-cased; `down` guards email-less admins. Recorded: launch blocker 6 (per-IP rate limit on admin sign-in), forgot-password behaviour (Architecture Decision Record 051). Continuous integration's schema-drift check also required dropping the unique email index, folded into the same migration (it has not been applied to any persistent database).
- **Commit message**: `Admin sign-in by username only (M114)`

### Milestone 115 — Design foundation: shared palette file, role tokens, Button and Price
- **Status (2026-11-12)**: **Done, in review** (not deployed). Phase 1a of the owner's premium storefront redesign (`docs/redesign/PHASE0_AUDIT.md`); Phase 1 (Milestones 115 to 117) authorized by the owner on 2026-11-12.
- **Goal**: one source of truth for colour and one look for buttons and prices, with **no visible colour change**, so the palette change (Milestone 117) is a values-only edit.
- **Files**: `app/tokens.css` (new: raw `--palette-*` values, plain CSS), `app/globals.css` (colour tokens point at the palette; new `on-primary`, `inverse`, `on-inverse` roles; `text-6xl` display step), `components/ui/Button.tsx` (new: `Button` and `buttonClasses`, variants primary/soft/outline, sizes md/lg/xl), `components/ui/Price.tsx` (new), adopted in `ProductCard.jsx`, `ProductDetails.jsx`, `EmptyState.tsx`, `CategoryControls.tsx`, `LoadMoreLink.tsx`, `AddressModal.jsx`, `OrderSummary.jsx`, `orders/OrderLookup.tsx`, `order-confirmation/OrderConfirmation.tsx`, `category/[slug]/error.tsx`; `Footer.jsx` and `BrandLogo.tsx` use the `inverse` roles; the skip link in `(public)/layout.jsx` uses tokens instead of `slate`.
- **Spec**: existing token names are kept (they are the role names), so no other component changes. Only class names change at the adoption sites: elements, handlers, text, `disabled` logic and `type` stay as they were. Small normalisations: button side padding is 24px everywhere (was 16–32px on some full-width or `flex-1` buttons); the card's MRP and discount wrap together. No schema, data, checkout logic, access-control or dependency change.
- **Dependencies**: none.
- **Testing**: type-check, lint (0 errors; the same 8 warnings as `main`), `npm run build`; local before/after screenshots at 390/820/1440 on a throwaway PostgreSQL with `seed:demo` (`docs/redesign/phase1/`).
- **Rollback**: revert the commit.
- **Commit message**: `Design foundation: shared palette file, role tokens, Button and Price (M115)`

### Milestone 116 — Palette decision record (Architecture Decision Record 052)
- **Status (2026-11-12)**: **Done, in review**. Phase 1b of the premium storefront redesign; the owner chose the hybrid palette on 2026-11-12.
- **Goal**: record the hybrid palette before any colour value changes, amend Architecture Decision Record 047 item 4, and record the unrecorded `bc5a77a` surface change.
- **Files**: `docs/DECISIONS.md` (Architecture Decision Record 052), `docs/MIGRATION_PLAN.md`, `docs/TASKS.md`, `docs/CHANGELOG.md`.
- **Dependencies**: Milestone 115.
- **Testing**: docs only; contrast values computed with the WCAG 2.2 relative-luminance formula.
- **Rollback**: revert the commit.
- **Commit message**: `Palette decision record: hybrid palette, ADR-052 (M116)`

### Milestone 117 — Hybrid palette values, aubergine footer, admin reads the shared palette
- **Status (2026-11-12)**: **Done, in review** (not deployed). Phase 1c of the premium storefront redesign.
- **Goal**: apply Architecture Decision Record 052 and stop the admin's brand colours drifting from the storefront's.
- **Files**: `app/tokens.css`, `app/globals.css` (comment and contrast table, white focus ring on `.surface-inverse`), `components/Footer.jsx`, `components/ui/WishlistButton.tsx`, `components/Navbar.jsx` (wishlist count badge), `app/(payload)/layout.tsx` (imports `app/tokens.css`), `app/(payload)/custom.css` (brand variables read the palette), `docs/redesign/phase1/`.
- **Spec**: Architecture Decision Record 052 values; admin surfaces, sidebar and Payload's grey ramp unchanged; no stored `tone` value added or renamed; no schema, data, checkout-logic or dependency change.
- **Dependencies**: Milestones 115 and 116.
- **Testing**: type-check, lint (0 errors), build, continuous integration unit scripts; local before/after captures at 390/820/1440 (`docs/redesign/phase1/`); `/admin/login` renders with `#5F42EC`.
- **Rollback**: revert the commit (values only).
- **Commit message**: `Hybrid palette values, aubergine footer, shared admin palette (M117)`

### Milestone 118 — Homepage: editorial hero, Shop by category, honest deals
- **Status (2026-11-12)**: **Done, in review** (not deployed). Phase 2 of the premium storefront redesign; authorized by the owner on 2026-11-12. Revised the same day on the owner's review: "Why shop with Mirza" removed with nothing in its place; "Shop by category" redesigned from the owner's reference styles: after side-by-side captures it ends as round category photos at every size (owner, 2026-11-13), without a white ring, sized per breakpoint.
- **Goal**: replace the run of near-identical grids with an editorial home page built only from existing data.
- **Files**: `app/(public)/page.jsx` (order), `components/Hero.jsx`, `components/HeroSlider.tsx`, `components/CategoryShowcase.tsx` (new), `components/HeroShortcuts.tsx` and `components/CodSteps.tsx` (removed), `components/DealsOfTheDay.tsx`, `components/ui/Countdown.tsx`, `components/Footer.jsx` (all categories), `docs/redesign/phase2/`.
- **Spec**: `docs/redesign/phase2/README.md`. No stored `tone`/`label` value added or renamed; "Featured" kept (Architecture Decision Record 022); promo cards unchanged (owner); only verified trust facts; `force-dynamic` kept on `/`.
- **Dependencies**: Milestones 115 to 117.
- **Testing**: type-check, lint (0 errors), build, continuous integration unit scripts; local before/after captures at 390/820/1440.
- **Rollback**: revert the commit.
- **Commit message**: `Homepage: editorial hero, Shop by category, honest deals, Why shop with Mirza (M118)`

### Milestone 119 — Shop, category, search and product pages
- **Status (2026-11-13)**: **Done, in review** (not deployed). Phase 3 of the premium storefront redesign; authorized by the owner on 2026-11-13.
- **Goal**: make the listing pages and the product page read as one calm, consistent set, using only existing data: one header pattern (the category page keeps its lavender banner from 1024px, owner review), a sort on the shop, a way on from an empty search, a price that stays in view on a phone, a two-column product page from tablet width, and a related-products section that never leaves the page with a dead end.
- **Files**: `components/ui/PageHeader.tsx` and `components/ui/SortControl.tsx` (new), `app/(public)/shop/page.jsx`, `app/(public)/category/[slug]/page.tsx`, `components/ProductCard.jsx` (`showCategory`), `components/ProductDetails.jsx`, `components/ProductDescription.jsx`, `components/RelatedProducts.tsx`, `components/ui/CategoryControls.tsx`, `components/ui/MobileTabBar.tsx`, `lib/payload/products.ts` (`getProductsSorted`), `docs/redesign/phase3/`.
- **Spec**: `docs/redesign/phase3/README.md`, including what the audit proposed and this milestone left out (phone bottom sheet, search box prefill, shop filters, schema-dependent fields). No schema, API, checkout, stored value or dependency change; no `loading.tsx` on the category route; `force-dynamic` kept on `/shop`, `/` and the product page.
- **Dependencies**: Milestones 115 to 117 (shared button, price and palette).
- **Testing**: type-check, lint (0 errors), production build, the continuous integration unit scripts; on a throwaway local PostgreSQL: sort orders, not-indexed marker and "Load more" checked on the running shop, photo swipe checked with touch events, captures at 390/820/1440 with no overflow or console errors. The end-to-end suite runs in continuous integration.
- **Rollback**: revert the pull request.
- **Commit message**: `Redesign shop, category, search and product pages`

### Milestone 120 — Cart, checkout panel, address form, order confirmation and order lookup
- **Status (2026-11-13)**: **Done, in review** (not deployed). Phase 4 of the premium storefront redesign; authorized by the owner on 2026-11-13.
- **Goal**: make the buying steps clearer without touching how an order is placed: one way to remove a cart line, a visible reason when no address is chosen, a labelled address form (email and area marked optional, as the server already allows), a more prominent order number on the confirmation page, and hints on the order lookup form.
- **Files**: `components/ui/QuantityStepper.tsx`, `components/Counter.jsx`, `app/(public)/cart/page.jsx`, `components/OrderSummary.jsx` (markup and display text only), `components/AddressModal.jsx`, `app/(public)/order-confirmation/OrderConfirmation.tsx`, `app/(public)/orders/OrderLookup.tsx`, `docs/redesign/phase4/`.
- **Spec**: `docs/redesign/phase4/README.md`, including what was left out (the contact links in the paused-ordering notice, which live in the Turnstile widget). The address form stays a popup (owner decision). One behaviour change: the form no longer requires email or area. No change to `placeOrder`, the idempotency key, Turnstile, `lib/validation/pk.ts`, the order guard, the schema or dependencies. Guest checkout and cash on delivery only.
- **Dependencies**: Milestones 115 to 119.
- **Testing**: type-check, lint (0 errors), the continuous integration unit scripts; on a throwaway local PostgreSQL: a 33-check script (11 checks at 390, 820 and 1440px) all passing, 51 general captures with no overflow or console errors. No order was placed (the Turnstile script cannot load in the sandbox); the confirmation page was captured from a made-up order in session storage. The end-to-end suite runs in continuous integration.
- **Rollback**: revert the pull request.
- **Commit message**: `Clarify cart, address form, order confirmation and order lookup`

### Milestone 121 — Final quality assurance and documentation for the storefront redesign
- **Status (2026-11-13)**: **Done, in review** (not deployed). Phase 5 of the premium storefront redesign; authorized by the owner on 2026-11-13.
- **Goal**: check the finished redesign end to end, fix what the check finds, and leave an honest record: a final screenshot set, an accessibility report, what is still open, and the correct status of Milestone 111.
- **Files**: `components/Navbar.jsx`, `components/AddressModal.jsx`, `app/(public)/orders/OrderLookup.tsx` (the 2px focus ring restored on three text fields), `app/(public)/cart/page.jsx` (cart product-name links no longer shorter than 24px), `docs/redesign/PHASE5_FINAL_REPORT.md`, `docs/redesign/final/`, `docs/README.md`, and the status lines for Milestone 111 in this file, `docs/TASKS.md` and `docs/CHANGELOG.md`.
- **Spec**: `docs/redesign/PHASE5_FINAL_REPORT.md`. No schema, data, API, checkout logic or dependency change.
- **Dependencies**: Milestones 115 to 120.
- **Testing**: type-check, lint (0 errors), the continuous integration unit scripts; an automated accessibility pass over 15 page states at 390, 820 and 1440px (45 checks of a page, 0 failures other than target sizes, all of which are at least 24px); the 33-check checkout script from Milestone 120 re-run (all pass); 51 captures with no overflow or console errors. Screen-reader, real-device and zoom testing were not done (unverified).
- **Rollback**: revert the pull request.
- **Commit message**: `Final quality pass for the storefront redesign`

### Milestone 122 — The Mirza Cart brand: name, neutral palette, cart logo, search field, moving announcement strip
- **Status (2026-11-13)**: **Done, merged and deployed to the test site** (pull request #85; `main` at `d5ed333`, deployment `dpl_6hNJU8oC…`, 2026-11-13, after the migration was applied to the test database). Requested and approved by the owner on 2026-11-13 (name, palette, logo concept A, and the header changes below).
- **Goal**: apply the final brand (Architecture Decision Record 053) across the storefront and the admin, and make the header changes the owner asked for.
- **What changed**: the default store name is "Mirza Cart" (with a migration); clean neutral surfaces replace the warm ivory ones; a shopping-cart logo replaces the "M" monogram in the header, footer, admin, favicon and a new iPhone home-screen icon; the header search field is redesigned (one white pill, the magnifier as its submit button, a soft violet glow on focus, a clear button, a "/" keyboard shortcut on desktop); the category row under the header is removed; the announcement strip is a slow, seamless right-to-left ticker in which the same message is never on screen twice (one lap is at least as wide as the strip), with a pause button, and it does not move for visitors who ask for reduced motion; "Track order" moved from the strip to a labelled button in the header (desktop; phones and tablets keep the Orders tab).
- **Files**: `app/tokens.css`, `app/globals.css`, `components/ui/BrandLogo.tsx`, `components/admin/Logo.tsx`, `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`, `components/Navbar.jsx`, `components/AnnouncementBar.tsx`, `components/ui/AnnouncementTicker.tsx` (new), `components/ui/CategoryNav.tsx` (removed), `components/Footer.jsx`, `app/(public)/layout.jsx`, `globals/Settings.ts`, `globals/StorefrontContent.ts` (a label), `lib/payload/settings.ts`, `lib/seo.ts`, `scripts/seed-demo.ts`, `migrations/20261113_204148_mirza_cart_store_name.*`.
- **Spec**: Architecture Decision Record 053. One schema-level change: the default of `settings.store_name`. No API, order logic, Turnstile or dependency change.
- **Dependencies**: Milestones 115 to 121.
- **Testing**: type-check, lint (0 errors, the same 8 warnings), the continuous integration unit scripts, the 33-check checkout script, and captures of 17 pages at 390, 820 and 1440px on a local production build. The end-to-end suite runs in continuous integration only. Screen-reader and real-device testing were not done (unverified).
- **Not done here**: regenerating the brand kit for the new identity (Milestone 123).
- **Rollback**: revert the pull request and run the migration's `down`.
- **Commit message**: `Apply the Mirza Cart brand, new search field and moving announcement strip`

### Milestone 123 — Brand kit regenerated for Mirza Cart
- **Status (2026-11-13)**: **Done, in review.** Requested by the owner on 2026-11-13. Documentation and development-time tooling only.
- **Goal**: bring `docs/brand-kit/` (Milestone 113) in line with Architecture Decision Record 053: the name, the clean neutral palette with the aubergine surface, the shopping-cart logo (horizontal, stacked, icon-only and inverse), and fresh desktop, tablet and phone captures of the deployed test site.
- **Files**: `docs/brand-kit/tools/` (`kit.py`, `pages.py`, `capture.js`), `docs/brand-kit/source-assets/` (new captures; `brand/mirza-cart-mark.svg` replaces `mirza-monogram.svg`), `docs/brand-kit/exports/` (the 26-page PDF, the editable deck, 26 boards), `docs/brand-kit/README.md`, and the records of the test deployment in `docs/DEPLOYMENT_VERCEL_TEST.md`, `CLAUDE.md`, `docs/TASKS.md` and `docs/CHANGELOG.md`.
- **Spec**: `docs/brand-kit/README.md`. No application code, schema or dependency change. Export file names are unchanged.
- **Dependencies**: Milestone 122 deployed to the test site.
- **Testing**: the build runs without errors; all 26 boards were looked at as contact sheets, and the logo, component and photography boards at larger size. The deck was not opened in PowerPoint (unverified).
- **Rollback**: revert the pull request.
- **Commit message**: `Regenerate the brand kit for the Mirza Cart identity`



### Milestone 124 — Admin crop tool and a generated image size per storefront placement
- **Status (2026-11-14)**: **Implemented, in review.** Requested by the owner on 2026-11-14.
- **Goal**: the crop tool is offered on every image upload in the admin, and each storefront placement shows an image framed for its own ratio (Architecture Decision Record 054).
- **Files**: `collections/Media.ts`, `payload.config.ts`, `lib/media.ts`, `lib/payload/categories.ts`, `lib/hero-slides.ts`, `components/ProductCard.jsx`, `components/ProductDetails.jsx`, `components/CategoryShowcase.tsx`, `components/ui/CategoryTile.tsx`, `app/(public)/cart/page.jsx`, `app/(public)/category/[slug]/page.tsx`, migration `20261114_035841_media_image_sizes`, `scripts/media.test.ts`, `scripts/media-sizes.db-test.ts`, `.github/workflows/ci.yml`.
- **Dependencies**: none beyond the existing `sharp`.
- **Testing**: type-check, lint (0 errors, the same 8 warnings), the unit scripts, a production build, `npm run test:media-sizes:db` against a throwaway local database (sizes, automatic framing, an admin crop) and a browser check that the admin shows the crop tool after a file is chosen. Not tested: an upload on the test site with Vercel Blob (unverified).
- **Rollback**: revert the pull request and run the migration's `down`.
- **Commit message**: `Offer the crop tool on image uploads and serve a size per placement`
