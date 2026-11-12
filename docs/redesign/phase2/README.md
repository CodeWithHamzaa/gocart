# Phase 2: homepage (`M118`)

Owner-authorized 2026-11-12. Builds on Phase 1 (ADR-052 palette, shared `Button`).

## New page order
1. **Hero** (`HeroSlider.tsx`): a solid calm panel instead of a gradient wash (stored tones mapped: green = violet tint, blue = white, grey = warm well; no value added or renamed), a larger display headline (`text-6xl` from `lg`), the shared primary button, and **one** product photo (16:10 under the text on a phone, a square in the right column from `md`) instead of two overlapping tiles. Two columns now start at `md` (768), so the 820 tablet gets a composed split instead of a stacked phone layout. Carousel behaviour, autoplay rules, pause control and accessibility are unchanged.
2. **Shop by category** (new `CategoryShowcase.tsx`): every category, in the admin's order, as a 4:3 photo tile with name and description; a sideways rail on a phone, a 5-column grid from `md`. Replaces the small shortcut row under the banner (`HeroShortcuts.tsx`, removed). Every category link stays in the server HTML.
3. **Featured** (unchanged data and component): "Featured", not "Best sellers" (owner decision; ADR-022).
4. **Promotions** (`PromoCards.tsx`, unchanged): the owner keeps the current cards.
5. **Limited-time deals** (`DealsOfTheDay.tsx`, `ui/Countdown.tsx`): renamed from "Deals of the day"; shows "Ends 2 Dec" until the last 48 hours, then the live clock; neutral chips (sale pink stays on the discount itself).
6. **Why shop with Mirza** (`CodSteps.tsx`): the page's one aubergine band, with only verified facts: cash on delivery, the Settings delivery charge, no account needed, tracking by order number and phone (+ a "Track an order" link). No returns or delivery-time promise (owner: none exist). White focus ring on aubergine.
7. **New arrivals** (unchanged), placed after the band so the dark band never sits against the dark footer.

Also: the footer lists **all** categories (it showed the first six, leaving four unreachable from it).

## Deviation from the Phase 0 report
The report suggested an aubergine band featuring two categories in place of "featured collections". The new category grid already shows every category, so the band carries "Why shop with Mirza" instead; no collections model was added (that would be a schema change).

## Before / after screenshots
`before/` = Phase 1 (`31bfab8`), `after/` = this milestone; same local production build setup as Phase 1 (throwaway PostgreSQL, `seed:demo`, generated artwork, seed default free-delivery Rs. 3,000). For both sets two discounted products were given a deal ending in 20 days **in the local database only**, so the deals section is visible. Every page differs slightly because the footer now lists all ten categories.

## QA results
| Check | Result |
|---|---|
| `npm run type-check` | Pass |
| `npm run lint` | 0 errors; the same 8 warnings as `main` |
| `npm run build` | Pass |
| CI unit scripts | Pass |
| Capture: 17 pages × 3 widths | HTTP 200 (404 page intended), horizontal overflow 0 px, no failing sub-resource |
| Every category link in the home HTML (`e2e/seo.spec.ts`) | Kept: the category grid renders all of them server-side |
| Playwright e2e | Not run locally (pinned browser not installed here); CI runs it |
| Live countdown under 48 h | Logic reviewed, **not captured** (local deals end in 20 days) |

## Rollback
Revert the `M118` commit. No schema, data or dependency change.
