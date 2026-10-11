# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **`M52a` — migrations run automatically as a fail-closed production deploy step (2026-10-11).** Run as *Full* (schema/migrations, Docker, CI). The production stack now bootstraps an **empty database with no seeding**; this removes the `M50` limitation. Design and verification: ADR-032 (also ADR-033, the `M52` design, accepted but not implemented).
  - **What it does:** a committed initial Payload migration (`migrations/`, generated with a dummy URI, no database needed) is applied by a one-shot `migrate` compose service (Dockerfile `migrate` target, runs as `node`, bounded by `timeout 300`) running `payload migrate && tsx scripts/verify-migrations.ts`; `app` waits for `service_completed_successfully`. Production never pushes the schema. `payload.config.ts` sets `migrationDir`; scripts `migrate`, `migrate:create`, `migrate:status`, `deploy:migrate`; no packages added. The standalone `app` image deliberately has no migration tooling (it was verified that the Payload CLI cannot run there), so the owner-approved fallback was used instead of an in-image entrypoint.
  - **Verifier (`scripts/verify-migrations.ts`)** closes two fail-open holes in `payload migrate`: an empty migrations directory exits 0, and fails; expected names come from the registered `migrations` array, unregistered files and `batch = -1` dev-push rows fail. It is a smoke check, not a schema comparison.
  - **Verified (real stacks, QA independent):** fresh volumes, no seeding: migrate exit 0, then `/`, `/shop`, `/sitemap.xml`, `/api/products`, `/admin`, `/cart`, `/orders` 200 and unknown category/product 404; second `up` is a no-op; a database one version behind applies only the new migration (batch 2); a broken migration on first deploy exits 1 and the app never starts (the failing file rolls back; earlier files in the same run stay applied); a dev-pushed database fails closed after the 300 s timeout; `pg_dump --schema-only` of a migrated database is identical to a dev-push one; no secrets in migrate logs or image env/history; `type-check` and lint pass in a container; the CI `migrations` job steps pass by hand including the drift check's negative case.
  - **Found by running it, and corrected in ADR-032:** on a dev-pushed database `payload migrate` **hangs** without a terminal (it does not exit 0); plain `docker compose up -d --build` **takes the site down** on a failed migration (Compose replaces the old app first) — the documented default is now the gated sequence `build` → `run --rm migrate` → `up -d` (owner-changeable); the verifier's original ordering hid its own message.
  - **Scope expansion (recorded):** beyond the two files named in the plan: `Dockerfile`, `payload.config.ts`, `package.json`, `migrations/`, `scripts/verify-migrations.ts`, `eslint.config.mjs`, `.github/workflows/ci.yml`, `docs/DEPLOYMENT.md` (new), ADR-032/033.
  - **Not verified:** the new CI jobs on a real GitHub runner; a real Playwright run (the `next build`/`next start` path was reproduced by hand); restore of the backup command in `DEPLOYMENT.md`; startup latency of `migrate` was not measured; whether Compose skips recreating `app` on a migration-only change.
  - **Found, not fixed (owners):** `migrate` should join the internal `backend` network, drop capabilities and not receive `PAYLOAD_SECRET` unnecessarily (`M52`); one Postgres role is used for both `app` and `migrate`, so a compromised app holds DDL rights (a least-privilege role split: `M54` or post-launch); the 300 s cap would kill a legitimately slow migration (a knob is needed before one ships); no advisory lock, so deploys must be serialised (documented); the CI workflow has no `permissions:` block (`M52`/CI owner); `migrate:down`/`reset`/`fresh` would wipe `orders` (warned in docs, never to be run); deleting a referenced product or category fails at the database (later admin UX); `images.unoptimized` still set (`M51`).

- **`M50` — Compose stacks for dev and production (2026-10-10).** Run as *Full* (Docker, env and secrets handling; production infrastructure). Files: `docker-compose.yml` (extended), `docker-compose.prod.yml` (new); no application code changed. Roles: DevOps (implemented), QA (independent verification), Security/Performance (review only); Product, Architect, UI/UX and Full-Stack skipped (criteria testable as written, no ADR touched or schema/dependency change, no customer-visible surface, no app code).
  - **Dev:** `docker compose up -d postgres` behaves as before; `docker compose up` adds an `app` service (`dev` target, waits for a healthy Postgres, source bind-mounted for hot reload, `app-media` volume). Loopback-only port (`APP_BIND` overrides), no restart policy, because it ships a well-known dev-only `PAYLOAD_SECRET` default. `next dev` pushes the schema, so an empty database works.
  - **Prod:** standalone file, project `gocart-prod` (volumes cannot collide with dev). Postgres has no published port; `POSTGRES_PASSWORD`, `PAYLOAD_SECRET` and `NEXT_PUBLIC_SITE_URL` are required (`:?`, no insecure defaults); app on the `production` target, port bound to `127.0.0.1` by default, named volumes for Postgres and `/app/media`, `restart: unless-stopped`. No healthcheck (`M53`).
  - **Verified (real stacks, Docker daemon started in the sandbox):** `compose config` for both (missing-secret errors fire); dev: `/`, `/shop`, `/admin`, `/api/products` 200 on an empty DB, hot reload works; prod: image builds, runs as uid 1000 with `NODE_ENV=production`, Postgres unreachable from the host, media volume writable by uid 1000, `down`/`up` keeps data, 404s for unknown category/product. Type-check passed (run in the dev image). Security review: no blocker; its three should-fix items were applied.
  - **Known limitation, by design (`M52a`):** against an empty database the prod stack boots but `/`, `/shop`, `/api/products` and `/sitemap.xml` return **500** (Postgres 42P01) while `/admin` returns 200, so a green `up` hides a broken site. Verification created the schema with a one-off dev-target `npm run seed` on the prod network (not committed, not a deploy path).
  - **Not verified:** the unmodified `Dockerfile` was not built here (the sandbox needed a proxy/CA, kept out of the repo; the CI `image` job builds the real file); base images came from `mirror.gcr.io` after Docker Hub 429s; the final prod edits (comments and the `NEXT_PUBLIC_SITE_URL` `:?`) were checked with `compose config`, not re-run as a full prod `up`; admin-API media upload (no admin user); non-loopback `APP_BIND`, Cloudflare-only origin and `serverActions.allowedOrigins` (`M52`); Docker Desktop hot reload; `npm run lint` and `npm run build` not run (the image build is the build).
  - **Found, not fixed (owners):** a URL-unsafe `POSTGRES_PASSWORD` passes compose and fails at runtime with a misleading `ENOTFOUND` (preflight: `M52`/`M52a`; documented in the file); `--env-file` and project-`.env` autoload guidance, password-rotation caveat, Cloudflare tunnel/TLS and Docker bypassing ufw (`M52`, launch-blocking); container hardening (`no-new-privileges`, `cap_drop`, memory limits, log rotation) and a healthcheck that probes a data route (`M53`); the dev image runs as root, so the bind mount leaves root-owned `node_modules`/`.next`/`media` on the host and host and in-container dev modes are mutually exclusive (document in `M57`/`M58`); `images.unoptimized` still set (`M51`).

- **`M49` — production Docker image (2026-10-10).** Run as *Full* (Dockerfile, `next.config.mjs`, two routes' rendering). Verified by actually building and running it: a Docker daemon was started in the sandbox (`vfs` storage, host networking, and a sandbox-only copy of the Dockerfile adding the egress proxy's CA — three lines, not committed).
  - **Dockerfile** is now `deps` → `dev` (unchanged) / `builder` → `production` (last stage, so the default target; dev is `--target dev`): standalone server, **non-root `node` user**, `NODE_ENV=production`, `/app/media` for uploads, **262 MB** (app ~99 MB, no source, tests, docs, `.env`, `.claude`, devDependencies). `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_CURRENCY_SYMBOL` are build arguments (inlined at build; a localhost site URL prints a warning); `PAYLOAD_SECRET` and `DATABASE_URI` are runtime-only and **required — the container exits 1 with a message if either is missing** (it used to start and 500 on every request). `.dockerignore` also excludes `media`, `e2e`, `docs`, `.github` and Playwright output. `output: 'standalone'` is opt-in (`NEXT_OUTPUT=standalone`) so `next start`, dev and the CI e2e job are unchanged.
  - **The image builds with no database.** The milestone's own premise (`M23`/`M25`: the build cannot assume one) was false: `next build` failed on `/category/[slug]`. Fixed in the routes, not by giving the build a database (ADR-031).
  - **A production-only bug found and fixed:** a category created after the build returned **HTTP 500** (`DYNAMIC_SERVER_USAGE`) because the category page reads `searchParams` while being statically cached; categories that existed at build time worked, so neither the dev server nor CI ever showed it, and any category an admin added after deploying would have failed. The category page is now `force-dynamic` (no `generateStaticParams`/`revalidate`), and `/categories` too (a static copy would bake an empty page for an hour after each deploy). Cost: one catalog query per request on those two routes.
  - **New tests** (`e2e/seo.spec.ts`, shared `e2e/admin.ts`): a category created after the build renders on demand, paginates and 404s out of range — it **failed against the broken production container (HTTP 500) and passes now**; the CI workflow gains an `image` job that builds the real Dockerfile with no database, checks the container runs as a non-root user, refuses to start without its settings and bakes in no secrets.
  - **A coverage hole CI exposed (and a rule so it cannot recur):** the first CI run was green with `11 passed, 1 skipped` — the skipped test was the new on-demand-category test. The helper that obtains an admin registers the first admin once, so the second test to ask found a user already existing and skipped, and a skipped test reports as success. The admin is now cached for the whole run, and **in CI a missing admin throws instead of skipping** (a local skip is fine; a CI skip is a failure). Re-verified by reproducing CI locally (fresh database, `CI=1`, first-register): 12/12 run, none skipped.
  - **Verified:** the milestone's test (`docker build --target production`, container starts and serves with `NODE_ENV=production`) plus the **entire Playwright suite (12/12) run against the running container**; media upload written to `/app/media` as uid 1000 and served back; non-root; no secrets or placeholders in the image environment or contents; `docker stop` takes 0.1 s; `--target dev` still builds and serves `/admin` (HTTP 200); `type-check`, `lint` and the normal build-with-database path pass (12/12).
  - **Not verified / open:** the schema must already exist — Payload does not create tables in production and there are no migrations (`M52a`), so a brand-new database cannot yet be used by the production image; no health check (`M53`); Compose, image optimisation, secrets and the Cloudflare-only origin are `M50`–`M52`; the real (non-sandbox) Dockerfile is first built in CI by the new `image` job; an image built without `NEXT_PUBLIC_SITE_URL` publishes localhost URLs (warned, not blocked); the sandbox's `vfs` driver filled the disk during repeated rebuilds and I cleared only my own test images, build cache and scratch files.
  - **Found, not fixed:** the first request after a deploy can show the static pages' footer without contact details for up to 60 s (the build-time settings read is empty); changing `NEXT_PUBLIC_SITE_URL` needs a rebuild, not a restart.

- **Mobile batch — `M44` and `M45` (2026-10-10).** Run as *Full* (it changes `next.config.mjs`, the checkout components and server-rendered pages). Evidence first: a Playwright audit of 10 routes at 6 widths (320–1280) and Lighthouse mobile (median of 3 runs, production build, local PostgreSQL) before changing anything.
  - **Audit result:** no horizontal overflow on any route at any width (60 of 60 route/width pairs). Findings were undersized touch targets (nav, footer, counter, chips, form controls, pagination, 20–40px), colour contrast, markup (a `<button>` nested in the cart `<a>` and another inside `Title`'s `<Link>`), missing landmarks and names, and dead or false UI.
  - `M44` fixes: **every interactive element is >= 44px** (header, footer, quantity buttons, remove, address and lookup forms, category chips and pagination) and the sub-12px cart badge is 11px; `<main>` landmark and a skip link; the footer's four social icons (nameless, and generic `facebook.com`/`twitter.com` links, not store accounts) removed, footer headings fixed (`h2`), fake product links replaced with real categories, "Privacy Policy" (no such page) removed, copyright uses the real year and store name; thumbnails are real buttons and the product image has real `alt` text; **a cart line can now be removed on a phone** (the Remove column was hidden below `md`, leaving decrement-to-zero as the only way); the address dialog scrolls, has a named, 44px close button, and **a newly saved address is selected automatically** (previously the customer had to find it in a dropdown and "Place Order" said "select an address"); the product-grid and cart prices no longer wrap ("Rs." / "2,900"); search queries are URL-encoded; contrast fixed (logo badge, hero pill, marquee chips, `slate-400` text, green links).
  - **False claims removed (beyond mobile, same class as `M55a`):** the home page's three cards promised "free delivery on every order, no conditions", "7 days easy return" and "24/7 customer support" — none is true or exists. They now state what the store does (delivery charges from Settings, Cash on Delivery, order tracking). The "20% discounts" tile (no discount system) is replaced with a real link; the dead "LEARN MORE" and "View more" buttons are real links. Navbar "About"/"Contact" (pointed at `/`) are replaced by "Categories".
  - `M45` fixes: media files get `Cache-Control` (they had none); metadata is in `<head>` for every user agent (`htmlLimitedBots`, see ADR-030 — Lighthouse had reported "no meta description" on category pages whose streamed metadata sat in `<body>`); the main product image is eager with `fetchpriority=high` (it was lazy-loaded) and the first row of cards on shop/category pages is prioritised; the font uses `display: "swap"`. **Not changed, by design:** `images.unoptimized` (`M51`), `force-dynamic` pages (needs on-demand revalidation hooks — a decision), render-blocking CSS and shared JS.
  - **Lighthouse mobile, before → after (median of 3):** accessibility 88–90 → **100** on all five pages; category SEO 92 → 100 (cart stays 63 because `noindex` is intended); performance 97–99 → 98–100; shop LCP 2026 → ~1450 ms (reproduced in two runs); home LCP 2394 → ~2050 ms, home TBT 140 → 56 ms, category LCP 2315 → ~2000 ms. **Honest reading:** the baseline was already excellent on a local server with 4 KB seeded images, so the performance gains are modest; some per-run movement (product LCP 2242 → 1875 → 2287 ms, cart LCP) is noise, and bundle sizes did not change (home 110 kB, shared 101 kB). The large real-world levers — image optimisation and real photo weight — belong to `M51` and cannot be measured with the seed data.
  - **Verified (production build + `next start`, seeded PostgreSQL):** `type-check`, `lint`, `build` pass; Playwright 11/11 (golden path, SEO and the new `e2e/mobile.spec.ts`: 320px overflow on 7 pages, 44px header targets, remove-from-cart on a phone, saved address auto-selected, long-name/large-price layout); the audit re-run on the final build shows zero overflow (0 of 60 route/width pairs), **no interactive target under 44×44** (the skip link is 1px until focused, by design) and no text under 11px; phone-width screenshots reviewed (home, cart, address dialog). Two temporary breaks (search button shrunk; mobile Remove hidden) made two of the new tests fail, then were reverted — one first attempt did not break anything (Tailwind's `inline-flex` overrides `hidden`), which is why it was redone.
  - **A bug CI caught that passed locally (and my own `nowrap` fix caused it):** making the product-grid price `nowrap` left the card wider than its two-column grid cell at 320px with a long word in the name ("Headphones"), so the home page scrolled sideways by 4px — but only in CI, where text renders a few pixels wider than in my sandbox. I could not get the CI artifact (the download host is blocked from here), so the overflow test now lists the offending elements in its failure message, which named the card on the next run. Fixed properly rather than for one font: name and price stack on phones and sit side by side from `sm`; product names wrap anywhere (`overflow-wrap: anywhere`) in the grid, the product page heading and the cart; on a phone the cart drops its separate Total column and shows the line total under the quantity. A new test creates a product with a 63-character unbroken name and a seven-digit price and checks `/shop`, `/`, the product page and `/cart` at 320px (it registers the first admin on a fresh database, takes `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` otherwise, and skips rather than fakes when it has neither); it fails against the previous code (`/shop overflows by 3px`) and passes now. A separate stress run (3 hostile products × 4 widths × font loaded/blocked × 5 pages = 40 combinations) shows no overflow.
  - **Not verified / open:** real devices and real network (everything is a lab run); real product photos; screen-reader behaviour beyond Lighthouse/axe rules; `bfcache` is still blocked on the dynamic pages (`no-store`) — see ADR-030; no Privacy Policy, About or Contact page exists (legal text is a launch decision); social links need Settings fields before they return; Footer description still names "smartphones and smartwatches" (catalog-dependent copy).

- **SEO batch — `M40`, `M41`, `M42`, `M43` (2026-10-10).** Run as *Full* (new server routes read the catalog; no Orders, PII, access or schema change).
  - `M40`: the public layout and home page were already server components (`M23`); the remaining client-side gap was the category links, fetched from the REST API after hydration, so they were absent from the HTML a crawler receives. `CategoriesMarquee` and `Hero` are now server components fed real categories by the home page (20 real `href="/category/…"` links in the initial HTML); unneeded `'use client'` removed from `Title`, `PageTitle`, `Loading` and `ProductCard` (none use hooks or handlers).
  - `M41`: new `lib/seo.ts` (`pageMetadata()`, `plainDescription()`). The layout's metadata now uses the Settings store name (title template `%s | <store>`, default description, `en_PK`); home, `/shop`, product, `/categories` and `/category/[slug]` set their own title, description, canonical and Open Graph/Twitter fields through the helper (Next.js replaces a parent's `openGraph` wholesale, so every page must restate `siteName`/`type`/`locale` — the helper is how that is never forgotten). Product pages carry the product image as `og:image`; a paginated category page gets its own title (`… - Page 2`) and a self-canonical. `/shop?search=…` is `noindex` and canonicalises to `/shop` (the query is not echoed into the title). `/cart` (new `cart/layout.jsx`), `/orders` and `/order-confirmation` are `noindex`. The product page's `generateMetadata` and body share one query via `cache()`. The milestone's file list is stale (`app/layout.jsx` does not exist; the root layout is `app/(public)/layout.jsx`).
  - `M42`: `app/robots.ts` (allow `/`, disallow `/admin` and `/api/`, sitemap URL) and `app/sitemap.ts` (home, `/shop`, `/categories`, every category and product with `lastmod`; per request, no database needed at build; capped at the protocol's 50,000 URLs). Cart/orders/confirmation are kept out of the index with `noindex` rather than `Disallow` (a disallowed page can still be indexed as a bare URL). All absolute URLs come from `NEXT_PUBLIC_SITE_URL`.
  - `M43`: `Product` JSON-LD with an `Offer` (price, `PKR`, `InStock`/`OutOfStock`, absolute URLs, images) on product pages, built only from real data — no ratings, reviews, brand, GTIN, condition, return policy or shipping details (none exist; shipping is a flat rate with a free threshold that one simple `OfferShippingDetails` cannot state truthfully). `<` and U+2028/2029 are escaped so admin-entered text cannot break out of the script tag (tested with a hostile product name and description).
  - **Verified (production build + `next start`, seeded PostgreSQL, site URL `https://www.example.com`):** `type-check`, `lint`, `build` pass; 80 live assertions on raw HTML (distinct titles and descriptions per route, absolute canonicals on the configured site, og fields, product `og:image`, noindex on cart/orders/confirmation/search, 404s for unknown product/category/out-of-range page, robots.txt, a valid sitemap listing every product and category with no duplicates or private routes and **every sitemap URL returning 200**, JSON-LD fields matching the page and the API, out-of-stock → `OutOfStock`); a hostile product (script tags, quotes, `&`, U+2028 in name and description) produced no injected markup, a JSON-LD body with no raw `<` that parses back to the exact name, and a description of at most 155 characters; the home page renders unchanged at 390px and 1280px with no console errors. New `e2e/seo.spec.ts` (4 tests) joins the golden path: 6/6 pass, and two temporary breaks (category links removed, wrong canonical) made 3 of the 4 SEO tests fail before being reverted.
  - **Not verified:** Google's Rich Results Test and Search Console (no access from here) — the JSON-LD was checked against the schema.org/Google required fields by assertion only; the real production domain (not final; everything is driven by `NEXT_PUBLIC_SITE_URL`, which falls back to `http://localhost:3000` if unset — a deployment without it would publish localhost canonicals and sitemap URLs, so set it in every environment); how the pages render in a real search result.
  - **Found, not fixed:** the navbar's "About" and "Contact" links point at `/` (no such pages); the home page's "20% discounts" tile and dead "LEARN MORE"/"View more" buttons; the footer's fake product links; a staging deployment would be indexable (there is no environment-based `noindex`) — worth deciding before any non-production host is public.

- **`M56a` — golden-path E2E test and CI (2026-10-10)** (closes readiness risk `R7`). New `playwright.config.ts` and `e2e/golden-path.spec.ts`: browse `/` and `/shop` → product page → add to cart → cart (price, shipping and total) → guest checkout (a landline number is refused with a clear message, a `+923…` number is accepted) → COD order placed → confirmation → guest lookup by order number and phone finds it as Placed; plus a second check that an out-of-stock product cannot be added. Amounts come from the app's own API (seeded product, Settings global), never hardcoded. Runs at a phone viewport against a production build on port 3100. `.github/workflows/ci.yml` gained an `e2e` job (PostgreSQL 16 service, `npm run seed`, **`npm run build`**, the test; report uploaded on failure) next to the existing type-check/lint job, so CI now builds the app. `@playwright/test@1.56.1` added as a dev dependency (exact version, matching the browser build available here); `npm run test:e2e`; `.gitignore` covers Playwright output.
  - **Verified locally** (fresh database → `npm run seed` → build → `npm run test:e2e`): both tests pass. **Proof the test is real:** with two temporary breaks in a build (server shipping +1, and the out-of-stock guard removed) both tests failed with the right messages (`Rs. 3,100` expected, `Rs. 3,101` received; Out of Stock button not found); breaks reverted.
  - **CI evidence (PR #14):** the first run of the new `e2e` job passed (about 2m10s). A deliberately broken commit (server shipping +1) then made `e2e` fail on exactly the total assertion (`1 failed, 1 passed`) while `checks` (type-check, lint) stayed green — i.e. the test catches a bug static checks cannot. The break was reverted in the next commit.
  - **Limits:** one happy path only — no unit tests, nothing covering admin, validation edge cases, copy or the SEO pages. `retries` is 0 on purpose.

- **Storefront honesty and polish batch — `M55`, `M55a`, `M56` (2026-10-10).** Run as *Full* under GATES.md (it touches order creation, `Orders`, PII and a new server reader).
  - `M55`: new `lib/currency.ts` `formatPKR()` — `Rs. 1,500`, comma grouping, no decimals, `en-US` pinned so server and browser render identically. Replaced the per-file `process.env.NEXT_PUBLIC_CURRENCY_SYMBOL` + `toLocaleString()` pattern in `ProductCard`, `ProductDetails`, `Hero`, `OrderSummary`, `OrderItem`, the cart page and the order-confirmation page. Fixes unformatted prices (`Rs. 2900`) on cards, the product page and the cart unit price.
  - `M55a`: new `lib/payload/settings.ts` (`getSettings()`, never throws). `Footer.jsx` is now an async server component showing the contact phone/email/address from the Settings global (the fake US phone, `example.com` email and San Francisco address are gone; an unset value is hidden, not replaced). The public layout sets `revalidate = 60`, so an admin edit reaches statically rendered pages without a redeploy. `ProductDetails` no longer claims "Free shipping worldwide": it states the real delivery charge and free-delivery threshold from Settings, says Cash on Delivery, and the unverifiable "100% Secured Payment" / "Trusted by top brands" lines are removed. Also in `Hero.jsx` (same false-claim class): "Free Shipping on Orders Above $50!" now reads the real threshold; the invented "Starts from 4.90" is now the cheapest real product price (hidden if none).
  - `M56`: new `lib/validation/pk.ts` — Pakistani mobile `03XXXXXXXXX` **or `+923XXXXXXXXX`** (stored as `03XXXXXXXXX`, trimmed and normalised by `createOrder` and an `Orders.phone` `beforeValidate` hook), names and cities with spaces and `. , ' ’ - ( ) /` (Urdu ZWNJ/ZWJ included, no digits), address >= 10 chars, optional area — used by `AddressModal` (specific inline messages), `createOrder` (authoritative) and `Orders.phone` (on create or change only, so old orders still save). The lookup (`/orders`) accepts either phone form plus the looser pre-M56 shape. Rules confirmed by the owner; decisions in [ADR-029](./DECISIONS.md).
  - `lib/site-url.ts` `getSiteUrl()` — public origin from `NEXT_PUBLIC_SITE_URL` only (falls back to `http://localhost:3000`; invalid or non-http values are ignored); wired to `metadataBase` in the public layout. The production domain is not final, so no domain is hardcoded anywhere.
  - **Verified (production build + `next start`, throwaway local PostgreSQL):** `lint`, `type-check`, `build` pass; unit checks on `formatPKR` and the validators; 18 live-server checks (no `worldwide` / `example.com` / `+1-212` / `94102` / `$50` / `4.90` / `NaN` / unformatted amounts on `/`, `/shop`, `/cart`, `/orders`, `/categories`, a product page; hero and product delivery text match Settings; changing Settings changes dynamic pages immediately and the statically rendered footer within ~40s; blank contact fields hide the block); 15 `createOrder` checks (valid, Urdu, no-area accepted; landline, `+92`, 10-digit, numeric/script-like name, short or punctuation address, numeric city rejected, no PII echoed); 7 `Orders.phone` REST checks incl. a pre-M56 phone order still saving a status change; browser (390px): invalid name/address and landline phone show inline messages, a valid address places an order, confirmation and lookup show `Rs. 2,900`, no hydration warnings.
  - **G6 review (independent security/performance reviewer): no blocking findings.** Acted on: Urdu ZWNJ/ZWJ were rejected in names/cities (now allowed); admin-entered phones with surrounding whitespace would never match the guest lookup (now rejected on `Orders.phone`); the footer `mailto:` link is only built for a plain address. Its one unverified concern — whether the admin UI supplies `previousValue` so a legacy-phone order can still be saved — was tested in the real admin UI: status change saved, an invalid phone edit was refused. Accepted, noted: a failed Settings read is cached as an empty footer for up to 60s (fails closed); the home and product pages read Settings on every request; `NEXT_PUBLIC_SITE_URL` is inlined at build time, so an image built without it keeps the localhost fallback.
  - **Not verified:** `metadataBase` has no visible effect yet (no relative metadata URL is emitted), so only the helper's unit behaviour and a successful build are checked; the admin Orders list money columns are unformatted (admin-only, untouched); no automated tests exist, QA was manual scripts; `NEXT_PUBLIC_SITE_URL` was added to `.env.example` by the owner.
  - **Found, not fixed:** Hero's "20% discounts" tile and dead "LEARN MORE" / "View more" buttons; Footer's fake product links (Smartphones, Laptops) all pointing at `/`, dead "Privacy Policy", "WEBSITE?" heading and generic social links; checkout collects an email that is never stored; after adding an address it is not auto-selected (the customer must pick it in the dropdown before Place Order works); landline numbers are rejected (ADR-029).

### Security

- **Order immutability — ADR-028 (2026-10-10).** `collections/Orders.ts`: field-level `update: () => false` on `orderNumber`, `orderTotal`, `shippingCost`, the `items` array and `items[].product` / `quantity` / `unitPrice` (create and collection access unchanged). Owner-approved authorization change that narrows access.
  - **QA found and fixed a real hole:** with sub-field locks only, an admin REST `PATCH` could remove a line-item row while `orderTotal` stayed put. Locking the array itself closes it.
  - **Verified (live server, throwaway local PostgreSQL):** 26/26 REST + GraphQL checks — admin PATCH of each locked field, and of `items` (edit quantity / unitPrice / product, remove, reorder, append, replace, empty, null) leave stored values unchanged; `status`/`isPaid`/phone/city still editable; full-document PATCH as the admin UI sends it updates status with locks intact; anonymous REST and GraphQL read/create/update rejected (403). Browser: locked fields read-only on desktop and mobile, no add/remove/reorder controls, a status change saved through the UI persisted. Guest `createOrder` still writes an order with server-derived prices; guest lookup by `(orderNumber, phone)` still finds it (wrong phone: not found). `lint`, `type-check`, `build` pass.
  - **Not covered:** no automated tests exist (GATES.md); QA was manual scripts, not committed. Schema unchanged by reasoning (access config only) — `pg_dump` diff not run.

### Changed

- **Admin verification batch — `M34`, `M37`, `M38`, `M39` (2026-10-09).**
  - `M37` / `M38`: `collections/Orders.ts` got **admin-UI configuration only** (no access, field, hook or schema change; `pg_dump --schema-only` is identical before and after): admin search now matches order number, **name, phone and city** (it previously matched only the order number, so a customer could not be found); default columns now include phone and city; explicit newest-first sort; `status` and `isPaid` moved to the sidebar beside Save with guidance (any status can follow any other, ADR-019; for Cash on Delivery tick Is Paid when the cash is collected — it is not set automatically); the snapshot fields (`unitPrice`, `orderTotal`, `shippingCost`) say that editing them does not recalculate anything.
  - `M34`: no new code — the shipping rule and the checkout display landed with `M33`; recorded as done with the earlier QA evidence. `M39`: delivered inside `M36`.
  - **Verified (QA, live server, DB-backed, desktop + mobile):** `type-check`, `lint`, `build` pass; schema identical; anonymous order access still 403 and logged-out `/admin` shows only the login; list columns, search hits and misses for all four fields, status filter; status flow PLACED → CONFIRMED → PROCESSING → SHIPPED → DELIVERED, CANCELLED and RETURNED each saved through the UI, persisted after reload, and shown to the guest by `lookupOrder` and `/orders`; order placement and the out-of-stock toast unchanged; no customer data in server logs.
  - **Open decisions for the owner (not done):**
    1. `orderNumber` is read-only in the admin UI but an admin can still change it through the REST API, which would break a guest's saved reference. Locking it needs field-level access (an authorization change) or an immutability hook.
    2. `unitPrice` / `orderTotal` / `shippingCost` remain editable (an admin may need to correct a total after a phone confirmation); making them read-only would remove that.
  - **Found, not fixed:** on a phone Payload stacks sidebar fields at the bottom, so Status and Is Paid sit far from Save on narrow screens; an admin typo in the phone locks the guest out of lookup (admin-error risk); `isPaid` is manual; the items rows are titled "Item 01" (product name is inside the row) — a product-name row label needs a custom admin component; money columns have no currency formatting; no automated tests exist.

### Removed

- **Dead-UI cleanup batch — `M46`, `M47`, `M48`, `M48a` (2026-10-09), run under the owner's fast-track rule** (frontend-only deletions: lint + type-check, no build, no database).
  - `M46`: deleted the orphaned `components/Rating.jsx` and `components/RatingModal.jsx` (reviews are out of scope, ADR-016).
  - `M47`: removed all coupon state, the input/Apply form, the applied-code display and the discount branches from `components/OrderSummary.jsx` (ADR-017). Shipping/total logic and order placement are untouched.
  - `M48a`: deleted `components/Newsletter.jsx` (a form that discarded input) and its home-page usage; closes readiness risk R11.
  - `M48`: the sweep found `components/Banner.jsx`, shown on **every** page, advertising "Get 20% OFF on Your First Order!" with a button that copied the non-existent coupon code `NEW20`. Deleted with its layout usage — it was a false offer in a store with no coupon engine.
  - **Verified:** `npm run lint` and `npm run type-check` pass; grep finds no remaining references; scoped QA on a DB-free dev server with mocked network responses (mobile + desktop): no coupon UI on `/cart`, shipping and totals correct at both sides of the free-shipping threshold, Place Order gating and the address modal still work, no promo banner on any page, `/orders` and `/order-confirmation` render, no console or hydration errors; `git diff` shows `lib/`, the cart/orders actions and `collections/` unchanged.
  - **Not verified (needs a database, skipped by the owner's rule):** the home page render without the Newsletter section; `/shop`, `/product/*`, `/category/*`.
  - **Found, not fixed — false customer-facing claims for `M55a`:** `Hero.jsx` "Free Shipping on Orders Above $50!" (wrong currency, contradicts the Settings threshold); `OurSpec.jsx` "free delivery on every order no conditions"; `ProductDetails.jsx` "Free shipping worldwide", "100% Secured Payment" and "Trusted by top brands"; `Footer.jsx` fake contact details (`+1-212-456-7890`, `contact@example.com`, swapped icons) and dead links to `/`.

### Fixed

- **Out-of-stock products can no longer be added to the cart from the product page (2026-10-09, owner-requested patch following `M33a`).**
  `components/ProductDetails.jsx` treats anything other than an explicit `inStock === true` (so `false` and `null`) as out of
  stock: the button is disabled and reads "Out of Stock", the quantity counter is hidden, and the click handler is guarded.
  In-stock products are unchanged. The server-side check in `createOrder` (`M33a`) remains the authority.
  - **Verified (QA, live server):** in-stock add/view-cart flow unchanged; `false` and SQL `NULL` both show a disabled
    "Out of Stock" button with no "Add to Cart" text and no counter, and forced clicks leave the cart untouched; a product already in the
    cart that goes out of stock shows "Out of Stock" and Place Order is still rejected server-side with no order created; no console errors, mobile and desktop.
  - **Found, not fixed:** the `+` button on `/cart` (`components/Counter.jsx`) can still raise the quantity of an out-of-stock item that is already in the
    cart (rejected at checkout). The `/shop` cards show no stock indicator.

### Added

- **`M36` — guest order lookup (2026-10-09), per [ADR-024](./DECISIONS.md#adr-024-guest-order-lookup-via-a-dedicated-ordernumber-phone-endpoint--orders-collection-access-stays-admin-only).**
  `/orders` is a real lookup form (no dummy data): order number + the phone used when ordering. `lookupOrderAction` (`app/(public)/orders/actions.ts`) rate-limits
  **before** any query; `lookupOrder` (`lib/payload/orders.ts`) validates both inputs as strict strings, runs one `find` on order number + phone with
  `overrideAccess: true` (server-side only), and returns exactly one order's whitelisted fields (items with names/quantities/prices, totals, status, createdAt, payment,
  delivery details; no ids) or an **identical** `NOT_FOUND` for any mismatch (wrong phone, unknown number, another order's phone). `Orders` collection access is unchanged (admin-read only).
  The page is `noindex`, never puts the order number or phone in a URL, and is prefilled from the tab's last order (`sessionStorage`). `components/OrderItem.jsx` was rewritten to the real
  order shape (covering the substance of `M39`). `lib/client-ip.ts` now holds the shared client-IP helper used by order placement and lookup.
  - **Owner-approved rate limits:** 20 lookups/hour per IP (every request counts) and **5 failed lookups/hour per order number**; successful lookups and malformed phones do not count. The per-order
    counter uses `createBucketLimiter` (`lib/rate-limit.ts`): a fixed 65,536-bucket store keyed by HMAC with a per-process secret that **never evicts live entries** (security review M1: the shared LRU limiter
    could be flooded to reset a victim's counter), reserving a slot before the query (no parallel-burst bypass) and refunding it unless the result is `NOT_FOUND`. Owner-accepted trade-off: someone who knows
    an order number can use up its 5 failed attempts for an hour; the admin and the confirmation page remain available.
  - **Scope notes:** files beyond the plan line are `lib/payload/orders.ts`, `lib/client-ip.ts`, `lib/rate-limit.ts`, `app/(public)/cart/actions.ts` (imports the shared IP helper), `app/(public)/orders/{actions.ts,page.tsx,OrderLookup.tsx}`, `components/OrderItem.jsx` (the old `orders/page.jsx` is deleted).
  - **Verified (QA, two rounds on a live server with a database, full gates per the owner):** lookup returns exactly the matched order (exact key set); wrong-phone and unknown-number results are byte-identical;
    injection-style and wildcard inputs give `INVALID_INPUT`, never an error or data; 5 failed lookups → the 6th is blocked even with the correct phone and the blocked attempts never reach the database;
    15 successful lookups don't consume the cap; 10 malformed phones don't consume it; 30 parallel wrong-phone lookups → exactly 5 reach the database; after a 5,000-fake-order-number flood from unique IPs a victim's
    counter still holds; the per-IP cap is 20 and counts every request; anonymous `/api/orders` and GraphQL access still denied; no customer data in server or Postgres (default-level) logs; UI correct on mobile and desktop with
    text-only rendering of hostile names; M33/M33a/M35 regression. A full G6 security review found **no Blocker** (access control, injection, enumeration, caching all pass).
  - **Not verified:** that a `SERVER_ERROR` leaves the per-order counter untouched (QA could not provoke one; it is correct by reading the code); the per-IP limit behind a real proxy/Cloudflare; no automated tests exist.
  - **Launch-blocking (recorded in `MIGRATION_PLAN.md`'s `M52` entry):** client-IP headers are only trustworthy once the origin is firewalled to Cloudflare; without it the per-IP limits on placement and lookup can be bypassed.
  - **Found, not fixed:** colliding order numbers share a counter (rare at 65,536 buckets) and a flood can only make lookups stricter, never looser; the per-IP limiter still uses the evicting shared map (a flood from many IPs could reset IP counters); lookup shows the live product name, so a renamed product appears renamed on old orders;
    the form's `pattern` rejects a phone with a leading space client-side; ADR-024's text says `guestPhone` but the field is `phone` (erratum for the owner to apply); `depth: 1` loads whole product documents to read one name.
- **`M35` — order confirmation page (2026-10-09), per [ADR-027](./DECISIONS.md#adr-027-m35-order-confirmation-is-rendered-from-the-placeorder-response-held-in-sessionstorage--no-server-read-of-orders).**
  `/order-confirmation` (client-rendered, `noindex`) shows the order number with a copy button, the server-priced items,
  subtotal / shipping (`Free` when 0) / total, delivery details, and Cash on Delivery. It is fed by the `placeOrder` response held in
  `sessionStorage` (`gocart:last-order`), so no route reads `Orders` by order number (ADR-024 unchanged). `createOrder`'s success result gains
  `items: {name, quantity, unitPrice}[]` (public names and the snapshot price; nothing else). `lib/order-confirmation.ts` shape-validates storage
  (order-number pattern, ranges, 24-hour expiry); anything invalid shows a friendly not-found state linking to `/orders` and `/shop`. If storage
  is unavailable the old long toast is shown and the guest is not redirected. The copy states no call, SMS, email or delivery time, because none exist.
  - **Scope notes:** files beyond the plan line are `lib/payload/orders.ts`, `lib/order-confirmation.ts` and `components/OrderSummary.jsx` (all named by ADR-027).
  - **Verified (QA, live server):** happy path on mobile and desktop for charged and free shipping (price changed after adding to cart shows the server snapshot),
    reload keeps the order, a new browser context shows the not-found state, 13 malformed or expired storage cases fall back safely, an HTML-looking product name
    renders as text, `noindex, nofollow`, no order-data network request, anonymous order reads/creates still 403, storage-blocked fallback, and
    the M33/M33a regression (out-of-stock, double-click, rate limit). No automated tests exist.
  - **Review:** no separate Security/Performance run (owner's scope-based QA rule); the diff adds only public catalogue data to the response and reads only
    the client's own `sessionStorage`.
  - **Found, not fixed:** `readLastOrder` does not check that total = subtotal + shipping (a guest can only alter their own confirmation view). The confirmation
    page's "check order status" link goes to `/orders`, which stays dummy data until `M36`. The cart page can flash "Your cart is empty" for a moment before navigation.
- **`M33a` — server-side stock enforcement at order creation (2026-10-09).** `createOrder` (`lib/payload/orders.ts`)
  checks every line's `Products.inStock` using the same query that supplies prices (never client or cached values) and
  fails closed: only `inStock === true` is purchasable. Any unavailable line rejects the whole order — nothing is
  written — with a new `OUT_OF_STOCK` code and `unavailable: [{id, name}]` (public catalogue data only).
  `components/OrderSummary.jsx` shows one error toast naming the blocked products and keeps the cart. Unknown-product
  rejection still takes precedence. Closes readiness risk R5. No scope excursions.
  - **Verified (QA, live server, throwaway PostgreSQL 16):** `type-check`, `lint`, `build` pass; direct `createOrder`
    calls for all-in-stock, one/mixed/multiple out-of-stock, unknown + out-of-stock, and a product with `in_stock = NULL`
    (fails closed); stock flipped to out-of-stock *after* `/cart` loaded → error toast, cart kept, no order, and succeeds
    once restored; M33 regression (double-click → one order, anonymous create still 403); no PII in logs.
  - **Found, not fixed:**
    - ~~The storefront still lets customers add an out-of-stock product to the cart~~ — fixed the same day, see "Fixed" above.
    - Stock is read and the order written without a row lock (milliseconds apart); there is no quantity-based inventory, only a boolean.
    - Low (Security/Performance review): if a product name were ever a non-string the toast would read "Out of stock: , ."; `Products.name` is a required text field, so this is cosmetic. Per-unit inventory counts, if ever added, would need an atomic decrement.
  - **Security/Performance review (read-only):** no Blocker or High findings; fail-closed confirmed (missing/null/non-boolean `inStock` all blocked), no bypass via duplicate or normalised ids, the `OUT_OF_STOCK` response exposes only id and name (already public via `GET /api/products`), toast text is escaped, no new query or logging.

- **`M33` — real guest order creation (2026-10-09).** Implements [ADR-026](./DECISIONS.md#adr-026-orders-are-created-only-by-a-server-side-function--orders-collection-create-access-closes-to-admins).
  - `lib/payload/orders.ts` (`createOrder`), `app/(public)/cart/actions.ts` (`placeOrder` server action),
    `lib/rate-limit.ts` (in-process sliding window, shared with `M36`), `Orders.create` → admin-only,
    `components/OrderSummary.jsx` wired to the action (double-submit guard, error toasts, success toast with
    the order number; the cart is cleared only on success and the page no longer navigates to the dummy `/orders`).
  - The server derives prices (current `Products.price`), shipping and total (`Settings`, ADR-018), `COD`,
    `PLACED`, `isPaid: false` and the order number; the client supplies only cart lines and the address. Whole-order
    rejection on any invalid input; ids bounded to the Postgres integer range; control characters rejected;
    money rounded to 2 decimals; errors log only the error class/code (no PII). Response is order number + totals only.
  - **Scope excursions (reported):** shipping/total *display* in `OrderSummary.jsx` pulled forward from `M34` (it fetches
    `/api/globals/settings`; Place Order stays disabled until it loads); dummy US address removed from `addressSlice.js`;
    `collections/Orders.ts`, `actions.ts` and `rate-limit.ts` are outside the original `Files` line but named by ADR-026;
    stale lint/CI notes corrected in `GATES.md` and `CONVENTIONS.md`; `M13`/`M33` annotated in `MIGRATION_PLAN.md`.
  - **Verification (live server, throwaway PostgreSQL 16):** `type-check`, `lint`, `build` pass; anonymous
    `POST /api/orders` and GraphQL `createOrder` refused with no row created; ~75-case validation matrix; price/total
    tampering ignored; shipping boundaries 2999/3000; price-change snapshot; double-click → one order; 6th order from one
    IP rate-limited through the real server action; fresh-DB `npm run seed` still works; no customer strings in server or
    Postgres logs. A Security/Performance review found no Blockers; its High/Medium findings in the new code were fixed
    (limiter overflow no longer clears all counters, per-entry windows, bounded keys).
  - **Found, not fixed (decisions or later milestones):**
    - No server-side idempotency: a lost response followed by a retry can create a duplicate order (needs a dedupe design).
    - No per-phone throttle or maximum order value; 5 orders / 15 min / IP still permits fake COD orders at some rate.
    - Client IP trust: `cf-connecting-ip`/`x-forwarded-for` are only safe once the origin is firewalled to Cloudflare, and
      Next server actions may need `serverActions.allowedOrigins` behind a proxy — both for `M49`–`M52`. Unverified through a real proxy.
    - C1 control character `\u0085` is not rejected (data hygiene only). Line `unitPrice` is stored unrounded.
    - `app/(public)/cart/page.jsx` still fetches the whole catalog over REST; GraphQL playground/depth limits not set for production.
    - Out-of-stock products can still be ordered until `M33a`; `AddressModal` still requires an `email` that `Orders` does not store.
    - ADR-024's lookup query names `guestPhone`; the field is `phone` (erratum for a human to apply).
    - `.claude/commands/*.md` and `.claude/agents/qa-engineer.md`/`devops-release-engineer.md` still say `npm run lint` is broken.
    - One unconfirmed `Failed to fetch` console error appeared once in a QA script, probably from navigating away mid-request.

### Changed

- **Doctor fix pass (2026-10-09)** — project-resume health pass before `M33`.
  - **Dependencies:** `payload` and all `@payloadcms/*` packages `3.88.0` → `3.90.2`; `next` `15.3.9` →
    `15.4.11`. This clears Payload's critical field-access-bypass advisory (audit: 24 → 20 findings,
    critical 2 → 1). `next@15.4.11` is the newest Next that `@payloadcms/next@3.90.2` allows on 15.x
    (its peer range excludes 15.5.x). **Residual:** the remaining critical `next` advisory is only
    fixed in 15.5.x / 16.3+, so closing it needs a Next 16 upgrade — tracked as a decision, not done here.
    `package-lock.json` was regenerated because the old lock pinned every Payload sub-package at 3.88.
  - Removed unused dependencies `recharts` and `date-fns` (zero imports since the admin dashboard was deleted).
  - **Tooling:** added `eslint.config.mjs` (`next/core-web-vitals`) — `npm run lint` previously dropped into
    an interactive setup prompt. Added `.github/workflows/ci.yml` running type-check and lint. `build` is
    deliberately not in CI yet: `generateStaticParams` on `/category/[slug]` needs a reachable database at
    build time (to be addressed with the production Docker work, `M49`).
  - **Hardening:** `payload.config.ts` now throws at runtime if `PAYLOAD_SECRET` is missing in production
    (build phase exempt); order numbers use `crypto.randomBytes` instead of `Math.random`.
  - Docs: milestone totals corrected to 68; `CLAUDE.md` status brought up to `M32`.
  - Verified against a throwaway PostgreSQL 16: `npm run seed`, `npm run build`, and HTTP smoke of every
    storefront route, `/admin`, and the access rules (`/api/users`, `/api/orders` → 403 anonymous).

### Fixed

- **`scripts/seed.ts` runs successfully for the first time (2026-08-26)** — clearing `M29`'s
  prerequisites established a real development environment and, in doing so, found that the seed
  had **two** independent defects, neither of them the cause the documentation had recorded. The
  standing explanation — "a `tsx`/Node ESM-interop issue in the authoring sandbox, unrelated to the
  script" — was wrong on both counts: it was not sandbox-specific, and part of it *was* the script.
  - **Root cause 1 — module resolution.** `package.json` declared no `"type"`, so Node treated every
    project `.ts` file as CommonJS, while `payload@3.88.0` ships `"type": "module"` ESM containing
    top-level await. Three separate entry points failed on this: `npm run seed`
    (`Cannot destructure property 'loadEnvConfig'`), `node --import tsx/esm`, and Payload's own CLI
    (`ERR_REQUIRE_ASYNC_MODULE` on `payload.config.ts`). Fixed by adding `"type": "module"`; all
    tracked `.js` files were already ESM, so nothing else needed changing. **This also unblocks
    `payload generate:types`**, which had never run for the same reason — `payload-types.ts` now
    generates (541 lines) and confirms the hand-written mirrors in `lib/payload/products.ts` and
    `lib/payload/categories.ts` are accurate.
  - **Root cause 2 — stale `assets/` path.** `readAsset()` read four PNGs from `assets/`, which
    `M28` (`8c20d4f`) deleted along with the dummy dataset, so the seed threw `ENOENT` before
    creating anything. `Products.images` is `required: true`, so the images could not simply be
    dropped; `readAsset()` now generates a placeholder PNG with `sharp` (already a dependency),
    keeping its signature and all four call sites unchanged. The seed no longer depends on a
    directory that does not exist.
  - **A third, latent defect surfaced by the fix.** With `payload-types.ts` finally generated,
    `npm run type-check` failed: `Categories.slug` is `required: true` but is filled in by the
    collection's `beforeValidate` hook, which TypeScript cannot see, so all five category creates
    were missing a required field. Runtime was always correct; only the type-level error was hidden,
    and only because the types had never been generated. The seed now passes each `slug` explicitly —
    values identical to what `slugify()` derives, verified by re-seeding from an empty database and
    diffing the result.
  - Verified end to end against real PostgreSQL: `npm run seed` exits 0 and produces exactly the
    4 products, 5 categories (correct two-level hierarchy and slugs), and 4 media records the script
    specifies, with files written to `media/`. `npm run type-check` and `npm run build` both pass
    (15/15 pages; `/shop` still `ƒ Dynamic`). `npm run lint` remains broken and untouched.
  - **Not verified: the Docker path.** `docker compose up -d postgres` cannot pull
    `postgres:17-alpine` — the egress policy answers 403 to `production.cloudfront.docker.com`.
    The daemon itself starts fine. Verification used a native PostgreSQL 16.13 instance on the same
    `DATABASE_URI`, so **"everything runs in Docker" remains unproven for the database service**, and
    the pinned image version is untested. This is an environment-access gap, not a code defect.

### Added

- **`M32` — Stripe option removed from checkout UI (2026-08-26)** — `components/OrderSummary.jsx` had a
  fully-wired Stripe radio button (`onChange`, `checked`) that never did anything: no payment gateway
  has ever existed anywhere in the codebase.
  [ADR-004](./DECISIONS.md#adr-004-cash-on-delivery-only-for-launch-architecture-stays-payment-extensible)'s
  Consequences line already specified the exact target — *"Checkout UI shows COD as the only option
  (not a disabled placeholder for others, to avoid confusing customers)"* — so this milestone had no
  open decision to make; it was UI catching up to a decision the data model already enforces
  (`collections/Orders.ts`'s `paymentMethod` field is a `select` with exactly one option, `'COD'`). Per
  the Testing line ("no radio group needed"), **both** radio inputs are gone, not just Stripe's — a
  single always-true option has no business being a radio group. COD now renders as a plain
  `"Cash on Delivery (COD)"` label. `paymentMethod` changed from `useState('COD')` to a plain
  `const paymentMethod = 'COD'`: nothing can set it to anything else anymore, so the setter was dead
  weight; the constant stays, declared but not yet read within this file, for `M33` to consume when it
  builds the real order. Verified with a scripted headless-Chromium session against a live
  `npm run start` server with seeded data: no "Stripe" text anywhere on the page, zero
  `<input type="radio">` elements, COD still shown, and "Place Order" still navigates to `/orders`
  unaffected. `npm run type-check` and `npm run build` both pass; `/cart` remains `○ Static`, client JS
  dropped slightly (4.35 kB → 4.25 kB) from the removed radio-group logic.

- **`M31` — real guest address capture, Pakistani fields (2026-08-26)** — `AddressModal.jsx`'s submit
  handler did nothing before this; it just closed the modal. It now captures `name`, `phone`, `email`,
  `address`, `city`, `area` (phone ordered ahead of email, per the milestone's "phone-first" goal) and
  dispatches `addAddress` — a reducer that already existed in `lib/features/address/addressSlice.js`
  (added at `M28` in anticipation of this milestone) but had never been called. The field set matches
  `collections/Orders.ts`'s embedded guest-address fields exactly
  ([ADR-021](./DECISIONS.md#adr-021-guest-orders-use-embedded-address-fields-not-a-customers-collection)),
  so `M33` can map it straight onto an order with no translation layer later. `email` is kept on the
  form by explicit stakeholder decision even though `Orders` has no email column today — captured
  against a possible future order-notification use rather than dropped and re-added later. `phone`
  gets an 11-digit, leading-zero HTML5 pattern (`03XXXXXXXXX`) with a descriptive validation message.
  **Scope note, stakeholder-approved**: `components/OrderSummary.jsx` was pulled in alongside
  `AddressModal.jsx` — its two address-display lines referenced `.state`/`.zip`, fields the new form no
  longer produces, and would have shown a newly submitted address with blank fields on every field the
  removed columns used to fill. Both lines now read `.address`/`.area`/`.city` instead. **Found but not
  fixed**: the dummy seed address (`addressDummyData`, `lib/features/address/addressSlice.js:5-16`, not
  on this milestone's Files line) still uses the old shape and now renders as `"John Doe, , , New York"`
  in the dropdown — blank fields, not literal "undefined" text (React silently drops `undefined` JSX
  interpolations; this corrects an assumption from the milestone's own dry run, which had predicted the
  word "undefined" would appear). Verified with a scripted headless-Chromium session (18 checks) against
  a live `npm run start` server with seeded data: correct field set and order, no leftover
  `state`/`zip`/`country` inputs, a submitted address appears in `OrderSummary`'s dropdown and renders
  correctly when selected, required-field and phone-pattern validation both work (a 5-digit number fails,
  `03001234567` passes), and two addresses added in one session both persist. `npm run type-check` and
  `npm run build` both pass; `/cart` remains `○ Static`.

- **`M30` — cart persistence across page reloads (2026-08-26)** — the cart no longer empties on
  refresh. `lib/features/cart/cartSlice.js` gains a `hydrateCart` reducer that replaces `cartItems`
  wholesale and recomputes `total` from it, rather than trusting a persisted total — so a stored total
  can never drift from the items it actually matches. `app/StoreProvider.js` dispatches `hydrateCart`
  from `localStorage` **inside a `useEffect`, after mount** rather than during initial state: the
  navbar's cart badge (`state.cart.total`) is server-rendered on every storefront route via the shared
  layout, so hydrating synchronously would mismatch the server's always-empty HTML against the client's
  restored state. A `store.subscribe` callback persists `cartItems` on every mutation — `clearCart`
  needed no special case, since it writes `{}` like any other mutation. Both the read and write paths
  are wrapped in `try`/`catch`, and the read path validates each entry (rejects non-objects, arrays, and
  non-positive/non-integer quantities), so corrupted or inaccessible storage degrades to an empty cart
  instead of crashing every route `StoreProvider` wraps. Implemented per
  [ADR-023](./DECISIONS.md#adr-023-cart-state-stays-redux-with-localstorage-persistence-added), recorded
  ahead of time so this milestone would not have to reopen "which state library" — Redux stays, only
  persistence was added, and no component outside the two changed files needed touching, as the ADR
  predicted. `lib/store.js` was deliberately left out of scope by choosing the `subscribe` approach over
  a `preloadedState` one. Verified with a scripted headless-Chromium session (17 checks) against a live
  `npm run start` server with seeded data: items survive a hard reload with zero hydration-mismatch
  console warnings; malformed JSON, a non-object value, and an array in storage all degrade to an empty
  cart with no crash; deleting all items via the cart page's real delete control clears storage to `{}`
  and stays empty after a further reload; and a directly-seeded `{"1": 2, "2": 3}` hydrates to a navbar
  badge of `5`, confirming the total is derived, not trusted. `npm run type-check` and `npm run build`
  both pass; `/cart`, `/categories`, and `/orders` remain `○ Static`. Also corrected two stale
  `docs/TASKS.md` entries ("Guest order-lookup key…" and "Cart state mechanism…") that were already
  resolved by ADR-024/ADR-023 on 2026-08-18 but never checked off — a `C`-class doc-drift finding this
  milestone's own dry run caught.

- **`M29` — real product search (2026-08-26)** — `/shop`'s search is now a database query, not an
  in-memory `.includes()` filter over the fetched array. `lib/payload/products.ts`'s `getProducts()`
  gains an optional `search` option, applied as `where: { name: { contains: trimmedSearch } } }` only
  when non-empty; `app/(public)/shop/page.jsx` passes `search` straight through and no longer filters
  client-side. The contract — case-insensitive substring match on `name` only — is locked in
  [ADR-025](./DECISIONS.md#adr-025-m29-product-search-is-a-case-insensitive-contains-match-on-name-only),
  written *before* implementation after empirically confirming Payload's `contains` operator maps to
  Postgres `ILIKE` (retiring the dry run's highest-rated risk: a naive port to raw `LIKE` would have
  silently broken every mixed-case search, and no existing gate would have caught it). Verified
  against a live `npm run start` server with real seeded data across ten cases — exact/lower/upper/
  mixed case, mid-string substring, multi-match, non-match (HTTP 200, empty grid, not an error), empty
  search string (full listing), and a `description`-only term correctly returning nothing. The home
  page's separate `getProducts()` call is unaffected. `npm run type-check` and `npm run build` both
  pass; `/shop` stays `ƒ Dynamic`. `npm run lint` and the Docker registry-egress gap were explicitly
  out of scope for this milestone and remain as previously documented.

- **AI engineering team foundation (2026-08-19)** — added `.claude/`, a **development-time**
  engineering system: eight roles (Engineering Manager orchestrating Product, Architecture,
  UI/UX, Full-Stack, QA, Security/Performance, and DevOps/Release), five slash commands
  (`/milestone`, `/milestone-dryrun`, `/team-status`, `/write-adr`, `/escalate`), six process
  documents (workflow, roles, gates, parallelism, conventions, production-AI isolation), and a
  permissions file that denies destructive Git/Docker operations and gates pushes, installs,
  seeds, and migrations behind an explicit ask. `CLAUDE.md` remains the constitution,
  `MIGRATION_PLAN.md` remains the authoritative roadmap, and its milestone IDs remain the only
  units of work — the team executes that system rather than replacing it. **No application code
  was changed and no application functionality was touched**; `package.json` is untouched.
  Human approval is required before any merge or deploy. Full account, including the classification
  of every previously identified blocker and an `M29` dry run, in
  [AI_TEAM_READINESS_REPORT.md](./AI_TEAM_READINESS_REPORT.md).

- **`CONTRIBUTING.md` rewritten (2026-08-19)** — the inherited GreatStack guide actively solicited
  "Vendor Dashboard", "Vendor Onboarding", "Vendor Profiles", and multi-vendor cart contributions,
  all of which [ADR-006](./DECISIONS.md) puts permanently out of scope, and the root `README.md`
  endorsed it as still applying. Replaced with a single-store guide carrying the hard constraints,
  the real setup steps, the honest state of the verification gates, and an explicit "Out of scope"
  table citing ADR-004/005/006/016/017. This was the highest-severity contradiction in the
  repository for any contributor or agent that read it first.

- **Root `README.md` status corrected (2026-08-19)** — it still claimed `M14` was the next milestone
  and that "the storefront itself still runs on the inherited dummy data", both false since `M28`.
  Now states `M1`–`M28` Done with `M29` next, gives working setup instructions, and records that
  `npm run lint` is broken and no test framework exists yet.

- **`.claude/` excluded from Docker images (2026-08-19)** — the `Dockerfile` copies the build context
  with `COPY . .`, so development-time AI tooling would have been baked into every image. Added to
  `.dockerignore`. No runtime dependency existed either way, but the shipped image must not carry it.

- **`prompts/` retired in favor of `.claude/commands/` (2026-08-19)** — the directory was created for
  AI prompt templates and never populated. Its README now points at `.claude/commands/` and
  `.claude/agents/`, removing the second competing home for the same thing.

- **Currency symbol fixed to `Rs. `** (2026-08-17) — `.env.example`'s `NEXT_PUBLIC_CURRENCY_SYMBOL` and the hardcoded `|| '$'` fallback in `ProductCard.jsx`, `Hero.jsx`, `OrderSummary.jsx`, `OrderItem.jsx`, `ProductDetails.jsx`, and `app/(public)/cart/page.jsx` all changed from `$` to `Rs. `. Full PKR formatting (comma grouping, decimals) stays with `M55`; this only fixes the symbol shown everywhere right now.
- **Mobile navbar cart/search access restored** (2026-08-17, pulled forward from `M44`). `components/Navbar.jsx` gained a `flex sm:hidden` row — Shop link, search toggle, cart link with count badge — closing the gap where the mobile navbar had nothing but the logo after `M21` removed the dead Login button.

- **Four production-prep milestones inserted (2026-08-18)**: `M52a` (run `payload migrate` as an explicit production deploy step, closes `R9`), `M48a` (remove the non-functional `Newsletter.jsx` signup form, closes `R11`), `M55a` (storefront copy correctness pass — real `Settings`-backed contact info in `Footer.jsx`, remove `ProductDetails.jsx`'s false "Free shipping worldwide" claim, closes `R12`), and `M56a` (one golden-path Playwright E2E test + a CI job, sequenced before `M57`'s manual regression pass, closes `R7`). All four are design/scheduling only — `MIGRATION_PLAN.md` and `PHASE_1_READINESS_REPORT.md` are updated; none are implemented yet.

- **New milestone `M33a` inserted (2026-08-18)** — "Enforce stock at order creation," closing readiness risk `R5`. `FEATURE_MATRIX.md` calls out-of-stock enforcement launch-critical for COD; `Products.inStock` has existed since `M10`, but `M33`'s order-creation milestone never validated it. `M33a` requires server-side re-validation of every line item's `inStock` at order-creation time, rejecting the whole order if any product is unavailable. Design only — implementation depends on `M33`, which is Not Started.

- **Two pre-checkout ADRs recorded (2026-08-18)**, ahead of the `M30`–`M36` checkout group. [ADR-023](./DECISIONS.md#adr-023-cart-state-stays-redux-with-localstorage-persistence-added) closes readiness finding `D10`: cart state stays Redux, `localStorage` persistence is added to the existing slice (not a state-library swap). [ADR-024](./DECISIONS.md#adr-024-guest-order-lookup-via-a-dedicated-ordernumber-phone-endpoint--orders-collection-access-stays-admin-only) closes `C7` and `D9`: guest order lookup is a dedicated `(orderNumber, phone)` server action, rate-limited by IP, that never relaxes `Orders`' admin-only collection access from `M13` — the "improvised fix" (opening collection read) the readiness report warned would leak every customer's name, phone, and address.

- **`M28` (2026-08-18)** — `assets/assets.js` and every image it imported (product photos, hero banners, profile pictures, plus the unused `gs_logo.jpg`/`upload_area.svg`) are deleted, along with `lib/features/product/productSlice.js` and `lib/features/rating/ratingSlice.js`; `lib/store.js` trimmed to `cart` + `address`. **Fixed a real, already-live bug found while verifying this milestone's premise**: `/cart` resolved line items against the dummy `productSlice`, which nothing had populated with real data since `M23`–`M25` gave every reachable product a real Payload ID — the cart had been silently dropping every item added from a real product page since `M25` shipped. Fixed via a REST fetch (`GET /api/products?limit=0&depth=1`), the same client-component pattern `CategoriesMarquee.jsx` uses (`M27`). Also fixed: `OrderItem.jsx`'s star-rating block (read the deleted `ratingSlice`, a forced pull-forward from `M46`, whose file list is corrected to note this); `OurSpec.jsx` and `addressSlice.js`'s small data literals inlined into their sole consumers; `orders/page.jsx`'s dummy order data inlined image-free (still fully dummy — `M36` replaces it with real guest lookup); `Hero.jsx`'s three deleted hero images replaced with gradient placeholders. Verified against a live `npm run start` server and a real headless-Chromium browser check: all seven storefront routes return 200, and adding a real product to cart now renders correctly (name, category, price, quantity, total, image) instead of "Your cart is empty." `npm run type-check` and `npm run build` pass.

- **`M27b` (2026-08-18)** — added `app/(public)/categories/page.tsx` and `loading.tsx`, the catalog-wide landing page. Cards render every top-level category from `M22`'s `getTopLevelCategories()` (already ordered by `displayOrder` then title) with children as sub-link chips, all targeting `/category/[slug]`. `revalidate = 3600`. Unlike `M27a`'s detail route, this route has no `notFound()` path, so it doesn't hit the `loading.tsx`/Suspense status-code conflict documented there — `loading.tsx` ships here exactly as scoped. Also closes the temporary gap `M27a` flagged: the product-page and marquee breadcrumb's `/categories` link now resolves (200) instead of 404ing. Verified against a live `npm run start` server: top-level categories render with working child links, metadata present, and the previously-logged console 404 on `/category/electronics` (from prefetching `/categories`) is gone. `npm run type-check` and `npm run build` pass; `/categories` is static with a 1h revalidate window.

- **`M27a` (2026-08-18)** — added `app/(public)/category/[slug]/page.tsx`, `not-found.tsx`, and `error.tsx`, the storefront's first customer-facing category route. Parent slugs roll up their own plus every child's products; child slugs list only their own with a working parent breadcrumb; pagination (`?page=N`, 24/page), canonical URLs, and `rel=prev`/`next` all ship per `CATEGORY_REQUIREMENTS.md`. `generateStaticParams` (built from `M22`'s `getTopLevelCategories()`) plus `revalidate = 3600` deliver static-by-default rendering. `CategoriesMarquee.jsx`'s bare `<button>`s became `next/link` anchors, and the product-page breadcrumb (`M25`) now links its category. **`loading.tsx` was deliberately not added**: empirical isolation testing against a live server proved that a `loading.tsx` file on this route makes `notFound()` return HTTP 200 instead of 404 for both the unknown-slug and out-of-range-page cases, because it wraps the segment in a `<Suspense>` boundary that flushes a 200 status before the awaited page component can call `notFound()` — confirmed independent of `error.tsx`, `generateMetadata`, and the SSG-vs-dynamic rendering choice. Since crawlers never see a loading skeleton and correct 404 status codes are this route's core SEO purpose, status correctness won; full details in `MIGRATION_PLAN.md`'s `M27a` entry. Verified against a live `npm run start` server: parent/child rollup, a genuinely empty category (200 + empty state, via a temporary debug route since no seeded category is naturally empty), unknown slug (404), out-of-range page (404), and a simulated query failure (500 via `error.tsx`) all behave correctly; `npm run type-check` and `npm run build` pass.

- **`M27` (2026-08-18)** — `CategoriesMarquee.jsx` gained `'use client'` and now fetches all categories from Payload's public-read REST API (`GET /api/categories?limit=0&sort=displayOrder,title&depth=0`) in a `useEffect`, replacing the hardcoded `assets/assets.js` array. REST rather than the `M22` Local API utilities: the marquee is nested inside `Hero.jsx`, itself `'use client'` (`Hero`'s own server-component conversion is `M40`'s pass), and a client component can't call the Local API — this is the fallback path `lib/payload/categories.ts` already documents for exactly this case. Items stay inert bare `<button>`s with no `onClick`/`href`, unchanged from today; `M27a` still owns turning them into links to `/category/[slug]`. Verified in a real headless-Chromium browser (Playwright) against a live `npm run start` server: the marquee renders the three seeded categories ("Electronics & Gadgets", "Headphones", "Speakers") with zero console/page errors.

- **`M26` (2026-08-18)** — deleted the guarded store-attribution block `M25` left in `ProductDescription.jsx` (`{product.store && (...)}`), its now-unused `Image`/`Link`/`ArrowRight` imports, and its dead link to the already-deleted `/shop/[username]` route. With `M25`'s Reviews-tab removal, the file had no remaining client state, so it also dropped `'use client'` and now renders as a server component. Verified against a live `npm run start` server: `/product/3` still renders correctly with no "view store", "/shop/", or "Product by" text in the response. `/product/[productId]`'s client JS dropped 123 kB → 120 kB First Load JS.

- **`M25` (2026-08-18)** — `app/(public)/product/[productId]/page.jsx` converted from a Redux-lookup client component to an async server component reading `getProductById()` from `lib/payload/products.ts` (already implemented at `M22`), calling `notFound()` when a product doesn't exist instead of rendering a blank page. `force-dynamic`, same reasoning as `M23`'s home page. **`ProductDetails.jsx` and `ProductDescription.jsx`'s dummy star-rating UI moved from `M46` into `M25`** — same class of forced pull-forward as `ProductCard.jsx` at `M23`: both read `product.rating`, which real products don't have, and would have thrown before rendering. `ProductDescription.jsx`'s Reviews tab is removed outright (it existed only to render that field; Reviews are out of scope per ADR-016). Both files now resolve `images`/Media relationships to `.url`, mirroring `ProductCard.jsx`'s `M23` fix. `ProductDescription.jsx`'s store-attribution block is guarded (`product.store &&`) rather than deleted — real products have no `store` relationship, so it renders nothing, but the deletion itself (and its dead `/shop/[username]` link) stays `M26`'s job as scoped. Verified against a live `npm run start` server: `/product/3` renders correct name/price/category/image with no "Reviews" text and no server errors; `/product/99999` returns a real HTTP 404. `/product/[productId]` moved `○ Static` → `ƒ Dynamic`.

- **`M24` (2026-08-18)** — `app/(public)/shop/page.jsx` converted from a client component reading Redux dummy data to an async server component reading `getProducts()` from `lib/payload/products.ts` ([ADR-007](./DECISIONS.md) — SEO-first/mobile-first are non-negotiable defaults for storefront UI, not a later pass, matching the precedent set by `M23`). The `?search=` filter stays the same simple in-memory `.includes()` match it was against the dummy data; `M29` is still the milestone that replaces it with a real Payload query. The "go back to all products" control changed from an `onClick`/`router.push` handler to a plain `<Link href="/shop">`, since the page no longer needs client-side interactivity to render its data. Verified against a live `npm run start` server with seeded data: real product names render server-side, `?search=Bluetooth` includes "Bluetooth Speaker" and excludes "Universal Charger", an unmatched search renders a clean empty grid (HTTP 200, no errors). `/shop` moved `○ Static` → `ƒ Dynamic`, client JS 1.15 kB → 626 B.

- **`M23` (2026-08-17)** — home page wired to real Payload data as a server component. `LatestProducts` sorts by `-createdAt`; `BestSelling` reads a new admin-curated `isFeatured` checkbox on `Products` (**ADR-022** — Reviews, the dummy data's original ranking basis, are out of scope per ADR-016, and no sales aggregation exists; a curated flag was chosen over a fabricated proxy metric). `lib/payload/products.ts` gains `getFeaturedProducts()`; `scripts/seed.ts` flags two products so a seeded database renders a populated home page. **`components/ProductCard.jsx` moved from `M46`'s file list into `M23`'s** — it called `product.rating.reduce()` on a field real products lack (a `TypeError`, not cosmetic) and passed a Media object where `next/image` needs a URL string, so `M23` could not render at all until both were fixed. **`app/(public)/page.jsx` is `force-dynamic`**: static prerendering would freeze the curated section until redeploy and would require a live database during the production build. `/` moved from `○ Static` to `ƒ Dynamic`; the page's client JS shrank 2.88 kB → 1.97 kB as the sections stopped shipping Redux.

- **`M22` (2026-08-17)** — `lib/payload/categories.ts` (`getTopLevelCategories()`, `getCategoryBySlug()`, `getProductsByCategory()` with descendant rollup) and `lib/payload/products.ts` (`getProducts()`, `getProductById()`), both using Payload's Local API for server-side consumption. Verified against seeded data with a temporary route (deleted before committing): the category rollup is exact — a parent slug returns its own products plus every child's, a child slug returns only its own. Two open items surfaced and left for later milestones rather than resolved here: `getProducts()`'s `sort` has no default for "best selling" (no ranking data exists in the current schema; `M23` must choose one), and types in both files are hand-written rather than generated (`payload generate:types` hits the sandbox's `tsx`/Node ESM-interop issue).

- **`M15`/`M18` (2026-08-17)** — deleted the remaining orphaned/multi-vendor routes: `app/(public)/create-store/page.jsx`, `app/(public)/shop/[username]/page.jsx`, `app/(public)/pricing/page.jsx`, `app/(public)/loading/page.jsx`. Removed the now-dead "Create Your Store" and "Become Plus Member" links from `components/Footer.jsx` inline, per both milestones' testing notes (`M48`'s Footer cleanup is too far away to leave them dead in the meantime). `components/Loading.jsx` (imported by the deleted pages) was left in place — a generic reusable component, not itself dead. One dead link deliberately not fixed here: `ProductDescription.jsx`'s "view store" link now points at the deleted `/shop/[username]` route; `M26` already owns removing that block and already depends on `M15`.

- **`M20`–`M21` (2026-08-17)** — admin-only auth confirmed end to end. `M20`'s audit found **no custom or faked authentication anywhere**: no middleware, no auth dependency, no `isAdmin`/`isSeller` bypass surviving the multi-vendor removal, and no customer-facing route requiring or simulating a login (all nine return 200 logged out). Payload's `/admin` is the sole authenticated surface — logged out it serves the login screen and leaks no collection data, and unauthenticated `GET /api/users`/`GET /api/orders` return 403. No fixes were required, so `M20` changed no files. `M21` then removed the dead desktop and mobile "Login" buttons from `components/Navbar.jsx` (no handler, and customers never authenticate under guest-checkout-only, [ADR-005](./DECISIONS.md#adr-005-guest-checkout-no-customer-accounts)). Recorded a follow-on gap against `M44`: the navbar's real navigation is `hidden sm:flex`, so with the Login button gone the mobile navbar is now just the logo — no cart link, no nav. Pre-existing rather than caused by `M21`, and deliberately left to `M44`'s mobile-first audit.

- **`M6`–`M13`, `M13a` implemented (2026-08-17)** — the full Payload data model: `collections/Users.ts` (admin-only auth), `collections/Media.ts` (local-volume uploads), `collections/Categories.ts` (two-level hierarchy, stable slugs, `beforeValidate` slug generation, `parent`-depth validation), `collections/Products.ts` (name/description/mrp/price/images/category/inStock, mirroring the retired Prisma schema's field shape), `collections/Orders.ts` (embedded guest fields, line items with a per-item price snapshot, `orderNumber`/`orderTotal`/`shippingCost`/`discountAmount`, COD-only `paymentMethod`, seven-value `status` enum), and `globals/Settings.ts` (store name/contact, `shippingFlatRate`, `freeShippingThreshold`). `M13`'s access control applied across all four collections; `scripts/seed.ts` added. `app/(payload)/api/graphql/route.ts` and `graphql-playground/route.ts` added, completing `M3`'s original "REST/GraphQL API" goal. All registered in `payload.config.ts`. Closes readiness risks `R4` and `R6`. Verified end to end via REST/GraphQL against a live dev server; `scripts/seed.ts` itself is unverified by direct execution (sandbox `tsx`/Node ESM-interop issue, unrelated to the script). Readiness finding `C7` (Orders access vs. `M36`'s guest-lookup need) remains open, confirmed but not resolved by this work.
- **`M6` gate cleared (2026-08-16)** — the six decisions blocking Payload collection design are made and recorded:
  - **ADR-016**: Reviews are out of scope for v1 (`M46` executes removal).
  - **ADR-017**: Coupons are out of scope for v1 (`M47` executes removal).
  - **ADR-018**: Shipping model — flat rate + free-shipping threshold, admin-configurable, snapshotted onto each order at creation. Introduces new milestone **`M13a`** (Settings global), closing readiness risk `R6`.
  - **ADR-019**: Order status set gains `CONFIRMED` (pre-dispatch phone confirmation, standard for Pakistani COD), `CANCELLED`, and `RETURNED`.
  - **ADR-020**: Media storage backend is a local Docker volume for v1; Cloudflare R2 named as the designated successor.
  - **ADR-021**: Guest `Orders` use embedded address fields, not a `Customers` collection — formally records what `M11` already assumed.
  - `M8`, `M11`, `M12`, `M34`, `M38`, `M54` updated to reflect these decisions; `M46`/`M47` reframed from "decide" to "execute the decided removal." Milestone count moves from 62 to **63**.
- **`M14`** — deleted the vendor dashboard (`app/store/**`, `components/store/**`), clearing the multiple-root-layouts precondition ahead of `M3`.
- **`M3`** — scaffolded and mounted an empty Payload CMS v3 instance (no collections yet): `payload.config.ts` wired to Postgres via `DATABASE_URI`; `/admin` and `/api/*` mounted inside the Next.js App Router per ADR-009. Required restructuring `app/layout.jsx` into `app/(public)/layout.jsx` (Next.js's multiple-root-layouts pattern, since Payload's `RootLayout` renders its own `<html>`/`<body>`) and changing `tsconfig.json`'s `moduleResolution` from `node` to `bundler` to resolve Payload's package `exports` subpaths.
- **`M4`** — retired the unwired `prisma/schema.prisma` and the now-empty `prisma/` directory, per ADR-003.
- **`M5`** — added a development `Dockerfile` (single `dev` stage) and `.dockerignore`. `docker build --target dev .` could not be fully verified in the authoring sandbox (Docker Hub registry pull blocked by environment egress policy) — needs a real-registry build check.
- **ADR-014**: `M14` is a hard prerequisite of `M3`, not an order-independent milestone — a second precondition (Next.js multiple-root-layouts restructuring) found during `M3` analysis, distinct from the existing `app/admin/**` route-collision precondition owned by `M16`/`M17`/`M19` (Accepted 2026-08-16).
- **ADR-015**: Initial production infrastructure baseline — Cloudflare Free + ~$10–12/month VPS + self-hosted PostgreSQL + Resend free-tier email + COD only; SMS deferred to a future phase; backups managed manually at launch; baseline kept replaceable/upgradable without an application rewrite (Accepted 2026-08-16).

### Changed

- **Documentation synchronized with actual repository state (2026-08-16).** Corrected stale claims that implementation had "not begun" and that `M3` was "the next milestone" — `M1`, `M2`, `M2a`, `M16`, `M17`, and `M19` are **Done**; `M14` is the next milestone, and `M3` is blocked on it per ADR-014. Updated across `CLAUDE.md`, `docs/TASKS.md`, `docs/MIGRATION_PLAN.md` (execution-order section, critical-path diagram, `M3`/`M14` entries, group ordering note, summary table), `docs/ARCHITECTURE.md` (`/admin` ownership note, production-readiness section), `docs/PROJECT_SPEC.md` (notifications open question), and `docs/PHASE_1_READINESS_REPORT.md` (new post-audit correction subsection; `D8`/`D12` status updated to Partial). Audit 1's and Audit 2's original text was not edited — only status/table cells and new appended sections.

- **`M27a`, `M27b`** — two new milestones covering customer-facing category browsing: `/category/[slug]` (detail + paginated product listing, parent/child navigation, marquee and breadcrumb links) and `/categories` (landing index). Decimal IDs, no renumbering of `M1`–`M59`; the plan moves from 60 to **62** milestones. Closes readiness finding `C8` — *"category browsing assumed by four milestones and built by none."*
- **`docs/CATEGORY_REQUIREMENTS.md`** — behavior specification the two milestones implement against: routes, purpose, URL structure, parent/child behavior, product relationship, SEO requirements, empty/loading/error states, pagination expectations, out-of-scope filtering, responsive expectations, and the `Categories` field list.
- **ADR-013**: category browsing ships in Phase 1 as dedicated slug routes with a two-level hierarchy (Accepted 2026-08-16) — dedicated routes over `/shop?category=` filtering, two-level parent/child, descendant rollup on parent pages, page-number pagination.
- **`M17`** — `docs/MIGRATION_PLAN.md`'s `M17` interim-state note extended: `/admin/coupons` stays live (200) after this milestone, now with no layout chrome, since its wrapper (`app/admin/layout.jsx`) is deleted here while the page itself is not deleted until `M19`. Recorded as expected migration debt, not a regression — the `isAdmin` gate it loses was never real.
- **`M2a`** — TypeScript toolchain established: `tsconfig.json` (strict mode, `allowJs: true`, `checkJs: false`, `@/*` path alias carried over from `jsconfig.json`), `next-env.d.ts` (committed per Next.js convention), and a `type-check` script (`tsc --noEmit`). `typescript`, `@types/node`, `@types/react`, `@types/react-dom` added as `devDependencies`. No `.jsx` file converted; nothing type-checked yet.
- **ADR-012**: TypeScript pinned to the `5.x` line (`^5.9.3`), not the `latest` npm tag — which resolved to `7.0.2`, a same-day-fresh native compiler rewrite (Accepted 2026-08-14).
- **`M2`** — Payload CMS v3 dependency stack: `payload`, `@payloadcms/db-postgres`, `@payloadcms/next`, and `@payloadcms/richtext-lexical` (all pinned to `3.88.0`), plus `graphql` and `sharp` as direct dependencies. No configuration, no application code — nothing imports Payload yet.
- **ADR-011**: Payload v3 dependency set — exact version pins, the raised Next.js floor, and patched `sharp` (Accepted 2026-08-14).
- **`M1`** — `docker-compose.yml` with a PostgreSQL 17 service for local development: pinned Alpine image, healthcheck, named volume for persistence, and a loopback-bound published port. First implementation milestone; no application code touched.
- **`M1`** — `DATABASE_URI` added to `.env.example` alongside commented overrides for the compose service's credentials.
- **ADR-010**: the PostgreSQL connection string is named `DATABASE_URI` (Accepted 2026-08-14), not the Prisma-era `DATABASE_URL`, and not both. Closes the database-variable half of readiness risk `R10`.
- Initial documentation scaffolding for the GoCart Pakistan transformation: `docs/`, `prompts/` directories; root `README.md` (rewritten) and `CLAUDE.md`; `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`.
- `docs/REPOSITORY_ANALYSIS.md`, `docs/FEATURE_MATRIX.md`, `docs/MIGRATION_PLAN.md` — codebase audit, per-feature disposition, and the `M1`–`M59` milestone plan.
- `docs/PHASE_1_READINESS_REPORT.md` — readiness audit gating the start of implementation.
- **ADR-009**: Payload CMS runs embedded inside the Next.js application (Accepted 2026-08-14).
- **`M2a`**: new milestone establishing the TypeScript toolchain before any milestone authors a `.ts` file.

### Changed

- **`M9`** — expanded from a one-line goal with no field list to an explicit `Categories` schema: `title`, `slug` (unique, indexed, generated-then-stable), `parent` (self-relation, `hasMany: false`, two-level limit), `description`, `image`, SEO overrides, `displayOrder`. Gains an `M8` dependency (the `image` upload field targets the Media collection).
- **`M10`** — `Products.category` cardinality fixed at `hasMany: false` (one product, one most-specific category); parent category pages roll up children rather than requiring double-filing.
- **`M22`** — scope expanded to own the category queries and the descendant rollup: `getTopLevelCategories()`, `getCategoryBySlug()`, `getProductsByCategory()`. One implementation, so the routes and the sitemap cannot disagree.
- **`M27`** — **false acceptance test corrected.** It asserted *"clicking one filters/links correctly"* against a component that renders bare `<button>`s with no `onClick` and no `href`. `M27` now re-points the data only, leaving items inert (today's behavior, so no dead-link window); `M27a` makes them links.
- **`M41`, `M42`, `M44`** — gained `M27a`/`M27b` dependencies and the category routes in their file/scope lists. `M42` in particular could not previously have produced the sitemap its own goal describes.
- **Filters ≠ category browsing** boundary drawn across `docs/FEATURE_MATRIX.md` (Categories and Filters rows), `docs/PROJECT_SPEC.md` (browse flow + out-of-scope list), and `docs/MIGRATION_PLAN.md`'s scope note — a Future-Phase Filters row could previously be read as deferring category browsing itself.
- **`docs/ARCHITECTURE.md`** — added a target storefront route map and recorded the `Categories` `parent` self-relation.
- **`docs/PHASE_1_READINESS_REPORT.md`** — contradiction `C8` flipped from ⚠️ Open to ✅ Resolved, with a post-audit correction subsection. Audit 1's verbatim text was not edited.
- **`M2a`** — `jsconfig.json` deleted, superseded by `tsconfig.json`, which takes over the `@/*` path alias. `.gitignore`'s `next-env.d.ts` entry removed so the file can be committed, per Next.js convention; `*.tsbuildinfo` stays ignored.
- **`M2a`** — `MIGRATION_PLAN.md`'s `M2a` records the TypeScript version choice and cites ADR-012.
- **`M2`** — `next` upgraded `15.3.5` → `15.3.9`, the minimum version satisfying `@payloadcms/next`'s peer range (per ADR-011). Patch-level, same minor; the storefront builds to the same 19 routes. This also cleared a pre-existing **critical** Next.js advisory.
- **`M2`** — `MIGRATION_PLAN.md`'s `M2` records the Next.js floor and cites ADR-011.
- **`M1`** — `MIGRATION_PLAN.md`'s `M1` and `M52` now name the database connection variable `DATABASE_URI` instead of `DATABASE_URL`, per ADR-010.
- **ADR-003** promoted from `Proposed` to **Accepted** (2026-08-14), with its supporting evidence recorded.
- **Milestone IDs (`M1`–`M59`, `M2a`) are now the single authoritative execution sequence.** Phase/group names demoted to reporting labels across `CLAUDE.md`, `docs/TASKS.md`, `docs/MIGRATION_PLAN.md`, `docs/DECISIONS.md`, `docs/REPOSITORY_ANALYSIS.md`, and `docs/README.md`.
- **`M16`, `M17`, `M19` resequenced ahead of `M3`** to clear `app/admin/**` before Payload takes ownership of `/admin`, resolving a circular dependency and a Next.js parallel-route build failure.
- `M2` extended to install `sharp` alongside Payload and the Postgres adapter.
- Stale "multi-vendor vs. single-store is unresolved" framing removed from `docs/ARCHITECTURE.md`, `CLAUDE.md`, and `docs/TASKS.md`; ADR-006 has been Accepted since 2026-08-07.
- `docs/TASKS.md` rewritten as a milestone-keyed status roll-up with explicit `M1` and `M6` gates; planning marked **Done**.

- **No application code has been changed by any entry above.** The planning entries are documentation-only; `M1` added local development infrastructure and configuration; `M2` added dependencies to the manifest; `M2a` added the TypeScript toolchain without converting any existing `.jsx` file. The storefront still renders exactly as inherited.
