# CLAUDE.md

Guidance for Claude Code (and any AI agent) working in this repository.

## What this project is

GoCart is being transformed from an open-source multi-vendor Next.js storefront into a **production-ready, single-store, Cash-on-Delivery ecommerce platform for Pakistan**, backed by **Payload CMS v3** and **PostgreSQL**. Full context lives in [docs/PROJECT_SPEC.md](./docs/PROJECT_SPEC.md) and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md). Read those before making structural decisions.

## Current status: data-fetching utilities exist — `M23`+ is next

Planning and documentation are **Done** (see [docs/TASKS.md](./docs/TASKS.md)). Implementation has progressed through the foundation group, the full Payload data model, the auth confirmation pass, the last of the legacy route removal, and the first storefront-data milestone: `M1`, `M2`, `M2a`, `M16`, `M17`, `M19`, `M14`, `M3`, `M4`, `M5`, `M6`–`M13`, `M13a`, `M20`, `M21`, `M15`, `M18`, and `M22` are all **Done**. Prisma is retired. A dev Dockerfile exists (its `docker build` step is implemented but not fully verified — see [docs/TASKS.md](./docs/TASKS.md)).

**`lib/payload/products.ts` and `lib/payload/categories.ts` now exist** (`M22`, server-side Local API utilities; `getProducts()`, `getProductById()`, `getTopLevelCategories()`, `getCategoryBySlug()`, `getProductsByCategory()` with descendant rollup). **No storefront route consumes them yet** — that starts at `M23`. Two things to know before touching them: types in both files are hand-written, not generated from `payload-types.ts` (blocked in this sandbox, see [docs/TASKS.md](./docs/TASKS.md)); and `getProducts()`'s `sort` has no default for "best selling" — there's no ranking data in the schema for it, so `M23` must choose one.

**Admin-only auth is confirmed end to end** (`M20`/`M21`): Payload's `/admin` is the only authenticated surface in the application — no middleware, no auth dependency, no leftover `isAdmin`/`isSeller` bypass, and no customer-facing route that requires or fakes a login. The dead "Login" button is gone from the storefront navbar.

**No more multi-vendor routes exist anywhere in the app** (`M15`/`M18`): `create-store`, `shop/[username]`, `pricing`, and `loading` are all deleted, and their two dead Footer links are gone. One known dead link remains: `ProductDescription.jsx`'s "view store" link points at the now-deleted `/shop/[username]` — already owned by `M26`, not fixed here.

**Payload collections and the Settings global now exist and are registered in `payload.config.ts`**: `Users` (admin-only auth), `Media` (local-volume uploads), `Categories` (two-level hierarchy, stable slugs), `Products`, `Orders` (guest checkout, line items, COD, full status enum), and the `Settings` global (shipping/contact config). Access control is set per `M13`: public-read/admin-write on `Products`/`Categories`/`Media`, public-create/admin-read on `Orders`. `/admin` now serves a real, collection-backed admin panel, not the collection-less shell from `M3`. **The storefront still renders exactly as inherited — no `.jsx` file has been converted to consume real Payload data yet; that starts at `M22`.**

Two things carried forward from that work, tracked in [docs/TASKS.md](./docs/TASKS.md) and [docs/PHASE_1_READINESS_REPORT.md](./docs/PHASE_1_READINESS_REPORT.md):
- `scripts/seed.ts` is implemented but unverified by direct execution in the authoring sandbox (a `tsx`/Node ESM-interop issue unrelated to the script itself) — confirm `npm run seed` works in a real environment.
- Readiness finding `C7` (`M13`'s admin-only `Orders` read conflicts with `M36`'s future guest-lookup requirement) remains open and unresolved — `M13` was implemented exactly as specified, not as a fix for `C7`.

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
lib/            Redux Toolkit store and slices (cart, address, product, rating)
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
- Currency is still hardcoded to `$` via `NEXT_PUBLIC_CURRENCY_SYMBOL` in `.env.example` — this needs to become PKR-aware for the Pakistan launch (`M55`, not yet started; the exact formatting convention is still an open question in [docs/PROJECT_SPEC.md](./docs/PROJECT_SPEC.md)).
