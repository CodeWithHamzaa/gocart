# Visual assets programme: realistic demo photography for Mirza

**Status: Stage 0 (documentation) done 2026-11-01. `M103` accepted 2026-11-01. Under the owner's autonomous authorisation of 2026-11-01, `M104` (sourcing, 61 of 61 slots after a second pass on 2026-11-02), `M105` (pipeline) and `M106` (local integration) are complete and merged (PRs #56 and #57); `M107` (storefront QA) was finished 2026-11-03 and accepted the same day under the owner's delegation (PR #58 merged); on 2026-11-03 the owner delegated technical decisions to the AI team ([GATES.md](../.claude/docs/GATES.md)), ADR-049 was **Accepted** and `M108` was approved for the test environment only. `M108` tooling is built and tested, and the live rollout to the test site was done on 2026-11-05 (section 12). **`M109` stays on hold** until the owner gives the client's go-ahead. See [assets/PHOTO_INVENTORY.md](./assets/PHOTO_INVENTORY.md).** Milestones `M103`–`M108` are Done (`M108` on the test site only), `M109` is Proposed and on hold. This file is the master objective: it must survive across sessions, so read it before any visual-asset work and update the progress checklist (section 12) as stages finish.

Related: [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) (`M103`–`M109`), [TASKS.md](./TASKS.md), [DECISIONS.md](./DECISIONS.md) (ADR-049 Accepted 2026-11-03; ADR-020, 034, 036, 046, 048 stand), [assets/MANIFEST.csv](./assets/MANIFEST.csv), [../demo-assets/README.md](../demo-assets/README.md).

---

## 1. Objective (owner brief, 2026-11-01)

The site is **not live for customers**. It is being prepared for a professional demo and a later launch. The temporary demo catalogue must look like a genuine ecommerce store, not a development seed.

Give the whole Mirza storefront professional, realistic and consistent product photography:

- Homepage hero and promotional areas.
- Category cards and category pages.
- All demo products and their galleries.
- Product listing cards and search results.
- Featured, new arrivals and deals.
- Related products.
- Cart and wishlist.
- Any other customer-facing image-bearing component.

**No** generated vector artwork, flat illustrations or blank grey images in the final demo. Every demo product has a photograph that **accurately matches the displayed product**. Free Unsplash and Pexels photography is acceptable for temporary demo products, categories, banners and promo areas, **subject to licence verification**.

## 2. Approved decisions (owner, 2026-11-01)

1. **Stack unchanged**: Next.js App Router, TypeScript, Payload v3, PostgreSQL, the existing `Media` collection and its storage (local volume; Vercel Blob on the test site), and the existing Product/Category/PromoCard relationships.
2. **ADR-036 and `images.unoptimized: true` stay as they are.** The Next image optimizer is not re-enabled, no Accepted ADR is edited, and no new image-storage system is introduced.
3. **Local image-processing pipeline** instead (section 7), with **no new dependency** if `sharp` (already in `package.json`) is enough.
4. **Demo catalogue is temporary.** Before launch the demo products are removed and the owner's original catalogue is imported (section 6, `M109`).
5. **Provenance for every image** is recorded in `docs/assets/MANIFEST.csv` (section 8). Licences are verified, never assumed.
6. **Network blocked means stop, do not bypass.** If a stock site is unreachable, record the limitation and let the owner drop downloaded files into `demo-assets/_inbox/`.
7. **Local first.** Any later integration is limited to the approved test/staging environment.
8. **Schema changes are proposed separately and wait for approval.** No demo flag or other schema change is made by this programme unless the owner approves it (section 5.4).
9. New ADRs stay **Proposed** until the owner approves them.

## 3. Hard boundaries

Do not, at any stage, unless the owner gives a separate explicit approval for that action:

- Access or modify production database records, upload to production Blob storage, request production credentials, or deploy.
- Replace or overwrite unrelated `Media` records; delete any media before checking its relationships (section 6).
- Run destructive cleanup against a dataset that has not been inventoried and verified.
- Bypass a network restriction.
- Change a Payload schema, install a dependency, or touch the do-not-touch list in [.claude/docs/CONVENTIONS.md](../.claude/docs/CONVENTIONS.md).
- Add a production dependency on AI tooling ([NO_PRODUCTION_AI.md](../.claude/docs/NO_PRODUCTION_AI.md)). Image research and processing are development-time only.

## 4. Inspection summary (2026-11-01, read-only)

Facts below were read from the repository. Items marked *unverified* were not checked.

- **There is no `public/` or `media/` folder.** Every customer-facing photo is a Payload `media` record served from `/api/media/file/...`.
- **Real stored media is not visible from the repository** (local volume or Vercel Blob; *unverified* what the test site currently holds).
- **Image surfaces and sources**

  | Surface | Component | Source |
  |---|---|---|
  | Home hero slider | `HeroSlider`, `lib/hero-slides.ts` | First image of in-stock products (no dedicated banner asset) |
  | Home category shortcuts (circles/pills) | `HeroShortcuts` | `Categories.image`, else Lucide icon |
  | Category tiles, `/categories` | `CategoryTile` | `Categories.image`, else icon |
  | Home promo cards | `PromoCards` | `PromoCards.image` (optional) |
  | Rails, Featured, Deals, Related | `RailCard`, `ProductCard`, `ProductRail`, `RelatedProducts` | `Products.images[0]` |
  | `/shop`, `/category/[slug]`, search | `ProductCard` | `Products.images[0]` |
  | `/product/[id]` | `ProductDetails` | `Products.images[]` (main + 72px thumbnails) |
  | `/cart`, `/wishlist` | cart page, wishlist | `Products.images[0]` |
  | Header, footer, favicon, admin logo | `BrandLogo`, `app/icon.svg` | Vector monogram (brand mark; stays) |
  | Open Graph / Twitter image | `lib/seo.ts` | Product pages only; other pages emit none |
  | `/orders`, `/order-confirmation`, 404 | n/a | No photos |

- **Placeholders to replace**: `scripts/seed-demo.ts` + `scripts/demo-data/art.ts` generate vector WebP for 24 products (2 each) and 10 categories; `scripts/seed.ts` creates 4 products with blank grey images.
- **Missing assets**: no dedicated hero/banner asset, no default Open Graph image, category images are optional (icon fallback), promo cards have no seeded images (*unverified* whether the test site has any).
- **Delivery constraint**: with `unoptimized: true` the browser downloads the uploaded file itself. A product card (about 220–252 CSS px) downloads the same file as the product page (about 620 CSS px), so one budget per image has to serve every placement.
- **Upload constraint**: `Media` accepts only JPEG, PNG, WebP and GIF (ADR-036). `Media` has only an optional `alt` field; it records no source, author or licence, so the manifest is the provenance record.
- **Network**: from the review sandbox, `images.unsplash.com`, `images.pexels.com`, `upload.wikimedia.org` and `pixabay.com` returned no response on 2026-11-01. `docs/MIGRATION_PLAN.md` (`M101`) recorded the same for Unsplash on 2026-10-31. Sourcing therefore depends on owner-supplied files in `demo-assets/_inbox/` unless access is granted.
- **Seed behaviour that matters** (`scripts/seed-demo.ts`, `demo-assets/README.md`): find-or-create only (categories by slug, products by exact name, media by filename then alt); it never updates an existing row, so photos are picked up only when a product is first created; it supports exactly two images per product (`<slug>-1`, `<slug>-2`); it refuses to run on `NODE_ENV=production`, with `TUNNEL_TOKEN` or `APP_DB_PASSWORD` set, with the `gocart_app` role, or against a non-local database host. It therefore **cannot** populate the Neon test site; `M108` needs a different, owner-approved route.

## 5. Demo catalogue identification

### 5.1 What exists today (no schema change needed to identify demo rows)

There is **no demo flag** in any collection. The seed's own conventions identify demo rows reliably enough for local and test databases:

| Record | Identification | Source of truth |
|---|---|---|
| Products (24) | Exact `name` in `RAW_PRODUCTS`; product "slug" = `slugify(name)` (products have no slug field; URLs use the numeric id) | `scripts/demo-data/catalogue.ts` |
| Categories (10) | `slug` in: `headphones`, `speakers`, `power-banks`, `watches`, `bags`, `sunglasses`, `lamps`, `kitchen`, `skincare`, `fragrances` | `scripts/demo-data/catalogue.ts` |
| Media | `filename` = `<product-slug>-1.webp`, `<product-slug>-2.webp`, `category-<slug>.webp`; `alt` = `"<name>, view <n>"` / `"<title> category artwork"` | `scripts/seed-demo.ts` |
| Orders (8, only with `--with-orders`) | `customerName` starting `Demo Customer `, phones `03000000001`–`03000000008`, fixed `idempotencyKey` values | `scripts/seed-demo.ts` |
| Basic-seed products (4) | Blank grey images from `scripts/seed.ts`; names listed in that file | `scripts/seed.ts` |
| Promo cards | Not created by the seed (*unverified*); any created by this programme are recorded by id | `DEMO_INVENTORY.csv` |
| Settings global | Not deletable; filled only while untouched | review by hand |

### 5.2 Known weaknesses of name/slug matching

- **Shared slugs.** `headphones`, `speakers` and `watches` are also created by `scripts/seed.ts`, and the owner's real catalogue may use the same slugs (for example `watches`). A slug match alone is **not** proof that a category is demo-only.
- **Real products may share a demo name** (unlikely, but possible). Identification must use name **and** a second signal (a media filename in the demo pattern, or listing in the inventory).
- **Orders reference products** (`orders.items.product` is a required relationship with no name snapshot in the item), so a product with any order cannot be deleted cleanly. Demo orders go first; any non-demo order that references a demo product stops the cleanup.
- **Media can be shared.** A Media row used by a non-demo product, category or promo card must never be deleted.

### 5.3 Rules adopted by this programme (no schema change)

1. **Filename convention for new demo photos** keeps the seed's pattern for products (`<product-slug>-<n>.webp`) and categories (`category-<slug>.webp`), and uses a **`demo-` prefix** for everything else (`demo-hero-…`, `demo-promo-…`, `demo-og-…`), so `filename LIKE 'demo-%'` plus the two seed patterns identifies demo media. The original catalogue's files must never use that pattern; the import checks this.
2. **`docs/assets/DEMO_INVENTORY.csv`** (created in `M103`, not now) lists every demo row actually present in a given database: `env`, `collection`, `id`, `slug_or_name`, `identified_by`, `linked_media_ids`, `linked_category_id`, `referenced_by_non_demo` (yes/no), `captured_on`. It is regenerated per environment (local, test) and is the only list the cleanup may act on. A row absent from the inventory is never deleted.
3. **Manifest `catalogue` column** (`demo` or `original`) separates demo images from the future original catalogue's images. The manifest never holds the original catalogue's files; if the owner wants their own photos tracked, they use the same columns with `catalogue=original` and no licence fields needed beyond "owner-owned".
4. **Relationship check before any media delete** (section 6, step 5).

### 5.4 Optional schema proposal (not approved, not part of this programme)

A boolean `isDemo` on `products`, `categories`, `media` and `promoCards` would make identification trivial and the cleanup a single filter. It costs a migration on every database, touches four collections and `payload-types`, and leaves a vestigial field after launch. **Not recommended while the inventory approach is enough.** If the owner wants it, it is proposed as its own milestone and ADR; nothing here depends on it.

## 6. Pre-launch cleanup procedure (milestone `M109`)

Applies first to a **copy/test environment**. Running it against production data needs a separate explicit approval and is not authorised by this plan. The cleanup tool must be **dry-run by default** and require an explicit `--apply`; it must refuse to run unless the target is identified as the intended environment.

1. **Freeze and inventory.** Regenerate `DEMO_INVENTORY.csv` for the target environment. Review it with the owner. Anything not clearly demo is removed from the list (kept).
2. **Back up.** A full database dump (`scripts/backup.sh` exists; on Neon, a branch or dump) **and** a copy of the demo media files (their bytes are not recoverable once a Blob/volume file is deleted). Record backup location and checksum. Export the inventory plus every product–media and category–media link as CSV, so the mapping can be re-created.
3. **Order check.** List orders. Demo orders (section 5.1) are deleted first. If any **non-demo** order references a demo product, stop and report.
4. **Delete demo products** in the inventory (after step 3), by id.
5. **Media reference check.** For each candidate media id, count references in `products.images`, `categories.image`, `promo_cards.image` and any other upload relationship (re-derived from the collection configs at that time, not remembered). Delete the media only if every reference belongs to a demo row that has already been removed. Media still referenced stays and is reported.
6. **Delete demo categories** only if they are now empty and not flagged "keep" (a slug the original catalogue reuses is kept and edited instead).
7. **Delete or reset demo promo cards and the demo banner/OG media** listed in the inventory. Review the Settings global by hand (store name, contact details, delivery fields).
8. **Import the original catalogue** with the owner's own import route. Check that no imported filename matches the demo patterns.
9. **Verify**: product count, names, descriptions, prices (`price` ≤ `mrp`), categories, stock flags, every product has at least one working image, alt text present, no `demo-`/seed-pattern media left, no broken image on `/`, `/shop`, a category, a product page, `/cart`.
10. **Regression**: lint, type-check, build, `test:*` scripts, Playwright suite including the checkout golden path; manual guest COD order on the target.

**Reversibility.** Database rows: restore from the step 2 dump (restoring to the same ids). Media bytes: re-upload from the step 2 copy. Not reversible without those backups: Blob/volume file deletions, and the order of rows after a restore of a partial dump. Therefore no delete runs before step 2 is verified (restore tested on a scratch database).

## 7. Image-processing pipeline (milestone `M105`)

Local, development-time only; output is plain files. No new dependency: `sharp` (`^0.35.3`) is already used by the seeds. The tool is a script under `scripts/` (name decided in `M105`) with an npm script entry; adding that entry edits `package.json` but installs nothing.

1. **Archive originals** untouched in `demo-assets/_archive/originals/` (git-ignored by the existing `demo-assets/*` rule; photos are never committed). SHA-256 recorded in the manifest. Because the archive is git-ignored, it exists only on the machine that holds it; the owner keeps their own copy (open decision D4).
2. **Generate WebP** for storefront use into `demo-assets/_processed/`, never overwriting the archive. JPEG is kept only for Open Graph images (some social scrapers handle WebP unevenly; *unverified*).
3. **Resize per placement.** Because the optimizer is off, one file serves every placement of that image. Proposed budgets (to be confirmed against real renders in `M105`):

   | Image | Shown at (CSS px) | Output | Budget |
   |---|---|---|---|
   | Product (card, page, cart, thumbnail) | 56–620, square wells, `object-cover` | 1000×1000, square crop framed on the product | ≤ 120 KB (hard cap 150 KB) |
   | Category (tile, circle shortcut, page) | 480×360 tile; 56/44 circle | 800×600, subject centred | ≤ 70 KB |
   | Promo card image | 160, `object-contain` | 400×400 | ≤ 40 KB |
   | Hero (only if a dedicated banner is approved, D2) | full width | to be set with the layout | ≤ 200 KB |
   | Open Graph default | n/a | 1200×630 JPEG | ≤ 200 KB |

   Never enlarge a source; a source too small for its slot is rejected, not upscaled.
4. **Strip metadata** (EXIF, GPS, ICC beyond sRGB conversion). Output is verified to carry none.
5. **Enforce budgets**: exact dimensions, maximum bytes, allowed format, sRGB, no animation. Fail the file, never silently degrade quality below a floor set in `M105`.
6. **Validate before upload**: re-read every processed file with `sharp`, compare to its manifest row (dimensions, bytes, SHA-256), check the filename pattern from section 5.3, check an `alt` text exists, and produce a contact sheet for human review.
7. **Record** processed filename, SHA-256, dimensions and bytes in the manifest.
8. **Human review gate.** Whether a photo "accurately matches" its product is a judgement; Claude can pre-screen from the contact sheet, but the owner approves each image (`status=approved`) before processing proceeds.

## 8. Asset manifest

`docs/assets/MANIFEST.csv`, one row per image, header created in Stage 0. Columns:

`asset_id`, `catalogue` (`demo`|`original`), `usage`, `component`, `target_collection`, `target_record`, `source_site`, `source_url`, `author`, `author_url`, `licence`, `licence_url`, `licence_checked_on`, `attribution_required`, `attribution_text`, `retrieved_on`, `original_filename`, `original_sha256`, `archive_path`, `processed_filename`, `processed_sha256`, `width`, `height`, `bytes`, `format`, `alt_text`, `media_id`, `media_env` (`local`|`test`), `status`, `approved_by`, `approved_on`, `notes`.

`status` flow: `needed` (slot defined, no photo chosen) → `candidate` → `licence-verified` → `approved` → `processed` → `validated` → `uploaded-local` → `integrated-test` → `removed`. A row cannot pass `licence-verified` without `licence_url`, `licence_checked_on` and the author (or "not shown"). `media_id` is only meaningful together with `media_env`; ids differ per database.

Rules:
- The licence text is **read at download time** from the source site's own licence page and its URL and date recorded. Pexels and Unsplash licences are understood to allow free commercial use without attribution, with restrictions (for example no selling unmodified copies, no implied endorsement, no trademarks/logos/people shown in a misleading way), but that is **unverified here** and must be re-read per image. Photos showing visible brand names, logos or identifiable people are rejected for product use.
- Attribution is recorded even when not required, so a site credits page remains possible.
- A file the owner supplies through `demo-assets/_inbox/` gets a manifest row too; where the source is unknown it stays `candidate` and is not used.

## 9. Stages, milestones and dependencies

Stages map one-to-one to milestones (one milestone per session, per [CLAUDE.md](../CLAUDE.md)). Each stage ends with a report and **waits for owner approval**.

| Stage | Milestone | Title | Depends on | Writes data? |
|---|---|---|---|---|
| 0 | (this plan) | Documentation, manifest, strategy, Proposed ADR-049 | none | no |
| 1 | `M103` | Demo inventory and read-only media audit (local) | Stage 0 approved | no (reads local DB) |
| 2 | `M104` | Photo brief, shot list, sourcing and licence verification | `M103`; network access or owner files in `_inbox/` | no |
| 3 | `M105` | Local image-processing pipeline and validation | `M104` (at least one approved image to test on); ADR-049 decision | no (files only) |
| 4 | `M106` | Local integration: demo photos into the demo seed/catalogue and local DB | `M105` | local DB only |
| 5 | `M107` | Storefront image-surface QA and fixes (hero, OG default, alt text, empty states) | `M106` | code changes, local only |
| 6 | `M108` | Test-site rollout (approved test/staging environment only) | `M107`; owner approval of the route (D5) | test environment only |
| 7 | `M109` | Pre-launch demo cleanup and original-catalogue import | owner's catalogue; `M103` inventory; backups verified | destructive; staged |

Order is by dependency, not ID. `M107`'s scope depends on D2 (dedicated hero or not).

### Stage detail

**M103 - inventory and audit.** Scope: against the local development database only, list demo products/categories/media/orders/promo cards, which media are generated art or blank, byte sizes and dimensions, missing alt text, and non-demo rows sharing slugs. Output: `docs/assets/DEMO_INVENTORY.csv` and an audit report in the PR description or `docs/`. Files: docs only (plus a read-only helper script if needed, no writes). Verification: counts match the catalogue (24 products, 10 categories, 48 product media, 10 category media, plus the 4 basic-seed products if present); every inventory row cites its `identified_by`; no row appears that the rules would not select.

**M104 - brief and sourcing.** Scope: a shot list for the 24 products (2+ photos each), 10 categories, promo/banner areas and an Open Graph default, with an accuracy checklist per product (type, colour, form, no visible third-party branding). Candidates are recorded in the manifest with licence verified per image. If a source is unreachable, record it and use `_inbox/`. Product descriptions in the demo catalogue may not match a stock photo exactly (for example "steel-coloured case"); mismatches are listed for owner decision (D3), not edited. Files: `docs/assets/MANIFEST.csv`, `demo-assets/_inbox/` (git-ignored, no commit of images). Verification: every candidate has source URL, author, licence URL and check date; no row with unknown licence reaches `approved`.

**M105 - pipeline.** Scope: the script and npm entry from section 7; unit-style checks (as the other `scripts/*.test.ts`) for budget and metadata rules. Files: `scripts/` (new), `package.json` (script entry only), `docs/assets/MANIFEST.csv`. Verification: run on the approved sample; outputs meet budgets and dimensions; EXIF absent; originals byte-identical to archive checksums; a deliberately oversized/undersized/wrong-format file is rejected.

**M106 - local integration.** Scope: let the demo seed use processed photos for products, categories and extra demo images (hero/promo/OG as decided), including more than two images per product only if D6 allows; replace generated art and the basic seed's blank images on the **local** database. Existing seed rules (find-or-create, no updates) mean replacing a demo product's art is done by the documented "remove demo product and media, re-seed" path or by a small new, demo-only, dry-run-by-default replace step that touches only inventory rows. Files: `scripts/seed-demo.ts`, `scripts/demo-data/*`, possibly `scripts/seed.ts`, `demo-assets/README.md`. Verification: no generated-art or blank image remains on the local site; every demo product has a photo; reruns add nothing; non-demo rows untouched; seed guards still refuse production/non-local targets.

**M107 - storefront QA.** Scope: check every surface in section 4 at 320/390/768/1024/1440 px; fix only what the new photos expose (cropping, circle shortcuts, contrast of badges on photos, alt text, a default Open Graph image in `lib/seo.ts`/home, hero if D2 approves a dedicated field, which is a schema change and its own approval). Files: likely `lib/seo.ts`, `components/{HeroSlider,HeroShortcuts,PromoCards,ProductCard,RailCard,ProductDetails}.*`, e2e specs. Verification: lint, type-check, build, `test:*`, Playwright (including checkout golden path), screenshots, LCP/page-weight sanity check against budgets, no broken image on any route.

**M108 - test-site rollout.** Scope: put the validated demo media on the approved test environment (Neon + Vercel Blob) by the owner-approved route (D5), recording `media_id` with `media_env=test`. The demo seed refuses non-local hosts by design, so this is likely admin uploads or an approved one-off script, not a loosening of the seed guard. No production. No deploy by Claude unless the owner explicitly asks. Verification: pages checked on the test URL; Blob usage within the Hobby limit (*limits unverified*); manifest and inventory updated for `test`.

**M109 - pre-launch cleanup and import.** Scope: section 6. Includes a dry-run-by-default cleanup tool restricted to inventory rows, a written runbook, and the import verification checklist. Production use requires its own approval. Verification: dry run output reviewed against the inventory; on a restored copy, cleanup then import then regression leaves no demo row or demo media and no broken image; restore from backup tested.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Stock photo does not match the displayed product (misleading, especially for COD) | Per-product accuracy checklist, owner approval gate, description mismatches listed rather than ignored; temporary demo status stated in the plan |
| Licence misread or changed | Read licence per image at download, record URL and date, reject logos/identifiable people |
| Deleting shared or real media | Inventory-only deletes, reference check, dry run, backups first (section 6) |
| Slug collision with the real catalogue (`watches`, etc.) | Keep/edit rather than delete shared slugs; import checks |
| Page weight with the optimizer off | Per-placement budgets, hard caps, validation gate; thumbnails would need a schema change (D6) |
| Seed cannot reach the Neon test site | Separate approved route (D5); seed guards unchanged |
| Originals live only in a git-ignored folder | Checksums in the manifest; owner keeps a copy (D4) |
| Network blocked | Do not bypass; use `_inbox/` |
| Checkout or order regressions | No change to checkout, prices, Orders or access control; full regression in `M107` and `M109` |
| Vercel Blob/Hobby limits | Small budgets; limits to be confirmed from current Vercel docs in `M108` (*unverified*) |

## 11. Owner decisions (2026-11-01) and what is still open

Decided by the owner, 2026-11-01 (after PR #56):

- **D1.** Approve `M103` only. ADR-049 stays **Proposed**. `M104`–`M109` stay Proposed and are not authorised.
- **D2.** Keep the product-driven hero. No new banner field, no schema change.
- **D3.** Prefer a better-matching photo; if necessary, adjust the temporary demo product copy rather than show a misleading image.
- **D4.** Originals are preserved outside Git in a dedicated archive (`demo-assets/_archive/originals/`, git-ignored). Recommend a second secure backup location, for example an encrypted external drive or a private cloud folder the owner controls. Originals are never committed.
- **D5.** Test-site upload route is deferred until local integration is complete.
- **D6.** Two images per demo product initially (matches the seed). No thumbnail (`imageSizes`) work.
- **D7.** If external sources stay unreachable: try to fix the network issue and advise an alternative. Result 2026-11-01: not fixable from inside the session (proxy `403` policy denial); fix and alternatives are in [assets/MEDIA_AUDIT.md](./assets/MEDIA_AUDIT.md) section 7.
- **D8.** No `isDemo` field yet. Assessment in [assets/MEDIA_AUDIT.md](./assets/MEDIA_AUDIT.md) section 5: conventions are enough while the whole database is demo; the weak point is the import into the same database (`M109`), where a pre-import id list is the proposed safeguard. A separate proposal is needed before any flag.

Scope note from the owner: everything on the project is currently demo, so `M103` skipped classifying demo versus real rows and does not create `DEMO_INVENTORY.csv`. Sections 5 and 6 above stay valid for `M109` (demo and original rows in one database) but a per-database id list taken before the import replaces the inventory file unless the owner wants one earlier.

Owner authorisation of 2026-11-01 (second session): complete `M104`–`M106` without per-image approval, stop after `M106`. D2, D3, D4, D5, D6, D7 and D8 were applied as decided (no banner field, closest photo plus adjusted demo copy, originals archived outside Git, no test-site upload, two images per product, no `isDemo`); ADR-049 stays Proposed.

Still open (as of 2026-11-01): whether to approve ADR-049 and the next milestones, and whether a measured database audit (needs dependency installation and a database) is wanted before `M105`.

**Resolved 2026-11-03** (owner delegation recorded in [GATES.md](../.claude/docs/GATES.md)): ADR-049 is **Accepted**, amended before acceptance (no committed `DEMO_INVENTORY.csv` until `M109`; item 6 for the rollout tool). `M107` is accepted. **D5** (test-site upload route) is decided: a guarded one-off operator tool, `scripts/rollout-demo-photos.ts`, not an app route and not a change to the seed guard. `M109` and anything production remain on hold until the owner gives the client's go-ahead.

## 12. Progress checklist

- [x] Stage 0: this plan, manifest header, `M103`–`M109` proposed, ADR-049 proposed (2026-11-01)
- [x] Owner approval of Stage 0; decisions D1–D8 recorded (2026-11-01)
- [x] `M103` media audit by code reading (accepted 2026-11-01; database measurements unverified, measured audit skipped by owner)
- [x] `M104` brief and sourcing plan ([assets/PHOTO_BRIEF.md](./assets/PHOTO_BRIEF.md)); photos sourced and licence-recorded for all 61 slots from Unsplash (2026-11-01 and 2026-11-02, owner-delegated approval; the last 4 products after the owner accepted visible brands in demo photos) — report in [assets/PHOTO_INVENTORY.md](./assets/PHOTO_INVENTORY.md)
- [x] `M105` processing pipeline (`npm run process:demo-images`, `npm run test:demo-images`; sharp only, no new dependency) — awaiting owner review
- [x] `M106` local integration (seed uses the processed photos; verified on a throwaway local database, nothing remote) — awaiting owner review
- [x] `M107` storefront QA (2026-11-03; [assets/STOREFRONT_QA_M107.md](./assets/STOREFRONT_QA_M107.md)) — accepted 2026-11-03 (owner delegation), PR #58 merged
- [x] `M108` test-site rollout: tooling Done and tested 2026-11-03 (`npm run rollout:demo-photos`, `test:rollout-demo-photos`); live run on Neon + Blob **done 2026-11-05** through the owner-approved GitHub Actions workflow (58 uploaded, 34 relinked, 0 created; rerun 0 to upload); `MANIFEST.csv` records `media_id` and `media_env=test` (see [DEPLOYMENT_VERCEL_TEST.md](./DEPLOYMENT_VERCEL_TEST.md)). Test environment only; `M109` untouched
- [ ] `M109` pre-launch cleanup and original-catalogue import (not before launch preparation)
