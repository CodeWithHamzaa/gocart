# Photo brief, sourcing plan and licence status (Milestone 104), 2026-11-01

**Update 2026-11-02: all 61 slots are now sourced (the 4 products left open on 2026-11-01 were sourced after the owner accepted visible brand names in demo photos). Earlier text on 2026-11-01 (second session, Milestone 104 sourcing done with gaps): 53 of 61 slots were sourced from Unsplash, licence-recorded, processed and integrated locally; 4 products (8 slots) found no acceptable photo. Results, rejections, limits and the full inventory are in [PHOTO_INVENTORY.md](./PHOTO_INVENTORY.md); provenance is in [MANIFEST.csv](./MANIFEST.csv). The text below is the original plan and first-session findings and is kept as written (section 5 is superseded by section 1 of the inventory: `images.unsplash.com` became reachable, the Unsplash and Pexels pages stay behind browser checks that are not bypassed).**

**Original status (first session): brief and sourcing plan complete. No photograph has been selected, downloaded or licence-verified**, because Unsplash and Pexels are blocked by the environment's network policy (section 5) and `demo-assets/_inbox/` is empty. Every manifest row is therefore `status=needed`; no source URL, author or licence field is filled, because none could be checked. Nothing was invented to fill them.

Related: [VISUAL_ASSETS_PLAN.md](../VISUAL_ASSETS_PLAN.md), [MANIFEST.csv](./MANIFEST.csv) (61 rows), [MEDIA_AUDIT.md](./MEDIA_AUDIT.md). Architecture Decision Record 049 remains Proposed. Milestone 105 and later are not started.

## 1. Visual direction (applies to every photo)

Goal: a store that looks like one photographer shot it.

- **Style**: clean studio product photography. Seamless light background (white to warm light grey), soft diffused side light with a gentle shadow, one product per frame, centred, filling about 65 to 75 percent of a **square** frame. Product shots stay uncluttered; at most one small prop that explains the product (a USB cable, an aloe leaf, citrus slices, pulses in jars).
- **Consistency across a category**: same background tone, same light direction, similar angle and crop for the two products in a category. Across categories: a shared neutral background so grids look uniform. Colour comes from the product, not the backdrop.
- **Premium feel**: sharp focus, no heavy filters or HDR, no visible dust or damage, natural colour.
- **Framing for the site**: product wells are square with `object-cover`; keep a margin around the subject so nothing is cropped (cards, gallery, 72 px thumbnails, 56 px cart/shortcut images). Category images are 4:3 and are centre-cropped to a circle in the home shortcuts, so the subject must sit in the middle third.
- **Hard rejects**: visible brand names, logos, readable labels or recognisable brand designs (trademark, and it would not match an invented product); identifiable people or faces; watermarks; anything marked Unsplash+ or Pexels "premium" / paid; images with a licence we cannot read and record; AI-generated or illustrated images (not approved).
- **Resolution**: source at least 1500 px on the short edge for products (target output 1000 px, never upscaled), at least 1200 px for categories and promo, at least 1600 px wide for the share image.
- **Realism limit**: the 24 products are invented, so a photo can match the type, colour, form and features in the description but never a specific SKU. Where a detail (for example a "coloured inner ring") cannot be found, D3 applies: choose the nearest photo and adjust the temporary demo copy, rather than show a misleading image. Mismatches go in the manifest `notes` and in the final list of copy changes.

Honest expectation: free stock rarely offers 24 matching, logo-free products in one consistent studio style. The most likely hard ones are power banks, the nonstick pan, the face wash, and two clearly different pairs per category. The fallback tiers, in order: (1) studio-style photo that matches, (2) clean lifestyle photo cropped square, (3) closest photo plus a demo-copy change (D3), (4) owner-supplied or other-licensed photo (section 6).

## 2. Product shot list (24 products, 2 photos each = 48)

Shot 1 is the card, hero-slide, cart and first-gallery image. Shot 2 is the second gallery image. Planned filenames follow the seed: `<product-slug>-1.webp`, `<product-slug>-2.webp` (slug = lower-case name with hyphens). Search phrases are starting points for a person or tool with access, in the manifest `notes`.

| # | Product | Category | Subject to photograph | Shot 1 (card, hero, cart) | Shot 2 (gallery) | Must match | Reject if |
|---|---|---|---|---|---|---|---|
| 1 | Aero Wave Wireless Headphones | headphones | Over-ear wireless headphones, dark finish, soft cushions, adjustable headband, coloured inner ring on the ear cups | 3/4 front view, headband and both cups visible | Side profile or close-up of ear cushion and headband adjuster | Over-ear (not in-ear, not on-ear), dark body, visible coloured accent on the inside of the cups, no cable required | Visible logo/brand text, person wearing them, in-ear buds |
| 2 | Studio Lite Over-Ear Headphones | headphones | Lightweight over-ear headphones, padded headband | 3/4 front view | Lay-flat or folded view, or headband padding close-up | Over-ear with visibly padded headband; a different colour from Aero Wave so the two products are distinguishable | Logos, studio-monitor style pro headphones with coiled cable |
| 3 | Capsule Portable Bluetooth Speaker | speakers | Compact portable Bluetooth speaker, bag-sized, wireless | 3/4 view on a plain surface | Top or control-side detail; optional outdoor/bag context | Compact, handheld size, capsule/rounded-rectangle form; no smart-assistant branding | Logos, large home speakers, speakers with visible brand text |
| 4 | Cylinder Mini Speaker | speakers | Small cylinder-shaped speaker for desks and shelves | Standing upright, 3/4 view | Top-down or desk/shelf context shot | Clearly cylindrical, small; different colour from Capsule speaker | Logos, tall tower speakers, soundbars |
| 5 | Pulse Active Smart Watch | watches | Smart watch with bright rectangular screen and silicone strap | Front view with screen lit showing a generic watch face | Angled view of strap and side buttons | Rectangular screen, silicone/sport strap, screen showing time only | Recognisable brand watch (Apple Watch etc.), brand/app logos on screen, wrist with a person's face |
| 6 | Orbit Slim Smart Watch | watches | Slim smart watch with round face and comfortable strap | Front view, round face | 3/4 view showing slimness | Round face, slim case; visibly different from the Pulse (round vs rectangular) | Recognisable brand design, logos on screen or caseback |
| 7 | Volt Compact Power Bank | power-banks | Pocket-friendly power bank, USB cable charging, small charge-level indicator | 3/4 view with USB cable beside it | Flat view showing port side and indicator | Small slim slab/pocket size, visible indicator lights or a small display | Logos, MagSafe/wireless brand packs, bulky laptop power banks |
| 8 | Volt Max Power Bank | power-banks | Larger power bank for longer days, USB, charge indicator | 3/4 view | Port side showing multiple outputs, or phone charging from it | Visibly larger than the Compact, indicator visible | Logos, laptop-size AC power stations |
| 9 | Classic Steel Analog Watch | watches | Analog wrist watch, steel-coloured case, clean white dial | Front view, dial facing camera, hands at 10:10 | Angled view showing case and bracelet/strap | Steel case, plain white dial, no chronograph sub-dials, readable hands | Brand name or logo on the dial, luxury-brand recognisable designs |
| 10 | Minimal Leather Strap Watch | watches | Minimal round watch on leather-look strap, plain dial | Front view | Strap and buckle close-up or 3/4 flat-lay | Round plain dial, no clutter, leather-style strap | Brand text on dial, ornate designs |
| 11 | Chrono Sport Wrist Watch | watches | Sporty analog wrist watch, bold dial, sturdy strap | Front view | 3/4 view showing strap | Bold dial (sub-dials acceptable), sturdy sport strap | Brand text, diver/luxury recognisable designs |
| 12 | Metro Canvas Backpack | bags | Canvas backpack with main compartment and front flap | Front 3/4 view on a plain background | Back/strap view or open main compartment | Canvas texture, front flap, everyday school/work size | Visible brand patches/logos, hiking mega-packs, person wearing it |
| 13 | Everyday Faux Leather Tote | bags | Roomy faux leather tote, two handles, front flap | Front view upright | Side view or interior view | Two top handles, front flap, leather-look finish | Designer logo hardware, handbag with strap only |
| 14 | Weekender Duffle Bag | bags | Soft-sided rounded duffle for weekend trips, two carry handles | 3/4 view | Side/end view showing shape and handles | Soft rounded body, two handles, weekend size | Logos, rigid luggage, sports team bags |
| 15 | Pilot Frame Sunglasses | sunglasses | Slim metal-look frame, tinted lenses, classic teardrop shape | Front view, flat-lay or on a stand | 3/4 side view showing arms | Teardrop shape, thin metal frame, tinted lenses | Brand marks on lens or arm, mirrored novelty lenses, a face |
| 16 | Round Frame Sunglasses | sunglasses | Round dark tinted lenses, thin arms, retro | Front view | 3/4 view | Round lenses, dark tint, thin arms | Brand marks, thick fashion frames, a face |
| 17 | Arc Table Lamp | lamps | Curved stem, fabric-style shade, warm light | Lamp on, warm glow, plain interior corner | Lamp off, product on neutral background | Curved/arc stem, fabric-style shade, warm light | Floor lamps, visible brand, cluttered rooms |
| 18 | Dome Desk Lamp | lamps | Compact desk lamp, dome shade, stable round base | On a desk, light on | Neutral background, light off | Dome shade, round base, compact desk size | Articulated architect lamps, LED strip lights |
| 19 | Nonstick Frying Pan | kitchen | Round frying pan, dark finish, long handle | 3/4 top-down angle on neutral surface | Side view showing depth and handle, or in use with eggs | Round, dark nonstick interior, single long handle, no lid | Brand logo, cast-iron skillets, woks, saucepans |
| 20 | Glass Storage Jar Set | kitchen | Set of glass jars with lids for pulses, spices, snacks | Set of 3 jars filled with pulses/spices | Single jar with lid close-up | Clear glass, lids, content visible (pulses/spices) | Mason-jar brand embossing, jars with text labels |
| 21 | Aloe Hydrating Gel Cream | skincare | Light gel-cream moisturiser with aloe, tube-style pack | Tube standing or lying with a fresh aloe leaf beside | Open tube with gel texture swatch | Tube pack, aloe cue (leaf or green), unbranded | Visible brand/label text, jars instead of tube |
| 22 | Gentle Foaming Face Wash | skincare | Gentle foaming face wash | Bottle or tube upright on neutral surface | Foam texture close-up | Face-wash bottle/tube with foam cue, unbranded | Visible brand/label text, a person's face |
| 23 | Amber Oud Eau de Parfum | fragrances | Eau de parfum with warm amber and oud notes in a glass bottle | Bottle upright, warm amber tones | Bottle with box or close-up of cap and glass | Glass bottle, amber/warm tone, premium look, no readable label | Designer logos or readable brand/label text |
| 24 | Citrus Mist Body Spray | fragrances | Fresh citrus body spray in a handy spray bottle | Bottle upright with citrus slices | Bottle close-up or sprayer detail | Spray bottle, citrus cue (orange/lemon), unbranded | Readable brand/label text |

## 3. Category images (10) and other slots

Category image: 800x600 (4:3), subject centred, calm uncluttered scene in the same palette and light as the product shots. Planned filename `category-<slug>.webp`.

| # | Category | Scene (4:3, subject centred) |
|---|---|---|
| 1 | Headphones | headphones on a pastel/neutral surface, centred |
| 2 | Speakers | bluetooth speakers arranged on a shelf, centred |
| 3 | Power Banks | power bank with phone and cable, centred |
| 4 | Watches | watches flat-lay, centred |
| 5 | Bags | backpack and tote together, centred |
| 6 | Sunglasses | sunglasses on a plain surface, centred |
| 7 | Lamps | table lamp in a calm interior, centred |
| 8 | Kitchen | cookware and jars on a counter, centred |
| 9 | Skincare | skincare tube and leaf, centred |
| 10 | Fragrances | perfume bottles, centred |

Other slots: **default share image** (`A-O01`, 1200x630 JPEG, clean lifestyle scene with room for a title; needs the Milestone 107 code change, optional until then) and **two optional promo images** (`A-R01`, `A-R02`, 400x400; no promo cards exist in the seeds). The hero stays product-driven (D2), so it needs no separate image.

## 4. Licence verification protocol

What I believe the licences say (**unverified: the licence pages could not be fetched; read each one at download time and record its URL and the date**):

| Source | Understood terms | Practical limits |
|---|---|---|
| Unsplash (free photos) | Free for commercial and non-commercial use, no permission or attribution required (attribution appreciated); not allowed: selling unaltered copies, building a competing photo service | "Unsplash+" images are under a different, paid licence: excluded. No model or property release is guaranteed, so people, logos and trademarked designs are not cleared for endorsement-style use |
| Pexels | Free for personal and commercial use, no attribution required; not allowed: selling or redistributing unaltered, implying endorsement or affiliation, showing identifiable people in a bad light or in sensitive contexts | Same release caveat; trademark and brand content may not be cleared; some photos may be paid or partner content: check each page |

Per image, a person (or me, once access exists) records in `MANIFEST.csv`: `source_site`, `source_url` (the photo's own page, not a search page), `author` and `author_url`, `licence` name, `licence_url`, `licence_checked_on` (date), `attribution_required` (yes/no), `attribution_text` (credit line anyway), `retrieved_on`, `original_filename`. A row cannot leave `needed`/`candidate` for `licence-verified` unless all of these are filled. Also confirm: no Unsplash+ marker, no visible brand, no identifiable person, and that the photo page still shows the same licence. Keep a saved copy of the photo page (HTML or screenshot) beside the archived original as evidence.

Status flow is now: `needed` (slot defined, nothing chosen) -> `candidate` -> `licence-verified` -> `approved` -> `processed` -> `validated` -> `uploaded-local` -> `integrated-test` -> `removed`. Only the owner moves a row to `approved`.

Automation caution (unverified): both sites' terms and APIs may restrict bulk scraping and hot-linking. Choose photos manually or through each site's official API/download route with its own key; do not scrape.

## 5. Network restriction: findings and the exact setting to change

Tested again 2026-11-01 (during Milestone 104): `images.unsplash.com`, `unsplash.com`, `api.unsplash.com`, `www.pexels.com`, `images.pexels.com` all fail at `CONNECT` with **HTTP 403 Forbidden** from the egress proxy; the proxy status records each as `connect_rejected` ("policy denial or upstream failure"). This is the cloud environment's **network access policy**, not a certificate or tooling fault. It is not bypassed and nothing was retried beyond the check.

What you need to change (only you can; I cannot):

1. Open the **cloud environment settings**: the environment menu in the title bar, then **Edit**.
2. Find **Network access**.
3. Either raise the level to a broader setting that allows general internet access, **or** keep a restricted level and add these entries under **Allowed domains**: `unsplash.com`, `images.unsplash.com`, `pexels.com`, `www.pexels.com`, `images.pexels.com`. (`api.unsplash.com` only if you want API use.) Leave **Allow package managers** ticked so npm and git keep working. Allowed domains appears under the **Limited** level; an older app version may show it under **Custom** with a box to include the default package-manager list.
4. Save, then start a new session or ask me to re-test (a change may only apply to new sessions; unverified).
5. Official steps: https://code.claude.com/docs/en/cloud-environments#network-access

Even with access, a site may serve a bot challenge to automated fetches (unverified). If so, I will say so and fall back to the owner download route below rather than evade the check.

## 6. Alternatives if the sites stay unreachable

| Option | Licensing | Limits |
|---|---|---|
| **A. You download the photos** into `demo-assets/_inbox/` (I give you a numbered list with search phrases and the photo-page link to record) | Same free licences, recorded by you or from pages you save as files | Fastest and needs no policy change; you do the browsing; I can check the files' sharpness, square framing, logos and match to the description |
| **B. You send photo-page links or saved pages (HTML/PDF)** | Same | I read licence and author from the saved page; I still cannot fetch the image itself |
| **C. Pixabay** (Pixabay Content License, free commercial use, no attribution required; understood, unverified) | Needs its own per-image check | Currently blocked as well (not retested here); style is less consistent, more illustrations and stock-looking composites |
| **D. Wikimedia Commons** (mixed CC licences; many require attribution and share-alike) | Per-image licence is mandatory reading; attribution text must be shown somewhere | Photos are often not studio shots, frequently carry brand names, and CC BY-SA may impose conditions we would have to honour; also blocked here |
| **E. Your own photography or your supplier's/manufacturer's images** | Fully yours, or written permission needed | Best match and best consistency; cost and time; the right route for the real catalogue anyway |
| **F. Paid stock** (Shutterstock, Adobe Stock, iStock, Envato) | Clear commercial licence, purchased per image or subscription | Cost; licence tiers and editorial-only flags to check; best for matched sets |
| **G. AI-generated photoreal images** | Provider terms vary; **not approved** by the owner | Cannot depict real products honestly, risk of odd details (hands, text, logos); only if you explicitly approve and want a disclosure line in the manifest |

Recommendation: **A** (with the policy change in section 5 as the alternative that lets me do the research), then **E/F** for any item free stock cannot match.

## 7. Missing or unavailable images

All 61 slots are unfilled: 48 product photos, 10 category images, 1 share image, 2 optional promo images. Reason: no source access and nothing in `_inbox/`. Expected hardest to match (flagged now so D3 decisions are early): Volt Compact / Volt Max Power Banks (two distinct logo-free sizes), Nonstick Frying Pan, Gentle Foaming Face Wash and Aloe Gel Cream (unbranded tubes), Amber Oud (bottle without a readable label), Pulse and Orbit smart watches (no recognisable brand screens), and two visibly different pairs per category (headphones, speakers, watches).

## 8. Recommended next steps for Milestone 105 (not started)

1. First unblock sourcing: the network setting in section 5, or option A in section 6. Milestone 105 can be built and tested with a few approved sample photos; it does not need all 61.
2. Owner approves at least one sample per type: a product (square), a category (4:3) and the share image.
3. Milestone 105 then: add the processing script and npm entry (existing `sharp`, no new dependency); archive originals to `demo-assets/_archive/originals/` outside Git (D4) with a recommended second backup; produce WebP to the budgets (product 1000x1000 <= 120 KB, category 800x600 <= 70 KB, promo 400x400 <= 40 KB, share image 1200x630 JPEG <= 200 KB); strip metadata; validate and fill checksums, dimensions and bytes in the manifest.
4. Fix the mismatch found in Milestone 103: the seed's override path caps at 1600 px with no byte limit and does not square-crop, so the pipeline's output must be what the seed ingests (settled in Milestones 105 and 106, no seed change before then).
5. Decide in advance what happens to the 4 blank continuous-integration-seed images (Milestone 106).
