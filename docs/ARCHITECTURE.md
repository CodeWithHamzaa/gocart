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
- Payload CMS v3 supports embedding directly inside a Next.js app (shared app, `/admin` route mounted from Payload) — **preferred** over running Payload as a fully separate service, to avoid double-hosting complexity, unless production isolation needs argue otherwise (see open question below).
- Redux Toolkit likely stays for client-side cart state (guest cart doesn't need a backend session), but server state (products, orders) moves to Payload's API instead of Prisma.

### Backend / CMS

- **Payload CMS v3** replaces the unwired Prisma layer as the system of record.
- Collections needed (first pass, to refine in `docs/TASKS.md` once build starts): `Users` (admin-only, `auth: true`), `Products`, `Categories`, `Media`, `Orders` (with embedded/guest customer + address fields, no `User` relation), `Coupons` (optional for v1).
- Payload's built-in auth becomes the **only** login in the system — no separate customer or vendor auth.

### Data store

- **PostgreSQL**, accessed exclusively through Payload's Postgres adapter (`@payloadcms/db-postgres`).
- The existing `prisma/schema.prisma` should be treated as a **reference for field/relationship intent**, not carried forward as a live schema — Payload manages its own migrations. This retirement is a decision to confirm (see `DECISIONS.md`).

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

## Major open architecture question

**Multi-vendor vs. single-store.** The inherited data model (`Store`, vendor-owned `Product`/`Order`, vendor dashboard at `app/store/*`, vendor approval at `app/admin/approve`) is a multi-vendor marketplace. "Admin login only" strongly implies this is being replaced by a single-store model. This is the single biggest structural change from the current codebase and should be explicitly decided (see `DECISIONS.md`) before any Payload collection design starts, since it changes the shape of `Products` and `Orders` significantly (owned by one store vs. owned by many).

## Not yet decided (tracked, not resolved here)

- Payload mounted inside the Next.js app vs. a separate service
- Whether Redux Toolkit stays for cart state or is replaced by a simpler client-side cart (e.g. localStorage + context)
- Object storage for product media (local volume vs. S3-compatible service) under Docker
- Exact `Orders` collection shape for guest customers (embedded address vs. relation to a lightweight `Customers` collection without auth)
