# Decisions — GoCart Pakistan

Architecture Decision Record (ADR) log. Each entry: Context, Decision, Consequences. Newest at the bottom. Add a new entry rather than editing history — if a decision changes, record the change as a new ADR that supersedes the old one.

> **Referencing convention**: ADRs cite implementation work by **milestone ID** (`M1`–`M59`, see [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)) — never by phase number. Phase/group names are labels for reporting only and carry no execution order.

---

## ADR-001: Adopt Payload CMS v3 as the backend and admin panel

**Status**: Accepted (stakeholder requirement)

**Context**: The inherited GoCart app has no real backend — a Prisma schema exists but isn't wired to a client, and there's no admin panel with access control.

**Decision**: Use Payload CMS v3 as the system of record for products, orders, and admin auth, replacing the unwired Prisma layer.

**Consequences**: `prisma/schema.prisma` is retired as a live schema (kept only as design reference, per ADR-003). All product/order data access goes through Payload's API/local API instead of a hand-rolled Next.js API layer.

---

## ADR-002: PostgreSQL as the only datastore

**Status**: Accepted (stakeholder requirement)

**Context**: The original Prisma schema already targeted PostgreSQL.

**Decision**: PostgreSQL remains the datastore, now accessed via Payload's `@payloadcms/db-postgres` adapter instead of Prisma directly.

**Consequences**: No dual-database or dual-ORM setup. Payload manages its own migrations.

---

## ADR-003: Retire the unwired Prisma schema in favor of Payload-managed collections

**Status**: **Accepted (2026-08-14)** — confirmed ahead of `M4`, the milestone that executes it. Supersedes the earlier `Proposed` status.

**Context**: `prisma/schema.prisma` models a multi-vendor marketplace (`User`, `Store`, `Product`, `Order`, `OrderItem`, `Rating`, `Address`, `Coupon`) and is not currently wired to any Prisma client dependency. Payload CMS v3 needs its own collection definitions and manages its own DB schema/migrations.

**Evidence supporting acceptance** (all verified read-only, no code changed):

- `@prisma/client` and `prisma` are absent from `package.json` — confirmed in [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md) ("Dependencies") and by direct inspection of the manifest.
- No file in `app/`, `components/`, or `lib/` imports a Prisma client; there is no generated client and no `app/api/` layer that could consume one ([REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md), "Data flow" and "API routes").
- `DATABASE_URL`/`DIRECT_URL` are referenced only inside `schema.prisma` itself and are declared nowhere else, so no runtime path depends on them.
- [ADR-001](#adr-001-adopt-payload-cms-v3-as-the-backend-and-admin-panel) and [ADR-002](#adr-002-postgresql-as-the-only-datastore) are Accepted, making Payload's Postgres adapter the system of record; a second schema definition would be an unreferenced duplicate at best and a source of drift at worst.
- The schema encodes the multi-vendor domain that [ADR-006](#adr-006-single-store-no-vendors--admin-only-authentication-multi-vendor-marketplace-features-removed-from-scope) removed from scope, so it is not a candidate for direct carry-forward.

Because the layer was never live, retiring it cannot regress runtime behavior. That is the whole of the risk assessment, and it is why this ADR can be accepted on documentation evidence alone.

**Decision**: Treat the Prisma schema as historical reference for field/relationship intent only. Payload collections are the actual schema going forward. The file and directory are deleted by `M4`; until `M4` runs, `prisma/schema.prisma` stays untouched on disk.

**Consequences**:

- No functionality is lost, since the Prisma layer was never live.
- Payload collection design (`M9`–`M12`) should be checked against the retired schema for domain concepts worth keeping (e.g. `Coupon` shape, `Rating` uniqueness constraint) before it leaves the working tree.
- `M4` also removes the now-meaningless `/app/generated/prisma` entry from `.gitignore`.
- Restoring the schema, if ever needed as reference, is a `git revert` of `M4` — the history retains it permanently.

---

## ADR-004: Cash on Delivery only for launch, architecture stays payment-extensible

**Status**: Accepted (stakeholder requirement)

**Context**: COD is the dominant and trusted payment method in Pakistani ecommerce; the existing `PaymentMethod` enum already includes `COD` and `STRIPE` as design intent.

**Decision**: Only COD is implemented and offered at checkout for v1. The `Orders` collection models `paymentMethod` and `isPaid` as first-class fields so additional gateways can be added later without restructuring orders.

**Consequences**: No payment gateway integration work happens now. Checkout UI shows COD as the only option (not a disabled placeholder for others, to avoid confusing customers).

---

## ADR-005: Guest checkout, no customer accounts

**Status**: Accepted (stakeholder requirement)

**Context**: The original schema ties `Order`, `Address`, and `Rating` to a `User` account. Forcing account creation is friction that hurts conversion, especially on mobile.

**Decision**: Customers can place an order without registering or logging in. Order/address data is captured inline per order rather than requiring a persistent customer identity.

**Consequences**: Features that assumed a persistent `User` (order history by login, ratings tied to a user account, member-only coupons) need redesign or removal for v1 — tracked as an open question in `PROJECT_SPEC.md`.

---

## ADR-006: Single store, no vendors — admin-only authentication, multi-vendor marketplace features removed from scope

**Status**: Accepted (stakeholder decision, 2026-08-07) — supersedes the "Proposed" status of this ADR

**Context**: The inherited app is a multi-vendor marketplace: vendors register, get approved (`app/admin/approve`), and manage their own store (`app/store/*`, `Store` model with `userId` owner). This ADR was originally raised as an open question because "Admin login only" implied but didn't confirm a single-store model.

**Decision**: Explicitly confirmed by the stakeholder. This is a **single-store platform**:
- One store only — no per-vendor stores
- No vendors, no seller dashboard, no seller registration, no vendor approval flow
- **Admin Users only** — the sole authenticated role is the store admin, via Payload CMS's built-in auth
- Guest checkout only — no customer accounts either

**Consequences**: `app/store/*` (vendor dashboard), `app/admin/approve` and `app/admin/stores` (vendor approval/management), and the `Store` model's marketplace semantics (`status`, `isActive`, per-store ownership of products/orders) are **not carried forward** into the target product. `Products` and `Orders` in the Payload collection design (`M10`, `M11`) belong to the platform directly — no store/vendor relation. This is a significant scope reduction from the current codebase, not just an auth change. No application code has been removed yet under this decision; removal of the legacy vendor/admin-approval routes and the `Store` model is future implementation work, executed by `M14`–`M17` and `M19`.

**This decision is closed.** Any documentation, plan, or agent output that describes multi-vendor vs. single-store as an open question is stale and should be corrected against this ADR rather than treated as a live question.

---

## ADR-007: SEO-first and mobile-first are default requirements, not a later pass

**Status**: Accepted (stakeholder requirement)

**Context**: Ecommerce discovery in the target market is search- and mobile-heavy.

**Decision**: Every storefront page ships with proper metadata/structured data and is designed mobile-first from the start, rather than treating SEO/responsiveness as post-launch cleanup.

**Consequences**: SEO and mobile review are part of the definition of done for the storefront milestones `M22`–`M28`, and are carried explicitly by `M40`–`M43` (server rendering, metadata, sitemap/robots, structured data) and `M44`–`M45` (mobile audit and performance) — not a separate deferred phase.

---

## ADR-008: Dockerize app, CMS, and database for both dev and production

**Status**: Accepted (stakeholder requirement)

**Context**: No containerization exists today; `next.config.mjs` has Vercel-oriented defaults (`images.unoptimized: true`) that don't suit a self-hosted deployment.

**Decision**: Provide a multi-stage `Dockerfile` for the app and a `docker-compose.yml` covering the app and PostgreSQL, usable for both local development and as the basis for production deployment.

**Consequences**: Production-specific config (secrets, health checks, image optimization loader) needs to be revisited away from the current Vercel-shaped defaults.

---

## ADR-009: Payload CMS runs embedded inside the Next.js application, not as a separate service

**Status**: **Accepted (2026-08-14)**

**Context**: [ADR-001](#adr-001-adopt-payload-cms-v3-as-the-backend-and-admin-panel) chose Payload CMS v3 but never fixed its deployment topology. [ARCHITECTURE.md](./ARCHITECTURE.md) recorded a *preference* for embedding and simultaneously listed the question under "Not yet decided", while `M3` claimed to implement "the mounting decision in ARCHITECTURE.md" — a decision that did not exist. This ADR closes that gap. The topology determines the shape of `M3` (mounting), `M5`/`M49` (Dockerfile targets), `M50` (compose services), and `M53` (health checks), so it must be settled before `M1`.

### Options considered

**Option A — Payload embedded in the Next.js application.** One codebase, one build, one container. Payload's admin UI and REST/GraphQL endpoints mount as App Router routes; the storefront calls Payload's Local API in-process.

**Option B — Payload deployed as a separate service.** Two codebases/builds, two containers. The Next.js storefront talks to Payload over HTTP (REST/GraphQL) across a network boundary.

| Dimension | A — Embedded | B — Separate service | Favors |
|---|---|---|:---:|
| **Development complexity** | One `npm run dev`, one port, one env file, one place to set a breakpoint | Two processes to run and keep in sync locally; CORS and service-discovery config even in dev | **A** |
| **Deployment complexity** | One image, one deploy, one rollback unit; no inter-service version skew possible | Two images, ordered deploys, and a real risk of storefront/CMS version skew during rollout | **A** |
| **Operating cost** | One app container + Postgres | Two app containers + Postgres; roughly double the always-on compute for a single-store catalog | **A** |
| **Performance** | Server-rendered pages read through the Local API in-process — no HTTP hop, no serialization round-trip on the SSR path that SEO depends on | Every SSR product/category render adds a network call; the SEO-critical path is the one that pays for it | **A** |
| **Shared types** | Payload's generated types are imported directly by storefront code; a schema change surfaces as a compile error | Types must be published or duplicated across the boundary; drift is caught at runtime, if at all | **A** |
| **Database access** | Single process owns the Postgres connection pool | Two services, two pools, or an awkward rule that only one may touch the DB | **A** |
| **Media handling** | One upload path and one storage mount to configure | Storage must be reachable and consistently configured from both services | **A** |
| **Authentication** | Payload's session/cookie auth is same-origin by construction — no cross-origin cookie work | Cross-origin auth between storefront origin and CMS origin; more moving parts on the only authenticated surface in the system | **A** |
| **Scaling** | Storefront and admin scale together; cannot scale read traffic independently of the admin panel | Independent scaling per service | **B** |
| **Monitoring** | One log stream, one health check, one error surface | Per-service observability, plus the inter-service call to instrument | **A** |
| **Maintenance** | One dependency tree and one upgrade cycle | Two of each, with a compatibility matrix between them | **A** |
| **Future evolution** | A later split is a refactor, but a tractable one: the Local API call sites become HTTP call sites behind the same `lib/payload/*` utilities (`M22`) | Already split; no future migration needed | **B** |
| **Suitability (single-store, Pakistan, COD)** | Matches the actual shape of the problem: one store, one admin, modest catalog, small team, cost-sensitive self-hosting | Solves a multi-team, multi-consumer scaling problem this project does not have | **A** |

### Decision

**Option A — Payload runs embedded inside the Next.js application.** Payload's admin UI mounts at `/admin` and its REST/GraphQL API under `/api`, both as App Router routes in the existing app. Server-rendered storefront pages use Payload's Local API; no HTTP hop on the SSR path.

### Decision rationale

Option A wins eleven of thirteen dimensions, and the two it loses are not live constraints for this project. **Independent scaling** presupposes admin traffic that competes with storefront traffic — for a single store with one admin user, it does not. **Future evolution** is a real cost of A, but a bounded one: because all Payload access is funnelled through the `lib/payload/*` utilities introduced at `M22`, converting Local API calls to HTTP calls later is a change to those modules rather than to every consumer.

The decisive factors are performance on the SEO-critical path and the absence of a distributed-systems failure mode. [ADR-007](#adr-007-seo-first-and-mobile-first-are-default-requirements-not-a-later-pass) makes server-rendered product and category pages non-negotiable; Option B taxes exactly those renders with a network call, and adds a class of failure (CMS unreachable → storefront degraded) that Option A cannot produce. A separate service would be buying multi-team scaling properties at the cost of latency, spend, and operational surface, for a platform that has neither multiple teams nor multiple consumers.

### Consequences

- **Payload owns the `/admin` route.** The inherited hand-built admin at `app/admin/*` must be removed *before* Payload mounts, or the two collide as parallel routes resolving the same path. This is why `M16`, `M17`, and `M19` are sequenced ahead of `M3` — see the execution order in [MIGRATION_PLAN.md](./MIGRATION_PLAN.md).
- `M3` mounts Payload in-app (`app/(payload)/admin/...`, `app/(payload)/api/...`) and wraps `next.config.mjs` with Payload's Next.js integration.
- One `Dockerfile` and one app service in compose (`M5`, `M49`, `M50`) — not two.
- The app container needs enough memory for both the storefront and the admin bundle; sizing is a `M50`/`M53` concern.
- Storefront and admin share a deploy and a restart. A CMS upgrade is a full-app deploy.
- Horizontal scaling remains available (the Next.js app is stateless), but it interacts with the still-open media-storage question: a local-volume media backend constrains multi-instance deployment in a way object storage does not. Tracked as a blocking decision before `M6`.
- Payload's generated types become importable across the app once TypeScript is established at `M2a`.

---

## ADR-010: The PostgreSQL connection string is named `DATABASE_URI`

**Status**: **Accepted (2026-08-14)** — decided while executing `M1`, the milestone that first declares the variable.

**Context**: `M1` originally specified adding `DATABASE_URL` to `.env.example`. That name is inherited from `prisma/schema.prisma:8` (`url = env("DATABASE_URL")`) — a layer that was never wired up and is retired by `M4` per [ADR-003](#adr-003-retire-the-unwired-prisma-schema-in-favor-of-payload-managed-collections). Payload v3's Postgres adapter (`@payloadcms/db-postgres`), which [ADR-002](#adr-002-postgresql-as-the-only-datastore) makes the sole database access path, conventionally reads **`DATABASE_URI`** — that is the name its own project template, documentation, and generated configuration use. Carrying the Prisma-era name forward would leave the repository permanently off-convention against the only data layer it has. [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md) flagged the mismatch as risk `R10` and required it be confirmed rather than discovered at `M3`'s first connection failure.

**Decision**: The PostgreSQL connection string is `DATABASE_URI`, everywhere, in every environment. `DATABASE_URL` is **not** declared, aliased, or supported as a fallback — a second name for one value is drift waiting to happen, and there is no consumer of the old name to be compatible with (nothing has ever read it at runtime).

**Consequences**:

- `M1` declares `DATABASE_URI` in `.env.example`; `M3` reads it in `payload.config.ts`; `M50`/`M52` supply it to containers. One name, one value, one path.
- Risk `R10`'s database-variable half is closed. Its second half — an absolute public base URL (e.g. `NEXT_PUBLIC_SERVER_URL`) needed by `M42` — is untouched by this ADR and remains open against `M42`/`M52`.
- Prior documentation that names `DATABASE_URL` as a thing to add is superseded by this ADR. `M1` and `M52` in [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) were corrected as part of `M1`. [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md)'s references stay as written: they are a point-in-time audit of what the Prisma schema declared, and correctly anticipated replacement "with Payload's own DB connection variable."
- The variable is not consumed by any code yet — nothing reads it until `M3`. `M1` ships it as configuration the developer sets up front, matching the credentials `docker-compose.yml` starts Postgres with.

---

## ADR-011: Payload v3 dependency set — exact pins, a raised Next.js floor, and patched `sharp`

**Status**: **Accepted (2026-08-14)** — decided while executing `M2`, the milestone that installs the stack.

**Context**: `M2` installs Payload v3 into an app already running Next.js 15.3.5. The milestone text delegates the specifics — *"Confirm the exact set and versions against the Payload v3 release being installed"* — and three non-obvious choices surfaced during execution:

1. **The install cannot proceed as-is.** `@payloadcms/next@3.88.0` peer-depends on `next` at `">=15.2.9 <15.3.0 || >=15.3.9 <15.4.0 || >=15.4.11 <15.5.0 || >=16.2.6 <17.0.0"`. Next 15.3.5 falls in the gap between the first two ranges and satisfies none of them; `npm install` fails with `ERESOLVE`. The ranges encode Next security-patch floors.
2. **The `@payloadcms/*` packages cross-peer on an exact `payload` version**, and a Payload `4.0.0-canary` line already exists on npm, so an unpinned install could silently land on v4 and violate [ADR-001](#adr-001-adopt-payload-cms-v3-as-the-backend-and-admin-panel).
3. **`sharp` 0.34.x carries a HIGH advisory** — inherited libvips CVE-2026-33327/33328/35590/35591 — fixed in 0.35.0. Pinning 0.34.x would have deduplicated with the copy Next declares as an optional dependency (one fewer native binary set on disk); pinning 0.35.x patches the vulnerability but leaves Next's own nested 0.34.5 copy in the tree.

**Decision**:

- **`next` is pinned to exactly `15.3.9`** — the lowest version satisfying Payload's peer range, a patch-level move inside the same minor. Working around the conflict with `--legacy-peer-deps` or `--force` was **rejected**: the range encodes security floors, and bypassing it installs a combination Payload does not support.
- **`payload`, `@payloadcms/db-postgres`, `@payloadcms/next`, and `@payloadcms/richtext-lexical` are pinned to exactly `3.88.0`** and are always upgraded as a set.
- **`@payloadcms/richtext-lexical` is the editor** — Payload v3's own default; `richtext-slate` is the legacy option.
- **`sharp` is `^0.35.3`, not `^0.34.1`.** Security outranks the duplicate-binary saving. The `M2` brief had specified `^0.34.1` for deduplication before the advisory was known; that trade inverted once it was.
- `graphql` is `^16.14.2`, satisfying the `^16.8.1` peer.

**Consequences**:

- **Next 15.3.9 is not advisory-free, and cannot be made so inside Payload's supported range.** Payload's peer range excludes the entire `15.5.x` line, which is where most published Next fixes landed; the only fully patched compatible line is **Next 16.2.6+**, a major upgrade with its own breaking-change surface. This is deliberately out of `M2`'s scope and **must be decided before production** — it belongs with the hardening milestones (`M49`–`M54`) and the launch gate (`M59`). No milestone owns it today.
- **A nested `sharp@0.34.5` remains under `next`** (Next declares `sharp` as an optional dependency at `^0.34.1`). It is reachable only through Next's image optimizer, which is **disabled today** by `images.unoptimized: true`. **`M51`, which re-enables the optimizer, must resolve that nested copy first** — by upgrading Next or by adding an npm `overrides` entry. An override was not added at `M2`: forcing Next onto a `sharp` major it does not declare is an untested combination, and there is no benefit while the optimizer is off.
- Audit posture moved from **3 advisories (1 critical, 2 high)** before `M2` to **10 (3 high, 6 moderate, 1 low)** after. The critical was eliminated by the Next bump. The seven additions come from Payload's own tree — `drizzle-kit → esbuild` (dev-server advisory) and `monaco-editor → dompurify` (admin-panel editor) — and are upstream-owned, not fixable by application-level version choices.
- Any future Payload upgrade must re-check the `next` peer range before it is attempted; the two are coupled from here on.

---

## ADR-012: TypeScript pinned to the 5.x line, not the `latest` tag

**Status**: **Accepted (2026-08-14)** — decided while executing `M2a`, the milestone that installs the toolchain.

**Context**: `M2a` installs `typescript` as a `devDependency` ahead of every `.ts`-authoring milestone from `M3` onward. At execution time, npm's `latest` tag for `typescript` pointed to **`7.0.2`** — a native (Go-ported) compiler rewrite that had only just superseded a `6.x` line consisting of two releases. `next@15.3.9` (installed at [ADR-011](#adr-011-payload-v3-dependency-set--exact-pins-a-raised-nextjs-floor-and-patched-sharp)) itself declares a `typescript` **`devDependency` of `5.8.2`** — i.e., what Next.js's own tooling, including its automatic `tsconfig.json` setup and type-checking pass, is built and tested against. Payload v3's project templates likewise target the `5.x` line. `M2a`'s own text anticipates exactly this kind of check: *"Confirm the TypeScript version satisfies both Next 15 and the Payload v3 release installed at `M2`."*

**Decision**: Install `typescript@^5.9.3` — the latest release on the mature `5.x` line — not the `latest` dist-tag. Stakeholder-confirmed.

**Consequences**:

- The toolchain matches what Next 15.3.9 and Payload v3's own tooling are validated against, rather than adopting a same-day major rewrite with materially less real-world mileage against this exact combination.
- This is a deliberate divergence from "always take `@latest`." Revisit once TypeScript 7's ecosystem (editor integrations, Next.js's own internal upgrade, Payload's build pipeline) has matured — not on this migration's critical path.
- `@types/node` is pinned to `^22.20.1` to match the actual Node.js runtime (`v22.19.0`), not the `@types/node` `latest` tag (which resolved to `26.x`, describing APIs absent from this runtime). `@types/react`/`@types/react-dom` are left at their resolved `^19.x` versions — those track the installed `react`/`react-dom` major directly, so no separate pin decision was needed.

---

## ADR-013: Category browsing ships in Phase 1 as dedicated slug routes with a two-level hierarchy

**Status**: **Accepted (2026-08-16)** — stakeholder-confirmed. Closes readiness finding **C8**.

**Context**: The target product is a multi-category, multi-product storefront, but customer-facing category browsing exists neither in the codebase nor in the plan. Verified read-only:

- **No `/categories` route and no `/category/[slug]` route exist.** Categories appear only as a hardcoded six-item array in `assets/assets.js`, a second conflicting ten-item array in the vendor add-product form (itself scheduled for deletion at `M14`), a free-text `category` string on each dummy product, unlinked breadcrumb text on the product page, and `components/CategoriesMarquee.jsx`, which renders bare `<button>`s with no `onClick` and no `href`.
- **`prisma/schema.prisma` has no `Category` model at all** — `category` is a plain required `String` on `Product`, with no slug, no relation, and no hierarchy. There is nothing to carry forward.
- **No milestone in `M1`–`M59` created a category route**, while four assumed one existed: `M27`'s acceptance test asserted *"clicking one filters/links correctly"*, `M41` added metadata to *"product, category/shop, and home pages"*, `M42` generated a sitemap listing *"real seeded products/categories"*, and [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) justified the `Categories` collection by *"SEO-friendly category pages"*.
- **`M9` specified no fields whatsoever** — one sentence, no `slug`, no `parent`, no ordering, no SEO fields.

[PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md) recorded this as contradiction **C8** (HIGH, blocking `M27`/`M41`/`M42`): *"Categories are modeled, seeded, marqueed, and sitemapped — but never browsable."* Its correction #14 prescribed inserting the missing milestone using decimal IDs.

A second ambiguity compounded it: [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) marks **Filters** as Future Phase and [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)'s scope note excludes them from the plan. Read literally, that defers "category filtering" — and with it, plausibly, category browsing itself.

### Decision

**Category browsing is Phase 1 launch scope**, delivered as two dedicated server-rendered routes:

| Route | Milestone |
|---|:---:|
| `/categories` — landing index of all top-level categories with their children | **`M27b`** |
| `/category/[slug]` — category detail and paginated product listing | **`M27a`** |

Four sub-decisions, each of which was a genuine fork:

1. **Dedicated slug routes, not shop query-param filtering.** `/category/[slug]` is the single canonical products-by-category URL. **`/shop?category=` is not introduced.** Two URLs returning one result set split ranking signals between them — a duplicate-content problem, not a feature. `/shop` keeps its existing role: all products plus name-based search.
2. **Exactly two levels — parent → child.** A `parent` self-relation on `Categories`, with validation rejecting a third level. Category URLs are **flat** (`/category/phone-cases`, never `/category/accessories/phone-cases`) and slugs are unique across the whole collection.
3. **Parent pages roll up descendants.** A parent lists products assigned to itself *plus* every child. Resolved once in `getProductsByCategory()` (`M22`), not per route.
4. **Page-number pagination** — `?page=N`, 24 per page, server-rendered, with canonical and `rel=prev`/`next` links.

**Rejected alternatives**:

- **`/shop?category=` filtering** — cheapest to build, but produces the duplicate-content split above, gives category-intent search nothing distinct to rank, and blurs the Filters boundary that this ADR exists partly to draw.
- **Arbitrary-depth nesting** — more admin flexibility, at the cost of recursive descendant queries, recursive breadcrumbs, and a cycle guard. The `parent` self-relation already models it, so relaxing the depth validation later needs no data migration. Two levels is a bound, not a ceiling.
- **Directly-assigned products only on parent pages** — a simpler query that renders parent pages empty whenever admins file products under children, which is exactly what admins do. The single most common way category navigation looks broken.
- **Infinite scroll / load-more** — better mobile feel, but products past page 1 are invisible to crawlers unless a parallel paginated path is maintained anyway. Direct conflict with [ADR-007](#adr-007-seo-first-and-mobile-first-are-default-requirements-not-a-later-pass).

Full behavior specification: [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md).

**Consequences**:

- **`M9` gains a real field list** — `title`, `slug` (unique, indexed, generated-then-stable), `parent` (self-relation, `hasMany: false`), `description`, `image`, SEO overrides, `displayOrder` — plus the two-level constraint and slug uniqueness in its acceptance tests. It also gains a dependency on `M8`, since the `image` field targets the Media collection.
- **`M10` fixes `Products.category` cardinality** at `hasMany: false` — one product, one most-specific category.
- **`M22` owns the rollup.** `getTopLevelCategories()`, `getCategoryBySlug()`, and `getProductsByCategory()` are shared utilities so the routes and the sitemap cannot disagree about a category's contents.
- **`M27`'s false acceptance test is corrected.** The marquee stays inert at `M27` (preserving today's behavior, so no dead-link window opens) and becomes links at `M27a`.
- **`M41`, `M42`, and `M44` gain `M27a`/`M27b` dependencies.** `M42`'s sitemap in particular could not previously have listed the category URLs its own goal describes.
- **Slugs are stable by policy.** Renaming a category does not regenerate its slug; an admin changes one deliberately or not at all. Re-parenting never changes a URL, because URLs are flat.
- **Category browsing requires no authentication**, consistent with [ADR-005](#adr-005-guest-checkout-no-customer-accounts) and [ADR-006](#adr-006-single-store-no-vendors--admin-only-authentication-multi-vendor-marketplace-features-removed-from-scope).
- **Faceted filtering stays Future Phase** — price, brand, rating, in-stock, sort, multi-facet. This ADR draws the boundary; it does not move it.
- **JSON-LD on category pages is not Phase 1.** `M43` stays scoped to `Product` on product detail pages.
- One of the `M6` gate's collection-design inputs is now settled: the `Categories` shape no longer blocks the start of data modeling.

---

## ADR-014: `M14` is a hard prerequisite of `M3`, not an order-independent milestone

**Status**: **Accepted (2026-08-16)** — discovered during `M3` analysis, stakeholder-confirmed.

**Context**: [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) previously classified `M14` (delete `app/store/**`, the vendor dashboard) as having no dependencies and landing "at any point," grouped with `M15`/`M18` for narrative reasons only, distinct from `M16`/`M17`/`M19`'s hard `app/admin/**` route-collision precondition. Analysis of `M3` (scaffolding and mounting Payload inside the Next.js app) found a second precondition: mounting Payload's admin UI requires restructuring the app into Next.js's **multiple root layouts** pattern — each top-level route group (`(public)`, `(payload)`) defining its own root layout. `app/store/**`, the directory `M14` deletes, sits outside any route group and collides with that restructuring if it is still present when `M3` lands, independent of and in addition to the `app/admin/**` collision already tracked for `M16`/`M17`/`M19`.

**Decision**: `M14` is promoted from "order-independent" to a **hard prerequisite of `M3`**. `M3` must not be implemented before `M14`. `M14` itself still has no prerequisites of its own and can land at any time before `M3`.

**Consequences**:

- [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)'s execution-order exception list, critical-path diagram, `M3`'s `Dependencies` line, and the "Group: Remove the multi-vendor surface" ordering note are updated to include `M14` alongside `M16`/`M17`/`M19`.
- `M15` and `M18` are unaffected — they remain genuinely order-independent.
- With `M1`, `M2`, `M2a`, `M16`, `M17`, and `M19` already **Done**, `M14` — not `M3` — is the next milestone to execute.
- [TASKS.md](./TASKS.md) and [CLAUDE.md](../CLAUDE.md) are corrected to stop naming `M3` as the next milestone.

---

## ADR-015: Initial production infrastructure baseline

**Status**: **Accepted (2026-08-16)** — stakeholder-confirmed.

**Context**: [ADR-008](#adr-008-dockerize-app-cms-and-database-for-both-dev-and-production) established that the app is Dockerized for both dev and production but left the actual hosting target open — tracked as decision `D12` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md), gating `M49`–`M59`. Order-notification channel (decision `D8`, same report) was also open, with no milestone scheduled.

**Decision**: The approved initial production infrastructure baseline is:

- **Cloudflare (Free plan)** — DNS and edge proxy in front of the app.
- **A single VPS at roughly $10–12/month** — runs the Dockerized Next.js/Payload app and PostgreSQL per [ADR-002](#adr-002-postgresql-as-the-only-datastore).
- **PostgreSQL** remains the only datastore, self-hosted on the VPS — no managed-database add-on at this stage.
- **Resend, free tier** — transactional email.
- **Cash on Delivery only** — no online payment gateway at launch, reaffirming [ADR-004](#adr-004-cash-on-delivery-only-for-launch-architecture-stays-payment-extensible).
- **SMS notifications are deferred to a future phase.** Not part of the initial launch scope.
- **Backups are managed manually** for the initial launch — no automated backup pipeline yet. `M54` remains the milestone that formalizes Postgres/media persistence and backup strategy.
- **Guiding principle**: this baseline must stay replaceable/upgradable (e.g. VPS → managed Postgres, Resend → another provider, adding SMS) without requiring an application rewrite. Nothing in the application layer should hard-couple to a specific host.

**Consequences**:

- Partially resolves `D12` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md) — the hosting target is decided; the production migration/CI mechanics (`M49`–`M59`) remain to be designed against it.
- Partially resolves `D8` — SMS is explicitly out of scope for now rather than an open question with "no milestone exists"; email channel infrastructure (Resend) is decided, though which order-lifecycle emails are actually sent is still unspecified in [PROJECT_SPEC.md](./PROJECT_SPEC.md).
- `M49`–`M54` (Docker production hardening, health checks, backups) should target this baseline rather than a generic or platform-agnostic one.
- No application code changes result from this ADR by itself — it is an infrastructure/hosting decision, not a code milestone.

---

## ADR-016: Reviews are out of scope for v1

**Status**: **Accepted (2026-08-16)** — stakeholder-confirmed, closing decision `D3` and contradiction `C4` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

**Context**: [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) had marked Reviews **Keep ✓ + Replace ✓ + Future Phase ✓** simultaneously, and [PROJECT_SPEC.md](./PROJECT_SPEC.md) carried it as open question #4: does ratings/reviews stay for v1, and with what non-account identity model, or is it dropped? Guest checkout ([ADR-005](#adr-005-guest-checkout-no-customer-accounts)) means there is no persistent identity to key a review on. `M46` was written as a "decide, then implement whichever outcome" milestone; this ADR supplies the decision it was waiting on.

**Decision**: Reviews are **out of scope for v1**. `M46` executes the removal path: delete `components/RatingModal.jsx` and its entry points, and strip the dummy star-rating display in `components/ProductCard.jsx`/`ProductDetails.jsx` (the data source itself is already removed at `M28`).

**Rationale**: An open submit form with no account behind it is a spam/abuse target that needs moderation labor a low-budget V1 cannot staff ([ADR-015](#adr-015-initial-production-infrastructure-baseline)). A brand-new single store also launches with zero reviews regardless — empty review UI reads as untrustworthy rather than building trust. Forgoing `AggregateRating` structured data is an acceptable cost: [ADR-013](#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy) and `M43` already scope JSON-LD to `Product` only.

**Consequences**:

- `M46`'s goal changes from "decide reviews v1 scope" to "remove review submission for v1" — the decision is no longer open at that milestone.
- [FEATURE_MATRIX.md](./FEATURE_MATRIX.md)'s Reviews row changes from **Keep + Replace + Future Phase** to **Remove (v1) + Future Phase**.
- Reversible without a schema fight: a `Reviews` collection keyed on order reference + phone (not a `User` relation) can be added post-launch with no change to `Products` or `Orders`.
- Closes `D3` and `C4` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md); the "No reviews" target row moves from **FAIL** (undecided) to met for v1.

---

## ADR-017: Coupons are out of scope for v1

**Status**: **Accepted (2026-08-16)** — stakeholder-confirmed, closing decision `D2` and contradiction `C3` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

**Context**: [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) marked Coupons **Keep ✓ + Replace ✓ + Future Phase ✓** simultaneously; [PROJECT_SPEC.md](./PROJECT_SPEC.md) carried it as open question #6. The inherited `Coupon` model's `forNewUser`/`forMember` targeting is meaningless under guest checkout ([ADR-005](#adr-005-guest-checkout-no-customer-accounts)) — there is no account to key "new user" or "member" off of, so only a flat code-based discount is even expressible.

**Decision**: Coupons are **out of scope for v1**. `M47` executes the removal path: remove the coupon-code input from `components/OrderSummary.jsx`. (The admin coupon page was already removed at `M19`, pending this redesign.)

**Rationale**: On a COD-only checkout ([ADR-004](#adr-004-cash-on-delivery-only-for-launch-architecture-stays-payment-extensible)) there is no payment capture step, so a leaked or guessed code is pure margin loss with no per-customer usage cap possible without accounts. Pakistani single-store promotions are typically run as direct price edits or bundle pricing, which the admin can already do through the `Products` collection without a coupon engine.

**Consequences**:

- `M47`'s goal changes from "decide coupons v1 scope" to "remove coupon input for v1."
- [FEATURE_MATRIX.md](./FEATURE_MATRIX.md)'s Coupons row changes from **Keep + Replace + Future Phase** to **Remove (v1) + Future Phase**.
- **Hedge taken now at negligible cost**: `M11`'s `Orders` collection gains a nullable `discountAmount` snapshot field even with no coupon engine behind it — avoids an `Orders` schema migration if a code-based `Coupons` collection is added later.
- Closes `D2` and `C3` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md); the "No coupons" target row moves from **FAIL** (undecided) to met for v1.

---

## ADR-018: Shipping model — flat rate with a free-shipping threshold, snapshotted per order

**Status**: **Accepted (2026-08-16)** — stakeholder-confirmed, closing decision `D4` and part of risk `R4` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

**Context**: [PROJECT_SPEC.md](./PROJECT_SPEC.md) open question #2 left the delivery/shipping model undefined — flat, free, weight-based, or city-based. `M11`/`M12` define no shipping or total fields at all, and `M34` ("apply confirmed shipping/total calculation rules") has nothing to apply. `R4` in the readiness report separately flags that `Orders` is missing order total, shipping cost, and a per-line price snapshot.

**Decision**: One nationwide **flat delivery fee**, waived above a **free-shipping threshold** — both admin-configurable via a new Payload **Settings global** (`M13a`), not hardcoded. Shipping amount, order total, and each line item's unit price are **snapshotted onto the `Order` at creation time** ("Place Order") and never recomputed from live `Settings`/`Products` afterward.

**Rejected alternatives**:

- **Weight-based** — requires per-product weight data entry and courier rate-card integration; more operational setup than a V1 admin can carry.
- **City-based** — requires a city→zone table and validated city input, but Pakistani addresses are commonly free-text and inconsistently spelled, so a lookup table would mis-charge routinely.
- **Free shipping outright** — COD return-to-origin costs are high in this market; an unconditional free-shipping policy turns every refused-at-door parcel into a pure loss with no offset.

**Consequences**:

- `M13a` (new milestone, Settings global) ships the admin-editable flat rate and threshold, plus store name/contact fields — also closes risk `R6` (no Settings global despite being launch scope).
- `M11` gains `orderTotal`, `shippingCost`, and a per-line price-snapshot field on line items — closing the shipping/total half of `R4`. The price-snapshot omission was the "quiet" failure mode `R4` warned about: without it, historical orders silently re-price when a product's price is later edited.
- `M33` (real order creation) and `M34` (shipping/total calculation) read `Settings` (`M13a`) at order-creation time only, then write the resolved numbers onto the `Order` — never a live join at render time.
- Closes `D4` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

---

## ADR-019: Order status set includes `CONFIRMED`, `CANCELLED`, and `RETURNED`

**Status**: **Accepted (2026-08-16)** — stakeholder-confirmed, closing decision `D5` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

**Context**: [PROJECT_SPEC.md](./PROJECT_SPEC.md) open question #3 asked whether the inherited `OrderStatus` enum (`ORDER_PLACED`, `PROCESSING`, `SHIPPED`, `DELIVERED`) is sufficient, and whether `CANCELLED`/`RETURNED` are needed for COD refusal-at-door — flagging that for COD in Pakistan, refusal-at-door is an ordinary outcome, not an edge case. `M12` (payment/status fields) and `M38` (admin status-update flow) both need a decided enum to build against.

**Decision**: The order status set is `PLACED` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED`, plus two terminal states, `CANCELLED` and `RETURNED`. It is a flat, extensible enum on `Orders` (`M12`) with no state-machine/transition-validation logic in v1 — the admin selects a status from a dropdown in Payload's native admin UI (`M38`).

**Rationale**:

- **`CONFIRMED` is the highest-value addition for this market.** Pakistani COD stores routinely phone-confirm an order before dispatch specifically to suppress fake and duplicate orders. Without a status expressing "order exists but is not yet dispatch-approved," there is no way to hold an order back from fulfillment while it's being verified.
- **`CANCELLED`** covers orders killed before dispatch (unreachable customer, fake order, changed mind).
- **`RETURNED`** covers orders that came back after dispatch (refused at the door, RTO, undeliverable) — operationally distinct from `CANCELLED` because courier cost was already incurred and stock must be restored.
- A validated state machine (e.g. forbidding `DELIVERED` → `PLACED`) is deliberately deferred as post-launch polish; a single admin manually selecting statuses does not need transition enforcement at V1's scale.

**Consequences**:

- `M12` builds `status` as this seven-value enum plus the existing `isPaid` boolean ([ADR-004](#adr-004-cash-on-delivery-only-for-launch-architecture-stays-payment-extensible)), flipped when cash is collected.
- `M38` confirms admins can move an order through this full set via Payload's native admin editing.
- Closes `D5` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

---

## ADR-020: Media storage backend is a local Docker volume for v1, with Cloudflare R2 as the designated successor

**Status**: **Accepted (2026-08-16)** — stakeholder-confirmed, closing decision `D6` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

**Context**: [ARCHITECTURE.md](./ARCHITECTURE.md) listed "object storage for product media (local volume vs. S3-compatible service)" as not yet decided, blocking `M8` (Media collection) and affecting `M54` (backup/persistence strategy). [ADR-015](#adr-015-initial-production-infrastructure-baseline) has since fixed the production baseline to a single VPS running one app container.

**Decision**: Product media is stored on a **local Docker volume** for v1, via Payload's local-storage adapter. **Cloudflare R2** is named as the designated successor if/when object storage is needed (free egress, free tier, already inside the [ADR-015](#adr-015-initial-production-infrastructure-baseline) stack).

**Rationale**: The one real argument for object storage — independent horizontal scaling of the app tier — is not live at V1 under the single-VPS/single-container baseline. A local volume avoids a second service, an egress bill, and an extra set of credentials. Cloudflare Free (already in front of the app) caches images at the edge, absorbing most read bandwidth regardless of origin storage. Migrating later is a config-level change: `@payloadcms/storage-s3` (R2-compatible) is a swap plus a one-time file copy, not a data-model change.

**Consequences**:

- `M8` (Media collection) uses Payload's local-storage adapter, backed by a named Docker volume.
- **Media now joins PostgreSQL in the manual-backup burden** ([ADR-015](#adr-015-initial-production-infrastructure-baseline)): `M54` must back up the media volume, not only the database, and its "persistent volumes" scope explicitly covers both.
- Migrating to R2 later requires no `Media` collection schema change — only a storage-adapter config swap and a one-time copy of existing files.
- Closes `D6` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

---

## ADR-021: Guest orders use embedded address fields, not a `Customers` collection

**Status**: **Accepted (2026-08-16)** — stakeholder-confirmed, formally recording an assumption `M11` already made silently (decision `D11` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md)).

**Context**: [ARCHITECTURE.md](./ARCHITECTURE.md) listed "exact `Orders` shape for guest customers: embedded address vs. relation to a lightweight `Customers` collection without auth" as not yet decided, while `M11`'s own text already assumed embedded fields without recording why. The readiness report's process note flags this as exactly the failure mode [CLAUDE.md](../CLAUDE.md) warns against — a decision that lives only in a milestone's prose, not in `DECISIONS.md`.

**Decision**: `Orders` (`M11`) store guest customer and address data as **embedded fields on the order itself** — name, phone, address, city, area — not as a relation to a separate `Customers` collection.

**Rationale**: Guest checkout ([ADR-005](#adr-005-guest-checkout-no-customer-accounts)) means there is no persistent identity for a `Customers` collection to key on, and no address-reuse feature (no login, no "saved addresses") for it to serve. An embedded snapshot is also the *correct* choice independent of convenience: it preserves historical accuracy — a customer who moves house after ordering must not retroactively rewrite a past delivery record.

**Consequences**:

- `M11` proceeds exactly as already drafted; this ADR removes the silent, unrecorded assumption rather than changing the design.
- No `Customers` collection is added to the `M6`–`M13` group.
- Closes `D11` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).
