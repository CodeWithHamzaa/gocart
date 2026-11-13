# Mirza Cart brand identity kit and ecommerce showcase (Milestones 113 and 123)

A client-ready brand book and a set of desktop, mobile and responsive showcase boards for **Mirza Cart**, built from the real storefront: the design tokens in `app/tokens.css` and `app/globals.css`, the logo in `components/ui/BrandLogo.tsx` / `app/icon.svg`, the self-hosted Plus Jakarta Sans font, and screenshots captured from the live **test** site on 2026-11-13, after the Mirza Cart identity (Architecture Decision Record 053, Milestone 122) was deployed there.

The kit was first made for the earlier "Mirza" identity (Milestone 113) and regenerated for Mirza Cart in Milestone 123: the name, the clean neutral palette, the shopping-cart logo in its horizontal, stacked, icon-only and inverse forms, and new captures. The export file names (`mirza-brand-kit.pdf`, `mirza-brand-showcase.pptx`) are kept so existing links keep working.

This folder is presentation material and development-time tooling only. Nothing here is imported by the application, and deleting it leaves the app unchanged.

## What to open

| You want | File |
|---|---|
| The finished book to send to a client (26 landscape pages, 1920 x 1080) | [`exports/mirza-brand-kit.pdf`](./exports/mirza-brand-kit.pdf) |
| The editable deck (16:9, native text boxes, shapes, colour swatches, vector logo, cropped screenshots) | [`exports/mirza-brand-showcase.pptx`](./exports/mirza-brand-showcase.pptx) |
| Single boards for Fiverr, Upwork, Behance or a portfolio (2880 x 1620 PNG) | [`exports/boards/`](./exports/boards/) |

### Boards

| Folder | Boards |
|---|---|
| `exports/boards/brand/` | 01 cover · 02 contents · 03 introduction · 04 positioning · 05 logo · 06 logo usage · 07 core colours · 08 supporting colours · 09 typeface · 10 type hierarchy · 11 photography · 12 interface language · 13 components · 14 brand in use · 25 do's and don'ts · 26 closing |
| `exports/boards/desktop/` | 15 homepage · 16 homepage sections · 17 shopping · 18 product detail · 19 cart and wishlist |
| `exports/boards/mobile/` | 20 homepage · 21 shopping (screen wall) · 22 product · 23 shopping journey |
| `exports/boards/responsive/` | 24 desktop + tablet + phone |

The mobile boards follow the two reference compositions the owner supplied (a row of floating phones with the centre one raised; a wall of screens cropped at the page edges). The references were used as inspiration only and are not stored here.

## Source assets

| Folder | Contents |
|---|---|
| `source-assets/screenshots/desktop/` | 1440 x 900 viewport at 2x (2880 px wide), plus full-page captures (`*-full.png`) and `home-sections.json` (section positions used to crop board 16) |
| `source-assets/screenshots/tablet/` | 820 x 1180 viewport at 2x |
| `source-assets/screenshots/mobile/` | 390 x 844 viewport at 3x (iPhone-class), touch emulation on |
| `source-assets/screenshots/elements/` | Single components at 3x: product cards, header, hero, promo card, category circles, footer trust strip |
| `source-assets/brand/` | The cart mark as SVG (`mirza-cart-mark.svg`, identical to `app/icon.svg`) and the Plus Jakarta Sans variable font with its SIL Open Font License |

Every screenshot is a real capture of `https://gocart-test-inky.vercel.app`; none is drawn or edited, apart from the redaction below. Product photos on the brand pages are the live catalogue's own photos, downloaded from the test site for the build (see "Rebuilding"; sources and licences: `docs/assets/MANIFEST.csv`, `docs/assets/PHOTO_INVENTORY.md`).

## Accuracy notes and limitations

- **Current card design.** The screenshots show the current product card: a white card with a hairline border, photo first, then category, name, price with the struck-through old price and discount, and a round add-to-cart button. It comes from "One product card for grids and rails" (`0257271`, 2026-11-10), which replaced the earlier Milestone 111 card. Checked on 2026-11-11: the card markup the test site serves is identical to `components/ProductCard.jsx` on `main`. The site served `main` at `d5ed333` (pull request #85, Milestone 122) when the current screenshots were captured on 2026-11-13 (see `docs/DEPLOYMENT_VERCEL_TEST.md`).
- **Photos are current.** The Milestone 112 photography is live on the test site and appears throughout.
- **Redaction.** The footer "Contact" column (phone number, email address, city) and every `tel:`/`mailto:` link are hidden before each capture, so no personal contact details appear in the kit. Nothing else on the page is changed.
- **Cart and wishlist contents** were set through the store's own browser storage (`gocart:cart`, `gocart:wishlist`), the same state a shopper creates with "Add to cart" and the heart button. No order was placed.
- **Checkout is off on the test site** (no Turnstile keys), so "Place order" shows in its disabled colour and no order-confirmation screen exists to show. The cart and order summary (address step, standard delivery, cash on delivery, totals) are shown instead.
- **Order lookup is paused on the test site** ("Online order lookup is paused right now"). It was captured (`*/orders-lookup.png`) but is not used on any board.
- **Hero banners rotate.** Captures are taken right after page load, so the first slide shows; `desktop/home-hero-slide2.png` is the second slide.
- **Device frames** (phone, tablet, browser window) are generic shapes drawn by the build, not photos of a real device or brand. Mirza Cart is a responsive website, not a native app, and the boards say so.
- **Guidance vs. fact.** Colours, type sizes, radii, shadows and badge styles are measured or copied from the code. Clear space, minimum sizes, approved backgrounds, personality and do's and don'ts are recommendations written for this kit, and they are worded as guidance.

## Editing and rebuilding

**Quick edits, no tools needed.** `exports/mirza-brand-showcase.pptx` is a normal PowerPoint file: open it in PowerPoint, Keynote or Google Slides, delete or reorder slides, change any text or colour, replace a picture (right-click, "Change picture"), then export to PDF from there. The PDF and the PNG boards are finished outputs and are not meant to be edited.

**Rebuilding with the current storefront.** On a development machine with Node (Playwright's Chromium is in the repo's dev dependencies) and Python 3 with Pillow and python-pptx:

```bash
# See the page numbers
python3 docs/brand-kit/tools/build.py --list

# Full kit with new screenshots and the current product photos (about 5 minutes)
python3 docs/brand-kit/tools/build.py --refresh

# Only some pages, or everything except some pages (can be combined with --refresh)
python3 docs/brand-kit/tools/build.py --pages 1,5-8,15-24
python3 docs/brand-kit/tools/build.py --skip 4,11,25

# Full kit from the screenshots already saved (about 50 seconds); --pptx builds the deck only
python3 docs/brand-kit/tools/build.py
```

- `--refresh` captures the storefront again and downloads each product's first photo, so a change of design, products or images on the site shows up in the kit. It reads the test site; `--site <url>` reads another one, for example a local `http://localhost:3000`.
- A selection (`--pages`, `--skip`) is renumbered ("01 / 6"), leaves out the Contents page (it lists every page) and is written to `exports/custom/` (or `--out <folder name>`), which Git ignores. The full kit in `exports/` is only replaced by a build without a selection.
- To change wording or layout permanently, edit `tools/pages.py` (one block per page) and rebuild.
- Without `--refresh`, product photos come from the last refresh (`.build/photos/`), or from the folder named in `BRAND_KIT_MEDIA`, or else from the repository's local `/media` folder.

| Tool | Role |
|---|---|
| `tools/capture.js`, `tools/capture-elements.js` | Playwright captures (with the contact redaction) |
| `tools/kit.py` | Layout primitives, design tokens and device frames, written out as HTML and as native PowerPoint shapes |
| `tools/pages.py` | The 26 pages: content and layout |
| `tools/render.js` | Chromium renders the HTML to the PDF and to one PNG per page |
| `tools/build.py` | Runs everything: optional refresh, page selection, PDF, boards and deck |

Intermediate files go to `.build/` (git-ignored).

### Editing the PowerPoint

Every heading, paragraph, label, swatch and logo is a native, editable object, named in the selection pane (for example "Swatch primary", "Mirza mark (M stroke)", "Browser window", "Screenshot"). To swap a screenshot, right-click it and choose *Change Picture*; the rounded crop is kept. Install `source-assets/brand/PlusJakartaSans-Variable.ttf` first, or PowerPoint will substitute another font and some lines may wrap differently.
