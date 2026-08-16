# Architecture — GoCart Pakistan

This document describes the system **as it exists today** (inherited from the open-source GoCart project) and the **target architecture** for the Pakistan COD platform. No migration work has started; this is the plan.

## As-is (current repository state)

- **Framework**: Next.js 15.3.5, App Router, React 19.2.1
- **Styling**: Tailwind CSS 4
- **State management**: Redux Toolkit (`lib/store.js`, `lib/features/{cart,address,product,rating}/*Slice.js`) — client-side cart/address/product/rating state
- **Data layer**: `prisma/schema.prisma` targets PostgreSQL, but `@prisma/client`/`prisma` are **not present** in `package.json` — the schema exists as a design artifact, not a wired-up dependency yet
- **Auth**: none wired in. No Clerk/NextAuth/other provider in dependencies; `app/admin` and `app/store` routes are not actually access-controlled today
- **Domain model** (from `prisma/schema.prisma`): `User`, `Product`, `Order`/`OrderItem`, `Rating`, `Address`, `Coupon`, `Store` — this is a **multi-vendor marketplace** shape (each `Store` has a `userId` owner, its own products and orders, an approval `status`/`isActive` flow)
- **Payment**: `PaymentMethod` enum already has `COD` and `STRIPE`; nothing processes Stripe today, it's just a schema value
- **Currency**: hardcoded `$` via `NEXT_PUBLIC_CURRENCY_SYMBOL` in `.env.example`
- **Routes**: `app/(public)/*` storefront, `app/admin/*` platform admin (approve vendors, manage stores/coupons), `app/store/*` vendor dashboard (add/manage products, view orders)
- **Deployment**: no Dockerfile, no `docker-compose.yml`, `next.config.mjs` sets `images.unoptimized = true` (Vercel-style default, not production-hardened)
- **CMS**: none — content/products are plain Postgres rows via the (unwired) Prisma schema

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

- Next.js App Router stays as the storefront rendering layer — SSR/ISR for product and category pages to satisfy SEO-first.
- **Payload CMS v3 runs embedded inside the Next.js app** — one codebase, one build, one container. Its admin UI mounts at `/admin` and its REST/GraphQL API under `/api`, both as App Router routes; server-rendered storefront pages read through Payload's Local API with no HTTP hop. Decided in [ADR-009](./DECISIONS.md#adr-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service) (Accepted 2026-08-14) — running Payload as a separate service was evaluated and rejected.
- Redux Toolkit likely stays for client-side cart state (guest cart doesn't need a backend session), but server state (products, orders) moves to Payload's API instead of Prisma.

#### Storefront route map (target)

| Route | Purpose | Rendering |
|---|---|---|
| `/` | Home — hero, latest/best-selling sections | SSR |
| `/categories` | Category index: all top-level categories with their children (`M27b`) | SSR/ISR |
| `/category/[slug]` | Category detail + paginated product listing (`M27a`) | SSR/ISR |
| `/shop` | All products + name-based search (`?search=`) | SSR |
| `/product/[productId]` | Product detail | SSR/ISR |
| `/cart`, guest checkout, order confirmation/lookup | Cart and COD checkout flow | Client + SSR |
| `/admin` | Payload CMS admin UI | Payload-owned |

Category URLs are **flat and slug-based** — a child category is `/category/phone-cases`, not
`/category/accessories/phone-cases` — so re-parenting a category in the admin never breaks a live URL
or an indexed page. `/category/[slug]` is the single canonical products-by-category URL; no
`/shop?category=` parameter exists, since two URLs for one result set split ranking signals. Settled
by [ADR-013](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy);
full behavior in [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md).

#### `/admin` route ownership

`/admin` belongs to Payload in the target architecture. The inherited codebase serves its own hand-built admin from `app/admin/*` (with a hardcoded `isAdmin = true` bypass), which resolves to the same path. **The legacy admin is removed before Payload mounts** — `M16`, `M17`, and `M19` precede `M3` — so at no point do two implementations own `/admin`. See the execution order in [MIGRATION_PLAN.md](./MIGRATION_PLAN.md).

### Backend / CMS

- **Payload CMS v3** replaces the unwired Prisma layer as the system of record.
- Collections needed (first pass, to refine in `docs/TASKS.md` once build starts): `Users` (admin-only, `auth: true`), `Products`, `Categories`, `Media`, `Orders` (with embedded/guest customer + address fields, no `User` relation), `Coupons` (optional for v1).
- **`Categories` carries a `parent` self-relation** (`hasMany: false`) supporting exactly two levels — parent → child, with a third level rejected — plus a unique, indexed, stable `slug` that backs every category URL. `Products.category` is a single relationship (`hasMany: false`) to the most specific applicable category; parent category pages roll up their children's products rather than requiring double-filing. Per [ADR-013](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy); field list in `M9`.
- Payload's built-in auth becomes the **only** login in the system — no separate customer or vendor auth.

### Data store

- **PostgreSQL**, accessed exclusively through Payload's Postgres adapter (`@payloadcms/db-postgres`).
- The existing `prisma/schema.prisma` is treated as a **reference for field/relationship intent**, not carried forward as a live schema — Payload manages its own migrations. Retirement is settled in [ADR-003](./DECISIONS.md#adr-003-retire-the-unwired-prisma-schema-in-favor-of-payload-managed-collections) (Accepted 2026-08-14) and executed by `M4`.

### Payments

- COD is the only active payment method. `Orders` collection should still model a `paymentMethod` field (mirroring the existing `PaymentMethod` enum shape) and an `isPaid` boolean, so a payment gateway can be added later as a new value + integration without restructuring the `Orders` collection.

### SEO

- Per-page `generateMetadata`, dynamic `sitemap.xml`/`robots.txt` (Next.js built-in file conventions), JSON-LD `Product`/`Organization` structured data, optimized images (revisit `images.unoptimized: true` — that's a Vercel-remote-loader shortcut, not appropriate for a self-hosted Dockerized prod setup).

### Mobile-first

- Tailwind's mobile-first breakpoint model is already the default in this codebase; the work is auditing existing components (`components/*`) for mobile-first correctness, not introducing a new system.

### Docker / production readiness

- `Dockerfile` (multi-stage: deps → build → runtime) for the Next.js/Payload app.
- `docker-compose.yml` for local dev: app + Postgres (+ maybe a volume-mounted Payload media dir or object storage stub).
- Production concerns to design for: env var management/secrets, health checks, non-root container user, image size, persistent Postgres volume, backups.

## Settled structural decisions

**The target platform is single-store. This is closed, not open.**

The inherited data model (`Store`, vendor-owned `Product`/`Order`, vendor dashboard at `app/store/*`, vendor approval at `app/admin/approve`) is a multi-vendor marketplace. It is **not** the target architecture. Per [ADR-006](./DECISIONS.md#adr-006-single-store-no-vendors--admin-only-authentication-multi-vendor-marketplace-features-removed-from-scope) (Accepted 2026-08-07, stakeholder decision):

- **One store.** No per-vendor stores, no `Store` ownership relation on `Products` or `Orders`.
- **No vendors, no sellers.** No seller dashboard, no seller registration, no vendor approval flow.
- **Admin-managed commerce.** The store admin manages the entire catalog and all orders directly through Payload's admin panel.
- **Admin Users are the only authenticated role** ([ADR-006](./DECISIONS.md)); customers never authenticate ([ADR-005](./DECISIONS.md)).

`Products` and `Orders` therefore belong to the platform directly. The multi-vendor surface in the inherited code is legacy to be removed (`M14`–`M17`, `M19`), not a requirement to reconcile.

Other structural questions now settled: Payload topology ([ADR-009](./DECISIONS.md#adr-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service) — embedded), Prisma retirement ([ADR-003](./DECISIONS.md#adr-003-retire-the-unwired-prisma-schema-in-favor-of-payload-managed-collections) — accepted), payment scope ([ADR-004](./DECISIONS.md) — COD only), and checkout identity ([ADR-005](./DECISIONS.md) — guest only).

## Not yet decided (tracked, not resolved here)

These remain genuinely open. None blocks `M1`; the first three block `M6` (the start of collection design).

- Object storage for product media (local volume vs. S3-compatible service) under Docker — interacts with horizontal scaling, see [ADR-009](./DECISIONS.md) consequences
- Shipping/delivery model, which the `Orders` collection must model (flat / free / weight-based / city-based)
- Order status set — whether `CANCELLED`/`RETURNED` are needed for COD refusal-at-door
- Exact `Orders` collection shape for guest customers (embedded address vs. relation to a lightweight `Customers` collection without auth) — `M11` currently assumes embedded
- Whether Redux Toolkit stays for cart state or is replaced by a simpler client-side cart (e.g. localStorage + context) — `M30` currently assumes Redux + `localStorage`
- Reviews and Coupons: in or out for v1 (`M46`, `M47`)
