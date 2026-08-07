# Decisions — GoCart Pakistan

Architecture Decision Record (ADR) log. Each entry: Context, Decision, Consequences. Newest at the bottom. Add a new entry rather than editing history — if a decision changes, record the change as a new ADR that supersedes the old one.

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

**Status**: Proposed — confirm before Phase 1 build work starts

**Context**: `prisma/schema.prisma` models a multi-vendor marketplace (`User`, `Store`, `Product`, `Order`, `OrderItem`, `Rating`, `Address`, `Coupon`) and is not currently wired to any Prisma client dependency. Payload CMS v3 needs its own collection definitions and manages its own DB schema/migrations.

**Decision**: Treat the Prisma schema as historical reference for field/relationship intent only. Payload collections are the actual schema going forward. `prisma/` directory removal is a future, explicit code change — not implied by this doc.

**Consequences**: No functionality is lost by this decision alone since the Prisma layer was never live; it does mean the eventual Payload collection design should be checked against this schema for domain concepts worth keeping (e.g. `Coupon` shape, `Rating` uniqueness constraint).

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

**Consequences**: `app/store/*` (vendor dashboard), `app/admin/approve` and `app/admin/stores` (vendor approval/management), and the `Store` model's marketplace semantics (`status`, `isActive`, per-store ownership of products/orders) are **not carried forward** into the target product. `Products` and `Orders` in the Payload collection design (Phase 2, see `TASKS.md`) belong to the platform directly — no store/vendor relation. This is a significant scope reduction from the current codebase, not just an auth change. No application code has been removed yet under this decision; removal of the legacy vendor/admin-approval routes and the `Store` model is future implementation work.

---

## ADR-007: SEO-first and mobile-first are default requirements, not a later pass

**Status**: Accepted (stakeholder requirement)

**Context**: Ecommerce discovery in the target market is search- and mobile-heavy.

**Decision**: Every storefront page ships with proper metadata/structured data and is designed mobile-first from the start, rather than treating SEO/responsiveness as post-launch cleanup.

**Consequences**: Feature work in `docs/TASKS.md` Phases 4–6 includes SEO and mobile review as part of the definition of done, not a separate deferred phase.

---

## ADR-008: Dockerize app, CMS, and database for both dev and production

**Status**: Accepted (stakeholder requirement)

**Context**: No containerization exists today; `next.config.mjs` has Vercel-oriented defaults (`images.unoptimized: true`) that don't suit a self-hosted deployment.

**Decision**: Provide a multi-stage `Dockerfile` for the app and a `docker-compose.yml` covering the app and PostgreSQL, usable for both local development and as the basis for production deployment.

**Consequences**: Production-specific config (secrets, health checks, image optimization loader) needs to be revisited away from the current Vercel-shaped defaults.
