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

- ~~`scripts/seed.ts` could not be executed directly via `tsx`~~ — **resolved 2026-08-26.**
  `npm run seed` runs successfully and produces the expected 4 products / 5 categories / 4 media.
  The diagnosis above was wrong: it was not a sandbox bug and not confined to
  `@payloadcms/db-postgres`. `package.json` declared no `"type": "module"`, so project `.ts` files
  loaded as CommonJS while Payload v3 ships ESM with top-level await; separately, `readAsset()` still
  read images from the `assets/` directory `M28` deleted. Both fixed — see
  [CHANGELOG.md](./CHANGELOG.md).
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

**Four production-prep milestones inserted (2026-08-18)**, closing the remaining pre-production
readiness gaps before the `M49`–`M59` groups start:
- **`M52a` — Run Payload migrations as an explicit production deploy step** (closes `R9`): `payload
  migrate` runs before the app serves traffic, schema auto-push disabled in production, a failed
  migration blocks the deploy. Inserted into the Docker group after `M52` (secrets).
- **`M48a` — Remove non-functional Newsletter signup** (closes `R11`): `Newsletter.jsx`'s form has no
  submit handler and silently discards input — same defect class as the dead Login button (`M21`) and
  dead coupon input (`M47`). Kept separate from `M48` since that milestone's scope is explicitly
  leftover references *from `M46`/`M47`*, not unrelated dead UI.
- **`M55a` — Storefront copy correctness pass** (closes `R12`): wires `Footer.jsx`'s contact display to
  the already-built `Settings` global (`M13a`) instead of a hardcoded US phone/address, and removes
  `ProductDetails.jsx`'s false "Free shipping worldwide" claim. Inserted after `M55` (currency).
- **`M56a` — Golden-path E2E test and CI pipeline** (closes `R7`): one deliberately minimal Playwright
  test (browse → product → cart → checkout → order created) plus a CI job, sequenced after `M56` (the
  last functional milestone the golden path touches) and before `M57`'s manual regression pass, so the
  automated test gives that pass something to lean on afterward rather than replacing it.

All four are design/scheduling only — `MIGRATION_PLAN.md`, `PHASE_1_READINESS_REPORT.md`'s R7/R9/R11/R12
rows and detail sections, and this file are updated; none are implemented yet, and each depends on
milestones that are themselves Not Started.

**New milestone `M33a` inserted (2026-08-18)**, closing readiness risk
[R5](./PHASE_1_READINESS_REPORT.md#r5--out-of-stock-enforcement-is-called-launch-critical-and-then-never-implemented):
`FEATURE_MATRIX.md` calls out-of-stock enforcement launch-critical for COD, `Products.inStock` has
existed since `M10`, and no milestone ever validated it at order creation — `M33`'s original goal and
acceptance test say nothing about stock. `M33a` (inserted directly after `M33`, which it depends on)
requires server-side re-validation of every line item's `inStock` at order-creation time, rejecting
the whole order if any product is unavailable — not just hiding the "Add to Cart" button, which a
direct API call bypasses trivially and which can't catch stock changing between page render and
"Place Order." Design only; implementation is scheduled, not done — `M33a` depends on `M33`, which is
Not Started.

**Two pre-checkout ADRs recorded (2026-08-18), ahead of `M30`–`M36`.**
[ADR-023](./DECISIONS.md#adr-023-cart-state-stays-redux-with-localstorage-persistence-added) closes
`D10`: cart state stays Redux, with `localStorage` persistence added — `M30`'s already-assumed answer,
now recorded rather than living only in `MIGRATION_PLAN.md`'s prose.
[ADR-024](./DECISIONS.md#adr-024-guest-order-lookup-via-a-dedicated-ordernumber-phone-endpoint--orders-collection-access-stays-admin-only)
closes `C7` and `D9` together: guest order lookup is a dedicated `(orderNumber, phone)` server
action/route, rate-limited by IP, that never relaxes `Orders`' `M13` collection-level access —
resolving the conflict the readiness report flagged between `M13`'s admin-only read and `M36`'s
guest-lookup requirement without the "improvised fix" the report warned would leak customer data
(opening collection read). Both ADRs update `M30`'s and `M36`'s `MIGRATION_PLAN.md` entries and the
corresponding `PHASE_1_READINESS_REPORT.md` rows; neither ADR itself is implementation — both
milestones remain Not Started.

**`M30` is done (2026-08-26).** The cart survives a page reload for the first time — `lib/features/cart/cartSlice.js`
gains a `hydrateCart` reducer that replaces `cartItems` wholesale and **recomputes `total` from it**
rather than trusting a persisted value, so a stored total can never drift from the items it should
match. `app/StoreProvider.js` reads `localStorage` and dispatches `hydrateCart` **inside a `useEffect`,
after mount** — not during initial state — because Navbar's cart badge (`state.cart.total`) is
server-rendered on every storefront route via the shared layout, and hydrating synchronously would
mismatch the server's always-empty HTML against the client's restored state. A `store.subscribe`
callback persists `cartItems` on every mutation, including `clearCart` (no special case needed — it
writes `{}` like any other mutation). Both the read and write paths are wrapped in `try`/`catch`, and
the read path validates shape per-entry (rejects non-objects, arrays, and non-positive/non-integer
quantities) rather than trusting the whole stored blob, so corrupted storage degrades to an empty cart
instead of breaking every route `StoreProvider` wraps. Implemented per [ADR-023](./DECISIONS.md#adr-023-cart-state-stays-redux-with-localstorage-persistence-added),
recorded ahead of time specifically so this milestone would not have to reopen "which state library" —
Redux stays, only persistence was added; no component outside the two files above needed a change, as
the ADR predicted. `lib/store.js` was deliberately left untouched by choosing the `subscribe` approach
over a `preloadedState` one. Verified with a scripted headless-Chromium session against a live
`npm run start` server with seeded data (17 checks): items survive a hard reload with no
hydration-mismatch console warnings; malformed JSON, a non-object value, and an array in storage all
degrade to an empty cart with no crash; deleting all items via the cart page's real delete control
clears storage to `{}` and stays empty after a further reload; and a directly-seeded
`{"1": 2, "2": 3}` hydrates to a navbar badge of `5`, confirming `total` is derived, not trusted.
`npm run type-check` and `npm run build` both pass; `/cart`, `/categories`, and `/orders` remain
`○ Static`, confirming no hydration mismatch was introduced. Corrected two stale entries in "Later,
non-blocking" below while here — both had already been resolved by ADR-023/ADR-024 on 2026-08-18 but
were never checked off, a `C`-class doc-drift finding this milestone's own dry run caught.

**`M29` is done (2026-08-26).** `/shop`'s search is now a real Payload query instead of an in-memory
`.includes()` filter: `getProducts()` (`lib/payload/products.ts`) gains an optional `search` option,
applied as `where: { name: { contains: trimmedSearch } } }` only when non-empty. Contract locked ahead
of implementation in [ADR-025](./DECISIONS.md#adr-025-m29-product-search-is-a-case-insensitive-contains-match-on-name-only)
— case-insensitive substring match on `name` only, `description` deliberately excluded — after
empirically confirming Payload's `contains` maps to Postgres `ILIKE` (raw `LIKE '%lamp%'` returns 0
rows against seeded data; `ILIKE`/`contains` both return 1), closing the dry run's highest-rated risk
of a silent case-sensitivity regression. `app/(public)/shop/page.jsx` drops its `filteredProducts`
in-memory filter entirely and passes `search` straight through. Verified against a live
`npm run start` server with seeded data: no-params returns the full listing (4), a seeded name search
returns exact matches case-insensitively (`Lamp`/`lamp`/`LAMP`/`lAmP` all → 1, `smart` → 2), a
mid-string substring matches, a non-matching term renders an empty grid at HTTP 200 (not an error), an
empty search string behaves as no search, and — confirming the name-only contract — searching `sleek`
(a word every seeded product's *description* shares) returns zero results. The home page's other
`getProducts()` call (`{ sort: '-createdAt', limit: 4 }`, no `search`) is unaffected — its `where`
clause stays `undefined`, identical to before. `/shop` remains `ƒ Dynamic`; `npm run type-check` and
`npm run build` both pass. `npm run lint` and the Docker registry-egress gap were explicitly out of
scope and remain as documented.

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
simple in-memory `.includes()` over the fetched list, exactly as it worked against the dummy Redux data
at the time — `M29` (below) is the milestone that replaced it with a real Payload query. The "all products" back-link
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
| `M29` | Real search | **Done** (2026-08-26) |
| `M30`–`M36` (incl. new `M33a`) | Cart persistence, guest checkout, real COD order creation | **`M30` Done** (2026-08-26); `M31`–`M36` Not Started — cart-state ([ADR-023](./DECISIONS.md)) and guest-order-lookup ([ADR-024](./DECISIONS.md)) decisions recorded ahead of time (2026-08-18), closing `D10`/`C7`/`D9`; new milestone `M33a` inserted to close `R5` (out-of-stock enforcement) |
| `M37`–`M39` | Admin order fulfillment | Not Started |
| `M40`–`M43` | SEO: server rendering, metadata, sitemap, structured data | Not Started |
| `M44`–`M45` | Mobile-first audit and performance | Not Started |
| `M46`–`M48` (incl. new `M48a`) | Reviews/Coupons: decide and land minimal v1 scope | Not Started — `M48a` inserted (2026-08-18) to close `R11` (dead Newsletter form) |
| `M49`–`M54` (incl. new `M52a`) | Docker production hardening, health checks, backups | Not Started — `M52a` inserted (2026-08-18) to close `R9` (explicit production migration step) |
| `M55`–`M56` (incl. new `M55a`, `M56a`) | PKR currency, Pakistani address/phone validation | Not Started — `M55a` inserted to close `R12` (storefront copy correctness); `M56a` inserted to close `R7` (golden-path E2E + CI) (both 2026-08-18) |
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
- [x] ~~Guest order-lookup key and abuse controls (reconciles `M13` access rules with `M36`)~~ — **Resolved 2026-08-18** → [ADR-024](./DECISIONS.md#adr-024-guest-order-lookup-via-a-dedicated-ordernumber-phone-endpoint--orders-collection-access-stays-admin-only). Left listed here in error after the ADR landed; caught during `M30`'s dry run. Implementation is still `M36`'s job.
- [x] ~~Cart state mechanism: Redux vs. simpler client-side store~~ — **Resolved 2026-08-18** → [ADR-023](./DECISIONS.md#adr-023-cart-state-stays-redux-with-localstorage-persistence-added): Redux stays, `localStorage` persistence added. Left listed here in error after the ADR landed; caught during `M30`'s dry run. **Implemented 2026-08-26** as `M30` itself.
- [x] ~~**Mobile navbar has no cart link or navigation**~~ — **Resolved 2026-08-17**, pulled forward from
  `M44`. `components/Navbar.jsx` gained a mobile row (`flex sm:hidden`): a Shop link, a search toggle,
  and a cart link with the count badge — the same badge the desktop nav already had. Verified `Rs.`/
  cart markup render server-side under `npm run build && npm run start`.
- [x] ~~**"Best selling" has no defined ranking**~~ — **Resolved 2026-08-17** at `M23` → [ADR-022](./DECISIONS.md#adr-022-best-selling-is-an-admin-curated-flag-not-a-computed-ranking): admin-curated `isFeatured` flag on `Products`, not a computed metric. A sales-derived ranking remains possible later (it would need an `Orders` aggregation no milestone owns yet, and would render empty at launch regardless).
- [ ] **Switch `lib/payload/*.ts` to the generated `payload-types.ts`** (found during `M22`; blocker cleared 2026-08-26). `payload generate:types` **now works** — the failure was `package.json` missing `"type": "module"`, not a sandbox bug, and the Payload CLI as a whole was affected. Generated output confirms the hand-written mirrors in `lib/payload/products.ts` and `lib/payload/categories.ts` are accurate, so nothing is broken today; switching them over remains open and is not owned by a milestone. Note that generating the file also surfaces real type errors that were previously invisible — one such error in `scripts/seed.ts` was fixed at the same time. Not launch-blocking, but worth doing before the type surface grows much further.
- [ ] Unscheduled gaps tracked in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md): test framework + CI, Newsletter disposition, storefront copy pass, production `payload migrate` step
  - *(the category listing route is no longer among these — scheduled as `M27a`/`M27b`, closing finding `C8`; the store Settings global is no longer among these either — scheduled as `M13a`, per [ADR-018](./DECISIONS.md#adr-018-shipping-model--flat-rate-with-a-free-shipping-threshold-snapshotted-per-order))*
