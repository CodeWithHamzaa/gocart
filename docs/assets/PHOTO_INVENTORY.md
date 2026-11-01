# Sourced-image inventory and processing report (M104–M106), 2026-11-01

**Status: 53 of the 61 planned slots are filled, processed, validated and integrated locally. 8 slots (4 products x 2 images) have no acceptable photo and still use the generated artwork.** Nothing was uploaded, deployed or written to any remote database. Provenance per image is in [MANIFEST.csv](./MANIFEST.csv) (the source of truth); the tables at the end of this file are generated from it.

Related: [VISUAL_ASSETS_PLAN.md](../VISUAL_ASSETS_PLAN.md), [PHOTO_BRIEF.md](./PHOTO_BRIEF.md), [MEDIA_AUDIT.md](./MEDIA_AUDIT.md). ADR-049 is still **Proposed**; `M107`–`M109` are not started.

## 1. Network result (re-test, same day)

| Host | Result |
|---|---|
| `images.unsplash.com` | Reachable (HTTP 200). Used for every download. |
| `unsplash.com` pages, search, `/napi/…` | Answer scripts with a browser check (HTTP 401 "Checking your browser"). **Not bypassed.** |
| `www.pexels.com` | Cloudflare challenge (HTTP 403, `cf-mitigated: challenge`). **Not bypassed.** |
| `api.pexels.com` | Refused by the egress proxy (403 on CONNECT; not in the allowed list, and it also needs an API key). |
| `images.pexels.com` | Reachable, but without Pexels pages or its API there is no way to find a photo or read its licence. **No Pexels photo was used.** |

Photo pages, listings and the licence text were read through the WebFetch and WebSearch tools instead (a permitted tool, not a workaround of the check). Consequence: **author, publish date and the "Free to use under the Unsplash License" line were read from a tool's summary of each photo page**, not by opening the page myself. They are recorded as such; the licence itself was read once from <https://unsplash.com/license> (free for commercial and non-commercial use, no permission or attribution needed; not allowed: selling unaltered copies, building a competing photo service). Every chosen photo was shown as free and none as Unsplash+. If you want certainty beyond that, open the `source_url` of any row.

## 2. What was and was not found

- 20 of 24 products have a logo-free, closest-match photograph. Image 2 of each is a **detail crop of the same photograph** (stock sites rarely offer two shots of one invented product); this is stated in the manifest notes.
- 10 categories, the share image and 2 promo images are different crops of those same photographs.
- **No acceptable photo** (every candidate showed a brand name or was the wrong item): Cylinder Mini Speaker, Volt Max Power Bank, Classic Steel Analog Watch, Chrono Sport Wrist Watch. Their reasons are in the manifest. They keep generated artwork; drop a licensed or own photo in `demo-assets/_inbox/`, add it to `scripts/demo-data/photos.ts` and run the pipeline.
- Candidates rejected for visible branding or wrong subject (moved to the git-ignored `demo-assets/_archive/rejected/`): Sony headphones (SONY on the headband), Mi power bank, power bank printed with its maker's name, Seiko and "Omega" chronographs, a watch with brand text on its dial, a Sony speaker (name on the strap tag), a speaker with a "BOOMS BASS" badge, a power bank with debossed lettering, a Nordgreen watch (name on the dial), and a navy backpack with a logo patch. Also rejected on sight: Apple Watch / AirPods Max shots, JBL, Bose and Sonos speakers, any photo with a visible person's face, and a Wi-Fi router the page called a speaker.
- Search-result descriptions were often wrong (a "white speaker" was a router, a "white table" had a brown backdrop). Every chosen image was inspected at full size, not trusted from its title.

## 3. Honest limits on the look

- **Not one photographer.** Backdrops range from white to peach, yellow, wood and marble. They are clean and unbranded, but the grid will not look like a single studio shoot. A consistent set needs either a matched paid set or the owner's own photography (the right route for the real catalogue anyway).
- **Close matches only.** Where a photo contradicts the demo copy, the description was adjusted (D3). Product **names were not changed** (they are the seed's identity key), so some names now describe slightly more than the photo shows: *Studio Lite Over-Ear Headphones* (photo: on-ear), *Orbit Slim Smart Watch*, *Dome Desk Lamp* (photo: flexible neck, bell shade), *Everyday Faux Leather Tote* (photo: a real-leather tote), *Glass Storage Jar Set* (photo: one jar), *Aloe Hydrating Gel Cream* and *Gentle Foaming Face Wash* (generic white tubes), *Citrus Mist Body Spray* (clear bottle, no nozzle or citrus). The owner can rename them, or ask for different photos.
- **Resolution.** Originals are the CDN's JPEG rendition at up to 5000 px (q90), not the untouched upload (that download link is behind the same browser check).
- **Some photos name a maker on their page** (a headphone model, an eyewear label, a luxury maker) while no mark is visible in the image. They were kept because nothing identifiable is shown at full size; this is a judgement and is marked in the manifest note. A pair of sunglasses and a pair of headphones are shaped like real designs.
- A hand appears in the minimal watch photo (no face, nobody identifiable).

## 4. Demo copy changed (D3)

Only temporary demo descriptions in `scripts/demo-data/catalogue.ts`, and only where the photo contradicted them: Aero Wave, Studio Lite, Orbit, Volt Compact, Metro Canvas Backpack, Everyday Tote, Pilot Frame, Arc Table Lamp, Dome Desk Lamp, Nonstick Frying Pan, Glass Storage Jars, Citrus Mist. Names, prices, categories and stock flags are unchanged. The seed never updates an existing row, so an existing database keeps its old text until the demo rows are removed and re-seeded.

## 5. Processing result

Pipeline: `npm run process:demo-images` (and `-- --check`). sharp only, no new dependency. Square crops are framed on the product from a spec in `scripts/demo-data/photos.ts`; no source is ever enlarged (a crop smaller than the output is rejected); WebP quality starts at 82 and steps down to a floor of 60 until the byte target is met; EXIF, XMP, IPTC and ICC are absent from every output (verified by re-reading each file); output is sRGB, single frame, named by the seed convention; originals are never modified (SHA-256 recorded, re-checked on every run). One image (`metro-canvas-backpack-2.webp`, 124 KB) needed the quality floor and finishes over its 120 KB target but under the 150 KB hard cap; everything else meets the target.

## Summary by kind

| Kind | Images | Source files (sum, per-asset copy of its original) | Processed (sum) | Largest | Budget (target / hard cap) |
|---|---|---|---|---|---|
| product | 40 | 57168.9 KB | 1760.8 KB | 124.3 KB | 120 / 150 KB |
| category | 10 | 12149.2 KB | 221.7 KB | 49.5 KB | 70 / 90 KB |
| promo | 2 | 1614.3 KB | 15.3 KB | 8.7 KB | 40 / 50 KB |
| og | 1 | 424.3 KB | 21.1 KB | 21.1 KB | 200 / 250 KB |
| **total** | **53** | **69.7 MB** | **2018.9 KB** | | |

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
| A-P05-1 | `pulse-active-smart-watch-1.webp` | 1000x1000 webp | 3036.9 > 17.9 KB | pratik prasad | [a-watch-with-a-black-face-FPEBZJLD8Rs](https://unsplash.com/photos/a-watch-with-a-black-face-FPEBZJLD8Rs) | no |
| A-P05-2 | `pulse-active-smart-watch-2.webp` | 1000x1000 webp | 3036.9 > 64.0 KB | pratik prasad | [a-watch-with-a-black-face-FPEBZJLD8Rs](https://unsplash.com/photos/a-watch-with-a-black-face-FPEBZJLD8Rs) | no |
| A-P06-1 | `orbit-slim-smart-watch-1.webp` | 1000x1000 webp | 1109.1 > 74.4 KB | Al Amin Mir | [a-close-up-of-a-smart-watch-on-a-table-jRM_bQIb_80](https://unsplash.com/photos/a-close-up-of-a-smart-watch-on-a-table-jRM_bQIb_80) | Not a slim case; copy no longer says slim |
| A-P06-2 | `orbit-slim-smart-watch-2.webp` | 1000x1000 webp | 1109.1 > 65.0 KB | Al Amin Mir | [a-close-up-of-a-smart-watch-on-a-table-jRM_bQIb_80](https://unsplash.com/photos/a-close-up-of-a-smart-watch-on-a-table-jRM_bQIb_80) | Not a slim case; copy no longer says slim |
| A-P07-1 | `volt-compact-power-bank-1.webp` | 1000x1000 webp | 1714.2 > 39.0 KB | Markus Winkler | [white-and-blue-coated-wires-UP_RojtnvTU](https://unsplash.com/photos/white-and-blue-coated-wires-UP_RojtnvTU) | No charge-level indicator visible (copy changed) |
| A-P07-2 | `volt-compact-power-bank-2.webp` | 1000x1000 webp | 1714.2 > 74.3 KB | Markus Winkler | [white-and-blue-coated-wires-UP_RojtnvTU](https://unsplash.com/photos/white-and-blue-coated-wires-UP_RojtnvTU) | No charge-level indicator visible (copy changed) |
| A-P10-1 | `minimal-leather-strap-watch-1.webp` | 1000x1000 webp | 1444.9 > 55.3 KB | Jaelynn Castillo | [person-holding-analog-watch-xfNeB1stZ_0](https://unsplash.com/photos/person-holding-analog-watch-xfNeB1stZ_0) | no |
| A-P10-2 | `minimal-leather-strap-watch-2.webp` | 1000x1000 webp | 1444.9 > 88.6 KB | Jaelynn Castillo | [person-holding-analog-watch-xfNeB1stZ_0](https://unsplash.com/photos/person-holding-analog-watch-xfNeB1stZ_0) | no |
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

## Backups (D4)

Originals are in `demo-assets/_archive/originals/` (git-ignored, outside Git) together with the 11 rejected downloads in `demo-assets/_archive/rejected/`. That folder exists only on the machine that ran the pipeline. **Recommended second location:** an encrypted external drive or a private cloud folder you control, copying `demo-assets/_archive/` whole; the SHA-256 values in the manifest let you verify a copy with `sha256sum`. Because the originals can be re-downloaded from each `source_url` and the files are free stock, losing them is an inconvenience, not a loss.
