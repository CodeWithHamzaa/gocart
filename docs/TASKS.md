# Tasks — GoCart Pakistan

Phased execution plan. Update status as work happens; don't let this drift from reality. No phase after Phase 0 has started.

Status legend: `Not Started` · `In Progress` · `Blocked` · `Done`

## Phase 0 — Planning & documentation

Status: **In Progress**

- [x] Audit existing GoCart codebase (stack, data model, routes)
- [x] Create `docs/`, `prompts/` structure and core docs
- [ ] Resolve open question: multi-vendor vs. single-store (see `DECISIONS.md`)
- [ ] Confirm open questions in `PROJECT_SPEC.md` with stakeholder

## Phase 1 — Payload CMS v3 + PostgreSQL foundation

Status: Not Started

- [ ] Decide: Payload mounted in Next.js app vs. separate service
- [ ] Stand up PostgreSQL (local, via Docker)
- [ ] Install and configure Payload CMS v3 with `@payloadcms/db-postgres`
- [ ] Retire/replace unwired `prisma/schema.prisma` per decision in `ARCHITECTURE.md`

## Phase 2 — Data modeling (Payload collections)

Status: Not Started

- [ ] `Users` (admin-only, `auth: true`)
- [ ] `Products` (name, description, price, mrp, images, category, stock, PKR pricing)
- [ ] `Categories`
- [ ] `Media`
- [ ] `Orders` (guest customer fields, address, items, `paymentMethod: COD`, `isPaid`, status)
- [ ] `Coupons` (if retained post-guest-checkout redesign)

## Phase 3 — Admin-only authentication

Status: Not Started

- [ ] Payload auth as the sole login (admin panel)
- [ ] Remove/neutralize any inherited vendor or customer auth assumptions in `app/`
- [ ] Access-control rules on collections (public read for storefront-facing data, admin-only write)

## Phase 4 — Storefront rebuild against Payload

Status: Not Started

- [ ] Replace mock/Redux product data with Payload API calls
- [ ] Guest cart (client-side) → guest checkout flow
- [ ] COD-only checkout, PKR currency formatting, Pakistani address fields
- [ ] Order confirmation flow

## Phase 5 — SEO

Status: Not Started

- [ ] `generateMetadata` for all storefront pages
- [ ] `sitemap.xml` / `robots.txt`
- [ ] JSON-LD structured data for products
- [ ] Image optimization pipeline (revisit `images.unoptimized`)

## Phase 6 — Mobile-first audit

Status: Not Started

- [ ] Component-by-component mobile breakpoint review
- [ ] Performance pass for mobile/slow-network conditions

## Phase 7 — Docker & production readiness

Status: Not Started

- [ ] `Dockerfile` (multi-stage)
- [ ] `docker-compose.yml` (app + Postgres, dev)
- [ ] Production compose/deployment config, secrets handling, health checks
- [ ] Backups/persistence strategy for Postgres + media

## Phase 8 — Future payments extensibility (not implemented, just designed for)

Status: Not Started

- [ ] Confirm `Orders` collection's `paymentMethod` field can accept new gateway values without migration pain
- [ ] Document (not build) the intended integration point for a future gateway (JazzCash/Easypaisa/card)
