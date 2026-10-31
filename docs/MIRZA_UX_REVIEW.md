# Mirza storefront UX review (`M101`)

Milestone `M101` (Mirza brand migration + 10-issue UX pass). Decision record: [ADR-047](./DECISIONS.md).

## 1. Baseline review (before any code change)

- **Date:** 2026-10-31.
- **Target:** the live test site `https://gocart-test-inky.vercel.app/` (deployment
  `dpl_5nCzJ7eeSwJEX6n8KvxxLQC4evnH`, built from `main` before `M101`).
- **Method:** headless Chromium (Playwright). Full-page screenshots of 10 routes at 375, 390, 430, 768,
  1024 and 1440 px (60 screenshots). Automated checks on every one: HTTP status, horizontal overflow,
  interactive targets under 24 px, images with no `alt`, console errors, and any "GoCart" text in the
  page or title. Screenshots are kept out of git (local `review-shots/baseline/`).
- **Routes:** `/`, `/shop`, `/categories`, `/category/headphones`, `/product/24`, `/cart` (empty and
  with two products), `/orders`, `/wishlist`, and an unknown URL (404).
- **Not testable here:** submitting checkout or `/orders`. The test deployment has no Turnstile keys
  (owner decision 2026-10-30, [DEPLOYMENT_VERCEL_TEST.md](./DEPLOYMENT_VERCEL_TEST.md)), so both
  forms are disabled by design. `challenges.cloudflare.com` was also unreachable from the review
  machine.

**Automated results (all 60 page loads):** every route returned the expected status (200, and 404 for
the unknown URL). No horizontal overflow at any width. No image without `alt`. No "GoCart" text in any
rendered page. The under-24 px hits were only the skip link (1 x 1 until focused) and visually hidden
form inputs, so none are real.

### The 10 highest-impact problems

| # | Area | Severity | Evidence | Recommended fix |
|---|---|---|---|---|
| 1 | Brand identity | High | The code still defaults to "GoCart" (`globals/Settings.ts`, `lib/payload/settings.ts`, `components/Navbar.jsx`); the live site says Mirza only because of the admin Settings value. The home page's `og:title` repeats the brand: `Mirza - Gadgets & accessories, Cash on Delivery \| Mirza`. The positioning says "Gadgets" while half the catalogue is fashion, home and beauty. The logo is a generic four-bar equaliser mark with a two-tone violet wordmark. The footer shows `Demo Store, Sample Street, Placeholder City (fake address)` (admin Settings data). | Mirza defaults in code (with a migration), one brand suffix in titles, multi-category positioning, a plain wordmark. The fake address is data: the owner clears it in /admin (code must not hide real data). |
| 2 | Homepage hero | High | A lavender card with tilted product tiles, a pink "Starts from" sticker and three chips that wrap into an orphan row at 1440. At 375 the hero is about 1.6 screens tall before any product shows. Reads as a template, not a brand. | An editorial two-column hero: a clear headline, one supporting line, two CTAs, and a calm grid of real product photos. Compact on phones. |
| 3 | Design system | High | Saturated violet primary, hot pink, and six pastel category tints. Radii of 20-28 px on almost every surface. Violet prices. The tokens are named after colours (`lavender`), so changing the palette means renaming. | Warm neutral page and surfaces, near-black ink, one restrained deep-green accent and a muted terracotta for sale. Smaller radii (8-18 px), softer warm shadows. Values changed in the one `@theme` block. |
| 4 | Product cards | High | Frame within a frame: a square photo at 75 % size inside a randomly tinted tile inside a white card with a ring and a shadow. Up to three overlays on the image (status badge, heart, quick add) plus a "% OFF" pill row. Every Featured card says "Featured". | The image fills a neutral square tile (`object-cover`). One status badge at most, and none that repeats the section's name. Price in ink with the discount as text beside it. A quieter quick-add button. |
| 5 | Category discovery | Medium | The home page shows the top-level categories twice in a row (a circle row, then tinted cards with large line icons). | One category section on the home page: cards with the category's own image, name and subcategories, two columns on phones. |
| 6 | Product detail page | Medium | On desktop, a large empty area under the buy box. The price sits in its own boxed card. "Out of stock" shows three times (image badge, pill, button). The description is a collapsed accordion narrower than the gallery and info columns combined. | An unboxed price block, a single stock line, delivery and COD notes grouped under the buttons, and the description open by default. |
| 7 | Homepage merchandising | Medium | "Latest products" and "Featured" show the same products (e.g. Aloe Hydrating Gel Cream in both). Listing-page counts ("Showing 6 of 6 products") on the home page. Six featured products on a five-column grid leave an orphan card. The promo cards say "Summer Sale" and "Winter Sale" side by side (admin data). | New arrivals exclude the featured products. Remove the counts from home sections. Trim the grid to full rows. Promo copy is the owner's to edit in /admin. |
| 8 | Trust and confidence | Medium | The same three statements (delivery, cash on delivery, no account) appear in the announcement bar, the hero chips and the trust row on one screen-length of page. The "Online ordering is not available right now. Please contact us." message is small grey text under the total. Root cause: no Turnstile keys on this deployment, by owner decision, so it is correct that ordering is off. | Say each promise once: a static announcement line, no hero chips, one trust row. Show the ordering-off message as a clear notice. Never bypass the Turnstile check. |
| 9 | Mobile experience | Medium | The announcement bar scrolls continuously, so at 375-430 px it usually shows a sentence cut mid-word. The hero pushes all products below the first screen. Otherwise there is no overflow and the touch targets pass. | A short static announcement on phones. A compact hero. Keep the tab bar and the sticky buy bar. |
| 10 | Visual consistency and accessibility | Low | The 404 page has no `<h1>` (its heading is an `h2`). Radii, tints and badge styles differ between home, listing and product pages. | An `<h1>` on the 404 page. One set of tokens and one badge style everywhere. Focus rings in the new accent. |

Additional notes from the baseline (not in the top 10):
- Order numbers start with `GC-` (the `/orders` placeholder shows `GC-XXXXXXXX-XXXXXXX`). This identifier
  is kept on purpose: existing orders and their lookups depend on it (see the retained-identifier list
  in ADR-047).
- Cart and wishlist localStorage keys are `gocart:cart` and `gocart:wishlist`. Kept on purpose (the owner's
  rename list covers only `gocart:last-order`). Renaming them would empty every visitor's saved cart unless a
  fallback is added.

## 2. What `M101` changed, per problem

| # | Area | Change |
|---|---|---|
| 1 | Brand identity | `Mirza` code defaults plus a column-default migration. The og:title duplicate is fixed (`pageMetadata({ absoluteTitle })`). Multi-category positioning in the description, the home title, the hero and the footer. A deep-green "M" monogram and a one-colour wordmark (header, footer, favicon `app/icon.svg` + `app/favicon.ico`, admin logo). The demo seed writes no fake contact details. The live site's fake address is Settings data: **the owner clears it in /admin**. |
| 2 | Homepage hero | A two-column editorial hero on a warm sand panel: a positioning line, one supporting sentence, two CTAs, "Prices from", and a 2 x 2 grid of real in-stock products (two on a phone). No rotated tiles, sticker or chips. |
| 3 | Design system | `@theme` values only: warm neutrals (`page #F8F5F0`), warm ink, a deep-green accent (`#1F4A3A`), a terracotta sale colour, earthy category tints, one product-tile colour, radii 8-20 px, softer warm shadows. Headings are 700, not 800. Contrast is measured in the `globals.css` comment; every text pair is 4.5:1 or more. |
| 4 | Product cards | Full-bleed `object-cover` photo in one neutral tile with no card chrome. At most one label, and "Featured" is no longer one. Price in ink, with the MRP and "N% off" on the same line. White heart and quick-add buttons. |
| 5 | Category discovery | The home page has one category section (the phone-only circle row is removed). Tiles show the category's own image (4:3), name, child links and "Shop now". |
| 6 | Product detail | Full-bleed main image and thumbnails. An unboxed price. One stock line (dot + word); the image no longer repeats "Out of stock". Buttons in green and ink outline. Delivery, COD and "no account" in one quiet list. The description has no card around it and uses 15 px text. |
| 7 | Homepage merchandising | "New arrivals" leave out featured products. No listing counts on the home page. Four new arrivals on a phone (full rows). Promo copy is admin data (**owner**). |
| 8 | Trust | The announcement bar is static. The hero chips are gone, so each promise is said in the bar and in one trust row. A blocked form ('disabled' or 'failed' Turnstile status) shows a visible notice that names the paused action; the check itself is unchanged. |
| 9 | Mobile | A short static bar on phones. A compact hero with side-by-side CTAs. Full rows of products. No horizontal overflow at 375-1440 (checked automatically). |
| 10 | Consistency and accessibility | The 404 page has an `<h1>`. One badge style. Focus rings in the new accent. The same tokens on every route. |

**Not done, and why:**
- **Stock photography (Unsplash):** the review machine's network policy blocked `images.unsplash.com` and
  `unsplash.com` on 2026-10-31, and the owner chose to add photos later. No third-party image is in the
  repository, so there is nothing to credit yet. The hero and the category tiles use the store's own
  product and category images.
- **Featured grid orphan on desktop:** the Featured section's category tabs change how many cards show,
  so an odd count can still leave one card alone on a row. Partly fixed (new arrivals use full rows).
- **Colour token names** (`lavender`, `pink`) are kept and reinterpreted (ADR-047), to avoid rewriting
  every component.

## 3. Branch review (before merge)

- **Date:** 2026-10-31. **Target:** a local production build (`next build` + `next start`) of the
  `M101` branch on PostgreSQL 16, seeded with `npm run seed:demo` (the same demo catalogue as the test
  site). A Vercel preview was not possible: the `gocart-test` project's `DATABASE_URI` is scoped to
  Production only, and the project has no Git-triggered deployments.
- **Method:** the same script and routes as the baseline, plus an in-stock product page, at all six widths.
- **Automated results:** every route 200 (404 for the unknown URL). No horizontal overflow, no image
  without `alt`, no "GoCart" text. Home `og:title` = `Mirza - Online shopping with Cash on Delivery in
  Pakistan` (once). The 404 page has an `<h1>`.

## 4. Live second review (after merge)

Pending. The owner merges, the test site is redeployed, migration `20261031_160131_mirza_store_name` runs
on Neon, and then the same review runs again on `https://gocart-test-inky.vercel.app/` at all six widths.
