# Storefront image QA (M107), 2026-11-03

**Result: no broken image, no sideways scroll and no missing alt attribute on any storefront route at 320, 390, 768, 1024 and 1440 px. Four small presentation gaps the photos exposed were fixed.** No schema, dependency, checkout, price, Orders, access-control, `images.unoptimized` or `/_next/image` change. Nothing was uploaded or deployed.

Related: [PHOTO_INVENTORY.md](./PHOTO_INVENTORY.md), [../VISUAL_ASSETS_PLAN.md](../VISUAL_ASSETS_PLAN.md) (D2: the hero stays product-driven, no banner field).

## 1. Method

A production build (`next start`) against a throwaway local PostgreSQL seeded with the demo data (24 products x 2 photos, 10 category photos) and two promo cards created in that database only. A Playwright crawler (development-time, not committed) loaded 40 routes at each of the 5 widths (200 page views): `/`, `/shop`, a search, `/categories`, all 10 category pages, all 24 product pages, `/cart` and `/wishlist` (with a pre-filled cart and wishlist). On each page it scrolled the page and every horizontal rail (cards in rails are lazy-loaded and only load when scrolled to), then checked every media image for load failure, missing `alt`, non-200 responses and horizontal overflow, and recorded bytes transferred and largest contentful paint. Screenshots of the hero (all three slides), promo cards, category pages, product pages, cart and wishlist were reviewed by eye.

## 2. Findings

| # | Surface | Finding | Action |
|---|---|---|---|
| 1 | Category page banner | Always showed a generic icon in the circle, although every category now has a photo and the tiles and home shortcuts show it | **Fixed**: the circle shows the category photo (icon fallback when none), from 640 px up as before |
| 2 | Share image (home, shop, categories, category pages) | Only product pages emitted `og:image`; the others fell back to the plain `summary` card | **Fixed**: `shareImages()` in `lib/seo.ts` picks the page's own photo (home: lead featured product, else newest; shop: newest product; categories: first category photo; category: its photo, else its first product). A search stays without one (noindex). Works with any catalogue, so it survives the demo data being replaced |
| 3 | Product page main image | `alt` was always the product name, so the photo's description (Media alt) was unused | **Fixed**: the main image uses that photo's alt, with the product name as fallback |
| 4 | Test coverage | `test:demo-images` (M105) was not run in CI | **Fixed**: added to the `checks` job together with the new `test:seo` |
| - | Hero slider, circle shortcuts, tiles, rails, cards, cart, wishlist, gallery thumbnails, promo cards | Photos crop well in the square and 4:3 wells; badges stay readable on photos; the small cart and wishlist thumbnails read clearly | No change |
| - | Promo cards | The picture is hidden below 640 px by design (`hidden sm:flex`); above it the circle shows a 400 px photo cleanly | No change |
| - | Home page "broken image" flags during early crawls | False positives: rail cards beyond the viewport are lazy-loaded and had not been scrolled into view. Scrolling the rails loads every one | Crawler fixed, not the site |

## 3. Numbers (demo seed, production build)

- Image bytes per page: category pages median 39 KB on phones and 43 KB from 768 px (the new banner photo adds a few KB there; worst case 183 KB); product pages median 113 KB (max 258 KB); `/shop` max 297 KB; the home page peaks near 0.5 MB for 24 images, the heaviest page anywhere. Every file is within its budget (largest 128 KB, hard cap 150 KB).
- Largest contentful paint, measured in isolation on localhost: 230–480 ms on home, shop, product and category pages at 390 and 1024 px. **Localhost has no network latency, so this is a regression check, not a field figure**; the byte budgets above are the meaningful number. The first all-parallel crawl showed two outliers (up to 3.7 s) that disappeared when measured alone: five browsers were competing for one CPU.
- With the optimizer off, a card downloads the same file as the product page (by design, ADR-036); the cost is bounded by the budgets, not removed.

## 4. Tests

- `npm run type-check`, `npm run lint` (0 errors; the same 8 existing warnings), `npm run build`, `test:env`, `test:turnstile`, `test:category-filters`, `test:demo-images`, new `test:seo` (the share-image picker), `test:idempotency` and `test:users-guard` (throwaway database).
- Playwright against a basic-seeded throwaway database: 14 of 16 passed, including the new "home, shop and category pages share a real product photo" test, all SEO specs and the mobile spec ("no storefront page scrolls sideways at 320px"). **The 2 that failed are the golden path and the idempotency spec, which stop at the Turnstile widget** (`data-turnstile-status` is `failed`): this sandbox cannot reach `challenges.cloudflare.com` (HTTP 000), which those tests need. They are unrelated to image code and are covered by CI, which has network access.

## 5. Not covered / unverified

- Real-device and real-network performance (no field data; localhost only).
- How WebP share images render on each social network (the product page already shared WebP before this milestone). Scrapers cut the 1:1 product photos to a wide card; category photos are 4:3.
- Rendering against the owner's real catalogue, which will have different photos.
