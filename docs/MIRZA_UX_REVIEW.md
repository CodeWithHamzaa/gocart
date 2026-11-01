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
| 2 | Homepage hero | The owner's chosen mix: a banner slider ("C" mockup) of up to three slides built only from real data (`lib/hero-slides.ts`: the two biggest real discounts, linking to that category sorted by discount; the two newest products; the Settings free-delivery rule and the lowest price), with dots, arrows from `md`, swipe on a phone, and a pause button; it moves every 6 s but never on hover, focus, a hidden tab or reduced motion. Under it ("B" mockup): round category shortcuts (every department first, then sub-categories in turn) and one strip with cash on delivery, free delivery and no account. The first slide's heading is the page's `<h1>`; no product name is ever hidden. |
| 3 | Design system | `@theme` values only, "lavender wash" (the owner's choice from three lighter-violet options, after warm-neutral, bright-coral and minimal-green passes): page `#FCFAFF`, lavender wells and strips `#F1ECFF`, near-black ink (16.2:1), muted text `#636368` (4.6-5.8:1 on every surface), bright violet `#5F42EC` (white text 6.0:1, on lavender 5.2:1, on the soft violet 4.8:1), hot pink `#CC1966` for discounts (white 5.4:1, on lavender 4.7:1), amber `#FFC247` "Limited edition" labels with dark text (10.5:1). Labels are rounded pills. Every text pair is 4.5:1 or more. |
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
| 2 | Homepage hero | The owner's chosen mix: a banner slider of up to three slides built only from real data (`lib/hero-slides.ts`), round category shortcuts and one strip with the three promises under it (see section 1, row 2). No tile, caption or product name is ever hidden. |
| 3 | Design system | `@theme` values only, "lavender wash" (the owner's choice): page `#FCFAFF`, lavender wells `#F1ECFF`, soft violet `#E9E2FF`, bright violet `primary` `#5F42EC` for actions, hot pink `#CC1966` for discounts and sale labels, amber `#FFC247` "Limited edition" labels with dark text, near-black ink `#1D1D1F`, muted `#636368`. Pill buttons and labels, surfaces separated by tone with almost no shadow, semibold headings with tight tracking. Every text pair is 4.5:1 or more (table below). |
| 4 | Product cards | The home page's large card (`RailCard`), and the listing card (`ProductCard`) in the same look: lavender card, category, name, price with the struck MRP and a pink "N% off" pill, the photo full-bleed on a white tile at the bottom. At most one label, never "Featured". Heart and quick-add are siblings of the one stretched link. |
| 5 | Category discovery | Category shortcuts with images under the banner (every department first, then sub-categories, then "View all"), and from `md` one large tile per top-level category with its child links and image. The owner removed the phone category row because the shortcuts already cover it. |
| 6 | Product detail | Full-bleed main image and thumbnails. An unboxed price with the "N% off" pill. One stock line (dot + word). Pill buttons ("Add to Cart" violet, "Buy Now" soft violet). Delivery, COD and "no account" in one lavender list. The description is open by default. "You may also like" is a rail of large cards. |
| 7 | Homepage merchandising | "New arrivals" leave out featured products and, like "Featured", are a swipeable row of the large home cards (arrow buttons from `md`; Featured's category tabs still filter). No listing counts on the home page. Promo copy is admin data (**owner**). |
| 8 | Trust | The announcement bar is a static light-grey strip. The hero chips are gone, and the home trust row is replaced by three real cash-on-delivery steps (order without an account, delivery and its charge, pay the courier and track the order). A blocked form ('disabled' or 'failed' Turnstile status) shows a visible notice that names the paused action; the check itself is unchanged. |
| 9 | Mobile | A short static bar on phones. A compact hero with side-by-side CTAs. No horizontal overflow at 375-1440 (checked automatically). |
| 10 | Consistency and accessibility | The 404 page has an `<h1>`. One badge style. Focus rings in the new accent. The same tokens on every route. |

### Contrast of the pairs the pages use (WCAG 2.1, computed 2026-10-31)

| Text on background | Ratio |
|---|---|
| ink `#1D1D1F` on lavender `#F1ECFF` | 14.6:1 |
| ink-2 `#424245` on lavender | 8.7:1 |
| muted `#636368` on page / white / lavender / lavender-2 `#E5DCFF` | 5.8 / 6.0 / 5.2 / 4.6:1 |
| white on primary `#5F42EC` | 6.0:1 |
| primary on page / lavender | 5.8 / 5.2:1 |
| primary-dark `#4A2FD0` on white / soft violet `#E9E2FF` / lavender-2 | 8.1 / 6.4 / 6.1:1 |
| pink-dark `#A8144F` on pink-soft `#FFE4F0` (the "N% off" pill) | 6.1:1 |
| success `#0B6E4F` on white / lavender | 6.3 / 5.4:1 |

### 2b. Every other storefront page in the approved style

The owner approved the home page as it is at commit `94b2eae` and asked for the same style on every other
page, without changing what the pages do. Layout and classes only: prices, totals, the Turnstile check,
COD and the guest checkout are untouched.

| Page or part | What changed |
|---|---|
| Header | The search field and its button are pills; Shop, wishlist and cart get a lavender hover. The desktop category row is pills. Every control is still 44 px or more at 320 px. |
| Mobile tab bar | The active tab sits on a lavender pill. |
| Listing card (`/shop`, search, category pages, wishlist) | The home page's large card in a grid cell (see row 4). Two columns on a phone; the name is never clamped or hidden. |
| `/shop` and search | Semibold heading, the same card grid with wider gaps. The empty search result is the lavender empty state. |
| `/categories` (and its loading skeleton) | The home page's category tiles: a lavender card with the name, white child-category pills and the category image on a white tile. One column on a phone (a row: text left, square image right), two from `sm`, four from `lg`. |
| `/category/[slug]` | A lavender title panel (large semibold title, white subcategory pills, the category icon in a white circle from `sm`), a lavender Sort & filter panel with pill fields, white discount pills and a pill Apply button, and pill pagination. |
| `/product/[id]` | See row 6. |
| `/cart` | Each line is a lavender card (photo on a white tile, category, semibold name, price in ink, pill quantity stepper). The order summary is a lavender panel with white inner surfaces (address, delivery and payment cards, the paused-ordering notice) and a pill Place Order button. The undo notice is a soft-violet pill. |
| Address dialog | A lavender card over the blurred page, with pill fields, a pill SAVE ADDRESS button and a round Close button. Same name ("Add new address"), fields and validation. |
| `/orders` | A lavender panel with pill fields and a pill "Check order" button; the result card is lavender. |
| `/order-confirmation` | Semibold headings, a lavender order-number card with a pill Copy button, pill buttons. |
| `/wishlist` | A breadcrumb like the other listings, the same card grid. |
| Empty states, 404s, error | The empty-state panel is lavender with a white icon circle and a pill button. The category 404 now has an `<h1>` (it had none). The category error page uses the same heading and a pill button. |
| Footer | Unchanged (already lavender). |

**Checked on a local production build** (PostgreSQL 16, `npm run seed:demo`, no Turnstile keys like the
test site): 20 routes (including a filtered category, a no-match filter, an out-of-stock product, a cart
with items, a filled order confirmation and a wishlist with items) at 375, 390, 430, 768, 1024 and 1440 px,
120 page loads. Every route returned the expected status (200; 404 for the unknown URL and the unknown
category), with no horizontal overflow, no image without `alt`, no "GoCart" text and exactly one `<h1>`.
At 320 px: no overflow on eight main routes, and the header's Shop, Search and Cart are each 44 px or more.
At Pixel 7: every product name's first text match is visible on `/shop`, the four department pages and the
wishlist. Click tests: add to cart, the cart shows the name once, the address dialog opens and closes,
phone validation, the saved address is selected, Place Order stays disabled without a Turnstile token,
remove and undo, "Out of Stock" disabled, heart on and off, quick add, and category sort + discount filter
+ "Clear all". Not verified here: real Turnstile keys and the live test site (both after the merge).

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

- **Date:** 2026-11-01, after `M101` (PR #53) and `M102` (PR #54, flat categories) were merged and deployed
  (deployment `dpl_254K4bWXkz2nWdXJXKwwP9YxMnTP`, commit `a6aedc1`), with migrations
  `20261031_160131_mirza_store_name` and `20261101_205147_flat_categories` applied on Neon.
- **Target:** `https://gocart-test-inky.vercel.app/`.
- **Method:** the same script as sections 1 and 3: 21 routes (including a filtered category, a no-match
  filter, an out-of-stock product, a cart with items, a filled order confirmation, a wishlist with items, an
  unknown URL, an unknown category and the removed `/category/electronics`) at 375, 390, 430, 768, 1024 and
  1440 px: 126 page loads.
- **Results:** every route returned the expected status (200; 404 for the unknown URL, the unknown category
  and the removed category). No horizontal overflow, no image without `alt`, no "GoCart" text, exactly one
  `<h1>` per page. The sitemap lists the ten flat categories only. The store name is Mirza.
- **Not verified live:** placing an order or an order lookup (no Turnstile keys on this deployment, by owner
  decision); covered by CI's `e2e` job.
