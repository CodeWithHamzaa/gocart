# Repository Analysis — GoCart (as inherited)

Read-only analysis of the codebase as it exists today, prepared to inform the single-store Payload CMS v3 + PostgreSQL rebuild described in [PROJECT_SPEC.md](./PROJECT_SPEC.md), [ARCHITECTURE.md](./ARCHITECTURE.md), and [DECISIONS.md](./DECISIONS.md). No code was changed to produce this document. Every claim below was verified by reading the actual file, not inferred from naming alone, except where explicitly noted.

## Executive summary

This is a **frontend-only UI prototype**, not a working ecommerce backend, despite looking feature-complete at a glance:

- **No route in this repo ever reads or writes a real database or external API.** Every "fetch" function (`fetchStores`, `fetchProducts`, `fetchDashboardData`, `fetchOrders`, `fetchProduct`, …) just assigns a hardcoded `*DummyData` object from `assets/assets.js` into `useState`.
- **Every write/mutation handler is an empty stub.** `handleApprove`, `toggleIsActive`, `handleAddCoupon`, `deleteCoupon`, `onSubmitHandler` (add product), `toggleStock`, `updateOrderStatus`, the store-registration submit handler, and "Place Order" (`OrderSummary.jsx`) all either do nothing or just `router.push()` to another page. No order, product, coupon, or store is ever actually created, changed, or deleted.
- **There is no authentication, and the admin/vendor "auth checks" are hardcoded to pass.** `components/admin/AdminLayout.jsx` sets `isAdmin` to `true` unconditionally; `components/store/StoreLayout.jsx` sets `isSeller` to `true` unconditionally. `/admin` and `/store` are wide open to anyone today.
- **The Prisma/PostgreSQL schema (`prisma/schema.prisma`) is a design artifact, not a live integration.** `@prisma/client` and `prisma` are not in `package.json`; nothing in the app imports a Prisma client.
- **Neither Stripe nor Sanity is actually integrated.** Stripe appears only as a UI radio button label and a schema enum value — no Stripe SDK, API key, or checkout call exists anywhere. Sanity does not appear anywhere in the repo.
- **There are no API routes and no Server Actions.** `app/api/` does not exist; no file anywhere contains a `'use server'` directive.
- This confirms and extends what [ARCHITECTURE.md](./ARCHITECTURE.md) already noted: the target platform (Payload CMS v3, PostgreSQL, guest COD checkout, admin-only auth) is being built essentially from scratch behind this UI shell, not by wiring up an existing backend.

## Folder structure

```
gocart/
├── app/                          Next.js App Router
│   ├── layout.jsx                 Root layout — the ONLY server component in the app tree
│   ├── globals.css
│   ├── favicon.ico
│   ├── StoreProvider.js           Redux <Provider> wrapper ('use client')
│   ├── (public)/                  Storefront route group
│   │   ├── layout.jsx              Banner + Navbar + Footer shell
│   │   ├── page.jsx                 Home page
│   │   ├── shop/page.jsx            All-products listing (+ search)
│   │   ├── shop/[username]/page.jsx Per-vendor storefront (multi-vendor concept)
│   │   ├── product/[productId]/page.jsx  Product detail
│   │   ├── cart/page.jsx            Cart
│   │   ├── orders/page.jsx          "My Orders" (no real identity — see below)
│   │   ├── create-store/page.jsx    Vendor signup form
│   │   ├── pricing/page.jsx         Empty stub ("Plus" membership pricing)
│   │   └── loading/page.jsx         Standalone redirect-with-spinner utility route
│   ├── admin/                     Hand-built platform admin (no auth gate — see below)
│   │   ├── layout.jsx, page.jsx     Dashboard
│   │   ├── stores/page.jsx          Vendor list / activate-deactivate
│   │   ├── approve/page.jsx         Vendor approval queue
│   │   └── coupons/page.jsx         Coupon CRUD (create/list; delete is a stub)
│   └── store/                     Hand-built vendor dashboard (no auth gate — see below)
│       ├── layout.jsx, page.jsx     Dashboard
│       ├── add-product/page.jsx     Add product form (submit is a stub)
│       ├── manage-product/page.jsx  Product list, stock toggle (stub)
│       └── orders/page.jsx          Vendor order list + status dropdown (stub)
├── components/                   Presentational + feature components (see table below)
│   ├── admin/                     Admin shell (Navbar, Sidebar, Layout, StoreInfo)
│   └── store/                     Vendor shell (Navbar, Sidebar, Layout)
├── lib/                          Redux Toolkit client state
│   ├── store.js                   configureStore wiring 4 reducers
│   └── features/{cart,product,address,rating}/*Slice.js
├── assets/                       Static images + `assets.js` (ALL dummy/mock data lives here)
├── prisma/
│   └── schema.prisma             PostgreSQL schema — designed, not wired to any client
├── docs/                         Project documentation (this file's home)
├── prompts/                      Reusable AI prompt templates (empty)
├── .env.example                  One variable: NEXT_PUBLIC_CURRENCY_SYMBOL
├── next.config.mjs               images.unoptimized: true (Vercel-shortcut default)
├── jsconfig.json                 `@/*` path alias
├── postcss.config.mjs            Tailwind v4 plugin registration
├── package.json / package-lock.json
├── README.md, CLAUDE.md          Rewritten for the transformation project
└── CODE_OF_CONDUCT.md, CONTRIBUTING.md, LICENSE.md   Inherited from upstream GoCart
```

No `app/api/` directory exists. No test directory or test runner config exists. No Docker files exist. No CI config (`.github/workflows`) exists.

## Tech stack

| Layer | What's actually used | Notes |
|---|---|---|
| Framework | Next.js 15.3.5, App Router, React 19.2.1 | `next dev --turbopack` for dev |
| Styling | Tailwind CSS 4 (`@tailwindcss/postcss`) | Utility classes throughout; no component library (shadcn/MUI/etc.) |
| Icons | `lucide-react` | |
| Charts | `recharts` (via `OrdersAreaChart.jsx`, admin dashboard only) | |
| Toasts | `react-hot-toast` | Used to wrap every stub async handler in `toast.promise(...)`, which is why every action *looks* like it's doing something |
| Dates | `date-fns` (`format` in `admin/coupons`) | |
| Client state | Redux Toolkit + `react-redux` | See State Management below |
| Data layer (designed, unused) | Prisma schema targeting PostgreSQL | No `@prisma/client`/`prisma` dependency; no client import anywhere |
| Auth | **None** | No Clerk, NextAuth, or any auth package in `package.json`; confirmed via `grep` across `app/` and `components/` |
| CMS | **None** | No Payload, Sanity, Contentful, or any CMS dependency |
| Payments | **None** | No Stripe SDK or any payment SDK in `package.json` |
| Images | `next/image`, but `images.unoptimized: true` in `next.config.mjs` | Disables Next's image optimization pipeline — a Vercel-remote-image shortcut, not appropriate for a self-hosted Docker deployment |

## Data flow (as it actually works today)

There is no real data flow beyond the browser. Concretely:

1. `lib/features/product/productSlice.js` seeds Redux with `productDummyData` from `assets/assets.js` **at store creation time** — before any component even mounts.
2. Pages that "fetch" data (`admin/page.jsx`, `store/page.jsx`, `admin/approve/page.jsx`, `admin/stores/page.jsx`, `admin/coupons/page.jsx`, `store/manage-product/page.jsx`, `store/orders/page.jsx`, `(public)/orders/page.jsx`, `(public)/shop/[username]/page.jsx`) call a local `async` function that does `setState(dummyData)` with a hardcoded import from `assets/assets.js` — there is no `fetch()`, no API route, no server action, no external call of any kind.
3. Cart (`Counter.jsx`, `ProductDetails.jsx`, `cart/page.jsx`) reads/writes Redux `cart` slice in memory only. **There is no persistence** — no `localStorage`, no `redux-persist`, no cookie. A page refresh empties the cart. Under the target guest-checkout model (no accounts to fall back on), this is a functional gap, not just a nice-to-have.
4. "Place Order" (`OrderSummary.jsx`) does not create an order anywhere — it just calls `router.push('/orders')`, and `/orders` then loads `orderDummyData`, unrelated to whatever was in the cart. The "orders" a user sees are never their own orders.
5. `Address`, `Rating`, `Coupon`, `Store` data all follow the same pattern: seeded from `assets/assets.js`, mutated only in local component/Redux state, never sent anywhere.

## Rendering strategy

- **Almost the entire app is client-rendered.** `'use client'` appears at the top of 41 files across `app/` and `components/` (verified via grep). The **only** server component in the tree is the root `app/layout.jsx`.
- Even route-group layouts that don't need interactivity are marked `'use client'` unnecessarily — e.g. `app/(public)/layout.jsx` is just `<Banner /><Navbar />{children}<Footer />`, and `app/(public)/page.jsx` is just a static composition of section components; neither touches state, hooks, or browser APIs directly, but both opt out of server rendering because a client-only descendant pulled the whole subtree into the client boundary (or the `'use client'` directive was added by convention rather than necessity).
- No page defines `generateMetadata` — the only metadata in the app is the single static `export const metadata` object in the root layout (title/description are the same on every page: "GoCart. - Shop smarter").
- No `sitemap.xml`, `robots.txt`, or structured data (JSON-LD) exists anywhere.
- **This directly contradicts the SEO-first requirement.** Product and category pages — the pages that actually need to rank and be crawlable/shareable — are 100% client-rendered with no per-page metadata today.

## State management

- **Redux Toolkit** (`@reduxjs/toolkit` + `react-redux`) is the only state layer. `lib/store.js` combines four reducers:
  - `cart` — `cartItems: {}` (productId → quantity), `total`. In-memory only, no persistence, no relation to a real order.
  - `product` — seeded entirely from `productDummyData`; never updated from a real source.
  - `address` — seeded with one `addressDummyData` entry; `addAddress` just pushes to the in-memory array (`AddressModal`'s submit handler doesn't even call it — it just closes the modal).
  - `rating` — starts empty; `addRating` action exists but `RatingModal`'s submit handler never dispatches it, just closes the modal.
- The store is created fresh per app load via `useRef` in `app/StoreProvider.js` (correct pattern for Next.js SSR + Redux), but since nothing is fetched from a real backend, "fresh" and "reset to dummy data" are the same thing.
- No React Context, Zustand, Jotai, or server-state library (React Query/SWR) is used anywhere.

## Stripe usage

**Not integrated.** Confirmed by full-repo case-insensitive search — Stripe appears in exactly two places, both cosmetic:
1. `prisma/schema.prisma` — `STRIPE` is one of two values in the `PaymentMethod` enum (schema design intent only, unused since Prisma isn't wired up).
2. `components/OrderSummary.jsx` — a second payment-method radio button labeled "Stripe Payment" that sets local state (`setPaymentMethod('STRIPE')`); nothing reads that state to call Stripe or any payment API. No `stripe`/`@stripe/*` package in `package.json`.

Per [ADR-004](./DECISIONS.md), this radio option should not exist in the COD-only v1 checkout UI.

## Sanity usage

**None found anywhere** — no Sanity package, config, schema, or reference in the codebase.

## API routes

**None exist.** `app/api/` is not present (`Glob app/api/**/*` returned no files). All "backend" behavior is simulated client-side with dummy data, as described above.

## Server Actions

**None exist.** No file in the repository contains a `'use server'` directive (verified via search across `app/`). All form submissions (`AddressModal`, `RatingModal`, `create-store`, `store/add-product`, `admin/coupons`) are plain client-side `async` handlers wrapped in `toast.promise(...)` that do nothing.

## Environment variables

| Variable | Declared in `.env.example`? | Actually used? | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_CURRENCY_SYMBOL` | Yes (`'$'`) | Yes — read in 9 files (`app/store/page.jsx`, `app/store/manage-product/page.jsx`, `app/admin/page.jsx`, `app/(public)/cart/page.jsx`, `Hero.jsx`, `OrderSummary.jsx`, `OrderItem.jsx`, `ProductCard.jsx`, `ProductDetails.jsx`) | Every usage falls back to `'$'` if unset. Needs to become PKR-aware per [PROJECT_SPEC.md](./PROJECT_SPEC.md) open question. |
| `DATABASE_URL`, `DIRECT_URL` | **No** | Referenced only inside `prisma/schema.prisma` via `env(...)` | Never set anywhere, consistent with Prisma never actually being wired up. Will need to be added (or replaced with Payload's own DB connection variable) in Phase 1. |

`.gitignore` already excludes `.env` and, notably, `/app/generated/prisma` — a leftover from an abandoned attempt to generate the Prisma client into a custom output path, further evidence the Prisma integration was started but never finished.

No Payload, auth, or payment-gateway environment variables exist yet — expected, since none of those integrations exist yet either.

## Dependencies

**Runtime (`dependencies`):**

| Package | Purpose | Fate under target architecture |
|---|---|---|
| `next` 15.3.5 | Framework | Keep, upgrade as needed for Payload v3 compatibility |
| `react` / `react-dom` 19.2.1 | UI | Keep |
| `react-redux` 9.2.0 | Redux bindings | Keep if client cart state stays Redux-based (see [ARCHITECTURE.md](./ARCHITECTURE.md) open question) |
| `@reduxjs/toolkit` 2.8.2 | Redux store/slices | Same as above — likely trimmed to cart-only |
| `react-hot-toast` 2.5.2 | Toast notifications | Keep |
| `recharts` 3.1.2 | Admin dashboard chart | Only needed if a custom admin analytics view is built; not needed if Payload's built-in admin fully replaces the custom dashboard |
| `date-fns` 4.1.0 | Date formatting | Keep |
| `lucide-react` 0.525.0 | Icons | Keep |

**Dev (`devDependencies`):** `@tailwindcss/postcss`, `tailwindcss` — both keep.

**Conspicuously absent** given the target architecture: `payload`, `@payloadcms/db-postgres`, `@payloadcms/next`, `prisma`/`@prisma/client` (present only as an un-added schema file), any Stripe/payment SDK, any auth package, `sharp` (commonly required by both Payload and Next.js image optimization once `images.unoptimized` is removed). None of these should be installed as part of this analysis — flagged for Phase 1 of [TASKS.md](./TASKS.md).

## Technical debt

Ranked roughly by severity/impact:

1. **`/admin` and `/store` have no real access control today.** `AdminLayout.jsx` and `StoreLayout.jsx` hardcode `isAdmin`/`isSeller` to `true`. If this app were deployed as-is, both dashboards would be public. This must not be carried forward — Payload's built-in auth (per [ADR-006](./DECISIONS.md)) replaces this entirely rather than patching it.
2. **No real backend exists behind a UI that looks complete.** Every list, dashboard, and form is wired to `assets/assets.js` dummy data and stub handlers wrapped in `toast.promise`, which makes actions *feel* like they succeeded (a toast fires) while nothing happens. This is the single biggest gap between "looks production-ready" and "is production-ready."
3. **Cart has no persistence.** In-memory-only Redux state means a page refresh silently empties the cart, with no account to recover it from — a real problem for a guest-checkout-only site.
4. **"Place Order" doesn't place an order.** It navigates to `/orders`, which shows unrelated dummy orders. There is currently no way to trace a cart to an order anywhere in the code.
5. **The Prisma/PostgreSQL schema was started and abandoned.** `schema.prisma` models the full multi-vendor domain but has no client dependency, no generated client, and nothing importing it. It's a reference artifact, not working code (see [ADR-003](./DECISIONS.md)).
6. **Almost the entire app opts out of server rendering** (`'use client'` on 41/~50 files, including layouts and pages with no actual interactivity), with no per-page metadata, sitemap, robots.txt, or structured data — directly at odds with the SEO-first requirement.
7. **Multi-vendor scope is baked deep into the UI**, not just the data model: vendor signup (`create-store`), vendor approval (`admin/approve`), vendor activation (`admin/stores`), a per-vendor storefront route (`shop/[username]`), and "Product by {store.name}" attribution on every product page. All of this is now explicitly out of scope per [ADR-006](./DECISIONS.md) and needs removal, not adaptation.
8. **Currency is hardcoded to `$`** across 9 files via one env var with a literal `'$'` fallback baked into the code itself, rather than a formatting utility — will need a small but repo-wide sweep for PKR.
9. **`next.config.mjs` uses `images.unoptimized: true`**, a Vercel-shortcut default that disables Next.js's image optimization — wrong default for a self-hosted, Dockerized, production deployment.
10. **No tests, no CI, no Docker, no linting beyond Next's default `next lint` script** (and even that has no committed ESLint config file visible in this listing). Production-readiness work (Phase 7 in [TASKS.md](./TASKS.md)) starts from zero here, not from hardening existing infra.
11. **Dead/orphaned routes**: `pricing/page.jsx` is an empty stub tied to a "Plus membership" concept that's never explained elsewhere; `loading/page.jsx` is a standalone page (not the Next.js `loading.jsx` convention) that exists only to redirect after an 8-second delay for the vendor-approval flow being removed.
12. **Coupon logic references account-based targeting** (`forNewUser`, `forMember`) that has no meaning once guest checkout (no accounts) is the only flow — needs redesign, not direct reuse, per the open question already flagged in [PROJECT_SPEC.md](./PROJECT_SPEC.md).

## File/folder classification

Legend: **KEEP** (carry forward largely as-is) · **MODIFY** (keep the file but change its contents/behavior) · **DELETE** (remove — functionality is out of scope) · **REPLACE** (the *capability* is kept but this specific implementation is superseded by a different mechanism, e.g. Payload's built-in admin).

### Root

| Path | Classification | Why |
|---|---|---|
| `package.json` / `package-lock.json` | MODIFY | Add Payload v3 + Postgres adapter deps; remove/never-add Prisma; re-evaluate Redux deps once cart-state design is finalized (Phase 1–2, not this task) |
| `next.config.mjs` | MODIFY | Remove `images.unoptimized: true` for self-hosted production; add Payload's Next.js integration config when Phase 1 starts |
| `jsconfig.json` | KEEP | `@/*` alias is fine and framework-agnostic |
| `postcss.config.mjs` | KEEP | Tailwind v4 setup is fine |
| `.env.example` | MODIFY | Add `DATABASE_URL`, Payload secret/config vars; revisit currency variable for PKR |
| `.gitignore` | MODIFY | Remove the now-irrelevant `/app/generated/prisma` line once Prisma is formally retired; add Payload/Docker build artifacts when those land |
| `README.md`, `CLAUDE.md`, `docs/*`, `prompts/*` | KEEP | Already rewritten for this transformation |
| `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `LICENSE.md` | KEEP | Inherited governance docs, still applicable |
| `prisma/schema.prisma` (and `prisma/` dir) | REPLACE | Never wired to a client; superseded by Payload collection definitions per [ADR-003](./DECISIONS.md). Useful only as a reference for field/relationship intent during collection design |

### `app/` — storefront (`(public)/`)

| Path | Classification | Why |
|---|---|---|
| `app/layout.jsx` | MODIFY | Only real server component today; needs richer metadata, will host any Payload-in-Next mount point |
| `app/StoreProvider.js` | MODIFY | Keep if client cart state stays Redux-based; trim scope to match whatever slices survive |
| `app/globals.css`, `app/favicon.ico` | KEEP | No functional issue |
| `(public)/layout.jsx` | MODIFY | Unnecessarily marked `'use client'`; convert to a server component wrapping client children for SEO |
| `(public)/page.jsx` | MODIFY | Convert to server-renderable; replace dummy-data-backed child components with real data |
| `(public)/shop/page.jsx` | MODIFY | Keep the search/filter UX, replace Redux dummy product list with real Payload data (ideally server-rendered) |
| `(public)/shop/[username]/page.jsx` | DELETE | Per-vendor storefront — multi-vendor concept, out of scope per [ADR-006](./DECISIONS.md) |
| `(public)/product/[productId]/page.jsx` | MODIFY | Fetch real product from Payload; add `generateMetadata`/JSON-LD for SEO |
| `(public)/cart/page.jsx` | MODIFY | Keep UI structure; fix persistence gap; wire to real checkout |
| `(public)/orders/page.jsx` | MODIFY | Replace dummy data; redesign for guest order lookup (no account/login to key off of) |
| `(public)/create-store/page.jsx` | DELETE | Vendor registration — out of scope |
| `(public)/pricing/page.jsx` | DELETE | Empty stub tied to vendor "Plus membership" concept that's out of scope |
| `(public)/loading/page.jsx` | DELETE | Exists only to support the vendor-approval redirect flow being removed |

### `app/admin/` and `app/store/`

| Path | Classification | Why |
|---|---|---|
| `admin/layout.jsx`, `admin/page.jsx` | REPLACE | Custom dashboard has no real auth (`isAdmin` hardcoded true) and no real data; superseded by Payload's built-in `/admin` panel, which provides authenticated CRUD out of the box |
| `admin/stores/page.jsx`, `admin/approve/page.jsx` | DELETE | Vendor activation/approval — out of scope entirely, not just unauthenticated |
| `admin/coupons/page.jsx` | REPLACE | Coupon CRUD belongs in Payload's admin UI as a `Coupons` collection (if retained — see open question in [PROJECT_SPEC.md](./PROJECT_SPEC.md)), not a hand-rolled page |
| `store/**` (entire directory: `layout.jsx`, `page.jsx`, `add-product/`, `manage-product/`, `orders/`) | DELETE | Vendor dashboard — out of scope per [ADR-006](./DECISIONS.md); also has the same hardcoded-`true` auth bypass (`isSeller`) |

### `components/` — storefront-facing

| Path | Classification | Why |
|---|---|---|
| `AddressModal.jsx` | MODIFY | Submit handler doesn't persist anything today; needs real guest-checkout address capture (and Pakistani address field conventions) |
| `Banner.jsx` | KEEP | Self-contained promo banner, no backend dependency, works as-is |
| `BestSelling.jsx`, `LatestProducts.jsx`, `CategoriesMarquee.jsx` | MODIFY | Structurally fine; currently render Redux's dummy `product.list` — repoint to real Payload data |
| `Counter.jsx` | KEEP | Pure cart quantity control; fine once cart persistence is fixed at the slice level |
| `Footer.jsx` | MODIFY | Remove "Become Plus Member" and "Create Your Store" links (vendor/membership concepts, out of scope); update contact info to real business details |
| `Hero.jsx` | MODIFY | Structurally fine; has a hardcoded example price ("$4.90") and imports `CategoriesMarquee` — update copy/currency |
| `Loading.jsx` | KEEP | Generic spinner |
| `Navbar.jsx` | MODIFY | "Login" button is non-functional (no handler) and shouldn't exist for guest-only customers per [ADR-005](./DECISIONS.md) — remove or repurpose |
| `Newsletter.jsx` | MODIFY | Form has no submit handler at all today — either wire to a real subscribe mechanism or drop |
| `OrderItem.jsx` | MODIFY | Adjust to whatever the real guest-order shape ends up being from Payload |
| `OrderSummary.jsx` | MODIFY | Remove the Stripe radio option (COD-only per [ADR-004](./DECISIONS.md)); "Place Order" needs to actually create an order; coupon-code handler is currently an empty stub |
| `OurSpec.jsx` | KEEP | Static trust-badges section, no backend dependency |
| `PageTitle.jsx`, `Title.jsx` | KEEP | Generic, reusable, no backend dependency |
| `ProductCard.jsx` | MODIFY | Fine structurally; currency formatting needs PKR |
| `ProductDescription.jsx` | MODIFY | "Product by {store.name}" attribution and store-link are multi-vendor artifacts to remove; reviews tab logic can stay pending the ratings-under-guest-checkout decision |
| `ProductDetails.jsx` | MODIFY | Fine structurally; currency/PKR, and trust copy ("Free shipping worldwide") should reflect real Pakistan shipping policy once defined |
| `Rating.jsx` | KEEP | Pure presentational star display |
| `RatingModal.jsx` | MODIFY | Submit handler never persists a rating today; needs a real backend call and an identity model that works without accounts |
| `admin/AdminLayout.jsx`, `admin/AdminNavbar.jsx`, `admin/AdminSidebar.jsx`, `admin/StoreInfo.jsx` | REPLACE | Entire custom admin shell, including its fake auth gate, is superseded by Payload's built-in admin UI |
| `store/StoreLayout.jsx`, `store/StoreNavbar.jsx`, `store/StoreSidebar.jsx` | DELETE | Vendor dashboard shell — out of scope, also has the same fake auth gate |
| `OrdersAreaChart.jsx` | DELETE | Only consumer is the custom admin dashboard being replaced by Payload's admin UI; revisit only if a custom analytics view is scoped later |

### `lib/` — Redux state

| Path | Classification | Why |
|---|---|---|
| `lib/store.js` | MODIFY | Keep store setup; trim reducer list to match whichever slices survive below |
| `lib/features/cart/cartSlice.js` | MODIFY | Logic is sound but needs persistence (e.g. `localStorage`) since guest checkout has no account to fall back on |
| `lib/features/product/productSlice.js` | REPLACE | Currently exists only to hold dummy data; product data should come from Payload's API (server-fetched where possible), not a Redux slice pre-seeded with fake products |
| `lib/features/address/addressSlice.js` | MODIFY | Currently seeded with dummy data and effectively unused by the (stubbed) address form; redesign for guest per-order address capture |
| `lib/features/rating/ratingSlice.js` | DELETE | Ratings should be fetched from/written to Payload directly; this slice is never actually populated by the (stubbed) rating form today |

### `assets/`

| Path | Classification | Why |
|---|---|---|
| `assets/assets.js` | DELETE | The single source of every piece of fake data in the app (`productDummyData`, `orderDummyData`, `dummyAdminDashboardData`, `dummyStoreDashboardData`, `storesDummyData`, `couponDummyData`, `dummyRatingsData`, `dummyStoreData`, etc.) — must not ship; real data comes from Payload |
| `assets/*.svg`, `gs_logo.jpg`, `upload_area.svg` | KEEP | Generic UI assets (upload placeholder icon, etc.), no dummy-data coupling |
| `assets/product_img*.png`, `hero_*`, `happy_store.webp`, `profile_pic*.jpg` | DELETE | Placeholder/stock imagery tied to the dummy dataset and the (now out-of-scope) multi-vendor demo store; real product photography replaces these |

## Summary counts

| Classification | Approx. file/folder count | Dominant reason |
|---|---|---|
| KEEP | ~15 | Generic, presentational, or already-correct config with no dummy-data or multi-vendor coupling |
| MODIFY | ~20 | Right shape, wrong data source (dummy → real) or missing PKR/COD/guest-checkout details |
| DELETE | ~20 | Multi-vendor feature surface, or artifacts (dummy data, orphaned routes) with no place in the target product |
| REPLACE | ~8 | Custom-built admin/vendor shells (with a live auth bypass) superseded by Payload CMS v3's built-in admin panel |

This analysis is a snapshot as of 2026-08-07 on branch `migration/payload-cod`. No application code was modified to produce it.
