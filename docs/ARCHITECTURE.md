# Architecture — Mirza (formerly GoCart Pakistan)

This document describes the system **as it exists today** (a single-store Cash-on-Delivery storefront on Payload CMS v3 and PostgreSQL, checked against the code on 2026-10-24) and the **target architecture** it follows. Milestone status is in [TASKS.md](./TASKS.md); launch is not cleared (see "Launch blockers" in [DEPLOYMENT.md](./DEPLOYMENT.md)).

## As-is (current repository state)

- **Framework**: Next.js 16.3.8 (Milestone 52c, Architecture Decision Record 037), App Router, React 19; TypeScript is established (`allowJs`, so some inherited `.jsx` remains)
- **Styling**: Tailwind CSS 4
- **State management**: Redux Toolkit (`lib/store.js`, `lib/features/{cart,address}`) for the client-side guest cart and address; server state comes from Payload
- **Data layer**: Payload CMS v3 embedded in the Next.js app, PostgreSQL through `@payloadcms/db-postgres`. Collections: `Users`, `Media`, `Categories`, `Products`, `Orders`, `PromoCards`; global `Settings`. Production schema comes from committed migrations (`/migrations`), run by the `migrate` step
- **Auth**: Payload `/admin` login only; no customer login, no middleware
- **Payment**: Cash on Delivery only
- **Currency**: `Rs. ` via `NEXT_PUBLIC_CURRENCY_SYMBOL`
- **Routes**: `app/(public)/*` storefront, `app/(payload)/*` Payload admin and API, `app/api/health`; the multi-vendor routes and the inherited dummy data are removed
- **Deployment**: `Dockerfile` (stages `deps`, `dev`, `builder`, `migrate`, `production`), `docker-compose.yml` (development) and `docker-compose.prod.yml` (production, behind a Cloudflare Tunnel); `next.config.mjs` currently sets `images.unoptimized = true` (the Milestone 51 optimizer was suspended by [Architecture Decision Record 036](./DECISIONS.md))
- **CMS**: Payload, as above

### Collections and access (verified against `collections/*.ts` on 2026-10-24)

| Collection | Read | Create / update / delete |
|---|---|---|
| `Users` | admin only | admin only (an unauthenticated create is refused unless it comes from the server-side bootstrap or the dev-only first-register flag) |
| `Media` | public | admin only |
| `Categories` | public | admin only |
| `Products` | public | admin only (`label` is an optional select: New, Limited edition, Sale; `isFeatured` is admin-curated) |
| `PromoCards` | public sees only `active: true`; admin sees all | admin only |
| `Settings` (global) | public | admin only |
| `Orders` | admin only | admin only; guests order through the server action; identity and price-snapshot fields are update-locked ([Architecture Decision Record 026](./DECISIONS.md), [Architecture Decision Record 028](./DECISIONS.md)) |

## Target architecture

```
                         ┌─────────────────────────────┐
   Customer (guest) ───▶ │   Next.js App Router         │
   Admin (login) ──────▶ │   - Storefront (SSR/ISR)     │
                         │   - Payload Admin UI          │
                         └──────────────┬───────────────┘
                                        │ Payload Local/REST/GraphQL API
                                        ▼
                         ┌─────────────────────────────┐
                         │   Payload CMS v3              │
                         │   - Auth (admin collection)   │
                         │   - Products/Categories/Media │
                         │   - PromoCards (active only)  │
                         │   - Orders                     │
                         └──────────────┬───────────────┘
                                        │ Postgres adapter
                                        ▼
                         ┌─────────────────────────────┐
                         │   PostgreSQL                  │
                         └─────────────────────────────┘

All of the above run as Docker containers (docker-compose for dev, hardened images for prod).
```

### Frontend

- Next.js App Router stays as the storefront rendering layer — SSR/ISR for product and category pages to satisfy search-engine-optimization-first.
- **Payload CMS v3 runs embedded inside the Next.js app** — one codebase, one build, one container. Its admin user interface mounts at `/admin` and its REST/GraphQL API under `/api`, both as App Router routes; server-rendered storefront pages read through Payload's Local API with no HTTP hop. Decided in [Architecture Decision Record 009](./DECISIONS.md#architecture-decision-record-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service) (Accepted 2026-08-14) — running Payload as a separate service was evaluated and rejected.
- Redux Toolkit likely stays for client-side cart state (guest cart doesn't need a backend session), but server state (products, orders) moves to Payload's API instead of Prisma.

#### Storefront route map (target)

| Route | Purpose | Rendering |
|---|---|---|
| `/` | Home — hero, category tiles, latest and featured sections | SSR |
| `/categories` | Category index: all top-level categories with their children (Milestone 27b) | SSR/ISR |
| `/category/[slug]` | Category detail + paginated product listing (Milestone 27a) | SSR/ISR |
| `/shop` | All products + name-based search (`?search=`) | SSR |
| `/product/[productId]` | Product detail | SSR/ISR |
| `/cart`, guest checkout, order confirmation/lookup | Cart and cash on delivery checkout flow | Client + SSR |
| `/admin` | Payload CMS admin user interface | Payload-owned |

Category URLs are **flat and slug-based** — a child category is `/category/phone-cases`, not
`/category/accessories/phone-cases` — so re-parenting a category in the admin never breaks a live URL
or an indexed page. `/category/[slug]` is the single canonical products-by-category URL; no
`/shop?category=` parameter exists, since two URLs for one result set split ranking signals. Settled
by [Architecture Decision Record 013](./DECISIONS.md#architecture-decision-record-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy);
full behavior in [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md).

#### `/admin` route ownership

`/admin` belongs to Payload in the target architecture. The inherited codebase serves its own hand-built admin from `app/admin/*` (with a hardcoded `isAdmin = true` bypass), which resolves to the same path. **The legacy admin is removed before Payload mounts** — Milestones 16 and 17, and Milestone 19 precede Milestone 3 — so at no point do two implementations own `/admin`. **Milestone 14 also precedes Milestone 3**, for an unrelated reason: `app/store/**` collides with the multiple-root-layouts restructuring Payload's mount requires, per [Architecture Decision Record 014](./DECISIONS.md#architecture-decision-record-014-milestone-14-is-a-hard-prerequisite-of-milestone-3-not-an-order-independent-milestone). See the execution order in [MIGRATION_PLAN.md](./MIGRATION_PLAN.md).

### Backend / CMS

- **Payload CMS v3** replaces the unwired Prisma layer as the system of record.
- **Collections and globals are implemented** (Milestones 6 to 13, 13a, Done 2026-08-17): `Users` (admin-only, `auth: true`), `Products`, `Categories`, `Media`, `PromoCards` (Milestone 71, [Architecture Decision Record 039](./DECISIONS.md): home promo cards; the public reads only `active` ones, writes are admin-only), `Orders` (with embedded/guest customer + address fields, no `User` relation), plus a `Settings` global (`globals/Settings.ts`) for shipping (flat rate + free-shipping threshold, per [Architecture Decision Record 018](./DECISIONS.md#architecture-decision-record-018-shipping-model--flat-rate-with-a-free-shipping-threshold-snapshotted-per-order)) and store contact info. Settings deliberately has **no currency-format field yet** — that convention is still open (`D7`, [PROJECT_SPEC.md](./PROJECT_SPEC.md)) and belongs to Milestone 55. **No `Coupons` or `Reviews`/`Ratings` collection in v1** — both decided out of scope, per [Architecture Decision Record 016](./DECISIONS.md#architecture-decision-record-016-reviews-are-out-of-scope-for-v1)/[Architecture Decision Record 017](./DECISIONS.md#architecture-decision-record-017-coupons-are-out-of-scope-for-v1).
- **`Categories` carries a `parent` self-relation** (`hasMany: false`) supporting exactly two levels — parent → child, with a third level rejected — plus a unique, indexed, stable `slug` that backs every category URL. `Products.category` is a single relationship (`hasMany: false`) to the most specific applicable category; parent category pages roll up their children's products rather than requiring double-filing. Per [Architecture Decision Record 013](./DECISIONS.md#architecture-decision-record-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy); field list in Milestone 9.
- Payload's built-in auth becomes the **only** login in the system — no separate customer or vendor auth.
- **`Orders` creation (Accepted, [Architecture Decision Record 026](./DECISIONS.md#architecture-decision-record-026-orders-are-created-only-by-a-server-side-function--orders-collection-create-access-closes-to-admins), 2026-10-09):** Milestone 13's public-create is verified to let anonymous callers set their own prices, totals, and status. The proposal is that guests create orders only through a server-side function (server action → `lib/payload/orders.ts`) that derives prices, shipping, status, and order number itself, with `Orders.create` closed to admins. Read access stays admin-only and guest lookup stays a separate `(orderNumber, phone)` function ([Architecture Decision Record 024](./DECISIONS.md)). Milestone 13's public-create remains the implemented behaviour only until Milestone 33 lands.
- **Order confirmation (Accepted, [Architecture Decision Record 027](./DECISIONS.md#architecture-decision-record-027-milestone-35-order-confirmation-is-rendered-from-the-placeorder-response-held-in-sessionstorage--no-server-read-of-orders), 2026-10-09):** Milestone 35's `/order-confirmation` page is rendered client-side from the `placeOrder` response (order number, totals, and the server-priced `items`) held in `sessionStorage`, not from a server read of `Orders`. There is no `/order-confirmation/[orderId]` route; revisiting an order is Milestone 36's `(orderNumber, phone)` lookup ([Architecture Decision Record 024](./DECISIONS.md)). Authorization is unchanged.
- **Order identity and price snapshot are immutable (Accepted, [Architecture Decision Record 028](./DECISIONS.md#architecture-decision-record-028-order-identity-and-price-snapshot-fields-are-immutable-after-creation--field-level-access), 2026-10-09):** `orderNumber`, `items[].unitPrice`, `orderTotal`, and `shippingCost` carry field-level `update: () => false`, so they are set only at creation and cannot be changed through REST, GraphQL, or the admin user interface afterwards. Collection-level access ([Architecture Decision Record 026](./DECISIONS.md)) is unchanged; status, `isPaid`, and customer/address fields stay editable. The `items` array and `items[].quantity`/`items[].product` are locked as well (amended 2026-10-10), so rows cannot be edited, added, removed or reordered after creation.

### Data store

- **PostgreSQL**, accessed exclusively through Payload's Postgres adapter (`@payloadcms/db-postgres`).
- The existing `prisma/schema.prisma` is treated as a **reference for field/relationship intent**, not carried forward as a live schema — Payload manages its own migrations. Retirement is settled in [Architecture Decision Record 003](./DECISIONS.md#architecture-decision-record-003-retire-the-unwired-prisma-schema-in-favor-of-payload-managed-collections) (Accepted 2026-08-14) and executed by Milestone 4.

### Payments

- Cash on delivery is the only active payment method. `Orders` collection should still model a `paymentMethod` field (mirroring the existing `PaymentMethod` enum shape) and an `isPaid` boolean, so a payment gateway can be added later as a new value + integration without restructuring the `Orders` collection.

### Search engine optimization

- Per-page `generateMetadata`, dynamic `sitemap.xml`/`robots.txt` (Next.js built-in file conventions), JSON-LD `Product`/`Organization` structured data, optimized images (Milestone 51 removed `images.unoptimized: true` and enabled Next's built-in optimizer for local media, WebP only — see [Architecture Decision Record 034](./DECISIONS.md)).

### Mobile-first

- Tailwind's mobile-first breakpoint model is already the default in this codebase; the work is auditing existing components (`components/*`) for mobile-first correctness, not introducing a new system.

### Docker / production readiness

- `Dockerfile` (multi-stage: `deps`, `dev`, `builder`, `migrate`, `production`) for the Next.js/Payload app.
- `docker-compose.yml` for local dev: app + Postgres + a volume-mounted Payload media directory (local Docker volume, per [Architecture Decision Record 020](./DECISIONS.md#architecture-decision-record-020-media-storage-backend-is-a-local-docker-volume-for-v1-with-cloudflare-r2-as-the-designated-successor) — not an object-storage stub for v1).
- Production concerns to design for: env var management/secrets, health checks, non-root container user, image size, persistent Postgres volume, backups.
- **Initial production infrastructure baseline is decided** ([Architecture Decision Record 015](./DECISIONS.md#architecture-decision-record-015-initial-production-infrastructure-baseline)): Cloudflare Free (DNS/proxy) in front of a single ~$10–12/month virtual private server running the Dockerized app and a self-hosted PostgreSQL instance, plus Resend's free tier for transactional email. Cash on delivery remains the only payment method. SMS is deferred to a future phase. Backups are managed manually for the initial launch — Milestone 54 formalised it: `scripts/backup.sh` (database dump + media volume, optional encryption, retention) and `scripts/backup-verify.sh` (restore into a scratch database); procedure in [DEPLOYMENT.md](./DEPLOYMENT.md#backups-and-recovery). Both named volumes (`postgres-data`, `app-media`) survive `down`/`up`; neither is covered by anything but these manual backups. This baseline is chosen to stay replaceable/upgradable (e.g. virtual private server → managed Postgres) without an application rewrite.
- **Production topology** ([Architecture Decision Record 032](./DECISIONS.md), [Architecture Decision Record 033](./DECISIONS.md)): `docker-compose.prod.yml` runs `postgres` → a one-shot `migrate` service (environment validation, `payload migrate`, verifier; fail-closed, the app waits for it) → `app` → `cloudflared`. No service publishes a host port; the origin is reachable only through a Cloudflare Tunnel (networks `backend` internal, `edge` shared by `app` and `cloudflared` only). Production never pushes the schema; migrations are committed in `/migrations`. Real-tunnel validation and the first-admin guard decision are still open (see Architecture Decision Record 033).
- **Abuse controls on order placement and lookup** ([Architecture Decision Record 035](./DECISIONS.md#architecture-decision-record-035-cloudflare-turnstile-on-order-placement-and-lookup-a-per-phone-order-limit-and-a-per-ip-flood-ceiling--cgnat-safe-rate-limits-milestone-52b), Milestone 52b; amends Architecture Decision Record 026 decision 6 and Architecture Decision Record 024's rate-limit clause). Carrier-grade NAT puts many Pakistani mobile customers behind one IP, so a strict per-IP limit is not enough. Instead:
  - **Amended by [Architecture Decision Record 036](./DECISIONS.md#architecture-decision-record-036-strict-turnstile-policy-idempotent-orders-no-victim-lock-out-a-closed-first-admin-window-separate-database-roles-and-interim-nextjs-mitigations-milestone-52b-security-batch) (strict policy).** A verified Cloudflare Turnstile token is required on the server; each request is `verified`, `rejected` (security validation) or `unavailable` (provider or configuration), and both non-verified outcomes refuse the order or lookup. There is no degraded path.
  - An attempts gate per IP bounds siteverify calls and database lookups; per-IP and per-(phone, IP) limits count verified successful orders only, so one connection cannot lock a customer out of their own number; a store-wide per-phone count is a log-only alert. All limiters are fixed-size and non-evicting.
  - Orders are idempotent: a client-generated key under a unique index means a retry returns the first order.
  - The first admin is created from a secret by the deploy step (the open create-first-user flow is closed), and the running app connects as the restricted `gocart_app` role; only the one-shot `migrate` step holds the superuser.
  - Limits are in-process (single instance, Architecture Decision Record 015). `Orders` access, guest checkout and cash-on-delivery-only are unchanged.

## Settled structural decisions

**The target platform is single-store. This is closed, not open.**

The inherited data model (`Store`, vendor-owned `Product`/`Order`, vendor dashboard at `app/store/*`, vendor approval at `app/admin/approve`) is a multi-vendor marketplace. It is **not** the target architecture. Per [Architecture Decision Record 006](./DECISIONS.md#architecture-decision-record-006-single-store-no-vendors--admin-only-authentication-multi-vendor-marketplace-features-removed-from-scope) (Accepted 2026-08-07, stakeholder decision):

- **One store.** No per-vendor stores, no `Store` ownership relation on `Products` or `Orders`.
- **No vendors, no sellers.** No seller dashboard, no seller registration, no vendor approval flow.
- **Admin-managed commerce.** The store admin manages the entire catalog and all orders directly through Payload's admin panel.
- **Admin Users are the only authenticated role** ([Architecture Decision Record 006](./DECISIONS.md)); customers never authenticate ([Architecture Decision Record 005](./DECISIONS.md)).

`Products` and `Orders` therefore belong to the platform directly. The multi-vendor surface in the inherited code is legacy to be removed (Milestones 14 to 17, 19), not a requirement to reconcile.

Other structural questions now settled: Payload topology ([Architecture Decision Record 009](./DECISIONS.md#architecture-decision-record-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service) — embedded), Prisma retirement ([Architecture Decision Record 003](./DECISIONS.md#architecture-decision-record-003-retire-the-unwired-prisma-schema-in-favor-of-payload-managed-collections) — accepted), payment scope ([Architecture Decision Record 004](./DECISIONS.md) — cash on delivery only), and checkout identity ([Architecture Decision Record 005](./DECISIONS.md) — guest only).

## Settled since the Milestone 6 gate (2026-08-16)

The Milestone 6-blocking decisions below are resolved — see [Architecture Decision Record 016](./DECISIONS.md#architecture-decision-record-016-reviews-are-out-of-scope-for-v1) through [Architecture Decision Record 021](./DECISIONS.md#architecture-decision-record-021-guest-orders-use-embedded-address-fields-not-a-customers-collection):

- **Media storage**: local Docker volume for v1, not S3-compatible object storage; Cloudflare R2 named as the designated successor if horizontal scaling later requires it.
- **Shipping/delivery model**: flat delivery fee with a free-shipping threshold, both admin-configurable via a Settings global (Milestone 13a) and snapshotted onto each order at creation.
- **Order status set**: `PLACED` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED`, plus terminal `CANCELLED` and `RETURNED`.
- **Guest `Orders` shape**: embedded address fields, no `Customers` collection — Milestone 11 proceeds exactly as it already assumed.
- **Reviews and Coupons**: both out of scope for v1 — Milestones 46 and 47 now execute a decided removal rather than deciding.

## Not yet decided (tracked, not resolved here)

These remain genuinely open. Neither blocks Milestone 1 or Milestone 6.

- Whether Redux Toolkit stays for cart state or is replaced by a simpler client-side cart (e.g. localStorage + context) — Milestone 30 currently assumes Redux + `localStorage`
- PKR currency formatting convention (blocks Milestone 55)
