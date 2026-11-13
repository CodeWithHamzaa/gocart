# Phase 1: design foundation (`M115`–`M117`)

Owner-authorized 2026-11-12. Decision record: ADR-052 (hybrid palette).

## What changed
| Milestone | Change |
|---|---|
| `M115` | Raw palette in `app/tokens.css` (plain CSS) and Tailwind role tokens pointing at it; `on-primary`, `inverse`, `on-inverse` roles; `text-6xl` display step; shared `components/ui/Button.tsx` (`Button`, `buttonClasses`) and `components/ui/Price.tsx` adopted on the product card, product page, empty states, filters, load more, address modal, checkout button, order lookup and confirmation; footer and inverse wordmark on the `inverse` roles; skip link on tokens. No colour change. |
| `M116` | ADR-052: hybrid palette; amends ADR-047 item 4; records the earlier unrecorded `bc5a77a` surface change. |
| `M117` | Palette values: warm ivory page `#F7F5F0`, warm wells `#F1EEE8` and lines, aubergine `#352746` footer with a white focus ring, saved wishlist heart and wishlist count badge in violet (sale pink is for real discounts only); the admin's brand colours read the shared palette (admin violet `#5B3FD9` to `#5F42EC`; admin surfaces unchanged). |

## Changed files
`app/tokens.css` (new), `app/globals.css`, `app/(payload)/layout.tsx`, `app/(payload)/custom.css`, `app/(public)/layout.jsx`, `app/(public)/category/[slug]/error.tsx`, `app/(public)/order-confirmation/OrderConfirmation.tsx`, `app/(public)/orders/OrderLookup.tsx`, `components/ui/Button.tsx` (new), `components/ui/Price.tsx` (new), `components/ui/BrandLogo.tsx`, `components/ui/CategoryControls.tsx`, `components/ui/EmptyState.tsx`, `components/ui/LoadMoreLink.tsx`, `components/ui/WishlistButton.tsx`, `components/AddressModal.jsx`, `components/Footer.jsx`, `components/Navbar.jsx`, `components/OrderSummary.jsx`, `components/ProductCard.jsx`, `components/ProductDetails.jsx`. Not touched: checkout and order logic, Turnstile, validation, Redux, Payload collections and schema, dependencies, configuration, deployment.

## Before / after screenshots
`before/` is `main` at `4d62728`; `after/` is this branch after `M117`. Both are from the same local production build setup (`next build` + `next start`) on a throwaway PostgreSQL 16 seeded with `npm run seed:demo`, at 390×844, 820×1180 and 1440×900, same 17 pages as the Phase 0 baseline. Footer contact details are hidden for privacy.

Local-data differences from the test site, which are not regressions: products show the seed's generated artwork (the demo photos are git-ignored and were not used), the free-delivery threshold is the seed default Rs. 3,000 (the test site's admin sets Rs. 1,500), and there are no live deals, so "Deals of the day" is hidden.

## QA results
| Check | Result |
|---|---|
| `npm run type-check` | Pass |
| `npm run lint` | 0 errors; 8 warnings, the same 8 as `main` |
| `npm run build` | Pass |
| CI unit scripts (`test:env`, `test:turnstile`, `test:category-filters`, `test:demo-images`, `test:seo`, `test:rollout-demo-photos`, `test:storefront-content`) | Pass |
| Capture: 17 pages × 3 widths | HTTP 200 (404 page intended), horizontal overflow 0 px, no failing sub-resource |
| `M115` "no colour change" | Pixel diff against `before`: only card price rows changed (MRP and discount now wrap together); no page changed size |
| Admin `/admin/login` | Renders; `--mirza-primary` resolves to `#5F42EC`; no page errors |
| Playwright e2e (`golden-path`, `mobile`, `seo`, ...) | **Not run locally**: the project's pinned Playwright needs a browser build not installed in this sandbox, and the golden path needs Cloudflare's Turnstile script. CI runs the suite on the PR. |
| Keyboard focus on the footer | White ring by CSS rule (`.surface-inverse :focus-visible`); **not visually verified** with a keyboard walk-through |

## Known limitations
- The brand kit (`docs/brand-kit/`) still shows the pre-ADR-052 palette until it is regenerated (follow-up).
- The hero panel, countdown chips and promo-card tones keep their current colours until Phase 2 (`M118`) redesigns those sections.
- Not deployed. Merges do not deploy; a test deploy is a separate request.

## Rollback
Revert `M117` alone to go back to the previous colours (the `M115` structure keeps working with any values). Revert `M115`–`M117` to restore `4d62728` behaviour. No migration or stored data is involved.
