# Category Browsing Requirements — GoCart Pakistan

The behavior specification for customer-facing category browsing. **`M27a` and `M27b` in
[MIGRATION_PLAN.md](./MIGRATION_PLAN.md) implement against this document**; `M9`, `M10`, and `M22`
supply the data model and queries it depends on.

Category browsing is **Phase 1 launch scope**, settled by
[ADR-013](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy)
(Accepted 2026-08-16). It is not a filter feature and is not deferred — see
[Out-of-scope filtering](#out-of-scope-filtering-features) for the boundary.

> **Current state**: neither route exists. Categories exist today only as a hardcoded six-item array
> in `assets/assets.js`, a second conflicting ten-item array in the (to-be-deleted) vendor add-product
> form, a free-text `category` string on each dummy product, unlinked breadcrumb text on the product
> page, and `components/CategoriesMarquee.jsx`, which renders bare `<button>`s with no `onClick` and
> no `href`. `prisma/schema.prisma` has no `Category` model at all. This document describes the target,
> not anything that exists.

---

## Routes

| Route | File | Milestone | Rendering |
|---|---|:---:|---|
| `/categories` | `app/(public)/categories/page.tsx` | **`M27b`** | Server component |
| `/category/[slug]` | `app/(public)/category/[slug]/page.tsx` | **`M27a`** | Server component |

Both live inside the existing `(public)` route group, so they inherit the storefront shell
(`Banner` / `Navbar` / `Footer`) from `app/(public)/layout.jsx` with no additional layout work.

**Both are `.tsx`, not `.jsx`.** `M2a` established TypeScript with `allowJs: true` on the explicit
rule that *new files are `.ts`/`.tsx` and existing `.jsx` is never opportunistically converted*.
These routes read Payload's generated `payload-types.ts` through the `lib/payload/*` utilities from
`M22` — typed end to end from the first commit.

Supporting files owned by the same milestones: `loading.tsx` on both routes, plus `error.tsx` and
`not-found.tsx` on `/category/[slug]`.

## Purpose

1. **The primary browse path.** A multi-category catalog needs a way in other than "everything at
   once" (`/shop`) or "I already know the product name" (search). Today the storefront has neither.
2. **The SEO landing surface for category-intent search.** Category-level queries ("phone cases in
   Pakistan") are a large share of ecommerce discovery, and there is currently no page that can rank
   for one. [ADR-007](./DECISIONS.md#adr-007-seo-first-and-mobile-first-are-default-requirements-not-a-later-pass)
   makes server-rendered category pages non-negotiable.
3. **The destination that makes three existing plan items coherent.** `CategoriesMarquee` (`M27`),
   the product-page breadcrumb (`M25`), and the sitemap's category entries (`M42`) all point at a
   category URL. Without these routes, all three point at nothing — the contradiction recorded as
   finding **C8** in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

## URL structure

- **Slug-based**, lowercase, hyphen-separated, ASCII: `/category/phone-cases`.
- **Flat, not nested.** A child category is addressed as `/category/phone-cases`, **not**
  `/category/accessories/phone-cases`. Parent and child share one URL shape and one route file.
  The reason is stability: re-parenting a category in the admin is an ordinary catalog operation, and
  under a nested scheme it silently breaks every live URL, inbound link, and indexed page beneath it.
  Under a flat scheme it changes nothing a customer or a crawler can see.
- **Slugs are stable.** Generated from the title on first save, then **never auto-regenerated** when
  the title is edited. An admin can change a slug deliberately; renaming "Watches" to "Wrist Watches"
  must not silently orphan `/category/watches`.
- **Unique across all categories**, parent and child alike — enforced at the collection level, since
  the flat URL space has no room for two `phone-cases`.
- **`/category/[slug]` is the single canonical URL for products-by-category.** No `/shop?category=`
  parameter is introduced. Two URLs returning one result set is a duplicate-content problem that
  splits ranking signals between them; it is not a feature.
- **Pagination is a query parameter**, not a path segment: `/category/phone-cases?page=2`. See
  [Pagination expectations](#pagination-expectations).
- `/categories` takes no parameters.

## Parent/child category behavior

**Exactly two levels: parent → child.** A third level (grandchild) is rejected — the `Categories`
collection validates that a category's `parent` does not itself have a `parent`.

Two levels is a deliberate bound, not a limitation to work around. It keeps descendant queries to a
single known depth, keeps breadcrumbs to a fixed shape, keeps the `/categories` page renderable in
one query, and removes any possibility of a cycle. Deeper nesting can be unlocked later by relaxing
the validation — the `parent` self-relation already models it, so no data migration would be needed.

### `/categories` — the landing page

- Lists **all top-level categories** (those with no `parent`), each rendered as a card with its name,
  image, and — where present — its children as sub-links.
- Every card and sub-link navigates to `/category/[slug]`.
- Ordered by `displayOrder`, then alphabetically by title as a stable tiebreak.
- A parent with no children renders as a plain card; this is normal, not an error.

### `/category/[slug]` — a **parent** category

- Renders the category name as `<h1>`, its description, and its **child categories** as navigation
  chips or cards linking to their own pages.
- Lists products from **the parent itself plus every child** (descendant rollup).
- Breadcrumb: `Home / Categories / {Parent}`.

The rollup is what keeps parent pages honest. In a real catalog the admin files products under the
most specific category available, so a parent that listed only directly-assigned products would
render empty while its children were full — the single most common way category navigation looks
broken to a customer.

### `/category/[slug]` — a **child** category

- Renders the category name as `<h1>` and its description.
- Lists **only its own products** — a child has no descendants to roll up.
- Breadcrumb: `Home / Categories / {Parent} / {Child}`, with `{Parent}` linking to the parent's page.
- Shows no child-category navigation, having none.

## Product relationship

- **A product belongs to exactly one category** — `Products.category` is a `relationship` to
  `categories` with `hasMany: false`.
- **That category is the most specific one that applies**, which in a two-level tree normally means a
  child. Admins never file a product under both a parent and its child; the rollup handles the parent.
- **Parent pages derive their inventory from the rollup**, resolved in
  `getProductsByCategory()` (`M22`), not in route code. Both routes and the sitemap read the same
  helper, so "which products are in this category" has exactly one implementation.
- Products assigned directly to a parent category are valid and appear on that parent's page.
- A product's category drives the product-page breadcrumb link (`M27a` wires it), replacing today's
  unlinked plain-text `Home / Products / {category}`.

**Out-of-stock products are still listed** (with an out-of-stock indicator), not hidden. Hiding them
would make the catalog appear to shrink and would break inbound links to individual products. Whether
they can be *ordered* is a separate concern, tracked as risk `R5` in
[PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md).

## SEO requirements

Non-negotiable per [ADR-007](./DECISIONS.md#adr-007-seo-first-and-mobile-first-are-default-requirements-not-a-later-pass).
These ship **with the routes**, in `M27a`/`M27b` — not as a later pass in `M41`.

- **Server-rendered content.** The product grid, category name, description, and pagination links are
  present in the initial HTML response, not injected after hydration. Verified by viewing page source,
  not DevTools.
- **`generateMetadata` per page** — title and description derived from the category's SEO override
  fields where set, falling back to its title and description.
- **`generateStaticParams`** over published category slugs where build-time generation is practical,
  so category pages are static-by-default and revalidated rather than rendered per request.
- **One `<h1>` per page**, carrying the category name.
- **Canonical URL** on every page, including paginated variants: page 1 canonicalizes to the bare
  `/category/[slug]` (no `?page=1`), and pages 2+ self-canonicalize so their products stay indexable.
- **`rel="prev"` / `rel="next"`** across the paginated set.
- **Real anchor elements** for every category link and pagination control — `<a>`/`next/link`, never
  a `<button>` with an `onClick`. A crawler cannot follow a click handler, and neither can a keyboard
  user. This is precisely the defect `CategoriesMarquee` has today.
- **Both routes in `sitemap.xml`** — `/categories` plus one entry per published category (`M42`).
- **Images** with explicit dimensions and meaningful `alt` text; no layout shift on load.
- **No authentication, ever.** Category browsing is fully public, per
  [ADR-005](./DECISIONS.md#adr-005-guest-checkout-no-customer-accounts) and
  [ADR-006](./DECISIONS.md#adr-006-single-store-no-vendors--admin-only-authentication-multi-vendor-marketplace-features-removed-from-scope).
  No login wall, no soft gate, no cookie prerequisite, nothing that a crawler or a first-time visitor
  can fail.

**Not required for Phase 1**: JSON-LD on category pages (`BreadcrumbList`, `CollectionPage`,
`ItemList`). `M43` scopes structured data to `Product` on product detail pages. Category structured
data is a reasonable post-launch addition and is deliberately not scheduled.

## Empty state

A category with zero products **renders 200 with an empty state** — a short message plus links back
to `/categories` and `/shop`. On a parent, its child-category navigation still renders, since those
children may well have stock.

**Never a 404.** An empty category is a real, valid, indexable page whose emptiness is a temporary
property of inventory. Returning 404 would remove it from the index every time it sold out and
require re-crawling to recover, churning the sitemap against ordinary stock movement.

`/categories` with no categories at all renders a neutral empty state. This should only ever be
visible against an unseeded database, but it must not render as a broken page.

## Loading state

- `loading.tsx` on both routes, rendering a skeleton whose **grid geometry matches the loaded state** —
  same column counts at each breakpoint, same card aspect ratio, same spacing.
- The skeleton exists to hold layout, not to decorate. A skeleton with different dimensions than the
  content it precedes causes exactly the layout shift it was added to prevent — which is a
  mobile-first failure, not a cosmetic one.
- No spinner-only full-page loading state on either route.

## Error state

| Condition | Behavior |
|---|---|
| Slug does not match any category | `notFound()` → real HTTP **404**, rendered by `not-found.tsx` with links to `/categories` and `/shop` |
| Slug matches an unpublished category | Same as above — 404, not a partial render |
| `?page=N` beyond the last page | **404** — prevents unbounded crawlable URL space |
| `?page=N` non-numeric or `< 1` | Treated as page 1 |
| Payload/database query fails | `error.tsx` boundary with a retry affordance and a **non-200** status |

**A data-layer failure must never render as an empty category.** Doing so reports "this category has
no products" to a customer and, worse, to a crawler — misrepresenting the catalog as smaller than it
is, on a page whose whole purpose is being indexed accurately.

## Pagination expectations

- **Page-number URLs**: `/category/[slug]?page=2`. Server-rendered.
- **24 products per page** — divides evenly into 2-, 3-, and 4-column grids, so no page ends in a
  ragged final row at any breakpoint.
- Page 1 is served at the bare `/category/[slug]`; `?page=1` is accepted and canonicalizes to it.
- Pagination controls are **real links** (previous / next / numbered), crawlable and keyboard-navigable.
- Current page, total pages, and total product count are rendered as text.
- The rollup applies before pagination: a parent's page count reflects parent + child products.
- **No infinite scroll, no load-more button** for Phase 1. Client-side appending leaves every product
  past page 1 invisible to crawlers unless a parallel paginated path is maintained anyway — a direct
  conflict with the SEO-first constraint.

## Out-of-scope filtering features

Category browsing is **navigation**, not filtering. The following remain **Future Phase**, consistent
with the Filters row in [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) and the scope note in
[MIGRATION_PLAN.md](./MIGRATION_PLAN.md). None is to be built as part of `M27a`/`M27b`:

- Price-range filtering or price sliders
- Brand filtering (no `Brands` entity exists — also Future Phase)
- Rating filtering
- In-stock / out-of-stock toggles
- Sort controls (price, newest, popularity) — default order only
- Multi-category or multi-facet selection
- Sidebar or drawer filter UI, and any filter-state URL parameters
- **`/shop?category=`** — explicitly not introduced; `/category/[slug]` is the canonical route

`/shop` keeps its current role unchanged: the all-products listing plus name-based search
(`?search=`, made a real query at `M29`). Category browsing does not modify it.

## Responsive expectations

Mobile-first per [ADR-007](./DECISIONS.md#adr-007-seo-first-and-mobile-first-are-default-requirements-not-a-later-pass);
both routes enter the `M44` audit.

- Product grid: 2 columns on mobile, 3 on tablet, 4 on desktop.
- `/categories` cards: single or double column on mobile, scaling up with the viewport.
- Category links and pagination controls meet minimum tap-target sizing on touch devices.
- No horizontal scroll at any supported width.
- Category names wrap rather than truncate mid-word or overflow their card.
- Breadcrumbs degrade gracefully on narrow viewports.

## Data model requirements

The `Categories` collection (`M9`) must provide the following. Every field listed here has a named
reader in this document — nothing is specified speculatively.

| Field | Type | Required | Read by |
|---|---|:---:|---|
| `title` | text | ✓ | `<h1>`, cards, breadcrumbs, metadata fallback |
| `slug` | text, unique, indexed | ✓ | Every URL; `generateStaticParams`; sitemap |
| `parent` | relationship → `categories`, `hasMany: false` | — | Hierarchy, rollup, breadcrumbs, `/categories` grouping |
| `description` | textarea / richtext | — | Category page intro copy; meta-description fallback |
| `image` | upload → `media` | — | `/categories` cards |
| `seo.metaTitle` | text | — | `generateMetadata` override |
| `seo.metaDescription` | textarea | — | `generateMetadata` override |
| `displayOrder` | number | — | Deterministic ordering on `/categories` and child navigation |

Constraints:

- `slug` is generated from `title` on create, then stable — **not** regenerated on title edits.
- `slug` is unique across the whole collection, parent and child alike (flat URL space).
- A category whose `parent` already has a `parent` is **rejected** (two-level limit).
- A category may not be its own parent.
- Public read access; admin-only write (`M13`).

`Products.category` is a `relationship` to `categories` with `hasMany: false` (`M10`).

## Milestone ownership

| Milestone | Owns |
|:---:|---|
| **`M9`** | `Categories` collection — the field list and constraints above |
| **`M10`** | `Products.category` single relationship |
| **`M13`** | Public read access; seeded parent/child categories with products |
| **`M22`** | `getTopLevelCategories()`, `getCategoryBySlug()`, `getProductsByCategory()` with rollup |
| **`M27`** | `CategoriesMarquee` wired to real categories (renders inert; links land at `M27a`) |
| **`M27a`** | `/category/[slug]` + marquee links + product-page breadcrumb link |
| **`M27b`** | `/categories` |
| **`M41`** | Canonical/OG normalization pass across both routes |
| **`M42`** | Both routes in `sitemap.xml` |
| **`M44`** | Mobile/tablet/desktop audit of both routes |

## Cross-references

- Decision and rationale: [ADR-013](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy)
- Milestones and dependencies: [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)
- Filters boundary: [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) (Categories and Filters rows)
- Originating gap: finding **C8** in [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md)
- SEO/mobile mandate: [ADR-007](./DECISIONS.md#adr-007-seo-first-and-mobile-first-are-default-requirements-not-a-later-pass)
