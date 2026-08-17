# Migration Plan — GoCart Pakistan

63 milestones (`M1`–`M59`, plus `M2a`, `M27a`, `M27b`, `M13a`) taking the codebase from its current state (documented in [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md): a UI prototype with no real backend, no real auth, and a multi-vendor feature surface) to the target described in [PROJECT_SPEC.md](./PROJECT_SPEC.md): a single-store, Payload CMS v3 + PostgreSQL, guest-checkout, COD-only, SEO-first, mobile-first, Dockerized platform.

Each milestone is scoped to be one reviewable commit (or a small, tightly related handful). This document is a plan only — **no code was written to produce it**.

## How to read a milestone

- **Goal** — what changes and why, in one or two sentences.
- **Files** — the concrete files/directories touched, taken from the classifications in [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md) and [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) wherever those apply.
- **Dependencies** — which prior milestone(s) must land first.
- **Testing** — the minimum manual/automated check before moving on. (No test framework exists in the repository, and **no milestone in this plan establishes one** — that gap is tracked as an open risk in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md) and is not yet scheduled. Until it is, "testing" means manual verification plus `npm run build`.)
- **Rollback** — how to undo this specific milestone if it turns out to be wrong, without unwinding unrelated work.
- **Commit message** — a ready-to-use commit subject line.

## Milestone IDs are the only execution reference

**`M1`–`M59` is the authoritative implementation sequence.** Group headings below ("Foundation & tooling", "Payload data model", …) are **labels for navigation and status reporting only** — they carry no execution order, and nothing should ever be scheduled, referenced, or reported by group number. Cite work as `M12`, never as "Phase 2".

**Execution order is defined by each milestone's `Dependencies` line, not by ascending ID.** Two deliberate exceptions to ID order exist and matter:

> **`M16`, `M17`, and `M19` run *before* `M3`.** Payload mounts its admin UI at `/admin` (per [ADR-009](./DECISIONS.md#adr-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service)), and the inherited hand-built admin at `app/admin/*` resolves to the same path. Next.js route groups contribute no path segment, so `app/(payload)/admin/[[...segments]]/page.tsx` and `app/admin/page.jsx` are parallel routes for `/admin` and the build fails. The legacy admin must be gone before Payload arrives.

> **`M14` also runs *before* `M3`.** A second, independent precondition surfaced during `M3` analysis: mounting Payload requires restructuring the app into Next.js's multiple-root-layouts pattern (each top-level route group, `(public)` and `(payload)`, defining its own root layout). `app/store/**` — the vendor dashboard `M14` deletes — sits outside any route group and collides with that restructuring if still present when `M3` lands. Per [ADR-014](./DECISIONS.md#adr-014-m14-is-a-hard-prerequisite-of-m3-not-an-order-independent-milestone), `M14` is a hard prerequisite of `M3`, not an order-independent milestone. **`M3` must not be implemented before `M14`.**

### Critical-path order for the opening milestones

```
M1  → M2 → M2a ───────┐
                       ├→ M3 → M4, M5, M6 …
M14, M16, M17, M19 ────┘        (M17 → M19)
```

`M15` and `M18` have no dependencies and may land at any point; they are grouped with `M14`/`M16`/`M17`/`M19` below for narrative reasons only. Everything from `M3` onward follows the stated dependency graph in ascending ID order.

**Between `M17` and `M3`, `/admin` returns 404.** This is acceptable and expected: the route it replaces was never an authenticated surface (`isAdmin` was hardcoded `true`, per [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md)) and served only dummy data, so nothing of value is unavailable during the gap. Keep the gap short by scheduling `M3` immediately after.

## Scope note

Items the [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) marks **Future Phase only** (Filters, Wishlist, Brands, advanced Inventory, advanced Settings) are intentionally **not** milestones in this plan — they're post-launch. Reviews and Coupons appear here only as *decision + minimal-scope-or-removal* milestones, per their Future-Phase-leaning status in the matrix, not as full feature builds.

> **Filters ≠ category browsing — read this before scoping `M27a`/`M27b`.** Deferring Filters defers *faceted filtering UI*: price ranges, brand, rating, in-stock toggles, sort controls, multi-facet selection, and any `/shop?category=` parameter. It does **not** defer **category browsing**, which is launch scope and is built by `M27a` (`/category/[slug]`) and `M27b` (`/categories`) per [ADR-013](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy). Category browsing is navigation over a slug-based URL space; filtering is query refinement over a result set. The full boundary is enumerated in [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md).

---

## Group: Foundation & tooling — `M1`, `M2`, `M2a`, `M3`, `M4`, `M5`

> Runs after `M16`/`M17`/`M19` clear the `/admin` route. See the execution order above.

### M1 — Dockerized PostgreSQL for local development
- **Goal**: Stand up a local Postgres instance in Docker so every later milestone has a real database to work against.
- **Files**: `docker-compose.yml` (new, Postgres service only), `.env.example` (add `DATABASE_URI`)
- **Env var naming**: the connection string is `DATABASE_URI`, the name Payload's Postgres adapter conventionally reads — **not** the Prisma-era `DATABASE_URL` this milestone originally specified, and not both. Settled by [ADR-010](./DECISIONS.md#adr-010-the-postgresql-connection-string-is-named-database_uri), which closes risk `R10` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).
- **Dependencies**: none
- **Testing**: `docker compose up postgres`; connect with `psql`/a DB client and confirm the container is healthy.
- **Rollback**: Remove `docker-compose.yml` and the added env var; stop/remove the container. No application code is touched.
- **Commit message**: `Add Dockerized PostgreSQL for local development`

### M2 — Install Payload CMS v3, the Postgres adapter, and `sharp`
- **Goal**: Add the core dependencies the entire backend will be built on, including the image-processing library both Payload media and Next.js image optimization depend on.
- **Packages**: `payload`, `@payloadcms/db-postgres`, `@payloadcms/next`, a Payload richtext editor package, `graphql`, and **`sharp`**. Confirm the exact set and versions against the Payload v3 release being installed — Payload's own installer is the authority, not this list.
- **Why `sharp` here and not later**: it is a native-binary dependency needed by two separate milestones — `M8` (Media collection image processing on upload) and `M51` (removing `images.unoptimized: true`, which re-enables Next.js's optimizer). Installing it once at the foundation avoids a mid-migration native rebuild inside the Docker image, and surfaces any platform/binary issues while the app still has nothing to break.
- **Files**: `package.json`, `package-lock.json`
- **Next.js floor**: `@payloadcms/next` requires a Next version the repository did not have (`15.3.5` satisfied none of its peer ranges), so `M2` also bumps `next` to `15.3.9`. Versions, the rejected `--legacy-peer-deps` workaround, and the `sharp` version choice are settled by [ADR-011](./DECISIONS.md#adr-011-payload-v3-dependency-set--exact-pins-a-raised-nextjs-floor-and-patched-sharp).
- **Dependencies**: `M1`
- **Testing**: `npm install` completes without peer-dependency errors; `sharp` resolves on the target platform (`node -e "require('sharp')"`); `npm run build` still succeeds (nothing references Payload yet, so the app is unchanged at runtime).
- **Rollback**: `git checkout -- package.json package-lock.json && npm install`.
- **Commit message**: `Add Payload CMS v3, Postgres adapter, and sharp dependencies`

### M2a — Establish the TypeScript toolchain
- **Goal**: Add TypeScript to a repository that currently has none, **before** any milestone authors a `.ts` file. Every milestone from `M3` onward (`payload.config.ts`, `collections/*.ts`, `lib/payload/*.ts`, `scripts/seed.ts`, `app/sitemap.ts`, `app/robots.ts`, `app/api/health/route.ts`) assumes a working TypeScript setup, and Payload v3 additionally generates a `payload-types.ts` that the storefront imports.
- **Current state**: `jsconfig.json` only — no `tsconfig.json`, no `typescript` dependency, and every application file is `.js`/`.jsx`. Verified in [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md).
- **Files**: `tsconfig.json` (new), `jsconfig.json` (deleted — superseded; `tsconfig.json` takes over the `@/*` path alias), `package.json` (dev dependencies + `type-check` script), `next.config.mjs` (only if build-time type-check behavior needs pinning), `.gitignore` (ignore `*.tsbuildinfo` and Payload's generated types if they are not committed)
- **Scope, explicitly**:
  - **Packages**: `typescript`, `@types/node`, `@types/react`, `@types/react-dom` as `devDependencies`.
  - **`tsconfig.json`**: generated by Next.js on first TS build, then adjusted. Must carry over the `@/*` path alias from `jsconfig.json`, include Next's plugin, and set `"strict": true` — strictness is far cheaper to adopt now, with zero TS files, than after fifty.
  - **JavaScript/TypeScript coexistence**: set `"allowJs": true` so the existing `.jsx` storefront keeps compiling untouched. This migration is incremental by design — **no milestone converts existing `.jsx` files to `.tsx`**, and none should be converted opportunistically. New files are `.ts`/`.tsx`; existing files stay `.jsx` unless a milestone has its own reason to rewrite them.
  - **`"checkJs": false`** — do not type-check the existing JavaScript. Turning it on would surface hundreds of errors in code that is scheduled for deletion or rewrite anyway.
  - **Type-check command**: add `"type-check": "tsc --noEmit"` to `package.json` scripts. From this milestone forward, `npm run type-check` joins `npm run build` as a standard per-milestone verification step.
  - **Next.js compatibility**: Next 15 has first-class TS support and generates `next-env.d.ts` on first run — commit it. Confirm the TypeScript version satisfies both Next 15 and the Payload v3 release installed at `M2`.
- **TypeScript version**: pinned to `^5.9.3`, the latest `5.x` release — not the `latest` npm tag, which resolved to `7.0.2` (a same-day-fresh native compiler rewrite). Next 15.3.9 itself is built against TypeScript `5.8.2`. Settled by [ADR-012](./DECISIONS.md#adr-012-typescript-pinned-to-the-5x-line-not-the-latest-tag).
- **Dependencies**: `M2`
- **Testing**: `npm run type-check` passes on a repository with no `.ts` files yet (a clean no-op); `npm run build` still succeeds and the existing `.jsx` storefront renders unchanged; a throwaway `.ts` file is type-checked and resolves the `@/*` alias correctly, then is deleted.
- **Rollback**: Delete `tsconfig.json`, `next-env.d.ts`, and the `type-check` script; restore `jsconfig.json`; `git checkout -- package.json package-lock.json && npm install`. No application code is touched by this milestone, so rollback is clean.
- **Commit message**: `Establish TypeScript toolchain ahead of Payload configuration`

### M3 — Scaffold and mount Payload inside the Next.js app
- **Goal**: Create an empty Payload config wired to Postgres, and mount its admin UI and REST/GraphQL API inside the existing Next.js App Router, per [ADR-009](./DECISIONS.md#adr-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service) (Payload embedded in the Next.js app, Accepted 2026-08-14).
- **Files**: `payload.config.ts` (new, no collections yet), `app/(payload)/admin/[[...segments]]/page.tsx` (new), `app/(payload)/api/[...slug]/route.ts` (new), `next.config.mjs` (Payload's Next.js integration wrapper), `.env.example` (add `PAYLOAD_SECRET`)
- **Dependencies**: `M2a` (TypeScript must exist — every file this milestone creates is `.ts`/`.tsx`); **`M16`, `M17`, `M19`** (`app/admin/**` must be gone first); and **`M14`** (`app/store/**` must be gone first — see the multiple-root-layouts precondition below, per [ADR-014](./DECISIONS.md#adr-014-m14-is-a-hard-prerequisite-of-m3-not-an-order-independent-milestone)).
- **⚠️ Route-collision precondition**: Payload mounts at `/admin`. Next.js route groups contribute no path segment, so `app/(payload)/admin/[[...segments]]/page.tsx` and the inherited `app/admin/page.jsx` both resolve `/admin` — a parallel-route build failure. The optional catch-all also collides with `app/admin/stores`, `app/admin/approve`, and `app/admin/coupons`. **Verify `app/admin/` no longer exists before starting this milestone.**
- **⚠️ Multiple-root-layouts precondition**: mounting Payload requires restructuring the app so `(public)` and `(payload)` each own a root layout. `app/store/**`, outside any route group, collides with that restructuring if still present. **Verify `app/store/` no longer exists (i.e. `M14` is done) before starting this milestone.**
- **Testing**: `ls app/admin` returns nothing (precondition); `/admin` serves Payload's (collection-less) admin shell locally; `npm run type-check` and `npm run build` both pass; no errors in server logs.
- **Rollback**: Delete the new route files and `payload.config.ts`; revert `next.config.mjs`. Note that rolling back `M3` leaves `/admin` returning 404 rather than restoring the old admin — recovering that requires also reverting `M17`.
- **Commit message**: `Scaffold and mount empty Payload CMS v3 instance in Next.js`

### M4 — Retire the unwired Prisma schema
- **Goal**: Remove the Prisma schema now that Payload/Postgres is the live data layer, per [ADR-003](./DECISIONS.md). Nothing in the app imports it today, so this is a pure cleanup.
- **Files**: `prisma/schema.prisma` (deleted), `prisma/` (deleted if empty), `.gitignore` (remove the now-meaningless `/app/generated/prisma` line)
- **Dependencies**: M3 (Payload confirmed as the replacement data layer)
- **Testing**: `npm run build` succeeds; `grep -r "prisma" app components lib` returns nothing.
- **Rollback**: `git revert` the commit to restore the file from history.
- **Commit message**: `Retire unused Prisma schema in favor of Payload collections (ADR-003)`

### M5 — Add development Dockerfile for the app
- **Goal**: Containerize the Next.js/Payload app for local development, matching the Postgres container from M1.
- **Files**: `Dockerfile` (new, dev stage), `.dockerignore` (new)
- **Dependencies**: M3
- **Testing**: `docker build --target dev .` succeeds; container starts and serves `/admin`.
- **Rollback**: Delete `Dockerfile` and `.dockerignore`.
- **Commit message**: `Add development Dockerfile for the Next.js + Payload app`

---

## Group: Payload data model — `M6`–`M13`, `M13a`

> **`M6` gate cleared (2026-08-16).** Reviews, Coupons, shipping model, order status set, media storage
> backend, and the guest `Orders` shape are decided — [ADR-016](./DECISIONS.md#adr-016-reviews-are-out-of-scope-for-v1)
> through [ADR-021](./DECISIONS.md#adr-021-guest-orders-use-embedded-address-fields-not-a-customers-collection).
> This group's milestones below already reflect those decisions.

### M6 — Users collection (admin-only auth)
- **Goal**: Create the single authenticated role in the system, per [ADR-006](./DECISIONS.md).
- **Files**: `collections/Users.ts` (new), `payload.config.ts` (register collection)
- **Dependencies**: M3
- **Testing**: Create the first admin user via Payload's CLI/local API; log into `/admin` with it.
- **Rollback**: Remove the collection file and its registration.
- **Commit message**: `Add Users collection as the sole admin-only auth role`

### M7 — Lock down Users access control
- **Goal**: Ensure only an existing admin can create another admin — no public self-registration.
- **Files**: `collections/Users.ts` (access rules)
- **Dependencies**: M6
- **Testing**: Anonymous REST `POST` to create a user is rejected; an authenticated admin session can create one.
- **Rollback**: Revert the access-control changes.
- **Commit message**: `Restrict Users collection creation to authenticated admins`

### M8 — Media collection
- **Goal**: Real file upload/storage for product images and future media, replacing the client-only `URL.createObjectURL()` previews found in `add-product`/`create-store` today.
- **Files**: `collections/Media.ts` (new), `payload.config.ts`
- **Storage backend**: Payload's local-storage adapter, backed by a named Docker volume — **not** S3-compatible object storage, for v1. Cloudflare R2 is the designated successor if/when object storage is needed; migrating later is a storage-adapter config swap, not a schema change. Per [ADR-020](./DECISIONS.md#adr-020-media-storage-backend-is-a-local-docker-volume-for-v1-with-cloudflare-r2-as-the-designated-successor).
- **Dependencies**: M3
- **Testing**: Upload an image through `/admin`; confirm the file is stored and served back correctly.
- **Rollback**: Remove the collection file and its registration.
- **Commit message**: `Add Media collection with real upload storage`

### M9 — Categories collection
- **Goal**: Replace the hardcoded category string array with a real, admin-editable entity that supports the two-level hierarchy and slug-based URLs the storefront category routes (`M27a`, `M27b`) require.
- **Files**: `collections/Categories.ts` (new), `payload.config.ts` (register collection)
- **Fields** — every one has a named reader in [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md); nothing here is speculative:

  | Field | Type | Required | Read by |
  |---|---|:---:|---|
  | `title` | text | ✓ | `<h1>`, cards, breadcrumbs, metadata fallback |
  | `slug` | text, unique, indexed | ✓ | Every category URL; `generateStaticParams`; sitemap (`M42`) |
  | `parent` | relationship → `categories`, `hasMany: false` | — | Hierarchy, product rollup, breadcrumbs, `/categories` grouping |
  | `description` | textarea / richtext | — | Category page intro copy; meta-description fallback |
  | `image` | upload → `media` | — | `/categories` landing cards (`M27b`) |
  | `seo.metaTitle` / `seo.metaDescription` | text / textarea | — | `generateMetadata` overrides |
  | `displayOrder` | number | — | Deterministic ordering on `/categories` and child navigation |

- **Constraints**: `slug` generated from `title` on create and then **stable** — never auto-regenerated on a title edit, since renaming a category must not orphan its live URL; `slug` unique across the entire collection (parent and child share one flat URL space); a category whose `parent` already has a `parent` is **rejected** (two levels only, per [ADR-013](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy)); a category may not be its own parent.
- **Why the field list is here and not left to implementation**: this milestone previously specified no fields at all, while four downstream milestones assumed category URLs and hierarchy existed — readiness finding **C8**. The `parent` self-relation and the `slug` field are the two that close it.
- **Dependencies**: M3, M8 (the `image` upload field targets the Media collection)
- **Testing**: Create a parent and a child category via `/admin`; confirm the child's `parent` resolves. Attempt to create a grandchild — rejected. Attempt a duplicate slug — rejected. Rename a category's title — confirm its slug does **not** change. Retrieve both via the REST API.
- **Rollback**: Remove the collection file and its registration.
- **Commit message**: `Add Categories collection with two-level hierarchy and stable slugs`

### M10 — Products collection
- **Goal**: Real product catalog storage, using the existing Prisma schema's field shape as reference per [ADR-003](./DECISIONS.md), with relations to Categories and Media.
- **Files**: `collections/Products.ts` (new)
- **Category relation — cardinality is decided, not left open**: `category` is a `relationship` to `categories` with **`hasMany: false`**. A product belongs to exactly one category, the most specific one that applies (normally a child). Parent category pages get their inventory by rolling up their children (`M22`, `M27a`) rather than by admins double-filing a product under both a parent and its child. Per [ADR-013](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy).
- **Dependencies**: M8, M9
- **Testing**: Create a product with a category relation and an uploaded image via `/admin`; confirm it's retrievable via REST and GraphQL. Confirm the category field accepts exactly one value.
- **Rollback**: Remove the collection file.
- **Commit message**: `Add Products collection with category and media relations`

### M11 — Orders collection with guest fields and line items
- **Goal**: Model orders for guest checkout — embedded customer/address fields instead of a `User` relation, plus a line-items array instead of a separate join table, per [ADR-005](./DECISIONS.md).
- **Files**: `collections/Orders.ts` (new)
- **Guest shape — embedded, not a `Customers` collection**: name, phone, address, city, area are embedded fields on the order itself. No relation to a separate `Customers` collection. Per [ADR-021](./DECISIONS.md#adr-021-guest-orders-use-embedded-address-fields-not-a-customers-collection).
- **Fields beyond the guest address and line items** (closing the shipping/total half of readiness risk `R4`):
  - `orderNumber` / order reference — a human-referenceable ID, distinct from Payload's internal `id`. Read by `M35` (confirmation) and `M36` (guest lookup).
  - `orderTotal` — the resolved total at creation time.
  - `shippingCost` — the resolved flat rate or `0` if the free-shipping threshold was met, per [ADR-018](./DECISIONS.md#adr-018-shipping-model--flat-rate-with-a-free-shipping-threshold-snapshotted-per-order).
  - Each line item carries a **price snapshot** (the product's unit price at order time), not a live reference to `Products.price` — a later product price edit must not silently re-price historical orders.
  - `discountAmount` — nullable. No coupon engine exists in v1 ([ADR-017](./DECISIONS.md#adr-017-coupons-are-out-of-scope-for-v1)), but reserving the field now avoids an `Orders` migration if one is added later.
- **Dependencies**: M10
- **Testing**: Create a sample order via `/admin` with an embedded guest address and multiple line items; confirm it renders correctly with no login prompt beyond the admin's own. Confirm `orderTotal`/`shippingCost`/line-item price snapshots persist independently of the live `Products` values.
- **Rollback**: Remove the collection file.
- **Commit message**: `Add Orders collection with guest checkout and line-item fields`

### M12 — Payment method and status fields on Orders
- **Goal**: Add a COD-only `paymentMethod` field (extensible enum, per [ADR-004](./DECISIONS.md)) and an order status workflow field.
- **Files**: `collections/Orders.ts`
- **Status set — decided, not left open**: `PLACED` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED`, plus terminal `CANCELLED` and `RETURNED`. `CONFIRMED` exists specifically so admins can phone-confirm an order before dispatch, suppressing fake/duplicate orders — standard practice for Pakistani COD stores. `CANCELLED` (killed before dispatch) and `RETURNED` (came back after dispatch — refused at door/RTO) are operationally distinct: `RETURNED` implies courier cost was already incurred and stock must be restored. No transition-validation state machine in v1 — a flat enum, admin-selected. Per [ADR-019](./DECISIONS.md#adr-019-order-status-set-includes-confirmed-cancelled-and-returned).
- **Dependencies**: M11
- **Testing**: Confirm only `COD` is selectable in `/admin` today; confirm the field type would accept an added value later without a data migration (documented, not built). Confirm all seven status values are selectable.
- **Rollback**: Revert the field additions.
- **Commit message**: `Add COD-only paymentMethod and status fields to Orders`

### M13 — Collection access control pass + dev seed script
- **Goal**: Set public-read/admin-write access on `Products`/`Categories`/`Media`, public-create/admin-read on `Orders` (guest checkout), and seed a handful of dev records so later milestones have real data to build against.
- **Files**: `collections/Products.ts`, `Categories.ts`, `Media.ts`, `Orders.ts` (access functions), `scripts/seed.ts` (new)
- **Dependencies**: M9, M10, M11, M12
- **Testing**: Anonymous `GET /api/products` succeeds; anonymous `POST /api/products` fails; anonymous `POST /api/orders` succeeds; anonymous `GET /api/orders` fails. Seed script populates a clean dev DB.
- **Rollback**: Revert access functions; delete seed script.
- **Commit message**: `Set collection access control for public storefront and guest checkout`

### M13a — Settings global
- **Goal**: A single admin-editable Payload **Global** (not a collection — one record, not a list) holding store-wide configuration, closing readiness risk `R6` (no Settings global despite launch scope).
- **Files**: `globals/Settings.ts` (new), `payload.config.ts` (register global)
- **Fields**: store name, contact info (phone/email/address for `M48`'s Footer cleanup), `shippingFlatRate` and `freeShippingThreshold` (both per [ADR-018](./DECISIONS.md#adr-018-shipping-model--flat-rate-with-a-free-shipping-threshold-snapshotted-per-order) — admin-configurable, read by `M33`/`M34` at order-creation time only, then snapshotted onto the order), currency-format fields for `M55` to consume.
- **Dependencies**: M6 (admin auth must exist to secure write access; read access is public — the storefront needs shipping/contact info)
- **Testing**: Edit shipping rate/threshold via `/admin`; confirm the values are readable via REST/Local API. Confirm anonymous write is rejected.
- **Rollback**: Remove the global file and its registration.
- **Commit message**: `Add Settings global for shipping, contact, and currency configuration`

---

## Group: Remove the multi-vendor surface — `M14`–`M19`

Per [ADR-006](./DECISIONS.md) (Accepted) and the **Remove** rows for Vendor/Seller in [FEATURE_MATRIX.md](./FEATURE_MATRIX.md).

> **Ordering — read before scheduling.** `M16`, `M17`, and `M19` delete `app/admin/**` and **must land before `M3`**, which mounts Payload's admin UI at the same `/admin` path (see [ADR-009](./DECISIONS.md#adr-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service)). Running `M3` first produces a Next.js parallel-route build failure. **`M14` must also land before `M3`** — a second, independent precondition found during `M3` analysis: `app/store/**` collides with the multiple-root-layouts restructuring Payload's mount requires (see [ADR-014](./DECISIONS.md#adr-014-m14-is-a-hard-prerequisite-of-m3-not-an-order-independent-milestone)). Only `M15` and `M18` touch no admin routes and are genuinely order-independent — they may land at any time.

### M14 — Delete the vendor dashboard
- **Goal**: Remove the entire hand-built seller area, including its hardcoded `isSeller = true` auth bypass.
- **Files**: `app/store/**` (deleted: `layout.jsx`, `page.jsx`, `add-product/`, `manage-product/`, `orders/`), `components/store/**` (deleted: `StoreLayout.jsx`, `StoreNavbar.jsx`, `StoreSidebar.jsx`)
- **Dependencies**: none — but **`M3` depends on this milestone**, per [ADR-014](./DECISIONS.md#adr-014-m14-is-a-hard-prerequisite-of-m3-not-an-order-independent-milestone): `app/store/**` collides with the multiple-root-layouts restructuring Payload's mount (`M3`) requires. **`M14` is the next milestone to execute.**
- **Testing**: `npm run build` succeeds; confirm no remaining file imports anything from `app/store` or `components/store`.
- **Rollback**: `git revert` to restore the deleted files.
- **Commit message**: `Remove vendor dashboard — single-store platform (ADR-006)`

### M15 — Delete vendor signup and per-vendor storefront
- **Goal**: Remove the "become a seller" flow and the `/shop/[username]` per-vendor storefront route.
- **Files**: `app/(public)/create-store/page.jsx` (deleted), `app/(public)/shop/[username]/page.jsx` (deleted)
- **Dependencies**: none
- **Testing**: `npm run build` succeeds. Note that `Footer.jsx`'s "Create Your Store" link now points at a deleted route; the Footer cleanup that resolves it is `M48`, which lands much later. Removing the link inline here is preferable to leaving it dead — see the dead-link window flagged in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).
- **Rollback**: `git revert`.
- **Commit message**: `Remove vendor signup and per-vendor storefront routes`

### M16 — Delete admin vendor-management routes
- **Goal**: Remove vendor approval and activation screens.
- **Files**: `app/admin/stores/page.jsx` (deleted), `app/admin/approve/page.jsx` (deleted)
- **Dependencies**: none. **Must land before `M3`** — these routes sit under `app/admin/`, which Payload's optional catch-all also matches.
- **Testing**: `npm run build` succeeds.
- **Rollback**: `git revert`.
- **Commit message**: `Remove vendor approval and store-management admin routes`

### M17 — Delete the hand-built admin dashboard shell
- **Goal**: Remove the custom admin panel — including its hardcoded `isAdmin = true` auth bypass — to clear the `/admin` route **before** Payload takes ownership of it at `M3`. Per the **Replace** classification in [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md) and [ADR-009](./DECISIONS.md#adr-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service).
- **Files**: `app/admin/layout.jsx`, `app/admin/page.jsx` (deleted), `components/admin/AdminLayout.jsx`, `AdminNavbar.jsx`, `AdminSidebar.jsx`, `StoreInfo.jsx` (deleted), `components/OrdersAreaChart.jsx` (deleted)
- **Dependencies**: none. **Must land before `M3`** — this is the milestone that frees `/admin`.
- **Why this precedes Payload rather than following it**: the earlier plan had `M17` depend on `M3` ("so nothing is lost"), which is circular — `M3` cannot build while `app/admin/page.jsx` exists. Nothing is in fact lost by going first: this dashboard has no real authentication (`isAdmin` is hardcoded `true`, so it is public today) and displays only `assets/assets.js` dummy data. There is no live functionality to preserve during the gap.
- **Interim state**: `/admin` returns 404 from this milestone until `M3` mounts Payload. Schedule the two close together. **`/admin/coupons` stays live and returns 200** — it is deleted by `M19`, not `M17`, and never imported anything from `components/admin/**`, so it survives this milestone unaffected by the deletion. What it loses is its layout: `app/admin/layout.jsx` (the `AdminLayout` wrapper — navbar, sidebar, the fake `isAdmin` gate) is gone, so `/admin/coupons` falls back to the bare root `app/layout.jsx` (`<html>`/`<body>` + Redux provider + toaster only, no chrome of any kind) until `M19` removes the page entirely. This is expected migration debt, not a regression — the auth gate it loses was never real. Do not "fix" it with a scoped layout; `M19` is the fix.
- **Testing**: `npm run build` succeeds; `/admin` returns 404; `grep -r "components/admin\|OrdersAreaChart" app components` returns nothing.
- **Rollback**: `git revert`. Only meaningful before `M3` lands — afterwards, restoring these files would recreate the very route collision this ordering exists to prevent.
- **Commit message**: `Remove hand-built admin dashboard — superseded by Payload CMS admin UI`

### M18 — Delete orphaned stub routes
- **Goal**: Remove the empty pricing stub and the vendor-approval-only redirect page, both dead weight with no place in the target product.
- **Files**: `app/(public)/pricing/page.jsx` (deleted), `app/(public)/loading/page.jsx` (deleted)
- **Dependencies**: none
- **Testing**: `npm run build` succeeds. As with `M15`, `Footer.jsx`'s "Become Plus Member" link now points at a deleted route; `M48` is the scheduled cleanup, so remove the link inline here rather than leaving it dead.
- **Rollback**: `git revert`.
- **Commit message**: `Remove orphaned pricing stub and vendor-redirect loading page`

### M19 — Remove the admin coupons stub page
- **Goal**: Remove the non-functional coupon CRUD screen for now; real coupon support (if any) is redesigned at `M47`, since account-based targeting (`forNewUser`/`forMember`) doesn't fit guest checkout.
- **Files**: `app/admin/coupons/page.jsx` (deleted)
- **Dependencies**: `M17`. **Must land before `M3`** — this route sits under `app/admin/`.
- **Testing**: `npm run build` succeeds.
- **Rollback**: `git revert`.
- **Commit message**: `Remove non-functional coupon admin page pending guest-checkout-compatible redesign`

---

## Group: Confirm admin-only auth end to end — `M20`–`M21`

### M20 — Verify no route bypasses Payload auth
- **Goal**: Audit that the only authenticated surface left in the app is Payload's own `/admin`, with no leftover custom auth checks anywhere.
- **Files**: none changed — audit only; fixes (if any) land as follow-up commits scoped to whatever is found
- **Dependencies**: M17, M19
- **Testing**: Manually browse every remaining route while logged out of `/admin`; confirm nothing customer-facing requires or fakes a login.
- **Rollback**: N/A (audit milestone).
- **Commit message**: `Audit: confirm Payload admin auth is the only authenticated surface`

### M21 — Remove the non-functional customer "Login" button
- **Goal**: The storefront `Navbar` has a "Login" button with no handler; remove it since customers never authenticate under guest-checkout-only ([ADR-005](./DECISIONS.md)).
- **Files**: `components/Navbar.jsx`
- **Dependencies**: M20
- **Testing**: Visual check — navbar renders correctly on mobile and desktop without the button; no console errors.
- **Rollback**: Revert the file.
- **Commit message**: `Remove non-functional customer login button from navbar`

---

## Group: Storefront — real product & category data — `M22`–`M28`

### M22 — Product/category data-fetching utility
- **Goal**: A small server-side utility to fetch Products/Categories from Payload (local API when server-rendered, REST/GraphQL when client-rendered), replacing ad hoc dummy-data assignment.
- **Files**: `lib/payload/products.ts` (new), `lib/payload/categories.ts` (new)
- **Category functions this must expose** — `M27`, `M27a`, `M27b`, and `M42` all consume them, so they belong here rather than being reimplemented per route:
  - `getTopLevelCategories()` — categories with no `parent`, each with its children resolved, ordered by `displayOrder` then title. Backs `/categories` (`M27b`).
  - `getCategoryBySlug(slug)` — a single category with its `parent` and `children` resolved, for the page body and breadcrumbs. Returns null for an unknown slug so the route can `notFound()`.
  - `getProductsByCategory(slug, { page, limit })` — paginated products for a category, **including all descendants when the category is a parent** (the rollup from [ADR-013](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy)). Returns products plus total count and page count.
- **Why rollup lives here**: "which products are in this category" must have exactly one implementation. Duplicating the descendant query into route code is how a parent page and the sitemap end up disagreeing about the same category.
- **Dependencies**: M13
- **Testing**: Call each function from a temporary script/route and confirm it returns seeded data from M13. Specifically confirm `getProductsByCategory()` on a **parent** slug returns products filed under its children, and on a **child** slug returns only that child's products.
- **Rollback**: Delete the new files; nothing else references them yet.
- **Commit message**: `Add server-side data-fetching utilities for Products and Categories`

### M23 — Wire home page product sections to real data
- **Goal**: Replace dummy-data-backed `LatestProducts`/`BestSelling` with real Payload data; convert what can be server-rendered for SEO.
- **Files**: `components/LatestProducts.jsx`, `components/BestSelling.jsx`, `app/(public)/page.jsx`
- **Dependencies**: M22
- **Testing**: Home page renders real seeded products; no console errors; page still builds/loads under `npm run build && npm run start`.
- **Rollback**: Revert the three files.
- **Commit message**: `Wire home page product sections to real Payload data`

### M24 — Wire shop listing page to real data
- **Goal**: Replace the Redux-dummy-list-backed shop page with a real Products query.
- **Files**: `app/(public)/shop/page.jsx`
- **Dependencies**: M22
- **Testing**: `/shop` lists real seeded products; existing name-based search still filters correctly against real data.
- **Rollback**: Revert the file.
- **Commit message**: `Wire shop listing page to real Payload product data`

### M25 — Wire product detail page to real data
- **Goal**: Replace the Redux-lookup-based product page with a real per-product fetch.
- **Files**: `app/(public)/product/[productId]/page.jsx`, `components/ProductDetails.jsx`, `components/ProductDescription.jsx`
- **Dependencies**: M22
- **Testing**: Visiting `/product/[id]` for a seeded product renders correct name/price/images; a non-existent ID renders a proper not-found state instead of a blank page.
- **Rollback**: Revert the three files.
- **Commit message**: `Wire product detail page to real Payload product data`

### M26 — Remove multi-vendor "Product by {store}" attribution
- **Goal**: Now that products aren't vendor-owned, drop the store-attribution block and its link to the (already-deleted) per-vendor storefront.
- **Files**: `components/ProductDescription.jsx`
- **Dependencies**: M25, M15
- **Testing**: Product detail page renders correctly with no broken link and no reference to a store/vendor.
- **Rollback**: Revert the file.
- **Commit message**: `Remove vendor attribution block from product page`

### M27 — Wire CategoriesMarquee to real categories
- **Goal**: Replace the hardcoded `categories` array `CategoriesMarquee` imports from `assets/assets.js` with the real `Categories` collection. **Data source only** — the marquee's items stay non-interactive in this milestone.
- **Files**: `components/CategoriesMarquee.jsx`
- **Dependencies**: M22
- **⚠️ Corrected acceptance test**: this milestone previously asserted *"clicking one filters/links correctly"* — behavior that does not exist in the component and that this milestone does not add. `CategoriesMarquee.jsx` renders bare `<button>`s with no `onClick` and no `href`. **`M27a` is the milestone that makes them links**; `M27` only re-points the data. Keeping the items inert here is deliberate: it preserves today's behavior exactly rather than opening a dead-link window before `M27a` lands. Recorded as readiness finding **C8** in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).
- **Testing**: Marquee renders the seeded categories from `M9`/`M13` instead of the hardcoded six; items remain non-interactive, unchanged from today; no console errors.
- **Rollback**: Revert the file.
- **Commit message**: `Wire category marquee to real Payload categories`

### M27a — Category detail and product listing route (`/category/[slug]`)
- **Goal**: Build the customer-facing category page the storefront has never had — a server-rendered, slug-based, publicly browsable listing of a category's products, with parent/child navigation and pagination. Implements [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md) per [ADR-013](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy).
- **Files**: `app/(public)/category/[slug]/page.tsx` (new), `loading.tsx` (new), `error.tsx` (new), `not-found.tsx` (new); `components/CategoriesMarquee.jsx` (inert `<button>`s → `next/link` anchors); `app/(public)/product/[productId]/page.jsx` (the plain-text `Home / Products / {category}` breadcrumb becomes a link)
- **`.tsx`, not `.jsx`** — per `M2a`'s rule that new files are TypeScript. The route reads Payload's generated types through `lib/payload/*`.
- **Scope**:
  - **Parent slug** → `<h1>`, description, child-category navigation, and products rolled up from the parent plus every child.
  - **Child slug** → `<h1>`, description, its own products, and a breadcrumb linking back to its parent.
  - **Pagination** — `?page=N`, 24 per page, rendered as real `<a>` links; page 1 canonicalizes to the bare URL; out-of-range → 404.
  - **SEO ships here, not at `M41`** — `generateMetadata`, `generateStaticParams` over published slugs, one `<h1>`, canonical URLs on paginated variants, `rel=prev`/`next`. [ADR-007](./DECISIONS.md#adr-007-seo-first-and-mobile-first-are-default-requirements-not-a-later-pass) makes SEO part of definition-of-done, not a later pass.
  - **States** — an empty category renders **200** with an empty state (never 404: emptiness is a temporary property of inventory, and 404-ing would churn the sitemap on ordinary stock movement); unknown/unpublished slug → real 404; query failure → `error.tsx`, never a silent empty grid.
  - **No filtering UI of any kind** — see the Filters boundary in the scope note above.
- **Dependencies**: `M13` (seeded parent/child categories with products, public read access), `M22` (the three category query functions), `M27` (marquee already on real category data — this milestone converts it to links)
- **Testing**: A parent slug lists its children and their rolled-up products; a child slug lists only its own with a working parent breadcrumb; a category with no products returns **200** with an empty state; an unknown slug returns **404**; `?page=2` paginates and an out-of-range page returns 404; page source contains the product grid (server-rendered, not hydrated in); marquee items and the product breadcrumb now navigate correctly; no login prompt anywhere in the flow; `npm run type-check` and `npm run build` pass.
- **Rollback**: Delete `app/(public)/category/`; revert the two component edits. The marquee returns to inert items — its pre-`M27a` state — so no dead links are left behind.
- **Commit message**: `Add category detail and product listing route`

### M27b — Categories landing page (`/categories`)
- **Goal**: A browsable index of the whole catalog structure — every top-level category with its children — giving customers and crawlers a single entry point into category browsing.
- **Files**: `app/(public)/categories/page.tsx` (new), `loading.tsx` (new)
- **Scope**: All top-level categories as cards (title, image, description), each listing its children as sub-links; ordered by `displayOrder` then title; every card and sub-link targets a live `/category/[slug]`; `generateMetadata`; server-rendered; a neutral empty state if no categories exist.
- **Dependencies**: `M27a` (every link on this page must resolve — building the index before the detail route would ship a page of 404s), `M22`
- **Testing**: All seeded top-level categories render with their children; every link resolves to a real category page; a parent with no children renders as a plain card without error; metadata is present and distinct; layout is correct at mobile, tablet, and desktop widths; no login required; `npm run type-check` and `npm run build` pass.
- **Rollback**: Delete `app/(public)/categories/`. Nothing else references it.
- **Commit message**: `Add categories landing page`

> **Deliberately unchanged by the category work**: `M24` (`/shop` stays the all-products + search listing — no `category` param is introduced, per [ADR-013](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy)'s single-canonical-URL rule), `M25`, `M28`, `M40` (the new routes are server components from birth), and `M43` (JSON-LD stays scoped to `Product` on product detail pages; category structured data is explicitly not Phase 1). These omissions are decided, not overlooked.

### M28 — Remove dummy data source and orphaned Redux slices
- **Goal**: Now that every storefront consumer has been re-pointed, delete the dummy-data file and the Redux slices that existed only to hold it.
- **Files**: `assets/assets.js` (deleted), `lib/features/product/productSlice.js` (deleted), `lib/features/rating/ratingSlice.js` (deleted), `lib/store.js` (trimmed to remaining reducers), `assets/product_img*.png`, `hero_*`, `happy_store.webp`, `profile_pic*.jpg` (deleted — placeholder imagery tied to the dummy dataset; real product/marketing photography to be supplied separately)
- **Dependencies**: M23, M24, M25, M26, M27
- **Testing**: `npm run build` succeeds; `grep -r "assets/assets"` and `grep -r "productDummyData\|dummyRatingsData"` across `app`/`components`/`lib` return nothing.
- **Rollback**: `git revert` to restore all deleted files at once.
- **Commit message**: `Remove dummy data source and orphaned Redux slices now that storefront uses real data`

---

## Group: Search — `M29`

### M29 — Replace client-array search with a real query
- **Goal**: The current search filters an in-memory Redux array with `.includes()` — replace with a real query against Payload/Postgres so it scales past a handful of seeded products.
- **Files**: `app/(public)/shop/page.jsx`, `lib/payload/products.ts`
- **Dependencies**: M24
- **Testing**: Search for a seeded product name returns correct results; search for a non-matching term returns an empty state, not an error.
- **Rollback**: Revert both files.
- **Commit message**: `Replace client-side array search with real product query`

---

## Group: Cart persistence & guest checkout (COD) — `M30`–`M36`

### M30 — Fix cart persistence
- **Goal**: The cart is currently in-memory-only and empties on refresh — a real problem with no account to recover it from. Persist it (e.g. `localStorage`).
- **Files**: `lib/features/cart/cartSlice.js`, `app/StoreProvider.js`
- **Dependencies**: none — independent of all Payload work; may land at any point in the sequence.
- **Testing**: Add items to cart, refresh the page, confirm the cart still shows the same items.
- **Rollback**: Revert both files.
- **Commit message**: `Persist cart state across page reloads`

### M31 — Redesign guest address capture
- **Goal**: `AddressModal`'s submit handler currently does nothing. Wire it to real guest-checkout address capture with Pakistani address field conventions (phone-first, city/area), per [PROJECT_SPEC.md](./PROJECT_SPEC.md).
- **Files**: `components/AddressModal.jsx`
- **Dependencies**: none
- **Testing**: Fill out the form, submit, confirm the address is available to the checkout flow that consumes it (verified together with M33).
- **Rollback**: Revert the file.
- **Commit message**: `Wire guest address form to real checkout state with Pakistani address fields`

### M32 — Remove the Stripe option from checkout UI
- **Goal**: COD is the only payment method for launch, per [ADR-004](./DECISIONS.md); the Stripe radio button was never functional and shouldn't be presented as a choice.
- **Files**: `components/OrderSummary.jsx`
- **Dependencies**: none
- **Testing**: Checkout UI shows COD only, no radio group needed.
- **Rollback**: Revert the file.
- **Commit message**: `Remove non-functional Stripe option from checkout UI (COD-only for launch)`

### M33 — Real order creation on "Place Order"
- **Goal**: Replace the `router.push('/orders')` stub with an actual `POST` to the `Orders` collection, using the cart contents and guest address.
- **Files**: `components/OrderSummary.jsx`, `lib/payload/orders.ts` (new)
- **Dependencies**: M13, M30, M31, M32
- **Testing**: Add items, fill address, place order; confirm a real `Order` record appears in `/admin` with correct line items, total, and `paymentMethod: COD`.
- **Rollback**: Revert both files.
- **Commit message**: `Create real orders on checkout instead of navigating to a stub page`

### M34 — Confirm shipping/total calculation rules
- **Goal**: Wire the cart/checkout total calculation to the decided shipping model: flat rate + free-shipping threshold, both read from the `Settings` global (`M13a`) at order-creation time and snapshotted onto the order — never recomputed live. Per [ADR-018](./DECISIONS.md#adr-018-shipping-model--flat-rate-with-a-free-shipping-threshold-snapshotted-per-order).
- **Files**: `app/(public)/cart/page.jsx`, `components/OrderSummary.jsx`
- **Dependencies**: M33, **M13a** (reads `shippingFlatRate`/`freeShippingThreshold` from Settings)
- **Testing**: Totals shown at checkout apply the flat rate below the threshold and `0` shipping at/above it, for a sample order.
- **Rollback**: Revert both files.
- **Commit message**: `Apply confirmed shipping/total calculation rules at checkout`

### M35 — Order confirmation flow
- **Goal**: After a successful COD order, show a real confirmation (order number, summary) instead of the current dummy `/orders` listing.
- **Files**: `app/(public)/orders/page.jsx` or a new `app/(public)/order-confirmation/[orderId]/page.jsx`
- **Dependencies**: M33
- **Testing**: Placing an order lands on a confirmation view showing that order's real data.
- **Rollback**: Revert/delete the new/changed route.
- **Commit message**: `Add real order confirmation flow after guest checkout`

### M36 — Guest order lookup
- **Goal**: Since there are no accounts, "My Orders" needs a non-account lookup mechanism (e.g. order ID + phone/email), replacing the current dummy-data table.
- **Files**: `app/(public)/orders/page.jsx`, `components/OrderItem.jsx`, `lib/payload/orders.ts`
- **Dependencies**: M33, M35
- **Testing**: Look up a real placed order by its lookup key; confirm correct data renders and an incorrect key is rejected without leaking other customers' orders.
- **Rollback**: Revert the three files.
- **Commit message**: `Add guest order lookup by order reference`

---

## Group: Orders & admin fulfillment — `M37`–`M39`

### M37 — Verify admin order management via Payload
- **Goal**: Confirm the store admin can view and manage all incoming orders directly in Payload's `/admin` — no custom UI needed for the base case.
- **Files**: none changed — verification only; `collections/Orders.ts` admin UI config tweaks if list/detail views need field visibility adjustments
- **Dependencies**: M33
- **Testing**: Place a few test orders; confirm an admin can see, open, and read full details of each in `/admin`.
- **Rollback**: Revert any admin UI config tweaks made.
- **Commit message**: `Tune Orders admin UI for fulfillment visibility`

### M38 — Order status update flow for admin
- **Goal**: Ensure the admin can move an order through its status workflow (`PLACED` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED`, plus terminal `CANCELLED`/`RETURNED` — per [ADR-019](./DECISIONS.md#adr-019-order-status-set-includes-confirmed-cancelled-and-returned)) — via Payload's native admin editing unless a dedicated view is required.
- **Files**: `collections/Orders.ts` (status field admin config)
- **Dependencies**: M12, M37
- **Testing**: Update a test order's status via `/admin`, including to `CONFIRMED`, `CANCELLED`, and `RETURNED`; confirm it persists and is reflected wherever order status is displayed to the guest (M36).
- **Rollback**: Revert config changes.
- **Commit message**: `Enable order status updates through Payload admin`

### M39 — Align OrderItem component to the real Orders schema
- **Goal**: `OrderItem.jsx` currently assumes the dummy order shape; align it to the real `Orders` collection shape from `M11`/`M12`.
- **Files**: `components/OrderItem.jsx`
- **Dependencies**: M36
- **Testing**: Guest order lookup (M36) renders order line items correctly with no shape mismatches.
- **Rollback**: Revert the file.
- **Commit message**: `Align OrderItem component to real Orders collection schema`

---

## Group: SEO — `M40`–`M43`

### M40 — Convert storefront layout/pages to server components
- **Goal**: Remove unnecessary `'use client'` directives from the public layout and home page so they render server-side, per the SEO-first requirement.
- **Files**: `app/(public)/layout.jsx`, `app/(public)/page.jsx`
- **Dependencies**: M23 (real data already server-fetchable)
- **Testing**: View page source and confirm product content is present in the initial HTML response, not only after client hydration.
- **Rollback**: Revert both files.
- **Commit message**: `Convert public layout and home page to server components`

### M41 — Per-page metadata
- **Goal**: Add `generateMetadata` to product, shop, and home pages, replacing the single site-wide static title/description, and normalize canonical/Open Graph tags across every storefront route.
- **Files**: `app/(public)/product/[productId]/page.jsx`, `app/(public)/shop/page.jsx`, `app/(public)/page.jsx`, `app/layout.jsx`, `app/(public)/category/[slug]/page.tsx`, `app/(public)/categories/page.tsx`
- **Scope on the category routes is normalization, not creation**: `M27a`/`M27b` ship their own `generateMetadata` and canonicals, since [ADR-007](./DECISIONS.md#adr-007-seo-first-and-mobile-first-are-default-requirements-not-a-later-pass) makes SEO part of a storefront route's definition of done. This milestone verifies them and brings them into line with the site-wide canonical/OG conventions it establishes.
- **Dependencies**: M25, M40, **M27a, M27b** (the category routes must exist before this pass can cover them)
- **Testing**: Inspect rendered `<head>` per route; each shows a distinct, relevant title/description. Category and paginated category pages carry correct canonicals.
- **Rollback**: Revert the touched files.
- **Commit message**: `Add per-page SEO metadata via generateMetadata`

### M42 — sitemap.xml and robots.txt
- **Goal**: Add Next.js file-convention sitemap and robots files, generated from real product/category data.
- **Files**: `app/sitemap.ts` (new), `app/robots.ts` (new)
- **Category entries**: the sitemap lists `/categories` plus one `/category/{slug}` per published category, parent and child alike, sourced from `getTopLevelCategories()`/`getCategoryBySlug()` (`M22`) so it cannot drift from what the routes actually serve. Paginated variants (`?page=N`) are **not** listed — they are reachable via `rel=next` from page 1.
- **Dependencies**: M22, **M27a, M27b** (previously `M22` alone — but the goal's "real seeded products/categories" requires category URLs to exist, and no milestone created them until now)
- **Testing**: `/sitemap.xml` and `/robots.txt` return valid content listing real seeded products/categories. Every category URL in the sitemap resolves to a 200; `/categories` is present.
- **Rollback**: Delete both new files.
- **Commit message**: `Add sitemap.xml and robots.txt generated from real catalog data`

### M43 — JSON-LD structured data for products
- **Goal**: Add `Product` structured data to product detail pages for rich search results.
- **Files**: `app/(public)/product/[productId]/page.jsx`
- **Dependencies**: M25, M41
- **Testing**: Validate the rendered JSON-LD against Google's Rich Results structured-data requirements for the `Product` type.
- **Rollback**: Revert the file.
- **Commit message**: `Add JSON-LD structured data to product pages`

---

## Group: Mobile-first audit — `M44`–`M45`

### M44 — Component-by-component mobile review
- **Goal**: Audit every storefront component and route for mobile-first correctness (tap targets, layout at small widths, readable type), per [PROJECT_SPEC.md](./PROJECT_SPEC.md).
- **Files**: `components/**` (storefront-facing; fixes scoped per component found to need them), plus the category routes `app/(public)/categories/**` and `app/(public)/category/**`
- **Category routes are in scope**: `/categories` and `/category/[slug]` must work at mobile, tablet, and desktop widths — grid column counts, category-name wrapping, breadcrumb degradation on narrow viewports, and pagination tap targets. Expectations are enumerated in [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md).
- **Dependencies**: M28 (real data in place, so the audit reflects real content, not placeholders), **M27a, M27b**
- **Testing**: Manually test the golden path (browse → category → product → cart → checkout) at common mobile, tablet, and desktop viewport widths; no horizontal scroll, no unreachable controls.
- **Rollback**: Revert whichever specific component fixes are found to be wrong.
- **Commit message**: `Mobile-first layout and interaction fixes across storefront components`

### M45 — Mobile performance pass
- **Goal**: Address load performance on mid-tier mobile devices/slower connections — image sizing, font loading, bundle size.
- **Files**: `next.config.mjs`, `app/layout.jsx`, image-heavy components identified in M44
- **Dependencies**: M44
- **Testing**: Run a mobile Lighthouse/PageSpeed pass on the storefront; confirm meaningful improvement over the pre-audit baseline.
- **Rollback**: Revert the specific performance changes found to regress anything.
- **Commit message**: `Improve mobile load performance (images, fonts, bundle size)`

---

## Group: Reviews & Coupons — decide and land minimal scope — `M46`–`M48`

Per [FEATURE_MATRIX.md](./FEATURE_MATRIX.md), both are **Future Phase**–leaning with an open identity/targeting question in [PROJECT_SPEC.md](./PROJECT_SPEC.md). These milestones resolve that ambiguity rather than assuming an outcome.

### M46 — Remove review submission for v1
- **Goal**: Reviews are decided out of scope for v1 — [ADR-016](./DECISIONS.md#adr-016-reviews-are-out-of-scope-for-v1). Execute the removal path: delete `RatingModal.jsx` and its entry points, and strip the dummy star-rating display.
- **Files**: `components/RatingModal.jsx`, `components/ProductDescription.jsx`, `components/ProductCard.jsx`, `components/ProductDetails.jsx`
- **Dependencies**: M25
- **Testing**: No dead entry points remain; no star-rating UI references the removed dummy rating data; `npm run build` succeeds.
- **Rollback**: Revert the touched files.
- **Commit message**: `Remove review submission for v1 (ADR-016)`

### M47 — Remove coupon input for v1
- **Goal**: Coupons are decided out of scope for v1 — [ADR-017](./DECISIONS.md#adr-017-coupons-are-out-of-scope-for-v1). Execute the removal path: remove the coupon-code input from `OrderSummary.jsx`.
- **Files**: `components/OrderSummary.jsx`
- **Dependencies**: M33
- **Testing**: No non-functional coupon input remains in the checkout UI; `npm run build` succeeds.
- **Rollback**: Revert the file.
- **Commit message**: `Remove coupon input for v1 (ADR-017)`

### M48 — Clean up any remaining dead ends from M46/M47
- **Goal**: Sweep for any leftover references (nav links, footer copy, unused imports) tied to whichever paths were removed in M46/M47.
- **Files**: identified during M46/M47, likely `components/Footer.jsx`
- **Dependencies**: M46, M47
- **Testing**: `npm run build` succeeds; manual click-through finds no dead links or references to removed functionality.
- **Rollback**: Revert the specific cleanup commit.
- **Commit message**: `Clean up references to deferred/removed reviews and coupons functionality`

---

## Group: Dockerization & production readiness — `M49`–`M54`

> **Target infrastructure baseline is decided** — [ADR-015](./DECISIONS.md#adr-015-initial-production-infrastructure-baseline): Cloudflare Free + a single ~$10–12/month VPS running the Dockerized app and PostgreSQL + Resend free-tier email + COD only. SMS is deferred to a future phase; backups are managed manually at launch. These milestones should target that baseline, kept replaceable/upgradable without an application rewrite.

### M49 — Production Dockerfile stage
- **Goal**: Add a production build stage to the Dockerfile (multi-stage, non-root user, minimal final image), building on the dev stage from M5.
- **Files**: `Dockerfile`
- **Dependencies**: M5
- **Testing**: `docker build --target production .`; resulting container starts and serves the app correctly with `NODE_ENV=production`.
- **Rollback**: Revert `Dockerfile` to the dev-only version.
- **Commit message**: `Add production build stage to Dockerfile`

### M50 — Full-stack docker-compose (dev and prod variants)
- **Goal**: Compose the app and Postgres together (extending M1), with separate dev/prod configurations.
- **Files**: `docker-compose.yml` (extended), `docker-compose.prod.yml` (new)
- **Dependencies**: M1, M49
- **Testing**: `docker compose up` brings up app + Postgres together locally; `docker compose -f docker-compose.prod.yml up` runs the production target successfully.
- **Rollback**: Revert compose files to the Postgres-only version from M1.
- **Commit message**: `Add full-stack docker-compose for dev and production`

### M51 — Real image optimization for self-hosted deployment
- **Goal**: Remove `images.unoptimized: true` (a Vercel-shortcut default) and configure Next.js image optimization to work correctly under Docker.
- **Files**: `next.config.mjs`
- **Dependencies**: M49
- **Testing**: Product images on the storefront load correctly and are actually optimized (check response headers/sizes) when served from the Dockerized app.
- **Rollback**: Revert `next.config.mjs`.
- **Commit message**: `Enable real image optimization for self-hosted production deployment`

### M52 — Production environment/secrets handling
- **Goal**: Document and structure how `DATABASE_URI` (per [ADR-010](./DECISIONS.md#adr-010-the-postgresql-connection-string-is-named-database_uri)), `PAYLOAD_SECRET`, and any other secrets are supplied in production (without committing real values).
- **Files**: `.env.example` (finalized), `docker-compose.prod.yml`
- **Dependencies**: M50
- **Testing**: A fresh clone can be configured for production using only `.env.example` as a guide and real secrets supplied out-of-band.
- **Rollback**: Revert the two files.
- **Commit message**: `Document production environment and secrets configuration`

### M53 — Health checks and logging
- **Goal**: Add container health checks and baseline error/log capture suitable for a small production deployment.
- **Files**: `docker-compose.prod.yml` (healthcheck blocks), `app/api/health/route.ts` (new)
- **Dependencies**: M50
- **Testing**: `docker compose -f docker-compose.prod.yml ps` shows the app container as healthy; hitting `/api/health` returns a 200.
- **Rollback**: Remove the healthcheck config and the new route.
- **Commit message**: `Add health check endpoint and container health checks`

### M54 — Backup/persistence strategy for Postgres and media
- **Goal**: Ensure Postgres data and uploaded media survive container restarts/redeploys, with a documented backup approach.
- **Media is a local Docker volume, not object storage** ([ADR-020](./DECISIONS.md#adr-020-media-storage-backend-is-a-local-docker-volume-for-v1-with-cloudflare-r2-as-the-designated-successor)), so it carries the same manual-backup burden as Postgres under [ADR-015](./DECISIONS.md#adr-015-initial-production-infrastructure-baseline) — this milestone's persistent-volumes scope must cover both, not just the database.
- **Files**: `docker-compose.prod.yml` (named volumes), `docs/ARCHITECTURE.md` (backup notes, if not already covered)
- **Dependencies**: M50, M8
- **Testing**: Stop and restart the full stack; confirm previously seeded/created data and uploaded media are still present.
- **Rollback**: Revert compose volume changes.
- **Commit message**: `Add persistent volumes and backup strategy for Postgres and media`

---

## Group: Currency & localization sweep — `M55`–`M56`

### M55 — PKR currency formatting sweep
- **Goal**: Replace the hardcoded `$`-fallback currency pattern (currently duplicated across 9 files) with a single PKR-aware formatting utility, per the confirmed answer to the currency open question in [PROJECT_SPEC.md](./PROJECT_SPEC.md).
- **Files**: `lib/currency.ts` (new), and every consumer currently reading `process.env.NEXT_PUBLIC_CURRENCY_SYMBOL` directly: `components/Hero.jsx`, `OrderSummary.jsx`, `OrderItem.jsx`, `ProductCard.jsx`, `ProductDetails.jsx`, plus any admin-adjacent pages retained
- **Dependencies**: M28
- **Testing**: All prices across the storefront render in the confirmed PKR format consistently.
- **Rollback**: Revert all touched files.
- **Commit message**: `Replace hardcoded currency fallback with PKR formatting utility`

### M56 — Pakistani address/phone validation
- **Goal**: Apply the confirmed Pakistani address format (city/area conventions, phone-first) as real validation, not just field labels, across guest checkout.
- **Files**: `components/AddressModal.jsx`, `collections/Orders.ts` (field validation)
- **Dependencies**: M31, M11
- **Testing**: Submitting an invalid Pakistani phone number/address is rejected with a clear message; a valid one succeeds.
- **Rollback**: Revert both files.
- **Commit message**: `Add Pakistani address and phone format validation to guest checkout`

---

## Group: Launch cutover — `M57`–`M59`

### M57 — End-to-end regression pass
- **Goal**: Walk the full core flow from [PROJECT_SPEC.md](./PROJECT_SPEC.md) end to end — browse → cart → guest checkout → COD order → admin fulfillment — and fix anything broken by the cumulative migration.
- **Files**: scoped to whatever the regression pass finds
- **Dependencies**: all prior milestones
- **Testing**: The core flow completes successfully, on both desktop and mobile viewports, against a freshly seeded database.
- **Rollback**: Revert whichever specific fix commit is found to be wrong.
- **Commit message**: `Fix regressions found in end-to-end launch readiness pass`

### M58 — Update documentation to reflect the live architecture
- **Goal**: Update `README.md`, `CLAUDE.md`, and `docs/ARCHITECTURE.md` to describe the system as it now actually is, not as it was planned to become.
- **Files**: `README.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md` (mark phases complete)
- **Dependencies**: M57
- **Testing**: A new contributor following `README.md`'s setup instructions can get the real stack running locally.
- **Rollback**: Revert the doc changes.
- **Commit message**: `Update documentation to reflect the live Payload CMS + PostgreSQL architecture`

### M59 — Production deploy runbook and release tag
- **Goal**: Document the actual production deployment steps and cut the first release.
- **Files**: `docs/DEPLOYMENT.md` (new), `docs/CHANGELOG.md` (release entry)
- **Dependencies**: M58
- **Testing**: Following the runbook on a clean environment successfully deploys a working production instance.
- **Rollback**: N/A at this point — a failed production deploy is rolled back via the runbook's own rollback section, not by reverting this documentation commit.
- **Commit message**: `Add production deployment runbook and cut v1.0.0`

---

## Summary

Groups are labels, not a sequence. Read the **Order** column for execution.

| Milestones | Group | Order |
|---|---|---|
| `M14`, `M16`, `M17`, `M19` | Remove the multi-vendor surface (`app/store/**` and admin routes) | **First — must precede `M3`** (see [ADR-014](./DECISIONS.md#adr-014-m14-is-a-hard-prerequisite-of-m3-not-an-order-independent-milestone)) |
| `M1`, `M2`, `M2a`, `M3`, `M4`, `M5` | Foundation & tooling: Docker Postgres, Payload, TypeScript, retire Prisma | After the `M14`/`/admin` clearance above |
| `M15`, `M18` | Remove the multi-vendor surface (remaining non-admin routes) | Any time — no dependencies |
| `M6`–`M13`, `M13a` | Payload collections: Users, Media, Categories, Products, Orders, Settings global | After `M3` (`M13a` after `M6`) |
| `M20`–`M21` | Confirm admin-only auth end to end | After `M17`, `M19` |
| `M22`–`M28` (incl. `M27a`, `M27b`) | Storefront wired to real product/category data; category browsing routes; dummy data removed | After `M13` |
| `M29` | Real search | After `M24` |
| `M30`–`M36` | Cart persistence, guest checkout, real COD order creation | After `M13` (`M30` any time) |
| `M37`–`M39` | Admin order fulfillment | After `M33` |
| `M40`–`M43` | SEO: server rendering, metadata, sitemap, structured data | After `M23`, `M25` |
| `M44`–`M45` | Mobile-first audit and performance | After `M28` |
| `M46`–`M48` | Reviews/Coupons: decide and land minimal v1 scope | After `M25`, `M33` |
| `M49`–`M54` | Docker production hardening, health checks, backups | After `M5` |
| `M55`–`M56` | PKR currency and Pakistani address/phone validation | After `M28` |
| `M57`–`M59` | Regression pass, docs, launch | Last |

**63 milestones total** — `M1`–`M59` plus four decimal insertions that avoid renumbering the rest: `M2a` (TypeScript toolchain), `M27a`/`M27b` (category browsing routes, closing readiness finding **C8** per [ADR-013](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy)), and `M13a` (Settings global, closing readiness risk **R6** per [ADR-018](./DECISIONS.md#adr-018-shipping-model--flat-rate-with-a-free-shipping-threshold-snapshotted-per-order)).
