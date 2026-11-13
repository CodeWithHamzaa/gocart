# Phase 4: cart, checkout, order confirmation and order lookup (Milestone 120)

This document records what Milestone 120 changed on the cart, the checkout panel, the address form,
the order confirmation page and the order lookup page, what it deliberately left alone, and how it was
checked. The owner authorized Phase 4 on 2026-11-13. It builds on Phases 1 to 3 (the hybrid palette,
the shared `Button` and `Price`, and the listing and product pages). The changes are markup, labels and
small display fixes. No order logic, server action, validation rule, schema or dependency changed.

## What changed for a customer

**Cart**
- Each cart line now has one way to remove it: the bin at the top right of the line. Before, a line
  with quantity 1 had a second bin inside the quantity control, so three lines could show five bins.
  Now the minus in that control is switched off at 1. The product page keeps its bin-at-one behaviour,
  because it has no separate remove button.
- A short line beside the Place order button says "Choose or add a delivery address to place your
  order" while no address is chosen. Before, the shopper only learned this from an error message after
  pressing the button. The line disappears once an address is chosen, and the button is linked to it for
  screen readers.

**Address form (the popup stays a popup, as the owner decided)**
- Every field has a visible label instead of only a placeholder, grouped under "Contact" (name, mobile
  number, email) and "Delivery address" (street address, city, area).
- The mobile number field shows a hint ("Eleven digits, like 03001234567"). A wrong number now shows its
  message under the field and the field is marked invalid, as well as in the notice at the top of the screen.
- **Email and area are marked Optional and are no longer required by the form.** The server already
  accepted an order without an area (`validateArea`), and the email is never sent with the order, so
  requiring either only blocked shoppers. This is the one behaviour change in this milestone; to undo it,
  put `required` back on those two inputs in `components/AddressModal.jsx`.
- A chosen address is shown without a gap when the area is empty ("Name, street, city" instead of
  "Name, street, , city"). A saved address with an area looks exactly as before.

**Order confirmation**
- The order number is larger and sits with one plain line: "Keep this number. With your phone number, it
  is how you track your order." The number is still alone in its own element, as plain text. "Track order"
  still opens the Orders page, which fills in the number and phone by itself.

**Order lookup**
- Each field has a one-line hint. It is still one form with one submit button, and a wrong number and a
  wrong phone still get the same answer (the server decides that; it was not touched).

## What was not done, and why

| Audit item | Status |
|---|---|
| Phone numbers or email from Settings in the "ordering is paused" notice | Not done. That text lives in `components/TurnstileWidget.tsx`, which this redesign does not edit (the Turnstile check must not be changed or weakened). It can be a separate small milestone if the owner wants it. |
| Moving the address from a popup to an inline step on phones | Not done, by owner decision (the popup stays). |
| A copy button that also copies the phone number, an order-status timeline | Not done. Not in the audit, and no data supports a timeline beyond the existing status. |
| Disabling Place order until an address is chosen | Not done. The button's enabled rules are checkout behaviour and stay as they were; the new line explains the missing step instead. |

## Rules kept

- `OrderSummary`'s state, effects, the `placeOrder` call, the idempotency key and the Turnstile wiring are
  unchanged (the file's diff is the address text join, the new line and one `aria-describedby`).
- `app/(public)/cart/actions.ts`, `lib/order-guard.ts`, `lib/validation/pk.ts` and `TurnstileWidget.tsx`
  were not edited.
- `/orders` still has exactly one submit button. The order number text on the confirmation page is read
  by the end-to-end test, so it was kept as plain text in one element.
- Guest checkout and cash on delivery only. No payment method, promo code or account step was added.

## Files

Changed: `components/ui/QuantityStepper.tsx` and `components/Counter.jsx` (the `removeAtOne` option),
`app/(public)/cart/page.jsx`, `components/OrderSummary.jsx`, `components/AddressModal.jsx`,
`app/(public)/order-confirmation/OrderConfirmation.tsx`, `app/(public)/orders/OrderLookup.tsx`.
No new files other than these notes and the captures.

## How it was checked

Everything ran in a development sandbox against a throwaway local PostgreSQL 16 with the demo seed and a
production build. **No order was placed**: the Turnstile script cannot load in this sandbox, so the
Place order button stays disabled here, as it does on the test site without keys. The confirmation page
was captured by putting a made-up order (number `GC-20261113-AB12CD34`) into the browser's session
storage, which is the same hand-over the real checkout uses.

- Type-check and lint: no errors (the same 8 warnings as `main`).
- Unit scripts: environment, Turnstile, idempotency, category filters, users guard, demo images, search
  engine optimization, demo photo rollout and storefront content all pass.
- A script (kept outside the repository) ran 11 checks at each of 390, 820 and 1440px, 33 in all, and
  every one passed (`after/checks.json`): one remove control per cart line (3 lines, 3 remove buttons;
  `main` had 5); the reason line shows before an address is chosen and is gone after; the address form has
  six labels; typing in a field keeps focus; a landline number is refused with the Pakistani mobile number
  message; the form saves without email and area; the chosen address has no empty gap; the Orders page has
  one submit button; the order number on the confirmation page can be read from the page text; "Track
  order" opens Orders with the number filled in.
- On `main` the same script showed 5 remove buttons for 3 lines and a form that would not save without an
  email (the browser's required-field check stopped it).
- The general capture script (all 17 pages at 390, 820 and 1440px, 51 captures) ran on this build: no
  horizontal overflow and no console errors on any page, apart from the intentional 404 page. That
  covers the empty and filled cart, the address form, the orders page and the confirmation page without
  an order. The made-up-order confirmation and the other new states are in `before/` and `after/`; the
  step-by-step script above does not measure overflow, so those states were not measured for it
  (unverified).
- The end-to-end suite was not run in the sandbox (the pinned browser is not installed); continuous
  integration runs it on the pull request. Its golden-path test clicks "Add Address", fills fields by `name`,
  and presses SAVE ADDRESS; all three are unchanged.

## Screenshots

`before/` is `main` at the start of this milestone; `after/` is this milestone. Same local build setup,
generated demo artwork, seed free-delivery threshold of Rs. 3,000 (the test site's setting is Rs. 1,500).
Each viewport folder has `11-cart-filled` (and `-fold`), `12-cart-address-modal`, `15-orders-lookup`
and `16b-order-confirmation-order`. `after/` also has `12b-cart-address-modal-error`,
`12c-cart-address-chosen` and `15b-orders-prefilled`. The phone tab bar is hidden in these captures.

## Rollback

Revert the pull request. No data, schema or configuration is involved.
