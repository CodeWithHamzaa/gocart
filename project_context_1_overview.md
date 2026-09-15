# GoCart Pakistan — Project Context, Part 1 of 3: Overview & Structure

> **This is part 1 of a 3-part project dump.** Upload all three for full context.
>
> | Part | Contents |
> |---|---|
> | **1 — Overview & Structure** *(this file)* | Orientation brief (what the project is, its current state, constraints, known issues) + full directory tree |
> | **2 — Documentation** | All 37 Markdown documents: spec, architecture, 25 ADRs, the 68-milestone roadmap, status, changelog, readiness reports, AI-team process docs |
> | **3 — Source Code** | All 65 code and config files |
>
> **Read Part 1 first** — it states the project's actual current state and flags three places
> where the checked-in documentation contradicts the code.

---

These three files contain everything needed to understand this project: an orientation
brief, the full directory tree, all project documentation, and all source code.

**Generated:** 2026-09-15 · **Branch:** `claude/gocart-ai-team-setup-b9el6y`

---

## 0. Orientation — read this first

### 0.1 What this project is

**GoCart** started life as an open-source **multi-vendor marketplace** storefront
(GreatStack's Next.js demo). It is being transformed into a **production-ready,
single-store, Cash-on-Delivery ecommerce platform for the Pakistani market**, backed by
**Payload CMS v3** and **PostgreSQL**.

The transformation is not a rewrite. The Next.js storefront UI is inherited and kept; what
changes is everything behind it — the data layer (dummy JS arrays → Payload/Postgres), the
business model (multi-vendor → single store), the auth model (fake vendor/admin bypasses →
Payload admin-only), and the deployment story (none → Docker).

**Stack:** Next.js 15.3.9 (App Router) · React 19 · Tailwind CSS 4 · Payload CMS v3.88.0
(embedded, not a separate service) · PostgreSQL 17 · Redux Toolkit (cart/address only) ·
TypeScript 5.9 (incremental — new files only) · Docker.

### 0.2 The single most important thing to know

**Work is tracked as numbered milestones, and milestone IDs are the only unit of work.**

- `docs/MIGRATION_PLAN.md` defines **68 milestones** (`M1`–`M59`, plus `M2a`, `M13a`,
  `M27a`, `M27b`, `M33a`, `M48a`, `M52a`, `M55a`, `M56a`). This is the authoritative roadmap.
- Group/phase names ("Foundation & tooling", "Payload data model") are **labels for
  reporting only**. They carry no execution order. "Start Phase 2" is not actionable;
  "start `M33`" is.
- **Execution order comes from each milestone's `Dependencies` line, not from ascending
  ID.** Notably `M14`, `M16`, `M17`, `M19` all ran *before* `M3` (see ADR-014).
- `CLAUDE.md` is the project constitution. `docs/DECISIONS.md` holds **25 ADRs**; accepted
  ADRs are closed and must not be silently reopened.

### 0.3 Current state: 36 of 68 milestones done · `M33` is next

**Done (36):**

| Milestones | What landed |
|---|---|
| `M1`, `M2`, `M2a`, `M3`, `M4`, `M5` | Dockerized Postgres, Payload deps, TypeScript toolchain, Payload mounted in Next.js, Prisma retired, dev Dockerfile |
| `M6`–`M13`, `M13a` | Full Payload data model: `Users`, `Media`, `Categories`, `Products`, `Orders` + `Settings` global; access control; dev seed script |
| `M14`–`M19` | Entire multi-vendor surface deleted (vendor dashboard, vendor signup, per-vendor storefront, hand-built admin, coupon stub, orphan routes) |
| `M20`–`M21` | Admin-only auth confirmed end to end; dead "Login" button removed |
| `M22`–`M28` (incl. `M27a`, `M27b`) | Every storefront route on real Payload data; `/category/[slug]` and `/categories` built; all dummy data deleted |
| `M29` | Real database-backed product search (`ILIKE` on `name`) |
| `M30`, `M31`, `M32` | Cart persists across reloads (localStorage); real Pakistani guest-address capture; Stripe option removed from checkout UI |

**Next up — `M33`: create a real Payload order when "Place Order" is clicked.** Today that
button just calls `router.push('/orders')`. This is the single biggest functional gap: the
storefront can browse, search, and build a cart, but **no order has ever been written to the
database from the customer-facing UI.**

**Remaining (32), in dependency order:**

| Milestones | Theme |
|---|---|
| `M33`, `M33a`, `M34`, `M35`, `M36` | Real order creation, stock enforcement at checkout, shipping/total rules, order confirmation, guest order lookup |
| `M37`–`M39` | Admin order fulfillment via Payload |
| `M40`–`M43` | SEO: server components, per-page metadata, sitemap/robots, JSON-LD |
| `M44`, `M45` | Mobile-first audit and performance pass |
| `M46`, `M47`, `M48`, `M48a` | Remove review UI, coupon input, dead ends, non-functional newsletter |
| `M49`–`M54` (incl. `M52a`) | Production Docker, image optimization, secrets, migrations as a deploy step, health checks, backups |
| `M55`, `M55a`, `M56`, `M56a` | PKR formatting, storefront copy correctness, PK address/phone validation, golden-path E2E + CI |
| `M57`–`M59` | Regression pass, documentation, production deploy and release tag |

### 0.4 Hard constraints — do not violate these

These are settled decisions, not open questions. Each traces to an accepted ADR.

1. **Cash on Delivery only.** No other payment gateway ships. The architecture must stay
   extensible for online payments later (`Orders.paymentMethod` is an enum with one value).
   — ADR-004
2. **Guest checkout is mandatory.** Account creation must never be required to order. — ADR-005
3. **Admin-only authentication.** Payload's `/admin` is the *only* authenticated surface.
   No customer login, no vendor login. — ADR-006
4. **Single store. No vendors, no sellers.** Closed since 2026-08-07. Any vendor code found
   is legacy to delete, not a requirement. — ADR-006
5. **PostgreSQL only, through Payload's data layer.** No second ORM or database. — ADR-002
6. **Payload runs embedded inside the Next.js app**, not as a separate service. Payload owns
   `/admin`. — ADR-009
7. **SEO-first and mobile-first are defaults**, not a final polish pass. — ADR-007
8. **Everything runs in Docker**, dev and prod. — ADR-008
9. **No AI dependency in the shipped product.** The `.claude/` AI engineering team is
   build-time tooling only; deleting that directory must leave a fully working application.
10. **Production baseline is decided:** Cloudflare Free + one ~$10–12/month VPS running the
    Dockerized app and PostgreSQL + Resend free tier + COD. — ADR-015

### 0.5 Architecture in one diagram

```
Customer (guest, never logs in) ─┐
                                 ├──▶  Next.js 15 App Router  ──┐
Admin (Payload login) ───────────┘      • (public) storefront    │
                                        • (payload) admin + API  │
                                                                 │ Local API (server components)
                                                                 │ REST /api/* (client components)
                                                                 ▼
                                                    Payload CMS v3 (embedded)
                                                    Users · Media · Categories
                                                    Products · Orders · Settings
                                                                 │
                                                                 ▼  @payloadcms/db-postgres
                                                           PostgreSQL 17
```

**Two data-access paths, and the rule that separates them:**
- **Server components** use `lib/payload/products.ts` / `lib/payload/categories.ts` →
  Payload's **Local API**, in-process, no HTTP hop.
- **Client components** (`'use client'`) *cannot* use the Local API. They call Payload's
  public-read **REST API** directly — `CategoriesMarquee.jsx` and `app/(public)/cart/page.jsx`
  both do this, and it is the sanctioned pattern, documented in `lib/payload/categories.ts`.

**Route map:** `/` · `/shop` (+ `?search=`) · `/product/[productId]` · `/category/[slug]` ·
`/categories` · `/cart` · `/orders` · `/admin` (Payload).

**Data model shape worth knowing:**
- `Categories` has a `parent` self-relation limited to **exactly two levels**, with stable
  unique slugs. URLs are **flat** (`/category/phone-cases`, never nested), so re-parenting a
  category never breaks a live URL.
- `Products.category` is `hasMany: false` — one product, one most-specific category. Parent
  category pages **roll up** their children's products rather than requiring double-filing.
- `Orders` embeds guest name/phone/address/city/area directly (no `Customers` collection,
  ADR-021) and carries line items as an array with a **unit price snapshot**, so later price
  edits never re-price historical orders.
- `"Best Selling"` is an **admin-curated `isFeatured` checkbox**, not a computed ranking —
  there is no sales data and no review data to rank by (ADR-022, ADR-016).

### 0.6 ⚠️ Known documentation drift — trust these sources in this order

The docs are unusually detailed, but a few places have fallen behind the code. **When
sources disagree, `docs/TASKS.md` + `docs/CHANGELOG.md` + the actual source code win.**

1. **`CLAUDE.md` is stale.** It states that `M1`–`M28` are done, that `M29` is next, and that
   "Search on `/shop` is still an in-memory `.includes()` filter until `M29`." All three are
   outdated: `M29`–`M32` shipped on 2026-08-26, and search *is* a real Payload
   `contains`/`ILIKE` query today (see `lib/payload/products.ts` and ADR-025).
2. **`docs/MIGRATION_PLAN.md`'s header says "63 milestones."** There are **68** section
   headings. The count was never updated after `M33a`, `M48a`, `M52a`, `M55a`, and `M56a`
   were inserted on 2026-08-18.
3. **`docs/ARCHITECTURE.md`'s "As-is" section describes the *original* inherited codebase**
   (Prisma, multi-vendor routes, no auth). That is deliberate historical context, not a
   description of the repo today. Read its "Target architecture" section for the real design.

### 0.7 Known issues, gaps, and open questions

**Verification gaps (these matter most):**

| Gap | Status |
|---|---|
| **No test framework at all** | No Jest/Vitest/Playwright config exists. Verification to date is manual + scripted headless-Chromium sessions. `M56a` would add the first automated test and a CI job — Not Started. Tracked as `R7`. |
| **`npm run lint` is broken** | No ESLint config exists; `next lint` drops into an interactive setup prompt and hangs. Unowned by any milestone. |
| **Docker is unverified** | `docker build` has never completed — the sandbox's egress policy returns 403 for Docker Hub. Postgres verification used a native install. So **"everything runs in Docker" is unproven** despite being a hard constraint. `M5`'s Dockerfile is written but unbuilt. |

**Functional gaps:**

- **`/orders` is 100% dummy data**, hardcoded inline in the page file. This is deliberate —
  there is no account system to key a real order list off of. `M36` (guest order lookup by
  `orderNumber` + phone, per ADR-024) replaces it.
- **"Place Order" creates nothing.** `OrderSummary.jsx`'s handler just navigates. `M33`.
- **No stock enforcement at checkout.** `Products.inStock` has existed since `M10` but
  nothing validates it at order creation — trivially bypassed by a direct API call. `M33a`
  was inserted specifically to close this (`R5`).
- `components/Rating.jsx` and `components/RatingModal.jsx` still exist but are now
  **completely unreferenced** — leftovers for `M46` to delete (Reviews are out of scope, ADR-016).
- `addressDummyData` in `lib/features/address/addressSlice.js` still uses the pre-`M31`
  US-address shape (`street`/`state`/`zip`/`country`), so it renders in the checkout dropdown
  as `"John Doe, , , New York"` — blank fields, not broken. Known, unowned.
- `lib/payload/*.ts` use **hand-written types** that mirror the collections. `payload
  generate:types` now works (unblocked 2026-08-26) and confirms they're accurate, but
  switching them over to the generated `payload-types.ts` is still open and unowned.

**A genuine framework limitation worth not re-discovering:**

`/category/[slug]` deliberately has **no `loading.tsx`**. Adding one makes `notFound()`
return **HTTP 200 instead of 404** — `loading.tsx` wraps the segment in a `<Suspense>`
boundary whose shell flushes a 200 status line before the awaited page component can call
`notFound()`. This was confirmed by isolation testing, ruling out `error.tsx`,
`generateMetadata`, and the SSG-vs-dynamic choice. Correct status codes beat a loading
skeleton for an SEO-critical route. `/categories` has no `notFound()` path, so it keeps its
`loading.tsx` safely.

**Still-open decisions:**

| ID | Question | Blocks |
|---|---|---|
| `D7` | PKR formatting convention (`Rs. 1,500` vs `₨1,500`). The **symbol** is fixed as `Rs. `; comma grouping and decimals are not. | `M55` |
| `D8` | Which order-lifecycle emails actually send, and whether WhatsApp is used. Email infra (Resend) is decided; SMS is deferred. **No milestone owns this.** | Unscheduled |
| `R10` | A public base URL env var is still missing (needed for canonical URLs / sitemap). | `M42`, `M52` |
| `C5` | "No blog" is never stated anywhere — unstated scope in a CMS build. | — |

### 0.8 How the work gets done — the `.claude/` AI engineering team

`.claude/` defines a **development-time** AI engineering team: an Engineering Manager
orchestrating seven specialists (Product, Architecture, UI/UX, Full-Stack, QA,
Security/Performance, DevOps/Release), with **human approval required before anything merges
or deploys**. Commands: `/milestone <id>`, `/milestone-dryrun <id>`, `/team-status`,
`/write-adr`, `/escalate`.

**This is build-time tooling only.** Production GoCart must never depend on Claude, Anthropic
APIs, MCP, or `.claude/` — deleting that directory must leave a fully working application.

### 0.9 Suggested reading order

1. `CLAUDE.md` — the constitution (but see the drift note in §0.6)
2. `docs/PROJECT_SPEC.md` — goals, scope, roles, core flows
3. `docs/ARCHITECTURE.md` — target architecture
4. `docs/DECISIONS.md` — the 25 ADRs; the "why" behind every constraint
5. `docs/MIGRATION_PLAN.md` — the 68 milestones, the authoritative roadmap
6. `docs/TASKS.md` + `docs/CHANGELOG.md` — **the true current state**
7. `docs/PHASE_1_READINESS_REPORT.md` — the contradiction/decision/risk register (`C`/`D`/`R` findings)
8. Source code — Part 3

---

## 1. Directory Structure

```
gocart/
├── .claude/
│   ├── agents/
│   │   ├── devops-release-engineer.md
│   │   ├── engineering-manager.md
│   │   ├── fullstack-engineer.md
│   │   ├── product-manager.md
│   │   ├── qa-engineer.md
│   │   ├── security-performance-engineer.md
│   │   ├── software-architect.md
│   │   └── uiux-designer.md
│   ├── commands/
│   │   ├── escalate.md
│   │   ├── milestone-dryrun.md
│   │   ├── milestone.md
│   │   ├── team-status.md
│   │   └── write-adr.md
│   ├── docs/
│   │   ├── CONVENTIONS.md
│   │   ├── EXECUTION_POLICY.md
│   │   ├── GATES.md
│   │   ├── NO_PRODUCTION_AI.md
│   │   ├── PARALLELISM.md
│   │   ├── ROLES.md
│   │   └── WORKFLOW.md
│   ├── README.md
│   └── settings.json
├── app/
│   ├── (payload)/
│   │   ├── admin/
│   │   │   ├── [[...segments]]/
│   │   │   │   └── page.tsx
│   │   │   └── importMap.js
│   │   ├── api/
│   │   │   ├── [...slug]/
│   │   │   │   └── route.ts
│   │   │   ├── graphql/
│   │   │   │   └── route.ts
│   │   │   └── graphql-playground/
│   │   │       └── route.ts
│   │   └── layout.tsx
│   ├── (public)/
│   │   ├── cart/
│   │   │   └── page.jsx
│   │   ├── categories/
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── category/
│   │   │   └── [slug]/
│   │   │       ├── error.tsx
│   │   │       ├── not-found.tsx
│   │   │       └── page.tsx
│   │   ├── orders/
│   │   │   └── page.jsx
│   │   ├── product/
│   │   │   └── [productId]/
│   │   │       └── page.jsx
│   │   ├── shop/
│   │   │   └── page.jsx
│   │   ├── layout.jsx
│   │   └── page.jsx
│   ├── favicon.ico  (not inlined)
│   ├── globals.css
│   └── StoreProvider.js
├── collections/
│   ├── Categories.ts
│   ├── Media.ts
│   ├── Orders.ts
│   ├── Products.ts
│   └── Users.ts
├── components/
│   ├── AddressModal.jsx
│   ├── Banner.jsx
│   ├── BestSelling.jsx
│   ├── CategoriesMarquee.jsx
│   ├── Counter.jsx
│   ├── Footer.jsx
│   ├── Hero.jsx
│   ├── LatestProducts.jsx
│   ├── Loading.jsx
│   ├── Navbar.jsx
│   ├── Newsletter.jsx
│   ├── OrderItem.jsx
│   ├── OrderSummary.jsx
│   ├── OurSpec.jsx
│   ├── PageTitle.jsx
│   ├── ProductCard.jsx
│   ├── ProductDescription.jsx
│   ├── ProductDetails.jsx
│   ├── Rating.jsx
│   ├── RatingModal.jsx
│   └── Title.jsx
├── docs/
│   ├── AI_TEAM_READINESS_REPORT.md
│   ├── ARCHITECTURE.md
│   ├── CATEGORY_REQUIREMENTS.md
│   ├── CHANGELOG.md
│   ├── DECISIONS.md
│   ├── FEATURE_MATRIX.md
│   ├── MIGRATION_PLAN.md
│   ├── PHASE_1_READINESS_REPORT.md
│   ├── PROJECT_SPEC.md
│   ├── README.md
│   ├── REPOSITORY_ANALYSIS.md
│   └── TASKS.md
├── globals/
│   └── Settings.ts
├── lib/
│   ├── features/
│   │   ├── address/
│   │   │   └── addressSlice.js
│   │   └── cart/
│   │       └── cartSlice.js
│   ├── payload/
│   │   ├── categories.ts
│   │   └── products.ts
│   └── store.js
├── media/
│   ├── product_img1.png  (not inlined)
│   ├── product_img2.png  (not inlined)
│   ├── product_img3.png  (not inlined)
│   └── product_img4.png  (not inlined)
├── prompts/
│   └── README.md
├── scripts/
│   └── seed.ts
├── .dockerignore
├── .env  (not inlined)
├── .env.example
├── .gitignore
├── CLAUDE.md
├── CODE_OF_CONDUCT.md  (not inlined)
├── CONTRIBUTING.md
├── docker-compose.yml
├── Dockerfile
├── LICENSE.md  (not inlined)
├── next-env.d.ts
├── next.config.mjs
├── package-lock.json  (not inlined)
├── package.json
├── payload-types.ts
├── payload.config.ts
├── postcss.config.mjs
├── project_dump.md  (not inlined)
├── README.md
├── tsconfig.json
└── tsconfig.tsbuildinfo  (not inlined)
```
