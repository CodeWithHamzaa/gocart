# Tasks — GoCart Pakistan

Status roll-up for the migration. **This file tracks status; it does not define execution order.**

The authoritative implementation sequence is **`M1`–`M59` plus `M2a`, `M27a`, `M27b`** in
[MIGRATION_PLAN.md](./MIGRATION_PLAN.md), ordered by each milestone's stated dependencies.
Group names below are labels for reporting only — never schedule or reference work by group.

Status legend: `Not Started` · `In Progress` · `Blocked` · `Done`

---

## Planning & documentation — **Done** (2026-08-14)

- [x] Audit existing GoCart codebase (stack, data model, routes) → [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md)
- [x] Create `docs/`, `prompts/` structure and core docs
- [x] Feature-by-feature disposition → [FEATURE_MATRIX.md](./FEATURE_MATRIX.md)
- [x] Milestone-level migration plan → [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)
- [x] **Resolved**: multi-vendor vs. single-store → [ADR-006](./DECISIONS.md), Accepted 2026-08-07. **Closed — single store, no vendors, admin-managed commerce.**
- [x] **Resolved**: Prisma schema retirement → [ADR-003](./DECISIONS.md), Accepted 2026-08-14
- [x] **Resolved**: Payload deployment topology → [ADR-009](./DECISIONS.md), Accepted 2026-08-14 (embedded in the Next.js app)
- [x] Phase 1 readiness audit and correction pass → [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md)
- [x] Category-browsing audit and specification (2026-08-16) → [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md), [ADR-013](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy), new milestones `M27a`/`M27b`. **Closes readiness finding `C8`.**
- [x] Confirm the `M6`-blocking open questions in [PROJECT_SPEC.md](./PROJECT_SPEC.md) with the stakeholder → [ADR-016](./DECISIONS.md#adr-016-reviews-are-out-of-scope-for-v1)–[ADR-021](./DECISIONS.md#adr-021-guest-orders-use-embedded-address-fields-not-a-customers-collection), Accepted 2026-08-16. Currency (open question #1) and notifications (open question #5, partially resolved by [ADR-015](./DECISIONS.md#adr-015-initial-production-infrastructure-baseline)) remain open but are not `M6` blockers — see [PROJECT_SPEC.md](./PROJECT_SPEC.md)

---

## Implementation status by milestone

Implementation has begun. `M1` added local development infrastructure (`docker-compose.yml`,
`.env.example`), `M2` added Payload dependencies, and `M2a` added the TypeScript toolchain
(`tsconfig.json`, `next-env.d.ts`; `jsconfig.json` retired). `M16`, `M17`, and `M19` then deleted the
legacy admin surface — `app/admin/**` and `components/admin/**` (plus `components/OrdersAreaChart.jsx`)
are gone. `M14` then deleted the vendor dashboard (`app/store/**`, `components/store/**`), clearing the
multiple-root-layouts precondition per [ADR-014](./DECISIONS.md#adr-014-m14-is-a-hard-prerequisite-of-m3-not-an-order-independent-milestone).

**`M3` has landed: Payload is mounted.** `payload.config.ts` (no collections yet) is wired to Postgres;
`/admin` and `/api/*` are mounted inside the Next.js App Router per [ADR-009](./DECISIONS.md#adr-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service). `M4` then retired the unwired
Prisma schema, and `M5` added a development Dockerfile. **`/admin` now returns Payload's
(collection-less) admin shell**, not 404 — the interim 404 window between `M17` and `M3` is closed.

**Customer-facing behavior is still unchanged.** No `.jsx` storefront file has been converted, and the
storefront renders exactly as inherited; `app/layout.jsx` was restructured into `app/(public)/layout.jsx`
(now the storefront's own root layout, per `M3`'s multiple-root-layouts requirement) with no visible
change to rendered output.

**`M6`–`M13` and `M13a` have landed.** All five collections (`Users`, `Media`, `Categories`,
`Products`, `Orders`) and the `Settings` global are registered in `payload.config.ts`, with access
control set per `M13` (public-read/admin-write on `Products`/`Categories`/`Media`, public-create/
admin-read on `Orders`) and a dev seed script (`scripts/seed.ts`). `/admin` now serves a real,
collection-backed admin panel — the "collection-less admin shell" era from `M3` is over.
Every milestone's testing criteria in [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) was verified against
a live Postgres-backed dev server (REST + GraphQL). Two things flagged during that work:

- `scripts/seed.ts` could not be executed directly via `tsx` in the authoring sandbox (a Node/tsx
  ESM-interop bug in `@payloadcms/db-postgres`'s import chain, unrelated to the seed script itself —
  same class of issue as `M3`'s `generate:importmap` problem). Its logic was validated indirectly via
  equivalent REST calls; run `npm run seed` for real before relying on it.
- `M13`'s admin-only `Orders` read is exactly as specified, and exactly what readiness finding `C7`
  already flags as conflicting with `M36`'s future guest-order-lookup requirement. Still open — not
  solved by this implementation, tracked in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

**`M20`–`M21` are done (2026-08-17).** `M20`'s audit found **no custom or faked authentication
anywhere in the application** — no middleware, no auth dependencies in `package.json`, and no
`isAdmin`/`isSeller`-style bypass left over from the multi-vendor original (those died with `M14`/`M17`).
Payload's `/admin` is the only authenticated surface: logged out it serves the login screen and leaks
no collection data, while `/api/users` and `/api/orders` correctly return 403. All nine customer-facing
routes render 200 while logged out — no login walls, no redirects. `M21` then removed the dead
"Login" button (desktop and mobile) from `components/Navbar.jsx`; it never had a handler, and customers
never authenticate under guest-checkout-only ([ADR-005](./DECISIONS.md)). One follow-on observation is
recorded against `M44` — see "Later, non-blocking" below.

**`M15`/`M18` are done (2026-08-17).** Deleted `app/(public)/create-store/page.jsx`,
`app/(public)/shop/[username]/page.jsx`, `app/(public)/pricing/page.jsx`, and
`app/(public)/loading/page.jsx`, and removed the two now-dead Footer links ("Create Your Store",
"Become Plus Member") inline, per both milestones' own testing notes — `M48`'s Footer cleanup is
too far away to leave them dead in the meantime. `components/Loading.jsx` (the shared spinner
component those pages imported) was left in place — not in either milestone's Files list, and still a
plain, reusable component with no dead reference of its own.
One thing found but **not** fixed here, because it is already owned elsewhere: `ProductDescription.jsx`
still links to `/shop/${product.store.username}`, the route `M15` just deleted. This is not an
oversight — `M26` ("Remove multi-vendor 'Product by {store}' attribution") already exists for exactly
this, already depends on `M15`, and its own goal text anticipates the route being "(already-deleted)".
Until `M26` lands, that one link 404s if clicked from a product page.

**`M22` is done (2026-08-17).** `lib/payload/categories.ts` and `lib/payload/products.ts` are new
server-side (Local API) utilities, verified against seeded data with a temporary route (deleted before
committing) — `getProductsByCategory()`'s rollup is confirmed exact: a parent slug returns its own
products plus every child's, a child slug returns only its own. Two things worth knowing before `M23`
picks this up: **types are hand-written**, not generated from `payload-types.ts` (`payload
generate:types` hits the same sandbox `tsx` issue as `scripts/seed.ts`), and **`getProducts()` takes an
explicit `sort` with no default for "best selling"** — there is no sales-count or review field to rank
by in the current schema, so `M23` must choose a stand-in sort when it wires `BestSelling.jsx`.

**`M28` is done (2026-08-18) — the `M22`–`M28` storefront-data group is now fully complete.**
`assets/assets.js` and all its imported placeholder images are deleted, along with
`lib/features/product/productSlice.js` and `lib/features/rating/ratingSlice.js`; `lib/store.js` is
trimmed to `cart` + `address`. **This milestone's stated premise — "every storefront consumer has
been re-pointed" — was false**, and one of the gaps it hid was a real, already-live bug: `/cart`
resolved line items against the now-deleted dummy `productSlice`, which nothing had populated with
real data since `M23`–`M25` gave every reachable product a real Payload ID — **the cart has been
silently dropping every item added from a real product page since `M25` shipped.** Fixed by fetching
real products via REST (`GET /api/products?limit=0&depth=1`, the same client-component pattern
`CategoriesMarquee.jsx` uses), not deferred: no milestone in `M30`–`M36` explicitly owns this fix.
Four smaller gaps also surfaced and were resolved: `OrderItem.jsx`'s star-rating block (read the
now-deleted `ratingSlice`, forced-fixed here — `M46`'s file list is corrected to note it should have
included this file from the start); `OurSpec.jsx` and `addressSlice.js`'s small non-product data
literals inlined into their sole consumers; `orders/page.jsx`'s dummy order data inlined image-free
(that page stays fully dummy until `M36`'s real guest lookup — out of scope to fix further here);
`Hero.jsx`'s three now-deleted hero images replaced with gradient placeholders (this milestone's own
file list already committed to deleting those images). Full details, including exactly which files
were affected and why, are in [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)'s `M28` entry. Verified against
a live `npm run start` server: all seven storefront routes return 200, and a real headless-Chromium
browser check (Playwright, client-side navigation to preserve Redux state across the SPA) confirms
adding a real product to cart now renders it correctly — name, category, price, quantity, total, and
image — where it previously showed "Your cart is empty." `npm run type-check` and `npm run build`
both pass.

**`M27b` is done (2026-08-18).** `/categories` lists every top-level category as a card (via `M22`'s
`getTopLevelCategories()`, already ordered by `displayOrder` then title) with its children as sub-link
chips, all targeting `/category/[slug]`. This route has no `notFound()` path — an empty catalog renders
an empty state, not a 404 — so `loading.tsx` is included here safely, unlike `M27a`'s detail route.
This also closes the temporary gap `M27a` flagged: the breadcrumb's `/categories` link now resolves
(200, zero console errors), where it previously 404'd. Verified against a live `npm run start` server.

**`M27a` is done (2026-08-18).** `/category/[slug]` now exists: parent slugs roll up their own plus
every child's products, child slugs list only their own with a parent breadcrumb, pagination/canonical/
`rel=prev`/`next` all ship per spec, and `generateStaticParams` + `revalidate = 3600` deliver
static-by-default rendering. `CategoriesMarquee.jsx` and the product-page breadcrumb are now real links.
**`loading.tsx` was deliberately dropped** — a genuine, empirically confirmed Next.js 15 App Router
limitation: a `loading.tsx` file wraps the route in a `<Suspense>` boundary that flushes a 200 status
before `notFound()` can run, so unknown-slug and out-of-range-page requests would incorrectly return
200 instead of 404. Isolation testing ruled out `error.tsx`, `generateMetadata`, and the SSG/dynamic
choice as causes — only `loading.tsx`'s presence broke it. Since crawlers never see a loading skeleton
anyway (only real users on slow connections would), and correct 404 status codes are this milestone's
core SEO purpose, correctness won; full details and the ruled-out alternatives are in
[MIGRATION_PLAN.md](./MIGRATION_PLAN.md)'s `M27a` entry. Verified against a live `npm run start`
server: parent/child rollup, a genuinely empty category (200 + empty state, tested via a temporary
debug route since no seeded category is naturally empty), unknown slug (404), out-of-range page (404),
and a simulated query failure (500 via `error.tsx`) all behave correctly.

**`M27` is done (2026-08-18).** `CategoriesMarquee.jsx` gained `'use client'` and now fetches all
categories from Payload's public-read REST API in a `useEffect`, replacing the hardcoded
`assets/assets.js` array. REST rather than the `M22` Local API utilities, because the marquee is
nested inside `Hero.jsx` — itself `'use client'`, whose own server-component conversion is `M40`'s
job — and a client component can't call the Local API; this is the fallback path
`lib/payload/categories.ts` already documents. Items stay inert bare `<button>`s, unchanged from
today; `M27a` still owns turning them into links. Verified in a real headless-Chromium browser
(Playwright) against a live `npm run start` server: the marquee renders the three seeded categories
("Electronics & Gadgets", "Headphones", "Speakers") with zero console errors.

**`M26` is done (2026-08-18).** Deleted the guarded store-attribution block `M25` left in
`ProductDescription.jsx` (`{product.store && (...)}`), its now-unused imports, and its dead link to
the already-deleted `/shop/[username]` route. With that gone, the file had no remaining client state
(`M25` already removed the Reviews tab), so it also dropped `'use client'` and now renders as a
server component. Verified against a live `npm run start` server: `/product/3` still renders
correctly and the response contains no "view store", "/shop/", or "Product by" text. `/product/[id]`'s
client JS dropped 123 kB → 120 kB First Load JS.

**`M25` is done (2026-08-18).** `app/(public)/product/[productId]/page.jsx` is now an async server
component reading `getProductById()`, calling `notFound()` for an unknown ID instead of rendering
a blank page — matches Next's default not-found page. `force-dynamic`, same reasoning as `M23`.
**The star-rating UI in `ProductDetails.jsx` and `ProductDescription.jsx` moved from `M46` into
`M25`**, the same forced pull-forward `ProductCard.jsx` got at `M23`: both read `product.rating`,
which real products don't have, and would have thrown before rendering — `M46` now has nothing left
to strip from either file. `ProductDescription.jsx`'s Reviews tab is removed outright, not just
guarded, since it existed only to render that missing field and Reviews are out of scope for v1
(ADR-016). Both files' image handling switched to resolving Media relationships' `.url`, mirroring
`ProductCard.jsx`'s `M23` fix. The store-attribution block is guarded (`product.store &&`), not
deleted — real products have no `store` relationship so it renders nothing, but the actual deletion
and its dead `/shop/[username]` link stay `M26`'s job as scoped. Verified against a live
`npm run start` server: `/product/3` renders the correct name, price, category, and image with no
"Reviews" text and no server errors; `/product/99999` returns a real HTTP 404. `/product/[productId]`
moved `○ Static` → `ƒ Dynamic`.

**`M24` is done (2026-08-18).** `app/(public)/shop/page.jsx` is now an async server component reading
`getProducts()` from `lib/payload/products.ts`, matching `M23`'s precedent under
[ADR-007](./DECISIONS.md)'s blanket SEO-first/mobile-first mandate even though `M24`'s literal text
doesn't spell out "server component" the way `M23`'s does. The `?search=` filter is unchanged — still a
simple in-memory `.includes()` over the fetched list, exactly as it worked against the dummy Redux data;
`M29` remains the milestone that replaces it with a real Payload query. The "all products" back-link
changed from an `onClick`/`router.push` handler to a plain `<Link href="/shop">`, since nothing on the
page needs client-side interactivity anymore. Verified against a live `npm run start` server with seeded
data: real names render, `?search=Bluetooth` includes/excludes correctly, an unmatched search renders a
clean empty grid with no server errors. `/shop` moved `○ Static` → `ƒ Dynamic`.

**`M23` is done (2026-08-17).** The home page is now a server component reading real Payload data:
`LatestProducts` by `-createdAt`, `BestSelling` from an admin-curated `isFeatured` flag added to
`Products` ([ADR-022](./DECISIONS.md#adr-022-best-selling-is-an-admin-curated-flag-not-a-computed-ranking) —
there is no sales or review data to rank by, and inventing a proxy metric would have been a fabricated
claim to customers). Two scope notes: **`components/ProductCard.jsx` moved from `M46` into `M23`**,
because it called `product.rating.reduce()` on a field real products do not have and would have thrown
before rendering anything — `M23` was impossible without it; and **`/` is now `force-dynamic`**, because
admin curation is pointless if toggling `isFeatured` needs a redeploy to show up, and because the
production build (`M49`) cannot assume a reachable database. `/` moved `○ Static` → `ƒ Dynamic`.

| Milestones | Group | Status |
|---|---|:---|
| `M16`, `M17`, `M19` | Clear `app/admin/**` — **runs before `M3`** | **Done** (2026-08-14) |
| `M1` | Foundation: Dockerized PostgreSQL for local development | **Done** (2026-08-14) |
| `M2` | Foundation: Payload v3, Postgres adapter, `sharp` dependencies | **Done** (2026-08-14) |
| `M2a` | Foundation: TypeScript toolchain | **Done** (2026-08-14) |
| `M14` | Delete vendor dashboard (`app/store/**`) — **hard prerequisite of `M3`**, per [ADR-014](./DECISIONS.md) | **Done** (2026-08-16) |
| `M3`, `M4`, `M5` | Foundation: scaffold Payload, retire Prisma, dev Dockerfile | **Done** (2026-08-16) — `M5`'s `docker build` could not be fully verified in the authoring sandbox (registry egress blocked); Dockerfile is implemented, needs a real-registry build check |
| `M15`, `M18` | Remove remaining multi-vendor routes | **Done** (2026-08-17) — leaves one dead link, already owned by `M26` |
| `M6`–`M13`, `M13a` | Payload collections: Users, Media, Categories, Products, Orders, Settings global | **Done** (2026-08-17) |
| `M20`–`M21` | Confirm admin-only auth end to end | **Done** (2026-08-17) — audit found no custom/fake auth anywhere; dead Login button removed |
| `M22`–`M28` (incl. `M27a`, `M27b`) | Storefront on real Payload data; category browsing routes; dummy data removed | **Done** (2026-08-18) |
| `M29` | Real search | Not Started |
| `M30`–`M36` | Cart persistence, guest checkout, real COD order creation | Not Started |
| `M37`–`M39` | Admin order fulfillment | Not Started |
| `M40`–`M43` | SEO: server rendering, metadata, sitemap, structured data | Not Started |
| `M44`–`M45` | Mobile-first audit and performance | Not Started |
| `M46`–`M48` | Reviews/Coupons: decide and land minimal v1 scope | Not Started |
| `M49`–`M54` | Docker production hardening, health checks, backups | Not Started |
| `M55`–`M56` | PKR currency, Pakistani address/phone validation | Not Started |
| `M57`–`M59` | Regression pass, docs, launch | Not Started |

---

## Gates

### `M1` gate — **CLEARED** (`M1`, `M2`, `M2a`, `M16`, `M17`, `M19` complete)

The six pre-`M1` corrections from the readiness audit are applied. Foundation work has begun:
`M1`, `M2`, and `M2a` are **Done**, and `M16`, `M17`, `M19` have cleared `app/admin/**`.

### `M3` gate — **CLEARED** (`M14`, `M3`, `M4`, `M5` complete)

`M14` landed first, clearing the multiple-root-layouts precondition per [ADR-014](./DECISIONS.md#adr-014-m14-is-a-hard-prerequisite-of-m3-not-an-order-independent-milestone). `M3` then mounted Payload, `M4` retired the unwired Prisma schema, and `M5` added the dev Dockerfile. `/admin` was live at this point with Payload's collection-less admin shell — since superseded by `M6`–`M13`/`M13a` (see above), which is now a real, collection-backed panel.

### `M6` gate — **CLEARED** (2026-08-16), collection design **complete** (2026-08-17)

All six decisions are made and recorded as ADRs, and `M6`–`M13`/`M13a` are now **Done** — see
"Implementation status by milestone" above.

- [x] **Resolved**: Reviews are out of scope for v1 → [ADR-016](./DECISIONS.md#adr-016-reviews-are-out-of-scope-for-v1). `M46` executes the removal path.
- [x] **Resolved**: Coupons are out of scope for v1 → [ADR-017](./DECISIONS.md#adr-017-coupons-are-out-of-scope-for-v1). `M47` executes the removal path.
- [x] **Resolved**: Shipping/delivery model → [ADR-018](./DECISIONS.md#adr-018-shipping-model--flat-rate-with-a-free-shipping-threshold-snapshotted-per-order): flat rate + free-shipping threshold, both admin-configurable via a new Settings global (`M13a`), snapshotted onto each order at creation.
- [x] **Resolved**: Order status set → [ADR-019](./DECISIONS.md#adr-019-order-status-set-includes-confirmed-cancelled-and-returned): adds `CONFIRMED`, `CANCELLED`, and `RETURNED` to the enum.
- [x] **Resolved**: Media storage backend → [ADR-020](./DECISIONS.md#adr-020-media-storage-backend-is-a-local-docker-volume-for-v1-with-cloudflare-r2-as-the-designated-successor): local Docker volume for v1, Cloudflare R2 named as the designated successor.
- [x] **Resolved**: `Orders` shape for guests → [ADR-021](./DECISIONS.md#adr-021-guest-orders-use-embedded-address-fields-not-a-customers-collection): embedded address fields, no `Customers` collection. (Tracked as `D11`/blocking-`M11` in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md) rather than the `M6`-gate list below it — recorded here too since both sources treat it as a precondition for the `M6`–`M13` group.)
- [x] **Resolved**: `Categories` hierarchy and category-browsing scope → [ADR-013](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy), Accepted 2026-08-16. `M9`'s field list, the two-level `parent` self-relation, and `Products.category` cardinality (`M10`) are settled; spec in [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md)

### Later, non-blocking

- [ ] PKR formatting convention (blocks `M55`) — the displayed **symbol** is fixed (`Rs. `, 2026-08-17,
  `NEXT_PUBLIC_CURRENCY_SYMBOL` and its fallback in every consumer); comma grouping/decimal handling
  is still open and stays with `M55`.
- [ ] Order notifications: WhatsApp/email — **no milestone exists yet**. SMS is deferred to a future phase, per [ADR-015](./DECISIONS.md#adr-015-initial-production-infrastructure-baseline); Resend (email infra) is decided, but which order-lifecycle emails are sent is still unspecified.
- [ ] Guest order-lookup key and abuse controls (reconciles `M13` access rules with `M36`)
- [ ] Cart state mechanism: Redux vs. simpler client-side store (`M30` assumes Redux + `localStorage`)
- [x] ~~**Mobile navbar has no cart link or navigation**~~ — **Resolved 2026-08-17**, pulled forward from
  `M44`. `components/Navbar.jsx` gained a mobile row (`flex sm:hidden`): a Shop link, a search toggle,
  and a cart link with the count badge — the same badge the desktop nav already had. Verified `Rs.`/
  cart markup render server-side under `npm run build && npm run start`.
- [x] ~~**"Best selling" has no defined ranking**~~ — **Resolved 2026-08-17** at `M23` → [ADR-022](./DECISIONS.md#adr-022-best-selling-is-an-admin-curated-flag-not-a-computed-ranking): admin-curated `isFeatured` flag on `Products`, not a computed metric. A sales-derived ranking remains possible later (it would need an `Orders` aggregation no milestone owns yet, and would render empty at launch regardless).
- [ ] **`payload-types.ts` cannot be generated in this sandbox** (found during `M22`). `payload generate:types` hits the same `tsx`/Node ESM-interop class of failure as `scripts/seed.ts` (`M13`) and `generate:importmap` (`M3`). `lib/payload/*.ts` use hand-written types mirroring the collections exactly as a stand-in. Confirm `payload generate:types` works in a normal environment and switch these files to the generated types when convenient — not launch-blocking, but worth doing before the type surface grows much further.
- [ ] Unscheduled gaps tracked in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md): test framework + CI, Newsletter disposition, storefront copy pass, production `payload migrate` step
  - *(the category listing route is no longer among these — scheduled as `M27a`/`M27b`, closing finding `C8`; the store Settings global is no longer among these either — scheduled as `M13a`, per [ADR-018](./DECISIONS.md#adr-018-shipping-model--flat-rate-with-a-free-shipping-threshold-snapshotted-per-order))*
