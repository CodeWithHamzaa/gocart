# Mirza premium storefront redesign: Phase 0 audit and plan

**Date:** 2026-11-12. **Scope:** Phase 0 only. This is a read-only audit. No application code, assets, configuration, schema or deployment were changed.
**Inputs:**
- the owner's brief
- `mirza-brand-kit.pdf` (all 26 pages)
- the repository at `4d62728`
- the live test site https://gocart-test-inky.vercel.app, through its public read API and Playwright captures
- reviews by the user interface and user experience, Product and Architecture roles in `.claude/`.

**Status:** this is a proposal. Nothing below is approved work until the owner authorizes a phase. Anything marked **unverified** could not be confirmed.

---

## 1. Repository and git status

| Item | State |
|---|---|
| Working branch | `ccr-655303fb-fib05e`, the working branch the owner chose instead of `redesign/mirza-premium-storefront` |
| HEAD | `4d62728`, the same as `main`, `origin/main` and `origin/ccr-655303fb-fib05e` |
| Working tree before Phase 0 | clean, with no stashes |
| Phase 0 changes | `docs/redesign/` only: this report, `baseline/` screenshots and `baseline/capture-log.json` |
| Pushed or deployed | **No.** A push needs the owner's authorization. |
| Test deployment | serves `main` at `e1e9e5a` (Milestone 114), according to CLAUDE.md |

**Stack, as checked:** Next 16.4.2 App Router; Payload 3.90.2, embedded; Tailwind v4 with tokens in `@theme` in `app/globals.css` and no `tailwind.config`; Redux Toolkit for cart, wishlist and address; Plus Jakarta Sans variable font self-hosted with `next/font/local`.

**Documentation drift found:**
- `docs/MIGRATION_PLAN.md` still lists Milestone 111 (listing cards and 2/3/4 grids) as "Implemented, in review (not deployed)". In fact it is merged in `main` (`e6e3b3a`) and visible on the test site.
- **Architecture Decision Record 047 item 4 no longer matches the tokens.** The Architecture Decision Record records a "lavender wash": page `#FCFAFF`, wells `#F1ECFF`, sale `#CC1966`, token names `lavender`/`pink`. Commit `bc5a77a` (2026-11-10, "Storefront tokens: neutral surfaces, 9-step type scale, fewer radii") changed this to neutral surfaces (`#FAFAFC`), sale `#A8144F` and new token names. No Architecture Decision Record amendment, MIGRATION_PLAN entry or CHANGELOG entry references that commit. The brand kit documents the state after the change. Whatever palette is chosen, the new Architecture Decision Record should also record this change.
- `app/(payload)/custom.css` (admin) has its own brand values, which have drifted from the storefront: `--mirza-primary #5B3FD9` against `#5F42EC`, pink `#E8336D`, ink `#1C1A2E`.

**Rollback for Phase 0:** delete `docs/redesign/`, or `git reset --hard 4d62728` on this branch before any push. Nothing else was touched.

---

## 2. Brand kit assessment

The kit (Milestone 113, also in `docs/brand-kit/`) **documents the storefront as it is today**. Every colour in it is a token in `app/globals.css`, and its showcase pages are screenshots of the test site.

**What it fixes:**
- **Logo:** a near-black square monogram with the "M" drawn as one stroke, plus a Plus Jakarta Sans Bold wordmark. The minimum size is a 28 px monogram in the header and 16 px for the favicon. On dark backgrounds only the white wordmark is used. The store name comes from Settings.
- **Colour:** one action violet, `#5F42EC` (white on it 6.04:1), with `primary-dark #4A2FD0`, `accent-soft #EEE9FF` and `accent #E2DAFF`.
  - Ink scale: `#1D1D1F`, `#424245`, `#515154` and `#636368`.
  - Cool neutral surfaces: page `#FAFAFC`, surface `#FFF`, muted `#F5F4F8`, lines `#ECE9F2`, `#E2DFEA`, `#CBC6D8` and `#8A84A3`.
  - Status colours: sale `#A8144F` and `#CC1966`, amber `#FFC247` (only for "Limited edition") and success `#0B6E4F`.
- **Type:** Plus Jakarta Sans only, weights 400 to 700. The hierarchy runs: hero 48/52 (phone 28/34), section 36/40, product-page price 28/28, product name 16/24, body 16/24, nav 14/20, eyebrow 12/16 in caps with +12% tracking.
- **Shape:** radii of 12 (controls), 16 (cards) and 24 (panels and hero), with pill-shaped buttons. Cards use a hairline and no shadow; shadows are only for floating bars. Spacing is on a 4 px grid. Icons are Lucide outline.
- **Photography:** one product per square frame on a neutral backdrop, unbranded. Category images are 4:3 and shown as circles.
- **Don'ts:** no second accent colour; no gradients on buttons; no other typeface; no weights below 400; never promise features the store does not have.

**Assessment:** the kit is coherent, accessible (every text pairing passes AA except "disabled", see §4) and specific. Its visual direction is "friendly marketplace" rather than "premium editorial". The pale lavender hero, round violet cart buttons, pink sale chips and countdown chips are what make the store read as a template. The kit is a good base for structure and type. It is not yet the premium look the brief asks for.

**Conflict to resolve:** the brief's starting palette changes the kit in four ways:
- aubergine `#352746`
- violet `#5945A6` instead of `#5F42EC`
- warm ivory `#F7F5F0` instead of the cool `#FAFAFC`
- champagne `#B69A69`.

The palette is fixed by **Architecture Decision Record 047 item 4 (Accepted)**. Architecture Decision Record 039 says a promo tone may only use existing tokens, and Architecture Decision Record 043 says the admin uses the storefront tokens. The kit also forbids a second accent. Changing any colour value therefore needs **a new Architecture Decision Record that the owner approves**. Under `GATES.md` that is an absolute stop, so no delegation covers it. See §4 for the recommendation.

---

## 3. Current design and user experience problems (ranked)

Sources are screenshots in `baseline/{mobile-390,tablet-820,desktop-1440}/`. I checked every point against the code. One point a reviewer raised turned out to be a capture artifact, and I've noted it.

### High
1. **The home page is a run of the same product grids.** The order is: hero, then Deals (4 cards), Featured (8 cards), two promo cards, New arrivals (a rail of cards) and cash on delivery steps. There's no editorial pacing, and categories appear only as a small pill row (`d/01-home`).
2. **Honesty risks in live copy** (the owner must confirm each):
   - **"Deals of the day"** shows `Ends in 1158 : 32 : 18`. `Countdown.tsx:29` shows the time left in hours only, so a 48-day deal looks like a ticking clock. That is fake urgency, and the wording "of the day" isn't true.
   - **Promo cards** "Summer Sale on Electronics" and "TODAY BEST DEAL / New Arrivals Winter Sale" are both active in November. They read as demo copy.
   - **"Save up to 36%" and "You save Rs. 4,400"** are only honest if each MRP is a real earlier or market price (**unverified**).
3. **On a phone, the product page hides the decision.** At 390 px, the gallery, thumbnails and the sticky Add to cart / Buy now bar fill the first screen. The product name is cut off and the price and stock status aren't visible (`m/08-product-fold`).
4. **The tablet (820) uses a stretched phone layout.** The product page switches to two columns only from `lg`, 1024 px (`ProductDetails.jsx:80`). At 820 the image is about 770 px wide and the price only just makes the fold (`t/08-product-fold`). The home hero at 820 leaves the right half empty (`t/01-home-fold`).
5. **The address form uses placeholders as labels.** In `AddressModal.jsx:85-94` there are no `<label>`s. The form marks email and area as required, but the validator (`lib/validation/pk.ts`) never checks email and treats area as optional. "SAVE ADDRESS" is the only button in capitals. This affects WCAG 1.3.1 and 3.3.2 as well as the experience.
6. **The disabled "Place order" button never says why.** It's in the mobile cart bar, pale and inactive, with no reason until the user scrolls to the address step. On the test site the cause is the missing Turnstile key, which is expected. In production the blocking step would be the address (`m/11-cart-filled-fold`).

### Medium
7. **Pink is used as a second accent.** The sale pink appears on discount %, the eyebrow, countdown chips and the **saved wishlist heart** (`WishlistButton.tsx:21`, `fill-sale-strong`). The kit says sale colours are for real discounts only.
8. **There's one card and one gesture everywhere.** Every listing uses the same card with a 44 px round violet cart button (Milestone 111). Category pages are a tinted banner plus a filter box (`d/07-category-filters-open`).
9. **Navigation is incomplete.** The desktop category row shows 4 of 10 categories (Milestone 111, by design). The footer shows 6 of 10 (`Footer.jsx:27`, `slice(0, 6)`), so Lamps, Kitchen, Skincare and Fragrances are missing.
10. **`/shop` has no sort or filter.** Only category pages have them. Search matches product names only, so "perfume" won't find "Eau de Parfum" (**unverified for this exact query**).
11. **The header is tall on a phone.** The bar, logo row and full-width search take about 170 px before any content.
12. **Product pages can dead-end.** Related products hide when fewer than two in-stock products share the category (`RelatedProducts.tsx:34`). Amber Oud and other two-product categories therefore end at the footer.
13. **"Please contact us" is a dead end.** That's the paused checkout and lookup notice (`TurnstileWidget.tsx:88-89`), and it has no phone or email link. The footer does have a Contact column. It's hidden in these screenshots for privacy, the same redaction the brand-kit tooling uses.
14. ~~Containers don't line up.~~ **Corrected in Phase 1:** the header, footer, bar and category nav use `max-w-[83rem]` with 24px padding inside, and page bodies use `max-w-7xl` inside 24px margins, so the content edges **do** align (1280px at 1440). It is two ways of writing the same width, not a visual defect. No `Container` component was added for it.
15. **Cart lines have two delete controls.** There's one in the stepper when the quantity is 1 and one top-right, both small and close together.

### Low
16. On phone cards the discount % wraps under the struck-through MRP.
17. The description accordion uses "×" as its toggle icon.
18. The skip link uses default `slate` colours.
19. The mobile footer has an empty band about 250 px tall above the copyright (padding for the tab bar).
20. Empty states (cart, search, 404) are correct but share one generic centred card.

### Checked and fine
- No horizontal overflow on any of the 17 pages at any of the 3 widths (`baseline/capture-log.json`).
- No console errors except the expected 404 on the not-found page.
- Every heart and cart icon button has an accessible name.
- Order confirmation with no data offers recovery.
- Every product has 2 square 1000×1000 photos.

---

## 4. Recommended visual direction

### Positioning
**"A calm, editorial shop window."** Product photography and generous ivory space carry the page. Violet is kept for things you can press. A deep aubergine gives weight to the footer and one editorial band. Prices are set in confident ink, not chips. Copy is warm, short and true.

### Palette options (WCAG contrast computed, text on background)

| Pairing | Current kit | Owner's proposal | **Recommended hybrid** |
|---|---|---|---|
| Action, white on button | `#5F42EC` 6.04:1 | `#5945A6` 7.43:1 | `#5F42EC` 6.04:1 (unchanged) |
| Page background | `#FAFAFC` (cool) | `#F7F5F0` (warm ivory) | `#F7F5F0` warm ivory |
| Body ink on page | `#1D1D1F` 16.1:1 | `#242328` 14.3:1 | `#1D1D1F` 15.5:1 |
| Muted text on page | `#636368` 5.73:1 | (not defined) | `#636368` 5.48:1 |
| Violet text or link on page | 5.79:1 | 6.82:1 | 5.54:1 |
| Dark surface (footer or editorial band) | `#1D1D1F` | `#352746` aubergine, 13.7:1 with white | `#352746` aubergine (white 13.7:1, light violet `#C9BDF7` 7.9:1) |
| Champagne `#B69A69` | n/a | 2.69:1 on white, 2.47:1 on ivory (**fails**); 5.11:1 on aubergine | **Not adopted.** At most a hairline or rule on aubergine. Never text on light surfaces. |
| Disabled grey `#A1A1A6` on white | 2.57:1 (fails; acceptable only for truly disabled controls) | n/a | Keep for disabled controls only; never for information |

**Recommendation: the hybrid.**
- Keep `#5F42EC`. It's the recognisable brand violet, it's used in the kit, the admin and every screenshot, and `#5945A6` is a duller, different colour.
- Move surfaces to a warm ivory with white cards.
- Add aubergine as a single dark surface token for the footer and one editorial band. Lavender stays in light tints only.
- Do **not** add champagne as an accent. It fails contrast on light surfaces and breaks the kit's "one accent" rule.
- Limit sale pink to discount figures, and make the saved wishlist heart ink or violet.

**Architecture constraints on any palette option:**
- **`heroSlides.tone`** (`green`, `blue`, `grey`) and **`promoCards.tone`** (`blue`, `lavender`, `mint`) are stored select values. Adding or renaming a value is a schema change and a data migration, which is outside this redesign and can't be undone with a code revert.
- An aubergine look must therefore come from remapping an existing value in the components' `TONES` maps, or from surfaces outside those collections (footer, editorial band).
- Bringing the admin onto shared tokens visibly moves the admin violet from `#5B3FD9` to `#5F42EC`.

Even the hybrid **changes Architecture Decision Record 047 item 4** (page colour and a new dark surface). It needs a short new Architecture Decision Record that the owner approves before Phase 1 starts. If the owner prefers not to change the Architecture Decision Record, Phase 1 can be a token-only refactor with no colour changes. That still delivers most of the structural improvement.

### Typography
Keep Plus Jakarta Sans as the only typeface (kit and Architecture Decision Record 043). Make the editorial headings larger and tighter, and keep everything else restrained:

| Role | Desktop | Phone | Weight / tracking |
|---|---|---|---|
| Display (hero) | 56/60 | 34/38 | 600, −3% |
| Section heading | 36/40 | 26/32 | 600, −3% |
| Card or product name | 15/22 | 14/20 | 500 (currently 600) |
| PDP price | 28/32 | 24/28 | 600, −2% |
| Card price | 16/22 | 15/20 | 600 |
| Body | 16/26 | 15/24 | 400 |
| Eyebrow / label | 12/16 | 12/16 | 600, caps, +12%, in ink-3 rather than pink |

The 48/52 sizes and the phone values are from the kit. The 56/60 and 34/38 sizes are new proposals.

### Shape, depth and spacing
- Keep radii 12, 16 and 24 and pill buttons.
- Make **product photo wells 12** (less "bubbly") and give cards **no visible border on ivory** (photo plus text). Hairlines stay for panels and forms.
- Shadows only on floating bars (unchanged).
- Use one container width and a section rhythm of 64 px on desktop and 40 px on phone, as tokens.

---

## 5. Page-by-page recommendations

These stay within existing data (§3 of the data inventory below). Items marked **[schema]** would need a schema change, which is out of scope, and are listed only so the owner can decide.

### Home
| # | Section | Recommendation | Data source (verified) |
|---|---|---|---|
| 1 | Announcement bar | Keep, with a quieter style: ink text on ivory, one message per line on a phone. | `storefrontContent` (no custom messages today, so the delivery and track-order defaults show) |
| 2 | Navigation | Lockup at 28 px monogram. On a phone, search folds into a full-width field inside a sticky header that shrinks on scroll. Desktop row stays as Milestone 111's 4 categories plus "All categories". | Settings `storeName`, categories |
| 3 | Hero | Editorial split: large headline left, one large product photo right (4:5 crop on desktop, full-bleed 1:1 on a phone), one primary CTA and one text link. No floating tile pile. Slider controls only if more than one slide. Uses the existing `heroSlides` collection when the owner adds slides; until then the automatic slides keep working. Tones map through the existing `green`/`blue`/`grey` values only. | `heroSlides` (0 active) and `lib/hero-slides.ts` |
| 4 | Shop by category | A large-tile grid (all 10 categories, 4:3 images, title plus description on hover or below) replaces the small pill row. Two rows of 5 on desktop, 2 columns on a phone. | `categories` (10, all with 800×600 images) |
| 5 | "Best sellers" | **Not supported by data**: no sales counts, and Architecture Decision Record 022 says the flag is a curation flag. Keep the heading **"Featured"** (or "Picked for you"), 7 flagged products, and pad only if the owner wants a full row. | `isFeatured` (7) |
| 6 | "Featured collections" | **No collections model.** Use an editorial **aubergine band** that features 2 categories with large photos and their descriptions. | categories **[schema] for real collections** |
| 7 | New arrivals | A horizontal rail on a phone and a 4-column row on desktop, with "Just in" set in ink. | newest by `createdAt` |
| 8 | Promotional feature | One wide card at most, **only if the owner confirms a real promotion**. Today's two cards are seasonal-looking demo copy, so deactivate them or rewrite them in admin (content, not code). | `promoCards` (2 active) |
| 9 | Deals | Rename it "Deals" or "Limited-time deals". Show "Ends 30 Dec" and use a live countdown only when less than 48 h remain. | `dealEndsAt` (4 live) |
| 10 | Why shop with Mirza | 3 to 4 facts that are true today: Cash on Delivery; delivery Rs. 200, free from Rs. 1,500 (from Settings); no account needed; track with order number and phone. **No returns, warranty or delivery-time promises**: none are documented (**owner input needed**). | Settings, CodSteps |
| 11 | Footer | Aubergine. White wordmark only, per the kit. All categories generated from data. Customer care, plus Contact from Settings. | Settings, categories |

### Shop, category and search
- One page header pattern: breadcrumb, H1, product count ("24 products"), and for categories a quiet description in place of the tinted banner. The category image becomes a small 4:3 inset, or nothing.
- **Add the existing category sort to `/shop`.** It reuses `lib/category-filters.ts` (no new options) and needs the architect's sign-off because `/shop` is `force-dynamic` and has a "Load more" link.
- Sort and filter: a compact toolbar on desktop and a bottom sheet on a phone. Same GET form and parameters.
- Grid: 2 / 3 / 4 columns (Milestone 111), with ivory gaps of 12 on a phone and 24 on desktop.
- Search: a clearer field (visible label for screen readers, clear button), a results header ("12 results for 'watch'"), and an empty state with category tiles and a link to all products. Matching stays name-only. A wider search would be a separate milestone.
- **Do not** add `loading.tsx` to `category/[slug]` (do-not-touch item). Skeletons stay where they already are.

### Product card
Order: square photo well (status tag top-left, heart top-right), then name (2 lines), then price row (current price in ink 600, MRP struck in muted, then discount % in sale colour on the **same line**). Out-of-stock shows as a text tag. The add-to-cart button becomes a smaller ghost button, or a text "Add" on desktop hover. The category eyebrow is optional (it repeats on category pages).

### Product detail
- **Phone order:** a 1:1 gallery with swipe and dots (thumbnails below are optional), then name, then price/MRP/discount, then stock, then the delivery and cash on delivery list, then the description. The sticky bar shows the **price plus "Add to cart"**, with "Buy now" as the secondary action, so the price is always visible.
- **Tablet (820):** start the two-column layout at `md` (768) instead of `lg`.
- **Desktop:** a 7/5 split, a vertical thumbnail rail, and the price block given more weight.
- **Brand/model/specs:** not in the schema **[schema]**, so nothing invented. The description stays plain text.
- **Related products:** when fewer than 2 are in the category, fall back to "More from Mirza" (newest in stock) so the page never dead-ends. This is a small data-query change and needs review.
- Description: replace the "×" with a chevron, or show it open with no accordion.

### Cart and checkout
- One delete control per line; quantity stepper with 44 px targets.
- The summary card shows subtotal, "You save" (only when greater than 0), delivery from Settings, and total.
- Address: **visible labels**, grouped as Contact (name, phone `03XXXXXXXXX` with `inputMode="numeric"`) and Address (address, city, area). Mark email and area **Optional** to match the validator (no validation change). On a phone, consider an inline step instead of a modal. That is a larger change, so it needs the owner's choice.
- Disabled "Place order" gets a reason line: "Add a delivery address to continue", or the existing Turnstile notice. Turnstile stays untouched.
- Paused notices link to the Settings phone and email.
- Order confirmation: a large order number with a copy button, "Keep this number to track your order", and a "Track order" link with the number prefilled (existing behaviour).
- `/orders`: one form, one submit (do-not-touch), with visible labels and the same response for a wrong number or phone (unchanged).

---

## 6. Responsive improvements

| Area | 390 | 820 | 1440 |
|---|---|---|---|
| Header | Shrinking sticky header, about 112 px instead of 170 | Single row with inline search | Container aligned with the body |
| Hero | Image first or text first (owner's choice), one CTA in reach of the thumb | Two-column split rather than a stacked phone layout | Bounded at the container, not edge to edge |
| Categories | 2-column tiles | 3 or 5 columns | 5 columns |
| Grids | 2 columns, gap 12 | 3 columns, gap 16 | 4 columns, gap 24 |
| Product page | Name and price above the fold; sticky bar with price | Two columns from 768 | 7/5 split |
| Cart | Sticky bar with total and reason | Two columns (lines and summary) | Same, sticky summary |
| Touch | Every target at least 44 px (already enforced by `e2e/mobile.spec.ts`) | Same | Not applicable |

The bottom tab bar on phones (Home, Categories, Shop, Cart, Orders) stays. It is the shop's Track Order entry point.

---

## 7. Reusable component and token opportunities

| Item | Today | Proposal |
|---|---|---|
| `Button` | At least 8 hand-written primary class strings (worst: `ProductDetails.jsx`) | `components/ui/Button.tsx` with variants `primary`, `soft`, `quiet` and `link`, sizes `md`/`lg`, and `asChild`/link support |
| `Container` / `Section` | `max-w-[83rem]` ×4 against `max-w-7xl` ×17 | One container token (`--container-site`) and a `Section` with the vertical rhythm built in |
| Section heading | `PageTitle.jsx` and `Title.jsx` | One `SectionHeader` (eyebrow, title, description, action) |
| `Price` | Price, MRP and % markup repeated in card, product page, cart and deals | `components/ui/Price.tsx` (sizes card, product page, summary), using the existing `lib/product-badges.ts` discount maths |
| `Field` | Inputs without labels in AddressModal and OrderLookup | `components/ui/Field.tsx` (label, hint, error, optional tag) |
| Tokens | Spacing, container and section rhythm not tokenised; `rounded-field` 0 uses; 40+ `bg-white` | Semantic tokens (`surface-page`, `surface-card`, `surface-inverse`, `text-*`, `action-*`), with existing names kept as aliases (Architecture Decision Record 047's deferred rename) |
| Admin CSS | `custom.css` brand values have drifted (`#5B3FD9` against `#5F42EC`, and others) | Use the same CSS variables (Architecture Decision Record 043), as a separate small milestone |

All of these are new `.tsx` files. No existing `.jsx` gets converted just because it's being touched (CONVENTIONS). No new packages.

---

## 8. Existing assets and missing image slots

### Existing (reuse only; nothing renamed, moved or edited)
- **Brand:** `app/icon.svg` (monogram), `app/favicon.ico` (16/32), `components/ui/BrandLogo.tsx` (inline monogram plus wordmark, `inverse`), `components/admin/Logo.tsx`, and the font `app/fonts/PlusJakartaSans-Variable.ttf`.
- **Catalogue (Payload media on Vercel Blob):** 24 products × 2 photos (all 1000×1000), 10 category images (all 800×600, 4:3), and 2 promo-card images (1000×1000).
- **No `public/` folder.** The repo has no static storefront images.

### Missing image slots

Each slot below is a request for the owner. None was sourced or generated.

| # | Page and section | Status | Intended subject | Ratio | Recommended size |
|---|---|---|---|---|---|
| 1 | Home: editorial hero (desktop) | No `heroSlides` image; product photos used | Lifestyle still life of 2–3 hero products on a warm neutral set, space on the left for text | 4:5 (in the split layout) or 16:9 full-bleed | 1600×2000 or 2400×1350 |
| 2 | Home: editorial hero (phone crop) | Same as 1 | Same scene, product centred | 1:1 or 4:5 | 1200×1200 / 1200×1500 |
| 3 | Home: aubergine editorial band (2 featured categories) | Category images are 800×600, too small for a large band | One mood image per featured category | 4:3 or 3:4 | 1600×1200 / 1200×1600 |
| 4 | Home: promotional feature | Only seasonal-looking promo images | Campaign image for a confirmed promotion | 16:9 (wide card) | 2000×1125 |
| 5 | Category tiles: higher resolution | 800×600 looks soft in large tiles | Existing subjects re-shot or re-exported | 4:3 | 1600×1200 |
| 6 | Social share: `app/opengraph-image` | **Missing** (no OG image) | Lockup on ivory with a product still life | 1.91:1 | 1200×630 |
| 7 | iOS home screen: `app/apple-icon` | **Missing** | Monogram on `#1D1D1F`, no transparency | 1:1 | 180×180 |
| 8 | Empty states (cart, search, 404) | Icon-only | Optional small monochrome line illustration | 1:1 | 480×480 SVG |

Until the owner supplies these, slots 1 to 5 keep using existing product or category photos (CSS crop, `object-fit`, `object-position`), and slots 6 to 8 stay absent.

---

## 9. Risks and suggested implementation sequence

### Risks
| Risk | Mitigation |
|---|---|
| Changing colour values changes an Accepted Architecture Decision Record (Architecture Decision Record 047 item 4) | A new Architecture Decision Record approved by the owner before Phase 1. Otherwise run Phase 1 as token-only |
| Visual regressions in checkout or order flows | Phase 4 limited to markup and styles. `OrderSummary` logic, `placeOrder`, `lib/order-guard.ts`, Turnstile and `pk.ts` not edited. Golden-path, idempotency, turnstile-fallback, mobile and seo end-to-end run every phase |
| Breaking the do-not-touch items | Checklist per phase: no `loading.tsx` on `category/[slug]`; `force-dynamic` stays on `/`, `/shop` and the product page; `/orders` keeps one submit; `Loading.jsx` stays; "Best Selling" stays `isFeatured` |
| Claims the store can't back up | Only the facts in §5 Home row 10. Promo and deal wording is an owner content decision |
| Overlap with Milestone 111 (cards and grids) | It's merged (`e6e3b3a`), so the redesign builds on it. The Architecture review assumed it was unmerged, based on the stale docs status; git shows otherwise |
| Brand kit (Milestone 113) out of date after colour changes | Regenerating the kit is a separate follow-up after Milestone 117 |
| No local data for screenshots | Before/after captures against a local build with `npm run seed:demo` (local-only guard) or the test site. Checkout can't complete in this sandbox (Turnstile script), as recorded for Milestone 111 |
| Font weight (176 KB variable TTF) | Unchanged in this redesign. Milestone 77 (smaller font file) stays deferred |
| Container is temporary | Commit at the end of every phase, and push only when the owner authorizes it |

### Proposed milestones
Each is **Proposed** and becomes work only once the owner authorizes it. IDs continue from Milestone 114. Phase 1 is split as the Architecture review recommends: tokens and components first with **no colour change**, then colour values only after the Architecture Decision Record is approved, so each step can be undone on its own.

| Phase | Milestone | Goal | Main files | Rollback |
|---|---|---|---|---|
| 1a | **Milestone 115** Role tokens and shared components (no colour change) | Two-layer tokens: raw colours in plain `:root`, plus role tokens in `@theme inline` (`action`, `bg`, `surface`, `surface-inverse`, `text`, `text-muted`, `border`, `focus`…). Existing names kept as aliases, so no component breaks. Container and section rhythm tokens. New `Button`, `Container`/`Section`, `SectionHeader`, `Price`, `Field`. Header and body containers aligned. Skip link fixed. | `app/globals.css`, `components/ui/*` (new) | Revert the pull request (aliases mean old classes keep working) |
| 1b | **Milestone 116** Palette Architecture Decision Record (docs only; **owner approval required**) | Records the chosen palette (§4) and the unrecorded `bc5a77a` change, and amends Architecture Decision Record 047 item 4 | `docs/DECISIONS.md`, `docs/ARCHITECTURE.md` | Revert |
| 1c | **Milestone 117** Palette values and admin token sharing | Apply the approved values plus a recomputed contrast table. Admin `custom.css` reads the same raw colours (fixes the drift). Aubergine dark surface for the footer. | `app/globals.css`, `app/(payload)/custom.css`, `Footer.jsx` | Revert (values only) |
| 2 | **Milestone 118** Homepage | Editorial hero, category tiles, Featured, editorial band, New arrivals, honest Deals, "Why Mirza" | `app/(public)/page.jsx`, `Hero*`, `BestSelling`, `DealsOfTheDay`, `Countdown`, `PromoCards`, `CodSteps` | Revert the pull request |
| 3 | **Milestone 119** Catalogue and product | Page headers, `/shop` sort, filter sheet, card refinements, search states, product-page fold at 390 and 820, related fallback | `shop/page.jsx`, `category/[slug]/page.tsx`, `ProductCard`, `ProductDetails`, `RelatedProducts`, `CategoryControls` | Revert the pull request |
| 4 | **Milestone 120** Cart, checkout and orders | Labelled fields, one delete control, disabled-reason line, contact links on paused notices, confirmation and lookup polish | `cart/page.jsx`, `OrderSummary.jsx` (markup only), `AddressModal.jsx`, `orders/*`, `order-confirmation/*` | Revert the pull request |
| 5 | **Milestone 121** quality assurance and docs | Before/after screenshot sets, full end-to-end, accessibility pass, CHANGELOG, TASKS, design notes. Fix Milestone 111's stale status line. Brand-kit regeneration is a separate follow-up (`docs/brand-kit/tools/`). | `docs/*` | n/a |

**Suggested order:** Milestone 115, then Milestone 116 (your decision), then Milestones 117, 118, 119, 120 and 121. Milestones 119 and 120 can run in either order after Milestone 117. If you keep the current palette, skip Milestones 116 and 117: Milestone 115 still delivers the structural improvements.

**Changes that can't be undone by reverting**, so none of these phases makes them:
- adding or renaming a `tone` or `label` select value
- deleting aliases in the same pull request that adds them
- renaming the `gocart:*` storage keys.

### Owner decisions (recorded 2026-11-12)
1. **Palette:** the **hybrid**. Keep `#5F42EC` for actions; warm ivory `#F7F5F0` page; aubergine `#352746` dark surface; no champagne. Recorded as a new Architecture Decision Record in Milestone 116.
2. **Promo cards:** keep the current cards as they are. They are admin content and stay unchanged.
3. **"Best sellers":** accepted as **"Featured"** (Architecture Decision Record 022 unchanged).
4. **Returns policy or delivery-time promise:** none. "Why shop with Mirza" shows only the verified facts: Cash on delivery, delivery Rs. 200 / free from Rs. 1,500 from Settings, no account needed, and tracking by order number and phone.
5. **Prices and MRPs:** demo data, no change.
6. **Checkout address on phones:** keep the modal (Milestone 120 adds labels only).
7. **Phase 1 (Milestones 115 to 117) authorized.** Phases 2 to 5 still need a separate go-ahead.

### Decisions that were needed from the owner before Phase 1
1. Palette: the **hybrid** (recommended), the kit as it is, or your proposal (champagne would fail contrast as text).
2. Promo cards and "Deals of the day": keep, rewrite, or deactivate the current seasonal cards and the 48-day deals (admin content).
3. "Best sellers": accept "Featured" or "Picked for you" as the honest label (Architecture Decision Record 022).
4. "Why shop with Mirza": confirm whether any returns or exchange policy or delivery-time promise exists. If not, only the four verified facts appear.
5. Whether the MRPs are genuine earlier or market prices, since savings claims depend on it.
6. Checkout address on phones: keep the modal (smaller change) or move to an inline step.

---

## 10. Baseline screenshot locations

Captured on 2026-11-12 from the live test site with Playwright (Chromium), at scale factor 1, reduced motion, full page unless noted. The script stays outside the repo. It follows `docs/brand-kit/tools/capture.js`, including **hiding `tel:` and `mailto:` links and the footer Contact column for privacy**.

```
docs/redesign/baseline/
  mobile-390/    (390×844, touch)   20 PNGs
  tablet-820/    (820×1180, touch)  20 PNGs
  desktop-1440/  (1440×900)         20 PNGs
  capture-log.json  (HTTP status, horizontal overflow in px, console errors per page and viewport)
```

| File | Page |
|---|---|
| `01-home.png`, `01-home-fold.png` | Home (full page and first screen) |
| `02-shop.png` | `/shop` |
| `03-search-results.png` | `/shop?search=watch` |
| `04-search-empty.png` | `/shop?search=zzqxv` |
| `05-categories.png` | `/categories` |
| `06-category.png` | `/category/watches` |
| `07-category-filters-open.png` | `/category/watches`, sort and filter open |
| `08-product.png`, `08-product-fold.png` | `/product/23` (in stock, −30%, Limited edition) |
| `09-product-out-of-stock.png` | `/product/16` |
| `10-cart-empty.png` | `/cart` |
| `11-cart-filled.png`, `11-cart-filled-fold.png` | `/cart` with 3 lines (cart filled through `localStorage` only; no server writes) |
| `12-cart-address-modal.png` | Address modal open (screen only, no data entered) |
| `13-wishlist-empty.png`, `14-wishlist-filled.png` | `/wishlist` (filled through `localStorage`) |
| `15-orders-lookup.png` | `/orders` (paused notice, no Turnstile key on test) |
| `16-order-confirmation-nodata.png` | `/order-confirmation` with no session data |
| `17-not-found.png` | 404 page |

**Limitations:**
- In full-page captures, fixed bars (the phone tab bar and the product-page and cart action bars) appear part-way down the page. That's how Playwright stitches full pages. Use the `-fold` files for what is above the fold.
- No order was placed and no form was submitted, so there are no captures of filled checkout, a successful lookup or a real confirmation.
- Loading skeletons and focus states were not captured (**unverified**).

### Live data inventory (public read API, 2026-11-12)
- 24 products; 10 categories (all with an image); 7 `isFeatured`; labels: 3 new, 1 limited, 3 sale.
- 20 discounted (`mrp > price`); 4 live deals; 2 out of stock (Citrus Mist Body Spray, Round Frame Sunglasses).
- Prices Rs. 649 to Rs. 6,499.
- 0 active hero slides; 2 active promo cards.
- `storefrontContent`: no custom announcement messages.
- Settings: delivery Rs. 200, free from Rs. 1,500.

---

## Appendix: acceptance criteria every redesign phase keeps (from the Product review)
1. Cash on Delivery is the only payment shown or accepted.
2. Ordering never requires an account, login or sign-up.
3. Phone accepts only `03XXXXXXXXX` (or `+923…`, normalised). The server still rejects anything else.
4. Prices display as `Rs. 1,500` (no decimals). Totals, delivery and savings are computed on the server.
5. Delivery wording comes from Settings (Rs. 200, free from Rs. 1,500) and changes without a redeploy.
6. Turnstile widget, token check and paused behaviour are unchanged in checkout and `/orders`.
7. `/orders` keeps one form and one submit, and returns the same response for a wrong number or a wrong phone.
8. No ranking, rating, review, brand or specification that the data does not hold. Sections with no data are hidden.
9. Unknown `/category/<slug>` and product ids return HTTP 404.
10. Out-of-stock products can't be added to the cart and are labelled.
