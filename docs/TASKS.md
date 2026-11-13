# Tasks — Mirza (formerly GoCart Pakistan)

Status roll-up for the migration. **This file tracks status; it does not define execution order.**

The authoritative implementation sequence is **every `### M…` entry in
[MIGRATION_PLAN.md](./MIGRATION_PLAN.md)** (Milestones 1 to 59 with their lettered splits, Milestones 60 to 81, 90 to 109; a Proposed or On-hold entry is not work until the owner approves it), ordered by each milestone's stated dependencies.

Status words used from 2026-11-03: **Merged** (on `main`, continuous integration green), **Deployed to test** (running on `gocart-test`, checked with evidence), **In progress**, **Blocked on access** (names the missing access), **On hold** (owner or client decision). "Done" in older rows means merged and accepted; it never by itself means deployed.
Group names below are labels for reporting only — never schedule or reference work by group.

Status legend: `Not Started` · `In Progress` · `Blocked` · `Done`

---

## Planning & documentation — **Done** (2026-08-14)

- [x] Audit existing GoCart codebase (stack, data model, routes) → [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md)
- [x] Create `docs/`, `prompts/` structure and core docs
- [x] Feature-by-feature disposition → [FEATURE_MATRIX.md](./FEATURE_MATRIX.md)
- [x] Milestone-level migration plan → [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)
- [x] **Resolved**: multi-vendor vs. single-store → [Architecture Decision Record 006](./DECISIONS.md), Accepted 2026-08-07. **Closed — single store, no vendors, admin-managed commerce.**
- [x] **Resolved**: Prisma schema retirement → [Architecture Decision Record 003](./DECISIONS.md), Accepted 2026-08-14
- [x] **Resolved**: Payload deployment topology → [Architecture Decision Record 009](./DECISIONS.md), Accepted 2026-08-14 (embedded in the Next.js app)
- [x] Phase 1 readiness audit and correction pass → [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md)
- [x] Category-browsing audit and specification (2026-08-16) → [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md), [Architecture Decision Record 013](./DECISIONS.md#architecture-decision-record-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy), new Milestones 27a and 27b. **Closes readiness finding `C8`.**
- [x] Confirm the Milestone 6-blocking open questions in [PROJECT_SPEC.md](./PROJECT_SPEC.md) with the stakeholder → [Architecture Decision Record 016](./DECISIONS.md#architecture-decision-record-016-reviews-are-out-of-scope-for-v1)–[Architecture Decision Record 021](./DECISIONS.md#architecture-decision-record-021-guest-orders-use-embedded-address-fields-not-a-customers-collection), Accepted 2026-08-16. Currency (open question #1) and notifications (open question #5, partially resolved by [Architecture Decision Record 015](./DECISIONS.md#architecture-decision-record-015-initial-production-infrastructure-baseline)) remain open but are not Milestone 6 blockers — see [PROJECT_SPEC.md](./PROJECT_SPEC.md)

---

## Implementation status by milestone

Implementation has begun. Milestone 1 added local development infrastructure (`docker-compose.yml`,
`.env.example`), Milestone 2 added Payload dependencies, and Milestone 2a added the TypeScript toolchain
(`tsconfig.json`, `next-env.d.ts`; `jsconfig.json` retired). Milestones 16 and 17, and Milestone 19 then deleted the
legacy admin surface — `app/admin/**` and `components/admin/**` (plus `components/OrdersAreaChart.jsx`)
are gone. Milestone 14 then deleted the vendor dashboard (`app/store/**`, `components/store/**`), clearing the
multiple-root-layouts precondition per [Architecture Decision Record 014](./DECISIONS.md#architecture-decision-record-014-milestone-14-is-a-hard-prerequisite-of-milestone-3-not-an-order-independent-milestone).

**Milestone 3 has landed: Payload is mounted.** `payload.config.ts` (no collections yet) is wired to Postgres;
`/admin` and `/api/*` are mounted inside the Next.js App Router per [Architecture Decision Record 009](./DECISIONS.md#architecture-decision-record-009-payload-cms-runs-embedded-inside-the-nextjs-application-not-as-a-separate-service). Milestone 4 then retired the unwired
Prisma schema, and Milestone 5 added a development Dockerfile. **`/admin` now returns Payload's
(collection-less) admin shell**, not 404 — the interim 404 window between Milestones 17 and 3 is closed.

**Customer-facing behavior is still unchanged.** No `.jsx` storefront file has been converted, and the
storefront renders exactly as inherited; `app/layout.jsx` was restructured into `app/(public)/layout.jsx`
(now the storefront's own root layout, per Milestone 3's multiple-root-layouts requirement) with no visible
change to rendered output.

**Milestones 6 to 13 and 13a have landed.** All five collections (`Users`, `Media`, `Categories`,
`Products`, `Orders`) and the `Settings` global are registered in `payload.config.ts`, with access
control set per Milestone 13 (public-read/admin-write on `Products`/`Categories`/`Media`, public-create/
admin-read on `Orders`) and a dev seed script (`scripts/seed.ts`). `/admin` now serves a real,
collection-backed admin panel — the "collection-less admin shell" era from Milestone 3 is over.
Every milestone's testing criteria in [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) was verified against
a live Postgres-backed dev server (REST + GraphQL). Two things flagged during that work:

- ~~`scripts/seed.ts` could not be executed directly via `tsx`~~ — **resolved 2026-08-26.**
  `npm run seed` runs successfully and produces the expected 4 products / 5 categories / 4 media.
  The diagnosis above was wrong: it was not a sandbox bug and not confined to
  `@payloadcms/db-postgres`. `package.json` declared no `"type": "module"`, so project `.ts` files
  loaded as CommonJS while Payload v3 ships ESM with top-level await; separately, `readAsset()` still
  read images from the `assets/` directory Milestone 28 deleted. Both fixed — see
  [CHANGELOG.md](./CHANGELOG.md).
- Milestone 13's admin-only `Orders` read is exactly as specified, and exactly what readiness finding `C7`
  already flags as conflicting with Milestone 36's future guest-order-lookup requirement. Still open — not
  solved by this implementation, tracked in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

**Milestones 20 to 21 are done (2026-08-17).** Milestone 20's audit found **no custom or faked authentication
anywhere in the application** — no middleware, no auth dependencies in `package.json`, and no
`isAdmin`/`isSeller`-style bypass left over from the multi-vendor original (those died with Milestones 14 and 17).
Payload's `/admin` is the only authenticated surface: logged out it serves the login screen and leaks
no collection data, while `/api/users` and `/api/orders` correctly return 403. All nine customer-facing
routes render 200 while logged out — no login walls, no redirects. Milestone 21 then removed the dead
"Login" button (desktop and mobile) from `components/Navbar.jsx`; it never had a handler, and customers
never authenticate under guest-checkout-only ([Architecture Decision Record 005](./DECISIONS.md)). One follow-on observation is
recorded against Milestone 44 — see "Later, non-blocking" below.

**Milestones 15 and 18 are done (2026-08-17).** Deleted `app/(public)/create-store/page.jsx`,
`app/(public)/shop/[username]/page.jsx`, `app/(public)/pricing/page.jsx`, and
`app/(public)/loading/page.jsx`, and removed the two now-dead Footer links ("Create Your Store",
"Become Plus Member") inline, per both milestones' own testing notes — Milestone 48's Footer cleanup is
too far away to leave them dead in the meantime. `components/Loading.jsx` (the shared spinner
component those pages imported) was left in place — not in either milestone's Files list, and still a
plain, reusable component with no dead reference of its own.
One thing found but **not** fixed here, because it is already owned elsewhere: `ProductDescription.jsx`
still links to `/shop/${product.store.username}`, the route Milestone 15 just deleted. This is not an
oversight — Milestone 26 ("Remove multi-vendor 'Product by {store}' attribution") already exists for exactly
this, already depends on Milestone 15, and its own goal text anticipates the route being "(already-deleted)".
Until Milestone 26 lands, that one link 404s if clicked from a product page.

**Milestone 22 is done (2026-08-17).** `lib/payload/categories.ts` and `lib/payload/products.ts` are new
server-side (Local API) utilities, verified against seeded data with a temporary route (deleted before
committing) — `getProductsByCategory()`'s rollup is confirmed exact: a parent slug returns its own
products plus every child's, a child slug returns only its own. Two things worth knowing before Milestone 23
picks this up: **types are hand-written**, not generated from `payload-types.ts` (`payload
generate:types` hits the same sandbox `tsx` issue as `scripts/seed.ts`), and **`getProducts()` takes an
explicit `sort` with no default for "best selling"** — there is no sales-count or review field to rank
by in the current schema, so Milestone 23 must choose a stand-in sort when it wires `BestSelling.jsx`.

**Four production-prep milestones inserted (2026-08-18)**, closing the remaining pre-production
readiness gaps before the Milestones 49 to 59 groups start:
- **Milestone 52a — Run Payload migrations as an explicit production deploy step** (closes `R9`): `payload
  migrate` runs before the app serves traffic, schema auto-push disabled in production, a failed
  migration blocks the deploy. Inserted into the Docker group after Milestone 52 (secrets).
- **Milestone 48a — Remove non-functional Newsletter signup** (closes `R11`): `Newsletter.jsx`'s form has no
  submit handler and silently discards input — same defect class as the dead Login button (Milestone 21) and
  dead coupon input (Milestone 47). Kept separate from Milestone 48 since that milestone's scope is explicitly
  leftover references *from Milestones 46 and 47*, not unrelated dead user interface.
- **Milestone 55a — Storefront copy correctness pass** (closes `R12`): wires `Footer.jsx`'s contact display to
  the already-built `Settings` global (Milestone 13a) instead of a hardcoded US phone/address, and removes
  `ProductDetails.jsx`'s false "Free shipping worldwide" claim. Inserted after Milestone 55 (currency).
- **Milestone 56a — Golden-path end-to-end test and continuous integration pipeline** (closes `R7`): one deliberately minimal Playwright
  test (browse → product → cart → checkout → order created) plus a continuous integration job, sequenced after Milestone 56 (the
  last functional milestone the golden path touches) and before Milestone 57's manual regression pass, so the
  automated test gives that pass something to lean on afterward rather than replacing it.

All four are design/scheduling only — `MIGRATION_PLAN.md`, `PHASE_1_READINESS_REPORT.md`'s R7/R9/R11/R12
rows and detail sections, and this file are updated; none are implemented yet, and each depends on
milestones that are themselves Not Started.

**New Milestone 33a inserted (2026-08-18)**, closing readiness risk
[R5](./PHASE_1_READINESS_REPORT.md#r5--out-of-stock-enforcement-is-called-launch-critical-and-then-never-implemented):
`FEATURE_MATRIX.md` calls out-of-stock enforcement launch-critical for cash on delivery, `Products.inStock` has
existed since Milestone 10, and no milestone ever validated it at order creation — Milestone 33's original goal and
acceptance test say nothing about stock. Milestone 33a (inserted directly after Milestone 33, which it depends on)
requires server-side re-validation of every line item's `inStock` at order-creation time, rejecting
the whole order if any product is unavailable — not just hiding the "Add to Cart" button, which a
direct API call bypasses trivially and which can't catch stock changing between page render and
"Place Order." Design only; implementation is scheduled, not done — Milestone 33a depends on Milestone 33, which is
Not Started.

**Two pre-checkout Architecture Decision Records recorded (2026-08-18), ahead of Milestones 30 to 36.**
[Architecture Decision Record 023](./DECISIONS.md#architecture-decision-record-023-cart-state-stays-redux-with-localstorage-persistence-added) closes
`D10`: cart state stays Redux, with `localStorage` persistence added — Milestone 30's already-assumed answer,
now recorded rather than living only in `MIGRATION_PLAN.md`'s prose.
[Architecture Decision Record 024](./DECISIONS.md#architecture-decision-record-024-guest-order-lookup-via-a-dedicated-ordernumber-phone-endpoint--orders-collection-access-stays-admin-only)
closes `C7` and `D9` together: guest order lookup is a dedicated `(orderNumber, phone)` server
action/route, rate-limited by IP, that never relaxes `Orders`' Milestone 13 collection-level access —
resolving the conflict the readiness report flagged between Milestone 13's admin-only read and Milestone 36's
guest-lookup requirement without the "improvised fix" the report warned would leak customer data
(opening collection read). Both Architecture Decision Records update Milestone 30's and Milestone 36's `MIGRATION_PLAN.md` entries and the
corresponding `PHASE_1_READINESS_REPORT.md` rows; neither Architecture Decision Record itself is implementation — both
milestones remain Not Started.

**Milestones 34, 37, 38 and 39 are done (2026-10-09) — the admin verification batch.**
- Milestone 34 needed no further code: the shipping rule (flat rate below the free-shipping threshold, `0` at or above it, both read from the `Settings` global and snapshotted onto the order) landed in `createOrder` with Milestone 33, and the checkout display was pulled forward into `OrderSummary.jsx` at the same time. It was verified at both sides of the threshold in Milestone 33's quality assurance and again in the cleanup batch's scoped quality assurance.
- Milestones 37 and 38: Quality assurance evaluated the admin as it stood (an admin could already run fulfilment; the weak spot was search) and `collections/Orders.ts` got **admin-UI configuration only** — no access, field, hook or schema change (the database schema is byte-identical to before): search by order number, name, phone and city; phone and city in the default columns; an explicit newest-first sort; Status and Is Paid in the sidebar by the Save button with guidance (Cash on Delivery: tick Is Paid when the cash is collected); snapshot-field notes. All seven statuses persist through the user interface and the guest lookup shows each one.
- Milestone 39: `OrderItem.jsx` was aligned to the real order shape inside Milestone 36.
- Open owner decisions are in [CHANGELOG.md](./CHANGELOG.md) (locking `orderNumber` at the API level; whether price/total fields should be read-only).

**Milestones 46, 47, 48 and 48a are done (2026-10-09), run as one fast-track batch** under the owner's scope-based quality assurance rule
([GATES.md](../.claude/docs/GATES.md)): frontend-only deletions, so lint and type-check only, no build, no database. Removed: the orphaned
review components (`Rating.jsx`, `RatingModal.jsx`; Architecture Decision Record 016), the dead coupon state/input/branches in `OrderSummary.jsx` (Architecture Decision Record 017), the
non-functional Newsletter form, and — found by Milestone 48's sweep — the site-wide promo banner that advertised "20% OFF" and copied a coupon code
(`NEW20`) that nothing honors. Scoped quality assurance used a database-free dev server with mocked network responses. **Not verified (needs a database):** the home
page render without the Newsletter section and the other database-backed routes. Other false customer-facing claims were found and are tracked for Milestone 55a
(see [CHANGELOG.md](./CHANGELOG.md)).

**Milestone 36 is done (2026-10-09).** `/orders` is now a real guest order lookup (no dummy data): the guest enters an order number and
the phone number they ordered with; a server action (`app/(public)/orders/actions.ts`) rate-limits **before** any query and
`lookupOrder` (`lib/payload/orders.ts`) returns exactly one order's whitelisted fields or an identical "not found" for any mismatch,
per [Architecture Decision Record 024](./DECISIONS.md#architecture-decision-record-024-guest-order-lookup-via-a-dedicated-ordernumber-phone-endpoint--orders-collection-access-stays-admin-only).
`Orders` collection access is unchanged (admin-read only). Owner-approved limits: 20 lookups/hour per IP and 5 **failed** lookups/hour per
order number (successful lookups are free), the latter on a fixed-size, non-evicting bucket store. Verified by quality assurance on a live server (two rounds, including the final limiter) and a
full security review; details in CHANGELOG. **Launch dependency:** the per-IP limit trusts client-IP headers, so the origin must be firewalled to Cloudflare before
launch (Milestones 49 to 52); closes readiness findings `C7` and `D9` in implementation.

**Milestone 35 is done (2026-10-09).** After Place Order the guest lands on `/order-confirmation` showing the real order:
order number (with a copy button), server-priced lines, subtotal / shipping / total, delivery details, and Cash on
Delivery. Per [Architecture Decision Record 027](./DECISIONS.md#architecture-decision-record-027-milestone-35-order-confirmation-is-rendered-from-the-placeorder-response-held-in-sessionstorage--no-server-read-of-orders)
the page is rendered from the `placeOrder` response held in `sessionStorage` — there is no server read of `Orders` keyed by
order number, so Architecture Decision Record 024 is not weakened. Stored data is shape-validated; a missing or invalid entry shows a "couldn't find a
recent order in this browser" state pointing at `/orders` (still dummy data until Milestone 36). Verified by quality assurance on a live server.

**Milestone 33a is done (2026-10-09).** `createOrder` now re-checks every line's `Products.inStock` from the same
fetch that supplies prices and **fails closed** (only an explicit `true` is purchasable); any unavailable line
rejects the whole order with `OUT_OF_STOCK` and the blocking product names, and `OrderSummary.jsx` tells the
customer which products to remove. Closes readiness risk R5. Verified by quality assurance on a live server, including a product
flipped out of stock *after* the cart loaded. The storefront still lets customers *add* an out-of-stock product to
the cart — **fixed the same day** by an owner-requested patch (see [CHANGELOG.md](./CHANGELOG.md)).

**Milestone 33 is done (2026-10-09).** "Place Order" now creates a real `Order` through a server action
(`app/(public)/cart/actions.ts`) calling `createOrder` in `lib/payload/orders.ts`, implementing
[Architecture Decision Record 026](./DECISIONS.md#architecture-decision-record-026-orders-are-created-only-by-a-server-side-function--orders-collection-create-access-closes-to-admins)
(Accepted 2026-10-09): prices, shipping, totals, status and order number are derived server-side, input is
validated before any write, and `Orders.create` is now admin-only (anonymous `POST /api/orders` and the GraphQL
`createOrder` mutation return 403). Creation is rate-limited per IP (5 per 15 minutes). Verified by quality assurance against a
live server and a Security/Performance review (no Blockers); details, scope excursions and open items in
[CHANGELOG.md](./CHANGELOG.md). Milestone 33a (stock) is next and plugs into the marked seam in `createOrder`.

**Milestone 32 is done (2026-08-26).** The non-functional Stripe radio button is gone from
`components/OrderSummary.jsx` — it was fully wired (`onChange`, `checked`) but no payment gateway has
ever existed anywhere in the codebase, so it presented a choice that didn't work. [Architecture Decision Record 004](./DECISIONS.md#architecture-decision-record-004-cash-on-delivery-only-for-launch-architecture-stays-payment-extensible)'s
Consequences line already specified the exact outcome word for word — *"Checkout user interface shows cash on delivery as the
only option (not a disabled placeholder for others, to avoid confusing customers)"* — so this milestone
had no open decision to make; it was user interface catching up to a decision the data model already enforces
(`collections/Orders.ts`'s `paymentMethod` field is a `select` with exactly one option, `'COD'`). Per
the Testing line ("no radio group needed"), both radio inputs are removed, not just Stripe's — a single
always-true option has no business being a radio button. Cash on delivery is now a plain `"Cash on Delivery (COD)"`
label. `paymentMethod` changed from `useState('COD')` to a plain `const paymentMethod = 'COD'`: nothing
can set it to anything else anymore, so the setter was dead weight; the constant itself stays, declared
but not yet read within this file, for Milestone 33 to consume when it builds the real order. Verified with a
scripted headless-Chromium session against a live `npm run start` server with seeded data: no "Stripe"
text anywhere on the page, zero `<input type="radio">` elements, cash on delivery still shown, and "Place Order"
still navigates to `/orders` unaffected. `npm run type-check` and `npm run build` both pass; `/cart`
remains `○ Static`, client JS dropped slightly (4.35 kB → 4.25 kB) from the removed radio-group logic.

**Milestone 31 is done (2026-08-26).** `AddressModal.jsx`'s submit handler did nothing before this — it just
closed the modal. It now captures a real Pakistani guest-checkout address (`name`, `phone`, `email`,
`address`, `city`, `area` — phone ordered ahead of email, per the milestone's "phone-first" goal) and
dispatches it via `addAddress`, a reducer that already existed in `lib/features/address/addressSlice.js`
(added at Milestone 28 in anticipation of this milestone) but had never been called. The field set matches
`collections/Orders.ts`'s embedded guest-address fields exactly ([Architecture Decision Record 021](./DECISIONS.md#architecture-decision-record-021-guest-orders-use-embedded-address-fields-not-a-customers-collection)),
so Milestone 33 can map it straight onto an order later with no translation layer. `email` is kept on the form
even though `Orders` has no email column today — a deliberate stakeholder call, captured now against a
possible future order-notification use rather than dropped and re-added later. `phone` gets an 11-digit,
leading-zero HTML5 pattern (`03XXXXXXXXX`) with a descriptive validation message.
**Scope note**: `components/OrderSummary.jsx` was pulled in alongside `AddressModal.jsx`, one file beyond
the milestone's own list — its two address-display lines (`selectedAddress.state`/`.zip`, the dropdown
option text) referenced fields the new form no longer produces. Left unfixed, a selected new-style
address would have displayed with blank fields on every field the removed `state`/`zip` columns used to
fill. Both lines now read `.address`/`.area`/`.city` instead — a stakeholder-approved excursion, the same
class of pull-forward as Milestone 23's `ProductCard.jsx`. **Found but not fixed, left for later**: the dummy
seed address (`addressDummyData`, `lib/features/address/addressSlice.js:5-16`) still uses the old
`street`/`state`/`zip`/`country` shape and is not on this milestone's Files line; it now renders in the
address dropdown as `"John Doe, , , New York"` — blank, not broken (React silently drops `undefined`
JSX interpolations rather than printing the string "undefined", confirmed empirically during quality assurance, correcting
an assumption from this milestone's own dry run). Verified with a scripted headless-Chromium session (18
checks) against a live `npm run start` server with seeded data: all six fields present and correctly
ordered, no leftover `state`/`zip`/`country` inputs, a submitted address appears in `OrderSummary`'s
dropdown and renders correctly when selected (no "undefined" anywhere), required-field and phone-pattern
validation both work (a 5-digit number fails, `03001234567` passes), and two addresses added in one
session both persist. `npm run type-check` and `npm run build` both pass; `/cart` remains `○ Static`.

**Milestone 30 is done (2026-08-26).** The cart survives a page reload for the first time — `lib/features/cart/cartSlice.js`
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
instead of breaking every route `StoreProvider` wraps. Implemented per [Architecture Decision Record 023](./DECISIONS.md#architecture-decision-record-023-cart-state-stays-redux-with-localstorage-persistence-added),
recorded ahead of time specifically so this milestone would not have to reopen "which state library" —
Redux stays, only persistence was added; no component outside the two files above needed a change, as
the Architecture Decision Record predicted. `lib/store.js` was deliberately left untouched by choosing the `subscribe` approach
over a `preloadedState` one. Verified with a scripted headless-Chromium session against a live
`npm run start` server with seeded data (17 checks): items survive a hard reload with no
hydration-mismatch console warnings; malformed JSON, a non-object value, and an array in storage all
degrade to an empty cart with no crash; deleting all items via the cart page's real delete control
clears storage to `{}` and stays empty after a further reload; and a directly-seeded
`{"1": 2, "2": 3}` hydrates to a navbar badge of `5`, confirming `total` is derived, not trusted.
`npm run type-check` and `npm run build` both pass; `/cart`, `/categories`, and `/orders` remain
`○ Static`, confirming no hydration mismatch was introduced. Corrected two stale entries in "Later,
non-blocking" below while here — both had already been resolved by Architecture Decision Records 023 and 024 on 2026-08-18 but
were never checked off, a `C`-class doc-drift finding this milestone's own dry run caught.

**Milestone 29 is done (2026-08-26).** `/shop`'s search is now a real Payload query instead of an in-memory
`.includes()` filter: `getProducts()` (`lib/payload/products.ts`) gains an optional `search` option,
applied as `where: { name: { contains: trimmedSearch } } }` only when non-empty. Contract locked ahead
of implementation in [Architecture Decision Record 025](./DECISIONS.md#architecture-decision-record-025-milestone-29-product-search-is-a-case-insensitive-contains-match-on-name-only)
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

**Milestone 28 is done (2026-08-18) — the Milestones 22 to 28 storefront-data group is now fully complete.**
`assets/assets.js` and all its imported placeholder images are deleted, along with
`lib/features/product/productSlice.js` and `lib/features/rating/ratingSlice.js`; `lib/store.js` is
trimmed to `cart` + `address`. **This milestone's stated premise — "every storefront consumer has
been re-pointed" — was false**, and one of the gaps it hid was a real, already-live bug: `/cart`
resolved line items against the now-deleted dummy `productSlice`, which nothing had populated with
real data since Milestones 23 to 25 gave every reachable product a real Payload ID — **the cart has been
silently dropping every item added from a real product page since Milestone 25 shipped.** Fixed by fetching
real products via REST (`GET /api/products?limit=0&depth=1`, the same client-component pattern
`CategoriesMarquee.jsx` uses), not deferred: no milestone in Milestones 30 to 36 explicitly owns this fix.
Four smaller gaps also surfaced and were resolved: `OrderItem.jsx`'s star-rating block (read the
now-deleted `ratingSlice`, forced-fixed here — Milestone 46's file list is corrected to note it should have
included this file from the start); `OurSpec.jsx` and `addressSlice.js`'s small non-product data
literals inlined into their sole consumers; `orders/page.jsx`'s dummy order data inlined image-free
(that page stays fully dummy until Milestone 36's real guest lookup — out of scope to fix further here);
`Hero.jsx`'s three now-deleted hero images replaced with gradient placeholders (this milestone's own
file list already committed to deleting those images). Full details, including exactly which files
were affected and why, are in [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)'s Milestone 28 entry. Verified against
a live `npm run start` server: all seven storefront routes return 200, and a real headless-Chromium
browser check (Playwright, client-side navigation to preserve Redux state across the SPA) confirms
adding a real product to cart now renders it correctly — name, category, price, quantity, total, and
image — where it previously showed "Your cart is empty." `npm run type-check` and `npm run build`
both pass.

**Milestone 27b is done (2026-08-18).** `/categories` lists every top-level category as a card (via Milestone 22's
`getTopLevelCategories()`, already ordered by `displayOrder` then title) with its children as sub-link
chips, all targeting `/category/[slug]`. This route has no `notFound()` path — an empty catalog renders
an empty state, not a 404 — so `loading.tsx` is included here safely, unlike Milestone 27a's detail route.
This also closes the temporary gap Milestone 27a flagged: the breadcrumb's `/categories` link now resolves
(200, zero console errors), where it previously 404'd. Verified against a live `npm run start` server.

**Milestone 27a is done (2026-08-18).** `/category/[slug]` now exists: parent slugs roll up their own plus
every child's products, child slugs list only their own with a parent breadcrumb, pagination/canonical/
`rel=prev`/`next` all ship per spec, and `generateStaticParams` + `revalidate = 3600` deliver
static-by-default rendering. `CategoriesMarquee.jsx` and the product-page breadcrumb are now real links.
**`loading.tsx` was deliberately dropped** — a genuine, empirically confirmed Next.js 15 App Router
limitation: a `loading.tsx` file wraps the route in a `<Suspense>` boundary that flushes a 200 status
before `notFound()` can run, so unknown-slug and out-of-range-page requests would incorrectly return
200 instead of 404. Isolation testing ruled out `error.tsx`, `generateMetadata`, and the SSG/dynamic
choice as causes — only `loading.tsx`'s presence broke it. Since crawlers never see a loading skeleton
anyway (only real users on slow connections would), and correct 404 status codes are this milestone's
core search engine optimization purpose, correctness won; full details and the ruled-out alternatives are in
[MIGRATION_PLAN.md](./MIGRATION_PLAN.md)'s Milestone 27a entry. Verified against a live `npm run start`
server: parent/child rollup, a genuinely empty category (200 + empty state, tested via a temporary
debug route since no seeded category is naturally empty), unknown slug (404), out-of-range page (404),
and a simulated query failure (500 via `error.tsx`) all behave correctly.

**Milestone 27 is done (2026-08-18).** `CategoriesMarquee.jsx` gained `'use client'` and now fetches all
categories from Payload's public-read REST API in a `useEffect`, replacing the hardcoded
`assets/assets.js` array. REST rather than the Milestone 22 Local API utilities, because the marquee is
nested inside `Hero.jsx` — itself `'use client'`, whose own server-component conversion is Milestone 40's
job — and a client component can't call the Local API; this is the fallback path
`lib/payload/categories.ts` already documents. Items stay inert bare `<button>`s, unchanged from
today; Milestone 27a still owns turning them into links. Verified in a real headless-Chromium browser
(Playwright) against a live `npm run start` server: the marquee renders the three seeded categories
("Electronics & Gadgets", "Headphones", "Speakers") with zero console errors.

**Milestone 26 is done (2026-08-18).** Deleted the guarded store-attribution block Milestone 25 left in
`ProductDescription.jsx` (`{product.store && (...)}`), its now-unused imports, and its dead link to
the already-deleted `/shop/[username]` route. With that gone, the file had no remaining client state
(Milestone 25 already removed the Reviews tab), so it also dropped `'use client'` and now renders as a
server component. Verified against a live `npm run start` server: `/product/3` still renders
correctly and the response contains no "view store", "/shop/", or "Product by" text. `/product/[id]`'s
client JS dropped 123 kB → 120 kB First Load JS.

**Milestone 25 is done (2026-08-18).** `app/(public)/product/[productId]/page.jsx` is now an async server
component reading `getProductById()`, calling `notFound()` for an unknown ID instead of rendering
a blank page — matches Next's default not-found page. `force-dynamic`, same reasoning as Milestone 23.
**The star-rating user interface in `ProductDetails.jsx` and `ProductDescription.jsx` moved from Milestone 46 into
Milestone 25**, the same forced pull-forward `ProductCard.jsx` got at Milestone 23: both read `product.rating`,
which real products don't have, and would have thrown before rendering — Milestone 46 now has nothing left
to strip from either file. `ProductDescription.jsx`'s Reviews tab is removed outright, not just
guarded, since it existed only to render that missing field and Reviews are out of scope for v1
(Architecture Decision Record 016). Both files' image handling switched to resolving Media relationships' `.url`, mirroring
`ProductCard.jsx`'s Milestone 23 fix. The store-attribution block is guarded (`product.store &&`), not
deleted — real products have no `store` relationship so it renders nothing, but the actual deletion
and its dead `/shop/[username]` link stay Milestone 26's job as scoped. Verified against a live
`npm run start` server: `/product/3` renders the correct name, price, category, and image with no
"Reviews" text and no server errors; `/product/99999` returns a real HTTP 404. `/product/[productId]`
moved `○ Static` → `ƒ Dynamic`.

**Milestone 24 is done (2026-08-18).** `app/(public)/shop/page.jsx` is now an async server component reading
`getProducts()` from `lib/payload/products.ts`, matching Milestone 23's precedent under
[Architecture Decision Record 007](./DECISIONS.md)'s blanket search-engine-optimization-first/mobile-first mandate even though Milestone 24's literal text
doesn't spell out "server component" the way Milestone 23's does. The `?search=` filter is unchanged — still a
simple in-memory `.includes()` over the fetched list, exactly as it worked against the dummy Redux data
at the time — Milestone 29 (below) is the milestone that replaced it with a real Payload query. The "all products" back-link
changed from an `onClick`/`router.push` handler to a plain `<Link href="/shop">`, since nothing on the
page needs client-side interactivity anymore. Verified against a live `npm run start` server with seeded
data: real names render, `?search=Bluetooth` includes/excludes correctly, an unmatched search renders a
clean empty grid with no server errors. `/shop` moved `○ Static` → `ƒ Dynamic`.

**Milestone 23 is done (2026-08-17).** The home page is now a server component reading real Payload data:
`LatestProducts` by `-createdAt`, `BestSelling` from an admin-curated `isFeatured` flag added to
`Products` ([Architecture Decision Record 022](./DECISIONS.md#architecture-decision-record-022-best-selling-is-an-admin-curated-flag-not-a-computed-ranking) —
there is no sales or review data to rank by, and inventing a proxy metric would have been a fabricated
claim to customers). Two scope notes: **`components/ProductCard.jsx` moved from Milestone 46 into Milestone 23**,
because it called `product.rating.reduce()` on a field real products do not have and would have thrown
before rendering anything — Milestone 23 was impossible without it; and **`/` is now `force-dynamic`**, because
admin curation is pointless if toggling `isFeatured` needs a redeploy to show up, and because the
production build (Milestone 49) cannot assume a reachable database. `/` moved `○ Static` → `ƒ Dynamic`.

| Milestones | Group | Status |
|---|---|:---|
| Milestones 16, 17 and 19 | Clear `app/admin/**` — **runs before Milestone 3** | **Done** (2026-08-14) |
| Milestone 1 | Foundation: Dockerized PostgreSQL for local development | **Done** (2026-08-14) |
| Milestone 2 | Foundation: Payload v3, Postgres adapter, `sharp` dependencies | **Done** (2026-08-14) |
| Milestone 2a | Foundation: TypeScript toolchain | **Done** (2026-08-14) |
| Milestone 14 | Delete vendor dashboard (`app/store/**`) — **hard prerequisite of Milestone 3**, per [Architecture Decision Record 014](./DECISIONS.md) | **Done** (2026-08-16) |
| Milestones 3, 4 and 5 | Foundation: scaffold Payload, retire Prisma, dev Dockerfile | **Done** (2026-08-16) — Milestone 5's `docker build` could not be fully verified in the authoring sandbox (registry egress blocked); Dockerfile is implemented, needs a real-registry build check |
| Milestones 15 and 18 | Remove remaining multi-vendor routes | **Done** (2026-08-17) — leaves one dead link, already owned by Milestone 26 |
| Milestones 6 to 13, 13a | Payload collections: Users, Media, Categories, Products, Orders, Settings global | **Done** (2026-08-17) |
| Milestones 20 to 21 | Confirm admin-only auth end to end | **Done** (2026-08-17) — audit found no custom/fake auth anywhere; dead Login button removed |
| Milestones 22 to 28 (incl. Milestones 27a and 27b) | Storefront on real Payload data; category browsing routes; dummy data removed | **Done** (2026-08-18) |
| Milestone 29 | Real search | **Done** (2026-08-26) |
| Milestones 30 to 36 (incl. new Milestone 33a) | Cart persistence, guest checkout, real cash on delivery order creation | **Done** (2026-08-26 for Milestones 30 to 32; 2026-10-09 for Milestones 33, 33a, 34, 35 and 36) — real orders with server-side pricing/shipping/stock checks, confirmation page, rate-limited guest lookup; cart-state ([Architecture Decision Record 023](./DECISIONS.md)), guest-lookup ([Architecture Decision Record 024](./DECISIONS.md)), order-creation ([Architecture Decision Record 026](./DECISIONS.md)) and confirmation ([Architecture Decision Record 027](./DECISIONS.md)) decisions recorded |
| Milestones 37 to 39 | Admin order fulfillment | **Done** (2026-10-09) — `/admin` order list/search/status workflow tuned and verified; Milestone 39 was delivered inside Milestone 36 |
| Milestones 40 to 43 | Search engine optimization: server rendering, metadata, sitemap, structured data | **Done** (2026-10-10) — see CHANGELOG; Google Rich Results validation not run (no access) |
| Milestones 44 to 45 | Mobile-first audit and performance | **Done** (2026-10-10) — see CHANGELOG and Architecture Decision Record 030; Lighthouse gains are modest (the baseline was already 97–99 locally) |
| Milestone 45a | Premium storefront visual refresh (user interface only) | **Done** — merged in pull request #24 (`67a9102`), confirmed by the owner 2026-10-23; see CHANGELOG. Tokens superseded by Milestone 60 |
| Milestones 46 to 48 (incl. new Milestone 48a) | Reviews/Coupons: decide and land minimal v1 scope | **Done** (2026-10-09) — review modal and rating component, coupon input, Newsletter form, and the site-wide fake "20% OFF / NEW20" banner all removed |
| Milestone 49 | Production Dockerfile stage | **Done** (2026-10-10) — verified by building and running the image; see CHANGELOG and Architecture Decision Record 031 |
| Milestone 50 | Compose stacks (dev and prod) | **Done** (2026-10-10) — verified by running both stacks; see CHANGELOG. The prod stack cannot yet bootstrap an empty database (Milestone 52a) |
| Milestone 52a | Run Payload migrations as an explicit production deploy step | **Done** (2026-10-11) — closes `R9`; verified on real stacks, see CHANGELOG and Architecture Decision Record 032 (the new continuous integration `migrations` job has not yet run on a GitHub runner) |
| Milestone 52 | Production env/secrets validation and Cloudflare-only origin (Tunnel) | **Implemented, verification partial** (2026-10-11) — verified on real stacks, see CHANGELOG and Architecture Decision Record 033 — **not marked fully Done**: the real tunnel/Cloudflare header behaviour is unverified (owner-only: needs the real Cloudflare account and hostname). The first-admin guard is no longer open: Milestone 52b closed it (Architecture Decision Record 036). Status corrected by Milestone 74 (2026-10-24) |
| Milestone 52b | Turnstile verification, CGNAT-safe limits and the pre-launch security batch | **Implemented, verification partial** (2026-10-11) — Architecture Decision Record 035 amended by Architecture Decision Record 036: strict token policy, order idempotency, first admin from a secret, separate database roles, read-only containers, interim Next.js mitigations. Verified in the authoring sandbox against a real PostgreSQL and a **simulated** Cloudflare; **not** verified against real Cloudflare or the compose stack until continuous integration (`turnstile-contract`, `prod-stack`) and the owner's launch checks pass. Continuous integration is green on `9d9b2eb` (run 38167062006, all six jobs). Still owner-only: real keys on the real hostname and the WAF rule — see `docs/DEPLOYMENT.md`, "Launch blockers". The `next@15.4.11` upgrade blocker was closed by Milestone 52c; status corrected by Milestone 74 (2026-10-24) |
| Milestone 52c | Next.js 16 upgrade (framework advisories) | **Done** (2026-10-24, Milestone 74); implemented 2026-10-11, Architecture Decision Record 037 — `next@16.3.8`; `npm audit` critical 2 → 0, no `next` advisory; `undici` overridden to 7.29.1; ESLint CLI replaces `next lint`. Verified locally (build, routes, admin user interface, 15/15 end-to-end). Continuous integration green, all six jobs, on pull request #21 head `303f806` (run 38169357779) and on the merge to `main` (run 38172920361). The image optimizer stays off until the owner decides (Architecture Decision Records 034 and 036). Note: `npm audit` on 2026-10-24 reports new advisories against `next@16.3.8` (fix `16.4.3`); that is a new finding, not a defect in Milestone 52c's scope — see `docs/DEPLOYMENT.md`, "Launch blockers" |
| Milestone 51 | Real image optimisation for self-hosted deployment | **Done** (2026-10-11), then **suspended the same day by Architecture Decision Record 036**: the optimizer is switched off and `/_next/image` closed until Next.js is upgraded; see CHANGELOG and Architecture Decision Record 034 |
| Milestone 53 | Health checks | **Done** (2026-10-11), Architecture Decision Record 038 — `/api/health` checked against local PostgreSQL 16 (200 up, 503 down, recovers); the compose healthcheck and the app container reporting `healthy` are asserted by the continuous integration `prod-stack` job, green on pull request #23. An external uptime monitor, memory limits and `read_only` for `cloudflared`/`postgres` remain open |
| Milestone 54 | Backups (Postgres + media): `scripts/backup.sh`, `scripts/backup-verify.sh`, restore procedure | **Done** (2026-10-24, Milestone 74) for its stated scope: Continuous integration `prod-stack` on pull request #22 head `bec4670` (run 38175670202, job 114577417717, all six jobs green) printed `ok backup.sh: dump + media archive + checksums; backup-verify.sh restored the dump into a scratch database` and `ok full stop/start (volumes kept): database rows and uploaded media survive`. Still owner-only and tracked under `docs/DEPLOYMENT.md` "Launch blockers": a first real backup and restore drill on the real virtual private server, off-host copies, a schedule |
| Milestones 55, 55a and 56 | PKR currency, storefront copy, Pakistani address/phone validation | **Done** (2026-10-10) — see CHANGELOG and Architecture Decision Record 029 |
| Milestone 56a | Golden-path end-to-end test and continuous integration | **Done** (2026-10-10) — closes `R7`; see CHANGELOG |
| Milestone 57 | End-to-end regression pass | **In review** (2026-10-24) — Regression pass: narrative only locally; continuous integration end-to-end covers guest checkout and lookup. Merged to `main` via pull request #30 (`33a9a6c`); awaiting owner sign-off. No regression observed in the local walk and no code change made. The local walk ran on a freshly migrated and seeded PostgreSQL 16 (production build): browse, product, cart at 1440 and 390 px with no horizontal scroll; admin creates an order and moves it PLACED → CONFIRMED → PROCESSING → SHIPPED → DELIVERED; anonymous `GET /api/orders` 403. The guest order-placement and lookup legs need Cloudflare and are covered only by the continuous integration `e2e` job (Turnstile test keys); real-key checks remain a launch blocker |
| Milestone 58 | Update documentation to reflect the live architecture | **In review** (2026-10-24) - merged to `main` via pull request #32 (`762e69a`); awaiting owner sign-off. Docs only: `README.md` (status banner now says implemented and launch NOT cleared; Getting started checked against `package.json`, `docker-compose.yml`, `.env.example` and the `Dockerfile`; the Production section points to `docs/DEPLOYMENT.md`; "seven specialists"), `docs/ARCHITECTURE.md` (stale as-is section rewritten; collections and access table checked against `collections/*.ts` and `globals/Settings.ts`, including `PromoCards` and `Products.label`). `CLAUDE.md` not edited. Evidence: `grep -n "M1.*M28\|Until then a brand-new database\|eight roles" README.md` returns nothing; every `npm run` script named in the README exists in `package.json`. Not run: Docker (a clean-clone dev start was not executed here) |
| Milestone 59 | Production deploy runbook and release | **In review** (2026-10-24) - merged to `main` via pull request #32 (`762e69a`); awaiting owner sign-off; runbook written, NOT run on a clean virtual private server (owner-only); release tag not cut (owner) |
| Milestone 60 | Storefront redesign: design tokens and Plus Jakarta Sans (user interface only) | **Done** (2026-10-23) — merged to `main` via pull request #25; verified locally (lint, type-check, build, 13/15 end-to-end — the 2 Turnstile-dependent tests need Cloudflare, which this sandbox cannot reach). Further redesign milestones are added only after the owner approves each draft |
| Milestone 61 | Storefront redesign: shared components — header, product card, footer, tab bar (user interface only) | **Done** (2026-10-23) — merged to `main` via pull request #25; verified locally (lint, type-check, build, 13/15 end-to-end — the 2 Turnstile-dependent tests need Cloudflare, which this sandbox cannot reach) |
| Milestone 62 | Storefront redesign: home page, "Featured" section (user interface only) | **Done** (2026-10-23) — merged to `main` via pull request #25; verified locally (lint, type-check, build, 13/15 end-to-end — the 2 Turnstile-dependent tests need Cloudflare, which this sandbox cannot reach) |
| Milestone 63 | Storefront redesign: categories index and category listing (user interface only) | **Done** (2026-10-23) — merged to `main` via pull request #25; verified locally (lint, type-check, build, 13/15 end-to-end — the 2 Turnstile-dependent tests need Cloudflare, which this sandbox cannot reach; 404/404/200 statuses) |
| Milestone 64 | Storefront redesign: product detail page (user interface only) | **Done** (2026-10-24) — merged to `main` via pull request #25; verified locally (lint, type-check, build, 13/15 end-to-end — the 2 Turnstile-dependent tests need Cloudflare, which this sandbox cannot reach) |
| Milestone 65 | Storefront redesign: cart with checkout-styled summary (user interface only; checkout stays on `/cart`) | **Done** (2026-10-24) — merged to `main` via pull request #25; verified locally (lint, type-check, build, 13/15 end-to-end — the 2 Turnstile-dependent tests need Cloudflare, which this sandbox cannot reach) |
| Milestone 66 | Storefront redesign: confirmation, order lookup, shop page, legacy token removal (user interface only) | **Done** (2026-10-24) — merged to `main` via pull request #26; lint and type-check pass; batch build and end-to-end run before the pull request |
| Milestone 67 | Related in-stock products on the product page (no schema change) | **Done** (2026-10-24) — merged to `main` via pull request #26; lint and type-check pass; batch build and end-to-end run before the pull request |
| Milestone 68 | Category tabs on the home page's Featured section (no schema change) | **Done** (2026-10-24) — merged to `main` via pull request #26; lint and type-check pass; batch build and end-to-end run before the pull request |
| Milestone 69 | Automatic product labels from real fields (no schema change) | **Done** (2026-10-24) — merged to `main` via pull request #26; lint, type-check and the 6-case badge check pass; batch build and end-to-end run before the pull request |
| Milestone 72 | Self-host Plus Jakarta Sans with `next/font/local` (no build-time fetch from Google) | **Done** (2026-10-24) — merged to `main` via pull request #26; lint and type-check pass; batch build and end-to-end run before the pull request |
| Milestone 70 | Optional product `label` field (New / Limited edition / Sale) | **Done** (2026-10-24) — merged to `main` via pull request #28; migration `20261024_061017_product_label` applies on an empty database; drift check clean; lint and type-check pass. Owner must take a backup before deploying (Architecture Decision Record 032) |
| Milestone 71 | Admin-managed home promo cards (`promoCards` collection) | **Done** (2026-10-24) — merged to `main` via pull request #28; migration `20261024_061141_promo_cards`; verified locally: hidden when empty, inactive never public, anonymous write 403, link validator 8/8; lint, type-check, build pass. Owner must take a backup before deploying (Architecture Decision Record 032) |
| Milestone 73 | Promo card without an image: no empty circle (user interface only) | **In review (2026-10-24)** - merged to `main` via pull request #32 (`762e69a`); awaiting owner sign-off. circle rendered only when an image is set; `sm:pr-48` and `break-words` on the title with an image, `max-w-[28rem]` without; visible focus ring. Screenshots at 1440/1024/768/390/320 checked: no circle without an image, no title overlap at 768, no horizontal scroll at 320, equal heights in a row; lint, type-check pass |
| Milestone 74 | Close Milestones 52, 52b, 52c and 54 with continuous integration evidence (verification-only, docs only) | **In review** (2026-10-24) — merged to `main` via pull request #32 (`762e69a`); awaiting owner sign-off. Milestones 52c and 54 marked Done on cited continuous integration runs; Milestones 52 and 52b stay Implemented (owner-only real-tunnel and real-key checks) with their stale text corrected |
| Milestone 75 | Reject whitespace and control characters in promo links | **In review (2026-10-24)** - merged to `main` via pull request #32 (`762e69a`); awaiting owner sign-off. validator also rejects `/[\s\u0000-\u001f\u007f]/`; ad-hoc script: the 8 old cases unchanged, `/\t/x`, `/\n/x`, `/ x`, `/a b` and a DEL character now rejected, `/category/electronics` accepted; no `promo_cards.link` in the scratch database contains whitespace or control characters; `payload migrate:create --skip-empty` created nothing; lint, type-check pass. G6 (Security/Performance) pending |
| Milestone 76 | Storefront accessibility polish (Featured panel, tab bar contrast) | **In review (2026-10-24)** - merged to `main` via pull request #32 (`762e69a`); awaiting owner sign-off. Featured `<ul>` now sits inside `<div role="tabpanel" tabIndex={0}>` (only when a tablist exists). Verified ok, no change: `BestSelling.jsx` builds tabs only from top-level categories that have a featured product, so no empty panel; `text-muted` #5F5B73 on the white tab bar is 6.50:1 (>= 4.5), `MobileTabBar.tsx` unchanged; lint, type-check pass |
| Milestone 77 | Smaller self-hosted font file (optional) | **Deferred** (owner decision 2026-10-24; optional) |
| Milestone 78 | Declare `tsx` as a devDependency | **In review (2026-10-24)** - merged to `main` via pull request #32 (`762e69a`); awaiting owner sign-off. `tsx` 4.22.4 pinned exactly in `devDependencies`; the lockfile diff is one line (the root devDependencies entry), no version change; `npm ls tsx` shows 4.22.4 everywhere (deduped); `npm audit` 18 vulnerabilities before and after. Continuous integration `migrations` and `prod-stack` success on `main` push run 40093971126 (`6c0a22f`, all six jobs) |
| Milestone 79 | Close the Next.js advisories published after Milestone 52c (`next` 16.4.2, `undici` 7.30.1) | **Done** (2026-10-29) - owner sign-off 2026-10-29; merged to `main` via pull request #33 (into `stage2/close-out`, `5bf7615`) and pull request #34 (`a7918a7`). Evidence (recorded before the merge): `npm audit` 18 (1 low, 11 moderate, 4 high, 2 critical) -> 11 (1 low, 6 moderate, 3 high, 1 critical), no `next` or `undici` entry; lint 0 errors, type-check, build (Next.js 16.4.2 Turbopack), `test:env`, `test:turnstile`, `test:idempotency`, `test:users-guard` pass; 4 migrations apply and `migrate:create --skip-empty` creates nothing; production server routes and `/_next/image` 404 checked; Playwright 13 passed, 2 failed (the two Turnstile tests that need Cloudflare; they run in continuous integration). Architecture Decision Record 040 Accepted 2026-10-24 (owner confirmed 16.4.2); `npm audit` on the release commit and the deploy remain owner steps (`docs/DEPLOYMENT.md`, "Launch blockers") |
| Milestone 80 | Make the deploy step prove that migrations were applied (verify right after `payload migrate`) | **In review** (2026-10-24) - merged to `main` via pull request #35 (`6c0a22f`); awaiting owner sign-off. Verifier runs right after `payload migrate` and fails with "schema is incomplete" on an empty database; new continuous integration step; local flows verified. Continuous integration green on the pull request #35 head `cee6756` (run 40093734346) and on the `main` push (run 40093971126), all six jobs each. Root cause of the pull request #32 no-op (run 40084395694, attempt 1) still unverified |
| Milestone 81 | Documentation sync after pull requests #32, #34 and #35 (docs only, no behaviour change) | **In review** (2026-10-24) - merged to `main` via pull request #36 (`4fb0e06`, 2026-10-24); the four files named in `docs/MIGRATION_PLAN.md` Milestone 81; awaiting owner sign-off |
| Milestone 90 | Idempotent local-only demo catalogue seed for client preview (`npm run seed:demo`; no schema, dependency or production change) | **In review** (2026-10-26) - merged to `main` via pull request #37 (`a4b7db9`, 2026-10-26); awaiting owner sign-off. Dependencies Milestones 13, 13a, 33 and 70 are Done; Milestones 52 and 52b statuses are unchanged (see CHANGELOG for the contract correction). Verified in the sandbox on a throwaway PostgreSQL 16 (not via `docker compose exec`: no Docker daemon there) |
| Milestone 91 | Home "Deals of the day" (optional `dealEndsAt`, real countdown) and browser-only wishlist, from the redesign canvas (Architecture Decision Record 041; one additive migration) | **Done** (2026-10-29) - merged to `main` via pull request #38; owner sign-off 2026-10-29. Verified on PostgreSQL 16: migration applies, type-check clean, lint 0 errors, continuous integration green on the pull request head. Owner must take a backup before deploying (Architecture Decision Record 032). |
| Milestone 92 | Category sort and price/discount filters, and cart "Undo" for a removed line, from the redesign audit (Architecture Decision Record 042; no schema change) | **Done** (2026-10-29) - merged to `main` via pull request #39; owner sign-off 2026-10-29. Continuous integration green on the pull request head. |
| Milestone 93 | Logo mark with two-tone store name, and a left-to-right scrolling announcement bar (user interface only) | **Done** (2026-10-29) - merged to `main` via pull request #40; owner sign-off 2026-10-29. Continuous integration green on the pull request head. |
| Milestone 94 | Dev compose shares `./media` with the host instead of a separate `app-media` volume (dev only; prod unchanged) | **Done** (2026-10-29) - merged to `main` via pull request #41; owner sign-off 2026-10-29. Not run with Docker in the sandbox (no daemon); owner to confirm on their machine. |
| Milestone 95 | Admin re-skin in the storefront's look and an Overview home from real data (Architecture Decision Record 043; Payload keeps `/admin`; no schema change) | **Done** (2026-10-29) - merged to `main` via pull request #41; owner sign-off 2026-10-29. Verified locally in Chromium on PostgreSQL 16; continuous integration green on the pull request head. |
| Milestone 96 | Orders list: status pills, `Rs.` amounts, inline status dropdown and Paid toggle (Architecture Decision Record 044; Payload keeps the list; no schema change) | **Done** (2026-10-29) - pull request #43; owner sign-off 2026-10-29. Verified locally in Chromium on PostgreSQL 16 (status and paid persist after reload); continuous integration green on the pull request head. |
| Milestone 97 | Dependency audit follow-up: `dompurify` override 3.4.17 (closes the critical), `fast-uri` 3.1.9; Payload/lexical advisories accepted pending a Payload release (Architecture Decision Record 045; no code change) | **Done** (2026-10-29) - pull request #44; owner asked for full verification then merge, 2026-10-29. `npm audit --omit=dev` 18 (5 low, 6 moderate, 6 high, 1 critical) -> 15 (4 low, 5 moderate, 6 high, 0 critical); `npm ci`, type-check, lint, `test:category-filters` and production build pass. Re-verified before merge: all unit tests, lint, type-check, production build, and a browser pass of the storefront and every admin screen, with the inline-edit failure path and signed-out access checked. |
| Milestone 98 | Design review pass: store 404 page, aligned header/footer width, card price alignment, dimmed sold-out cards, product page de-duplication, `/shop` breadcrumb, count and empty search, category icon fixes, two-column mobile footer, admin Products `Rs.` and stock pills, local admin avatar (user interface only) | **Done** (2026-10-29) - pull request #45; owner asked for the review and approved the milestone, then asked to mark it Done and merge, 2026-10-29. Lint, type-check, `test:category-filters`, production build and a 320px overflow check pass locally; all six continuous integration jobs (checks, end-to-end, image, migrations, prod-stack, turnstile-contract) green. |
| Milestone 99 | Launch hardening: close the five `docs/DEPLOYMENT.md` launch blockers with recorded evidence or written owner acceptance (mostly owner-run on the real virtual private server and Cloudflare) | **In progress** (2026-10-29) - blocker 1: `npm audit --omit=dev` on `main` shows 0 critical (15: 4 low, 5 moderate, 6 high, all accepted in Architecture Decision Record 045), recorded in `docs/DEPLOYMENT.md`; release-commit re-audit and deploy are owner steps. (a) `scripts/backup-cron.sh` written and tested locally and in continuous integration `prod-stack`; its first cron run on the virtual private server is pending. (d) owner decided 2026-10-29: launch without order email. Owner approved with (a) a scheduled backup job and (d) the order-email decision included; (b) memory limits / `read_only` and (c) Actions pinned by SHA left out. See `docs/MIGRATION_PLAN.md` Milestone 99 |
| Milestone 100 | Free non-commercial test deployment: Vercel Hobby + Neon Free + Vercel Blob (Architecture Decision Record 046; test environment only, not production) | **Done, deployed to test** (2026-10-30; status corrected 2026-11-03 from evidence): Vercel project `gocart-test` (production deployments `dpl_5nCz…` 2026-10-30 and `dpl_254K…` at `a6aedc1`, both READY), Neon `gocart-test` (Postgres 17, all 8 committed migrations applied, restricted `gocart_app` role present), Blob store `gocart-test-media` connected; live checks recorded with Milestones 101 and 102. Checkout off by design (no Turnstile keys). See `docs/DEPLOYMENT_VERCEL_TEST.md`, "Verified state" |
| Milestone 101 | Mirza brand migration and the 10-issue storefront user experience pass (Architecture Decision Record 047; one column-default migration; no new dependency) | **Done** (2026-11-01) - merged (pull request #53), deployed to `gocart-test`, migration `20261031_160131_mirza_store_name` applied on Neon, live second review at six widths passed (`docs/MIRZA_UX_REVIEW.md`, section 4) |
| Milestone 102 | Flat categories (no sub-categories), Smart Watches merged into Watches (10 categories), no desktop "Shop by category", circle category shortcuts on phones (Architecture Decision Record 048; one migration; no new dependency) | **Done** (2026-11-01) - merged (pull request #54), deployed to `gocart-test`, migration `20261101_205147_flat_categories` applied on Neon (10 categories, 24 of 24 products with a category); backup branch `backup-before-m101-m102-2026-11-01` kept on Neon |
| Milestone 103 | Media audit of the demo seeds and image surfaces (read-only; [assets/MEDIA_AUDIT.md](./assets/MEDIA_AUDIT.md); real-database measurements unverified and skipped by the owner) | **Done** (2026-11-01), owner accepted |
| Milestone 104 | Demo photo brief, sourcing and licence verification ([assets/PHOTO_BRIEF.md](./assets/PHOTO_BRIEF.md), [assets/PHOTO_INVENTORY.md](./assets/PHOTO_INVENTORY.md), [assets/MANIFEST.csv](./assets/MANIFEST.csv)) | **Done** (2026-11-02): all 61 slots sourced from Unsplash (licence, author and checksums recorded); first pass 2026-11-01 filled 53, the last 4 products were sourced after the owner accepted visible brands in demo photos; Pexels not usable (Cloudflare challenge / API blocked, not bypassed) |
| Milestone 105 | Local image-processing pipeline: archive, WebP, budgets, metadata strip, validation (existing `sharp`; Architecture Decision Record 049 Proposed) | **Done** (2026-11-02): `npm run process:demo-images`, `npm run test:demo-images`; 61 images, 80.7 MB of sources to 2.6 MB; no new dependency |
| Milestone 106 | Local integration of demo photos into the demo seed and local database | **Done locally** (2026-11-02): seed uses the processed photos byte for byte; verified on a throwaway local PostgreSQL; nothing uploaded or deployed; no generated art remains in the demo seed |
| Milestone 107 | Storefront image-surface quality assurance and fixes ([assets/STOREFRONT_QA_M107.md](./assets/STOREFRONT_QA_M107.md)) | **Done, deployed to test** (2026-11-03): accepted the same day under the owner's delegation, pull request #58 merged; deployed to `gocart-test` with `main` at `9183777` on 2026-11-03 at the owner's request and checked live (`og:image` on home/shop/category/product pages, category banner photo, product image alt; DEPLOYMENT_VERCEL_TEST.md "Verified state"). Original quality assurance: 200 page views (40 routes x 5 widths) with no broken image, sideways scroll or missing alt; fixed the category banner photo, share images for home/shop/categories/category pages, the product main-image alt, and continuous integration wiring for `test:demo-images` and `test:seo`. The two Turnstile-dependent end-to-end specs cannot run in this sandbox (no route to Cloudflare); continuous integration covers them |
| Milestone 108 | Test-site rollout of demo photos (test environment only, never production) | **Done, deployed to test** (2026-11-05). Run through the hand-started workflow `M108 test-site photo rollout`, each run approved by the owner: dry run [42019925812](https://github.com/CodeWithHamzaa/gocart/actions/runs/42019925812), apply [42020705613](https://github.com/CodeWithHamzaa/gocart/actions/runs/42020705613), rerun dry run [42021938362](https://github.com/CodeWithHamzaa/gocart/actions/runs/42021938362). Dry run 58 to upload / 34 to relink / 0 created (reviewed independently by Security and quality assurance); apply 58 uploaded, 34 relinked, 0 created; rerun 58 already on the site, 0 to upload, 34 already correct. Verified after apply (Neon read-only SQL, Vercel connector): 58 new media rows (ids 66-123, nothing deleted, 63 old rows kept; 121 total); all 24 products have both images on new media (48/48); all 10 categories have their image on new media; `payload_migrations` unchanged (8); Blob store 63 -> 121 objects, 726,320 -> 3,429,002 bytes; `/`, `/shop`, `/categories`, `/category/headphones`, `/product/3`, `/cart` return 200 on `gocart-test-inky.vercel.app` and their image srcs are the new files; three new `/api/media/file/` URLs return 200 `image/webp` with the database byte size. `docs/assets/MANIFEST.csv` now records `media_id` and `media_env=test` for the 58 media rows (the other 3 rows, the OG image and two promos, are not media-collection items); its 58 id/size pairs equal Neon's. Owner still to do: delete the three `gocart-test` environment secrets. Milestone 109 and production not touched. Details: `docs/DEPLOYMENT_VERCEL_TEST.md`, "Demo photo rollout" |
| Milestone 109 | Pre-launch demo cleanup and original-catalogue import | **ON HOLD** (owner, 2026-11-03): nothing built or run until the owner gives the client's go-ahead |
| Milestone 110 | Admin-editable storefront content (bar messages, banner slides, section wording, footer), sliding announcement bar, Featured grid of 12 | **Done, deployed to test** (2026-11-05). Owner request; Architecture Decision Record 050; pull request 66. Migration applied to the test Neon (batch 3) and `main` at `12d9454` deployed as `dpl_67jEB5hJ…`; live pages, `/admin/login`, `/api/health` and the new `heroSlides` API answer 200 (logged-in admin screens not checked). Built and verified locally first. Adds a `storefrontContent` global, a `heroSlides` collection and one additive migration (apply to the test Neon before deploying). Unit test, build, migrations-from-empty and a browser check on a throwaway database pass. Owner's go needed for the test deploy and migration |
| Milestone 111 | Listing card hierarchy (photo first, two-line name, price row with a round add button), 2/3/4 product grids, header category row limited to four | **Done and merged** (2026-11-05). Owner request; scope confirmed by the owner. No schema, data or dependency change. Type-check, lint, build, a 320-1280px browser check and the mobile and search engine optimization end-to-end pass locally. Part of the test-site deployment of 2026-11-11 (`main` at `e1e9e5a`, checked with git) |
| Milestone 112 | Demo photography visual upgrade: unbranded speaker, whole-bag leather backpack, same-shoot second gallery photos for Pulse watch and Foaming Face Wash, chrono reframed, pipeline fixes ([assets/PHOTO_INVENTORY.md](./assets/PHOTO_INVENTORY.md), 2026-11-10 update) | **Done, deployed to test** (2026-11-11), owner request; pull requests 73 and 74. Rolled out to the test site through the Milestone 108 workflow (dry run 42932936456, apply 42933845361: 13 uploaded, 9 relinked, 0 created) and checked live (`DEPLOYMENT_VERCEL_TEST.md`, "Demo photo rollout, visual upgrade"). The two home promo cards were relinked to product photos by hand on 2026-11-11 and card 1's link was repointed from a pre-existing 404 (`/category/electronics`) to `/category/headphones` (checked live). No schema, dependency, checkout or application-code change; the full quality assurance cycle was not repeated, only a visual check of the changed pages at 1440 and 390 px against a throwaway database |
| Milestone 113 | Mirza brand identity kit and ecommerce showcase: brand book PDF, editable PPTX, 26 PNG boards (brand, desktop, mobile, responsive) from real test-site screenshots, in `docs/brand-kit/` | **Done, in review** (2026-11-11), owner request. Docs and dev tooling only: no application code, schema, dependency or deployment change. Screenshots show the current storefront, including the current product card (`0257271`); the footer contact details are redacted. Integrity checks only (no app quality assurance, per the owner) |
| Milestone 114 | Admin sign-in by username and password (email no longer signs in; email kept optional); first admin from `ADMIN_BOOTSTRAP_USERNAME`; one migration backfilling existing admins | **Done, deployed to test** (2026-11-11), owner request; Architecture Decision Record 051; pull request #79 (took over #70). Migration applied to the test Neon before merge (backup branch `backup-before-m114-2026-11-11`), then `main` at `e1e9e5a` deployed as `dpl_4JCozo4v…`; live: username/password login form, email sign-in refused, pages 200 (a successful sign-in is for the owner to confirm). Launch blocker 6 (per-IP rate limit on admin sign-in) added for production |
| Milestone 115 | Design foundation: shared palette file (`app/tokens.css`), role tokens, shared `Button` and `Price` (no visible colour change) | **Done, in review** (2026-11-12). Phase 1a of the premium storefront redesign; owner authorized Phase 1 on 2026-11-12. Not deployed. |
| Milestone 116 | Palette decision record: Architecture Decision Record 052 hybrid palette (warm ivory surfaces, `#5F42EC` for actions, aubergine dark surface, no champagne); amends Architecture Decision Record 047 item 4 and records `bc5a77a` | **Done, in review** (2026-11-12). Owner decision 2026-11-12. Docs only. |
| Milestone 117 | Hybrid palette values (Architecture Decision Record 052): warm ivory surfaces, aubergine footer, violet saved-heart and wishlist badge; the admin's brand colours read the shared palette | **Done, in review** (2026-11-12). Not deployed. Before/after captures in `docs/redesign/phase1/`. |
| Milestone 118 | Homepage: editorial hero (one photo, display headline), "Shop by category" round category photos at every size, beside an intro column on desktop (owner's reference), "Limited-time deals" with an end date, cash-on-delivery band removed (owner), all categories in the footer | **Done, in review** (2026-11-12). Phase 2; not deployed. Captures in `docs/redesign/phase2/`. |
| Milestone 119 | Shop, category, search and product pages: one page header, a sort on the shop, category links under an empty search, the price in the phone's bottom bar, photo swipe, two product columns from 768px, a related-products fallback | **Done, in review** (2026-11-13). Phase 3; not deployed. Captures in `docs/redesign/phase3/`. |
| Milestone 120 | Cart, address form, order confirmation and order lookup: one remove control per cart line, a reason line beside Place order while no address is chosen, a labelled address form with email and area optional, a larger order number with a plain instruction, hints on the lookup form | **Done, in review** (2026-11-13). Phase 4; not deployed; no order logic, Turnstile or schema change. Captures in `docs/redesign/phase4/`. |
| Milestone 121 | Final quality assurance and documentation: accessibility pass over every page at three widths, the 2px focus ring restored on three fields, cart product links no shorter than 24px, a final screenshot set and report, and Milestone 111's status corrected | **Done and merged** (2026-11-13, pull request #84). Phase 5; not deployed. Report in `docs/redesign/PHASE5_FINAL_REPORT.md`. |
| Milestone 122 | The Mirza Cart brand (Architecture Decision Record 053): the name with a migration, clean neutral palette, shopping-cart logo and icons, a redesigned header search field, the category row under the header removed, a one-message-at-a-time announcement ticker, and "Track order" moved into the header | **Done, in review** (2026-11-13). Not deployed; the migration must be applied to the test database before the code. Brand kit not yet regenerated. |

---

## Gates

### Milestone 1 gate — **CLEARED** (Milestones 1, 2, 2a, 16, 17 and 19 complete)

The six pre-Milestone 1 corrections from the readiness audit are applied. Foundation work has begun:
Milestones 1 and 2, and Milestone 2a are **Done**, and Milestones 16, 17 and 19 have cleared `app/admin/**`.

### Milestone 3 gate — **CLEARED** (Milestones 14, 3, 4 and 5 complete)

Milestone 14 landed first, clearing the multiple-root-layouts precondition per [Architecture Decision Record 014](./DECISIONS.md#architecture-decision-record-014-milestone-14-is-a-hard-prerequisite-of-milestone-3-not-an-order-independent-milestone). Milestone 3 then mounted Payload, Milestone 4 retired the unwired Prisma schema, and Milestone 5 added the dev Dockerfile. `/admin` was live at this point with Payload's collection-less admin shell — since superseded by Milestones 6 to 13, 13a (see above), which is now a real, collection-backed panel.

### Milestone 6 gate — **CLEARED** (2026-08-16), collection design **complete** (2026-08-17)

All six decisions are made and recorded as Architecture Decision Records, and Milestones 6 to 13, 13a are now **Done** — see
"Implementation status by milestone" above.

- [x] **Resolved**: Reviews are out of scope for v1 → [Architecture Decision Record 016](./DECISIONS.md#architecture-decision-record-016-reviews-are-out-of-scope-for-v1). Milestone 46 executes the removal path.
- [x] **Resolved**: Coupons are out of scope for v1 → [Architecture Decision Record 017](./DECISIONS.md#architecture-decision-record-017-coupons-are-out-of-scope-for-v1). Milestone 47 executes the removal path.
- [x] **Resolved**: Shipping/delivery model → [Architecture Decision Record 018](./DECISIONS.md#architecture-decision-record-018-shipping-model--flat-rate-with-a-free-shipping-threshold-snapshotted-per-order): flat rate + free-shipping threshold, both admin-configurable via a new Settings global (Milestone 13a), snapshotted onto each order at creation.
- [x] **Resolved**: Order status set → [Architecture Decision Record 019](./DECISIONS.md#architecture-decision-record-019-order-status-set-includes-confirmed-cancelled-and-returned): adds `CONFIRMED`, `CANCELLED`, and `RETURNED` to the enum.
- [x] **Resolved**: Media storage backend → [Architecture Decision Record 020](./DECISIONS.md#architecture-decision-record-020-media-storage-backend-is-a-local-docker-volume-for-v1-with-cloudflare-r2-as-the-designated-successor): local Docker volume for v1, Cloudflare R2 named as the designated successor.
- [x] **Resolved**: `Orders` shape for guests → [Architecture Decision Record 021](./DECISIONS.md#architecture-decision-record-021-guest-orders-use-embedded-address-fields-not-a-customers-collection): embedded address fields, no `Customers` collection. (Tracked as `D11`/blocking-M11 in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md) rather than the Milestone 6-gate list below it — recorded here too since both sources treat it as a precondition for the Milestones 6 to 13 group.)
- [x] **Resolved**: `Categories` hierarchy and category-browsing scope → [Architecture Decision Record 013](./DECISIONS.md#architecture-decision-record-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy), Accepted 2026-08-16. Milestone 9's field list, the two-level `parent` self-relation (superseded by [Architecture Decision Record 048](./DECISIONS.md), flat categories, 2026-11-01), and `Products.category` cardinality (Milestone 10) are settled; spec in [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md)

### Later, non-blocking

- [x] PKR formatting convention — **resolved 2026-10-10**: `Rs. 1,500`, comma grouping, no decimals ([Architecture Decision Record 029](./DECISIONS.md)); implemented by Milestone 55.
- [ ] Order notifications: WhatsApp/email — **no milestone exists yet**. SMS is deferred to a future phase, per [Architecture Decision Record 015](./DECISIONS.md#architecture-decision-record-015-initial-production-infrastructure-baseline); Resend (email infra) is decided, but which order-lifecycle emails are sent is still unspecified.
- [x] ~~Guest order-lookup key and abuse controls (reconciles Milestone 13 access rules with Milestone 36)~~ — **Resolved 2026-08-18** → [Architecture Decision Record 024](./DECISIONS.md#architecture-decision-record-024-guest-order-lookup-via-a-dedicated-ordernumber-phone-endpoint--orders-collection-access-stays-admin-only). Left listed here in error after the Architecture Decision Record landed; caught during Milestone 30's dry run. Implementation is still Milestone 36's job.
- [x] ~~Cart state mechanism: Redux vs. simpler client-side store~~ — **Resolved 2026-08-18** → [Architecture Decision Record 023](./DECISIONS.md#architecture-decision-record-023-cart-state-stays-redux-with-localstorage-persistence-added): Redux stays, `localStorage` persistence added. Left listed here in error after the Architecture Decision Record landed; caught during Milestone 30's dry run. **Implemented 2026-08-26** as Milestone 30 itself.
- [x] ~~**Mobile navbar has no cart link or navigation**~~ — **Resolved 2026-08-17**, pulled forward from
  Milestone 44. `components/Navbar.jsx` gained a mobile row (`flex sm:hidden`): a Shop link, a search toggle,
  and a cart link with the count badge — the same badge the desktop nav already had. Verified `Rs.`/
  cart markup render server-side under `npm run build && npm run start`.
- [x] ~~**"Best selling" has no defined ranking**~~ — **Resolved 2026-08-17** at Milestone 23 → [Architecture Decision Record 022](./DECISIONS.md#architecture-decision-record-022-best-selling-is-an-admin-curated-flag-not-a-computed-ranking): admin-curated `isFeatured` flag on `Products`, not a computed metric. A sales-derived ranking remains possible later (it would need an `Orders` aggregation no milestone owns yet, and would render empty at launch regardless).
- [ ] **Switch `lib/payload/*.ts` to the generated `payload-types.ts`** (found during Milestone 22; blocker cleared 2026-08-26). `payload generate:types` **now works** — the failure was `package.json` missing `"type": "module"`, not a sandbox bug, and the Payload CLI as a whole was affected. Generated output confirms the hand-written mirrors in `lib/payload/products.ts` and `lib/payload/categories.ts` are accurate, so nothing is broken today; switching them over remains open and is not owned by a milestone. Note that generating the file also surfaces real type errors that were previously invisible — one such error in `scripts/seed.ts` was fixed at the same time. Not launch-blocking, but worth doing before the type surface grows much further.
- [ ] Unscheduled gaps tracked in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md): test framework + continuous integration, Newsletter disposition, storefront copy pass, production `payload migrate` step
  - *(the category listing route is no longer among these — scheduled as Milestones 27a and 27b, closing finding `C8`; the store Settings global is no longer among these either — scheduled as Milestone 13a, per [Architecture Decision Record 018](./DECISIONS.md#architecture-decision-record-018-shipping-model--flat-rate-with-a-free-shipping-threshold-snapshotted-per-order))*
