# CLAUDE.md

Guidance for Claude Code (and any AI agent) working in this repository.

## What this project is

GoCart is being transformed from an open-source multi-vendor Next.js storefront into a **production-ready, single-store, Cash-on-Delivery ecommerce platform for Pakistan**, backed by **Payload CMS v3** and **PostgreSQL**. Full context lives in [docs/PROJECT_SPEC.md](./docs/PROJECT_SPEC.md) and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md). Read those before making structural decisions.

## Current status: storefront fully on real Payload data — `M29`+ is next

Planning and documentation are **Done** (see [docs/TASKS.md](./docs/TASKS.md)). Implementation has progressed through the foundation group, the full Payload data model, the auth confirmation pass, the last of the legacy route removal, and the entire storefront-data milestone group: `M1`–`M28` (every milestone, including `M13a`, `M27a`, `M27b`) are all **Done**. Prisma is retired. The dummy `assets/assets.js` dataset and its two Redux slices (`productSlice`, `ratingSlice`) are deleted. A dev Dockerfile exists (its `docker build` step is implemented but not fully verified — see [docs/TASKS.md](./docs/TASKS.md)).

**`lib/payload/products.ts` and `lib/payload/categories.ts`** are the server-side (Local API) data utilities — `getProducts()`, `getFeaturedProducts()`, `getProductById()`, `getTopLevelCategories()`, `getCategoryBySlug()`, `getProductsByCategory()` (with descendant rollup). Server components only; client components hit Payload's public-read REST API instead (`CategoriesMarquee.jsx`, `app/(public)/cart/page.jsx` both do this). Types in both are hand-written rather than generated from `payload-types.ts` (blocked in this sandbox — see [docs/TASKS.md](./docs/TASKS.md)).

**Every storefront route reads real Payload data**: `/` (`M23`), `/shop` (`M24`), `/product/[id]` (`M25`), `/category/[slug]` (`M27a`), `/categories` (`M27b`), and `/cart` (fixed as part of `M28`, not a separate milestone — see below). The category marquee (`M27`) and the product-page breadcrumb (`M27a`) are real links. `/orders` is the one deliberate exception: it stays fully dummy data until `M36`'s guest order lookup, since there is no account system to key a real order list off of. `"Best Selling"` is an **admin-curated `isFeatured` flag**, not a computed ranking ([ADR-022](./docs/DECISIONS.md)) — there is no sales or review data to rank by. Search on `/shop` is still an in-memory `.includes()` filter until `M29`.

**`M28` surfaced and fixed a real, already-live bug, not just a cleanup task**: `/cart` had been resolving line items against a Redux slice populated only from the dummy dataset, so it silently dropped every product added from a real product page since `M25` shipped — "Add to Cart" appeared to work, but the cart always rendered empty. Fixed by fetching real products via REST instead of carrying the fix into a later milestone. See [MIGRATION_PLAN.md](./docs/MIGRATION_PLAN.md)'s `M28` entry for the full account of this and four smaller gaps `M28` also had to absorb (none of which were in its original file list).

**`M27a` hit a genuine Next.js 15 App Router limitation, not a bug in this code**: a `loading.tsx` file on `/category/[slug]` made `notFound()` return HTTP 200 instead of 404 (confirmed by isolation testing — `loading.tsx`'s Suspense boundary flushes the response status before the awaited page component can call `notFound()`). `loading.tsx` was deliberately omitted from that one route as a result; full details are in `MIGRATION_PLAN.md`'s `M27a` entry. `/categories` has no such conflict (no `notFound()` path) and keeps its `loading.tsx` as originally scoped.

**Admin-only auth is confirmed end to end** (`M20`/`M21`): Payload's `/admin` is the only authenticated surface in the application — no middleware, no auth dependency, no leftover `isAdmin`/`isSeller` bypass, and no customer-facing route that requires or fakes a login. The dead "Login" button is gone from the storefront navbar.

**No more multi-vendor routes exist anywhere in the app** (`M15`/`M18`/`M26`): `create-store`, `shop/[username]`, `pricing`, and `loading` are all deleted, their two dead Footer links are gone, and `ProductDescription.jsx`'s dead "view store" link to `/shop/[username]` is removed.

**Payload collections and the Settings global now exist and are registered in `payload.config.ts`**: `Users` (admin-only auth), `Media` (local-volume uploads), `Categories` (two-level hierarchy, stable slugs), `Products`, `Orders` (guest checkout, line items, COD, full status enum), and the `Settings` global (shipping/contact config). Access control is set per `M13`: public-read/admin-write on `Products`/`Categories`/`Media`, public-create/admin-read on `Orders`. `/admin` now serves a real, collection-backed admin panel, not the collection-less shell from `M3`.

Two things carried forward from earlier work, tracked in [docs/TASKS.md](./docs/TASKS.md) and [docs/PHASE_1_READINESS_REPORT.md](./docs/PHASE_1_READINESS_REPORT.md):
- `scripts/seed.ts` is implemented but unverified by direct execution in the authoring sandbox (a `tsx`/Node ESM-interop issue unrelated to the script itself) — confirm `npm run seed` works in a real environment.
- Readiness finding `C7` (`M13`'s admin-only `Orders` read conflicts with `M36`'s future guest-lookup requirement) is **resolved as a design decision** — [ADR-024](./docs/DECISIONS.md#adr-024-guest-order-lookup-via-a-dedicated-ordernumber-phone-endpoint--orders-collection-access-stays-admin-only): a dedicated `(orderNumber, phone)` lookup, `Orders`' collection access unchanged. Implementation is still `M36`'s job.

## Milestone numbering — the one authoritative sequence

**`M1`–`M59` in [docs/MIGRATION_PLAN.md](./docs/MIGRATION_PLAN.md) is the only implementation sequence.** Always reference work by milestone ID.

Phase and group names are **labels for grouping and status reporting only**. They carry no execution order and must never be used as implementation references — "start Phase 2" is not an instruction anyone can act on correctly; "start `M6`" is. Execution order is defined by each milestone's stated dependencies, summarized in MIGRATION_PLAN's execution-order section, and is **not** the same as ascending milestone ID (notably, `M14`/`M16`/`M17`/`M19` run before `M3` — see [ADR-014](./docs/DECISIONS.md)).

## Hard constraints (do not silently violate)

- **Cash on Delivery only.** Do not add other payment gateways to the active checkout flow. The architecture must stay extensible for online payments later (see [docs/DECISIONS.md](./docs/DECISIONS.md)), but nothing beyond COD ships now.
- **Guest checkout is required.** Never make account creation mandatory to place an order.
- **Admin-only authentication.** There is no public customer login and no vendor login/dashboard in the target design. If you find code implementing vendor auth or a vendor dashboard, treat it as legacy from the original multi-vendor app, not a requirement — flag it, don't silently extend it.
- **Single store — no vendors, no sellers.** Settled in [ADR-006](./docs/DECISIONS.md) (Accepted 2026-08-07). No seller dashboard, no vendor registration, no vendor approval, no per-store ownership of products or orders. Commerce is admin-managed. This is closed — do not reopen, hedge, or treat it as an open question.
- **PostgreSQL only**, accessed through Payload CMS v3's data layer. Don't introduce a second ORM or database.
- **Payload runs embedded in the Next.js app**, not as a separate service — [ADR-009](./docs/DECISIONS.md) (Accepted 2026-08-14). Payload owns `/admin`.
- **SEO-first and mobile-first** are non-negotiable defaults for any storefront UI work — not an afterthought pass at the end.
- **Everything must run in Docker** for both development and production.
- **Initial production infrastructure baseline is decided** — [ADR-015](./docs/DECISIONS.md): Cloudflare Free + a single ~$10–12/month VPS running the Dockerized app and PostgreSQL + Resend free-tier email + COD. SMS is deferred to a future phase; backups are managed manually for now. Keep the application layer host-agnostic so this baseline stays replaceable/upgradable without a rewrite.

## Working agreement

- **Don't install packages or scaffold Payload/Docker config unless explicitly asked.** Confirm scope before making changes that go beyond documentation or the specific task given.
- **Log real decisions in [docs/DECISIONS.md](./docs/DECISIONS.md)** (ADR format) when a non-obvious technical choice gets made — don't let decisions live only in chat history.
- **Update [docs/TASKS.md](./docs/TASKS.md)** as phases start/complete.
- **Update [docs/CHANGELOG.md](./docs/CHANGELOG.md)** for notable changes, once code starts moving.
- **Prefer editing over rewriting.** This codebase has real history (see `git log`) — don't blow away working code to "start clean."
- When requirements conflict with what's in the existing GreatStack GoCart codebase (e.g. multi-vendor data model vs. single-store target), **surface the conflict rather than guessing** which one wins.

## Repo map

```
app/            Next.js App Router pages — app/(public)/* storefront, app/(payload)/* admin+API
components/     React components (storefront UI)
lib/            Redux Toolkit store and slices (cart, address); lib/payload/* Local API data utilities
collections/    Payload collection configs: Users, Media, Categories, Products, Orders
globals/        Payload global configs: Settings (shipping/contact config)
scripts/        Dev tooling — seed.ts populates sample categories/products
docs/           Project spec, architecture, tasks, decisions, changelog
prompts/        Reusable prompt templates for AI-assisted work on this repo
```

## Useful context for AI agents

- The original app was a **multi-vendor marketplace** (`app/store/*` vendor dashboard, `app/admin/approve`/`app/admin/stores` vendor approval, a `Store` model in the now-deleted `prisma/schema.prisma`). The target product is **single-store** — [ADR-006](./docs/DECISIONS.md) is Accepted. That legacy surface is fully **removed** (`M14`–`M17`, `M19`, all Done) — if you see any of those paths, something has gone wrong; they should not exist. Treat any doc or comment implying single-vs-multi-vendor is still open as stale.
- **TypeScript is established** (`M2a`, Done) — `tsconfig.json` with `moduleResolution: "bundler"` (changed from `node` at `M3` to resolve Payload's package `exports`), `allowJs: true`. New files are `.ts`/`.tsx`; existing `.jsx` is never opportunistically converted.
- **Admin auth is wired**: the `Users` collection (`collections/Users.ts`, `M6`/`M7`) is Payload's built-in auth, the only authenticated role in the system. No Clerk/NextAuth, no customer or vendor auth.
- Currency symbol is `Rs. ` via `NEXT_PUBLIC_CURRENCY_SYMBOL` in `.env.example` (fixed from the original `$`). Full PKR formatting — comma grouping, decimal handling — is still open and belongs to `M55` (not yet started; the exact convention is discussed in [docs/PROJECT_SPEC.md](./docs/PROJECT_SPEC.md)).
