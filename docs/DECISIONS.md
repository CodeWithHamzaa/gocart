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
