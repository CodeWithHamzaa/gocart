# Phase 2: homepage (Milestone 118)

Owner-authorized 2026-11-12. Builds on Phase 1 (Architecture Decision Record 052 palette, shared `Button`).

## New page order
1. **Hero** (`HeroSlider.tsx`): a solid calm panel instead of a gradient wash (stored tones mapped: green = violet tint, blue = white, grey = warm well; no value added or renamed), a larger display headline (`text-6xl` from `lg`), the shared primary button, and **one** product photo (16:10 under the text on a phone, a square in the right column from `md`) instead of two overlapping tiles. Two columns now start at `md` (768), so the 820 tablet gets a composed split instead of a stacked phone layout. Carousel behaviour, autoplay rules, pause control and accessibility are unchanged.
2. **Shop by category** (new `CategoryShowcase.tsx`), redesigned on 2026-11-12 after the owner's reference ("Style 1, premium cards with images" and "Style 3, circular categories"): an intro column (heading, one line, a violet "Explore all" pill, a hairline divider) beside a row of photo cards: the category's 4:3 image with a round arrow (violet on hover), then its icon, name and "Shop now". Desktop: five cards in the row, the rest a click on the round scroll button away; tablet and phone: the intro is a header row ("View all categories") above a swipeable rail (2.2 cards on a phone). In Mirza's identity: Plus Jakarta Sans instead of the reference's serif, violet actions, warm wells, hairlines instead of shadows. Replaces the small shortcut row under the banner (`HeroShortcuts.tsx`, removed). Every category link stays in the server HTML.
3. **Featured** (unchanged data and component): "Featured", not "Best sellers" (owner decision; Architecture Decision Record 022).
4. **Promotions** (`PromoCards.tsx`, unchanged): the owner keeps the current cards.
5. **Limited-time deals** (`DealsOfTheDay.tsx`, `ui/Countdown.tsx`): renamed from "Deals of the day"; shows "Ends 2 Dec" until the last 48 hours, then the live clock; neutral chips (sale pink stays on the discount itself).
6. **New arrivals** (unchanged), the last section before the footer.

**Removed (owner, 2026-11-12):** the "Why shop with Mirza" band (and the earlier cash-on-delivery steps, `CodSteps.tsx`, deleted), with nothing in its place. Every section keeps the same vertical rhythm (64px, 96px from `lg`), and the footer, with its cash on delivery / delivery / no account row, is unchanged.

## Category style comparison
Both reference styles were built in Mirza's identity and captured at 390, 820 and 1440 (`category-styles/`). **Chosen: cards.** They show each category's photo large (4:3, the shape of the category images, so the owner's coming photos are shown properly, where circles crop them small), carry a clear action (arrow and "Shop now") in step with the product cards below, and keep two-word names ("Power Banks") on one line, where the circles wrap them on a phone. The circles are more compact on a phone (about 220px against 310px tall), which was the one point in their favour. The circle code was removed after the choice.

**Final (owner, 2026-11-12): both styles, by screen size.** Circles below `lg` (phones and tablets, under 1024px), the image cards with the intro column from `lg` (desktop). Both lists are in the server HTML; the hidden one is `display: none`, so keyboard and screen-reader users meet each category once. Captures: `category-styles/final-{mobile-390,tablet-820,desktop-1440}.png` (no overflow, no errors). The full-page `after/` set predates this split, so its phone and tablet home pages still show the cards.

**Circles everywhere (owner, 2026-11-13):** the desktop cards are dropped; the circles are the one style at every size, with sizes per breakpoint: phone 76px circles / 12px gaps / 12px names; `sm` 96 / 20 / 14; `lg` 112 / 24 / 14 beside the intro column (heading, one line, "View all categories", hairline divider, as in the reference's Style 3); `xl` 124 / 28 / 15. Captures: `category-styles/final-{mobile-390,tablet-820,laptop-1024,desktop-1440}.png` (no overflow, no errors). The cards-only captures (`cards-*`) remain as the record of the comparison.

**Circle ring (owner review, 2026-11-12):** the circles were captured with and without their white ring and hairline (`category-styles/ring-*.png` against `final-*.png`). **Chosen: no ring.** It reads cleaner and more editorial, shows about 10% more of each photo at the same size, and removes ten extra outlines from the row. Hover still adds a violet ring. Watch point: a category photo on a near-white backdrop has a softer edge against the ivory page; if the final photos need it, a faint hairline is a one-line change.

Also: the footer lists **all** categories (it showed the first six, leaving four unreachable from it).

## Deviation from the Phase 0 report
The report suggested an aubergine band featuring two categories in place of "featured collections". The category row already shows every category, and the owner later removed the dark band altogether; no collections model was added (that would be a schema change).

## Before / after screenshots
`before/` = Phase 1 (`31bfab8`), `after/` = this milestone; same local production build setup as Phase 1 (throwaway PostgreSQL, `seed:demo`, generated artwork, seed default free-delivery Rs. 3,000). For both sets two discounted products were given a deal ending in 20 days **in the local database only**, so the deals section is visible. Every page differs slightly because the footer now lists all ten categories.

## Quality assurance results
| Check | Result |
|---|---|
| `npm run type-check` | Pass |
| `npm run lint` | 0 errors; the same 8 warnings as `main` |
| `npm run build` | Pass |
| Continuous integration unit scripts | Pass |
| Capture: 17 pages × 3 widths | HTTP 200 (404 page intended), horizontal overflow 0 px, no failing sub-resource |
| Every category link in the home HTML (`e2e/seo.spec.ts`) | Kept: the category grid renders all of them server-side |
| Playwright end-to-end | Not run locally (pinned browser not installed here); continuous integration runs it |
| Live countdown under 48 h | Logic reviewed, **not captured** (local deals end in 20 days) |

## Rollback
Revert the Milestone 118 commit. No schema, data or dependency change.
