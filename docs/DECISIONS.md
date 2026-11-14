# Decisions — Mirza (formerly GoCart Pakistan)

Architecture Decision Record log. Each entry: Context, Decision, Consequences. Newest at the bottom. Add a new entry rather than editing history — if a decision changes, record the change as a new Architecture Decision Record that supersedes the old one. A dated one-line status annotation on the older Architecture Decision Record that only points to the later Architecture Decision Record (no change to its decision text) is allowed and keeps readers from relying on a superseded decision.

> **Referencing convention**: Architecture Decision Records cite implementation work by **milestone ID** (Milestones 1 to 59, see [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)) — never by phase number. Phase/group names are labels for reporting only and carry no execution order.

---

## Architecture Decision Record 001: Adopt Payload CMS v3 as the backend and admin panel

**Status**: Accepted (stakeholder requirement)

**Context**: The inherited GoCart app has no real backend — a Prisma schema exists but isn't wired to a client, and there's no admin panel with access control.

**Decision**: Use Payload CMS v3 as the system of record for products, orders, and admin auth, replacing the unwired Prisma layer.

**Consequences**: `prisma/schema.prisma` is retired as a live schema (kept only as design reference, per Architecture Decision Record 003). All product/order data access goes through Payload's API/local API instead of a hand-rolled Next.js API layer.

---

## Architecture Decision Record 002: PostgreSQL as the only datastore

**Status**: Accepted (stakeholder requirement)

**Context**: The original Prisma schema already targeted PostgreSQL.

**Decision**: PostgreSQL remains the datastore, now accessed via Payload's `@payloadcms/db-postgres` adapter instead of Prisma directly.

**Consequences**: No dual-database or dual-ORM setup. Payload manages its own migrations.

---

## Architecture Decision Record 003: Retire the unwired Prisma schema in favor of Payload-managed collections

**Status**: **Accepted (2026-08-14)** — confirmed ahead of Milestone 4, the milestone that executes it. Supersedes the earlier `Proposed` status.

**Context**: `prisma/schema.prisma` models a multi-vendor marketplace (`User`, `Store`, `Product`, `Order`, `OrderItem`, `Rating`, `Address`, `Coupon`) and is not currently wired to any Prisma client dependency. Payload CMS v3 needs its own collection definitions and manages its own database schema/migrations.

**Evidence supporting acceptance** (all verified read-only, no code changed):

- `@prisma/client` and `prisma` are absent from `package.json` — confirmed in [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md) ("Dependencies") and by direct inspection of the manifest.
- No file in `app/`, `components/`, or `lib/` imports a Prisma client; there is no generated client and no `app/api/` layer that could consume one ([REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md), "Data flow" and "API routes").
- `DATABASE_URL`/`DIRECT_URL` are referenced only inside `schema.prisma` itself and are declared nowhere else, so no runtime path depends on them.
- [Architecture Decision Record 001](#architecture-decision-record-001-adopt-payload-cms-v3-as-the-backend-and-admin-panel) and [Architecture Decision Record 002](#architecture-decision-record-002-postgresql-as-the-only-datastore) are Accepted, making Payload's Postgres adapter the system of record; a second schema definition would be an unreferenced duplicate at best and a source of drift at worst.
- The schema encodes the multi-vendor domain that [Architecture Decision Record 006](#architecture-decision-record-006-single-store-no-vendors--admin-only-authentication-multi-vendor-marketplace-features-removed-from-scope) removed from scope, so it is not a candidate for direct carry-forward.

Because the layer was never live, retiring it cannot regress runtime behavior. That is the whole of the risk assessment, and it is why this Architecture Decision Record can be accepted on documentation evidence alone.

**Decision**: Treat the Prisma schema as historical reference for field/relationship intent only. Payload collections are the actual schema going forward. The file and directory are deleted by Milestone 4; until Milestone 4 runs, `prisma/schema.prisma` stays untouched on disk.

**Consequences**:

- No functionality is lost, since the Prisma layer was never live.
- Payload collection design (Milestones 9 to 12) should be checked against the retired schema for domain concepts worth keeping (e.g. `Coupon` shape, `Rating` uniqueness constraint) before it leaves the working tree.
- Milestone 4 also removes the now-meaningless `/app/generated/prisma` entry from `.gitignore`.
- Restoring the schema, if ever needed as reference, is a `git revert` of Milestone 4 — the history retains it permanently.

---

## Architecture Decision Record 004: Cash on Delivery only for launch, architecture stays payment-extensible

**Status**: Accepted (stakeholder requirement)

**Context**: Cash on delivery is the dominant and trusted payment method in Pakistani ecommerce; the existing `PaymentMethod` enum already includes `COD` and `STRIPE` as design intent.

**Decision**: Only cash on delivery is implemented and offered at checkout for v1. The `Orders` collection models `paymentMethod` and `isPaid` as first-class fields so additional gateways can be added later without restructuring orders.

**Consequences**: No payment gateway integration work happens now. Checkout user interface shows cash on delivery as the only option (not a disabled placeholder for others, to avoid confusing customers).

---

## Architecture Decision Record 005: Guest checkout, no customer accounts

**Status**: Accepted (stakeholder requirement)

**Context**: The original schema ties `Order`, `Address`, and `Rating` to a `User` account. Forcing account creation is friction that hurts conversion, especially on mobile.

**Decision**: Customers can place an order without registering or logging in. Order/address data is captured inline per order rather than requiring a persistent customer identity.

**Consequences**: Features that assumed a persistent `User` (order history by login, ratings tied to a user account, member-only coupons) need redesign or removal for v1 — tracked as an open question in `PROJECT_SPEC.md`.

---

## Architecture Decision Record 006: Single store, no vendors — admin-only authentication, multi-vendor marketplace features removed from scope

**Status**: Accepted (stakeholder decision, 2026-08-07) — supersedes the "Proposed" status of this Architecture Decision Record

**Context**: The inherited app is a multi-vendor marketplace: vendors register, get approved (`app/admin/approve`), and manage their own store (`app/store/*`, `Store` model with `userId` owner). This Architecture Decision Record was originally raised as an open question because "Admin login only" implied but didn't confirm a single-store model.

**Decision**: Explicitly confirmed by the stakeholder. This is a **single-store platform**:
- One store only — no per-vendor stores
- No vendors, no seller dashboard, no seller registration, no vendor approval flow
- **Admin Users only** — the sole authenticated role is the store admin, via Payload CMS's built-in auth
- Guest checkout only — no customer accounts either

**Consequences**: `app/store/*` (vendor dashboard), `app/admin/approve` and `app/admin/stores` (vendor approval/management), and the `Store` model's marketplace semantics (`status`, `isActive`, per-store ownership of products/orders) are **not carried forward** into the target product. `Products` and `Orders` in the Payload collection design (Milestones 10 and 11) belong to the platform directly — no store/vendor relation. This is a significant scope reduction from the current codebase, not just an auth change. No application code has been removed yet under this decision; removal of the legacy vendor/admin-approval routes and the `Store` model is future implementation work, executed by Milestones 14 to 17 and 19.

**This decision is closed.** Any documentation, plan, or agent output that describes multi-vendor vs. single-store as an open question is stale and should be corrected against this Architecture Decision Record rather than treated as a live question.

---

## Architecture Decision Record 007: search-engine-optimization-first and mobile-first are default requirements, not a later pass

**Status**: Accepted (stakeholder requirement)

**Context**: Ecommerce discovery in the target market is search- and mobile-heavy.

**Decision**: Every storefront page ships with proper metadata/structured data and is designed mobile-first from the start, rather than treating search engine optimization/responsiveness as post-launch cleanup.

**Consequences**: Search engine optimization and mobile review are part of the definition of done for the storefront Milestones 22 to 28, and are carried explicitly by Milestones 40 to 43 (server rendering, metadata, sitemap/robots, structured data) and Milestones 44 to 45 (mobile audit and performance) — not a separate deferred phase.

---

## Architecture Decision Record 008: Dockerize app, CMS, and database for both dev and production

**Status**: Accepted (stakeholder requirement)

**Context**: No containerization exists today; `next.config.mjs` has Vercel-oriented defaults (`images.unoptimized: true`) that don't suit a self-hosted deployment.

**Decision**: Provide a multi-stage `Dockerfile` for the app and a `docker-compose.yml` covering the app and PostgreSQL, usable for both local development and as the basis for production deployment.

**Consequences**: Production-specific config (secrets, health checks, image optimization loader) needs to be revisited away from the current Vercel-shaped defaults.

---

## Architecture Decision Record 009: Payload CMS runs embedded inside the Next.js application, not as a separate service

**Status**: **Accepted (2026-08-14)**

**Context**: [Architecture Decision Record 001](#architecture-decision-record-001-adopt-payload-cms-v3-as-the-backend-and-admin-panel) chose Payload CMS v3 but never fixed its deployment topology. [ARCHITECTURE.md](./ARCHITECTURE.md) recorded a *preference* for embedding and simultaneously listed the question under "Not yet decided", while Milestone 3 claimed to implement "the mounting decision in ARCHITECTURE.md" — a decision that did not exist. This Architecture Decision Record closes that gap. The topology determines the shape of Milestone 3 (mounting), Milestones 5 and 49 (Dockerfile targets), Milestone 50 (compose services), and Milestone 53 (health checks), so it must be settled before Milestone 1.

### Options considered

**Option A — Payload embedded in the Next.js application.** One codebase, one build, one container. Payload's admin user interface and REST/GraphQL endpoints mount as App Router routes; the storefront calls Payload's Local API in-process.

**Option B — Payload deployed as a separate service.** Two codebases/builds, two containers. The Next.js storefront talks to Payload over HTTP (REST/GraphQL) across a network boundary.

| Dimension | A — Embedded | B — Separate service | Favors |
|---|---|---|:---:|
| **Development complexity** | One `npm run dev`, one port, one env file, one place to set a breakpoint | Two processes to run and keep in sync locally; CORS and service-discovery config even in dev | **A** |
| **Deployment complexity** | One image, one deploy, one rollback unit; no inter-service version skew possible | Two images, ordered deploys, and a real risk of storefront/CMS version skew during rollout | **A** |
| **Operating cost** | One app container + Postgres | Two app containers + Postgres; roughly double the always-on compute for a single-store catalog | **A** |
| **Performance** | Server-rendered pages read through the Local API in-process — no HTTP hop, no serialization round-trip on the SSR path that search engine optimization depends on | Every SSR product/category render adds a network call; the search-engine-optimization-critical path is the one that pays for it | **A** |
| **Shared types** | Payload's generated types are imported directly by storefront code; a schema change surfaces as a compile error | Types must be published or duplicated across the boundary; drift is caught at runtime, if at all | **A** |
| **Database access** | Single process owns the Postgres connection pool | Two services, two pools, or an awkward rule that only one may touch the database | **A** |
| **Media handling** | One upload path and one storage mount to configure | Storage must be reachable and consistently configured from both services | **A** |
| **Authentication** | Payload's session/cookie auth is same-origin by construction — no cross-origin cookie work | Cross-origin auth between storefront origin and CMS origin; more moving parts on the only authenticated surface in the system | **A** |
| **Scaling** | Storefront and admin scale together; cannot scale read traffic independently of the admin panel | Independent scaling per service | **B** |
| **Monitoring** | One log stream, one health check, one error surface | Per-service observability, plus the inter-service call to instrument | **A** |
| **Maintenance** | One dependency tree and one upgrade cycle | Two of each, with a compatibility matrix between them | **A** |
| **Future evolution** | A later split is a refactor, but a tractable one: the Local API call sites become HTTP call sites behind the same `lib/payload/*` utilities (Milestone 22) | Already split; no future migration needed | **B** |
| **Suitability (single-store, Pakistan, cash on delivery)** | Matches the actual shape of the problem: one store, one admin, modest catalog, small team, cost-sensitive self-hosting | Solves a multi-team, multi-consumer scaling problem this project does not have | **A** |

### Decision

**Option A — Payload runs embedded inside the Next.js application.** Payload's admin user interface mounts at `/admin` and its REST/GraphQL API under `/api`, both as App Router routes in the existing app. Server-rendered storefront pages use Payload's Local API; no HTTP hop on the SSR path.

### Decision rationale

Option A wins eleven of thirteen dimensions, and the two it loses are not live constraints for this project. **Independent scaling** presupposes admin traffic that competes with storefront traffic — for a single store with one admin user, it does not. **Future evolution** is a real cost of A, but a bounded one: because all Payload access is funnelled through the `lib/payload/*` utilities introduced at Milestone 22, converting Local API calls to HTTP calls later is a change to those modules rather than to every consumer.

The decisive factors are performance on the search-engine-optimization-critical path and the absence of a distributed-systems failure mode. [Architecture Decision Record 007](#architecture-decision-record-007-search-engine-optimization-first-and-mobile-first-are-default-requirements-not-a-later-pass) makes server-rendered product and category pages non-negotiable; Option B taxes exactly those renders with a network call, and adds a class of failure (CMS unreachable → storefront degraded) that Option A cannot produce. A separate service would be buying multi-team scaling properties at the cost of latency, spend, and operational surface, for a platform that has neither multiple teams nor multiple consumers.

### Consequences

- **Payload owns the `/admin` route.** The inherited hand-built admin at `app/admin/*` must be removed *before* Payload mounts, or the two collide as parallel routes resolving the same path. This is why Milestones 16 and 17, and Milestone 19 are sequenced ahead of Milestone 3 — see the execution order in [MIGRATION_PLAN.md](./MIGRATION_PLAN.md).
- Milestone 3 mounts Payload in-app (`app/(payload)/admin/...`, `app/(payload)/api/...`) and wraps `next.config.mjs` with Payload's Next.js integration.
- One `Dockerfile` and one app service in compose (Milestones 5, 49 and 50) — not two.
- The app container needs enough memory for both the storefront and the admin bundle; sizing is a Milestones 50 and 53 concern.
- Storefront and admin share a deploy and a restart. A CMS upgrade is a full-app deploy.
- Horizontal scaling remains available (the Next.js app is stateless), but it interacts with the still-open media-storage question: a local-volume media backend constrains multi-instance deployment in a way object storage does not. Tracked as a blocking decision before Milestone 6.
- Payload's generated types become importable across the app once TypeScript is established at Milestone 2a.

---

## Architecture Decision Record 010: The PostgreSQL connection string is named `DATABASE_URI`

**Status**: **Accepted (2026-08-14)** — decided while executing Milestone 1, the milestone that first declares the variable.

**Context**: Milestone 1 originally specified adding `DATABASE_URL` to `.env.example`. That name is inherited from `prisma/schema.prisma:8` (`url = env("DATABASE_URL")`) — a layer that was never wired up and is retired by Milestone 4 per [Architecture Decision Record 003](#architecture-decision-record-003-retire-the-unwired-prisma-schema-in-favor-of-payload-managed-collections). Payload v3's Postgres adapter (`@payloadcms/db-postgres`), which [Architecture Decision Record 002](#architecture-decision-record-002-postgresql-as-the-only-datastore) makes the sole database access path, conventionally reads **`DATABASE_URI`** — that is the name its own project template, documentation, and generated configuration use. Carrying the Prisma-era name forward would leave the repository permanently off-convention against the only data layer it has. [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md) flagged the mismatch as risk `R10` and required it be confirmed rather than discovered at Milestone 3's first connection failure.

**Decision**: The PostgreSQL connection string is `DATABASE_URI`, everywhere, in every environment. `DATABASE_URL` is **not** declared, aliased, or supported as a fallback — a second name for one value is drift waiting to happen, and there is no consumer of the old name to be compatible with (nothing has ever read it at runtime).

**Consequences**:

- Milestone 1 declares `DATABASE_URI` in `.env.example`; Milestone 3 reads it in `payload.config.ts`; Milestones 50 and 52 supply it to containers. One name, one value, one path.
- Risk `R10`'s database-variable half is closed. Its second half — an absolute public base URL (e.g. `NEXT_PUBLIC_SERVER_URL`) needed by Milestone 42 — is untouched by this Architecture Decision Record and remains open against Milestones 42 and 52.
- Prior documentation that names `DATABASE_URL` as a thing to add is superseded by this Architecture Decision Record. Milestones 1 and 52 in [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) were corrected as part of Milestone 1. [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md)'s references stay as written: they are a point-in-time audit of what the Prisma schema declared, and correctly anticipated replacement "with Payload's own database connection variable."
- The variable is not consumed by any code yet — nothing reads it until Milestone 3. Milestone 1 ships it as configuration the developer sets up front, matching the credentials `docker-compose.yml` starts Postgres with.

---

## Architecture Decision Record 011: Payload v3 dependency set — exact pins, a raised Next.js floor, and patched `sharp`

**Status**: **Accepted (2026-08-14)** — decided while executing Milestone 2, the milestone that installs the stack.

**Context**: Milestone 2 installs Payload v3 into an app already running Next.js 15.3.5. The milestone text delegates the specifics — *"Confirm the exact set and versions against the Payload v3 release being installed"* — and three non-obvious choices surfaced during execution:

1. **The install cannot proceed as-is.** `@payloadcms/next@3.88.0` peer-depends on `next` at `">=15.2.9 <15.3.0 || >=15.3.9 <15.4.0 || >=15.4.11 <15.5.0 || >=16.2.6 <17.0.0"`. Next 15.3.5 falls in the gap between the first two ranges and satisfies none of them; `npm install` fails with `ERESOLVE`. The ranges encode Next security-patch floors.
2. **The `@payloadcms/*` packages cross-peer on an exact `payload` version**, and a Payload `4.0.0-canary` line already exists on npm, so an unpinned install could silently land on v4 and violate [Architecture Decision Record 001](#architecture-decision-record-001-adopt-payload-cms-v3-as-the-backend-and-admin-panel).
3. **`sharp` 0.34.x carries a HIGH advisory** — inherited libvips CVE-2026-33327/33328/35590/35591 — fixed in 0.35.0. Pinning 0.34.x would have deduplicated with the copy Next declares as an optional dependency (one fewer native binary set on disk); pinning 0.35.x patches the vulnerability but leaves Next's own nested 0.34.5 copy in the tree.

**Decision**:

- **`next` is pinned to exactly `15.3.9`** — the lowest version satisfying Payload's peer range, a patch-level move inside the same minor. Working around the conflict with `--legacy-peer-deps` or `--force` was **rejected**: the range encodes security floors, and bypassing it installs a combination Payload does not support.
- **`payload`, `@payloadcms/db-postgres`, `@payloadcms/next`, and `@payloadcms/richtext-lexical` are pinned to exactly `3.88.0`** and are always upgraded as a set.
- **`@payloadcms/richtext-lexical` is the editor** — Payload v3's own default; `richtext-slate` is the legacy option.
- **`sharp` is `^0.35.3`, not `^0.34.1`.** Security outranks the duplicate-binary saving. The Milestone 2 brief had specified `^0.34.1` for deduplication before the advisory was known; that trade inverted once it was.
- `graphql` is `^16.14.2`, satisfying the `^16.8.1` peer.

**Consequences**:

- **(Resolved by [Architecture Decision Record 037](#architecture-decision-record-037-nextjs-1638--closing-the-framework-advisories-milestone-52c), 2026-10-11: Next 16.3.8.)** **Next 15.3.9 is not advisory-free, and cannot be made so inside Payload's supported range.** Payload's peer range excludes the entire `15.5.x` line, which is where most published Next fixes landed; the only fully patched compatible line is **Next 16.2.6+**, a major upgrade with its own breaking-change surface. This is deliberately out of Milestone 2's scope and **must be decided before production** — it belongs with the hardening milestones (Milestones 49 to 54) and the launch gate (Milestone 59). No milestone owns it today.
- **A nested `sharp@0.34.5` remains under `next`** (Next declares `sharp` as an optional dependency at `^0.34.1`). It is reachable only through Next's image optimizer, which is **disabled today** by `images.unoptimized: true`. **Milestone 51, which re-enables the optimizer, must resolve that nested copy first** — by upgrading Next or by adding an npm `overrides` entry. An override was not added at Milestone 2: forcing Next onto a `sharp` major it does not declare is an untested combination, and there is no benefit while the optimizer is off.
- Audit posture moved from **3 advisories (1 critical, 2 high)** before Milestone 2 to **10 (3 high, 6 moderate, 1 low)** after. The critical was eliminated by the Next bump. The seven additions come from Payload's own tree — `drizzle-kit → esbuild` (dev-server advisory) and `monaco-editor → dompurify` (admin-panel editor) — and are upstream-owned, not fixable by application-level version choices.
- Any future Payload upgrade must re-check the `next` peer range before it is attempted; the two are coupled from here on.

---

## Architecture Decision Record 012: TypeScript pinned to the 5.x line, not the `latest` tag

**Status**: **Accepted (2026-08-14)** — decided while executing Milestone 2a, the milestone that installs the toolchain.

**Context**: Milestone 2a installs `typescript` as a `devDependency` ahead of every `.ts`-authoring milestone from Milestone 3 onward. At execution time, npm's `latest` tag for `typescript` pointed to **`7.0.2`** — a native (Go-ported) compiler rewrite that had only just superseded a `6.x` line consisting of two releases. `next@15.3.9` (installed at [Architecture Decision Record 011](#architecture-decision-record-011-payload-v3-dependency-set--exact-pins-a-raised-nextjs-floor-and-patched-sharp)) itself declares a `typescript` **`devDependency` of `5.8.2`** — i.e., what Next.js's own tooling, including its automatic `tsconfig.json` setup and type-checking pass, is built and tested against. Payload v3's project templates likewise target the `5.x` line. Milestone 2a's own text anticipates exactly this kind of check: *"Confirm the TypeScript version satisfies both Next 15 and the Payload v3 release installed at Milestone 2."*

**Decision**: Install `typescript@^5.9.3` — the latest release on the mature `5.x` line — not the `latest` dist-tag. Stakeholder-confirmed.

**Consequences**:

- The toolchain matches what Next 15.3.9 and Payload v3's own tooling are validated against, rather than adopting a same-day major rewrite with materially less real-world mileage against this exact combination.
- This is a deliberate divergence from "always take `@latest`." Revisit once TypeScript 7's ecosystem (editor integrations, Next.js's own internal upgrade, Payload's build pipeline) has matured — not on this migration's critical path.
- `@types/node` is pinned to `^22.20.1` to match the actual Node.js runtime (`v22.19.0`), not the `@types/node` `latest` tag (which resolved to `26.x`, describing APIs absent from this runtime). `@types/react`/`@types/react-dom` are left at their resolved `^19.x` versions — those track the installed `react`/`react-dom` major directly, so no separate pin decision was needed.

---

## Architecture Decision Record 013: Category browsing ships in Phase 1 as dedicated slug routes with a two-level hierarchy

**Status**: **Accepted (2026-08-16)** — stakeholder-confirmed. Closes readiness finding **C8**.

> **Superseded in part (annotation added 2026-11-03):** the two-level hierarchy below is superseded by [Architecture Decision Record 048](#architecture-decision-record-048-categories-are-flat-one-level-no-sub-categories-milestone-102) (flat categories, Milestone 102). Dedicated slug routes, server rendering and the rejection of `/shop?category=` stand; the faceted-filtering deferral was later narrowed by [Architecture Decision Record 042](#architecture-decision-record-042-category-sort-and-filter-and-cart-undo-milestone-92) (category sort, price and discount filters). Text below is unchanged history.

**Context**: The target product is a multi-category, multi-product storefront, but customer-facing category browsing exists neither in the codebase nor in the plan. Verified read-only:

- **No `/categories` route and no `/category/[slug]` route exist.** Categories appear only as a hardcoded six-item array in `assets/assets.js`, a second conflicting ten-item array in the vendor add-product form (itself scheduled for deletion at Milestone 14), a free-text `category` string on each dummy product, unlinked breadcrumb text on the product page, and `components/CategoriesMarquee.jsx`, which renders bare `<button>`s with no `onClick` and no `href`.
- **`prisma/schema.prisma` has no `Category` model at all** — `category` is a plain required `String` on `Product`, with no slug, no relation, and no hierarchy. There is nothing to carry forward.
- **No milestone in Milestones 1 to 59 created a category route**, while four assumed one existed: Milestone 27's acceptance test asserted *"clicking one filters/links correctly"*, Milestone 41 added metadata to *"product, category/shop, and home pages"*, Milestone 42 generated a sitemap listing *"real seeded products/categories"*, and [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) justified the `Categories` collection by *"search-engine-optimization-friendly category pages"*.
- **Milestone 9 specified no fields whatsoever** — one sentence, no `slug`, no `parent`, no ordering, no search engine optimization fields.

[PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md) recorded this as contradiction **C8** (HIGH, blocking Milestones 27, 41 and 42): *"Categories are modeled, seeded, marqueed, and sitemapped — but never browsable."* Its correction #14 prescribed inserting the missing milestone using decimal IDs.

A second ambiguity compounded it: [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) marks **Filters** as Future Phase and [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)'s scope note excludes them from the plan. Read literally, that defers "category filtering" — and with it, plausibly, category browsing itself.

### Decision

**Category browsing is Phase 1 launch scope**, delivered as two dedicated server-rendered routes:

| Route | Milestone |
|---|:---:|
| `/categories` — landing index of all top-level categories with their children | **Milestone 27b** |
| `/category/[slug]` — category detail and paginated product listing | **Milestone 27a** |

Four sub-decisions, each of which was a genuine fork:

1. **Dedicated slug routes, not shop query-param filtering.** `/category/[slug]` is the single canonical products-by-category URL. **`/shop?category=` is not introduced.** Two URLs returning one result set split ranking signals between them — a duplicate-content problem, not a feature. `/shop` keeps its existing role: all products plus name-based search.
2. **Exactly two levels — parent → child.** A `parent` self-relation on `Categories`, with validation rejecting a third level. Category URLs are **flat** (`/category/phone-cases`, never `/category/accessories/phone-cases`) and slugs are unique across the whole collection.
3. **Parent pages roll up descendants.** A parent lists products assigned to itself *plus* every child. Resolved once in `getProductsByCategory()` (Milestone 22), not per route.
4. **Page-number pagination** — `?page=N`, 24 per page, server-rendered, with canonical and `rel=prev`/`next` links.

**Rejected alternatives**:

- **`/shop?category=` filtering** — cheapest to build, but produces the duplicate-content split above, gives category-intent search nothing distinct to rank, and blurs the Filters boundary that this Architecture Decision Record exists partly to draw.
- **Arbitrary-depth nesting** — more admin flexibility, at the cost of recursive descendant queries, recursive breadcrumbs, and a cycle guard. The `parent` self-relation already models it, so relaxing the depth validation later needs no data migration. Two levels is a bound, not a ceiling.
- **Directly-assigned products only on parent pages** — a simpler query that renders parent pages empty whenever admins file products under children, which is exactly what admins do. The single most common way category navigation looks broken.
- **Infinite scroll / load-more** — better mobile feel, but products past page 1 are invisible to crawlers unless a parallel paginated path is maintained anyway. Direct conflict with [Architecture Decision Record 007](#architecture-decision-record-007-search-engine-optimization-first-and-mobile-first-are-default-requirements-not-a-later-pass).

Full behavior specification: [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md).

**Consequences**:

- **Milestone 9 gains a real field list** — `title`, `slug` (unique, indexed, generated-then-stable), `parent` (self-relation, `hasMany: false`), `description`, `image`, search engine optimization overrides, `displayOrder` — plus the two-level constraint and slug uniqueness in its acceptance tests. It also gains a dependency on Milestone 8, since the `image` field targets the Media collection.
- **Milestone 10 fixes `Products.category` cardinality** at `hasMany: false` — one product, one most-specific category.
- **Milestone 22 owns the rollup.** `getTopLevelCategories()`, `getCategoryBySlug()`, and `getProductsByCategory()` are shared utilities so the routes and the sitemap cannot disagree about a category's contents.
- **Milestone 27's false acceptance test is corrected.** The marquee stays inert at Milestone 27 (preserving today's behavior, so no dead-link window opens) and becomes links at Milestone 27a.
- **Milestones 41 and 42, and Milestone 44 gain Milestones 27a and 27b dependencies.** Milestone 42's sitemap in particular could not previously have listed the category URLs its own goal describes.
- **Slugs are stable by policy.** Renaming a category does not regenerate its slug; an admin changes one deliberately or not at all. Re-parenting never changes a URL, because URLs are flat.
- **Category browsing requires no authentication**, consistent with [Architecture Decision Record 005](#architecture-decision-record-005-guest-checkout-no-customer-accounts) and [Architecture Decision Record 006](#architecture-decision-record-006-single-store-no-vendors--admin-only-authentication-multi-vendor-marketplace-features-removed-from-scope).
- **Faceted filtering stays Future Phase** — price, brand, rating, in-stock, sort, multi-facet. This Architecture Decision Record draws the boundary; it does not move it.
- **JSON-LD on category pages is not Phase 1.** Milestone 43 stays scoped to `Product` on product detail pages.
- One of the Milestone 6 gate's collection-design inputs is now settled: the `Categories` shape no longer blocks the start of data modeling.

---

## Architecture Decision Record 014: Milestone 14 is a hard prerequisite of Milestone 3, not an order-independent milestone

**Status**: **Accepted (2026-08-16)** — discovered during Milestone 3 analysis, stakeholder-confirmed.

**Context**: [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) previously classified Milestone 14 (delete `app/store/**`, the vendor dashboard) as having no dependencies and landing "at any point," grouped with Milestones 15 and 18 for narrative reasons only, distinct from Milestones 16, 17 and 19's hard `app/admin/**` route-collision precondition. Analysis of Milestone 3 (scaffolding and mounting Payload inside the Next.js app) found a second precondition: mounting Payload's admin user interface requires restructuring the app into Next.js's **multiple root layouts** pattern — each top-level route group (`(public)`, `(payload)`) defining its own root layout. `app/store/**`, the directory Milestone 14 deletes, sits outside any route group and collides with that restructuring if it is still present when Milestone 3 lands, independent of and in addition to the `app/admin/**` collision already tracked for Milestones 16, 17 and 19.

**Decision**: Milestone 14 is promoted from "order-independent" to a **hard prerequisite of Milestone 3**. Milestone 3 must not be implemented before Milestone 14. Milestone 14 itself still has no prerequisites of its own and can land at any time before Milestone 3.

**Consequences**:

- [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)'s execution-order exception list, critical-path diagram, Milestone 3's `Dependencies` line, and the "Group: Remove the multi-vendor surface" ordering note are updated to include Milestone 14 alongside Milestones 16, 17 and 19.
- Milestones 15 and 18 are unaffected — they remain genuinely order-independent.
- With Milestones 1, 2, 2a, 16 and 17, and Milestone 19 already **Done**, Milestone 14 — not Milestone 3 — is the next milestone to execute.
- [TASKS.md](./TASKS.md) and [CLAUDE.md](../CLAUDE.md) are corrected to stop naming Milestone 3 as the next milestone.

---

## Architecture Decision Record 015: Initial production infrastructure baseline

**Status**: **Accepted (2026-08-16)** — stakeholder-confirmed.

**Context**: [Architecture Decision Record 008](#architecture-decision-record-008-dockerize-app-cms-and-database-for-both-dev-and-production) established that the app is Dockerized for both dev and production but left the actual hosting target open — tracked as decision `D12` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md), gating Milestones 49 to 59. Order-notification channel (decision `D8`, same report) was also open, with no milestone scheduled.

**Decision**: The approved initial production infrastructure baseline is:

- **Cloudflare (Free plan)** — DNS and edge proxy in front of the app.
- **A single virtual private server at roughly $10–12/month** — runs the Dockerized Next.js/Payload app and PostgreSQL per [Architecture Decision Record 002](#architecture-decision-record-002-postgresql-as-the-only-datastore).
- **PostgreSQL** remains the only datastore, self-hosted on the virtual private server — no managed-database add-on at this stage.
- **Resend, free tier** — transactional email.
- **Cash on Delivery only** — no online payment gateway at launch, reaffirming [Architecture Decision Record 004](#architecture-decision-record-004-cash-on-delivery-only-for-launch-architecture-stays-payment-extensible).
- **SMS notifications are deferred to a future phase.** Not part of the initial launch scope.
- **Backups are managed manually** for the initial launch — no automated backup pipeline yet. Milestone 54 remains the milestone that formalizes Postgres/media persistence and backup strategy.
- **Guiding principle**: this baseline must stay replaceable/upgradable (e.g. virtual private server → managed Postgres, Resend → another provider, adding SMS) without requiring an application rewrite. Nothing in the application layer should hard-couple to a specific host.

**Consequences**:

- Partially resolves `D12` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md) — the hosting target is decided; the production migration and continuous integration mechanics (Milestones 49 to 59) remain to be designed against it.
- Partially resolves `D8` — SMS is explicitly out of scope for now rather than an open question with "no milestone exists"; email channel infrastructure (Resend) is decided, though which order-lifecycle emails are actually sent is still unspecified in [PROJECT_SPEC.md](./PROJECT_SPEC.md).
- Milestones 49 to 54 (Docker production hardening, health checks, backups) should target this baseline rather than a generic or platform-agnostic one.
- No application code changes result from this Architecture Decision Record by itself — it is an infrastructure/hosting decision, not a code milestone.

---

## Architecture Decision Record 016: Reviews are out of scope for v1

**Status**: **Accepted (2026-08-16)** — stakeholder-confirmed, closing decision `D3` and contradiction `C4` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

**Context**: [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) had marked Reviews **Keep ✓ + Replace ✓ + Future Phase ✓** simultaneously, and [PROJECT_SPEC.md](./PROJECT_SPEC.md) carried it as open question #4: does ratings/reviews stay for v1, and with what non-account identity model, or is it dropped? Guest checkout ([Architecture Decision Record 005](#architecture-decision-record-005-guest-checkout-no-customer-accounts)) means there is no persistent identity to key a review on. Milestone 46 was written as a "decide, then implement whichever outcome" milestone; this Architecture Decision Record supplies the decision it was waiting on.

**Decision**: Reviews are **out of scope for v1**. Milestone 46 executes the removal path: delete `components/RatingModal.jsx` and its entry points, and strip the dummy star-rating display in `components/ProductCard.jsx`/`ProductDetails.jsx` (the data source itself is already removed at Milestone 28).

**Rationale**: An open submit form with no account behind it is a spam/abuse target that needs moderation labor a low-budget V1 cannot staff ([Architecture Decision Record 015](#architecture-decision-record-015-initial-production-infrastructure-baseline)). A brand-new single store also launches with zero reviews regardless — empty review user interface reads as untrustworthy rather than building trust. Forgoing `AggregateRating` structured data is an acceptable cost: [Architecture Decision Record 013](#architecture-decision-record-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy) and Milestone 43 already scope JSON-LD to `Product` only.

**Consequences**:

- Milestone 46's goal changes from "decide reviews v1 scope" to "remove review submission for v1" — the decision is no longer open at that milestone.
- [FEATURE_MATRIX.md](./FEATURE_MATRIX.md)'s Reviews row changes from **Keep + Replace + Future Phase** to **Remove (v1) + Future Phase**.
- Reversible without a schema fight: a `Reviews` collection keyed on order reference + phone (not a `User` relation) can be added post-launch with no change to `Products` or `Orders`.
- Closes `D3` and `C4` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md); the "No reviews" target row moves from **FAIL** (undecided) to met for v1.

---

## Architecture Decision Record 017: Coupons are out of scope for v1

**Status**: **Accepted (2026-08-16)** — stakeholder-confirmed, closing decision `D2` and contradiction `C3` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

**Context**: [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) marked Coupons **Keep ✓ + Replace ✓ + Future Phase ✓** simultaneously; [PROJECT_SPEC.md](./PROJECT_SPEC.md) carried it as open question #6. The inherited `Coupon` model's `forNewUser`/`forMember` targeting is meaningless under guest checkout ([Architecture Decision Record 005](#architecture-decision-record-005-guest-checkout-no-customer-accounts)) — there is no account to key "new user" or "member" off of, so only a flat code-based discount is even expressible.

**Decision**: Coupons are **out of scope for v1**. Milestone 47 executes the removal path: remove the coupon-code input from `components/OrderSummary.jsx`. (The admin coupon page was already removed at Milestone 19, pending this redesign.)

**Rationale**: On a cash-on-delivery-only checkout ([Architecture Decision Record 004](#architecture-decision-record-004-cash-on-delivery-only-for-launch-architecture-stays-payment-extensible)) there is no payment capture step, so a leaked or guessed code is pure margin loss with no per-customer usage cap possible without accounts. Pakistani single-store promotions are typically run as direct price edits or bundle pricing, which the admin can already do through the `Products` collection without a coupon engine.

**Consequences**:

- Milestone 47's goal changes from "decide coupons v1 scope" to "remove coupon input for v1."
- [FEATURE_MATRIX.md](./FEATURE_MATRIX.md)'s Coupons row changes from **Keep + Replace + Future Phase** to **Remove (v1) + Future Phase**.
- **Hedge taken now at negligible cost**: Milestone 11's `Orders` collection gains a nullable `discountAmount` snapshot field even with no coupon engine behind it — avoids an `Orders` schema migration if a code-based `Coupons` collection is added later.
- Closes `D2` and `C3` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md); the "No coupons" target row moves from **FAIL** (undecided) to met for v1.

---

## Architecture Decision Record 018: Shipping model — flat rate with a free-shipping threshold, snapshotted per order

**Status**: **Accepted (2026-08-16)** — stakeholder-confirmed, closing decision `D4` and part of risk `R4` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

**Context**: [PROJECT_SPEC.md](./PROJECT_SPEC.md) open question #2 left the delivery/shipping model undefined — flat, free, weight-based, or city-based. Milestones 11 and 12 define no shipping or total fields at all, and Milestone 34 ("apply confirmed shipping/total calculation rules") has nothing to apply. `R4` in the readiness report separately flags that `Orders` is missing order total, shipping cost, and a per-line price snapshot.

**Decision**: One nationwide **flat delivery fee**, waived above a **free-shipping threshold** — both admin-configurable via a new Payload **Settings global** (Milestone 13a), not hardcoded. Shipping amount, order total, and each line item's unit price are **snapshotted onto the `Order` at creation time** ("Place Order") and never recomputed from live `Settings`/`Products` afterward.

**Rejected alternatives**:

- **Weight-based** — requires per-product weight data entry and courier rate-card integration; more operational setup than a V1 admin can carry.
- **City-based** — requires a city→zone table and validated city input, but Pakistani addresses are commonly free-text and inconsistently spelled, so a lookup table would mis-charge routinely.
- **Free shipping outright** — cash on delivery return-to-origin costs are high in this market; an unconditional free-shipping policy turns every refused-at-door parcel into a pure loss with no offset.

**Consequences**:

- Milestone 13a (new milestone, Settings global) ships the admin-editable flat rate and threshold, plus store name/contact fields — also closes risk `R6` (no Settings global despite being launch scope).
- Milestone 11 gains `orderTotal`, `shippingCost`, and a per-line price-snapshot field on line items — closing the shipping/total half of `R4`. The price-snapshot omission was the "quiet" failure mode `R4` warned about: without it, historical orders silently re-price when a product's price is later edited.
- Milestone 33 (real order creation) and Milestone 34 (shipping/total calculation) read `Settings` (Milestone 13a) at order-creation time only, then write the resolved numbers onto the `Order` — never a live join at render time.
- Closes `D4` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

---

## Architecture Decision Record 019: Order status set includes `CONFIRMED`, `CANCELLED`, and `RETURNED`

**Status**: **Accepted (2026-08-16)** — stakeholder-confirmed, closing decision `D5` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

**Context**: [PROJECT_SPEC.md](./PROJECT_SPEC.md) open question #3 asked whether the inherited `OrderStatus` enum (`ORDER_PLACED`, `PROCESSING`, `SHIPPED`, `DELIVERED`) is sufficient, and whether `CANCELLED`/`RETURNED` are needed for cash on delivery refusal-at-door — flagging that for cash on delivery in Pakistan, refusal-at-door is an ordinary outcome, not an edge case. Milestone 12 (payment/status fields) and Milestone 38 (admin status-update flow) both need a decided enum to build against.

**Decision**: The order status set is `PLACED` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED`, plus two terminal states, `CANCELLED` and `RETURNED`. It is a flat, extensible enum on `Orders` (Milestone 12) with no state-machine/transition-validation logic in v1 — the admin selects a status from a dropdown in Payload's native admin user interface (Milestone 38).

**Rationale**:

- **`CONFIRMED` is the highest-value addition for this market.** Pakistani cash on delivery stores routinely phone-confirm an order before dispatch specifically to suppress fake and duplicate orders. Without a status expressing "order exists but is not yet dispatch-approved," there is no way to hold an order back from fulfillment while it's being verified.
- **`CANCELLED`** covers orders killed before dispatch (unreachable customer, fake order, changed mind).
- **`RETURNED`** covers orders that came back after dispatch (refused at the door, RTO, undeliverable) — operationally distinct from `CANCELLED` because courier cost was already incurred and stock must be restored.
- A validated state machine (e.g. forbidding `DELIVERED` → `PLACED`) is deliberately deferred as post-launch polish; a single admin manually selecting statuses does not need transition enforcement at V1's scale.

**Consequences**:

- Milestone 12 builds `status` as this seven-value enum plus the existing `isPaid` boolean ([Architecture Decision Record 004](#architecture-decision-record-004-cash-on-delivery-only-for-launch-architecture-stays-payment-extensible)), flipped when cash is collected.
- Milestone 38 confirms admins can move an order through this full set via Payload's native admin editing.
- Closes `D5` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

---

## Architecture Decision Record 020: Media storage backend is a local Docker volume for v1, with Cloudflare R2 as the designated successor

**Status**: **Accepted (2026-08-16)** — stakeholder-confirmed, closing decision `D6` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

**Context**: [ARCHITECTURE.md](./ARCHITECTURE.md) listed "object storage for product media (local volume vs. S3-compatible service)" as not yet decided, blocking Milestone 8 (Media collection) and affecting Milestone 54 (backup/persistence strategy). [Architecture Decision Record 015](#architecture-decision-record-015-initial-production-infrastructure-baseline) has since fixed the production baseline to a single virtual private server running one app container.

**Decision**: Product media is stored on a **local Docker volume** for v1, via Payload's local-storage adapter. **Cloudflare R2** is named as the designated successor if/when object storage is needed (free egress, free tier, already inside the [Architecture Decision Record 015](#architecture-decision-record-015-initial-production-infrastructure-baseline) stack).

**Rationale**: The one real argument for object storage — independent horizontal scaling of the app tier — is not live at V1 under the single-VPS/single-container baseline. A local volume avoids a second service, an egress bill, and an extra set of credentials. Cloudflare Free (already in front of the app) caches images at the edge, absorbing most read bandwidth regardless of origin storage. Migrating later is a config-level change: `@payloadcms/storage-s3` (R2-compatible) is a swap plus a one-time file copy, not a data-model change.

**Consequences**:

- Milestone 8 (Media collection) uses Payload's local-storage adapter, backed by a named Docker volume.
- **Media now joins PostgreSQL in the manual-backup burden** ([Architecture Decision Record 015](#architecture-decision-record-015-initial-production-infrastructure-baseline)): Milestone 54 must back up the media volume, not only the database, and its "persistent volumes" scope explicitly covers both.
- Migrating to R2 later requires no `Media` collection schema change — only a storage-adapter config swap and a one-time copy of existing files.
- Closes `D6` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

---

## Architecture Decision Record 021: Guest orders use embedded address fields, not a `Customers` collection

**Status**: **Accepted (2026-08-16)** — stakeholder-confirmed, formally recording an assumption Milestone 11 already made silently (decision `D11` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md)).

**Context**: [ARCHITECTURE.md](./ARCHITECTURE.md) listed "exact `Orders` shape for guest customers: embedded address vs. relation to a lightweight `Customers` collection without auth" as not yet decided, while Milestone 11's own text already assumed embedded fields without recording why. The readiness report's process note flags this as exactly the failure mode [CLAUDE.md](../CLAUDE.md) warns against — a decision that lives only in a milestone's prose, not in `DECISIONS.md`.

**Decision**: `Orders` (Milestone 11) store guest customer and address data as **embedded fields on the order itself** — name, phone, address, city, area — not as a relation to a separate `Customers` collection.

**Rationale**: Guest checkout ([Architecture Decision Record 005](#architecture-decision-record-005-guest-checkout-no-customer-accounts)) means there is no persistent identity for a `Customers` collection to key on, and no address-reuse feature (no login, no "saved addresses") for it to serve. An embedded snapshot is also the *correct* choice independent of convenience: it preserves historical accuracy — a customer who moves house after ordering must not retroactively rewrite a past delivery record.

**Consequences**:

- Milestone 11 proceeds exactly as already drafted; this Architecture Decision Record removes the silent, unrecorded assumption rather than changing the design.
- No `Customers` collection is added to the Milestones 6 to 13 group.
- Closes `D11` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

---

## Architecture Decision Record 022: "Best Selling" is an admin-curated flag, not a computed ranking

**Status**: **Accepted (2026-08-17)** — stakeholder-confirmed while executing Milestone 23.

**Context**: The home page has a "Best Selling" section (`components/BestSelling.jsx`). Against the dummy dataset it ranked products by **review count** (`b.rating.length - a.rating.length`). Wiring it to real Payload data at Milestone 23 exposed that this ranking has no basis in the actual system:

- **Reviews do not exist.** [Architecture Decision Record 016](#architecture-decision-record-016-reviews-are-out-of-scope-for-v1) removed them from v1, and no `Reviews`/`Ratings` collection was built at Milestones 6 to 13.
- **No sales data exists either.** `Products` (Milestone 10) has no sales-count field, and nothing aggregates `Orders` (Milestone 11) into per-product totals. No milestone in the plan adds one.
- **Even a real computation would be empty at launch.** This is a brand-new single store; on day one there are no orders to rank by, so a genuinely sales-derived "best selling" list would render empty exactly when the home page most needs content.

Milestone 23's own text says only "replace dummy-data-backed `LatestProducts`/`BestSelling` with real Payload data" — it does not say what the replacement should rank by. The gap was flagged at Milestone 22 rather than silently filled.

**Decision**: "Best Selling" is **admin-curated**. `Products` gains an `isFeatured` checkbox (default `false`), and `BestSelling.jsx` renders the products an admin has flagged, newest-first. It is not derived from any metric.

**Rejected alternatives**:

- **Sort by newest (`-createdAt`)** — no schema change, but it duplicates the "Latest Products" section directly above it on a small catalog, and labels an arbitrary list as "best selling," which is simply untrue.
- **Sort by price or discount depth** — a fabricated ranking presented to customers as sales performance. Cheapest to build and the least honest.
- **Drop the section entirely until real order data exists** — never misleading, and genuinely defensible; rejected because a curated section is more useful to a new store than a missing one, and the admin gains a real merchandising lever at negligible cost.
- **Compute from `Orders`** — the "correct" long-term answer, but it needs an aggregation path no milestone owns, and would render empty at launch. Available later without discarding this work: a computed ranking can replace or supplement the flag, and `isFeatured` remains meaningful as a manual override.

**Consequences**:

- `collections/Products.ts` (Milestone 10's file) gains an `isFeatured` checkbox. This is the only schema change Milestone 23 makes.
- `lib/payload/products.ts` gains `getFeaturedProducts()` alongside `getProducts()`; the "no default sort for best selling" gap recorded against Milestone 22 is closed.
- **`app/(public)/page.jsx` is `force-dynamic`.** Curation is only meaningful if toggling `isFeatured` in `/admin` changes the storefront without a redeploy — static prerendering at build time would freeze the section until the next deploy. This also removes the build's dependency on a reachable database, which the production image build (Milestone 49) could not have satisfied. SSR still satisfies [Architecture Decision Record 007](#architecture-decision-record-007-search-engine-optimization-first-and-mobile-first-are-default-requirements-not-a-later-pass); revisit as ISR at Milestone 45 if caching is wanted.
- **`BestSelling.jsx` renders nothing when no product is flagged**, rather than an empty section with a heading and a "View more" link into an unrelated list.
- `scripts/seed.ts` flags two seeded products so a freshly seeded database produces a populated home page.
- The section's customer-facing label is unchanged ("Best Selling"). If the stakeholder would rather it read "Featured" — arguably more accurate, since nothing is measuring sales — that is a copy decision, not a technical one, and belongs with the storefront copy pass tracked in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md) (`R12`).

---

## Architecture Decision Record 023: Cart state stays Redux, with `localStorage` persistence added

**Status**: **Accepted (2026-08-18)** — recorded ahead of Milestone 30, closing readiness finding [D10](./PHASE_1_READINESS_REPORT.md#d10--cart-state-mechanism).

**Context**: `ARCHITECTURE.md` lists "Redux Toolkit vs. a simpler client-side cart" as an open question. Milestone 30's text ("Fix cart persistence... e.g. `localStorage`") already silently assumes Redux stays and only persistence is added — but that assumption was never recorded as a decision, which is exactly the failure mode `CLAUDE.md`'s working agreement exists to prevent ("don't let decisions live only in chat history").

The actual, verified bug Milestone 30 exists to fix is narrower than "which state library": `lib/features/cart/cartSlice.js` has no persistence layer at all, so `cartItems` resets to `{}` on every page refresh — verified by reading the slice (no `localStorage` read/write anywhere) and confirmed live while testing Milestone 28's cart fix (a hard `page.goto` reload wiped the cart; client-side `<Link>` navigation within the same session did not). That is a real, launch-blocking defect for a store where customers browse, get distracted, and come back. It is not evidence that Redux itself is wrong.

**Decision**: Keep Redux Toolkit as the cart's state container. Add `localStorage` persistence: hydrate `cartSlice`'s initial state from `localStorage` on load, and write back on every mutation (`app/StoreProvider.js` and `cartSlice.js`, per Milestone 30's existing file list).

**Rejected alternatives**:

- **Swap to React Context** — no functional gain. Redux is already wired throughout the storefront (`cart`, `address` slices; `StoreProvider.js`), works correctly today except for persistence, and a swap would touch every cart-reading component (`Navbar.jsx`, `cart/page.jsx`, `Counter.jsx`, `OrderSummary.jsx`) for a state-management preference, not a bug fix. Pure churn.
- **Swap to Zustand or another lightweight store** — same reasoning: smaller boilerplate is a real advantage in a greenfield project, but this isn't one: this codebase's actual gap is a missing persistence layer, which is a five-line addition to the existing Redux slice, not a reason to re-architect state management for the whole storefront.
- **Server-side cart (a `Cart`/session record in Payload)** — the correct model for an authenticated multi-device cart, but guest checkout with no accounts (Architecture Decision Record 005) means there is no stable identity to key a server cart on besides a cookie-based session ID, which reintroduces most of the complexity `localStorage` avoids for a single-device, no-login shopper. Worth reconsidering only if a future phase adds accounts.

**Consequences**:

- `lib/features/cart/cartSlice.js` gains `localStorage` read on `initialState` and a write after every reducer mutation (or a single `subscribe` in `StoreProvider.js` — implementation detail for Milestone 30 to choose).
- Cart survives refresh and closing/reopening the tab; it does not sync across devices or browsers, since there is no account to key it on. Acceptable for v1 — see rejected alternatives.
- No `.jsx`/`.tsx` component outside `lib/features/cart/cartSlice.js` and `app/StoreProvider.js` needs to change: every existing `useSelector(state => state.cart...)` call keeps working unmodified.
- Milestone 28's cart-data-resolution fix (real products via REST) and this persistence fix are independent and already compose correctly — verified: Milestone 28's Playwright check used client-side navigation specifically because persistence hadn't landed yet, not because of any interaction between the two fixes.

---

## Architecture Decision Record 024: Guest order lookup via a dedicated `(orderNumber, phone)` endpoint — `Orders` collection access stays admin-only

**Status**: **Accepted (2026-08-18)** — recorded ahead of the Milestones 30 to 36 checkout group, closing readiness finding [C7](./PHASE_1_READINESS_REPORT.md#c7--milestone-13s-access-control-rules-forbid-exactly-what-milestone-36-requires). Implementation is Milestone 36's job; this Architecture Decision Record records the mechanism so Milestone 36 isn't improvised. *Amended 2026-10-11 by [Architecture Decision Record 035](#architecture-decision-record-035-cloudflare-turnstile-on-order-placement-and-lookup-a-per-phone-order-limit-and-a-per-ip-flood-ceiling--cgnat-safe-rate-limits-milestone-52b) (owner-approved): the lookup's IP rate limit becomes a flood ceiling plus Turnstile verification, with today's limit kept for unverified requests. The `(orderNumber, phone)` mechanism and `Orders` access are unchanged.*

**Context**: Milestone 13 set `Orders` access to public-create/admin-read, with an explicit acceptance test that anonymous `GET /api/orders` must fail — correctly implemented and verified working (Milestones 6 to 13a's completion notes). Milestone 36 requires guest order lookup ("My Orders" with no account) from the public storefront. Both are individually correct and, as originally specified, mutually exclusive: nothing in Milestone 13 or Milestone 36 names the reconciling mechanism. The readiness report's own risk assessment is blunt about the likely failure mode absent a decision: *"the likely improvised fix is relaxing Orders read access — which leaks every customer's name, phone, and address"* — a real risk given `Orders` (Milestone 11) embeds guest name/phone/address directly on each document (Architecture Decision Record 021), so open collection read would be a customer-data leak, not a cosmetic issue.

**Decision**: Guest order lookup is a **dedicated server action or route handler**, not a relaxation of `Orders`' collection-level read access. It accepts exactly two inputs — `orderNumber` and `phone` — and returns exactly one order (or nothing) when both match; it never lists, searches, or enumerates orders. `Orders`' collection access rule from Milestone 13 (admin-read-only) does not change. The endpoint calls Payload's Local API with `overrideAccess: true` internally (server-side only, never exposed to the client), scoped to a single `where: { orderNumber: { equals }, guestPhone: { equals } }` query — the same pattern this session already used for Milestone 27a's temporary empty-category verification route, applied permanently here. The endpoint is rate-limited by IP to blunt brute-force enumeration of order numbers.

Phone is the right second factor: it's already a required field on every guest order (Milestone 11), every cash on delivery customer provides one (a delivery contact number is non-negotiable for cash on delivery dispatch), and order numbers alone are guessable (`GC-<timestamp>-<random>` per Milestone 11's format) — a single factor would let anyone who sees an order-confirmation screenshot, or guesses a nearby order number, pull up a stranger's name, address, and order history.

**Rejected alternatives**:

- **Relax `Orders` collection read access to public** — the exact leak this Architecture Decision Record exists to prevent: every field on every order (name, phone, full address, line items) becomes fetchable by anyone who can guess or enumerate an ID, with no rate limiting Payload's default REST/GraphQL layer provides out of the box.
- **Order number alone, no second factor** — insufficient: order numbers are visible in URLs, screenshots, and printed slips, and are not intended to be secret. A single-factor lookup is a lookup-by-guessable-ID, not authentication.
- **Signed/opaque lookup token emailed or SMS'd at order time** — stronger than phone-based lookup in isolation, but adds a hard dependency on working email/SMS delivery at the exact moment a customer most needs a fallback (they're trying to check an order status, possibly because something already went wrong), and SMS is explicitly deferred to a future phase (Architecture Decision Record 015). Reasonable as a *second, additive* channel once `D8`'s order-confirmation email (Resend) ships, not as the only mechanism for launch.
- **Full guest accounts (email/password)** — directly contradicts Architecture Decision Record 005 (guest checkout, no accounts) and would be the largest possible scope increase to solve a lookup problem.

**Consequences**:

- Milestone 36's file list (`app/(public)/orders/page.jsx`, `components/OrderItem.jsx`, `lib/payload/orders.ts`) is unchanged; this Architecture Decision Record specifies *how* `lib/payload/orders.ts`'s lookup function must be scoped, not new files.
- Milestone 13's `Orders` access rule needs no change and no revisit — this Architecture Decision Record is the reconciling mechanism the readiness report asked for, not a reason to reopen Milestone 13.
- Rate-limiting the lookup endpoint is now part of Milestone 36's definition of done, not an optional hardening pass — added to its acceptance criteria.
- Closes `C7` and `D9` (guest order-lookup key + abuse controls) together, since `D9`'s question ("what identifies a guest order holder, and what prevents enumeration") is answered by the same design: `(orderNumber, phone)` plus IP rate limiting.

---

## Architecture Decision Record 025: Milestone 29 product search is a case-insensitive `contains` match on `name` only

**Status**: **Accepted (2026-08-26)** — stakeholder-confirmed while clearing Milestone 29's prerequisites.

**Context**: Milestone 29 replaces `/shop`'s in-memory filter with a real database query. Its plan entry states the goal ("replace with a real query against Payload/Postgres so it scales past a handful of seeded products") and its `Testing` line requires that a seeded product name returns results and a non-matching term returns an empty state rather than an error. It does **not** say which fields the query covers, nor whether the replacement must remain case-insensitive — a gap raised as a `D`-class finding during Milestone 29's dry run.

The gap mattered because the behaviour being replaced is case-insensitive by construction:

```js
product.name.toLowerCase().includes(search.toLowerCase())   // app/(public)/shop/page.jsx
```

PostgreSQL's `LIKE` is case-**sensitive**, so a naive port would have silently regressed every mixed-case search — the highest-rated risk on the dry run, and one that no existing gate would have caught (`npm run lint` is broken, and there are no automated tests until Milestone 56a).

The operator's behaviour was therefore verified empirically against real seeded data in PostgreSQL rather than assumed. Payload's `contains` maps to `ILIKE '%…%'`:

| Probe | Result |
|---|---|
| raw SQL `name LIKE '%lamp%'` | 0 rows |
| raw SQL `name ILIKE '%lamp%'` | 1 row |
| Payload `where[name][contains]=lamp` | 1 row — therefore `ILIKE` |
| `Lamp` / `lamp` / `LAMP` / `lAmP` | 1 each |
| `able Lam` (mid-string) | 1 — substring, not prefix |
| `smart` / `SMART` | 2 each |
| `zzzznomatch` | 0 rows, no error |
| empty string | full listing |

Each result matches the live pre-Milestone 29 `/shop` baseline exactly, including HTTP 200 on the no-match case.

**Decision**: Milestone 29's search is a **case-insensitive substring match on `Products.name` only**, implemented with Payload's **`contains`** operator. `description` is not searched.

**Rejected alternatives**:

- **`name` + `description` via a `where[or]` clause** — verified to work, and a plausible future improvement, but it changes result sets in ways the milestone never specified: every seeded product shares the phrase "with a sleek design", so a description search returns near-everything on the current catalogue. Widening recall is a product decision with no acceptance criteria behind it, and Milestone 29 is a like-for-like replacement of the query mechanism, not a relevance change.
- **`like` operator** — behaves identically here (also `ILIKE` under this adapter), but `contains` states the substring intent directly; `like` invites the reader to assume SQL `LIKE` semantics, which is exactly the case-sensitivity trap this Architecture Decision Record exists to close.
- **`equals`** — exact, case-sensitive whole-string matching. Confirmed by probe to return 0 for `Lamp` and 0 for `modern table lamp`. A search box that only matches the complete product name is not a search box.
- **Full-text search (`tsvector`/`pg_trgm`)** — the right answer at a catalogue size this store does not have. It needs an index migration, a ranking decision, and a milestone that owns it; none exist. `contains` is replaceable by it later without changing the route's contract.

**Consequences**:

- `lib/payload/products.ts` gains an optional `search` on `GetProductsOptions`, applied as `where: { name: { contains: search } }`. The hand-written `GetProductsOptions` type must be updated by hand — `payload-types.ts` mirrors collections, not utility options.
- `app/(public)/shop/page.jsx` passes `search` through to `getProducts()` instead of filtering the fetched array. Filtering moves to the database.
- **Existing callers must stay unaffected.** `getProducts()` is also called by `app/(public)/page.jsx` (`{ sort: '-createdAt', limit: 4 }`) with no `search`; omitting it must continue to return the unfiltered listing.
- **An empty search string behaves as no search** (verified: returns the full listing), so `/shop?search=` renders the complete catalogue rather than an empty state.
- `/shop` must remain server-rendered (`ƒ Dynamic` in the build output). Moving the filter into the query must not turn it into a client-side fetch — [Architecture Decision Record 007](#architecture-decision-record-007-search-engine-optimization-first-and-mobile-first-are-default-requirements-not-a-later-pass) applies.
- Searching `description` later is additive and needs no rework of this decision — it becomes a `where[or]` clause and a new acceptance criterion.
- Closes the `D`-class search-semantics finding raised in Milestone 29's dry run.

---

## Architecture Decision Record 026: Orders are created only by a server-side function — `Orders` collection `create` access closes to admins

**Status**: **Accepted (2026-10-09)** — approved by the human owner (the project's sole reviewer) the same day it was proposed. It changes authorization on a collection that holds guest personally identifiable information, which `.claude/docs/GATES.md` lists as a human-approval action, and it reverses Milestone 13's acceptance criterion *"anonymous `POST /api/orders` succeeds"*. It does **not** supersede an Accepted Architecture Decision Record (see *Relationship to existing Architecture Decision Records*). *Decision 6 was amended 2026-10-11 by [Architecture Decision Record 035](#architecture-decision-record-035-cloudflare-turnstile-on-order-placement-and-lookup-a-per-phone-order-limit-and-a-per-ip-flood-ceiling--cgnat-safe-rate-limits-milestone-52b) (owner-approved): Turnstile verification, a per-IP flood ceiling, the strict per-IP limit kept for unverified requests, and a per-phone limit. Decisions 1–5 and 7 are unchanged.*

**Context**: Milestone 13 set `Orders` to public-create/admin-read so that guest checkout (Architecture Decision Record 005) could write an order without an account, and verified exactly that: anonymous `POST /api/orders` succeeds, anonymous `GET /api/orders` fails. Milestone 33's goal, as written, is *"an actual `POST` to the `Orders` collection, using the cart contents and guest address"* — i.e. the browser calls the collection endpoint directly. That combination was verified to be unsafe against a live server on 2026-10-09, during Milestone 33's dry run:

| Probe (anonymous, no cookie) | Result |
|---|---|
| `POST /api/orders` with `items[0].unitPrice: 1` for a product priced `2900`, `orderTotal: 1` | **200** — order created, stored at the client's price |
| Same response body | Contained the **full embedded `Products` document** (`depth` populated), not just an order reference |
| `GET /api/orders`, `GET /api/users` | 403 (correct; unchanged) |

Every field the order stores is therefore client-controlled: `unitPrice`, `orderTotal`, `shippingCost`, `discountAmount`, `status`, `isPaid`, and even `orderNumber` (the generator only runs when the field is absent). This defeats the purpose of three existing decisions:

- **Architecture Decision Record 018** says shipping, total, and each line's unit price are *"snapshotted onto the Order at creation time"* from `Settings` and `Products`. A snapshot of whatever the client sent is not a snapshot of the store's prices.
- **Milestone 33a / readiness risk R5** requires stock to be re-validated server-side at order creation. A check that lives only in the Next.js user interface is bypassed by calling the collection endpoint, which still exists after Milestone 33 ships.
- **Cash on delivery economics** (`PROJECT_SPEC.md`): an order costs a dispatch attempt whether or not it is real. An open, unauthenticated create endpoint with no validation and no rate limit is a free way to generate fake orders and to mark them `DELIVERED` / `isPaid: true`.

Milestone 13's access rule was correct for the scope Milestone 13 had — the plan said nothing then about who computes the numbers. This Architecture Decision Record records the decision Milestone 33 cannot make by itself.

**Decision**: Order creation moves behind a **server-side function**; the `Orders` collection stops accepting public creates.

1. **The only public path to create an order** is a function in `lib/payload/orders.ts` (server-only, Local API, per the existing `lib/payload/*` boundary), invoked from a **Next.js server action**. The server action file lives outside `lib/payload/` (for example under `app/(public)/cart/`) because `lib/payload/*` is imported by server code only and must not carry `'use server'` exports for the client.
2. **The caller supplies only two things**: the cart lines (`productId`, `quantity`) and the guest name/phone/address/city/area (Architecture Decision Record 021). Everything else is derived on the server at the moment of creation:
   - `unitPrice` from the current `Products.price`; `orderTotal` and `shippingCost` from those prices and the `Settings` flat rate and free-shipping threshold, per Architecture Decision Record 018;
   - `paymentMethod: 'COD'`, `status: 'PLACED'`, `isPaid: false` (Architecture Decision Records 004 and 019);
   - `orderNumber` from the existing generator.
   The function writes with `overrideAccess: true`, **after** its own validation — never the other way around.
3. **`Orders.access.create` becomes admin-only** (`Boolean(user)`), matching `update`/`delete`. Anonymous `POST /api/orders` and the GraphQL `createOrder` mutation return 403. Admins can still create an order by hand in `/admin`. Read, update, and delete rules are unchanged.
4. **Validation is part of the function, not the user interface.** At minimum: lines are non-empty; each `productId` exists; `quantity` is an integer between 1 and a documented upper bound (value chosen by Milestone 33); duplicate lines are merged; required guest fields are present and the phone matches the existing `0[0-9]{10}` shape. Any failure rejects the **whole** order and creates nothing (this is also the seam Milestone 33a plugs the stock check into). Full Pakistani address/phone validation stays with Milestone 56.
5. **The response is minimal.** The function returns the new `orderNumber` and the resolved totals — not the stored document. Errors name the failing product(s) or field, and no error or log line carries the customer's name, phone, or address.
6. **Creation is rate-limited by IP**, using the same mechanism Milestone 36 must build for the lookup endpoint (Architecture Decision Record 024). Whichever of the two milestones lands first builds it as a shared helper. An in-process limiter is acceptable under Architecture Decision Record 015's single-VPS baseline and must be revisited if the app ever runs as more than one instance.
7. **The client guards against double submission** (disabled button while the action is in flight). This is a user experience protection, not a correctness one; the server is the authority.

**Rejected alternatives**:

- **Keep public create and recompute in a collection hook** (`beforeValidate`/`beforeChange` overwriting prices, totals, and status). Technically sufficient for tampering, but it leaves the unauthenticated endpoint and its GraphQL twin open for spam; hides business rules (stock, shipping, price lookup) inside a hook that also runs for legitimate admin edits; cannot return a clear "these products are unavailable" error to the shopper; and returns the stored document to anonymous callers unless response shaping is added separately. It answers "can they lie about the price" and leaves the other three problems.
- **Keep public create and field-level access** on `status`, `isPaid`, `unitPrice`, etc. Payload field access can stop a field being *set*, but `unitPrice` and `orderTotal` are legitimately written at creation, so the only fully safe configuration is "no field may be set by the public" — which is this Architecture Decision Record's decision, reached the long way round.
- **Status quo (Milestone 33 as written) plus Milestone 33a's stock check in the user interface.** Leaves every field client-controlled. Rejected on the evidence in the table above.
- **A custom route handler instead of a server action.** Equivalent in capability and acceptable if a server action proves unsuitable. Not the default because a server action gets Next.js's built-in same-origin check, whereas a route handler needs its own CSRF/origin handling for a state-changing request.
- **A server-issued signed "quote" the client echoes back at checkout.** Prevents price drift between cart and order, but needs key management, expiry, and a replay story for a store whose entire catalogue is fetched fresh by the server at order time anyway. The cart page may show a stale price; the server charges the current one and tells the shopper the final total.
- **CAPTCHA / bot challenge at checkout.** A reasonable additive control if spam appears after launch; not required to close the price-tampering and public-write problems, and it adds a third-party dependency (Architecture Decision Record 015's baseline has none). Deferred, not rejected.

**Relationship to existing Architecture Decision Records**:

- **Architecture Decision Record 024 (Accepted)** is not contradicted and is **not edited**. It fixes `Orders`' *read* access as admin-only and says Milestone 13's access rule *"needs no change and no revisit"* for the purpose of guest **lookup**; this Architecture Decision Record changes only `create`, which Architecture Decision Record 024 does not decide. Reading both together: read stays admin-only (Architecture Decision Record 024), create becomes admin-only (this Architecture Decision Record), and the public interacts with orders solely through two purpose-built server functions — create (this Architecture Decision Record) and lookup (Architecture Decision Record 024).
- **Architecture Decision Records 018, 004, 019, 021 and 005** are implemented as written; this Architecture Decision Record is what makes Architecture Decision Record 018's snapshot guarantee enforceable.
- **Erratum, for a human to apply — not applied here:** Architecture Decision Record 024's lookup query is written against `guestPhone`, but the `Orders` field is named `phone` (`collections/Orders.ts`). Milestone 36 should use `phone`.

**Consequences**:

- **Milestone 13's Testing line changes in one place**: *"anonymous `POST /api/orders` succeeds"* becomes *"fails (403)"*. The other Milestone 13 criteria stand. On acceptance, `MIGRATION_PLAN.md`'s Milestone 13 entry gets a dated annotation, and Milestone 33's goal is reworded from "a `POST` to the `Orders` collection" to "create an order through a server-side function".
- **Milestone 33's scope grows beyond its `Files` line** (`components/OrderSummary.jsx`, `lib/payload/orders.ts`): it also changes `collections/Orders.ts` (the access rule) and adds a server action file. Its Rollback line must cover the access change too, not just the two files.
- **Nothing in the storefront calls `POST /api/orders` today** (the Place Order handler is a navigation stub), so closing it breaks no existing consumer. `scripts/seed.ts` uses the Local API, whose default is to bypass access control; this should be re-confirmed by running `npm run seed` as part of Milestone 33's verification.
- **Milestone 33a** (stock enforcement), **Milestone 34** (shipping display), **Milestone 35** (confirmation), and **Milestone 36** (lookup) all build on this one function. Its return shape is the contract they consume; it should not return the stored document.
- **`G6` gains a concrete test**: anonymous `POST /api/orders` and the GraphQL `createOrder` mutation are refused, while a valid cart submitted through the server action creates exactly one order whose prices match the database regardless of what the client sent.
- **The `lib/payload/orders.ts` types are hand-written**, mirroring the collection (house convention until `payload-types.ts` is adopted).
- **New open item tracked as `R14`** in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md): `Orders` accepted client-controlled prices and status from anonymous callers. Closed by this Architecture Decision Record once Accepted and implemented by Milestone 33.

---

## Architecture Decision Record 027: Milestone 35 order confirmation is rendered from the `placeOrder` response held in `sessionStorage` — no server read of `Orders`

**Status**: **Accepted (2026-10-09)** — it implements Architecture Decision Records 024 and 026 without reversing either and changes no authorization. The only contract change is one additive field on `createOrder`'s result (see *Decision*, point 2).

**Context**: Milestone 33 shipped `placeOrder` (Architecture Decision Record 026) with a deliberately minimal result — order number and totals — and the Place Order handler currently surfaces it as a toast. Milestone 35 must show the guest a real confirmation after Place Order. The obvious implementation, a route such as `/order-confirmation/[orderId]` that loads the order server-side, collides with two Accepted decisions: `Orders` read access is admin-only (Architecture Decision Record 024, unchanged by Architecture Decision Record 026), and Architecture Decision Record 024 explicitly rejects lookup by order number alone because order numbers are visible in URLs and screenshots and are guessable. A confirmation route keyed by order number or id, reading `Orders` with `overrideAccess: true`, is exactly that single-factor lookup, serving a stranger's name, phone, and address to anyone who guesses a nearby value.

The data the confirmation screen needs is nearly all already in the browser: the guest typed their own delivery details, and `placeOrder` returns the order number and totals. The one missing piece is the authoritative per-line breakdown (product name, quantity, the server-snapshotted unit price), which the cart cannot supply reliably because the server may have charged a different price than the cart displayed (Architecture Decision Record 026).

**Decision**: The confirmation page is rendered from the `placeOrder` **response**, carried to the next page in `sessionStorage`, and never from a read of `Orders`.

1. **No server-side read keyed by order number or id.** There is no `/order-confirmation/[orderId]` (or `[orderNumber]`) route. Nothing on the confirmation path reads `Orders`.
2. **`createOrder`'s success result is extended, and only extended, with** `items: { name: string; quantity: number; unitPrice: number }[]` — the authoritative server-priced lines. Product names are public catalogue data and `unitPrice` is the snapshot just written. The result still never contains the stored document, the customer's phone or address, any order id, or anything else beyond order number, totals, and `items`. Architecture Decision Record 026's "returns only the order number and totals" is amended by `items` and nothing more. The `placeOrder` return type in `app/(public)/cart/actions.ts` follows automatically.
3. **The client persists the result immediately on success.** It writes `{ orderNumber, items, subtotal, shippingCost, orderTotal, delivery details, placedAt }` to `sessionStorage` under a namespaced key (for example `gocart:last-order`), then navigates to the fixed route `/order-confirmation` with **no id in the URL**. Delivery details come from the form state the guest already holds; they are not returned by the server.
4. **`/order-confirmation` is a client-rendered page** that reads that entry and performs **no network reads of order data**. It is marked `noindex` (Architecture Decision Record 007 applies to the catalogue, not to a per-visitor transactional screen). If the entry is absent, malformed, or expired — a different device or tab, or the tab was closed — it renders a friendly "we couldn't find a recent order in this browser" state pointing to guest order lookup (`/orders`, Milestone 36) and `/shop`.
5. **`sessionStorage`, not `localStorage`, is deliberate.** It is per-tab and cleared when the tab closes, so the guest's name, phone, and address do not linger on shared or family devices, while the confirmation still survives a reload. Keeping the order number after the tab closes is Milestone 36's job (lookup by order number and phone), not this page's.
6. **Stored data is untrusted input.** The page shape-validates the parsed entry (types, finite non-negative numbers, array of well-formed lines, plausible `placedAt`) before rendering and falls back to the not-found state on any mismatch. Rendering relies on React's escaping; nothing is injected as HTML.

**Rejected alternatives**:

- **Server-side `/order-confirmation/[orderId]` reading `Orders` with `overrideAccess`.** Leaks guest personally identifiable information to anyone holding or guessing the id or order number, and is the single-factor lookup Architecture Decision Record 024 rejects. Disqualifying.
- **A signed or opaque confirmation token in the URL.** Workable and secure, but it needs key management and expiry for what is a one-time screen, and Milestone 36 already covers the revisit case. Could be added later as an additive channel without reworking this decision.
- **A cookie-based server session for guests.** Introduces server-side session state for anonymous users, contradicts Architecture Decision Record 005's no-account stance in spirit, and complicates caching of otherwise static responses.
- **`localStorage`.** Survives tab close, which is precisely the problem: name, phone, and address linger on shared devices indefinitely.
- **Toast only (the Milestone 33 status quo).** Lost on reload, no itemised summary, and unsuitable for a cash on delivery customer who needs the order number and amount due at the door.

**Consequences**:

- Files affected beyond Milestone 35's plan line: `lib/payload/orders.ts` (result shape gains `items`), `components/OrderSummary.jsx` (store the result and navigate instead of the long toast), and a new `app/(public)/order-confirmation` page (new file, `.tsx`).
- Architecture Decision Records 024 and 026 are **not edited**. Read stays admin-only, create stays server-function-only, and the `(orderNumber, phone)` lookup remains Milestone 36's sole revisit path. The additive `items` field is the only contract change and exposes nothing not already public or already held by the client.
- Hand-written types in `lib/payload/orders.ts` must gain `items` by hand; the not-found state links to `/orders`, which stays dummy data until Milestone 36.
- A guest who opens the confirmation in a second tab or device sees the not-found state by design. Acceptable: the order exists and is recoverable through Milestone 36.
- Closes no readiness-report finding. Note it in Milestone 35's entry context; `MIGRATION_PLAN.md` is not edited here.

---

## Architecture Decision Record 028: Order identity and price-snapshot fields are immutable after creation — field-level access

**Status**: **Accepted (2026-10-09)** — explicitly approved by the project owner (the human at `G8`). It is an authorization change on a collection that holds guest personally identifiable information, which `.claude/docs/GATES.md` lists as a human-approval action. It **narrows** access: after this Architecture Decision Record an admin can no longer change four fields that were previously editable. It refines Architecture Decision Record 018 (the snapshot is "never recomputed") and protects Architecture Decision Record 024 (the guest lookup key). It reverses no Accepted Architecture Decision Record.

**Context**: Quality assurance of Milestones 37 and 38 found that `orderNumber` is read-only **in the admin user interface only** (`admin.readOnly: true`). The API does not honour that flag: an admin session sending a REST `PATCH` changed it, and the new value persisted (verified: `GC-CHANGED-00000000`). That matters because the order number is half of the guest lookup key (`orderNumber` + `phone`, Architecture Decision Record 024) and is printed and shown to customers on the confirmation screen (Architecture Decision Record 027). Changing it silently breaks the reference the guest holds, and lookup stops finding the order.

The price fields have a related problem. `items[].unitPrice`, `orderTotal`, and `shippingCost` are the snapshot of what the customer was quoted and will pay at the door (Architecture Decision Record 018, written by `createOrder` per Architecture Decision Record 026). They were plain editable inputs, and their own descriptions admit that editing one never recalculates the others. An accidental edit therefore desynchronises the order with no warning, on a cash on delivery order where the amount on the sheet is the amount the courier collects.

**Decision**: Add field-level access `update: () => false` (create left unchanged) to these fields in `collections/Orders.ts` (list extended by the 2026-10-10 amendment under Consequences):

1. `orderNumber`
2. `items` (the array), `items[].product`, `items[].quantity`, `items[].unitPrice`
3. `orderTotal`
4. `shippingCost`

These fields can be set **only at creation** — by `createOrder` through the Local API (Architecture Decision Record 026), or by an admin creating an order by hand in `/admin` — and are immutable through REST, GraphQL, and the admin user interface afterwards. Collection-level access is unchanged (admin-only create, read, update, delete, as in Architecture Decision Record 026). `status`, `isPaid`, the customer and address fields, and the remaining fields stay editable, so the Architecture Decision Record 019 workflow is untouched. `discountAmount`, reserved for a future coupon engine (Architecture Decision Record 017), is not touched.

**Rejected alternatives**:

- **`admin.readOnly` only (the status quo for `orderNumber`).** A user interface hint, not access control; it does not protect the API. This is the verified defect.
- **A `beforeChange` immutability hook** that rejects or reverts changes. Works, but hides the rule in imperative code and still renders the field as editable in the admin user interface, inviting an edit that then fails or is silently discarded. Field access is declarative, enforced on every transport, and lets Payload render the field read-only itself.
- **Leave the fields editable.** Accepts accidental desynchronisation of the snapshot and breakage of the guest lookup key. Rejected on the evidence above.
- **Make all of `Orders` read-only after creation.** Admins must still correct a delivery address or phone typo and move the order through its statuses (Architecture Decision Record 019); this over-corrects.

**Relationship to existing Architecture Decision Records**:

- **Architecture Decision Record 018 (Accepted)** is not edited. This Architecture Decision Record is what makes its "never recomputed afterward" guarantee hold against admin edits, as Architecture Decision Record 026 made the creation-time snapshot hold against client input.
- **Architecture Decision Record 024 (Accepted)** is not edited; its `(orderNumber, phone)` lookup is unchanged. This Architecture Decision Record protects half of its key from being altered after the guest has been given it. `phone` stays editable by design (typo correction).
- **Architecture Decision Records 026, 019 and 017** are implemented as written; collection access, the status set, and `discountAmount` are not changed.

**Consequences**:

- If an amount genuinely has to change after a phone confirmation, the admin sets the order to `CANCELLED` and creates a replacement order by hand in `/admin`. Creation stays allowed, so this path remains open.
- **Amended 2026-10-10 (owner decision):** `items[].quantity`, `items[].product` and the `items` array itself are locked too — any field that alters financial integrity or bypasses `orderTotal` is immutable after creation. Quality assurance of the first cut (sub-field locks only) found a real hole: an admin REST `PATCH` could still **remove a line-item row** while `orderTotal` stayed unchanged (a 2-row order became 1 row, total still 250). Field access on the array (`access.update: () => false`) closes add, remove and reorder; the sub-field locks stay as defence in depth. The recalculation-hook option is not taken.
- The admin user interface renders the four locked fields read-only; Payload derives this from field access, so `admin.readOnly` on `orderNumber` becomes redundant (it may stay).
- No schema or migration change — access is configuration.
- The hand-written types in `lib/payload/orders.ts` are unaffected (no field is added, removed, or retyped).
- **Verification requirement for the implementing milestone:** anonymous and admin REST and GraphQL updates of each of the four fields leave the stored values unchanged; create still works (both `createOrder` and a hand-made admin order); `status` and `isPaid` updates still work; and the guest lookup (Milestone 36) still finds the order by `(orderNumber, phone)`.
- Closes no readiness-report finding.

---

## Architecture Decision Record 029: PKR display format and Pakistani guest-checkout validation rules (Milestones 55 and 56)

**Status**: **Accepted (2026-10-10)** — the PKR format and the Milestone 56 rules were specified or confirmed by the project owner (format "Rs. 1,500"; phone `03XXXXXXXXX` or `+923XXXXXXXXX`; spaces and standard punctuation in names and cities; address minimum 10 characters). The spec itself did not define them (PROJECT_SPEC.md names only the fields and, via Architecture Decision Record 026, the old `0[0-9]{10}` shape). Reverses no Accepted Architecture Decision Record.

**Decision**:

1. **Money display** is produced only by `formatPKR()` in `lib/currency.ts`: `Rs. 1,500` — symbol, one space, comma-grouped whole rupees, no decimals, rounded. The locale is pinned to `en-US` (a bare `toLocaleString()` follows the runtime locale and can differ between server and browser, causing hydration mismatches). Western three-digit grouping (`1,234,567`), not lakh/crore grouping. The symbol still comes from `NEXT_PUBLIC_CURRENCY_SYMBOL`, normalised to one trailing space. A non-finite amount renders `Rs. —`, never `NaN`. This is display only: stored amounts and server-side pricing are unchanged.
2. **Phone** (guest checkout, `createOrder`, `Orders.phone`): a Pakistani **mobile** number in either form — `03XXXXXXXXX` (11 digits) or `+923XXXXXXXXX`. **It is stored in one canonical form, `03XXXXXXXXX`**: surrounding whitespace is trimmed and `+923…` is rewritten to `03…` at write time (`normalizePhone()` in `lib/validation/pk.ts`, applied by `createOrder` and by a `beforeValidate` hook on `Orders.phone`). Normalising is what keeps the guest lookup key (Architecture Decision Record 024) the same however the number was typed; the lookup normalises its input the same way, so a guest may type either form. Not accepted: landlines, `0092…`, spaces or dashes inside the number, operator-prefix allowlists.
3. **Name** and **city**: at least 2 characters, containing a letter, made of letters (any script, so Urdu works, including ZWNJ/ZWJ), combining marks, spaces and the usual punctuation `. , ' ’ - ( ) /` — no digits and nothing else (no `< > & ; =`). No city list (Architecture Decision Record 018 already rejected city tables: Pakistani addresses are free text). **Address**: at least 10 characters and containing a letter or digit. **Area**: optional; if given, at least 2 characters.
4. **One source of truth**: `lib/validation/pk.ts`, used by the checkout form (for specific inline messages), by `createOrder` (the authority; Architecture Decision Record 026), and by the `Orders.phone` field. Messages never echo the submitted value.
5. **`Orders.phone` is validated on create and when the value changes**, not on every save, so an order stored before Milestone 56 under a number the new rule rejects can still have its status updated (verified). Only `phone` is validated at collection level; admin entry of address text stays free-form.
6. **The guest lookup (Milestone 36, `/orders`) accepts the looser `0[0-9]{10}` shape as well as `+923XXXXXXXXX`** (normalised first), so a pre-Milestone 56 order can still be found by its guest.

**Rejected alternatives**: lakh/crore grouping (owner specified `Rs. 1,500`; Western grouping agrees for four-digit amounts, and the choice for larger amounts is flagged below); a city dropdown/allowlist (Architecture Decision Record 018); accepting `+92` but storing it as typed (the lookup key would then depend on how the customer typed it, Architecture Decision Record 024); validating `Orders.phone` unconditionally (would block saving old orders).

**Consequences / open items for the owner**: (a) a customer who only has a landline cannot order — widen `PK_MOBILE` in `lib/validation/pk.ts` if that matters; (b) orders keep the number in `03XXXXXXXXX` form, so a customer who typed `+92…` sees `03…` in the admin — this is intended; (c) city names with digits ("Sector 11") are rejected; (d) amounts of one million or more would group as `1,000,000`, not `10,00,000`; (e) the checkout form still collects an email address that nothing stores or uses (found, not changed). No schema or migration change.

---

## Architecture Decision Record 030: Mobile performance configuration — blocking metadata for every user agent, media cache headers, and what Milestone 45 deliberately did not change

**Status**: **Accepted (2026-10-10)** as an implementation decision inside Milestone 45 (configuration in `next.config.mjs`; no schema, access or Architecture Decision Record-level behaviour change). It reverses no Accepted Architecture Decision Record. The owner may revisit either setting.

**Context**: Lighthouse on the production build found two real, measurable problems and several things that are *not* worth changing yet.

1. **`<title>`/`<meta>` outside `<head>`.** Next.js 15.4 streams metadata into the `<body>` for ordinary browsers on statically cached pages (the category pages) and moves it into `<head>` with JavaScript; only user agents matching `htmlLimitedBots` get it in `<head>` up front. Lighthouse reported "Document does not have a meta description" on a page whose HTML did contain one. Googlebot is on the default list, but a link-preview or crawler client that does not run JavaScript (and any bot not on the list) would see a head with no description, canonical or Open Graph tags — the data Milestone 41 exists to provide.
2. **Uploaded media has no `Cache-Control` and no ETag** (Payload's file route sets neither), so every repeat visit re-downloaded every product image.

**Decision**:

- `htmlLimitedBots: /.*/` — every user agent gets blocking metadata, so the head is complete in the first HTML response. Cost: the head waits for `generateMetadata`, which on these pages is a cached read.
- `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` on `/api/media/file/:path*`. One day, not `immutable`: an admin can replace a file under the same name, and a changed image should appear within a day.

**Deliberately not changed** (each with the reason, so it is not mistaken for an oversight):

- **`images.unoptimized: true` stays.** Removing it and making the optimizer work under Docker is Milestone 51's scope and depends on Milestone 49. This is also the biggest real-world mobile lever (the seeded images are ~4 KB placeholders; real product photos are not), so **the local Lighthouse numbers below say little about image weight.**
- **`force-dynamic` stays on the home, shop and product pages.** Moving them to short-lived ISR would let `bfcache` restore them and cut server time, but would show a stale price or stock state for up to the revalidation window after an admin edit, and checkout charges the server price. The correct design is on-demand revalidation from `Products`/`Categories`/`Settings` `afterChange` hooks (immediate freshness, long cache) — a change to those collections, so it needs its own decision. Recorded as a follow-up, not done.
- **Render-blocking CSS, unused/legacy JavaScript:** one 15 KB stylesheet and Next's shared 101 kB chunk; no cheap, low-risk change (inlining CSS is experimental in this Next version).
- **Fonts:** already self-hosted by `next/font` with three weights; only `display: "swap"` was made explicit.

**Consequences**: the head is complete for every crawler; repeat visits reuse media for a day. If media is ever served from object storage (Architecture Decision Record 020's designated successor), the header rule moves with it.

---

## Architecture Decision Record 031: The production image — a database-free build, a standalone server, and a category page that is honestly dynamic (Milestone 49)

**Status**: **Accepted (2026-10-10)** as the implementation of Milestone 49. It reverses no Accepted Architecture Decision Record; it amends the *rendering strategy* that Milestones 27a and 27b chose for two routes (below), which `CATEGORY_REQUIREMENTS.md` described as static-by-default "where build-time generation is practical".

**Context**: Milestone 49 asks for a multi-stage, non-root, minimal production image. Building and *running* one (a real `docker build --target production` and a real container, not a read-through of the Dockerfile) found three things the plan did not anticipate:

1. **`next build` failed without a reachable database** (`Failed to collect page data for /category/[slug]`): `generateStaticParams` queried the catalog at build time. The Milestones 23 and 25 comments already say the image build "cannot assume a reachable database" — a Docker build has none (and continuous integration and virtual private server builds should not need one) — so the category routes contradicted the project's own design. Payload also refuses to initialise with an empty secret even during a build.
2. **A category created after the build returned HTTP 500 in production** (`DYNAMIC_SERVER_USAGE`). The category page reads `searchParams` for `?page=N`, which a statically cached (`revalidate`) page cannot do. Categories that existed at build time worked, so the dev server and continuous integration never showed it; any category an admin added after deploying would have been a 500. This is a latent defect in already-shipped code, found only by running the production image.
3. **Missing configuration made the app start and then 500 on every request** (`PAYLOAD_SECRET must be set in production` is raised lazily, on the first request), so nothing told an orchestrator the container was broken.

**Decision**:

- **Multi-stage Dockerfile**: `deps` (npm ci) → `dev` (unchanged behaviour, Milestone 5) / `builder` → `production`, which is the **last stage and so the default target**; the development image is `--target dev`. The production stage copies only Next's `standalone` output and static assets (262 MB image, ~99 MB app; no source, tests, docs, `.env`, `.claude`, devDependencies or build tools), runs `node server.js` as the unprivileged `node` user (uid 1000) and creates `/app/media` (writable, the mount point for uploads — `collections/Media.ts` resolves it relative to the app root).
- **The image is built with no database.** The build stage passes a placeholder `PAYLOAD_SECRET` and a closed-port `DATABASE_URI` to the single `npm run build` command *inline* (not `ENV`, so neither is stored in a layer or the image metadata); the app reads the real values at runtime. Where the build still touches the catalog it must tolerate failure: the footer and settings readers already degrade to nothing (Milestone 55a).
- **`output: 'standalone'` is opt-in** (`NEXT_OUTPUT=standalone`, set only by the Dockerfile), so `next start`, `next dev` and the continuous integration end-to-end job are unchanged.
- **The category page is `dynamic = 'force-dynamic'`** and drops `generateStaticParams`/`revalidate`: it is dynamic by nature (pagination via `searchParams`), so it says so, which fixes defect 2 and removes the build's database need. **`/categories` is `force-dynamic` too**: a statically prerendered copy would either fail the build or bake an *empty* categories page that stays live for an hour after every deploy, and a data failure must never look like "no categories" (`CATEGORY_REQUIREMENTS.md`). Cost: one cheap catalog query per request on both routes. If caching is wanted later: split page 1 from `?page=N`, or revalidate on demand from `Categories`/`Products` hooks (Architecture Decision Record 030).
- **`NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_CURRENCY_SYMBOL` are build arguments** (they are inlined into the bundle, so they cannot be set when the container starts). The site URL defaults to `http://localhost:3000` with a loud warning during the build; a deployment must pass the real origin, or the image publishes localhost canonicals and sitemap URLs. Changing the domain therefore means rebuilding — no code change, as required, but not a runtime switch.
- **The container checks its required settings up front**: `DATABASE_URI` and `PAYLOAD_SECRET` missing → it prints `FATAL: … must be set` and exits 1 (`exec` keeps `node` as PID 1, so `docker stop` is graceful: ~0.1 s measured).

**Not done here, by design** (each belongs to a named milestone): the database **schema must already exist** — Payload does not push it in production, and there are no migrations yet (Milestone 52a); Compose stacks (Milestone 50); image optimisation, `images.unoptimized` (Milestone 51); secrets handling and the Cloudflare-only origin (Milestone 52); health check and logging (Milestone 53); media and database persistence and backups (Milestone 54).

**Verified** (production image, local PostgreSQL, the full Playwright suite *against the running container*, 12/12): non-root user and `NODE_ENV=production`; every storefront route, `/admin`, the REST API and static assets served; a new category rendered on demand; a media upload written to `/app/media` as uid 1000 and served back; the image holds no source, secrets or placeholder values; missing configuration exits with a message; `docker stop` is immediate; `--target dev` still builds and serves `/admin`.

**Consequences / open items**: a first request after a deploy renders the static pages' footer from the build-time (empty) settings for up to the 60 s revalidation window (Milestone 55a, fails closed); `docker build` here used a sandbox-only copy of the Dockerfile adding a proxy and CA (3 lines, not committed) — the real file is built by the continuous integration `image` job; no healthcheck means an unhealthy-but-running container is not detected until Milestone 53.

---

## Architecture Decision Record 032: Database migrations are an automatic, fail-closed production step — a one-shot `migrate` service that the app waits for (Milestone 52a)

**Status**: **Accepted (2026-10-11)** — decided by the project owner (migrations committed; run automatically when the production stack starts, before the app serves traffic; a failed migration stops the app; production never auto-pushes the schema; no manual seeding to obtain a working schema; if the Payload CLI cannot run inside the standalone image, an equivalent automatic one-shot step the app depends on is the accepted fallback). The *choice among mechanisms* below is the architect's. Closes the design half of readiness finding `R9`; implementation is Milestone 52a. Reverses no Accepted Architecture Decision Record: it realises [Architecture Decision Record 002](#architecture-decision-record-002-postgresql-as-the-only-datastore)'s "Payload manages its own migrations", keeps Payload embedded ([Architecture Decision Record 009](#architecture-decision-record-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service) — the migrate step is a one-shot CLI run of the same codebase, not a second Payload service) and keeps the standalone `production` stage of [Architecture Decision Record 031](#architecture-decision-record-031-the-production-image--a-database-free-build-a-standalone-server-and-a-category-page-that-is-honestly-dynamic-milestone-49) unchanged.

**Context** (source-level findings against the pinned Payload/adapter 3.90.2; nothing here has been run):

1. **Production never pushes.** `@payloadcms/db-postgres` `connect.js` pushes the schema only when `NODE_ENV !== 'production' && PAYLOAD_MIGRATING !== 'true' && push !== false`. So a production container against an empty database serves a schema-less app (the Milestone 50 known limitation, `docker-compose.prod.yml`), and Architecture Decision Record 031 recorded "the schema must already exist".
2. **The standalone image cannot run the CLI.** The Milestone 49 build output holds only what Next traced: `next`, `react`, `react-dom`, the `pg` family, `graphql`, `sass`, `typescript`, `@next/env` and the like. Payload itself is bundled into `.next/server` chunks. There is no `payload` bin, no `tsx` (migration files are TypeScript and the CLI loads the config through `tsx`), no `drizzle-kit`, no `drizzle-orm`, no `esbuild`. All of those are present after `npm ci` (`tsx` is a direct dependency of `payload`; `drizzle-kit` of `@payloadcms/db-postgres`). Adding them to the standalone image would undo Architecture Decision Record 031's minimal-image decision.
3. **`prodMigrations` is not "before traffic".** Setting `prodMigrations` makes the adapter run `migrate` inside Payload's initialisation, which in this app happens lazily on the first request that needs Payload, in the serving process — and a failing migration calls `process.exit(1)` there, mid-request.
4. **`payload migrate` has one exit-0 path that would fail open, and one hang.** (a) With no migration files it logs "No migrations to run." and exits 0, which would let `service_completed_successfully` pass with the schema untouched. (b) If the database holds a dev-push marker (`batch = -1` in `payload_migrations`) it asks an interactive confirmation. *Correction (2026-10-11, Full-Stack run):* this Architecture Decision Record first inferred from `migrate.js` that a non-interactive run exits 0 via `onCancel`; that was wrong. With stdin at `/dev/null` or a closed pipe the prompt is printed and the process **hangs** (timeout 40 s, exit 124); answering `y` proceeds, tries to create tables that already exist, and exits 1. So the dev-pushed case is a hang, not a silent pass, and the migrate step must be bounded by a timeout and treated as failure. A failed migration itself exits 1, and each migration file runs in its own transaction.
5. **`payload migrate:create` is schema-only.** The CLI initialises with `disableDBConnect` for `migrate:create`; the adapter diffs the config's schema against the newest committed `*.json` snapshot (an empty snapshot for the first migration). It needs no database content, so the initial migration is reproducible from the code alone.

**Decision**:

1. **Migrations are committed files** in `/migrations` (`<timestamp>_<name>.ts` + its `.json` snapshot + the generated `index.ts`), produced only by `payload migrate:create`. The adapter is given an explicit `migrationDir` (not left to the `src/`/`dist/`/cwd search). An `initial` migration creates the whole present schema from an empty database; every later change to a collection or the `Settings` global ships its migration in the same change. The hand-written type mirrors rule (CLAUDE.md) is unchanged.
2. **Production does not push, by two independent things**: the adapter's own production behaviour (1 above) and the migrate service (3 below) running with `NODE_ENV=production`. `prodMigrations` is deliberately **not** configured.
3. **The runner is a `migrate` target in the existing `Dockerfile`** (same file, same `deps` layer and base image, full `node_modules` plus source, unprivileged user; placed *before* `production` so `production` stays the last, default stage). The production compose file runs it as a one-shot service (`restart: "no"`) and `app` declares `depends_on: migrate: condition: service_completed_successfully`. Ordering: `postgres` healthy → `migrate` → `app` → `cloudflared` ([Architecture Decision Record 033](#architecture-decision-record-033-cloudflare-tunnel-is-the-origin-boundary--and-production-environment-validation-is-a-deploy-gate-milestone-52)). If `migrate` fails, `app` is never started.
4. **The migrate service is a chain that stops at the first failure.** As implemented by Milestone 52a it is `payload migrate && tsx scripts/verify-migrations.ts` (`npm run deploy:migrate`), run under `timeout -k 10 300` — the timeout wraps the whole `deploy:migrate` chain, not just `payload migrate`; expiry is a non-zero exit, so the stack does not start, which handles the dev-marker hang. Environment validation (`scripts/check-env.ts`, Architecture Decision Record 033) was added by Milestone 52 and now runs as the first command of the chain (see Architecture Decision Record 033 for what it needs and when it skips). The post-migration verifier (`scripts/verify-migrations.ts`, through Payload's Local API, not a second client) is the backstop for the empty-directory exit-0 case and for a pre-existing `batch = -1` marker: it exits non-zero unless (a) at least one migration file exists, (b) every migration file has a row in `payload_migrations`, (c) no row has `batch = -1`, and (d) a count on every collection and a read of the `Settings` global succeed. (d) is a **smoke check, not proof the schema is right**: `payload.count` touches only parent tables (quality assurance dropped `orders_items` and `categories.slug` and it still passed). The verifier reliably catches a missing `payload_migrations` row, a `batch = -1` row, an empty migrations directory and an unreadable collection or global; schema correctness rests on the per-file transactions.
5. **Development is unchanged**: `next dev` keeps pushing. A database that `next dev` or `npm run seed` has pushed to carries the `-1` marker and must not be used to test migrations — use a scratch database. Continuous integration continues to seed/push for the Playwright job.
6. **A schema drift check runs in continuous integration**: `payload migrate:create --skip-empty` on a clean checkout must create no files.
7. **Forward-only.** Nothing runs `migrate:down` automatically; recovery is restore-from-backup (manual per [Architecture Decision Record 015](#architecture-decision-record-015-initial-production-infrastructure-baseline), formalised by Milestone 54) plus a corrective forward migration. A backup before any schema-changing deploy is a runbook step (Milestone 59).

**Alternatives considered and rejected**:

- *`prodMigrations` in the app* — runs in the serving process on first request, not before listening; failure exits mid-request; races if the app is ever scaled; cannot be a deploy gate.
- *Bundling `payload`, `tsx`, `drizzle-kit` into the standalone image / a fatter production image* — contradicts Architecture Decision Record 031; grows the attack surface of the one internet-facing container.
- *Pre-compiling migrations to JS and applying them with raw `pg`* — a second data-access path outside Payload's migration bookkeeping (Architecture Decision Records 002 and 003).
- *Next `instrumentation.ts` hook running the migration* — less clear ordering/failure semantics relative to the first request; not a visible deploy step; no separate exit code.
- *`push: true` in production* — unreviewed destructive schema changes against real orders; owner-rejected.
- *A manual `docker compose run … payload migrate`* — forgettable, and the owner required it to be automatic.

**Consequences**:

- One more Dockerfile target and compose service; Docker Compose v2.17+ is required for `service_completed_successfully` (state it in `docs/DEPLOYMENT.md`).
- **A fresh database bootstraps with no seeding.** (Superseded by Architecture Decision Record 036: the first admin is now created from a secret by the migrate step.) The first admin is created through `/admin`'s create-first-user screen; until that is done that screen is open to whoever reaches the hostname, so the runbook must create the first admin before the tunnel's public hostname is attached.
- **Redeploy behaviour (corrected 2026-10-11; this Architecture Decision Record first claimed a failed `migrate` leaves the old app running under plain `up` — that was wrong).** Verified by DevOps on Compose v5.6.0: with plain `docker compose up -d --build`, Compose stops and replaces the old `app` *before* `migrate` runs; if `migrate` then fails the new app is left `Created` and the **site is down** (HTTP 000) while the schema is unchanged. Also verified: a first deploy with a broken migration makes `up` exit 1 and the app never starts; the failing migration file rolls back (per-file transactions — earlier files in the same run stay committed, so "schema unchanged" holds per migration file, not per deploy); on a dev-pushed database `migrate` fails in a bounded way after ~300 s (timeout) with exit 1 and the app never starts.
- **Documented default runbook (an owner-changeable default): the gated sequence.** `docker compose -f docker-compose.prod.yml build`, then `docker compose -f docker-compose.prod.yml run --rm migrate` (on failure it exits 1 and the old app container is untouched — verified: `/` still 200), then `up -d`. Plain `up -d --build` is acceptable only for a first deploy or when downtime on a failed migration is acceptable. The owner may choose a different default. **Unverified**: whether Compose skips recreating `app` when a migration-only change leaves the app image identical.
- After a host reboot `app` and `postgres` restart under `unless-stopped`; `migrate` is not re-run (the image/schema pair was validated at the last `up`).
- Every pull request that touches a collection field now needs a migration; forgetting one fails the continuous integration drift check.

**Not done here, by design**: automatic rollback; backup automation (Milestone 54); health checks (Milestone 53); advisory locking for concurrent migrators (single host, single migrate run); data backfills; converting the hand-written types to generated ones.

**Verified (2026-10-11)**: by the Full-Stack run — the initial migration applies to an empty PostgreSQL with `NODE_ENV=production`; a second run is a no-op; the `pg_dump --schema-only` of the migrated database is identical (399 lines, sorted, excluding pg_dump's `\restrict` tokens) to that of a dev-push (`npm run seed`) database; a broken migration over a migrated database exits 1 and leaves the schema unchanged; a non-interactive `payload migrate` on a dev-pushed database hangs (Context 4). Independently by quality assurance on real stacks (Dockerfile `migrate` target and compose wiring) — fresh-volume bootstrap with no seeding (migrate exit 0, then app; all storefront routes 200, unknown category 404); an idempotent second `up`; a database one version behind applies only the new migration at batch 2; a broken migration on a first deploy gives migrate exit 1, the app never starts, the failing file is rolled back and earlier files in the same run stay applied; a dev-pushed `batch = -1` database fails closed after the 300 s timeout with exit 1; an empty migrations directory makes the verifier print a friendly message and exit 1; a gated redeploy keeps the old app serving while plain `up -d --build` takes the site down; migrated vs dev-push `pg_dump --schema-only` identical; the image carries no `PAYLOAD_SECRET`/`DATABASE_URI` env or placeholder values; the app runs as uid 1000. The Architecture Decision Record 033 items that were pending here are now implemented and verified (see Architecture Decision Record 033). **Still pending**: the new continuous integration job on a real GitHub runner.

**Known limitation**: the 300 s cap also kills a legitimately slow migration (rollback and a failed deploy). A future long backfill needs a way to raise it (for example a `MIGRATE_TIMEOUT` setting); none exists yet.

---

## Architecture Decision Record 033: Cloudflare Tunnel is the origin boundary — and production environment validation is a deploy gate (Milestone 52)

**Status**: **Accepted and implemented (Milestone 52)** (2026-10-11; open items listed under Verified) — decided by the project owner (restrict the origin to Cloudflare traffic with a Cloudflare Tunnel: `cloudflared` as a compose service, the app publishing no host port; secure environment validation for production). Resolves the launch-blocking requirement recorded against Milestone 52 (security review of Milestone 36, 2026-10-09). Compatible with [Architecture Decision Record 015](#architecture-decision-record-015-initial-production-infrastructure-baseline) (Cloudflare Free in front of a single virtual private server; Tunnel is available on the Free plan and keeps the application host-agnostic). It replaces the *means* the Milestone 52 plan text suggested ("virtual private server firewall or reverse-proxy allowlist") — that text is plan wording, not an Architecture Decision Record. The `cloudflare/cloudflared` container image is a new runtime dependency, recorded here.

**Context**:

- IP rate limits on order placement and lookup (`lib/client-ip.ts`) read `cf-connecting-ip`, falling back to the first `x-forwarded-for` entry. Both are client-controlled unless only Cloudflare can reach the origin.
- Milestone 50 publishes the app on loopback only because Docker-published ports bypass `ufw`/`INPUT` rules (they need the `DOCKER-USER` chain), so a host-firewall allowlist is fragile, and Cloudflare's address ranges drift.
- **Cloudflare's header behaviour matters.** The edge *sets* `CF-Connecting-IP` (a client-supplied value is overwritten). It does **not** sanitise `X-Forwarded-For`: it appends to a client-supplied value, so the *first* entry stays attacker-controlled even through Cloudflare (documented Cloudflare behaviour; to be confirmed by quality assurance with a crafted request once a real tunnel exists).
- Next.js rejects a Server Action whose `Origin` host differs from the request's `X-Forwarded-Host`/`Host`. cloudflared preserves the visitor's `Host` header unless an "HTTP Host Header" override is configured on the public hostname.

**Decision**:

1. **`cloudflared` runs as a service in `docker-compose.prod.yml`**, a remotely-managed tunnel run with `TUNNEL_TOKEN`. The image tag is pinned to an exact version (no `latest`). Ingress (public hostname → `http://app:3000`) is configured in the Cloudflare dashboard, not in the repository; the "HTTP Host Header" override must stay **unset**. `cloudflared` starts after `app`.
2. **No service publishes a host port.** `app` and `postgres` have no `ports:`; the only internet-facing component is `cloudflared`, whose connection is outbound-only. `APP_BIND`/`APP_PORT` are removed from the production compose file (they remain in the dev one).
3. **Two networks**: `backend` (`internal: true`: `postgres`, `migrate`, `app`) and `edge` (`app`, `cloudflared`). `cloudflared` — which holds the tunnel credential and runs a third-party binary — cannot reach the database, and nothing else is on the network `cloudflared` shares with the app.
4. **What this guarantees, and what it does not.**
   - *Guarantees*: no packet from the public internet or the host's other interfaces can reach port 3000 except through Cloudflare's edge; `cf-connecting-ip` as received was written by Cloudflare, not by the visitor.
   - *Does not guarantee*: (a) that `x-forwarded-for` is trustworthy (see Context); (b) anything about other containers on a shared network — hence decision 3 and a rule that no further service joins `edge`; (c) protection from anyone with a shell on the virtual private server or the Docker socket; (d) that the header is present — if a zone enables Cloudflare's "Remove visitor IP headers" managed transform, `cf-connecting-ip` disappears; (e) anything if a second ingress to the app is ever added (a published port, another tunnel route, another network member) — every such change needs an Architecture Decision Record; (f) protection of `/admin` itself (Access/WAF is out of scope).
5. **`lib/client-ip.ts` is tightened**: in production it trusts **only** `cf-connecting-ip`, and only if it parses as an IP address; `x-forwarded-for` is ignored; a missing/invalid header yields the shared `'unknown'` key (fails closed — a stricter limit, never a bypass). Outside production its behaviour is unchanged, so dev and the Playwright job are unaffected. The stale "tracked for Milestones 49 to 52" comment is rewritten to state the real condition.
6. **Server Actions behind the tunnel**: because the `Host` header is preserved, `experimental.serverActions.allowedOrigins` is *not required*. It is nevertheless set to the host of `NEXT_PUBLIC_SITE_URL` as a precaution, because a mismatch would silently break checkout and cannot be tested in the sandbox; this admits only the site's own origin.
7. **Production environment validation is a deploy gate** (`scripts/check-env.ts`, run first by the `migrate` service, so an invalid environment stops the stack before the database is touched; it prints the *names and rules* that failed, never values):
   - `PAYLOAD_SECRET` — required, ≥ 32 characters, no whitespace, ≥ 12 distinct characters, and not a known placeholder (contains `dev-only`, `placeholder`, `changeme`, `example`, `ci-only`).
   - `POSTGRES_PASSWORD` — required, ≥ 16 characters, only `A–Z a–z 0–9 - . _ ~` (it is interpolated unencoded into `DATABASE_URI`; the Milestone 50 quality assurance finding).
   - `DATABASE_URI` — required, `postgres://` or `postgresql://`, parses as a URL, non-empty host, user, database and password, and the password in the URI equals `POSTGRES_PASSWORD` (catches a mangled interpolation).
   - `NEXT_PUBLIC_SITE_URL` — required, `https:`, a bare origin (no path, query, credentials), host not `localhost`, `127.*`, `::1`, `0.0.0.0` or a private range.
   - `TUNNEL_TOKEN` — required, enforced by compose (`${…:?…}`); it is passed **only** to `cloudflared`, so the validator never sees it and its contents are not checked beyond non-empty.
   The strict rules are **not** placed in `payload.config.ts`: that file is also loaded by `next build`, by the seed script and by the continuous integration Playwright job, which runs `next start` with `NODE_ENV=production` and deliberately weak, throwaway values. `payload.config.ts` keeps its existing `PAYLOAD_SECRET` presence check. The Dockerfile's existing `CMD` presence checks remain as a second line for non-compose runs.

**Alternatives considered and rejected**:

- *Host firewall allowlist of Cloudflare ranges* — Docker bypasses `ufw`; needs `DOCKER-USER` rules; ranges change.
- *Reverse proxy (nginx/Caddy) publishing 80/443 with a Cloudflare-range allowlist* — still an open public port, needs origin certificates and range upkeep; any other Cloudflare customer's traffic also originates from those ranges unless Authenticated Origin Pulls (mTLS) is added.
- *Authenticated Origin Pulls alone* — viable and stronger than an allowlist, but keeps a public origin port and certificate management; Tunnel removes the port.
- *Locally-managed tunnel (`config.yml` + credentials JSON)* — two secret files to place and rotate; the token is one value in the existing mode-600 env file.
- *`cloudflared` on the host, outside Docker* — contradicts "everything runs in Docker".
- *Percent-encoding `POSTGRES_PASSWORD` into `DATABASE_URI`* — Compose interpolation cannot encode; building the URI in code would also change how `DATABASE_URI` ([Architecture Decision Record 010](#architecture-decision-record-010-the-postgresql-connection-string-is-named-database_uri)) is consumed. A charset rule is simpler and equally strong for generated secrets.

**Consequences**:

- The site depends on Cloudflare's availability and on `TUNNEL_TOKEN`, which grants the ability to run the tunnel: keep it in the mode-600 env file, never commit it, and rotate it in the Cloudflare dashboard if exposed.
- The host can no longer `curl localhost:3000`; operators use `docker compose exec app wget -qO- http://127.0.0.1:3000/` until Milestone 53 adds a healthcheck. After Milestone 53, `cloudflared` should depend on `app` being healthy rather than merely started.
- `cloudflared` has to be validated in the real environment; in a sandbox it can only be configured and observed failing to authenticate with a dummy token.
- Required one-time Cloudflare steps for the owner (not automatable here): create the tunnel, copy its token, add the public hostname → `http://app:3000` with no Host-header override, keep "Remove visitor IP headers" off, and create the first `/admin` user **before** attaching the hostname.
- `.env.example` must document `TUNNEL_TOKEN`, the secret strength rules and the `POSTGRES_PASSWORD` charset (Milestone 52).

**Not done here, by design**: Cloudflare Access or WAF rules in front of `/admin`; Authenticated Origin Pulls; exposing `cloudflared` metrics; multiple replicas or a second tunnel connector; rate-limit storage beyond the in-process map (Architecture Decision Record 026).

**Verified by quality assurance on real stacks (2026-10-11), with a dummy token**: in the compose file no service publishes ports; `app` and `cloudflared` share `edge` only; `backend` is internal; `TUNNEL_TOKEN` reaches only `cloudflared`; each required variable, when missing, errors by name. On a full stack from fresh volumes: `check-env` OK, then migrations, then `app` answers 200 for `/`, `/shop`, `/admin`, `/cart`, `/orders` from a container on `edge`; the host cannot reach `app` or `postgres` by a published port; `edge` cannot reach `postgres`; five negative `check-env` cases fail closed, naming variables and never values, and `app`/`cloudflared` never start. In the production image, driven by a replayed real browser Server Action POST: with a valid `cf-connecting-ip` each IP has its own rate-limit bucket; `x-forwarded-for` does not partition; an invalid `cf-connecting-ip` shares the `'unknown'` bucket. `allowedOrigins` is present, a matching `Origin` passes and mismatches are rejected. The first-admin runbook works and first-register is refused (403) once a user exists. The Playwright end-to-end reproduced 12/12 and the Milestone 52a regression passed.

**Not verified (needs a real tunnel or runner)**: Cloudflare's real overwrite of `CF-Connecting-IP` and append to `X-Forwarded-For` (the sandbox has no DNS for `argotunnel.com`, so `cloudflared` failed at edge discovery, not at authentication); token masking in `cloudflared` logs (observed masked for the cases tried only); a healthy `cloudflared` healthcheck; a GitHub runner run; whether a token refresh drops old connectors; an order placed through the public hostname.

**Discovered in implementation (decisions and consequences)**:
- `check-env` runs first in the migrate chain, so `migrate` needs `POSTGRES_PASSWORD` and `NEXT_PUBLIC_SITE_URL` as runtime environment. It skips outside `NODE_ENV=production` (low risk; documented).
- The shared `'unknown'` bucket can self-DoS checkout if the header is absent (misconfiguration, or the "Remove visitor IP headers" transform). That is the intended fail-closed trade-off.
- IPv6 clients are keyed by their /64 prefix, implemented in `lib/client-ip.ts` (`normalizeIp`): IPv4 unchanged; IPv6 keyed as `xxxx:xxxx:xxxx:xxxx::/64` (compressed, expanded and uppercase forms are equal); IPv4-mapped addresses (dotted and hex forms) are keyed as the IPv4 address; zoned, bracketed, whitespace-padded and garbage values become `'unknown'`; `::` and `::1` share one bucket. Quality assurance verified: a 100,000-form randomised property test with 0 violations; same-/64 addresses with different host bits share a bucket and different /64s do not; and a replayed real-browser Server Action POST against the rebuilt production image (22 varying host bits in one /64 gave 20 allowed, then limited; `::ffff:9.9.9.9` and `9.9.9.9` share a bucket; `x-forwarded-for` does not partition; garbage or zoned `cf-connecting-ip` shares the `'unknown'` bucket).
- The `check-env` rules are stricter than first specified: the placeholder deny list covers both `PAYLOAD_SECRET` and `POSTGRES_PASSWORD` (words including `replace`, `example`, `password`), and the password needs at least 10 distinct characters. `NEXT_PUBLIC_SITE_URL` host rejections additionally cover mapped IPv6, trailing-dot `localhost`, `.local`/`.internal`/`.lan`/`.home.arpa`, single-label hosts and CGNAT ranges.
- `cap_drop: ALL` and `no-new-privileges` apply to `app`, `migrate` and `cloudflared`. `postgres` is not hardened. `read_only` is untested (Milestone 53).
- `edge` is an ordinary NAT bridge, so `app` has outbound access (as intended in decision 3).
- `cloudflared` is pinned by tag `2026.10.0` (exists on Docker Hub; digest `sha256:9b49eed8f62806d5d45ddf59ecefb5710429598ea6d3fcccd2af938f621b2b07`), not by digest.
- `.env.example` was un-updated when this Architecture Decision Record was written (access was denied in the authoring session); **it was updated by the Milestone 52b batch (2026-10-11)**.

**RESOLVED by [Architecture Decision Record 036](#architecture-decision-record-036-strict-turnstile-policy-idempotent-orders-no-victim-lock-out-a-closed-first-admin-window-separate-database-roles-and-interim-nextjs-mitigations-milestone-52b-security-batch) decision 5 (2026-10-11): the window is closed in code and the first admin is created from a secret; the text below is the original finding.** ~~OPEN OWNER DECISION — first-admin window (a launch gate, not built)~~: an unauthenticated `POST /api/users/first-register` creates an admin while the `users` collection is empty. The runbook covers a first deploy, but not a database wipe or restore, after which the endpoint is open to anyone who can reach the hostname. Options: an explicit short-lived `ALLOW_FIRST_REGISTER` production flag enforced in a `Users` hook; seeding the first admin from a secret; or a Milestone 53 "users empty" readiness signal. Until chosen, the hostname must not be attached to a database that has no admin user.

---

## Architecture Decision Record 034: Image optimisation under Docker — Next's built-in optimizer, WebP only, local media only (Milestone 51)

**Status**: **Accepted (2026-10-11)** as the implementation of Milestone 51. **Superseded in part by [Architecture Decision Record 036](#architecture-decision-record-036-strict-turnstile-policy-idempotent-orders-no-victim-lock-out-a-closed-first-admin-window-separate-database-roles-and-interim-nextjs-mitigations-milestone-52b-security-batch) (2026-10-11): the optimizer is switched off again (`images.unoptimized: true`) and `/_next/image` is closed until Next.js is upgraded past its critical image-optimizer advisories.** The text below describes the design as Milestone 51 built it. Reverses no Accepted Architecture Decision Record; it replaces the inherited `images.unoptimized: true` that [Architecture Decision Record 008](#architecture-decision-record-008-dockerize-app-cms-and-database-for-both-dev-and-production) and [Architecture Decision Record 030](#architecture-decision-record-030-mobile-performance-configuration--blocking-metadata-for-every-user-agent-media-cache-headers-and-what-milestone-45-deliberately-did-not-change) left in place for Milestone 51. The configuration was still being finished when this Architecture Decision Record was written; the values below are those present in `next.config.mjs` at that time, and anything marked pending is not yet in the file.

**Decision** (`next.config.mjs`, `images`):

- `unoptimized` removed; the built-in `/_next/image` optimizer is used. Product images are resized and re-encoded by sharp.
- `formats: ['image/webp']` only. AVIF encodes several times slower for a few percent smaller files — the wrong trade on a ~$10 single-vCPU virtual private server ([Architecture Decision Record 015](#architecture-decision-record-015-initial-production-infrastructure-baseline)). Revisit only behind a CDN cache.
- **Local media only, no `remotePatterns`**: `localPatterns: [{ pathname: '/api/media/file/**', search: '' }]` (Payload serves uploads there; [Architecture Decision Record 020](#architecture-decision-record-020-media-storage-backend-is-a-local-docker-volume-for-v1-with-cloudflare-r2-as-the-designated-successor)). Any other source is a 400. SVG stays off (`dangerouslyAllowSVG` default).
- Closed variant space: `imageSizes: [64, 128, 256, 384]`, `deviceSizes: [640, 828, 1080]`, `qualities: [75]` (at most 7 widths × 1 quality per source; any other `w`/`q` is a 400), `minimumCacheTTL: 86400` (matches the Milestone 45 one-day media rule, so a replaced image still appears within a day).
- Runtime: the standalone image uses Next's vendored sharp 0.34.5 with the musl binary. The root `sharp` 0.35 dependency is traced into the production image only as a wasm32 stub, so it is effectively unused at runtime there — a cleanup question for the owner, not changed here.
- The optimizer cache lives in `.next/cache/images` inside the container layer, is uncapped in Next 15.4, and is cold after every recreate. Persistence and a read-only filesystem belong to Milestones 54 and 53.

**Discovered in implementation**:

- *Cache-variant explosion.* A security review found that `localPatterns` with `search: ''` cannot bound the cache: `hasLocalMatch` ignores a `#fragment` and an empty `?`, the cache key hashes the raw `url` string, and Payload decodes `%2e`, `;x` and similar spellings to the same file — so `#fragment`, `?`, `;`, double-slash or `%00` variants can mint unlimited cache entries for one file. Final configuration: `localPatterns: [{ pathname: '/api/media/file/*', search: '' }]` (one segment only) **plus a `rewrites()` `beforeFiles` rule** that sends any `/_next/image` request whose `url` is not exactly `/api/media/file/` followed by one canonical Payload filename segment to a 404 (`/_next/static/image-url-rejected`) *before* the optimizer runs. **Trade-off**: the rule duplicates Payload's URL-encoding rules, so if Payload's media URL format ever changed, legitimate images would 404 (it fails closed to broken images, not to cache growth). A small continuous integration end-to-end assertion that a seeded image's rendered `/_next/image` URL returns 200 is recommended; it is not built (a candidate Milestone 56a follow-up for the owner).
- *Input size.* Next's default maximum input is about 268 megapixels, so one huge admin upload could exhaust the memory of a small virtual private server. `experimental.imgOptMaxInputPixels: 40_000_000` is configured; larger images fall back to the original file (tested with a 54 MP upload: 200 with the original, no crash).
- Open Graph and JSON-LD image URLs deliberately stay the original absolute media URLs.
- Cloudflare does not cache `/_next/image` by default; any cache rule must include `Accept` in the cache key (the response varies on it).
- `/_next/image` is a public, CPU-bound endpoint with no application-level rate limit. A Cloudflare rate-limiting rule is recommended; none is built.

**Verified by quality assurance on a real production stack**: a 2.1 MB JPEG became 36 KB WebP at `w=640` and a 4.0 MB PNG became 72 KB; response headers `Cache-Control: public, max-age=86400, must-revalidate`, `Vary: Accept`, and a CSP `sandbox`; MISS then HIT; 25 abusive requests all 400; storefront pages render `srcset`/`sizes` with every image 200; real Chromium on a Pixel 7 profile and at 320 px: images complete, `naturalWidth > 0`, CLS 0; end-to-end 12/12; the cache directory is writable as uid 1000 under `cap_drop: ALL`.

**Verified by the Full-Stack engineer on `next build` + `next start`**: the abuse set (`#fragment` variants, empty `?`, `?x=1`, `;x=1`, `//`, trailing slash, `%2e`/`%6c` respellings, lower-case hex, dot-segments, external host, backslash) returned 404/400 and the cache directory did not grow (17 files before and after); legitimate odd filenames (spaces, `é`, `+&#()`, upper case) still returned 200 WebP; the 54 MP upload case above. 

**Verified by quality assurance on the rebuilt Docker production image and the production compose stack (fresh volumes, dummy tunnel token) — passed**: the rewrite is active under `standalone` (`routes-manifest` contains `image-url-rejected`). 17 real uploaded files (plain, spaces, é/à, `a+b&c=d%e#f(1).jpg`, upper case, a 180-character name, Urdu `تصویر_لیمپ.jpg`, Japanese, `-1`/`-2` dedupes, `'()[]!~;,@$`, `100%25.jpg`) produced 112 distinct `/_next/image` URLs across 9 storefront pages, all 200 WebP, plus 119 direct requests (17 files × 7 widths) with 0 failures — the rule wrongly rejected nothing. An abuse set of about 45 variants (`#frag`, `?`, `?x=`, `;x=`, `//`, trailing slash, double-encoded `%252e`, lower-case hex, dot-segments, traversal, spaces, unencoded non-ASCII, external/self-absolute URLs, missing/empty/duplicated `url`) returned 404 (rewrite) or 400 (optimizer), and `/app/.next/cache/images` stayed at 119 files. Percent-escape respellings of unreserved characters (`%2e`, `%6c`) return 200 but resolve to the same canonical URL and cache key, so they create no entry. A 54 MP (9000×6000, 18.6 MB) JPEG caused no crash or OOM (RestartCount 0, about 214 MiB) and was served as the original at every width; a 30 MP image is optimised (33 KB at `w=1080`). Rejected requests are cheap (rewrite 404 about 5.4 KB HTML in 5–14 ms; optimizer 400 27–55 B). Headers `Cache-Control: public, max-age=86400, must-revalidate` + `Vary: Accept`, and HIT on repeats; `og:image` and JSON-LD unchanged; the cache directory is writable as uid 1000 with `cap_drop: ALL` and `no-new-privileges`; real Chromium (Pixel 7 and 320 px): images complete, `naturalWidth > 0`, 29/29 optimizer responses 200; `type-check`, `lint` and `build` pass; end-to-end reproduction 12/12.

**Minor open items**: (a) each width of an image over 40 MP caches a full copy of the original (the 54 MP file: 7 × 18.5 MB, about 130 MB of cache) and mobile downloads the 18.6 MB original for a 64 px thumbnail — cap upload dimensions/size in admin (owner, later; Milestones 53 and 54 or admin config). (b) `%00` passes the rewrite (a valid upper-case escape) and returns 400, but Payload logs a multi-line `TypeError` stack for it; it is unauthenticated, cheap and creates no cache entry — excluding `%00`/control characters in the rule would remove the noise (not done). (c) Rewrite 404s return the full HTML not-found page (about 5.4 KB) rather than a tiny body. (d) quality assurance saw a footer layout shift (CLS 0.5–0.69) on `/categories` in a long browsing sequence, originating from the footer appearing, not from images; nine fresh direct loads showed none. It is not tied to Milestone 51 and is flagged for separate investigation.

**Not verified**: real Cloudflare behaviour in front of `/_next/image`; cache persistence across a container recreate; AVIF (deliberately off).

---

## Architecture Decision Record 035: Cloudflare Turnstile on order placement and lookup, a per-phone order limit, and a per-IP flood ceiling — CGNAT-safe rate limits (Milestone 52b)

**Status**: **Accepted (2026-10-11); AMENDED the same day by [Architecture Decision Record 036](#architecture-decision-record-036-strict-turnstile-policy-idempotent-orders-no-victim-lock-out-a-closed-first-admin-window-separate-database-roles-and-interim-nextjs-mitigations-milestone-52b-security-batch) on the owner's direction.** Where this Architecture Decision Record and Architecture Decision Record 036 disagree, Architecture Decision Record 036 wins; the disagreements are: the *degraded* outcome and the "outage policy" below no longer exist (a token is required, an unreachable Cloudflare refuses the order), hostname/action mismatches are `rejected` again, the phone limits are keyed by phone *and IP*, and the per-IP degraded buckets are gone. The original text is kept as the record of the first design — the design was approved by the owner: (1) Cloudflare Turnstile verified on the server for order placement and order lookup; (2) a limit per normalised phone number, using the existing non-evictable `createBucketLimiter`; (3) the per-IP limit raised to a flood ceiling; (4) the **outage policy (an owner decision)**: if Turnstile cannot be reached, fall back to today's strict per-IP limit so sales keep running; no new npm packages. The owner left the remaining choices to the team; the ones below are the architect's. **This Architecture Decision Record amends** [Architecture Decision Record 026](#architecture-decision-record-026-orders-are-created-only-by-a-server-side-function--orders-collection-create-access-closes-to-admins) decision 6 (order creation is rate-limited by IP) and the rate-limit sentence of [Architecture Decision Record 024](#architecture-decision-record-024-guest-order-lookup-via-a-dedicated-ordernumber-phone-endpoint--orders-collection-access-stays-admin-only) (lookup is rate-limited by IP). It does **not** change `Orders` access (create and read stay admin-only), guest checkout ([Architecture Decision Record 005](#architecture-decision-record-005-guest-checkout-no-customer-accounts)) or cash-on-delivery-only ([Architecture Decision Record 004](#architecture-decision-record-004-cash-on-delivery-only-for-launch-architecture-stays-payment-extensible)). It adopts the alternative that Architecture Decision Record 026 recorded as *"CAPTCHA / bot challenge at checkout … Deferred, not rejected"*. It adds no npm dependency. It adds one third-party service, Turnstile, which comes from the provider already in the baseline ([Architecture Decision Record 015](#architecture-decision-record-015-initial-production-infrastructure-baseline), [Architecture Decision Record 033](#architecture-decision-record-033-cloudflare-tunnel-is-the-origin-boundary--and-production-environment-validation-is-a-deploy-gate-milestone-52)).

**Context**:

- Today `placeOrder` (`app/(public)/cart/actions.ts`) allows **5 orders per 15 minutes per client IP** (`rateLimit('place-order:${ip}')`). `lookupOrderAction` allows 20 lookups per hour per IP, plus 5 *failed* lookups per hour per order number (a bucket limiter).
- Pakistani mobile carriers put many subscribers behind one public IPv4 address (carrier-grade NAT, CGNAT). Many real customers then share one IP key, and 5 orders in 15 minutes blocks real buyers. `docs/DEPLOYMENT.md` ("Rate limits in the real world") already flagged this. [Architecture Decision Record 033](#architecture-decision-record-033-cloudflare-tunnel-is-the-origin-boundary--and-production-environment-validation-is-a-deploy-gate-milestone-52) made the IP *trustworthy* (only a valid `cf-connecting-ip` is used; IPv6 is keyed by /64; a missing or invalid header gives `'unknown'`). It does not stop customers *sharing* an IP.
- The IP cannot tell one customer from many. The fix needs two other signals: one that each request came from a real browser that passed a challenge (Turnstile), and a key for each customer (the phone number, already stored in its one canonical form `03XXXXXXXXX` by `normalizePhone()`, [Architecture Decision Record 029](#architecture-decision-record-029-pkr-display-format-and-pakistani-guest-checkout-validation-rules-milestones-55-and-56)).
- **Research caveat**: this Architecture Decision Record was written without web access. The Turnstile facts it relies on come from the architect's knowledge of Cloudflare's documentation and are listed under *UNVERIFIED* below. The design does not depend on any of them being exact: every uncertain response is handled by the fallback described in decision 2.

**Decision**:

1. **Order placement runs in this order (cheapest check first).** Implemented in `placeOrder` plus a new `lib/order-guard.ts`:
   1. **Phone shape.** `phone = normalizePhone(input.customer.phone)`. If `validatePhone(phone)` fails, return `createOrder(input)` at once. That call is certain to fail *before any database access*, because `createOrder` runs all its validation before its first `getPayload()` call. This step touches no limiter, uses no Turnstile token and makes no network call. It follows the existing rule in `lookupOrderAction`, where malformed input never reaches a limiter key or the database. The ordering inside `createOrder` is now a documented invariant.
   2. **Per-IP flood ceiling**: 30 requests per 15 minutes on `place-order:${ip}` (`rateLimit`). It counts **every** request that reaches this step, whatever the Turnstile outcome, so siteverify calls and database work per IP stay bounded.
   3. **Turnstile verification** (decision 2) gives exactly one of three outcomes: `verified`, `rejected` or `degraded`.
      - `rejected` → return `VERIFICATION_FAILED` at once. A rejected request **never** falls through to the degraded path, never touches a phone bucket and never reaches `createOrder`.
      - `degraded` → apply today's strict limit, **5 per 15 minutes**, under a **separate** key `place-order-degraded:${ip}`. Requests without a token therefore cannot use up the budget of verified customers on the same IP. Over the limit → `RATE_LIMITED`.
      - `verified` → no further IP limit beyond the flood ceiling.
   4. **Per-phone limits apply to verified orders only** (*amended 2026-10-11 after the security review; the first draft applied them on both paths*). There are two bucket limiters keyed by the normalised phone: **3 per hour** and **10 per 24 hours**. A slot is reserved in each before `createOrder` and refunded when `createOrder` returns `ok: false` or throws, so **only successful verified orders count**. Degraded orders reserve **no** phone slot; the per-IP degraded budget of 5 per 15 minutes is what bounds them. Why: if degraded orders counted, anyone who knows a customer's phone number could block that customer for a day by sending tokenless orders. Counting attempts instead of successes was rejected for the same reason, and because an out-of-stock cart, a typo or a server error would use up a genuine customer's budget. If the daily reservation is denied, the hourly one is released first. A refusal logs `[order-guard] phone-limit` at warning level, with no phone number.
   5. `createOrder(input)` runs unchanged.
2. **Classifying the Turnstile result** (`lib/turnstile.ts`). The rule: **`degraded` must never be better than sending no token at all.** That makes it safe to send every uncertain result to `degraded`. `rejected` is used only when the token is definitely bad.
   - **Before any network call**:
     - token not a string, or empty after trimming → `degraded` (`missing-token`).
     - token longer than 2048 characters → `rejected` (`malformed-token`); no widget produces one.
     - `TURNSTILE_SECRET_KEY` unset → `degraded` (`not-configured`, logged as an error).
     - the secret is a Cloudflare test key and `TURNSTILE_ALLOW_TEST_KEYS !== '1'` → `degraded` (`test-key-not-allowed`, logged as an error). A test secret accepts the public dummy token, so allowing it in production would be a bypass.
     - the secret is real but the expected hostname cannot be derived from `NEXT_PUBLIC_SITE_URL` → `degraded` (`not-configured`).
   - **`verified`** when the HTTP status is 200, the JSON body has `success === true`, and either the secret is an allowed test key (action and hostname are not checked, because test responses do not carry ours) or `action === <expected action>` and `hostname` (lower-cased) equals the hostname of `NEXT_PUBLIC_SITE_URL`.
   - **`rejected`** only when the HTTP status is 200, `success === false`, and `error-codes` contains `invalid-input-response` (`invalid-token`) or `timeout-or-duplicate` (`expired-or-duplicate`). If one of these codes appears with others, it decides the outcome.
   - **`degraded`, logged at error level**, when `success === true` but the `action` or `hostname` does not match (`action-mismatch`, `hostname-mismatch`). *Amended 2026-10-11 after the security review; the first draft rejected these.* A mismatch almost always means a misconfiguration (a wrong site URL, or a site key used on another hostname). Rejecting would turn that misconfiguration into a total checkout outage. Degrading costs nothing in security, because degraded is never better than sending no token.
   - **`degraded`** in every other case:
     - network error (`network`).
     - the 3-second timeout fires (`timeout`).
     - an HTTP status other than 200 (`http-status`).
     - a body that is not JSON, a `success` that is not a boolean, or `success: true` without string `action`/`hostname` (`bad-response`).
     - `success: false` with only other codes, such as `internal-error`, `bad-request`, `missing-input-response`, `invalid-input-secret`, `missing-input-secret` or unknown codes (`service-error`; the two secret codes are logged as errors).
   - A rejected visitor can resend without a token and land on `degraded`. That is intended: it gets them exactly today's budget, never more.
3. **Calling siteverify**: `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` with a form-encoded body (`URLSearchParams`), using the built-in `fetch` with `cache: 'no-store'`, `redirect: 'error'` (a redirect is never followed; it ends as `degraded`) and `signal: AbortSignal.timeout(3000)`. The timeout also covers reading the body. The response body is read only up to a fixed size cap; anything larger is `degraded` (`bad-response`). *Added 2026-10-11 after the security review*: at most **50 siteverify calls run at once, across the whole process**. A request beyond that is `degraded` (`busy`) without any network call, so a flood during a slow Cloudflare response cannot pile up pending calls. **No retries, and therefore no `idempotency_key`.** A retry would double the worst-case wait during an outage, and degrading already keeps sales running; adding a retry later requires `idempotency_key`. The body holds exactly `secret`, `response` and, when known, `remoteip`. **`remoteip` is the raw `cf-connecting-ip` and is sent only in production and only if it parses as an IP address** (the same validation as `normalizeIp`). It is never the `/64` key and never `'unknown'`; otherwise it is left out. `cdata` is not used. **No customer data (name, phone, address, cart) is ever sent to Cloudflare.** The verify URL is a constant in the code. It is **not** configurable through an environment variable, because a misconfigured or attacker-influenced URL that answers `success: true` would bypass the check. Tests replace `fetch` through a dependency-injection seam instead (decision 9).
4. **Order lookup** (`lookupOrderAction`) follows the same pattern:
   - A malformed order number still returns `lookupOrder(input)` at once (unchanged: no limiter, no database).
   - Then the flood ceiling: **60 per hour** on `lookup-ip:${ip}` (raised from 20, counts every request).
   - Then Turnstile with action `order_lookup`. `rejected` → `VERIFICATION_FAILED`. `degraded` → **20 per hour** on a separate key `lookup-degraded:${ip}` (today's per-IP value).
   - Then the existing **per-order-number cap of 5 failed lookups per hour**, unchanged and applied on every path: reserved before the query, kept only on `NOT_FOUND`.
   - There is no per-phone limit on lookup. The order-number cap is what stops someone guessing phone numbers.
5. **Limits** (constants exported from `lib/order-guard.ts`; changing them is a code change, not configuration):

   | Path | Key | Mechanism | Limit | What counts |
   |---|---|---|---|---|
   | Placement flood ceiling | `place-order:${ip}` | `rateLimit` | 30 / 15 min | every request with a well-formed phone |
   | Placement, degraded | `place-order-degraded:${ip}` | `rateLimit` | 5 / 15 min | every degraded request |
   | Per phone, hourly | normalised phone | `createBucketLimiter` | 3 / 60 min | successful orders |
   | Per phone, daily | normalised phone | `createBucketLimiter` | 10 / 24 h | successful orders |
   | Lookup flood ceiling | `lookup-ip:${ip}` | `rateLimit` | 60 / 60 min | every request with a well-formed order number |
   | Lookup, degraded | `lookup-degraded:${ip}` | `rateLimit` | 20 / 60 min | every degraded request |
   | Per order number (unchanged) | normalised order number | `createBucketLimiter` | 5 / 60 min | `NOT_FOUND` only |

   All limits are in-process and reset on restart. That is acceptable under Architecture Decision Record 015's single instance, unchanged from Architecture Decision Record 026.
6. **Errors returned to the client.** Failure messages never echo the submitted values:
   - The result types gain a new code, `VERIFICATION_FAILED`: `"The security check didn't complete. Please wait for it to finish, then press Place Order again."`. Lookup uses the same text with "Check order".
   - `RATE_LIMITED` stays the code for every limiter refusal, each with its own message:
     - flood ceiling (placement): today's message, *"Too many orders from your connection. Please try again in about N minute(s)."*
     - degraded limit (placement): *"We couldn't complete the security check, and too many orders have come from your connection. Please reload the page and try again, or wait about N minute(s)."*
     - per-phone limit: *"Too many orders have been placed with this phone number recently. Please try again later or contact the store."* (The exact wording is in the code; it must tell the customer to contact the store.)
     - lookup: today's message for all lookup limits.
7. **Configuration**:
   - **`TURNSTILE_SECRET_KEY`** is a runtime secret. It is given to `app`, and to `migrate` so that `check-env` can validate it (the same pattern as `PAYLOAD_SECRET`). Both are required in `docker-compose.prod.yml` with `:?`.
   - **`NEXT_PUBLIC_TURNSTILE_SITE_KEY`** is public and inlined into the bundle at build time. It is a Dockerfile `ARG` in the `builder` stage (empty by default, with a build warning when empty, like `NEXT_PUBLIC_SITE_URL`) and a compose build arg (`:?`) for `app` and `migrate`. It is also passed to `migrate` as a runtime variable for `check-env`. Changing it means rebuilding.
   - **`TURNSTILE_ALLOW_TEST_KEYS`** is used only in development and continuous integration. `docker-compose.prod.yml` never passes it.
   - **`scripts/check-env.ts` (production) adds**:
     - `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: each required, no whitespace, a plausible length (secret 20–200 characters, site key 10–100), not a Cloudflare test key, and no placeholder word.
     - The two keys must differ (catches a copy-paste mistake).
     - `TURNSTILE_ALLOW_TEST_KEYS` must be unset or empty.
     - A test key is recognised by `isTurnstileTestKey()` (`/^[0-9]x0{10,}[A-Za-z]{2}$/`), exported from `lib/turnstile.ts` and shared by `check-env` and the runtime check. The real key format is UNVERIFIED, so no prefix rule is applied.
   - **Development with no keys**: no widget is rendered and every request is `degraded`, which is exactly today's behaviour. To exercise the widget locally, use Cloudflare's always-pass test keys together with `TURNSTILE_ALLOW_TEST_KEYS=1`.
8. **The client** (a new `components/TurnstileWidget.tsx`, `'use client'`, used only by `components/OrderSummary.jsx` and `app/(public)/orders/OrderLookup.tsx`):
   - **Loading.** The script `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` is injected lazily on mount, once per page load (a module-level promise), with a 10-second cap on loading. It is never added to a layout, so **no indexable page loads it**: `/cart` and `/orders` are both `noindex` ([Architecture Decision Record 007](#architecture-decision-record-007-search-engine-optimization-first-and-mobile-first-are-default-requirements-not-a-later-pass) is unaffected). The script is never self-hosted or proxied.
   - **Rendering.** Explicit render with these options:
     - `sitekey`, and `action` (`place_order` or `order_lookup`).
     - `appearance: 'interaction-only'`, so most visitors see nothing.
     - `size`: `'compact'` when the container is narrower than 300 px, otherwise `'flexible'`, so the 320 px no-overflow test keeps passing.
     - `theme: 'light'`, `language: 'auto'`, `refresh-expired: 'auto'`, and the callbacks `callback`, `expired-callback`, `error-callback` and `timeout-callback`.
     - On unmount the widget is removed with `turnstile.remove`.
   - **State.** The component reports `{ token, status }`, where `status` is one of `'disabled'` (no site key), `'loading'`, `'verified'` or `'failed'`. It sets `data-turnstile-status` on its container, which the tests use. A short `aria-live="polite"` status line reads *"Running a quick security check…"* while loading, and *"The security check couldn't load. You can still continue."* when it has failed.
   - **The submit button** is disabled only while `status === 'loading'`, for at most 10 seconds; after that the status becomes `'failed'`. **When the widget fails or is absent, submitting is still allowed** and the server degrades. That is the owner's outage policy, and it means no visitor is locked out by the widget alone.
   - **Token.** It is sent as `turnstileToken` in the server-action input. Tokens are single-use, so the widget is reset with `turnstile.reset` after every submission that does not navigate away (every failure and every thrown error).
   - **Language.** The store's copy is English. The widget follows the browser language; whether Urdu is offered is UNVERIFIED and does not affect the flow.
   - **CSP.** There is no CSP today (`next.config.mjs` sets none). If one is ever added, `/cart` and `/orders` must allow `script-src` and `frame-src` `https://challenges.cloudflare.com`.
9. **Code structure and test seams** (no new dependencies):
   - **`lib/turnstile.ts`** is pure. It never imports `next/*`, so `tsx` and `check-env` can import it. It exports:
     - `SITEVERIFY_URL`, `isTurnstileTestKey()`;
     - `createTurnstileVerifier(deps)`, where `deps` is `{ fetch, secret, allowTestKeys, expectedHostname, timeoutMs, verifyUrl }`;
     - `verifyTurnstile(token, { action, remoteIp })`, which reads the environment at call time.
   - **`lib/order-guard.ts`** exports:
     - `createOrderGuard({ verify, limits? })`, which builds fresh limiters per instance so tests are isolated;
     - a default instance, whose `admitPlaceOrder(...)` returns `{ ok: true, release }` or the failure;
     - `admitLookup(...)`, which returns `{ ok: true, settle(notFound) }` or the failure.
   - **`lib/client-ip.ts`** gains `selectVerifyIp(get, production)` and `getVerifyIp()`.
   - The two server actions remain thin: they read the IP, call the guard, then call `createOrder`/`lookupOrder`.
   - Unit tests use `tsx` and `node:assert`, like `check-env.test.ts`.
10. **Logging**:
    - One line per `rejected` or `degraded` outcome, except `missing-token`, which bots would make noisy: `[turnstile] <outcome>` with `{ action, reason }`.
    - Configuration reasons (`not-configured`, `test-key-not-allowed`, and the secret error codes) are logged at error level. Every other `rejected` or `degraded` reason is logged at warning level.
    - **Never logged**: the token, the IP, `remoteip`, the phone, any customer field, or Cloudflare's raw response.

**Alternatives considered and rejected**:

- **A per-phone limit and a higher per-IP limit, with no challenge.** This was option 2 on its own. A bot rotating random valid-looking phone numbers would face only the higher IP ceiling, and since phones are free to invent the phone limit would not stop it. The flood ceiling would then be the only control against fake cash on delivery orders, and it would have to be low, which is the CGNAT problem again.
- **SMS one-time password at checkout.** Strong proof that the customer owns the phone, but SMS is deferred by Architecture Decision Record 015, it costs money per order, delivery on Pakistani networks would block sales when it fails, and it adds a new provider and a secret. A possible future step if fake orders continue despite Turnstile.
- **Cloudflare WAF rate-limiting rules alone.** These also key on IP, so they have the same CGNAT problem. The Free plan's rate-limiting rules are very limited (UNVERIFIED in detail), and they live in the dashboard, not in the repository. They remain a reasonable *extra* layer at the edge (Architecture Decision Record 034 already recommends one for `/_next/image`). They are not a replacement.
- **Fail closed when Turnstile is unreachable.** Rejected by the owner (outage policy): an outage at Cloudflare would stop all sales.
- **Fail open (treat an outage as verified).** An attacker cannot cause an outage, but during one every request would get the verified budget. Degrading to today's limit keeps sales running without opening a gap.
- **Turnstile only, with no per-phone limit.** Paid human or automated solving services make tokens cheap. The per-phone limit stops repeated fake orders aimed at one victim's number, and duplicate orders from one customer.
- **Counting attempts per phone, not successes.** See decision 1.4.
- **An environment override for the verify URL, for tests.** Rejected as a production footgun (decision 3). Tests inject `fetch`; real-stack outage tests block the hostname at the container level.
- **Retries with `idempotency_key`, or a circuit breaker.** Not needed: an outage costs at most 3 seconds per request before degrading, and the flood ceiling bounds the volume. Left for later if outage logs show they would help.

**Consequences**:

- Customers behind CGNAT who pass the check are limited by the flood ceiling (30 per 15 minutes per IP) and their own phone limits, not by one another. During a Turnstile outage, or for a visitor whose widget cannot load, the behaviour is exactly today's.
- **New restriction on real customers**: a phone number can place at most 3 verified orders an hour and 10 a day. Families sharing one number are well inside that. The admin can still enter orders by hand in `/admin`.
- **Residual risks**:
  - Paid solving with rotating IPs and phones can still create fake orders. Each token costs the attacker, and each order is bounded by the IP and phone limits and visible to the admin.
  - **Victim lock-out (accepted 2026-10-11 by the Engineering Manager under authority delegated by the owner)**: an attacker who pays a CAPTCHA-solving service can place 3 verified fake cash on delivery orders an hour (10 a day) with a victim's phone number. That locks the victim out of ordering for up to 24 hours. Mitigations:
    - the limit message tells the customer to contact the store;
    - each refusal logs `[order-guard] phone-limit`;
    - the fake orders are visible in `/admin`.
  - Future options for both risks: SMS OTP, or a store-wide alert on order volume.
  - Anyone sharing a CGNAT IP can use up that IP's 30-request flood ceiling for 15 minutes. That is the same class of problem as today, with a six times higher bar.
- **The app now makes outbound HTTPS calls** to `challenges.cloudflare.com`. The `edge` network is an ordinary NAT bridge (Architecture Decision Record 033), so no network change is needed. The comment in `docker-compose.prod.yml` saying nothing needs outbound access must be updated.
- **Two new production variables.** Both are created in the Cloudflare dashboard (Turnstile → add a site for the store's hostname, Managed mode). The site key is build-time, so rotating it means rebuilding. Rotating the secret means updating the env file, then `run --rm migrate` (`check-env`) and `up -d app`. The continuous integration `migrations` job needs conforming dummy values.
- **Continuous integration end-to-end calls Cloudflare over the network**: the always-pass test keys load the real widget script and call the real siteverify. That is accepted. It is the only automated proof that the integration works, and production depends on Cloudflare anyway. If Cloudflare is unreachable in continuous integration, the golden path fails at its `verified` assertion. The fallback spec does not depend on Cloudflare, because it blocks the script.
- **Privacy**: Turnstile runs Cloudflare's script in the visitor's browser on `/cart` and `/orders` and collects browser signals. Cloudflare already processes every request as the site's proxy (Architecture Decision Record 033). No customer data is sent. If the store publishes a privacy notice, it should mention this (owner).
- **Accessibility**: Cloudflare states that Turnstile meets WCAG 2.1 AA (UNVERIFIED). In any case, a visitor who cannot complete the challenge falls back to the degraded path rather than being locked out.
- **Documentation**: `docs/DEPLOYMENT.md` must cover the new variables, the dashboard steps and the rewritten "Rate limits in the real world" section. `docs/ARCHITECTURE.md` and the readiness report should cross-reference this Architecture Decision Record. `.env.example` joins Milestone 52's open `.env.example` item.

**Not done here, by design**: a warning log when a request lands in the shared `'unknown'` IP bucket (it would detect a missing `cf-connecting-ip`; moved to Milestone 53, health and logging); Turnstile on `/admin` login (it is protected by Payload's own auth; Cloudflare Access remains out of scope, Architecture Decision Record 033); Enterprise-only features (ephemeral IDs, pre-clearance); `cdata`; retries and a circuit breaker; a shared limiter store for multiple instances; WAF rules.

**UNVERIFIED** (from knowledge of Cloudflare's documentation; no web access in the authoring session; quality assurance or the owner should confirm against the current docs before launch):

- **siteverify**:
  - the URL and the form-encoded fields `secret`, `response`, `remoteip` and `idempotency_key`;
  - the response fields `success`, `error-codes`, `challenge_ts`, `hostname`, `action` and `cdata`;
  - the error codes named in decision 2;
  - whether validation failures are returned with HTTP 200;
  - whether `remoteip` is used as a signal only and never as a strict match. If launch monitoring shows `invalid-token` rejections linked to mobile IP changes, stop sending `remoteip`, which is a one-line change.
- **Tokens**: they expire after 300 seconds, are single-use (reuse gives `timeout-or-duplicate`), and are at most 2048 characters.
- **Test keys and the dummy token**:
  - test site keys `1x00000000000000000000AA` (passes, visible), `2x00000000000000000000AB` (blocks, visible), `1x00000000000000000000BB` / `2x00000000000000000000BB` (invisible pass/block) and `3x00000000000000000000FF` (forces an interactive challenge);
  - test secret keys `1x0000000000000000000000000000000AA` (passes), `2x0000000000000000000000000000000AA` (fails) and `3x0000000000000000000000000000000AA` (token already spent);
  - the test site keys produce the dummy token `XXXX.DUMMY.TOKEN.XXXX`; test secrets accept only that token, and real secrets reject it;
  - whether the always-pass test secret accepts the dummy token more than once;
  - the `hostname` and `action` values in test responses (which is why they are not checked for test keys).
- **Widget**:
  - explicit rendering (`?render=explicit`, `turnstile.render`/`reset`/`remove`);
  - widget modes are set per site key in the dashboard (Managed, Non-interactive, Invisible);
  - `appearance: 'interaction-only'`, the `'flexible'` size (minimum about 300 px) and the `'compact'` size;
  - `action` allows at most 32 characters from `[A-Za-z0-9_-]`;
  - how `error-callback` and automatic retry interact.
- **Other**:
  - the supported widget languages, including whether Urdu is one;
  - the CSP sources needed;
  - the WCAG 2.1 AA claim;
  - the shape of real key strings.

**Verification required**: the Milestone 52b Testing line in [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) is the quality assurance plan for this Architecture Decision Record.

**Verified by quality assurance (2026-10-11), on the real production Docker stack, for the FIRST design only.** The sandbox could not reach `challenges.cloudflare.com`, so **every request in that run ended as `degraded`**, which means the *verified* path was never observed on a real stack. What was observed, and what it still proves after Architecture Decision Record 036:

- **Degraded limits** (5 per 15 minutes per IP, another IP unaffected), **outage cost** (about 3.0-3.2 s for a hanging Cloudflare; about 15 ms for a DNS failure) and **orders still succeeding during an outage**: all observed, and **all now obsolete** - Architecture Decision Record 036 removed the degraded path.
- **Phone normalisation** (`+92...` and padded forms share one counter), **concurrency** (8 concurrent requests for one phone gave exactly 3 successes) and **refunds** (a failed `createOrder` releases its slots): observed while degraded orders still counted against the phone. Those results do **not** carry over to the current rule (phone limits apply to verified orders only, keyed by phone and IP); they are covered now by the unit tests in `scripts/turnstile.test.ts`, not by a real-stack observation.
- **Configuration** (`check-env` refuses test keys and the allow flag in production; an `up` with a test secret never starts the app) and **logs** (no personally identifiable information, tokens or IPs after about 250 requests): still valid.
- **Unit tests**: caught 10 of 10 deliberate mutations at that time (12 of 12 after the fix batch). Dated, not current.
- **End-to-end**: the fallback, mobile and search engine optimization specs passed; the golden path failed in that sandbox only because Cloudflare was blocked there.

**Real-Cloudflare observations, added later the same day from the first continuous integration run on a GitHub runner** (see Architecture Decision Record 036 *Verified*): `api.js` answers HTTP 302 (a browser follows it; the first contract check wrongly assumed 200); Cloudflare's public test secrets answer HTTP 200 with the shapes this Architecture Decision Record assumed (`success:true` with `hostname:"example.com"` and no `action`; `invalid-input-response`; `timeout-or-duplicate`); an unknown secret answers **HTTP 400** with `invalid-input-secret` (the Architecture Decision Record assumed 200). Still **never observed**: the response for a *real* secret (the real `hostname` and `action` values) and the real widget at 320 px, which are open until the owner's launch check.

**Still to be proven**:

- **By continuous integration**:
  - the golden path reaching `verified` with the real always-pass test keys;
  - a new `turnstile-contract` job that checks the real siteverify response shapes for the `1x`/`2x`/`3x` test secrets, and that `api.js` returns 200.
- **By the owner at launch**: with real keys on the real hostname, a verified order and lookup, with no `[turnstile]` log lines.

---

## Architecture Decision Record 036: Strict Turnstile policy, idempotent orders, no victim lock-out, a closed first-admin window, separate database roles and interim Next.js mitigations (Milestone 52b security batch)

**Status**: **Accepted (2026-10-11)** — decided by the project owner with zero risk tolerance for the deployment: *"strictly refuse tokenless checkouts"*, *"secure abuse controls to prevent victim lockout"*, *"enforce order idempotency"*, *"completely separate the database roles"*, *"completely secure the first-admin window via secret seed"*, *"apply Next.js interim mitigations"*, and to act autonomously on every finding of the Milestone 52b assessment. It **amends** [Architecture Decision Record 035](#architecture-decision-record-035-cloudflare-turnstile-on-order-placement-and-lookup-a-per-phone-order-limit-and-a-per-ip-flood-ceiling--cgnat-safe-rate-limits-milestone-52b) (including the owner's earlier outage policy, now reversed by the owner), **supersedes in part** [Architecture Decision Record 034](#architecture-decision-record-034-image-optimisation-under-docker--nexts-built-in-optimizer-webp-only-local-media-only-milestone-51) (the optimizer), and **amends** [Architecture Decision Record 033](#architecture-decision-record-033-cloudflare-tunnel-is-the-origin-boundary--and-production-environment-validation-is-a-deploy-gate-milestone-52)'s first-admin gate (it is no longer an open window closed only by the runbook). It reverses no other Accepted Architecture Decision Record. It adds no npm dependency.

**Context** (findings of the Milestone 52b assessment, with the evidence that led to each decision; the labels B1 to L3 are finding identifiers explained in [GLOSSARY.md](./GLOSSARY.md), and M1 to M6 here are findings, not milestones):

- **B1 — `next@15.4.11` carries 30 advisories, 2 critical** (`npm audit` on the lockfile, 2026-10-11): `GHSA-2xp9-vwfh-vxw4` (unauthenticated RCE in the Image Optimization API "when AVIF files are used", fixed in 15.5.24+) and `GHSA-p293-qw3h-jr36` (RCE on Windows-hosted servers; the production image is Linux), plus highs including `GHSA-m99w-x7hq-7vfj` (DoS in App Router Server Actions, fixed 15.5.21+). Every advisory range ends below 15.5.x; the 15.4 line has no patch. `@payloadcms/next@3.90.2` (the newest) allows `next` `>=15.4.11 <15.5.0 || >=16.3.3 <17`, so **the only patched, Payload-compatible line is Next 16.3.3+** (latest 16.4.0 on 2026-10-11) — a major upgrade. The advisory texts could not be fetched in the authoring sandbox (GitHub's advisory API returned 403), so exploitability is **unverified**; this Architecture Decision Record treats every one as reachable.
- **B2 — the first-admin window.** `registerFirstUserOperation` creates a user with `overrideAccess: true` whenever the users table is empty, so `POST /api/users/first-register` made whoever reached the site first an admin with full access to order data. The runbook ordered "create the admin before attaching the hostname", which fails after any database wipe and depends on dashboard state (a token-based tunnel may already route the hostname).
- **H1 — Turnstile was advisory.** A request without a token was "degraded": 5 orders per 15 minutes per IP, no phone limit, so a bot simply omitted the token and rotated IPs.
- **H3 — no order idempotency.** `createOrder` wrote with no key. The cart clears only after a success response, so a lost response (mobile network) followed by a retry created a second cash on delivery order.
- **H4 — one Postgres superuser** for `app` and `migrate`: a compromised app (see B1) would own the database server (`COPY ... PROGRAM` runs commands in the Postgres container).
- **M1** failure classes were lumped: `missing-token`, hostname/action mismatch and a refused secret shared one outcome with network errors and timeouts. **M2** an attacker with a CAPTCHA-solving service could lock a victim out of ordering with their phone number (3 verified fake orders an hour). **M3** the `rateLimit` map holds 10,000 keys and evicts the oldest, so a flood of distinct keys resets counters. **M4** a missing `cf-connecting-ip` put every visitor in one shared `unknown` bucket. **M5** nothing had been observed against real Cloudflare. **M6** no `read_only` root filesystem anywhere. **L1** a legitimate customer with an expired token was hard-rejected. **L2** `migrate` receives `PAYLOAD_SECRET` and the Turnstile secret. **L3** failed verifications burned the per-IP budget of everyone on a CGNAT address.

**Decision**:

1. **A verified Turnstile token is required (H1, M1, L1, L3).** `lib/turnstile.ts` returns exactly one of:
   - `verified`;
   - `rejected` — a *security-validation* failure: `missing-token`, `malformed-token`, `invalid-token`, `expired-or-duplicate`, `action-mismatch`, `hostname-mismatch` (mismatches are logged at error level because they are also what a misconfigured launch looks like);
   - `unavailable` — an *availability or configuration* failure: `not-configured`, `test-key-not-allowed`, `network`, `timeout`, `http-status`, `bad-response`, `service-error` (including Cloudflare refusing our secret), `busy` (the 50-call concurrency cap).
   Both non-verified outcomes **refuse the request**; there is no degraded path. They are separate because they mean different things to an operator and show the customer different messages: `VERIFICATION_FAILED` ("the security check didn't complete" / an "expired, it renews by itself" variant) and `VERIFICATION_UNAVAILABLE` ("we can't run our security check right now … contact us to place your order"). This reverses the owner's 2026-10-11 outage policy ("fall back so sales keep running") on the owner's own instruction; the cost is that a siteverify outage stops online orders. That cost is small in practice: the storefront itself is served through the same Cloudflare Tunnel, so a Cloudflare outage that matters is an outage of the site as well, and the admin can still enter orders by hand in `/admin`.
2. **Order of checks (`lib/order-guard.ts`), cheapest first:** (a) no token and no idempotency key → refused at once, touching no limiter, no network call and no database; (b) production request with no valid client IP → refused (`VERIFICATION_UNAVAILABLE`, one error log line a minute) instead of sharing an `unknown` bucket (M4); (c) an **attempts gate** per IP (150 per 15 minutes for orders, 150 per hour for lookups) and per IPv6 /48 (1,000), counting every request that reaches the expensive steps, plus a **per-client cap on in-flight verifications** (4 per IP key, 12 per /48). The cap exists because the 50 shared siteverify slots are otherwise a cheap lever: a junk token needs no real challenge but holds a slot for a Cloudflare round trip, and with a fail-closed policy a saturated pool refuses every customer. The numbers are generous so that one noisy neighbour on a CGNAT address cannot lock the others out; (d) idempotent replay (decision 4); (e) Turnstile; (f) verified-order limits. Tokenless requests cost nothing and failed verifications never touch the order limits, so one hostile user on a CGNAT address can spend only the attempts gate, not the verified customers' order allowance (L3).
3. **No victim lock-out (M2).** The phone limits (3 per hour, 10 per 24 hours) are keyed by **phone and client IP** (`${phone}|${ip}`) and count verified *successful* orders only. Someone ordering with a victim's number from their own connection spends their own allowance, never the victim's. A **store-wide per-phone count is a log-only alert** (`[order-guard] phone-volume`, more than 10 verified orders in 24 hours on one number), never a refusal; fake orders are also visible in `/admin` and are caught by the confirmation call every cash on delivery order already gets. A per-IP verified-order ceiling of 30 per 15 minutes remains. All of these use the fixed-size, non-evicting `createBucketLimiter` (M3): a flood of distinct keys can only collide into *more* restriction, never reset a counter. `createBucketLimiter.reserve` now also returns `retryAfterSec`. The earlier Architecture Decision Record 035 per-IP degraded buckets are removed. **Residual risk (accepted):** a botnet with thousands of distinct addresses can still saturate the 50 slots; the application cannot stop that, so a **Cloudflare WAF rate-limiting rule on POST to `/cart` and `/orders` is part of the launch checklist** (`docs/DEPLOYMENT.md`). Also: the app role can write `users` rows (row access is what Payload needs), so a compromised app could add an admin or replace a password hash; the role confines the damage to this database, it does not make the app harmless. With solved challenges and rotating IPs an attacker can still place fake cash on delivery orders on a victim's number, bounded by the cost of each solved token, the per-IP ceilings and the alert; the real remedy is proof of phone ownership (SMS OTP, deferred by Architecture Decision Record 015).
4. **Order idempotency (H3).** The cart sends an `idempotencyKey` (`crypto.randomUUID()`, 128 random bits, one per checkout attempt; reused for retries, dropped on success and whenever the cart or address changes). `Orders.idempotencyKey` is `text`, `unique`, `index`, hidden in the admin user interface and immutable on every transport; a migration (`20261011_181740_order_idempotency_key`) adds the column and a unique index (NULLs allowed, so orders without a key are unaffected). `placeOrder` looks the key up **before** Turnstile, because a token is single-use and was spent by the first request: a matching key *and* phone returns the first order's response (built from the stored order, so prices are the snapshot taken at creation) without a token and without consuming any order limit. The lookup sits behind the attempts gate (it is a database query an unauthenticated caller can trigger) and only well-formed keys reach it. Two requests with one key that race past the lookup are resolved by the unique index: the loser reads the winner's order. A key alone reveals nothing (the phone must match, and keys are unguessable).
5. **First admin from a secret (B2).** `collections/Users.ts` gets a `beforeOperation` hook: an unauthenticated `create` is refused with 403 unless it comes from the bootstrap script (the Local API `context` key `gocartAdminBootstrap`, which no HTTP request can set) or the process runs with `PAYLOAD_ALLOW_FIRST_REGISTER=1` (development and continuous integration only; `check-env` refuses it if it ever reaches the `migrate` container, and the production compose never passes it to any service - that, checked by the `prod-stack` job, is the real control). That closes `POST /api/users/first-register` and the `/admin` create-first-user screen's submission *on an empty users table*. The production admin is created by `scripts/bootstrap-admin.ts`, the last step of `npm run deploy:migrate`: if users exist it does nothing; if none exist and `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` (validated: email shape, 14+ characters, 10+ distinct, no whitespace or placeholder word) are set it creates the admin; if none exist and they are not set it **exits non-zero**, so the stack never comes up with nobody able to administer it. The two secrets reach the one-shot `migrate` container only and are removed from the env file afterwards.
6. **Separate database roles (H4).** The `migrate` step (a one-shot container on the internal `backend` network) is the only holder of the Postgres superuser credential. After `payload migrate` it runs `scripts/db-roles.ts`, which (idempotently, every deploy) creates/updates `gocart_app` with `LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 20`, `statement_timeout 30s`, `idle_in_transaction_session_timeout 60s`; revokes `PUBLIC` on the database and `CREATE` on schema `public`; grants `SELECT, INSERT, UPDATE, DELETE` on all tables and `USAGE, SELECT` on sequences (and as default privileges); and leaves `payload_migrations` **read-only**. The `app` service's `DATABASE_URI` uses `gocart_app` and a new secret `APP_DB_PASSWORD` (validated like `POSTGRES_PASSWORD`, and required to differ from it); `app` no longer holds the superuser password. `docker-compose.yml` (development) keeps the single superuser because `next dev` pushes the schema.
7. **Interim Next.js mitigations (B1) — not a fix.** *(The upgrade itself is [Architecture Decision Record 037](#architecture-decision-record-037-nextjs-1638--closing-the-framework-advisories-milestone-52c), Milestone 52c; the mitigations stay until the owner decides on the optimizer.)* `images.unoptimized: true`; a rewrite sends **every** `/_next/image` request to a 404; `Media.mimeTypes` is `['image/jpeg','image/png','image/webp','image/gif']` (no AVIF, SVG, HEIC). This removes the exploitable surface of the two image-optimizer advisories (`GHSA-2xp9-vwfh-vxw4` needs an AVIF reaching the optimizer; no upload can be AVIF and no request reaches the optimizer). It does **not** address the Server Action DoS (`GHSA-m99w-x7hq-7vfj`) or the other advisories. **The upgrade to Next 16.3.3+ with Payload 3.90.x is a launch blocker** (`docs/DEPLOYMENT.md`, "Launch blockers") and needs its own milestone, because it carries breaking changes (for example `next lint` is removed in Next 16) and a full regression pass. Architecture Decision Record 034's optimizer is therefore suspended, not deleted; revisit with the upgrade.
8. **Read-only root filesystem (M6).** `read_only: true` on `app` and `migrate` in `docker-compose.prod.yml`, with `tmpfs` for `/tmp` (both) and `/app/.next/cache` (app, 128 MB), and the `app-media` volume as the only persistent writable path. `postgres` (its entrypoint chowns the data directory) and `cloudflared` (not testable without a real tunnel token) are **not** made read-only.
9. **L2 (accepted, not changed).** `migrate` still receives `PAYLOAD_SECRET` and the Turnstile secret, because the deploy gate (`check-env`) validates them and Payload's config needs `PAYLOAD_SECRET` to load. The container is one-shot, on an internal network, unprivileged, with `cap_drop: ALL` and a read-only root; the cost of splitting validation into another service is not worth the exposure it removes.

**Alternatives considered and rejected**:

- **Upgrade to Next 16 in this batch.** The correct fix, and still required before launch, but a major framework upgrade (lint tooling, config, Payload admin behaviour) belongs in a milestone with its own regression pass; mixing it into a security batch would make a failure impossible to attribute. The interim mitigations are chosen to remove the *critical* surface now.
- **Keep the optimizer and only forbid AVIF.** Whether the advisory is reachable by other inputs is unverified; switching the endpoint off is the only mitigation that does not depend on knowing.
- **A global per-phone refusal (the Architecture Decision Record 035 design).** It is exactly the victim lock-out mechanism; replaced by phone+IP limits and an alert.
- **A durable (database) idempotency cache or in-process cache only.** An in-process map loses entries on restart and cannot arbitrate a race; the unique index is the one mechanism that is correct under concurrency and across restarts.
- **Seed the first admin by blocking `/admin` until it exists, or an HTTP bootstrap token.** A secret consumed once by an unexposed one-shot container never crosses a network and cannot be replayed.
- **A separate migrator role instead of the superuser.** Creating roles needs a privileged connection anyway; the privileged connection is confined to the one-shot container, which is the part that matters.

**Consequences**:

- **Online ordering requires working Turnstile.** Without the site key the cart shows "Online ordering is not available right now. Please contact us."; with Cloudflare unreachable, `VERIFICATION_UNAVAILABLE`. The owner must monitor `[turnstile]` error lines at launch (a hostname or action mismatch means every customer is refused).
- **Real customers lose nothing they had**, except: a phone number can place 3 orders an hour and 10 a day *from one connection*; a customer behind a blocked or very slow Cloudflare script cannot order online and must call.
- **Deploys need two more secrets** (`APP_DB_PASSWORD`; `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` until the first admin exists), and a failed bootstrap or role step stops the stack before `app` starts.
- **Local development** defaults to Cloudflare's public test keys (`docker-compose.yml`) and `PAYLOAD_ALLOW_FIRST_REGISTER=1`, so ordering needs network access to Cloudflare.
- **Images are served unoptimised** until the Next upgrade: larger downloads on mobile. This is a performance cost accepted for a security reason.
- The sandboxed work could not observe real Cloudflare (see Verified).

**Verified (2026-10-11, in the authoring sandbox; dated and scoped — what each result does and does not prove)**:

- *Unit tests (no network):* `npm run test:turnstile` (61 classification cases, request contents, environment handling, and the guard: tokenless/rejected/unavailable refused, attempts gate, CGNAT ceiling, phone+IP limits and the no-lock-out case, replay, atomic reservation under 20 concurrent requests, missing client IP, lookup caps), `npm run test:env` (92 violating cases, boundaries, CLI), `tsc --noEmit` and `npm run lint` all pass.
- *Real PostgreSQL 16, outside Docker:* `npm run deploy:migrate` on a fresh database **fails closed without bootstrap credentials**, creates the admin with them, and a re-run is a no-op. As `gocart_app`: reads and writes work; `CREATE TABLE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE ROLE`, `COPY ... PROGRAM`, `CREATE EXTENSION`, `CREATE SCHEMA`, temp tables and any write to `payload_migrations` are refused. `npm run test:idempotency` passes (sequential retry, 12 concurrent requests, distinct keys, the unique index, key immutability) and **fails when the collision fallback is disabled** (mutation check).
- *Production build (`next start`) as `gocart_app`, against a LOCAL SIMULATION of Cloudflare* (a self-signed stand-in for `challenges.cloudflare.com` serving the widget script and a scripted siteverify with single-use tokens): all 15 Playwright tests pass, including the golden path, the lost-response/retry test (one order, same key on both requests) and the blocked-script test (button disabled, no order). Seven provider failure modes — HTTP 500, a 6-second hang (refused after about 3.9 s), a redirect, an oversized body, garbage, a wrong hostname, a wrong action — each refused the order and created none. **This is a simulation; it proves our handling of those responses, not what Cloudflare really sends.**
- *Production standalone server:* with the users table empty, unauthenticated `first-register` and `POST /api/users` return 403 and create nothing; `/_next/image` returns 404 in every form; AVIF and SVG uploads return 400.
- *Continuous integration, same commit (`95bf3b1`), all six jobs green:* `checks`, `migrations` (bootstrap, idempotent re-run, app-role refusals, fail-closed with no credentials), `image`, `turnstile-contract`, `prod-stack` and `e2e`. The `e2e` job ran as `gocart_app` and its golden path reached `verified` with Cloudflare's **public test keys** through the **real widget and the real siteverify**, placed an order and found it; the lost-response test created exactly one order. The first continuous integration run exposed a harness bug (a context-wide `cf-connecting-ip` header also reached Cloudflare's widget requests and the widget ended `failed`); scoping the header to the app origin fixed it. Real keys on the real hostname are still unobserved.
- *Read-only container, in the authoring sandbox* (the standalone bundle in a `node:22-slim` image, `--read-only`, `--cap-drop ALL`, `no-new-privileges`, tmpfs `/tmp`, a volume for media): every public route, admin login, a PNG upload and download, and page revalidation worked with no filesystem error. This is not the repository's Dockerfile image.

**Not verified (open; say so rather than assume)**:

- **Real Cloudflare, partly observed (continuous integration `turnstile-contract`, first run on a GitHub runner, 2026-10-11):** `api.js` answers 302 (followed by a browser); Cloudflare's test secrets answer 200 with `success:true` + `hostname:"example.com"` (no `action`) / `invalid-input-response` / `timeout-or-duplicate`, which `lib/turnstile.ts` classifies as `verified` / `rejected` / `rejected`; an unknown secret answers **HTTP 400** + `invalid-input-secret` (the code now reads a 400 body and logs it as a configuration error; the outcome is `unavailable` either way). **Still unobserved:** the response for a real secret (the real `hostname` and `action` values) and the real widget at 320 px. Checked only by the continuous integration `turnstile-contract` job (test secrets plus an unknown-secret case) and the golden path in continuous integration, and by the owner's launch check (a verified order and lookup with real keys on the real hostname and no `[turnstile]` log lines).
- ~~The real compose stack and the repository's Dockerfile images~~ **Observed in continuous integration on commit `95bf3b1` (GitHub run 38166731646, 2026-10-11): the `prod-stack` job passed** - the repository's own `docker-compose.prod.yml` built and started `postgres` -> `migrate` -> `app`; `migrate` exited 0 on a read-only root; `app` ran read-only as uid 1000 connecting as `gocart_app` with no superuser or bootstrap secret in its environment; `gocart_app`'s DDL, role-creation, `COPY ... PROGRAM` and migration-tampering attempts were refused; `/_next/image` returned 404; `first-register` and `POST /api/users` returned 403 **with an empty users table**; re-running `migrate` recreated the admin; a PNG upload and download worked on the read-only container and AVIF/SVG were refused (400).
- **`cloudflared` and `postgres` with a read-only root** (deliberately not enabled).
- **The Next.js 16 upgrade** (not done) and the exploitability of every advisory other than the image-optimizer ones (texts unavailable).
- Behaviour with real mobile-carrier traffic behind real Cloudflare headers.

---

## Architecture Decision Record 037: Next.js 16.3.8 — closing the framework advisories (Milestone 52c)

**Status**: **Accepted (2026-10-11)** — the owner approved the upgrade as its own branch and pull request after the Milestone 52b security batch (Architecture Decision Record 036 decision 7 and `docs/DEPLOYMENT.md` "Launch blockers" item 1). Amends [Architecture Decision Record 011](#architecture-decision-record-011-payload-v3-dependency-set--exact-pins-a-raised-nextjs-floor-and-patched-sharp) (the Next pin) and closes the open consequence Architecture Decision Record 011 recorded ("Next 15.3.9 is not advisory-free … must be decided before production"). Reverses no Accepted Architecture Decision Record. Adds one npm `overrides` entry and no new dependency.

> **Version pin amended (annotation added 2026-11-03):** [Architecture Decision Record 040](#architecture-decision-record-040-nextjs-1642--closing-the-advisories-published-after-milestone-52c-milestone-79) moves the `next`/`eslint-config-next` pin to 16.4.2 and the `undici` override to 7.30.1 (Milestone 79). Text below is unchanged history.

**Context**:

- `next@15.4.11` carried 30 advisories, two critical (`GHSA-2xp9-vwfh-vxw4`, `GHSA-p293-qw3h-jr36`) and several high, including `GHSA-m99w-x7hq-7vfj` (Server Actions DoS, relevant to the public checkout). Every advisory range ends below 15.5.x and `@payloadcms/next@3.90.2` (the newest) allows `>=15.4.11 <15.5.0 || >=16.3.3 <17.0.0`, so the only patched, Payload-supported line is Next 16.3.3+.
- On 2026-10-11 the 16.x releases were 16.3.0 … 16.3.8 and 16.4.0; the npm advisory database listed **no advisory** for 16.3.8 or 16.4.0.

**Decision**:

1. **`next` and `eslint-config-next` are pinned exactly to `16.3.8`**, not 16.4.0. Both are advisory-free and inside Payload's range, but Payload opened its range for the 16.3 line, and 16.3.8 is that line's newest bug-fix patch; 16.4.0 was a five-day-old minor. React stays `^19.2.1` (Next 16 accepts React 19).
2. **Lint runs through the ESLint CLI** (`npm run lint` = `eslint .`): Next 16 removed `next lint`. `eslint.config.mjs` uses eslint-config-next's native flat config (`eslint-config-next/core-web-vitals`) instead of `FlatCompat`. eslint-config-next 16 brings `react-hooks` v7, whose React Compiler rules (`react-hooks/refs`, `react-hooks/set-state-in-effect`) flag seven deliberate patterns (the Redux `storeRef.current ??= makeStore()` pattern, "latest ref" callbacks in the Turnstile widget, reading `sessionStorage` in an effect to avoid a hydration mismatch). The app does not use the React Compiler, so those two rules are **warnings**, not errors; rewriting verified checkout code is not part of a framework upgrade. `react-hooks/rules-of-hooks` is off for `e2e/**` and `scripts/**` (Playwright's fixture `use()` is not a React hook). One genuine finding was fixed: unescaped apostrophes in `components/Hero.jsx` (text unchanged).
3. **`next build` uses Turbopack** (the Next 16 default). `withPayload` configures both bundlers; no `--webpack` flag is needed. Next 16 rewrote two `tsconfig.json` entries itself (`jsx: "react-jsx"`, mandatory; `.next/dev/types/**/*.ts` added to `include`); both are committed so builds do not rewrite the file.
4. **`undici` is overridden to `7.29.1`** (`package.json` `overrides`). Payload 3.90.2 pins `undici@7.29.0` exactly and uses it only in `payload/dist/uploads/safeFetch.js` (fetching an upload from a URL, an authenticated admin feature). 7.29.0 is affected by high advisories fixed in the 7.29.1 patch (`GHSA-rfgv-xxqx-mfg5`, `GHSA-w293-vg96-wgc3`, and lower ones). A patch release within the same minor is the smallest change that removes them.
5. **Architecture Decision Record 036's interim mitigations stay in place**: the image optimizer remains off and `/_next/image` closed. Whether to re-enable the optimizer (Architecture Decision Record 034) on Next 16 is a separate decision for the owner (performance versus surface); this Architecture Decision Record only removes the reason it *had* to be off.

**Alternatives considered and rejected**:

- **Next 16.4.0.** Advisory-free too, but newer than the line Payload's range was opened for.
- **Staying on 15.4.11 with mitigations.** The Server Actions DoS and the other advisories have no application-level mitigation.
- **Rewriting the code the React Compiler rules flag.** Behaviour-neutral at best and a regression risk in the checkout widget; the rules stay visible as warnings.
- **Overriding `braces`.** No patched release exists (3.0.3 is the latest, and every version up to it is affected).

**Consequences**:

- `npm audit` (lockfile, 2026-10-11): **critical 2 → 0**; `next` and `undici` are no longer listed. Remaining: 9 high, all through `braces` (no fix published) in build and development tooling (`@next/eslint-plugin-next` → `fast-glob` → `micromatch`; `@payloadcms/next` → `sass` → `chokidar`; and the packages that depend on those), 5 moderate and 2 low from Payload's tree. `braces`' advisory is a stack-exhaustion DoS when expanding deeply nested glob patterns, which this app never builds from request input.
- Seven lint warnings remain (the deliberate patterns above).
- Future Payload upgrades must re-check the `next` peer range (unchanged rule from Architecture Decision Record 011), and must re-check whether the `undici` override is still needed (remove it once Payload pins 7.29.1 or later).

**Verified (2026-10-11, authoring sandbox)**: `npm ci`-equivalent install; `tsc --noEmit`; `npm run lint` (0 errors, 8 warnings); `npm run test:turnstile`, `test:env`, `test:idempotency`, `test:users-guard`; `db-roles` and seed on a fresh PostgreSQL 16; the standalone production build with Turbopack; the standalone server as `gocart_app`: every public route 200, `/admin` 200, unknown product / category / out-of-range page / unknown path 404, `first-register` and `POST /api/users` 403 with an empty users table, `/_next/image` 404; all 15 Playwright tests against a local simulation of Cloudflare with the app running as `gocart_app`; and, in a real browser, the Payload admin user interface (login, dashboard, the orders list and one order, a product edit view) with no uncaught page errors.

**Not verified here**: the repository's Docker images and the compose stack on Next 16 (continuous integration `image` and `prod-stack`), the golden path through the real Turnstile widget (continuous integration `e2e`), and the "upload from URL" admin path through the overridden `undici` (it needs outbound network).

## Architecture Decision Record 038: Health endpoint and container healthchecks (Milestone 53)

**Status**: **Accepted (2026-10-11)** — implemented on `claude/m53-health-checks`; an operational decision inside Milestone 53's stated scope, reverses no Accepted Architecture Decision Record.

**Decisions**:
1. **`GET /api/health` is a readiness probe, not a liveness ping.** It runs one `count` on `categories` through Payload's Local API (the same restricted `gocart_app` role the app uses), with a 3-second timeout. A process that is up but cannot reach the database is not healthy for a store whose only job is writing orders, and a bare 200 from the Node process would hide that.
2. **Public, no detail.** Returns `200 {"status":"ok"}` or `503 {"status":"unavailable"}` with `Cache-Control: no-store`. The cause goes to the server log (`[health] check failed: ...`) only; no version, no host, no error text reaches the internet. The route is under `/api/`, which `cloudflared` already forwards, so it is reachable publicly; it holds no data and the query is a cheap `count`.
3. **Compose healthcheck uses busybox `wget`** (present in the `node:alpine` image; curl is not) against `127.0.0.1:3000/api/health`: interval 30s, timeout 5s, 3 retries, 40s start period. `cloudflared` now waits for `app` to be `service_healthy` instead of `service_started`.
4. **Logging baseline stays as Milestones 50 and 52 set it** (json-file rotation on every service; the app logs to stdout/stderr). No log shipper or error-tracking SaaS is added: that would be a new dependency and an Architecture Decision Record 015 cost decision.

**Not done (deliberately out of Milestone 53's Goal)**: container memory limits, `read_only` for `cloudflared`/`postgres`, an external uptime monitor (the owner should point one at `/api/health`), and a "no admin yet" readiness signal for the first-admin window (Architecture Decision Record 036 closed that window differently).

**Verified**: local PostgreSQL 16 with the real migrated schema and `next dev`: 200 with the database up, 503 and a `[health]` log line within ~50 ms with it stopped, 200 again after restart. **Verified in continuous integration (pull request #23)**: the compose healthcheck and the `app` container reporting `healthy`, asserted by the Milestone 53 section of `scripts/prod-stack-check.sh` in the `prod-stack` job, which also exercises the production build serving the route.

## Architecture Decision Record 039: Admin product label and admin-managed home promo cards — two schema additions (Milestones 70 and 71)

**Status**: **Accepted (2026-10-24)** — decided by the project owner; amended the same day after the Software Architect's review against the merged Milestones 70 and 71 code (reader limit, ARCHITECTURE wording, link-validator clause). Reverses no Accepted Architecture Decision Record: it extends [Architecture Decision Record 022](#architecture-decision-record-022-best-selling-is-an-admin-curated-flag-not-a-computed-ranking)'s principle (curated, honest merchandising fields) and the public-read/admin-write rule of Milestone 13.

**Context**: Milestone 69 derives product badges in `lib/product-badges.ts`, which already accepts an optional admin `label` (`new` | `limited` | `sale`) that no collection yet stores. The Milestone 62 home page deliberately omits the design's promo cards because their copy was invented, not real (Milestone 62, "Not built"). Both gaps need schema, so both need migrations ([Architecture Decision Record 032](#architecture-decision-record-032-database-migrations-are-an-automatic-fail-closed-production-step--a-one-shot-migrate-service-that-the-app-waits-for-milestone-52a)).

**Decisions**:

1. **`Products.label`** (Milestone 70): an optional `select` with values `new` ("New"), `limited` ("Limited edition"), `sale` ("Sale"); no default, not required. One nullable enum column, one migration. `lib/payload/products.ts`'s hand-written `Product` type gains `label?: 'new' | 'limited' | 'sale' | null`. Precedence against Out of stock and Featured stays as Milestone 69 set it.
2. **`promoCards` collection** (Milestone 71), admin-managed home-page cards. Fields: `title` (text, required), `eyebrow` (text, optional, short), `ctaText` (text, required), `link` (text, required; a `validate` accepts only an internal path starting with a single `/` — `//host`, `/\`, schemes and any `:` are rejected, and a link also contains no whitespace or control character (enforced from Milestone 75; the Milestone 71 validator did not yet reject them); no external URLs), `tone` (select over the existing pastel tokens: `pink`, `blue`, `lavender`, `mint`), `image` (optional upload relation to `media`), `order` (number, ascending), `active` (checkbox, default `true`).
3. **Access**: `create`/`update`/`delete` admin-only (`Boolean(user)`). `read` is public but filtered: `({ req: { user } }) => (user ? true : { active: { equals: true } })`, so an anonymous REST or Local API read can never see an inactive card and admins see all. This is the same public-read/admin-write posture as Products, Categories and Media; no personally identifiable information is stored.
4. **Rendering**: a server-only `lib/payload/promo-cards.ts` (Local API, `active` filter, sorted by `order` then `createdAt`, at most 4 cards, depth 1 for the image, `overrideAccess: false`) feeds the home page; the section is **hidden when no card is active**. A client component never imports it. A failed read renders nothing and does not fail the page.
5. **No seeded copy**: no card exists until an admin creates one. Migrations and `scripts/seed.ts` create none (an empty section is the honest default; the design's marketing copy is not invented).
6. **Migrations**: one per milestone, produced by `payload migrate:create`, committed with its `.json` snapshot, applied by the fail-closed `migrate` service (Architecture Decision Record 032). Both are additive (a nullable enum column; new tables), so the forward-only rule and the continuous integration drift check are unaffected.

**Alternatives considered and rejected**:

- *A global with an array field for the cards* — one document, so no per-card `active` filtering at the query level, no per-card admin list, ordering or drafts; array rows cannot carry their own access, and changing a copy line rewrites the whole document. A collection is the house pattern and costs the same one migration.
- *A free-text `label` on Products* — invites "Best seller"/"Popular" claims Milestone 69 forbids, breaks the fixed colour/contrast mapping (every pair is checked at 4.5:1), and cannot be compared in code. A closed enum keeps the badge a pure function of real fields.
- *Hard-coded promo cards in JSX* — this is the invented-copy problem Milestone 62 removed; every change would need a deploy.
- *Public `read: true` filtered only by the app query* — safe for the storefront but leaves inactive drafts readable through `/api/promoCards`; the access-level filter closes that.
- *Allowing external `link` URLs* — open-redirect and phishing surface in an admin-editable field, and an off-site link from a cash on delivery store's home page has no use case.

**Consequences**:

- Two migrations (Milestone 70 then Milestone 71); the production runbook's backup-before-schema-change step applies to both.
- `payload-types` mirrors: only `lib/payload/products.ts` (`label`) and the new `lib/payload/promo-cards.ts` need hand-written types.
- `docs/ARCHITECTURE.md` collection list and access table gained `promoCards` (public-read where active, admin-write) with Milestone 71.
- `Media` stays public-read and WebP-optimised local media only ([Architecture Decision Record 034](#architecture-decision-record-034-image-optimisation-under-docker--nexts-built-in-optimizer-webp-only-local-media-only-milestone-51)); promo images use it unchanged.
- A promo card's `tone` is limited to tokens that already exist in `app/globals.css`; adding a colour is a design change, not an admin action.

## Architecture Decision Record 040: Next.js 16.4.2 — closing the advisories published after Milestone 52c (Milestone 79)

**Status**: **Accepted (2026-10-24)** — accepted by the project owner ("Accept Architecture Decision Record 040 with 16.4.2, approve Milestone 80"), with the version choice 16.4.2 confirmed by the owner. Amends the version pin of [Architecture Decision Record 037](#architecture-decision-record-037-nextjs-1638--closing-the-framework-advisories-milestone-52c) only (decision 1 there, `next`/`eslint-config-next` at `16.3.8`, and the `undici` override value in its decision 4). It does not change [Architecture Decision Record 036](#architecture-decision-record-036-strict-turnstile-policy-idempotent-orders-no-victim-lock-out-a-closed-first-admin-window-separate-database-roles-and-interim-nextjs-mitigations-milestone-52b-security-batch)'s decisions, reverses no Accepted Architecture Decision Record and adds no dependency (one existing `overrides` value changes).

**Context**:

- Architecture Decision Record 037 pinned `next@16.3.8` on 2026-10-11 ("critical 2 → 0"). `npm audit` on 2026-10-24 reports `next` critical again: `GHSA-2464-fhr4-w9xw` (unauthenticated RCE in the Image Optimization API when SVG files are used), `GHSA-673q-mjm6-r5xr` (unauthenticated RCE in `use cache` functions returning typed arrays) and `GHSA-p3m5-59mp-jv5r` (DoS in App Router Server Actions, high). All three have range `>=16.0.0 <=16.4.0` in the `npm audit` JSON (advisory ids 1242816, 1242859, 1242818).
- Release notes, `https://github.com/vercel/next.js/releases/tag/v16.4.1` (fetched 2026-10-24): "contains security fixes for the following advisories", exactly those three, nothing else.
- `v16.4.2`: eight `[lts-active]` backports (turbo-tasks snapshot consistency fixes, Turbopack GC leaving half-torn-down dependency edges, realpath errors ignored in module resolution, lazy dynamic-import chunk-list collisions, docs fixes); no security items.
- `v16.4.3`: Google font URL fix, do not load the app-page runtime in `proxy.ts`, a revert of a Turbopack loader-invalidation change, OpenTelemetry trace grouping, "avoid loading standalone React in server bootstrap", and internal continuous integration items; no security items.
- Publish times (`npm view next time`): 16.4.0 2026-10-06, 16.4.1 2026-10-14, 16.4.2 2026-10-15, 16.4.3 2026-10-23T13:40Z (under a day old when this was drafted).
- `npm audit` also flags `undici` (the Architecture Decision Record 037 override, `7.29.1`): `GHSA-xjj6-f33q-929c` (high, `>=7.18.0 <7.30.1`), `GHSA-4qv8-2p9j-2685` and `GHSA-f72v-6w45-q472` (moderate). Fixed in `7.30.1` (`npm view undici@7.30.1` resolves).

**Exposure in this app** (code facts, checked 2026-10-24):

- *Image Optimization API*: closed. `next.config.mjs` sets `images.unoptimized: true` (line 39) and a `beforeFiles` rewrite sends every `/_next/image` request to a 404 (lines 44-52), per Architecture Decision Record 036. Not reachable here; the pin still matters because the closure is a mitigation, not a fix.
- *`use cache`*: no `use cache`, `cacheComponents` or `unstable_cache` in application code (a grep of `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.mjs` found none). Use inside Payload's own packages is **unverified**.
- *Server Actions DoS*: reachable. The checkout and order-lookup server actions (`app/(public)/cart/actions.ts`, `app/(public)/orders/actions.ts`) are public and unauthenticated by design (guest checkout; Architecture Decision Records 024 and 026). There is no application-level mitigation, which is why Architecture Decision Record 037 rejected staying on an affected line.

**Decision**:

1. **`next` and `eslint-config-next` are pinned exactly to `16.4.2`.** It is the newest release that is at least a week old (Architecture Decision Record 037 declined a five-day-old minor), it contains the three security fixes (introduced in 16.4.1), and it adds Turbopack build-correctness backports relevant to this project's Turbopack production build and Docker image. `16.4.3` adds no security fix and is under a day old, so it is left for a later routine bump. `16.4.2` is inside Payload's peer range: `npm view @payloadcms/next@3.90.2 peerDependencies.next` = `>=15.2.9 <15.3.0 || >=15.3.9 <15.4.0 || >=15.4.11 <15.5.0 || >=16.3.3 <17.0.0`.
2. **`overrides.undici` is raised from `7.29.1` to `7.30.1`.** Same reasoning as Architecture Decision Record 037 decision 4: Payload pins `undici@7.29.0` exactly and uses it only for the admin "upload from URL" fetch; a patch-level override within the same minor is the smallest change that removes the advisories.
3. Architecture Decision Record 036's mitigations (`images.unoptimized: true`, `/_next/image` closed) stay in place. Re-enabling the optimizer remains a separate owner decision.
4. The choice of version is the owner's and is a one-line pin: see the alternatives. The owner confirmed 16.4.2 on 2026-10-24.

**Alternatives considered**:

- **(a) `16.4.1`** — the minimum that fixes the three advisories; a security-only delta over 16.4.0. Valid; rejected only because 16.4.2 is a day later, also a week old, and carries Turbopack fixes for the build this project ships.
- **(b) `16.4.3`** — the latest. No security gain over 16.4.2 and under a day old; Architecture Decision Record 037's caution about very new releases applies.
- **(c) Stay on `16.3.8` and accept the Server Actions DoS** — rejected: the DoS is reachable unauthenticated on checkout and order lookup, and the other two advisories are critical RCEs whose only protection here is a mitigation.

**Not done, explicitly rejected**:

- The `npm audit fix` suggestion for `@payloadcms/richtext-lexical` (a downgrade to `3.78.0`, a major step back from the pinned Payload 3.90.2 set, Architecture Decision Record 011).
- The `dompurify`, `happy-dom` and `@lexical/*` findings are admin-side or dormant and wait for a Payload release. Their exposure is **unverified**.

**Consequences**:

- If accepted, `package.json` and `package-lock.json` change for `next`, `eslint-config-next` and `overrides.undici`; nothing else in application code is expected to change (the stale `next@15.4.11` comment in `next.config.mjs` is a comment-only edit in Milestone 79).
- Future Payload upgrades must still re-check the `next` peer range (Architecture Decision Record 011) and whether the `undici` override is still needed (Architecture Decision Record 037).
- Rollback: revert the commit and `npm ci` (restores 16.3.8); no schema or data change.

**Verification — to be verified by Milestone 79** (none of this has been run for this Architecture Decision Record):

- `npm audit`: no `next` advisory and no critical `next`; `undici` no longer listed; before and after recorded.
- `npm run lint`, `tsc --noEmit`, `npm run build` (Turbopack, standalone).
- `test:env`, `test:turnstile`, `test:idempotency`, `test:users-guard`.
- `/_next/image` still returns 404; checkout and order-lookup server actions work (continuous integration `e2e` golden path).
- All six continuous integration jobs green, including the Docker `image` and `prod-stack` jobs.

## Architecture Decision Record 041: Home "Deals of the day" and a browser-only wishlist (Milestone 91)

**Status**: **Accepted (2026-10-27)**, decided by the project owner (chose "Deals of the day", "Deal countdown too" and "Wishlist (browser-only)" from the redesign canvas; "Newsletter signup" and "Sign in" were declined). Extends [Architecture Decision Record 039](#architecture-decision-record-039-admin-product-label-and-admin-managed-home-promo-cards--two-schema-additions-milestones-70-and-71)'s principle (honest, admin-curated merchandising fields). Reverses no Accepted Architecture Decision Record: there are still no customer accounts, and nothing is stored server-side per visitor.

**Decisions**:

1. **`Products.dealEndsAt`**: an optional `date` field (admin sidebar). One nullable `timestamptz` column, one additive migration. The MRP already exists, so no price field is added.
2. **Deals of the day** (home): in-stock products whose `dealEndsAt` is in the future **and** whose `mrp > price`, soonest-ending first, at most five (`getDealProducts`, Local API, `overrideAccess: false`). The countdown runs to the earliest end; at zero the page refreshes so ended deals drop out. The section is hidden when there are none and a failed read hides it rather than failing the page. No seeded deals.
3. **Wishlist**: browser-only, in `localStorage` (`gocart:wishlist`, product-id strings), exactly like the cart ([Architecture Decision Record 023](#architecture-decision-record-023-cart-state-stays-redux-with-localstorage-persistence-added)). No account, no server state, no personally identifiable information. It does not sync across devices; the `/wishlist` page says so. The page is `noindex`, reads products through Payload's public REST API (no `lib/payload` import in client code).
4. **Not built**: newsletter signup (would store subscriber emails, needs its own Architecture Decision Record), a Sign in link (admin-only auth), and the design's limited-offer band (the admin promo cards of Architecture Decision Record 039 cover it).

## Architecture Decision Record 042: Category sort and filter, and cart "Undo" (Milestone 92)

**Status**: **Accepted (2026-10-29)**, decided by the project owner (chose category sort, price/discount filters and cart restore from the redesign canvas audit; kept checkout on `/cart`). Narrows the "Future Phase" filter list in `docs/CATEGORY_REQUIREMENTS.md` to the filters the catalogue has real data for. Reverses no Accepted Architecture Decision Record and needs no schema change.

**Decisions**:

1. **Sort**: Recommended (unchanged order), price low to high, price high to low, biggest discount. **Filters**: price range and minimum discount (10/25/40%, price against MRP). Query params `sort`, `min`, `max`, `off`; anything invalid is ignored.
2. **Where it runs**: price range and price sort are Payload queries. The discount filter and sort compare `price` with `mrp`, which Payload cannot query, so they fetch the matching rows and filter, sort and page in memory (`lib/category-filters.ts`). Revisit with a stored `discountPercent` column if a category grows past a few hundred products.
3. **Search engine optimization**: a sorted or filtered URL is `noindex, follow` with the plain category as its canonical, and has no `rel=prev/next`; the plain paginated listing is unchanged ([Milestone 41](./MIGRATION_PLAN.md)). The control is a plain GET form in a `<details>` panel, so it works without JavaScript.
4. **Not built**: size, colour and free-delivery filters (no per-product data; delivery is a store-wide rule, [Architecture Decision Record 018](#architecture-decision-record-018-shipping-model--flat-rate-with-a-free-shipping-threshold-snapshotted-per-order)); a "Load more" button (pagination links keep every page crawlable).
5. **Cart Undo**: removing a line shows "Removed {name}. Undo" and restores the line with its quantity (`restoreItem`), kept in component state only. The mobile sticky total bar of the design already exists (the cart's `MobileActionBar`, Milestone 65).

## Architecture Decision Record 043: Admin look and Overview home, on Payload (Milestone 95)

**Status**: **Accepted (2026-10-29)**, decided by the project owner after sharing sample admin screens from another shop (chose "Re-skin Payload + custom Overview", the storefront's colours, no extra fields, no online-payment states). Consistent with [Architecture Decision Record 009](#architecture-decision-record-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service): Payload still owns `/admin`; nothing replaces its editing screens. No schema change.

**Decisions**:

1. **Re-skin, not rebuild.** One stylesheet (`app/(payload)/custom.css`, unlayered so it beats Payload's `@layer payload-default`) restyles the admin with the storefront's tokens and Plus Jakarta Sans: a dark-violet sidebar, tinted greys, rounded fields and buttons. Light theme only (`admin.theme: 'light'`). The sample's fully custom Orders and Products pages, and its serif maroon look, are not built.
2. **Overview home** (`components/admin/Dashboard.tsx`, registered as `admin.components.views.dashboard`): counts of new orders to confirm (`PLACED`), ready to dispatch (`CONFIRMED`, `PROCESSING`), on the way (`SHIPPED`), products sold out and in the catalogue, sales, and the eight latest orders with status pills. Sales sum `orderTotal` of confirmed, processing, shipped and delivered orders (not cancelled or returned), read in one unpaginated query; revisit with an aggregate if order volume grows into the thousands.
3. **Access.** Every read uses the signed-in user and `overrideAccess: false`, so the page shows only what that user may read; Payload still requires login for `/admin`.
4. **Branding.** The sidebar and login show the storefront's four-bar logo and the Settings `storeName` (`components/admin/Logo.tsx`), plus "Overview" and "View store" links.
5. **Cash on delivery only.** No payment-verification cards: no such state exists ([Architecture Decision Record 004](#architecture-decision-record-004-cash-on-delivery-only-for-launch-architecture-stays-payment-extensible)). Courier and tracking number, draft/live visibility and product size/colour/fabric fields from the sample were not added.
6. **Registry.** `app/(payload)/admin/importMap.js` is regenerated with `payload generate:importmap` whenever a component path in `payload.config.ts` changes.


## Architecture Decision Record 044: Orders list with inline status and paid (Milestone 96)

**Status**: **Accepted (2026-10-29)**, decided by the project owner (chose "Styled list only" with an inline status dropdown and a Paid toggle). Consistent with [Architecture Decision Record 009](#architecture-decision-record-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service) (Payload keeps `/admin`), [Architecture Decision Record 019](#architecture-decision-record-019-order-status-set-includes-confirmed-cancelled-and-returned) (any status from any other) and [Architecture Decision Record 028](#architecture-decision-record-028-order-identity-and-price-snapshot-fields-are-immutable-after-creation--field-level-access) (price snapshot fields stay closed). No schema change, no migration.

**Decisions**:

1. **Cells, not a new view.** The Orders list stays Payload's own list (search, filters, sort, pagination, bulk select); three columns get custom `admin.components.Cell` components in `collections/Orders.ts`: the total as `Rs. 4,699` (server), the status as a pill-styled dropdown and `isPaid` as a Paid/Unpaid button (client, `components/admin/OrderCells.tsx`). A fully custom Orders page and a custom order detail view were not built.
2. **Saves through Payload's update endpoint.** Each change is `PATCH /api/orders/:id` with the signed-in admin's cookie, so `Orders.update` access and every hook still run; nothing new is exposed to the public. On failure the control reverts and shows "Not saved".
3. **No new rules.** The status set and free transitions are unchanged (Architecture Decision Record 019); `isPaid` is still set by hand when cash is collected, never automatically.

- **Rollback**: Revert the commit.

## Architecture Decision Record 045: Dependency audit follow-up (Milestone 97)

**Status**: **Accepted (2026-10-29)**, decided by the project owner (chose the non-breaking audit fix plus Milestone 79 sign-off). No application code change.

**Decisions**:

1. **`dompurify` override.** `monaco-editor` (inside the Payload admin user interface) pins `dompurify@3.4.15`, which `npm audit fix` cannot move; an `overrides` entry sets 3.4.17, a patch release. This closes the one critical advisory. Re-check the override when Payload moves `monaco-editor`, and remove it once the pin is gone.
2. **`fast-uri`** moves to 3.1.9 through a plain lockfile update.
3. **Accepted, not fixed**: the advisories in `payload`, `@payloadcms/*`, `@lexical/headless` (`happy-dom`), `drizzle-kit` (`esbuild`) and `graphql-scalars`. npm's only offered fix is a downgrade to `0.1.x` releases (breaking), so none is applied. `graphql-scalars` (PhoneNumber ReDoS) is pinned exactly by `@payloadcms/graphql`, which imports only the `DateTime` and `EmailAddress` scalars, so the vulnerable code is not used. `esbuild` and `happy-dom` are build/dev-time or admin-side. Revisit on each Payload release.

- **Rollback**: Revert the commit.

## Architecture Decision Record 046: Free non-commercial test hosting: Vercel Hobby + Neon Free + Vercel Blob (Milestone 100)

**Status**: **Accepted (2026-10-30)** under the project owner's delegation recorded in [GATES.md](../.claude/docs/GATES.md) ("Owner delegation: free test deployment"), governance commit `6d0edb8` (merged as `96fa6f3`). Owner decisions of 2026-10-30 are applied (Architecture Decision Records 032 and 036 win; Turnstile skipped).

**This Architecture Decision Record is test-only. It supersedes none of [Architecture Decision Record 015](#architecture-decision-record-015-initial-production-infrastructure-baseline), [Architecture Decision Record 020](#architecture-decision-record-020-media-storage-backend-is-a-local-docker-volume-for-v1-with-cloudflare-r2-as-the-designated-successor), [Architecture Decision Record 032](#architecture-decision-record-032-database-migrations-are-an-automatic-fail-closed-production-step--a-one-shot-migrate-service-that-the-app-waits-for-milestone-52a) or [Architecture Decision Record 036](#architecture-decision-record-036-strict-turnstile-policy-idempotent-orders-no-victim-lock-out-a-closed-first-admin-window-separate-database-roles-and-interim-nextjs-mitigations-milestone-52b-security-batch).** It adds a second deployment target next to the production design; the production design is unchanged.

**Context**: The owner wants a free, personal, non-commercial place to try the real application over the internet. The production design needs a virtual private server, a domain and Cloudflare, none of which the owner wants to pay for yet.

**Decision**:

1. **Hosting**: Vercel Hobby (project `gocart-test`, function region `iad1`), Neon Free (Postgres 17, matching the local Docker version, AWS us-east-1) and Vercel Blob (store `gocart-test-media`).
2. **Media**: `@payloadcms/storage-vercel-blob@3.90.2` for the `media` collection with client uploads (a serverless function cannot accept a large request body), registered **only when `BLOB_READ_WRITE_TOKEN` is set**. `alwaysInsertFields: true` keeps the `media` schema identical with or without the token; the adapter's two extra columns (`prefix`, `_objectKey`) ship as one additive migration, which also runs in the Docker production stack and leaves them empty there. Without the token the local-volume adapter of Architecture Decision Record 020 is used. `Media` access control is not touched.
3. **Migrations (Architecture Decision Record 032 stands; `prodMigrations` is not enabled anywhere)**: the committed files in `/migrations` are run as an explicit step with the Neon **owner** role, in this order of preference: (a) a direct Postgres connection from the deploying session to Neon; (b) a throwaway script **outside the repository** that runs the committed migrations over Neon's serverless driver on port 443, if feasible; (c) otherwise stop and report concrete options. No other path is invented.
4. **Database roles (Architecture Decision Record 036 stands)**: the Vercel runtime does **not** use Neon's owner role. `scripts/db-roles.ts` creates the restricted `gocart_app` role on Neon with exactly the grants Architecture Decision Record 036 defines (`SELECT, INSERT, UPDATE, DELETE` on all public tables, `USAGE, SELECT` on sequences, `USAGE` on the schema, no `CREATE`, no write to `payload_migrations`, plus default privileges for later tables). Those grants are table-level, so the new `media.prefix` and `media._objectkey` columns are covered; this was verified with `has_column_privilege` on a throwaway database. Vercel's `DATABASE_URI` is the **pooled** endpoint with the `gocart_app` user; migrations and `db-roles` use the owner role.
5. **First admin**: created with `scripts/bootstrap-admin.ts` (Architecture Decision Record 036), not the open create-first-user flow; `PAYLOAD_ALLOW_FIRST_REGISTER` is never set.
6. **Images**: `images.unoptimized` stays `true` ([Architecture Decision Record 036](#architecture-decision-record-036-strict-turnstile-policy-idempotent-orders-no-victim-lock-out-a-closed-first-admin-window-separate-database-roles-and-interim-nextjs-mitigations-milestone-52b-security-batch)); only the Blob host is added to `remotePatterns`.
7. **Turnstile is not configured (owner decision, 2026-10-30).** No keys are created, so **checkout is non-functional on this test deployment**. Missing keys block neither the build nor startup: `scripts/check-env.ts` runs only in the Docker `migrate` service (`package.json` `deploy:migrate`), and the only startup check in the app is `PAYLOAD_SECRET` (`payload.config.ts`). `check-env` is not weakened and no test keys or bypass flag are used.

**Alternatives considered**:

- **Cloudflare Quick Tunnel to a local Docker stack**: free and closest to production, but the URL is ephemeral and the stack must stay running on a personal machine. Kept as a fallback.
- **Cloudflare R2 for media**: Architecture Decision Record 020's designated production successor, but it may require a payment card to enable, which rules it out for a no-card test environment. It remains the production choice.
- **`prodMigrations` on Vercel**: rejected; Architecture Decision Record 032 records why it is not a deploy gate.

**Consequences**:

- **Non-commercial only.** Vercel Hobby is for personal, non-commercial use. This must move to paid hosting (or the Architecture Decision Record 015 stack) before any commercial or client launch. It is not production and closes no launch blocker in `docs/DEPLOYMENT.md`.
- **Free-tier limits** (per the owner's brief; exact figures are unverified here and must be re-checked in the vendor docs before relying on them): Blob has a 1 GB storage cap and monthly operation limits; exceeding a Hobby or Blob limit can lock the account out for 30 days. Neon Free scales to zero, so the first request after idle is slow (cold start).
- **Known gaps on this target, recorded and not fixed (code changes are out of scope of the delegation):**
  - The rate limiter is in memory per process ([Architecture Decision Record 026](#architecture-decision-record-026-orders-are-created-only-by-a-server-side-function--orders-collection-create-access-closes-to-admins)), so on serverless it applies per instance, not globally.
  - The client IP is read only from `cf-connecting-ip` ([Architecture Decision Record 033](#architecture-decision-record-033-cloudflare-tunnel-is-the-origin-boundary--and-production-environment-validation-is-a-deploy-gate-milestone-52)); there is no Cloudflare in front, so every visitor shares one `unknown` bucket.
  - Checkout and order lookup cannot work without Turnstile keys ([Architecture Decision Record 035](#architecture-decision-record-035-cloudflare-turnstile-on-order-placement-and-lookup-a-per-phone-order-limit-and-a-per-ip-flood-ceiling--cgnat-safe-rate-limits-milestone-52b)); this is the owner's decision above.
- **Rollback**: remove the `gocart-test*` resources; no production dependency exists.

## Architecture Decision Record 047: The brand is Mirza; old "GoCart" identifiers kept for compatibility are listed (Milestone 101)

**Status**: **Accepted (2026-10-31)**. The rename itself, the list of identifiers to rename and the list to keep are the owner's own decisions (Milestone 101 brief, 2026-10-31). The pull request merge is the owner's confirmation.

**This Architecture Decision Record edits no earlier Architecture Decision Record.** Accepted Architecture Decision Records keep their wording, including "GoCart" and "GoCart Pakistan". Read those as the project's former name: they describe this same application. Where an earlier Architecture Decision Record quotes the storefront's text, the current text is in the code. For example, Architecture Decision Record 036's ordering-unavailable message now names the paused action (`components/TurnstileWidget.tsx`, Milestone 101).

**Context**: The project began as a fork of the open-source GreatStack "GoCart" multi-vendor storefront and kept the name through the migration. The owner has chosen **Mirza** as the official, permanent brand, and the test site already showed it (through the Settings global). The code defaults still said "GoCart". The user experience review in [MIRZA_UX_REVIEW.md](./MIRZA_UX_REVIEW.md) also found a visual identity that read as a template (violet and pink, a four-bar mark, a generic favicon).

**Decision**:

1. **Mirza is the brand** in customer-facing text, code defaults, metadata and current-state documentation. The store name shown on the storefront and in /admin is still the Settings `storeName`, so an admin edit still renames everything.
2. **Renamed (the safe set):**
   - `storeName` default `GoCart` -> `Mirza` (`globals/Settings.ts`, `lib/payload/settings.ts` fallback, `components/Navbar.jsx` fallback), plus migration `20261031_160131_mirza_store_name`, which changes the **column default only**. Saved values are never touched.
   - Order-confirmation sessionStorage key `gocart:last-order` -> `mirza:last-order`. The reader falls back to the old key, and the writer removes it, so a confirmation saved during the deploy is not lost.
   - The demo seed's store name (`mirza` -> `Mirza`). The seed no longer writes fake contact details.
3. **Kept on purpose (compatibility):**

   | Identifier | Where | Why kept |
   |---|---|---|
   | `gocart_app` database role | Architecture Decision Record 036, `scripts/db-roles.ts`, Neon, `DATABASE_URI` | Renaming means a new role, new grants and a secret rotation on every environment |
   | Docker Compose project name `gocart` (so volumes are `gocart_postgres-data`, `gocart_app-media`), container names `gocart-*`, and the default Postgres user and database `gocart` | `docker-compose*.yml`, `.env.example`, backup scripts | Changing the project name changes the volume names, which detaches the existing database and media |
   | Continuous integration database names and users | `.github/workflows/ci.yml` | Internal to continuous integration; nothing user-visible |
   | Production Compose project `gocart-prod` (volumes `gocart-prod_postgres-data`, `gocart-prod_app-media`), env file name `gocart-prod.env`, backup file names `gocart-db-*.dump` / `gocart-media-*.tar.gz`, cron file and log `gocart-backup` | `docker-compose.prod.yml`, `scripts/backup*.sh`, `docs/DEPLOYMENT.md` | Backup rotation and verification match these names; renaming would orphan existing backups and volumes |
   | Continuous integration image tags (`gocart:ci`, `gocart-migrate:ci`) and `check-env` test fixtures | `.github/workflows/ci.yml`, `scripts/check-env.test.ts` | Internal to continuous integration and tests |
   | Historical documents (`docs/REPOSITORY_ANALYSIS.md`, `docs/PHASE_1_READINESS_REPORT.md`, the changelog, Accepted Architecture Decision Records, the owner's recorded delegations in `.claude/docs/GATES.md`) | docs | They record what was true, or said, at the time |
   | Historical migrations and their JSON snapshots | `migrations/` | Migrations are immutable once applied |
   | GitHub repository `gocart`, Vercel project `gocart-test`, Neon project `gocart-test`, Blob store `gocart-test-media`, URL `gocart-test-inky.vercel.app` | external services | Renaming breaks links, deploy hooks and documented steps; the owner decides separately |
   | `package.json` `name` (`gocart`) | npm | Private package, never shown to customers |
   | Order numbers prefixed `GC-` | order creation, `/orders` lookup, `lib/order-confirmation.ts` | Existing orders and customers' saved numbers depend on the format |
   | `gocart:cart` and `gocart:wishlist` localStorage keys | `app/StoreProvider.js` | Not in the owner's rename list; renaming without a fallback would empty every saved cart |
   | `gocartAdminBootstrap` request-context key | `collections/Users.ts` | Internal constant, never stored or shown |
4. **Visual identity** ("lavender wash", the owner's choice on 2026-10-31 from three lighter-violet options on the real home page; warm-neutral, bright-coral and minimal-green passes came before it): a near-black "M" monogram (header, footer, favicon, admin logo) and a one-colour wordmark. A faintly violet page (`#FCFAFF`), lavender wells and strips (`#F1ECFF`), one bright violet (`#5F42EC`) for actions, hot pink (`#CC1966`) for real discounts and sale labels, amber for "Limited edition", near-black text. The home page layout combines the owner's chosen mockups (banner slider, category shortcuts and promises, large-card rails, cash-on-delivery steps). The values change in the `@theme` block of `app/globals.css`; the token *names* (`lavender`, `pink`) are kept so components did not need rewriting, and the block's comment says what each name now means.

**Alternatives considered**:

- **Rename every identifier, including infrastructure.** Rejected: data loss and outage risk (the volume, the database role, live URLs) for no customer benefit.
- **Edit the Accepted Architecture Decision Records to say Mirza.** Rejected by the owner: Accepted Architecture Decision Records are a historical record.
- **Rename the colour tokens to match their new values.** Deferred: dozens of files would change for no visible effect. It is a candidate for a later clean-up.

**Consequences**:

- Run migration `20261031_160131_mirza_store_name` against each database with the owner role before the new code serves traffic. It is metadata-only (`ALTER COLUMN ... SET DEFAULT`).
- The retained identifiers above still contain "gocart". They are intentional; do not "fix" them without a new decision.
- **Owner data, not code:** the test site's Settings still has the demo placeholder address (`Demo Store, Sample Street, Placeholder City (fake address)`), and its promo cards say "Summer Sale" and "Winter Sale" side by side. Both are edited in /admin.

## Architecture Decision Record 048: Categories are flat: one level, no sub-categories (Milestone 102)

**Status**: **Accepted (2026-11-01)**. Owner decision in the Milestone 102 request (2026-11-01): "only categories -> products, no sub-category across the project", with the choices recorded below made by the owner in the same session. The pull request merge is the owner's confirmation.

**Supersedes** the two-level hierarchy of [Architecture Decision Record 013](#architecture-decision-record-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy) (parent/child categories, the parent roll-up, the parent breadcrumb and child navigation). Architecture Decision Record 013's other decisions stand: category browsing ships, on flat `/category/[slug]` URLs, with `/categories` as the index. Architecture Decision Record 013's text is not edited.

**Context**: The catalogue was four departments (Electronics, Fashion, Home & Living, Beauty & Care) holding no products of their own, and eleven sub-categories holding all 24 products. The owner wants customers and admins to see one list of categories with products in them.

**Decision**:

1. **Schema**: the `parent` field is removed from the `Categories` collection (with its two-level validation and the admin list column). Admins can no longer create a sub-category.
2. **Migration `20261101_205147_flat_categories`** (run with the owner role, like every migration, Architecture Decision Record 032), in this order:
   - **Smart Watches is merged into Watches** (owner's choice, so the store keeps 10 categories): its products move to Watches and the empty Smart Watches row is deleted. Only when both slugs exist.
   - **`display_order` is renumbered 1..n** in the old reading order (each department's sub-categories in turn), so the flat list keeps the order customers saw.
   - **A former department is deleted only if no product is filed directly under it.** One that still holds products stays as an ordinary category. No product loses its category.
   - The `parent_id` column, its foreign key and index are dropped.
   - `down` restores the column, key and index only. The hierarchy, the deleted departments and Smart Watches are not restorable except from a database backup.
3. **Storefront**: `lib/payload/categories.ts` returns one flat list (`getCategories`, `getCategoriesCached`); a category page lists only its own products (no roll-up), has no sub-category pills and no parent breadcrumb; `/categories`, the header row, the footer, the sitemap, the home banner shortcuts and the Featured tabs all use the flat list.
4. **Home page** (same request): the desktop "Shop by category" tiles are removed. The category shortcuts under the banner are circles with the name below on a phone (about 4 to 5 visible, swipe for the rest, then "View all") and stay the existing pills from `md`.
5. **Seeds**: `scripts/demo-data/catalogue.ts` lists the 10 flat categories (Smart Watches products filed under Watches); `scripts/seed.ts` (continuous integration) creates four flat categories (Electronics, Speakers, Headphones, Watches).

**Alternatives considered**:

- **Keep the four departments and move every product into them.** Offered; the owner chose to promote the sub-categories instead.
- **Hide sub-categories on the storefront only, keep `parent` in the schema.** Offered; the owner chose full removal, so admins cannot recreate a hierarchy by accident.
- **Keep all eleven sub-categories.** Offered; the owner chose 10, merging Smart Watches into Watches.

**Consequences**:

- Run migration `20261101_205147_flat_categories` on every database (Neon test included) with the owner role **before** the new code serves traffic: the new code no longer reads `parent_id`, and the old code fails without it.
- `/category/electronics`, `/category/fashion`, `/category/home-living`, `/category/beauty-care` and `/category/smart-watches` return 404 on databases where the migration deleted them. They were not in any external link we control; search engines drop them on the next crawl (the sitemap no longer lists them).
- The demo Watches description now says "Analog and smart watches"; the migration does not edit descriptions, so an existing database keeps its text until an admin edits it.
- `docs/CATEGORY_REQUIREMENTS.md`'s parent/child sections describe the former design; the file carries a note pointing here.

## Architecture Decision Record 049: Demo photography: identification of demo records without a schema change, a provenance manifest, and a local image-processing pipeline (Milestones 103 to 109)

**Status**: **Accepted (2026-11-03)** under the owner's delegation of 2026-11-03 recorded in [GATES.md](../.claude/docs/GATES.md) ("Owner delegation: technical decisions and approvals for the test environment"). It was Proposed on 2026-11-01; Milestones 103 to 107 were built while it was Proposed, and this acceptance ratifies that work. It edits no Accepted Architecture Decision Record and supersedes none: [Architecture Decision Record 020](#architecture-decision-record-020-media-storage-backend-is-a-local-docker-volume-for-v1-with-cloudflare-r2-as-the-designated-successor) (media storage), [Architecture Decision Record 034](#architecture-decision-record-034-image-optimisation-under-docker--nexts-built-in-optimizer-webp-only-local-media-only-milestone-51) as amended by [Architecture Decision Record 036](#architecture-decision-record-036-strict-turnstile-policy-idempotent-orders-no-victim-lock-out-a-closed-first-admin-window-separate-database-roles-and-interim-nextjs-mitigations-milestone-52b-security-batch) (optimizer off, upload formats), [Architecture Decision Record 046](#architecture-decision-record-046-free-non-commercial-test-hosting-vercel-hobby--neon-free--vercel-blob-milestone-100) (test hosting) and [Architecture Decision Record 048](#architecture-decision-record-048-categories-are-flat-one-level-no-sub-categories-milestone-102) (flat categories) all stand. Owner decisions this records: the brief of 2026-11-01 (keep `images.unoptimized: true`, no new storage system, no unnecessary schema change, local first, never production). **Amended 2026-11-03 before acceptance** (while still Proposed): item 1 no longer depends on a committed `DEMO_INVENTORY.csv` (see the note under item 1); item 6 is added for Milestone 108. **Milestone 109 is not authorised by this acceptance**: it stays on hold until the owner gives the client's go-ahead. Full plan: [VISUAL_ASSETS_PLAN.md](./VISUAL_ASSETS_PLAN.md).

**Evaluation (2026-11-03)**: checked against Architecture Decision Records 006 and 009 (no data-model or access change), Architecture Decision Record 015 (production baseline untouched), Architecture Decision Record 020 (media bytes are backed up explicitly by Milestone 109), Architecture Decision Record 026 (no order path touched; whether `Orders` allows admin delete is **unverified** and must be checked before Milestone 109), Architecture Decision Records 034 and 036 (optimizer stays off, per-placement byte budgets instead), Architecture Decision Record 046 (uploads go through the `Media` collection and the Blob adapter; the restricted `gocart_app` role already holds the needed grants) and Architecture Decision Record 048. No conflict found.

**Context**: The demo catalogue (24 products, 10 categories, generated vector art; plus 4 blank-image products from `scripts/seed.ts`) is temporary and will be removed before launch. The owner wants real, licence-verified photography for the demo and a safe way to remove demo data later. No collection has a demo marker. `Media` records no source or licence. The image optimizer is off, so each uploaded file is what customers download.

**Decision** (proposed):

1. **Demo records are identified without a schema change**, by the conventions the seed already follows (product exact name from `scripts/demo-data/catalogue.ts`; category slug; media filename `<product-slug>-<n>.webp` / `category-<slug>.webp`; demo order customer names, phones and idempotency keys), plus a `demo-` filename prefix for any new demo media (hero, promo, share image). Matching on a single signal is not enough; deletion acts only on rows listed in a per-environment `docs/assets/DEMO_INVENTORY.csv` that records how each row was identified and whether anything non-demo references it. *Amendment 2026-11-03:* the owner scoped Milestone 103 to a code-reading audit because the whole database is demo ([VISUAL_ASSETS_PLAN.md](./VISUAL_ASSETS_PLAN.md) section 11), so `DEMO_INVENTORY.csv` does not exist yet; it is created by Milestone 109 (or replaced by a per-database id list taken before the import) before any deletion. The rule stands: nothing is deleted that is not on that list.
2. **Provenance is kept in `docs/assets/MANIFEST.csv`**, outside the database: source, author, licence URL and check date, checksums of original and processed files, dimensions, bytes, target record, media id and environment, and a `catalogue` column (`demo`|`original`). A licence is read per image; none is assumed.
3. **A local, development-time image pipeline** archives originals, produces WebP (JPEG for the share image), resizes per placement, strips metadata, enforces dimension and byte budgets, and validates files before upload. It uses the existing `sharp` dependency and adds none. Output is ordinary files uploaded through the existing Payload `Media` collection.
4. **Demo cleanup is inventory-driven, dry-run by default, and backup-first**: orders, then products, then a media reference check, then empty categories. Media referenced by any non-demo record is never deleted. Production use needs its own owner approval.
5. **No change** to `images.unoptimized`, the `/_next/image` closure, `Media.mimeTypes`, access control, checkout or any collection field.
6. **Test-site rollout (Milestone 108) is a guarded one-off operator tool, not an app route and not a loosening of the seed.** `scripts/rollout-demo-photos.ts` (npm `rollout:demo-photos`) refuses everything except one explicitly named Neon test database: `--env test`, a `*.neon.tech` host that equals `DEMO_ROLLOUT_DB_HOST` with `sslmode` set and no connection-string parameter that could redirect the driver (`pg` lets `?host=` override the URL), `BLOB_READ_WRITE_TOKEN` set, no production variable and no Payload drop/force-push switch. It also sets `PAYLOAD_MIGRATING=true` before Payload loads, because the Postgres adapter otherwise pushes a dev schema on connect (found in review; it would alter the Neon schema and write a `dev` row into `payload_migrations`). It is dry-run by default, validates every processed photo first, finds media by name stem, byte size and alt (Payload increments a trailing number on a filename clash, observed on 2026-11-03, so names alone cannot identify a file), only creates or relinks rows (products by exact name, categories by slug), never deletes, never prints a credential, and records `media_id` with `media_env=test` in the manifest. `scripts/seed-demo.ts` keeps its local-only guard unchanged.

**Alternatives considered**:

- **An `isDemo` boolean on products, categories, media and promo cards.** Makes the cleanup a single filter, but needs a migration on every database, four collection edits and a field that is useless after launch. Held back: the owner asked for no unnecessary schema change. Can be proposed on its own if the inventory proves too fragile.
- **Payload `imageSizes` (generated thumbnails).** Would let small cards avoid downloading a 1000 px file. It is a schema change (extra columns per size) and was not requested; the single-file budgets are the default. Left as open decision D6.
- **Re-enable the Next.js image optimizer.** Rejected by the owner for this project; Architecture Decision Record 036 stands.
- **Commit photos to the repository.** Rejected: the existing `demo-assets/*` rule keeps photos out of git, and licences are tracked in the manifest instead.
- **Match demo rows by name alone.** Rejected: names and the `headphones`/`speakers`/`watches` slugs can collide with the owner's real catalogue.

**Consequences**:

- Cleanup correctness depends on keeping `DEMO_INVENTORY.csv` accurate per environment; a row not in it is never deleted.
- A real catalogue that reuses a demo category slug keeps that category (edited, not deleted).
- Originals live in a git-ignored folder on one machine; the manifest checksums let the owner verify a copy but do not replace a backup.
- Single-file budgets mean cards download the same file as the product page; the cost is bounded by the budget, not removed.
- Photos of real products are not stock photos: this Architecture Decision Record covers temporary demo items only. The owner's original catalogue uses the owner's own images.
- Open points for the owner are listed in [VISUAL_ASSETS_PLAN.md](./VISUAL_ASSETS_PLAN.md), section 11 (D1–D8).


## Architecture Decision Record 050: Admin-editable storefront content: a `storefrontContent` global and a `heroSlides` collection (Milestone 110)

**Status**: **Accepted (2026-11-05)** on the owner's explicit request of 2026-11-05 (the owner asked for the announcement text, banner images and text, section headings and footer text to be editable in `/admin`, and chose the options below). It adds a global, a collection and one additive migration; it does not touch Architecture Decision Record 006 (single store), Architecture Decision Record 009 (embedded Payload), Architecture Decision Record 026 (orders) or any access rule of an existing collection.

**Context**: The strip above the menu was hard-coded in `components/AnnouncementBar.tsx` (plus the delivery sentence built from Settings), the home banner's slides were built in code from product data (`lib/hero-slides.ts`), and the section headings and the footer sentence were literals. Changing any of them needed a code change and a deploy. Milestone 101 had also made the bar static (a long moving line was cut mid-word on a phone); the owner asked for the sliding behaviour back.

**Decision**:

1. **A `storefrontContent` global** (read public, update admin-only, like Settings) holds: up to six announcement messages, two checkboxes (the automatic delivery message; the "Track order" link), the Featured and New arrivals heading, description and link label, and the footer sentence. Every field is optional: an empty field falls back to the wording the storefront had before (`lib/storefront-content.ts`), so a fresh database and a half-filled form render a complete page. Links are not editable here; only words.
2. **A `heroSlides` collection** (same pattern and access as promo cards, Architecture Decision Record 039: public readers see only active slides; admin sees all) holds the banner slides: title, text, badge and tone, button text, an internal-path-only link (the same validator as promo cards, checked again when read), up to two Media pictures, order and active. **While at least one slide is active only the admin's slides show; with none active the automatic slides (deals, new arrivals, delivery) remain**, so the banner is never empty (the owner's choice over "always replace" and "add to").
3. **The delivery sentence stays automatic**: it is built from Settings (Architecture Decision Record 018) so it cannot disagree with checkout; an admin can switch it off, not rewrite it.
4. **The announcement bar** shows one message at a time, crossing the bar from left to right (Milestone 93's behaviour, 12 s per message); it stops while hovered or focused, after a tap or Enter/Space (WCAG 2.2.2) and for anyone who asked their device to reduce motion (the first message then stands still). The first message is in the server-rendered HTML.
5. **Featured** is a plain grid of up to twelve products (4 columns = 3 rows on a wide screen, 3 = 4 rows on a tablet, 2 = 6 rows on a phone) with the existing category tabs, a "View all" link in the heading and a button under the grid; the slider is removed from this section only.
6. **Readers never throw**: a failed read (for example before the migration is applied) returns the previous wording and the automatic slides, so no public page breaks because of this change. The admin screens for the new collection and global need the migration.

**Consequences**:
- One additive migration (`20261105_121934_storefront_content`: four new tables, two enums and one column on `payload_locked_documents_rels`; no existing data is changed). The test and any production database need it applied (owner role) **before** the new code is deployed to serve the admin screens; the public pages degrade safely without it.
- Banner pictures are Media uploads; their alt text comes from the Media record, so an admin must fill it in.
- The bar's messages are plain text (no HTML, no links). A phone shows the same moving line as a desktop; very long messages take longer to cross (12 s each, fixed).
- Out of scope: editing links of the section headings, the three delivery steps, the category shortcuts or the promo cards' layout (promo cards were already editable).


## Architecture Decision Record 051: Admin sign-in by username and password; the first admin from a username (Milestone 114)

**Status**: **Accepted (2026-11-11)** on the owner's explicit request of 2026-11-11 ("I want admin sign-in by username and password instead of email"). The owner chose: username only (an email does not sign in), the email kept as an optional field, and a deploy to the test site after merge. It amends **Architecture Decision Record 036** point 5 only in the name of the first-admin secret (`ADMIN_BOOTSTRAP_EMAIL` becomes `ADMIN_BOOTSTRAP_USERNAME`); the closed first-admin window, the `beforeOperation` guard and every other Architecture Decision Record 036 decision are unchanged.

**Context**: `/admin` signed in with an email and password (Payload's default `auth: true`), and the first admin was created from `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_BOOTSTRAP_PASSWORD` (Architecture Decision Record 036). The owner wants admins to use a username. Pull request #70 (2026-11-06) had built username-or-email sign-in without a milestone or Architecture Decision Record; Milestone 114 takes it over and narrows it to username only.

**Decision**:

1. `collections/Users.ts` uses Payload `loginWithUsername` with `allowEmailLogin: false`, `requireUsername: true`, `requireEmail: false`. The login form, the REST and GraphQL login, first-register, forgot-password and unlock all take a username. Usernames are matched case-insensitively (checked locally: `OWNER-1` signs in as `owner-1`).
2. The email stays on the account as an **optional** field, for a future password-reset or notification email (Architecture Decision Record 015's Resend). It never signs in.
3. Migration `20261106_093227_username_login`: adds a unique `users.username`, makes `email` nullable, drops the unique index on `email` (Payload's schema no longer has it once the email is not a login identifier; two admins could share an email) and **backfills existing admins** with `<part of the email before the @, cleaned to A-Z a-z 0-9 . _ - and lower-cased>-<id>` (for example `Owner@example.com` with id 1 becomes `owner-1`), so nobody is locked out; they sign in with that username and their unchanged password. Lower case matters: Payload lower-cases a username at sign-in and compares it exactly. Its `down` refuses, with a clear error and no change, while any admin has no email.
4. The first admin is created from `ADMIN_BOOTSTRAP_USERNAME` (3 to 40 characters of `A-Z a-z 0-9 . _ -`) and `ADMIN_BOOTSTRAP_PASSWORD` (the Architecture Decision Record 036 password rules, unchanged). `check-env`, `bootstrap-admin`, Compose, continuous integration, `prod-stack-check` and the end-to-end helper (`E2E_ADMIN_USERNAME`) follow.

**Consequences**:
- The migration must be applied to a database (owner role) **before** code with this change serves it: this code reads and writes `users.username`, so admin sign-in fails until the column exists. On the test site, apply it first, then deploy.
- Existing admins must be told their new username (it is derived as above, and visible in `/admin` > Users).
- An admin without an email cannot get a password-reset email. Today no email adapter is configured (Payload writes email to the console), so reset by email does not work for anyone yet; another admin, or the owner with database access, resets a password.
- A username is easier to guess than a private email address. Payload's per-account lockout (defaults: 5 failed attempts, 10 minutes; not changed here) and the strong-password rule for the bootstrap admin remain the protections, but the lockout lets anyone who guesses a username keep that admin locked out and confirm the username exists. A per-IP rate limit on the admin sign-in endpoints is therefore **launch blocker 6** in `docs/DEPLOYMENT.md`. The admin panel stays the only authenticated surface.
- Forgot-password now takes a username (confirmed in Payload's code): an unknown username answers the same as a known one, the reset token is never returned or logged (the console email adapter logs only recipient and subject), and no email is sent to an admin without one.
- Out of scope: two-factor sign-in, username rules for admins created later in `/admin` (Payload's own validation applies), and renaming existing usernames (an admin can edit theirs in `/admin`).

## Architecture Decision Record 052: Hybrid palette: warm ivory surfaces, one violet for actions, an aubergine dark surface (Milestone 116)

**Status**: **Accepted (2026-11-12)** by the owner on 2026-11-12, choosing the "hybrid" option of the premium storefront redesign audit (`docs/redesign/PHASE0_AUDIT.md` §4) over the unchanged kit and over the owner's own first proposal (aubergine `#352746`, violet `#5945A6`, ivory `#F7F5F0`, champagne `#B69A69`). It **amends Architecture Decision Record 047 item 4** (visual identity) in its surface and dark-surface colours only; the monogram, wordmark, one action violet and the status colours of Architecture Decision Record 047 stand. It also records a change Architecture Decision Record 047 never received: commit `bc5a77a` (2026-11-10) had already moved the storefront from the "lavender wash" page and wells (`#FCFAFF`, `#F1ECFF`) to neutral grey surfaces (`#FAFAFC`, `#F5F4F8`), renamed the tokens (`lavender`/`pink` to `accent-soft`/`sale`...) and changed the sale text colour to `#A8144F`, without an Architecture Decision Record, plan or changelog entry. Architecture Decision Record 039 (promo tones use existing tokens), Architecture Decision Record 043 (the admin uses the storefront's look) and Architecture Decision Record 050 (stored `tone` values) are unchanged.

**Context**: the owner wants a premium, editorial feel instead of a template look. The brand kit (Milestone 113) documents the storefront after `bc5a77a`: cool grey surfaces, `#5F42EC` for every action, no second accent. The owner's first proposal added a warm ivory, an aubergine and a champagne accent and swapped the violet for a duller `#5945A6`. Measured (WCAG 2.2): champagne fails as text on white (2.69:1) and ivory (2.47:1) and would be a second accent the kit forbids; `#5945A6` would change the recognisable brand violet used in the kit, the admin and every screenshot.

**Decision**:

1. **Raw palette in `app/tokens.css`** (plain CSS custom properties, Milestone 115); Tailwind role tokens in `app/globals.css` point at it; the admin reads the same file (Milestone 117). A colour changes in `tokens.css` only.
2. **Kept**: violet `#5F42EC` (actions, links, selected states, focus) and `#4A2FD0` (hover); violet tints `#EEE9FF`/`#E2DAFF` (selected states, soft buttons, the hero panel); ink `#1D1D1F`..`#636368`; sale `#A8144F`/`#CC1966`/`#FFE4F0` (real discounts only); amber `#FFC247` ("Limited edition" only); success `#0B6E4F`/`#E6F2EE`; disabled `#A1A1A6` (disabled controls only).
3. **Warm neutral surfaces** replace the cool greys: page `#F7F5F0` (warm ivory), cards stay white `#FFFFFF`, photo wells and the announcement strip `#F1EEE8`, lines `#E8E4DC` / `#DDD8CE` / `#C6BFB2`, form-field boundary `#8A8275`.
4. **One dark surface**, aubergine `#352746` (`inverse`), for the footer and, from Phase 2, at most one editorial band per page; text on it is white (`on-inverse`) at 100/75/60% opacity. On it the wordmark is the white wordmark only (brand kit: the near-black monogram is not used on dark), and the keyboard focus ring is white, because violet on aubergine is 2.27:1.
5. **No champagne and no second accent colour.** No gradients on buttons. Plus Jakarta Sans stays the only typeface (Architecture Decision Record 043 unchanged).
6. Stored select values (`heroSlides.tone`, `promoCards.tone`, product `label`) are not added or renamed; components map existing values onto the palette.

**Contrast (WCAG 2.2, measured)**: ink on page 15.45:1; ink-2 on page 9.19:1; muted on page 5.48:1 and on wells 5.16:1; violet on page 5.54:1; white on violet 6.04:1; sale on page 6.70:1; success on page 5.74:1; field boundary 3.80:1 on white and 3.48:1 on page (WCAG 1.4.11); white / 75% / 60% on aubergine 13.73 / 8.39 / 5.98:1.

**Consequences**:
- The admin's hand-copied brand values (`--mirza-primary #5B3FD9`, ink `#1C1A2E`, pink `#E8336D`, success `#157544`) are replaced by the shared ones in Milestone 117; the admin violet visibly moves to `#5F42EC`. Admin surfaces (Payload's grey ramp, page, sidebar) are not changed by this Architecture Decision Record.
- The brand kit (`docs/brand-kit/`, Milestone 113) and its contrast table describe the pre-ADR palette until it is regenerated (a follow-up, not part of Milestones 115 to 117).
- The comment and contrast table at the top of `app/globals.css` are updated with the values.
- Rollback: revert Milestone 117 (values only); Milestone 115's structure keeps working with any values.

---

## Architecture Decision Record 053: The Mirza Cart brand: name, clean neutral palette and shopping-cart logo (Milestone 122)

**Status**: **Accepted (2026-11-13)** by the owner on 2026-11-13, who fixed the name, the palette ("Option 1, Clean Neutral + Violet") and the logo direction ("Abstract Shopping Cart"), and chose logo concept A ("Solid Basket") from three presented. It **amends Architecture Decision Record 047** (the brand name and the logo) and **supersedes Architecture Decision Record 052 item 3** (warm ivory surfaces). Everything else in those records stands: one action violet, the aubergine dark surface, the status colours, Plus Jakarta Sans as the only typeface (Architecture Decision Record 043).

**Context**: the owner finalised the brand after the premium storefront redesign (Milestones 115 to 121). The name "Mirza" alone and its "M" monogram are replaced; the warm ivory surfaces of Architecture Decision Record 052 are replaced by cool, clean neutrals.

**Decision**:

1. **Name**: the brand is **Mirza Cart**. It remains the Settings `storeName` value (never hard-coded in a component). The default changes from "Mirza" to "Mirza Cart"; migration `20261113_204148_mirza_cart_store_name` changes the column default and renames a stored name **only when it is exactly "Mirza"** (any other name an admin saved is left alone).
2. **Palette** (raw values in `app/tokens.css`, role tokens in `app/globals.css`):

   | Role | Colour |
   |---|---|
   | Page background | `#F8F8FA` |
   | Cards and primary surfaces | `#FFFFFF` |
   | Product image wells, announcement strip | `#F1F2F5` |
   | Brand violet (actions, links, selected states, focus) | `#5F42EC` (hover `#4A2FD0`, tints `#EEE9FF` / `#E2DAFF`) |
   | Deep aubergine (the one dark surface: footer) | `#352746` |
   | Main text | `#242328` |
   | Lines | `#E9E9EE` / `#DEDEE5` / `#C4C4CD`; form-field boundary `#83838F` |

   Status colours (sale, amber, success) are unchanged. No second accent, no gradients on buttons.
3. **Logo**: an abstract shopping cart (a filled, forward-leaning basket, a short handle, two wheels) in white on a rounded violet tile; on the aubergine surface the tile is white and the cart violet. The wordmark is the store name in Plus Jakarta Sans, first word weight 800 and the rest weight 500. Source: `components/ui/BrandLogo.tsx`; the same mark is `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png` and the admin logo. The "M" monogram is retired.
4. **Identifiers that keep an older name on purpose** (renaming them risks data or infrastructure and gains nothing a customer sees): everything Architecture Decision Record 047 already listed (`gocart_app` database role, Docker project, `GC-` order numbers, `gocart:cart` / `gocart:wishlist` storage keys, the repository and Vercel names, historical migrations), plus the `--mirza-*` CSS variables and `.mirza-*` classes of the admin stylesheet, the `mirza:last-order` session storage key, the brand kit file names under `docs/brand-kit/` and accepted decision records and past milestone entries, which keep the name that was true when they were written.

**Contrast (WCAG 2.2, measured)**: text on page 14.71:1; muted text on page 5.63:1 and on wells 5.34:1; violet on page 5.69:1; white on violet 6.04:1; sale on page 6.88:1; field boundary 3.74:1 on white and 3.53:1 on page (WCAG 1.4.11); white on aubergine 13.73:1.

**Consequences**:
- A database migration (default and the conditional rename) must be applied before the code is deployed, as with Milestone 101.
- The admin's own surfaces (sidebar, page, Payload's grey ramp, Architecture Decision Record 043) are unchanged; it shows the new mark and the new name.
- The brand kit (`docs/brand-kit/`, Milestone 113) describes the earlier identity until it is regenerated.
- Rollback: revert the pull request and run the migration's `down` (it restores the default and renames "Mirza Cart" back to "Mirza").



## Architecture Decision Record 054: Admin crop tool on every image upload and a generated size per storefront placement (Milestone 124)

**Status**: **Proposed (2026-11-14)**, written after the owner asked for the crop tool to be available on every media or product image upload, with each placement keeping its own ratio. It changes no Accepted decision: Architecture Decision Record 020 (storage), 036 (allowed image types) and 046 (test environment) are unchanged.

**Context**: the `media` collection had no `imageSizes`, so Payload offered no crop tool on upload, and the storefront showed the original file and relied on CSS `object-cover`. A photo with another ratio was cut at the centre, often through the product. Placements use different ratios: product 1:1, category 4:3, home banner 16:10.

**Decision**:

1. **`imageSizes` on `media`**: `product` 1000 by 1000, `category` 800 by 600 and `hero` 1600 by 1000, each `fit: 'cover'`, `position: 'attention'` and WebP at quality 80. Declaring sizes is what makes the admin show the crop tool (the Edit button beside a chosen file). Promo cards have no size: they show the whole image (`object-contain`), so a crop would only remove part of it.
2. **Automatic framing**: with no admin crop, sharp's `attention` strategy (brightness detail, colour saturation, skin tones) chooses the framing. Measured on a synthetic photo, the square kept 3.6 times more of the subject than a centre crop (`scripts/media-sizes.db-test.ts`).
3. **`focalPoint: false`**: Payload gives every new upload a centre focal point and, with a focal point set, ignores `position` and crops around it (read in `node_modules/payload/dist/uploads/generateFileData.js` and `getImageResizeAction.js`). Keeping the focal point would therefore switch the automatic framing off. The admin's manual correction is the crop tool instead. The existing `focal_x` and `focal_y` columns stay in the table, unused.
4. **A crop replaces the stored original** (verified: a crop box produced a stored file of the cropped size). The sizes are generated from the cropped image. The admin crop is free-form: width and height fields, no ratio lock.
5. **Storefront**: `lib/media.ts` (`mediaUrl`) returns the size for the placement and falls back to the original file. Media uploaded before this change, and images smaller than a size (Payload omits a size rather than enlarge), keep working through the fallback.
6. **`sharp` is passed to `buildConfig`** in `payload.config.ts`, which Payload needs to generate sizes and apply crops. No new package: `sharp` is already a dependency.

**Consequences**:
- A migration (`20261114_035841_media_image_sizes`, 18 nullable columns and 3 indexes on `media`, no data change) must be applied to the test Neon before the code is deployed.
- Media uploaded before the change has no sizes until it is uploaded again; the storefront shows its original file as before. A one-off regeneration script is not part of this milestone.
- Whether sizes are generated for uploads sent straight from the browser to Vercel Blob (`clientUploads: true`) is read from Payload's source (it fetches the file back when sizes are configured) but is **unverified** on the test site until the first upload there.
- Rejected: a custom crop component (react-easy-crop) for an always-remembered crop. It needs a new dependency, is exposed to Payload upgrades and Payload's own crop already covers the request.
- Rollback: revert the pull request and run the migration's `down`.
