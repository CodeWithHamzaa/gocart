# Rangla Storefront Redesign: Design Handoff

This folder is the source of the "Rangla — E-commerce Home" design canvas. Use it as the single source of truth when restyling the existing Next.js + Tailwind storefront.

"Rangla" is a placeholder brand. Keep the project's real store name and logo unless told otherwise.

## Files

| Design file | Screen | Viewport |
|---|---|---|
| `Main.dc.html` | Home | Desktop (fluid, max-width 1280px) |
| `Mobile.dc.html` | Home | Mobile (390px) |
| `AllCategories.dc.html` / `CategoriesMobile.dc.html` | All categories grid | Desktop / Mobile |
| `Category.dc.html` / `CategoryMobile.dc.html` | Category product listing (filters, sort, grid) | Desktop / Mobile |
| `Product.dc.html` / `ProductMobile.dc.html` | Product detail | Desktop / Mobile |
| `Cart.dc.html` / `CartMobile.dc.html` | Cart | Desktop / Mobile |
| `Checkout.dc.html` / `CheckoutMobile.dc.html` | Checkout and order-placed state | Desktop / Mobile |
| `canvas.json` | Canvas index: artboard sizes and order | — |

### Screenshots (`screens/`)

The screenshots are rendered from the design files with the design tool's own runtime. Desktop shots are 1440px wide at 1×; mobile shots are 390px wide at 2× (so 780px actual). Use them as the visual target for side-by-side checks, and use the `.dc.html` markup for exact values.

| Screenshot | Shows |
|---|---|
| `desktop-01-home.png`, `mobile-01-home.png` | Home |
| `desktop-02-all-categories.png`, `mobile-02-all-categories.png` | All categories |
| `desktop-03-category-listing.png`, `mobile-03-category-listing.png` | Category listing |
| `desktop-04-product-detail.png`, `mobile-04-product-detail.png` | Product detail |
| `desktop-05-cart.png`, `mobile-05-cart.png` | Cart (filled) |
| `desktop-05b-cart-empty.png`, `mobile-05b-cart-empty.png` | Cart (empty state) |
| `desktop-06-checkout.png`, `mobile-06-checkout.png` | Checkout form |
| `desktop-07-order-placed.png`, `mobile-07-order-placed.png` | Order placed confirmation |

Mobile artboards were drawn as tall frames, so on mobile the sticky bottom bars (tab bar, Add to cart, Checkout) appear at the very bottom of each full-page screenshot. In the real app they must stay fixed to the bottom of the viewport.

### How to read the `.dc.html` files

They are design-tool templates, not runnable pages. Each file has three parts:

- **Markup:** everything inside `<x-dc>…</x-dc>` is the real layout, written as plain HTML with inline styles. Take exact values from it: spacing, radii, font sizes, colours and shadows.
- **Template syntax:**
  - `{{name}}` is a value computed in the script block at the bottom of the file.
  - `<sc-for list="{{items}}" as="p">` is a loop (equivalent to `.map()`).
  - `<sc-if value="{{cond}}">` is a conditional.
  - `onClick="{{fn}}"` is an event handler.
- **Script:** the `class Component extends DCLogic` block holds sample data and UI state, such as tabs, filters, quantity steppers, the wishlist and selected options. Treat it as an interaction spec only. Real data must come from the existing app's data layer.

Links like `href="Cart.dc.html"` show the navigation flow between screens. Map each one to the app's real routes.

Product images are drawn as line icons on pastel tiles. Replace them with the project's real product images. Keep the tile style: rounded corners, pastel background, square aspect ratio.

Bracketed text such as `[RETURN WINDOW]` or `[ORDER ID]` is a placeholder. Use real data or config.

## Design tokens

Put these in `tailwind.config` under `theme.extend`.

### Colours

| Token | Hex | Use |
|---|---|---|
| `primary` | `#5B3FD9` | Buttons, prices, active states, links |
| `primary-dark` | `#3F27A8` | Hover, link hover, text on `primary-soft` |
| `primary-deep` | `#4B32C3` | Promo band background |
| `primary-soft` | `#EFEBFF` | Icon chips, quantity-stepper background, active nav pill |
| `lavender` | `#EDE7FF` | Hero and newsletter backgrounds |
| `lavender-2` | `#DCD2FF` | Hero decorative circle |
| `lavender-tile` | `#F4F1FD` | Product image tiles, selected option background |
| `ink` | `#1C1A2E` | Body text and headings |
| `ink-2` | `#3B384D` | Secondary text and nav links |
| `muted` | `#5F5B73` | Captions and labels (passes 4.5:1 on white) |
| `strike` | `#6E6A82` | Strikethrough prices |
| `line` | `#EEEAF6` | Card borders and dividers |
| `line-2` | `#E4DFF2` | Input borders |
| `page` | `#FAF9FE` | Desktop page background |
| `pink` | `#E8336D` | Discount badge circle, wishlist count, filled heart |
| `pink-dark` | `#C81E5B` | "Best seller" badge, text on `pink-soft` |
| `pink-soft` | `#FFE4EA` | "% OFF" chip, countdown chips |
| `sale-blue` | `#1F55B8` | "Sale" badge |
| `success` | `#157544` | Success text |
| `success-soft` | `#E3F7EC` | Success background, cash-on-delivery tint |

Category pastels (background / icon colour):

| Category tint | Background | Icon |
|---|---|---|
| Pink | `#FFE8EF` | `#D6336C` |
| Blue | `#E6F0FF` | `#2F6BDB` |
| Mint | `#E3F7EC` | `#1E9E5A` |
| Yellow | `#FFF4D6` | `#C98A00` |
| Lavender | `#F0EBFF` | `#6B4FE0` |
| Peach | `#FFEDE3` | `#E8692E` |

### Typography

- **Font:** Plus Jakarta Sans, weights 400, 500, 600, 700 and 800. Load it with `next/font/google`.
- **Headings:** weight 800 with letter-spacing −0.02em to −0.03em.
- **Desktop sizes:**
  - Hero h1: 60px, line-height 1.05
  - Page h1: 32–44px
  - Section h2: 28px
  - Card title: 15px, weight 600
  - Body: 15px
- **Mobile sizes:**
  - Hero: 26px
  - Section h2: 20px
  - Card title: 13px

### Shape and elevation

- **Radius:**
  - Cards: 20px
  - Large panels and hero: 26–28px
  - Image tiles: 14px
  - Inputs and buttons: 12–14px
  - Chips and pills: 999px
- **Card shadow:** `0 8px 24px rgba(40, 24, 120, 0.05)` with a 1px `line` border.
- **Floating shadow** (hero product cards, sticky bars): `0 24px 48px rgba(63, 39, 168, 0.14)` and `0 -6px 20px rgba(40, 24, 120, 0.06)`.
- **Touch targets:** at least 44×44px on all icon buttons.

### Layout

- **Desktop container:** `max-width: 1280px; padding-inline: 24px`. Cart and checkout use `max-width: 1120px`.
- **Mobile:** 16px side gutters. The bottom tab bar (Home, Categories, Wishlist, Orders, Account) is sticky on Home, Categories and Category listing. Product detail and cart use a sticky bottom action bar instead.
- **Grids:** `repeat(auto-fill/auto-fit, minmax(…))`. Product cards use minmax 210–220px on desktop and 2 columns on mobile.
- **Breakpoints:** the desktop and mobile artboards are the two ends of the range. Between them, layouts reflow with flex-wrap and auto-fit grids:
  - The filter sidebar stacks above the product grid.
  - The order summary drops below the cart items.

## Reusable components to build

- **Header:** logo, search with button, sign-in, wishlist and cart with count badges, category nav row.
- **ProductCard:**
  - Pastel image tile.
  - Badge (New / Best seller / Sale).
  - Heart toggle.
  - Category caps label, title, violet price with strikethrough, pink "% OFF" chip.
  - Round violet-soft cart button.
- **CategoryTile:** two variants, a pastel card with a corner icon (home page) and a large pastel circle with a label underneath (categories page).
- **Badges:** discount chip, quantity stepper, pill tabs, radio cards (delivery and payment), section header with "View all →".
- **Panels and bars:** trust/value-props row, newsletter panel, footer, mobile bottom tab bar, sticky mobile action bar.
- **States:** empty cart, order placed.

## Out of scope for this design

- **Admin dashboard:** there is no admin design in this canvas. Apply the same tokens (colours, font, radii, card style) to the existing admin layout for visual consistency, but don't redesign its layout or flows.
- **Other storefront pages:** pages not in the table above (auth, account, orders, wishlist, search results, store/vendor pages) should reuse the same components and tokens.
