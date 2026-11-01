# Media audit (M103), 2026-11-01

Read-only. Source: the repository at the head of this branch. **No database was read**: this session has no `DATABASE_URI`, no `node_modules`, no running PostgreSQL and no Docker daemon (the Docker CLI is installed; `docker info` shows no server), and the owner's instruction for `M103` skips the demo-vs-real classification, so nothing here was written to any database or file other than this report. Counts below are what the seed code creates; **what the local and test databases actually hold is unverified** until someone runs the audit against them (section 6).

Scope change recorded: the owner states that everything on the project (text, products, images) is demo. `M103` therefore does **not** produce `DEMO_INVENTORY.csv`. D8 is assessed in section 5.

## 1. Image-bearing records the seeds create

| Source | Records | Images | Format and size (from code) | Alt text |
|---|---|---|---|---|
| `scripts/seed-demo.ts` + `scripts/demo-data/art.ts` | 24 products | 2 each = 48 | Generated vector art rasterised to **1200×1200 WebP, quality 80** (`generated()`); no real file sizes measured | `"<product name>, view <n>"` |
| same | 10 categories | 1 each = 10 | Same generator, **1200×1200** square (category tiles are 4:3, the circles are cropped to a circle) | `"<title> category artwork"` |
| `scripts/seed.ts` (CI and basic dev seed) | 4 products | 1 each = 4 | Flat-colour **PNG** placeholder (`placeholderColours`, four greys/blues) | `Modern table lamp`, `Smart speaker`, `Smart watch`, `Wireless headphones` |
| Promo cards | none created by either seed (verified by grep: no `promo` in `seed-demo.ts` or `seed.ts`) | 0 | n/a | n/a |
| Orders, Settings | no images | n/a | n/a | n/a |

If both seeds ran on one database: 28 products, 62 media rows (some product names/slugs overlap categories `speakers`, `headphones`, `watches` by design, so category rows are reused).

## 2. Placeholder and unsuitable images (all of the above)

- 48 + 10 images are generated vector art with no text or logos (by design, `art.ts` header). All must be replaced (owner brief).
- 4 CI-seed images are blank flat colour. They are needed only by CI/e2e; whether they are replaced or only the demo seed is photographed is a decision for `M106` (they never appear to customers unless that seed is run on the demo database).
- No broken image paths found in code: every component takes `Media.url` from the relationship and renders nothing (or an icon for categories) when it is missing.

## 3. Missing assets

- **Hero**: no banner asset by design (D2: stays product-driven). Slides need in-stock products with photos; `lib/hero-slides.ts` drops a slide with no usable image.
- **Default Open Graph image**: none. `pageMetadata()` accepts `images`, but only `app/(public)/product/[productId]/page.jsx` passes one (`images.slice(0, 1)`); the home, `/shop`, `/categories` and category pages emit none, so shares there carry no image (Twitter card falls back to `summary`).
- **Category images**: optional in the schema (icon fallback). Seeded for all 10 demo categories; none for the CI seed's categories.
- **Promo-card images**: optional; none seeded; the test site may have some (unverified).
- **Product galleries**: demo products have 2 images; `ProductDetails` thumbnails use `alt=""` and the main image uses the product name, so the second image's `alt` is not exposed.

## 4. Findings that affect later milestones

1. **The seed's own photo override does not match the planned budgets.** `processOverride()` (`seed-demo.ts`, `MAX_EDGE = 1600`) downsizes to at most 1600 px on the long edge, WebP quality 80, and crops square only when the ratio exceeds 2:1. Planned product budget is 1000×1000 square, ≤120 KB. A photo dropped in `demo-assets/` today would be served up to 1600 px, not square, with no byte cap, to every small card (optimizer off). `M105`/`M106` must make the pipeline's output the seed's input unchanged, or change `processOverride`.
2. **Square wells crop non-square photos** (`object-cover` in product cards, the detail gallery and the cart). Subjects must be framed for square. Category circles centre-crop a 4:3 image.
3. **Alt text is weak**: `"<name>, view 1"` is not descriptive. Real photos should get a description (what is shown), set at upload.
4. **Seed matching blocks in-place replacement.** Media is found by filename then alt, and an existing product is never updated, so existing generated art stays after a re-run. Replacing it locally means deleting the demo product and its media and re-seeding (documented in `demo-assets/README.md`), or a new replace step (`M106`).
5. **Two images per product** (D6) is exactly what the seed supports (`<slug>-1`, `<slug>-2`); no code change is needed for the count.
6. **Generated 1200×1200 art is larger than any slot needs** (largest slot about 620 CSS px), which suggests the 1000 px budget is not a regression in quality.

## 5. D8 assessment: are the existing conventions enough to identify demo data?

The owner's premise changes the question. If everything on the site is demo, identification is needed only for two things: (a) not deleting media still used by something, and (b) not breaking orders when products go.

- **Sufficient without a schema change**: product names (exact), category slugs, media filenames (`<slug>-<n>.webp`, `category-<slug>.webp`) and demo order markers are deterministic and listed in `catalogue.ts` / `seed-demo.ts`. Within a database the owner says is entirely demo, "everything" is demo and no flag is needed.
- **Where conventions are not enough**: the moment the owner's real catalogue is in the same database as demo rows (the import step of `M109`). The shared slugs `headphones`, `speakers` and `watches`, and any real product that reuses a demo name, cannot then be told apart by convention alone.
- **Recommendation**: no `isDemo` field now. The safest mechanism for `M109`, if the owner imports into the same database, is to take a per-database id list **before** importing (cheap, no schema change, and a database dump at that moment is the record). A flag would only be justified if demo and real rows must coexist for a long time. This is a recommendation, not a decision; nothing was changed.

## 6. What this audit could not do (unverified)

- Real row counts, file sizes, dimensions and missing alt text in the local or test database.
- Whether the test site holds extra promo cards, admin-uploaded media or edited products.
- Actual byte sizes of the generated WebP files.

To close these: start the local stack (or a throwaway PostgreSQL), run `npm run seed:demo` there, and run a read-only query for `media` (filename, mime_type, filesize, width, height, alt) joined to `products_rels`, `categories` and `promo_cards`. That needs `npm ci` (declared dependencies only) and a database; it was not done here because it needs a running database and dependency installation that `M103` did not ask for. A PostgreSQL 16 server binary exists under `/usr/lib/postgresql/16/`, so a throwaway local instance is possible if the owner approves installing dependencies for a measured audit.

## 7. External image sources (D7)

Re-tested 2026-11-01: `images.unsplash.com`, `unsplash.com`, `www.pexels.com` and `images.pexels.com` all fail at the proxy with `403 Forbidden` on `CONNECT`; the proxy status lists them as `connect_rejected` ("policy denial or upstream failure"). That is the environment's network policy denying the hosts, not a certificate or configuration fault, and it cannot be fixed from inside the session (and must not be bypassed).

Fix (owner): in the cloud environment's settings (environment menu in the session title bar, then Edit), under Network access, either choose a broader access level or add these hosts under Allowed domains, keeping the package-managers box ticked: `unsplash.com`, `images.unsplash.com`, `pexels.com`, `www.pexels.com`, `images.pexels.com`. Steps: <https://code.claude.com/docs/en/cloud-environments#network-access>. A new session may be needed for the change to apply.

Alternatives if that is not wanted: download the chosen photos yourself and place them in `demo-assets/_inbox/` (I then record licence, author and checksums in the manifest); or provide a link list and I check the licence text from the pages you save as files.
