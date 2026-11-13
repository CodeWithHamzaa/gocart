# Phase 3: shop, category, search and product pages (Milestone 119)

This document records what Milestone 119 changed on the catalogue and product pages, what it
deliberately did not change, and how it was checked. The owner authorized Phase 3 on 2026-11-13.
It builds on Phase 1 (the hybrid palette, Architecture Decision Record 052, and the shared `Button`
and `Price` components) and Phase 2 (the homepage). Nothing here changes the database schema, an
API, checkout logic or a dependency.

## What changed for a customer

**All listing pages (shop, search results, a category)**
- One header pattern (`components/ui/PageHeader.tsx`): a plain title, an optional one-line
  description, a product count, and a hairline underneath. On the shop and search pages it is used at
  every size. On a category page it is used below 1024px (phones and tablets), with the category's
  photo as a small round inset from the `sm` breakpoint (640px) up.
- **Owner review, 2026-11-13:** on a category page from 1024px (desktop and larger screens) the earlier
  look is kept: the lavender panel with the large title, the photo in a white circle, and the
  "Showing N products" line under the filters. The first version of this milestone had replaced it on
  every size; the owner preferred the earlier panel on large screens and the new header elsewhere.
- Below 1024px the count sits in the header, so the first product row starts higher on a phone.
- On a category page the product cards no longer repeat the category name on every card
  (`ProductCard` has a new `showCategory` prop; the shop, search and home still show it).
- The tablet grid gap is 16px (it was 12px).

**Shop and search**
- The shop has a sort control with the four orders the category pages already offer: Recommended,
  Price low to high, Price high to low, and Biggest discount. It is a plain form, so it works without
  JavaScript, and the result is a shareable address. A search keeps its words when the sort changes,
  and "Load more" keeps the sort.
- A sorted or searched view is not indexed by search engines; the plain `/shop` still is and
  keeps its canonical address.
- A search with no results now offers every category as a link under the empty message, so the
  shopper has a way on. A search with results says "5 results" next to "Clear search".

**Category page**
- On desktop the sort-and-filter panel is one row (it wrapped its Apply button onto a second row).

**Product page**
- From 768px the page has two columns (it was 1024px), so a tablet shows the photo and the buying
  information side by side. The thumbnails stay under the photo until 1024px, then become a column.
- On a phone the fixed bottom bar now shows the price (and the struck price and discount) above the
  buttons, so the price is in view wherever the shopper has scrolled. At 390px the name and price sat
  below the first screen before this change.
- On a phone the photo can be swiped left and right (a drag of at least 40px that is mostly
  horizontal). A vertical drag still scrolls the page. The thumbnails still work for taps and keyboards.
- The description's open and close mark is a chevron instead of a plus sign.
- "You may also like" falls back to "More to explore" (the newest in-stock products) when the
  category has fewer than two other in-stock products, so a small category no longer ends the page
  with nothing. It still shows nothing if even that finds fewer than two.

## What was not done, and why

| Audit item | Status |
|---|---|
| A bottom sheet for sort and filter on a phone | Not done. It needs client-side script and focus handling; the existing collapsible panel works without JavaScript. Open for a later milestone if the owner wants it. |
| Search box shows the current search words and has a clear button | Not done. The search box lives in the site header, which is shared by every page; prefilling it needs the header to read the address, which risks the static parts of the layout. Unverified whether that can be done safely. |
| Price and discount filters on `/shop` | Not done. Only the sort was in scope; the filters stay on category pages. |
| A ghost or text "Add" button on cards instead of the round cart button | Not done. The round button is the 44px touch target the mobile end-to-end test depends on. |
| Product brand, model, specifications and ratings | Not possible. The product has no such fields, and this milestone makes no schema change. Nothing was invented. |
| Wider search (description, category) | Not done. Matching stays on the product name only (Architecture Decision Record 025). |

## Rules that were kept

- No `loading.tsx` on `app/(public)/category/[slug]` (a loading file there makes a missing category return HTTP 200).
- `/shop`, `/` and the product page stay `force-dynamic`.
- "Featured" stays the admin's `isFeatured` flag; no tone or label value was added or renamed.
- The product page still has exactly one "Add to cart" button in the page.
- No prices, ratings, discounts, returns or delivery-time claims were added.

## Files

New: `components/ui/PageHeader.tsx`, `components/ui/SortControl.tsx`.
Changed: `app/(public)/shop/page.jsx`, `app/(public)/category/[slug]/page.tsx`,
`components/ProductCard.jsx`, `components/ProductDetails.jsx`, `components/ProductDescription.jsx`,
`components/RelatedProducts.tsx`, `components/ui/CategoryControls.tsx`, `components/ui/MobileTabBar.tsx`
(more room above the bottom bar on the product and cart pages, because the product bar grew by one line),
`lib/payload/products.ts` (new `getProductsSorted`; `getProducts` is unchanged).

## How it was checked

All of this ran in a development sandbox against a throwaway local PostgreSQL 16 with the demo seed
(`npm run seed:demo`) and a production build (`next build`, `next start`).

- Type-check and lint: no errors (the same 8 warnings as `main`).
- Unit scripts: environment, Turnstile, idempotency, category filters, users guard, demo images,
  search engine optimization, demo photo rollout and storefront content all pass.
- Sort order checked against the running shop: low to high ascends, high to low descends, "Biggest
  discount" orders by discount, a bad sort value falls back to Recommended with HTTP 200, only sorted
  or searched views carry the not-indexed marker, and "Load more" carries the sort.
- Swipe checked with real touch events at 390px: left and right change the photo and wrap, a
  20px drag and a mostly vertical drag do nothing, and there is still one "Add to cart" button.
- Captures at 390, 820 and 1440px of the shop, search results, empty search, category, category with
  the filters open, a discounted product, and an out-of-stock product (full page, plus the first screen
  for the product): no horizontal overflow and no console errors.
- The end-to-end suite was not run here (the pinned browser is not installed in this sandbox);
  continuous integration runs it on the pull request.
- Cart, checkout, order confirmation and order lookup were not changed and were not re-tested beyond
  loading them in the captures (that is Phase 4).

## Screenshots

`before/` is `main` as of the start of this milestone; `after/` is this milestone. Both come from
the same local build setup, with the generated demo artwork (not the owner's photographs), and a seed
default free-delivery threshold of Rs. 3,000 (the test site's setting is Rs. 1,500). Each set has
`mobile-390/`, `tablet-820/` and `desktop-1440/` with: `02-shop`, `03-search-results`,
`04-search-empty`, `06-category`, `07-category-filters-open`, `08-product` (and `-fold`), and
`09-product-out-of-stock`. The full-page captures show the phone tab bar once, partway down the page;
that is how a full-page capture draws a fixed bar, not a layout fault.

## Rollback

Revert the pull request. No data, schema or configuration is involved.
