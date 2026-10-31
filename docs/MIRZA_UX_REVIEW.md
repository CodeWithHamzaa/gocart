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
| 2 | Homepage hero | The owner's chosen banner ("V1" mockup): a centred statement, "Shop all products" and "Browse categories" as pill buttons, "Prices from", then one wide light-grey stage holding three real in-stock products (a swipeable row on a phone). No product or caption is ever hidden. |
| 3 | Design system | `@theme` values only, "minimal tech" (the owner's choice from three home-page mockups, after warm-neutral and bright-coral passes were rejected): white page, near-black ink `#1D1D1F` (16.8:1), light-grey surfaces `#F5F5F7`, muted text `#636368` (5.0-6.0:1 on white and both greys), deep-green accent `#0B6E4F` (white text 6.3:1, on grey 5.7:1), red `#BF1F2F` only for discounts (6.1:1). Every text pair is 4.5:1 or more. Pill buttons, 18-28 px radii on large surfaces, almost no shadow. |
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
| 1 | Brand identity | `Mirza` code defaults plus a column-default migration. The og:title duplicate is fixed (`pageMetadata({ absoluteTitle })`). Multi-category positioning in the description, the home title, the hero and the footer. A near-black "M" monogram and a one-colour wordmark (header, footer, favicon `app/icon.svg` + `app/favicon.ico`, admin logo). The demo seed writes no fake contact details. The live site's fake address is Settings data: **the owner clears it in /admin**. |
| 2 | Homepage hero | A two-column hero on a coral-to-saffron gradient with ink text: a positioning line, one supporting sentence, two CTAs, "Prices from", and a grid of real in-stock products (2 x 2 on a desktop and on a phone, at 4:3 on a phone; one row of four on a tablet). No tile or caption is ever hidden. No rotated tiles, sticker or chips. |
| 3 | Design system | `@theme` values only, bright and playful (the owner's choice after a first warm-neutral pass read as dull): peach-cream page `#FFF8F1`, coral-to-saffron hero gradient (`#FF6B4A` to `#FFB020`, ink text 5.9-9.2:1), deep coral `primary` `#BD3016` (white 5.8:1, on the page 5.5:1), magenta sale `#D6246E`, bright pastel category and product tiles, a coral announcement bar, a tinted footer, radii 12-26 px. Headings are 700, not 800. Every text pair is 4.5:1 or more (the yellow icon tint, 4.2:1, is used only for icons, which need 3:1). |
| 4 | Product cards | Full-bleed `object-cover` photo in one neutral tile with no card chrome. At most one label, and "Featured" is no longer one. Price in ink, with the MRP and "N% off" on the same line. White heart and quick-add buttons. |
| 5 | Category discovery | One category section with two forms (owner's choice): from `md`, one large light-grey tile per top-level category with its child links and image; on a phone, a swipeable row of round category images (parents then children, now with their own images) ending in "View all", plus "View all" in the heading. |
| 6 | Product detail | Full-bleed main image and thumbnails. An unboxed price. One stock line (dot + word); the image no longer repeats "Out of stock". Buttons in green and ink outline. Delivery, COD and "no account" in one quiet list. The description has no card around it and uses 15 px text. |
| 7 | Homepage merchandising | "New arrivals" leave out featured products and, like "Featured", are a swipeable row of the large home cards (arrow buttons from `md`; Featured's category tabs still filter). No listing counts on the home page. Promo copy is admin data (**owner**). |
| 8 | Trust | The announcement bar is a static light-grey strip. The hero chips are gone, and the home trust row is replaced by three real cash-on-delivery steps (order without an account, delivery and its charge, pay the courier and track the order). A blocked form ('disabled' or 'failed' Turnstile status) shows a visible notice that names the paused action; the check itself is unchanged. |
| 9 | Mobile | A short static bar on phones. A compact hero with side-by-side CTAs. No horizontal overflow at 375-1440 (checked automatically). |
| 10 | Consistency and accessibility | The 404 page has an `<h1>`. One badge style. Focus rings in the new accent. The same tokens on every route. |

**Not done, and why:**
- **Stock photography (Unsplash):** the review machine's network policy blocked `images.unsplash.com` and
  `unsplash.com` on 2026-10-31, and the owner chose to add photos later. No third-party image is in the
  repository, so there is nothing to credit yet. The hero and the category tiles use the store's own
  product and category images.
- **Orphan cards:** gone. New arrivals and Featured are swipeable rows (rails), so there are no grid rows to leave a card alone.
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
