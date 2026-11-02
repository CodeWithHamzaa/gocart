# Sourced-image inventory and processing report (M104–M106)

**Status (2026-11-02): all 61 planned image slots are filled, processed, validated and integrated locally.** Every product (24), category (10), the share image and both promo images now use a licensed photograph; no generated artwork remains in the demo seed. Nothing was uploaded, deployed or written to any remote database. Provenance per image is in [MANIFEST.csv](./MANIFEST.csv) (the source of truth); the tables below are generated from it.

Related: [VISUAL_ASSETS_PLAN.md](../VISUAL_ASSETS_PLAN.md), [PHOTO_BRIEF.md](./PHOTO_BRIEF.md), [MEDIA_AUDIT.md](./MEDIA_AUDIT.md). ADR-049 is still **Proposed**; `M107`–`M109` are not started.

## 1. Owner decisions that shaped this set (2026-11-02)

Everything in the catalogue is demo content. Names, descriptions and attributes are not corrected to fit photos; visible brand names and logos in photos are acceptable; consistent premium quality matters more than one identical photographic style; if no suitable free image exists the generated artwork stays (this was not needed). The first sourcing pass (2026-11-01) had applied a stricter no-visible-brand rule, which is why 4 products were left on generated art; the second pass sourced them under the relaxed rule. The temporary description edits made on 2026-11-01 (D3) are left as they are; no further copy changes were made.

## 2. Network and licence method

| Host | Result |
|---|---|
| `images.unsplash.com` | Reachable (HTTP 200). Used for every download. |
| `unsplash.com` pages, search, `/napi/…` | Answer scripts with a browser check (HTTP 401 "Checking your browser"). **Not bypassed.** |
| `www.pexels.com` | Cloudflare challenge (HTTP 403, `cf-mitigated: challenge`). **Not bypassed.** |
| `api.pexels.com` | Refused by the egress proxy (403 on CONNECT; also needs an API key). |
| `images.pexels.com` | Reachable, but without Pexels pages or its API there is no way to find a photo or read its licence. **No Pexels photo was used.** |

Photo pages, listings and the licence text were read through the WebFetch and WebSearch tools (permitted tools, not a workaround of the check). **Author, publish date and the "Free to use under the Unsplash License" line were read from a tool's summary of each photo page**, not by opening the page directly, and are recorded as such. The licence itself was read once from <https://unsplash.com/license>: free for commercial and non-commercial use, no permission or attribution needed; not allowed: selling unaltered copies, building a competing photo service. Every chosen photo was shown as free and none as Unsplash+. Open any row's `source_url` to confirm.

## 3. What the set is

- 24 products x 2 images. Image 2 of each product is a **detail crop of the same photograph** (stock sites rarely offer two shots of one invented product); the manifest notes say so.
- 10 categories, the share image and 2 promo images are other crops of those photographs.
- Search-result titles were often wrong (a "white speaker" was a router, a "white table" had a brown backdrop), so every chosen image was inspected at full size.
- **Not one photographer.** Backdrops range from white to peach, yellow, wood, marble and grey; the set is clean but will not look like a single studio shoot. Several photos show a maker's name (Sony speaker, Mi power bank, watch dials), which is accepted for demo content and must not be reused for a real catalogue.
- **Resolution.** Originals are the CDN's JPEG rendition at up to 5000 px (q90), not the untouched upload (that download link is behind the same browser check).
- A hand appears in the minimal-watch photo (no face, nobody identifiable).
- Some photos are only a close match to the product name (for example the on-ear headphones for "Over-Ear", a single jar for "Jar Set"); per the owner's decision this is not corrected.

## 4. Processing result

Pipeline: `npm run process:demo-images` (and `-- --check`). sharp only, no new dependency. Square crops are framed on the product from the spec in `scripts/demo-data/photos.ts`; no source is ever enlarged (a crop smaller than the output is rejected); WebP quality starts at 82 and steps down to a floor of 60 until the byte target is met; EXIF, XMP, IPTC and ICC are absent from every output (re-read and verified); output is sRGB, single frame, named by the seed convention; originals are never modified (SHA-256 recorded and re-checked on every run). Two images finish over their 120 KB target but under the 150 KB hard cap because textured backgrounds need the quality floor (`metro-canvas-backpack-2.webp`, 124 KB; `volt-max-power-bank-1.webp`, 128 KB); everything else meets the target. One framing (Volt Max, tight crop) was rejected by the budget rule and re-framed rather than the budget loosened.

Originals are kept outside Git in the git-ignored `demo-assets/_archive/originals/`.

## Summary by kind

| Kind | Images | Source files (sum, per-asset copy of its original) | Processed (sum) | Largest | Budget (target / hard cap) |
|---|---|---|---|---|---|
| product | 48 | 68451.3 KB | 2417.6 KB | 128.4 KB | 120 / 150 KB |
| category | 10 | 12149.2 KB | 221.7 KB | 49.5 KB | 70 / 90 KB |
| promo | 2 | 1614.3 KB | 15.3 KB | 8.7 KB | 40 / 50 KB |
| og | 1 | 424.3 KB | 21.1 KB | 21.1 KB | 200 / 250 KB |
| **total** | **61** | **80.7 MB** | **2675.7 KB** | | |

"Source files" counts each asset against the full original it was cut from (several assets share one photo), so it shows what each image would cost unprocessed.

## Every processed image

Author and photo page are as read through WebFetch on 2026-11-01. All are the Unsplash License; no attribution is required (credit lines are recorded in the manifest anyway).

| Asset | File | Size | Bytes (before > after) | Photographer | Photo page | Close match? |
|---|---|---|---|---|---|---|
| A-P01-1 | `aero-wave-wireless-headphones-1.webp` | 1000x1000 webp | 986.7 > 24.6 KB | Milena Trifonova | [black-headphones-on-white-table-pHqt1DsHCx0](https://unsplash.com/photos/black-headphones-on-white-table-pHqt1DsHCx0) | On-ear, all black, no coloured inner ring (copy changed) |
| A-P01-2 | `aero-wave-wireless-headphones-2.webp` | 1000x1000 webp | 986.7 > 25.0 KB | Milena Trifonova | [black-headphones-on-white-table-pHqt1DsHCx0](https://unsplash.com/photos/black-headphones-on-white-table-pHqt1DsHCx0) | On-ear, all black, no coloured inner ring (copy changed) |
| A-P02-1 | `studio-lite-over-ear-headphones-1.webp` | 1000x1000 webp | 424.3 > 26.1 KB | Kamran Abdullayev | [a-pair-of-headphones-floating-in-the-air-TpDhqQCWY0s](https://unsplash.com/photos/a-pair-of-headphones-floating-in-the-air-TpDhqQCWY0s) | Cream and grey, on-ear style; copy no longer says over-ear in the description |
| A-P02-2 | `studio-lite-over-ear-headphones-2.webp` | 1000x1000 webp | 424.3 > 30.8 KB | Kamran Abdullayev | [a-pair-of-headphones-floating-in-the-air-TpDhqQCWY0s](https://unsplash.com/photos/a-pair-of-headphones-floating-in-the-air-TpDhqQCWY0s) | Cream and grey, on-ear style; copy no longer says over-ear in the description |
| A-P03-1 | `capsule-portable-bluetooth-speaker-1.webp` | 1000x1000 webp | 2512.8 > 61.4 KB | Jonas Jacobsson | [selective-focus-photography-of-black-and-gray-portable-speaker-VSYq9nS-fY0](https://unsplash.com/photos/selective-focus-photography-of-black-and-gray-portable-speaker-VSYq9nS-fY0) | no |
| A-P03-2 | `capsule-portable-bluetooth-speaker-2.webp` | 1000x1000 webp | 2512.8 > 69.9 KB | Jonas Jacobsson | [selective-focus-photography-of-black-and-gray-portable-speaker-VSYq9nS-fY0](https://unsplash.com/photos/selective-focus-photography-of-black-and-gray-portable-speaker-VSYq9nS-fY0) | no |
| A-P04-1 | `cylinder-mini-speaker-1.webp` | 1000x1000 webp | 1160.7 > 66.8 KB | Berke Can | [a-close-up-of-a-speaker-on-a-white-surface-EXiDx2JcFdE](https://unsplash.com/photos/a-close-up-of-a-speaker-on-a-white-surface-EXiDx2JcFdE) | no |
| A-P04-2 | `cylinder-mini-speaker-2.webp` | 1000x1000 webp | 1160.7 > 80.5 KB | Berke Can | [a-close-up-of-a-speaker-on-a-white-surface-EXiDx2JcFdE](https://unsplash.com/photos/a-close-up-of-a-speaker-on-a-white-surface-EXiDx2JcFdE) | no |
| A-P05-1 | `pulse-active-smart-watch-1.webp` | 1000x1000 webp | 3036.9 > 17.9 KB | pratik prasad | [a-watch-with-a-black-face-FPEBZJLD8Rs](https://unsplash.com/photos/a-watch-with-a-black-face-FPEBZJLD8Rs) | no |
| A-P05-2 | `pulse-active-smart-watch-2.webp` | 1000x1000 webp | 3036.9 > 64.0 KB | pratik prasad | [a-watch-with-a-black-face-FPEBZJLD8Rs](https://unsplash.com/photos/a-watch-with-a-black-face-FPEBZJLD8Rs) | no |
| A-P06-1 | `orbit-slim-smart-watch-1.webp` | 1000x1000 webp | 1109.1 > 74.4 KB | Al Amin Mir | [a-close-up-of-a-smart-watch-on-a-table-jRM_bQIb_80](https://unsplash.com/photos/a-close-up-of-a-smart-watch-on-a-table-jRM_bQIb_80) | Not a slim case; copy no longer says slim |
| A-P06-2 | `orbit-slim-smart-watch-2.webp` | 1000x1000 webp | 1109.1 > 65.0 KB | Al Amin Mir | [a-close-up-of-a-smart-watch-on-a-table-jRM_bQIb_80](https://unsplash.com/photos/a-close-up-of-a-smart-watch-on-a-table-jRM_bQIb_80) | Not a slim case; copy no longer says slim |
| A-P07-1 | `volt-compact-power-bank-1.webp` | 1000x1000 webp | 1714.2 > 39.0 KB | Markus Winkler | [white-and-blue-coated-wires-UP_RojtnvTU](https://unsplash.com/photos/white-and-blue-coated-wires-UP_RojtnvTU) | No charge-level indicator visible (copy changed) |
| A-P07-2 | `volt-compact-power-bank-2.webp` | 1000x1000 webp | 1714.2 > 74.3 KB | Markus Winkler | [white-and-blue-coated-wires-UP_RojtnvTU](https://unsplash.com/photos/white-and-blue-coated-wires-UP_RojtnvTU) | No charge-level indicator visible (copy changed) |
| A-P08-1 | `volt-max-power-bank-1.webp` | 1000x1000 webp | 3262.8 > 128.4 KB | Andrey Matveev | [white-power-bank-with-three-charging-cables-7JbgHNq4h4k](https://unsplash.com/photos/white-power-bank-with-three-charging-cables-7JbgHNq4h4k) | no |
| A-P08-2 | `volt-max-power-bank-2.webp` | 1000x1000 webp | 3262.8 > 90.9 KB | Andrey Matveev | [white-power-bank-with-three-charging-cables-7JbgHNq4h4k](https://unsplash.com/photos/white-power-bank-with-three-charging-cables-7JbgHNq4h4k) | no |
| A-P09-1 | `classic-steel-analog-watch-1.webp` | 1000x1000 webp | 406.2 > 35.1 KB | Tareq Hasan | [a-watch-sitting-on-top-of-a-white-table-QQ_nm-OFlBs](https://unsplash.com/photos/a-watch-sitting-on-top-of-a-white-table-QQ_nm-OFlBs) | no |
| A-P09-2 | `classic-steel-analog-watch-2.webp` | 1000x1000 webp | 406.2 > 50.9 KB | Tareq Hasan | [a-watch-sitting-on-top-of-a-white-table-QQ_nm-OFlBs](https://unsplash.com/photos/a-watch-sitting-on-top-of-a-white-table-QQ_nm-OFlBs) | no |
| A-P10-1 | `minimal-leather-strap-watch-1.webp` | 1000x1000 webp | 1444.9 > 55.3 KB | Jaelynn Castillo | [person-holding-analog-watch-xfNeB1stZ_0](https://unsplash.com/photos/person-holding-analog-watch-xfNeB1stZ_0) | no |
| A-P10-2 | `minimal-leather-strap-watch-2.webp` | 1000x1000 webp | 1444.9 > 88.6 KB | Jaelynn Castillo | [person-holding-analog-watch-xfNeB1stZ_0](https://unsplash.com/photos/person-holding-analog-watch-xfNeB1stZ_0) | no |
| A-P11-1 | `chrono-sport-wrist-watch-1.webp` | 1000x1000 webp | 811.5 > 90.2 KB | Ryan Chan | [a-close-up-of-a-luxury-chronograph-wristwatch-3XbFQkhWKIA](https://unsplash.com/photos/a-close-up-of-a-luxury-chronograph-wristwatch-3XbFQkhWKIA) | no |
| A-P11-2 | `chrono-sport-wrist-watch-2.webp` | 1000x1000 webp | 811.5 > 113.9 KB | Ryan Chan | [a-close-up-of-a-luxury-chronograph-wristwatch-3XbFQkhWKIA](https://unsplash.com/photos/a-close-up-of-a-luxury-chronograph-wristwatch-3XbFQkhWKIA) | no |
| A-P12-1 | `metro-canvas-backpack-1.webp` | 1000x1000 webp | 3131.9 > 102.0 KB | YF Chen | [green-canvas-backpack-with-leather-straps-on-a-yellow-chair-hPYnW6kql20](https://unsplash.com/photos/green-canvas-backpack-with-leather-straps-on-a-yellow-chair-hPYnW6kql20) | Partly cropped view, leather straps instead of a front flap (copy changed) |
| A-P12-2 | `metro-canvas-backpack-2.webp` | 1000x1000 webp | 3131.9 > 124.3 KB | YF Chen | [green-canvas-backpack-with-leather-straps-on-a-yellow-chair-hPYnW6kql20](https://unsplash.com/photos/green-canvas-backpack-with-leather-straps-on-a-yellow-chair-hPYnW6kql20) | Partly cropped view, leather straps instead of a front flap (copy changed) |
| A-P13-1 | `everyday-faux-leather-tote-1.webp` | 1000x1000 webp | 1753.1 > 25.5 KB | Ugluk Potroshitel | [brown-leather-handbag-on-white-table-XwjrPFW7xw0](https://unsplash.com/photos/brown-leather-handbag-on-white-table-XwjrPFW7xw0) | Photo shows a leather tote without a front flap (copy changed; the photographer describes real leather) |
| A-P13-2 | `everyday-faux-leather-tote-2.webp` | 1000x1000 webp | 1753.1 > 27.5 KB | Ugluk Potroshitel | [brown-leather-handbag-on-white-table-XwjrPFW7xw0](https://unsplash.com/photos/brown-leather-handbag-on-white-table-XwjrPFW7xw0) | Photo shows a leather tote without a front flap (copy changed; the photographer describes real leather) |
| A-P14-1 | `weekender-duffle-bag-1.webp` | 1000x1000 webp | 2513.7 > 50.6 KB | Erol Ahmed | [brown-duffel-bag-beside-white-and-brown-wooden-chair-9XiN0r2NWSM](https://unsplash.com/photos/brown-duffel-bag-beside-white-and-brown-wooden-chair-9XiN0r2NWSM) | no |
| A-P14-2 | `weekender-duffle-bag-2.webp` | 1000x1000 webp | 2513.7 > 62.0 KB | Erol Ahmed | [brown-duffel-bag-beside-white-and-brown-wooden-chair-9XiN0r2NWSM](https://unsplash.com/photos/brown-duffel-bag-beside-white-and-brown-wooden-chair-9XiN0r2NWSM) | no |
| A-P15-1 | `pilot-frame-sunglasses-1.webp` | 1000x1000 webp | 1071.3 > 18.1 KB | Habib Dadkhah | [silver-framed-aviator-style-sunglasses-MivM1hirbUI](https://unsplash.com/photos/silver-framed-aviator-style-sunglasses-MivM1hirbUI) | Gold-tone frame with brown gradient lenses (copy changed) |
| A-P15-2 | `pilot-frame-sunglasses-2.webp` | 1000x1000 webp | 1071.3 > 30.8 KB | Habib Dadkhah | [silver-framed-aviator-style-sunglasses-MivM1hirbUI](https://unsplash.com/photos/silver-framed-aviator-style-sunglasses-MivM1hirbUI) | Gold-tone frame with brown gradient lenses (copy changed) |
| A-P16-1 | `round-frame-sunglasses-1.webp` | 1000x1000 webp | 404.2 > 14.3 KB | charlesdeluvio | [gold-colored-framed-hippie-sunglasses-on-white-surface-1-nx1QR5dTE](https://unsplash.com/photos/gold-colored-framed-hippie-sunglasses-on-white-surface-1-nx1QR5dTE) | no |
| A-P16-2 | `round-frame-sunglasses-2.webp` | 1000x1000 webp | 404.2 > 17.4 KB | charlesdeluvio | [gold-colored-framed-hippie-sunglasses-on-white-surface-1-nx1QR5dTE](https://unsplash.com/photos/gold-colored-framed-hippie-sunglasses-on-white-surface-1-nx1QR5dTE) | no |
| A-P17-1 | `arc-table-lamp-1.webp` | 1000x1000 webp | 892.9 > 21.4 KB | Sincerely Media | [gold-table-almp-VDPauwJ_sHo](https://unsplash.com/photos/gold-table-almp-VDPauwJ_sHo) | Metal shade rather than fabric (copy changed) |
| A-P17-2 | `arc-table-lamp-2.webp` | 1000x1000 webp | 892.9 > 27.5 KB | Sincerely Media | [gold-table-almp-VDPauwJ_sHo](https://unsplash.com/photos/gold-table-almp-VDPauwJ_sHo) | Metal shade rather than fabric (copy changed) |
| A-P18-1 | `dome-desk-lamp-1.webp` | 1000x1000 webp | 1189.9 > 24.1 KB | Brina Blum | [white-table-lamp-mNXTZu7AeGA](https://unsplash.com/photos/white-table-lamp-mNXTZu7AeGA) | Flexible neck and bell-shaped shade, not a dome on a round base (copy changed) |
| A-P18-2 | `dome-desk-lamp-2.webp` | 1000x1000 webp | 1189.9 > 17.0 KB | Brina Blum | [white-table-lamp-mNXTZu7AeGA](https://unsplash.com/photos/white-table-lamp-mNXTZu7AeGA) | Flexible neck and bell-shaped shade, not a dome on a round base (copy changed) |
| A-P19-1 | `nonstick-frying-pan-1.webp` | 1000x1000 webp | 338.5 > 15.2 KB | Cooker King | [black-frying-pan-on-white-surface-Mv3JygH8eXQ](https://unsplash.com/photos/black-frying-pan-on-white-surface-Mv3JygH8eXQ) | Handle is wood-look rather than dark (copy changed) |
| A-P19-2 | `nonstick-frying-pan-2.webp` | 1000x1000 webp | 338.5 > 25.1 KB | Cooker King | [black-frying-pan-on-white-surface-Mv3JygH8eXQ](https://unsplash.com/photos/black-frying-pan-on-white-surface-Mv3JygH8eXQ) | Handle is wood-look rather than dark (copy changed) |
| A-P20-1 | `glass-storage-jar-set-1.webp` | 1000x1000 webp | 984.3 > 29.4 KB | Darío Méndez | [clear-glass-jar-with-white-lid-SHSSaB4BLgc](https://unsplash.com/photos/clear-glass-jar-with-white-lid-SHSSaB4BLgc) | Photo shows one empty jar, not a set filled with pulses (copy changed) |
| A-P20-2 | `glass-storage-jar-set-2.webp` | 1000x1000 webp | 984.3 > 108.5 KB | Darío Méndez | [clear-glass-jar-with-white-lid-SHSSaB4BLgc](https://unsplash.com/photos/clear-glass-jar-with-white-lid-SHSSaB4BLgc) | Photo shows one empty jar, not a set filled with pulses (copy changed) |
| A-P21-1 | `aloe-hydrating-gel-cream-1.webp` | 1000x1000 webp | 105.5 > 7.9 KB | Point Normal | [a-tube-of-cream-sitting-on-top-of-a-table-Xp0bTCLD07k](https://unsplash.com/photos/a-tube-of-cream-sitting-on-top-of-a-table-Xp0bTCLD07k) | Generic white tubes; no aloe cue in the photo |
| A-P21-2 | `aloe-hydrating-gel-cream-2.webp` | 1000x1000 webp | 105.5 > 4.6 KB | Point Normal | [a-tube-of-cream-sitting-on-top-of-a-table-Xp0bTCLD07k](https://unsplash.com/photos/a-tube-of-cream-sitting-on-top-of-a-table-Xp0bTCLD07k) | Generic white tubes; no aloe cue in the photo |
| A-P22-1 | `gentle-foaming-face-wash-1.webp` | 1000x1000 webp | 1020.9 > 39.1 KB | Birgith Roosipuu | [white-tube-on-glass-table-GdsFTnarsog](https://unsplash.com/photos/white-tube-on-glass-table-GdsFTnarsog) | Generic tube; no foam shown |
| A-P22-2 | `gentle-foaming-face-wash-2.webp` | 1000x1000 webp | 1020.9 > 25.7 KB | Birgith Roosipuu | [white-tube-on-glass-table-GdsFTnarsog](https://unsplash.com/photos/white-tube-on-glass-table-GdsFTnarsog) | Generic tube; no foam shown |
| A-P23-1 | `amber-oud-eau-de-parfum-1.webp` | 1000x1000 webp | 1501.1 > 103.0 KB | Birgith Roosipuu | [perfume-bottle-and-cosmetic-jars-nka_sIQpKEU](https://unsplash.com/photos/perfume-bottle-and-cosmetic-jars-nka_sIQpKEU) | no |
| A-P23-2 | `amber-oud-eau-de-parfum-2.webp` | 1000x1000 webp | 1501.1 > 87.7 KB | Birgith Roosipuu | [perfume-bottle-and-cosmetic-jars-nka_sIQpKEU](https://unsplash.com/photos/perfume-bottle-and-cosmetic-jars-nka_sIQpKEU) | no |
| A-P24-1 | `citrus-mist-body-spray-1.webp` | 1000x1000 webp | 2448.2 > 19.6 KB | Kier in Sight Archives | [a-clear-glass-perfume-bottle-with-black-cap-j1vg92xdoX4](https://unsplash.com/photos/a-clear-glass-perfume-bottle-with-black-cap-j1vg92xdoX4) | No citrus cue and no visible spray nozzle (copy changed) |
| A-P24-2 | `citrus-mist-body-spray-2.webp` | 1000x1000 webp | 2448.2 > 16.3 KB | Kier in Sight Archives | [a-clear-glass-perfume-bottle-with-black-cap-j1vg92xdoX4](https://unsplash.com/photos/a-clear-glass-perfume-bottle-with-black-cap-j1vg92xdoX4) | No citrus cue and no visible spray nozzle (copy changed) |
| A-C01 | `category-headphones.webp` | 800x600 webp | 424.3 > 11.1 KB | Kamran Abdullayev | [a-pair-of-headphones-floating-in-the-air-TpDhqQCWY0s](https://unsplash.com/photos/a-pair-of-headphones-floating-in-the-air-TpDhqQCWY0s) | no |
| A-C02 | `category-speakers.webp` | 800x600 webp | 2512.8 > 42.7 KB | Jonas Jacobsson | [selective-focus-photography-of-black-and-gray-portable-speaker-VSYq9nS-fY0](https://unsplash.com/photos/selective-focus-photography-of-black-and-gray-portable-speaker-VSYq9nS-fY0) | no |
| A-C03 | `category-power-banks.webp` | 800x600 webp | 1714.2 > 22.9 KB | Markus Winkler | [white-and-blue-coated-wires-UP_RojtnvTU](https://unsplash.com/photos/white-and-blue-coated-wires-UP_RojtnvTU) | no |
| A-C04 | `category-watches.webp` | 800x600 webp | 1444.9 > 24.2 KB | Jaelynn Castillo | [person-holding-analog-watch-xfNeB1stZ_0](https://unsplash.com/photos/person-holding-analog-watch-xfNeB1stZ_0) | no |
| A-C05 | `category-bags.webp` | 800x600 webp | 2513.7 > 34.2 KB | Erol Ahmed | [brown-duffel-bag-beside-white-and-brown-wooden-chair-9XiN0r2NWSM](https://unsplash.com/photos/brown-duffel-bag-beside-white-and-brown-wooden-chair-9XiN0r2NWSM) | no |
| A-C06 | `category-sunglasses.webp` | 800x600 webp | 404.2 > 9.1 KB | charlesdeluvio | [gold-colored-framed-hippie-sunglasses-on-white-surface-1-nx1QR5dTE](https://unsplash.com/photos/gold-colored-framed-hippie-sunglasses-on-white-surface-1-nx1QR5dTE) | no |
| A-C07 | `category-lamps.webp` | 800x600 webp | 1189.9 > 14.3 KB | Brina Blum | [white-table-lamp-mNXTZu7AeGA](https://unsplash.com/photos/white-table-lamp-mNXTZu7AeGA) | no |
| A-C08 | `category-kitchen.webp` | 800x600 webp | 338.5 > 9.1 KB | Cooker King | [black-frying-pan-on-white-surface-Mv3JygH8eXQ](https://unsplash.com/photos/black-frying-pan-on-white-surface-Mv3JygH8eXQ) | no |
| A-C09 | `category-skincare.webp` | 800x600 webp | 105.5 > 4.7 KB | Point Normal | [a-tube-of-cream-sitting-on-top-of-a-table-Xp0bTCLD07k](https://unsplash.com/photos/a-tube-of-cream-sitting-on-top-of-a-table-Xp0bTCLD07k) | no |
| A-C10 | `category-fragrances.webp` | 800x600 webp | 1501.1 > 49.5 KB | Birgith Roosipuu | [perfume-bottle-and-cosmetic-jars-nka_sIQpKEU](https://unsplash.com/photos/perfume-bottle-and-cosmetic-jars-nka_sIQpKEU) | no |
| A-O01 | `demo-og-default.jpg` | 1200x630 jpeg | 424.3 > 21.1 KB | Kamran Abdullayev | [a-pair-of-headphones-floating-in-the-air-TpDhqQCWY0s](https://unsplash.com/photos/a-pair-of-headphones-floating-in-the-air-TpDhqQCWY0s) | no |
| A-R01 | `demo-promo-1.webp` | 400x400 webp | 424.3 > 8.7 KB | Kamran Abdullayev | [a-pair-of-headphones-floating-in-the-air-TpDhqQCWY0s](https://unsplash.com/photos/a-pair-of-headphones-floating-in-the-air-TpDhqQCWY0s) | no |
| A-R02 | `demo-promo-2.webp` | 400x400 webp | 1189.9 > 6.7 KB | Brina Blum | [white-table-lamp-mNXTZu7AeGA](https://unsplash.com/photos/white-table-lamp-mNXTZu7AeGA) | no |
