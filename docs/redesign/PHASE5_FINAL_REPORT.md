# Premium storefront redesign: final report (Milestones 115 to 121)

This is the closing record of the redesign of the Mirza storefront. It says what changed, how it was
checked, what was not checked, and what is still open for the project owner. It is written for someone
who has not followed the work. The earlier notes are beside it: the starting audit
(`PHASE0_AUDIT.md`) and one folder of notes and screenshots per phase (`phase1/` to `phase4/`).

**Status:** the work is code-complete and documented. Nothing has been deployed: merging does not
deploy, and the test site (`gocart-test-inky.vercel.app`) still shows the design from before the
redesign.

## What was delivered

| Milestone | Phase | What changed for a customer | Pull request |
|---|---|---|---|
| 115 | 1 | No visible change. Colours moved to one shared file (`app/tokens.css`); one shared button and one shared price block replace many hand-written copies. | 81 (merged) |
| 116 | 1 | The decision record for the palette (Architecture Decision Record 052, `ADR-052`): warm ivory page, white cards, violet for every action, an aubergine dark surface. | 81 (merged) |
| 117 | 1 | The palette is applied: warm ivory page and lines, aubergine footer with a white focus ring. The admin panel reads the same colour file, so its violet matches the storefront's. | 81 (merged) |
| 118 | 2 | Home page: an editorial banner, "Shop by category" as round photos at every screen size, "Limited-time deals" with an end date, every category in the footer. "Why shop with Mirza" removed on request. | 81 (merged) |
| 119 | 3 | Shop, search and category pages share one header; the shop can be sorted; an empty search offers every category; the product page has two columns from tablet width, the price in the phone's bottom bar, a swipeable photo and a "More to explore" fallback. The category page keeps its lavender banner on desktop (owner review). | 83 (merged) |
| 120 | 4 | Cart: one remove control per line. Address form: visible labels, email and area optional. Place order: a line saying when an address is missing. Confirmation: a larger order number with a plain instruction. Order lookup: field hints. | 84 (all checks passed) |
| 121 | 5 | Accessibility and layout check, two fixes it found (below), a final screenshot set, this report, and Milestone 111's status corrected. | this milestone's pull request |

No database schema, data, API, order logic, Turnstile or dependency change was made by any of these
milestones, and no image was sourced, created, edited, renamed or deleted.

## How it was checked

All checks ran in a development sandbox against a throwaway local PostgreSQL 16 with the demo seed and a
production build, except the end-to-end suite, which runs in continuous integration.

- **Type-check and lint:** no errors. Lint reports the same 8 warnings that `main` had before the redesign.
- **Unit scripts:** environment, Turnstile, idempotency, category filters, users guard, demo images,
  search engine optimization, demo photo rollout and storefront content all pass.
- **End-to-end suite:** not runnable in the sandbox (the pinned browser is not installed). It ran in
  continuous integration on each pull request, and all six jobs (checks, end-to-end, migrations,
  production stack, image, Turnstile contract) passed on pull requests 81, 83 and 84. For this
  milestone's own pull request, read its check results; this report does not claim them.
- **Checkout steps (Milestone 120):** a script ran 11 checks at each of three screen widths (33 in all);
  all passed, and it was re-run after the Milestone 121 changes with the same result.
- **Screenshots:** 17 pages at 390, 820 and 1440px. No horizontal overflow and no console errors on
  any page, except the 404 page, which logs its two expected "not found" messages.
- **Real orders:** none were placed. The Turnstile script cannot load in the sandbox, so Place order
  stays disabled there, as it does on the test site without keys. A real placed order is unverified
  outside continuous integration.

### Accessibility pass (Milestone 121)

An automated script (kept outside the repository, no new dependency) visited 15 page states at each of
three widths (45 page checks) and tested: page language and title; exactly one main heading;
no skipped heading levels; one main landmark; image descriptions present; every link and button has a
name; every form field has a label; no duplicate identifiers; touch target size; text contrast; and the
first 45 keyboard stops on each page.

**Passed everywhere:** language and title, one main heading, heading order, landmark, image
descriptions, names, labels, no duplicate identifiers, a "skip to content" link as the first keyboard stop,
and text contrast on 2,086 text items. Two text items sit on a gradient or image background and could not be
measured by the script (unverified).

**Found and fixed:**
1. The header search box, the address form fields and the order lookup fields had removed the browser
   focus outline and replaced it with a 1px mark that was easy to miss. They now show the site's normal
   2px focus ring.
2. On the cart, product-name links were 23px tall, below the 24px minimum of the Web Content
   Accessibility Guidelines 2.2 (level AA). They are now 29px.

**Still open (not fixed here, by choice):**
- Some links are smaller than this project's own 44px touch size on phones and tablets, but all are at
  least 24px, which meets level AA: the "Mirza" logo link (60 by 30), a few short navigation links
  (the script found "Home", "Shop" and "Bags", 34 to 41px wide and 44px tall; which row of the page each
  one sits in was not traced), "Track your order" in the top bar (24px tall), the home banner's slide dots
  (24 by 24) and pause button (32 by 32), and the category link above the product name (24px tall). These
  belong to the shared header, top bar and banner, which the redesign restyled but did not rebuild.
  Enlarging them is a small separate milestone.
- The script lists the search box as having no focus ring, which is a false alarm: the ring is drawn on
  the box around it, and the screenshots `final/focus-search-desktop.png` and
  `final/focus-search-mobile.png` show it.
- **Not tested at all:** a screen reader (VoiceOver, TalkBack, NVDA), real phones, browser zoom to 200%,
  right-to-left or other languages, and Windows high-contrast mode. These need a person.

## What is still open for the owner

1. **Deploy to the test site.** Nothing from the redesign is live. A deploy is a separate step done on
   request; no database migration is needed for any of these milestones.
2. ~~Merge the open pull requests.~~ Done: pull request 84 (Milestones 120 and 121) was merged on 2026-11-13.
3. **Photographs.** Every image slot still uses an existing product or category photo, or is absent.
   The earlier request list stands:

   | Slot | Status |
   |---|---|
   | Home banner (desktop and phone crop) | Uses a product photo. A lifestyle image would raise the quality most. |
   | Category photos at 1600 by 1200 | The current 800 by 600 photos are soft in the larger circles and the category banner photo. |
   | Promotional feature image | The two promo cards are unchanged (owner decision). |
   | Social share image (`opengraph-image`) | Missing. |
   | iPhone home screen icon (`apple-icon`) | Missing. |
   | Empty-state illustrations | Not made; the pages use icons. |
4. **Paused-ordering notice.** It could show the store's phone and email, but its text lives in the Turnstile
   widget, which this redesign deliberately did not edit. A small separate milestone.
5. **Brand kit.** `docs/brand-kit/` still describes the earlier colours (Milestone 113). Regenerating it for
   the new identity is a separate follow-up using the tools in `docs/brand-kit/tools/`. Note: after this
   report, Milestone 122 (Architecture Decision Record 053) renamed the brand to Mirza Cart, replaced the warm
   ivory surfaces with clean neutrals and changed the logo, the search field and the announcement strip, so the
   screenshots in `final/` show the storefront before that milestone.
6. **Not built, on purpose:** a phone bottom sheet for sort and filter, the header search box showing the
   current search words, price and discount filters on the shop, product brand, model, specification and
   rating fields (the product has no such data), and returns or delivery-time promises (none exist).
7. **Demo data.** The screenshots use generated demo artwork and the seed's free-delivery threshold
   (Rs. 3,000). The test site's setting is Rs. 1,500, and its prices and photographs differ.
8. **Decisions made along the way that the owner may want to reverse:** email and area are optional in the
   address form (to undo, put `required` back on those two inputs in `components/AddressModal.jsx`); the
   category banner is kept on desktop but not on phones and tablets (the breakpoint is 1024px).

## Rollback

Each milestone is in a pull request that can be reverted on its own. Reverting a later pull request
leaves the earlier ones working. Reverting Milestone 117 returns the old colours but keeps the shared
colour file. No step involves data, schema or configuration.

## Where the screenshots are

| Folder | What it shows |
|---|---|
| `baseline/` | The test site before the redesign (Phase 0), 17 pages at 390, 820 and 1440px. Real test-site data. |
| `phase1/` to `phase4/` | Before and after sets for each phase, from the local build. |
| `final/` | The finished storefront, all 17 pages at the three widths, plus the two focus screenshots, the capture log and `accessibility-report.json` (every finding, per page). |

The baseline and the final set use different data (the live test site against the local demo seed), so
compare layout and structure, not products or prices.
