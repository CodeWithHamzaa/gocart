# Project Spec — GoCart Pakistan

## Vision

Transform the open-source GoCart storefront into a **production-ready, single-store ecommerce platform for the Pakistani market**: one store (not a multi-vendor marketplace) where customers can browse and buy without creating an account, pay Cash on Delivery, and a store admin manages the catalog and orders through a proper CMS admin panel.

> **Architecture decision (accepted 2026-08-07):** This is a single-store platform. No vendors, no seller dashboard, no seller registration, no vendor approval. Admin Users only. Guest checkout only. COD only. See [DECISIONS.md — ADR-006](./DECISIONS.md#adr-006-single-store-no-vendors--admin-only-authentication-multi-vendor-marketplace-features-removed-from-scope).

## In scope (from stakeholder requirements)

| Requirement | Meaning for this project |
|---|---|
| Payload CMS v3 | Backend, data layer, and admin UI for products, orders, categories, media, etc. |
| PostgreSQL | The only datastore, accessed through Payload's Postgres adapter |
| Cash on Delivery only | The only payment method available at checkout for launch |
| Guest checkout | No account/login required for customers to place an order |
| Admin Users only | The only authenticated role in the system is the store admin (Payload admin user); no customer or vendor accounts |
| SEO first | Metadata, sitemaps, structured data, and crawlability are first-class, not bolted on |
| Mobile first | UI is designed and tested for mobile viewports first, then scaled up |
| Dockerized | The app, CMS, and database run in containers for both dev and prod |
| Production ready | Proper env config, error handling, logging, security hardening, and deployability — not a demo |
| Future support for online payments | Payment handling must be designed so a gateway (card, JazzCash, Easypaisa, etc.) can be added later without a checkout redesign |

## Out of scope for launch

- Online payment gateways (Stripe, JazzCash, Easypaisa, etc.) — deferred, but must not be architecturally precluded
- Customer accounts / customer login (guest checkout replaces this)
- **Advanced/faceted product filtering** — price ranges, brand, rating, in-stock toggles, sort controls, multi-facet selection. **Category *browsing* is in scope and ships at launch** ([ADR-013](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy)); what is deferred is filter *UI* on top of it. See the Filters row in [FEATURE_MATRIX.md](./FEATURE_MATRIX.md).
- **Multi-vendor marketplace features are permanently out of scope, not deferred** — decided (see [ADR-006](./DECISIONS.md)): no vendors, no seller dashboard, no seller registration, no vendor approval, no per-store ownership of products/orders. This platform is single-store.

## Roles

- **Guest / Customer** — browses the storefront, adds to cart, checks out as a guest, pays COD. No login. This is the only way customers interact with the store — there is no customer account option.
- **Admin User** — the only authenticated role in the system. Logs into the Payload CMS admin panel to manage products, categories, orders, and coupons (if retained) for the one store.
- ~~Vendor~~ — present in the inherited codebase (`app/store/*`, `Store` model) but **not part of the target product**. Decided out of scope; these routes/model are legacy to be removed in future implementation work, not a role in this platform.

## Core flows

1. **Browse** — customer visits the storefront and browses the catalog by category (`/categories` for the full category index, `/category/[slug]` for a category's products) or searches products by name (`/shop?search=`). Category browsing supports a two-level parent/child hierarchy, requires no account, and is server-rendered for SEO — settled by [ADR-013](./DECISIONS.md#adr-013-category-browsing-ships-in-phase-1-as-dedicated-slug-routes-with-a-two-level-hierarchy), specified in [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md).
2. **Cart** — customer adds items to a cart (works without an account).
3. **Guest checkout** — customer provides contact details and a Pakistani delivery address (name, phone, address, city, area), reviews order, confirms.
4. **Order placed (COD)** — order is created with `paymentMethod = COD`, `isPaid = false` until delivery/collection is confirmed by the admin.
5. **Admin fulfillment** — admin sees new orders in the Payload admin panel, updates order status (e.g. Placed → Processing → Shipped → Delivered) and marks payment collected.

## Non-functional requirements

- **SEO**: server-rendered product/category pages, per-page metadata, `sitemap.xml`, `robots.txt`, JSON-LD product structured data, optimized images.
- **Mobile-first**: layouts, tap targets, and performance budgets designed for mobile networks/devices common in Pakistan first.
- **Performance**: fast first load on mid-tier mobile devices and slower connections.
- **Security**: admin auth hardened, no secrets in client bundles, standard OWASP hygiene.
- **Observability**: basic logging/error tracking suitable for a small production deployment.
- **Localization readiness**: currency (PKR), address format, and phone-first contact patterns suited to Pakistan (WhatsApp/SMS are common delivery-confirmation channels — worth considering even if not in v1).

## Resolved decisions

1. ~~**Multi-vendor fate**~~ — **Resolved 2026-08-07**: single store, no vendors, no seller dashboard, no seller registration, no vendor approval. See [ADR-006](./DECISIONS.md).

## Open questions / assumptions to confirm with stakeholder

These materially affect scope and are flagged rather than silently decided:

1. **Currency**: Assumed PKR (₨) replacing the current hardcoded `$`. Needs confirmation of formatting convention (e.g. `Rs. 1,500` vs `₨1,500`).
2. **Delivery/shipping model**: Is shipping cost flat, free, weight-based, or city-based? Not yet defined.
3. **Order status set**: Existing `OrderStatus` enum (`ORDER_PLACED`, `PROCESSING`, `SHIPPED`, `DELIVERED`) — confirm this is sufficient, plus whether a `CANCELLED`/`RETURNED` status is needed for COD (common for COD refusal-at-door scenarios).
4. **Ratings/reviews**: Original app supports post-purchase ratings tied to a `userId`. Under guest checkout, does this feature stay (needs a non-account-based identity, e.g. order/email-based) or get dropped for v1?
5. **Notifications**: SMS is deferred to a future phase, and email infrastructure (Resend, free tier) is decided as part of the initial production baseline ([ADR-015](./DECISIONS.md#adr-015-initial-production-infrastructure-baseline)) — but which order-lifecycle emails, if any, are actually sent for v1, and whether WhatsApp is used, are still not specified.
6. **Coupons**: Original app has a `Coupon` model with `forNewUser`/`forMember` targeting tied to accounts — needs rethinking under guest checkout.
