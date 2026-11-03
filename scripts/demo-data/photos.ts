// M104-M106: provenance, framing and alt text for the demo photography (development-time data).
//
// This file is the tracked record of WHICH photo is used where. The photos themselves are never
// committed: originals live in the git-ignored demo-assets/_archive/originals/ and processed output
// in demo-assets/_processed/. scripts/process-demo-images.ts turns this spec into the files and
// fills docs/assets/MANIFEST.csv; scripts/seed-demo.ts reads the alt text from here.
//
// Licence facts below were read on 2026-11-01 from each photo's own Unsplash page through the
// WebFetch tool (the pages themselves answer scripts with a browser check, which is not bypassed),
// so author, date and licence line are as that tool reported them. Every photo is shown by
// Unsplash as "Free to use under the Unsplash License" and is not marked Unsplash+.

export const LICENCE = {
  name: 'Unsplash License',
  url: 'https://unsplash.com/license',
  checkedOn: '2026-11-01',
  retrievedOn: '2026-11-01',
} as const

export type Source = {
  /** Unsplash photo id (the end of the photo page URL). */
  id: string
  pageUrl: string
  author: string
  authorUrl: string
  /** Publish date shown on the page. */
  published: string
  /** images.unsplash.com photo id used for the download (CDN rendition, w=5000 max, JPEG q90). */
  cdn: string
  /** Honest note on what the photo is and any visible-branding review. */
  note: string
}

const S = (id: string, slug: string, author: string, handle: string, published: string, cdn: string, note: string): Source => ({
  id,
  pageUrl: `https://unsplash.com/photos/${slug}${id}`,
  author,
  authorUrl: `https://unsplash.com/@${handle}`,
  published,
  cdn,
  note,
})

export const SOURCES: Record<string, Source> = {
  headphonesCream: S('TpDhqQCWY0s', 'a-pair-of-headphones-floating-in-the-air-', 'Kamran Abdullayev', 'thekamranzadeh', '2025-01-19', 'photo-1737291937135-3a0fcb5e0c44', 'Cream and grey wireless headphones against a beige gradient. No logo visible at full size.'),
  headphonesBlack: S('pHqt1DsHCx0', 'black-headphones-on-white-table-', 'Milena Trifonova', 'milenatrifonova', '2020-09-14', 'photo-1600086827875-a63b01f1335c', 'Black on-ear headphones from above on white. The page description names a manufacturer; no logo or lettering is visible in the image.'),
  speakerBlack: S('VSYq9nS-fY0', 'selective-focus-photography-of-black-and-gray-portable-speaker-', 'Jonas Jacobsson', 'jonasjacobsson', '2017-10-13', 'photo-1507878566509-a0dbe19677a5', 'Black and grey portable speaker by a window. No logo visible.'),
  smartwatchRect: S('FPEBZJLD8Rs', 'a-watch-with-a-black-face-', 'pratik prasad', 'pratik19', '2022-08-18', 'photo-1660844817855-3ecc7ef21f12', 'Rectangular smart watch with a white silicone strap showing 07:20. Generic watch face, no brand.'),
  smartwatchRound: S('jRM_bQIb_80', 'a-close-up-of-a-smart-watch-on-a-table-', 'Al Amin Mir', 'alaminip', '2021-09-28', 'photo-1632794716789-42d9995fb5b6', 'Round smart watch on an office desk showing 06:42. Generic watch face, no brand.'),
  powerbankSlim: S('UP_RojtnvTU', 'white-and-blue-coated-wires-', 'Markus Winkler', 'markuswinkler', '2020-04-04', 'photo-1585995603413-eb35b5f4a50b', 'Slim silver power bank with a blue braided three-way cable on white. No logo visible.'),
  watchMinimal: S('xfNeB1stZ_0', 'person-holding-analog-watch-', 'Jaelynn Castillo', 'jaelynnalexis', '2018-04-24', 'photo-1524592094714-0f0654e20314', 'Minimal round watch with a plain white dial and taupe leather strap, held in a hand (no face or identifiable person).'),
  backpackCanvas: S('hPYnW6kql20', 'green-canvas-backpack-with-leather-straps-on-a-yellow-chair-', 'YF Chen', 'sangeren', '2026-08-06', 'photo-1786025083224-220e39cb1e22', 'Green canvas backpack with leather straps and buckles on a yellow chair. No logo visible.'),
  toteLeather: S('XwjrPFW7xw0', 'brown-leather-handbag-on-white-table-', 'Ugluk Potroshitel', 'uglug', '2021-06-26', 'photo-1624687943971-e86af76d57de', 'Tan leather shopper tote hanging on a cupboard door. The page says it is handmade leather. No logo visible.'),
  duffleSand: S('9XiN0r2NWSM', 'brown-duffel-bag-beside-white-and-brown-wooden-chair-', 'Erol Ahmed', 'erol', '2015-11-27', 'photo-1448582649076-3981753123b5', 'Sand-coloured leather-and-canvas duffel on a wooden floor beside a white chair. No logo visible.'),
  sunglassesGold: S('MivM1hirbUI', 'silver-framed-aviator-style-sunglasses-', 'Habib Dadkhah', 'habibdadkhah', '2020-05-16', 'photo-1589642380614-4a8c2147b857', 'Gold-tone pilot-style sunglasses with brown gradient lenses on a pale yellow backdrop. The page description names a luxury maker; no mark is visible at full size.'),
  sunglassesRound: S('1-nx1QR5dTE', 'gold-colored-framed-hippie-sunglasses-on-white-surface-', 'charlesdeluvio', 'charlesdeluvio', '2017-11-24', 'photo-1511499767150-a48a237f0083', 'Round gold-frame sunglasses with dark green lenses on white marble. The page names an eyewear label; no mark is visible at full size.'),
  lampCopper: S('VDPauwJ_sHo', 'gold-table-almp-', 'Sincerely Media', 'sincerelymedia', '2018-11-20', 'photo-1542728928-1413d1894ed1', 'Copper-finish lamp with a curved stem and a metal shade beside a white bed. No logo visible.'),
  lampCream: S('mNXTZu7AeGA', 'white-table-lamp-', 'Brina Blum', 'brina_blum', '2019-10-13', 'photo-1570974802254-4b0ad1a755f5', 'Cream vintage desk lamp with a flexible neck and a bell-shaped shade on a wooden desk. No logo visible.'),
  panBlack: S('Mv3JygH8eXQ', 'black-frying-pan-on-white-surface-', 'Cooker King', 'cookerking', '2020-06-14', 'photo-1592156328697-079f6ee0cfa5', 'Dark nonstick frying pan with a wooden-look handle on white. No logo visible.'),
  jarGlass: S('SHSSaB4BLgc', 'clear-glass-jar-with-white-lid-', 'Darío Méndez', 'dariomen', '2020-07-15', 'photo-1594813591867-02e797aa4581', 'A single clear glass jar with a metal lid. Shows one jar, not a set.'),
  tubesPeach: S('Xp0bTCLD07k', 'a-tube-of-cream-sitting-on-top-of-a-table-', 'Point Normal', 'normals', '2024-04-03', 'photo-1712168044214-f5a272c23a5b', 'Two unbranded white cosmetic tubes on a peach block. No aloe cue in the image.'),
  tubeWet: S('GdsFTnarsog', 'white-tube-on-glass-table-', 'Birgith Roosipuu', 'msbirgith', '2021-03-26', 'photo-1616750819456-5cdee9b85d22', 'Unbranded white tube on a wet glass surface with water droplets. No foam shown.'),
  perfumeAmber: S('nka_sIQpKEU', 'perfume-bottle-and-cosmetic-jars-', 'Birgith Roosipuu', 'msbirgith', '2021-06-02', 'photo-1622618991746-fe6004db3a47', 'Glass perfume bottle in warm amber light with two small cosmetic jars. No label or logo visible.'),
  speakerBeige: S('EXiDx2JcFdE', 'a-close-up-of-a-speaker-on-a-white-surface-', 'Berke Can', 'berkaroon', '2022-04-13', 'photo-1649875951986-917ce191719f', 'Beige cylindrical portable speaker with a honeycomb grille on white. A maker name is printed on the speaker (acceptable for demo content, owner decision 2026-11-02).'),
  powerbankWhite: S('7JbgHNq4h4k', 'white-power-bank-with-three-charging-cables-', 'Andrey Matveev', 'zelebb', '2025-10-17', 'photo-1760708825913-65a50b3dc39b', 'Large white power bank with a black three-way charging cable on grey concrete. A small maker mark is embossed on the bank (acceptable for demo content, owner decision 2026-11-02).'),
  watchSteel: S('QQ_nm-OFlBs', 'a-watch-sitting-on-top-of-a-white-table-', 'Tareq Hasan', 'tareq_hasan', '2023-09-13', 'photo-1694598152256-a346298ae0b5', 'Steel-bracelet analog watch with a white dial and black bezel on white. A maker name is printed on the dial (acceptable for demo content, owner decision 2026-11-02).'),
  watchChrono: S('3XbFQkhWKIA', 'a-close-up-of-a-luxury-chronograph-wristwatch-', 'Ryan Chan', 'runie', '2026-03-17', 'photo-1773755060442-6d128b70dd20', 'Steel-bracelet chronograph with a blue dial and rose-gold bezel on white. A maker name is printed on the dial (acceptable for demo content, owner decision 2026-11-02).'),
  perfumeClear: S('j1vg92xdoX4', 'a-clear-glass-perfume-bottle-with-black-cap-', 'Kier in Sight Archives', 'kierinsightarchives', '2025-10-20', 'photo-1760920250029-36af9369a0bb', 'Clear glass bottle with a black cap on white fur. No label or logo, no citrus cue, and it does not show a spray nozzle.'),
}

export type Kind = 'product' | 'category' | 'promo' | 'og'

/** Centre of the crop as a fraction of the image, and zoom = box height as a fraction of the largest box of that aspect that fits. */
export type Crop = { cx: number; cy: number; zoom: number }

export type Asset = {
  /** Manifest asset_id. */
  id: string
  kind: Kind
  /** Output filename inside demo-assets/_processed/. Seed filename convention (ADR-049 / plan 5.3). */
  out: string
  /** Key into SOURCES. */
  src: string
  crop: Crop
  /** `contain` keeps the whole photo and pads with the photo's own edge colour (tall subjects). */
  mode?: 'crop' | 'contain'
  alt: string
  /** Why this image is only a close match (D3), shown in the manifest. */
  mismatch?: string
  /** Free-form note appended to the manifest row. */
  note?: string
}

type P = { n: number; name: string; slug: string; src: string; c1: Crop; c2: Crop; alt1: string; alt2: string; mode1?: 'crop' | 'contain'; mismatch?: string }

const products: P[] = [
  { n: 1, name: 'Aero Wave Wireless Headphones', slug: 'aero-wave-wireless-headphones', src: 'headphonesBlack', c1: { cx: 0.5, cy: 0.47, zoom: 0.9 }, c2: { cx: 0.47, cy: 0.72, zoom: 0.5 }, alt1: 'Black wireless headphones with a padded headband, seen from above on a white surface', alt2: 'Close-up of the black leather-look ear cushions of the headphones', mismatch: 'On-ear, all black, no coloured inner ring (copy changed)' },
  { n: 2, name: 'Studio Lite Over-Ear Headphones', slug: 'studio-lite-over-ear-headphones', src: 'headphonesCream', c1: { cx: 0.48, cy: 0.55, zoom: 0.8 }, c2: { cx: 0.43, cy: 0.57, zoom: 0.5 }, alt1: 'Cream and grey headphones with a padded headband, floating against a soft beige background', alt2: 'Close-up of the cream ear cushion and grey ear cup of the headphones', mismatch: 'Cream and grey, on-ear style; copy no longer says over-ear in the description' },
  { n: 3, name: 'Capsule Portable Bluetooth Speaker', slug: 'capsule-portable-bluetooth-speaker', src: 'speakerBlack', c1: { cx: 0.5, cy: 0.63, zoom: 0.95 }, c2: { cx: 0.5, cy: 0.46, zoom: 0.4 }, alt1: 'Compact black and grey portable Bluetooth speaker with a metal grille, standing on a window ledge', alt2: 'Close-up of the speaker grille and top edge' },
  { n: 5, name: 'Pulse Active Smart Watch', slug: 'pulse-active-smart-watch', src: 'smartwatchRect', c1: { cx: 0.5, cy: 0.52, zoom: 0.75 }, c2: { cx: 0.5, cy: 0.47, zoom: 0.4 }, alt1: 'Smart watch with a rectangular screen showing the time and a white silicone strap', alt2: 'Close-up of the smart watch screen showing 07:20' },
  { n: 6, name: 'Orbit Slim Smart Watch', slug: 'orbit-slim-smart-watch', src: 'smartwatchRound', c1: { cx: 0.57, cy: 0.6, zoom: 0.65 }, c2: { cx: 0.57, cy: 0.55, zoom: 0.33 }, alt1: 'Round smart watch with a dark strap resting on a desk and showing the time', alt2: 'Close-up of the round smart watch face', mismatch: 'Not a slim case; copy no longer says slim' },
  { n: 7, name: 'Volt Compact Power Bank', slug: 'volt-compact-power-bank', src: 'powerbankSlim', c1: { cx: 0.35, cy: 0.5, zoom: 1 }, c2: { cx: 0.58, cy: 0.3, zoom: 0.5 }, alt1: 'Slim silver power bank with a blue braided charging cable plugged in, on a white surface', alt2: 'Close-up of the blue braided cable with its three connector ends', mismatch: 'No charge-level indicator visible (copy changed)' },
  { n: 10, name: 'Minimal Leather Strap Watch', slug: 'minimal-leather-strap-watch', src: 'watchMinimal', c1: { cx: 0.5, cy: 0.5, zoom: 0.85 }, c2: { cx: 0.5, cy: 0.42, zoom: 0.4 }, alt1: 'Minimal round watch with a plain white dial and a taupe leather strap, held in a hand', alt2: 'Close-up of the plain white watch dial with thin hands and no numbers' },
  { n: 12, name: 'Metro Canvas Backpack', slug: 'metro-canvas-backpack', src: 'backpackCanvas', c1: { cx: 0.5, cy: 0.38, zoom: 0.9 }, c2: { cx: 0.55, cy: 0.2, zoom: 0.45 }, alt1: 'Green canvas backpack with brown leather straps and buckles resting on a yellow chair', alt2: 'Close-up of the leather strap and buckle on the canvas backpack', mismatch: 'Partly cropped view, leather straps instead of a front flap (copy changed)' },
  { n: 13, name: 'Everyday Faux Leather Tote', slug: 'everyday-faux-leather-tote', src: 'toteLeather', c1: { cx: 0.5, cy: 0.5, zoom: 1 }, c2: { cx: 0.5, cy: 0.2, zoom: 0.5 }, mode1: 'contain', alt1: 'Tan leather-look tote bag with two handles hanging on a cupboard door', alt2: 'Close-up of the stitched tote handles and rivets', mismatch: 'Photo shows a leather tote without a front flap (copy changed; the photographer describes real leather)' },
  { n: 14, name: 'Weekender Duffle Bag', slug: 'weekender-duffle-bag', src: 'duffleSand', c1: { cx: 0.35, cy: 0.62, zoom: 1 }, c2: { cx: 0.3, cy: 0.65, zoom: 0.5 }, alt1: 'Sand-coloured soft duffle bag on a wooden floor beside a white chair', alt2: 'Close-up of the duffle bag fabric and carry handles' },
  { n: 15, name: 'Pilot Frame Sunglasses', slug: 'pilot-frame-sunglasses', src: 'sunglassesGold', c1: { cx: 0.52, cy: 0.58, zoom: 0.95 }, c2: { cx: 0.36, cy: 0.6, zoom: 0.45 }, alt1: 'Pilot-style sunglasses with a thin gold-tone frame and brown gradient lenses', alt2: 'Close-up of the left lens, nose bridge and gold-tone frame', mismatch: 'Gold-tone frame with brown gradient lenses (copy changed)' },
  { n: 16, name: 'Round Frame Sunglasses', slug: 'round-frame-sunglasses', src: 'sunglassesRound', c1: { cx: 0.52, cy: 0.53, zoom: 0.85 }, c2: { cx: 0.36, cy: 0.52, zoom: 0.5 }, alt1: 'Round sunglasses with a thin gold-tone frame and dark green lenses on a white marble surface', alt2: 'Close-up of one dark round lens and the thin frame arm' },
  { n: 17, name: 'Arc Table Lamp', slug: 'arc-table-lamp', src: 'lampCopper', c1: { cx: 0.66, cy: 0.6, zoom: 0.95 }, c2: { cx: 0.8, cy: 0.33, zoom: 0.45 }, alt1: 'Table lamp with a curved stem and a copper-finish metal shade beside a white bed', alt2: 'Close-up of the copper lamp shade and top of the curved stem', mismatch: 'Metal shade rather than fabric (copy changed)' },
  { n: 18, name: 'Dome Desk Lamp', slug: 'dome-desk-lamp', src: 'lampCream', c1: { cx: 0.45, cy: 0.57, zoom: 0.95 }, c2: { cx: 0.52, cy: 0.3, zoom: 0.5 }, alt1: 'Cream desk lamp with a flexible neck and a rounded shade on a wooden desk', alt2: 'Close-up of the cream lamp shade and bendable neck', mismatch: 'Flexible neck and bell-shaped shade, not a dome on a round base (copy changed)' },
  { n: 19, name: 'Nonstick Frying Pan', slug: 'nonstick-frying-pan', src: 'panBlack', c1: { cx: 0.5, cy: 0.5, zoom: 1 }, c2: { cx: 0.78, cy: 0.38, zoom: 0.5 }, alt1: 'Dark nonstick frying pan with a long wooden-look handle on a white background', alt2: 'Close-up of the frying pan handle and rim', mismatch: 'Handle is wood-look rather than dark (copy changed)' },
  { n: 20, name: 'Glass Storage Jar Set', slug: 'glass-storage-jar-set', src: 'jarGlass', c1: { cx: 0.51, cy: 0.51, zoom: 0.95 }, c2: { cx: 0.5, cy: 0.22, zoom: 0.45 }, alt1: 'Clear glass storage jar with a metal screw lid on a bright background', alt2: 'Close-up of the metal lid and glass rim of the jar', mismatch: 'Photo shows one empty jar, not a set filled with pulses (copy changed)' },
  { n: 21, name: 'Aloe Hydrating Gel Cream', slug: 'aloe-hydrating-gel-cream', src: 'tubesPeach', c1: { cx: 0.53, cy: 0.47, zoom: 0.95 }, c2: { cx: 0.5, cy: 0.22, zoom: 0.5 }, alt1: 'Two plain white cosmetic tubes on a peach-coloured block', alt2: 'Close-up of the cap and shoulder of the white tube', mismatch: 'Generic white tubes; no aloe cue in the photo' },
  { n: 22, name: 'Gentle Foaming Face Wash', slug: 'gentle-foaming-face-wash', src: 'tubeWet', c1: { cx: 0.5, cy: 0.6, zoom: 1 }, c2: { cx: 0.6, cy: 0.48, zoom: 0.45 }, alt1: 'Plain white tube lying on a wet glass surface covered in water droplets', alt2: 'Close-up of the white tube and water droplets', mismatch: 'Generic tube; no foam shown' },
  { n: 23, name: 'Amber Oud Eau de Parfum', slug: 'amber-oud-eau-de-parfum', src: 'perfumeAmber', c1: { cx: 0.38, cy: 0.5, zoom: 0.65 }, c2: { cx: 0.4, cy: 0.4, zoom: 0.5 }, alt1: 'Glass perfume bottle lit in warm amber light with long soft shadows', alt2: 'Close-up of the glass perfume bottle cap and shoulder in warm golden light' },
  { n: 24, name: 'Citrus Mist Body Spray', slug: 'citrus-mist-body-spray', src: 'perfumeClear', c1: { cx: 0.6, cy: 0.66, zoom: 0.8 }, c2: { cx: 0.62, cy: 0.55, zoom: 0.35 }, alt1: 'Clear glass bottle with a black cap standing on white fur in soft grey light', alt2: 'Close-up of the black bottle cap and clear glass', mismatch: 'No citrus cue and no visible spray nozzle (copy changed)' },
  { n: 4, name: 'Cylinder Mini Speaker', slug: 'cylinder-mini-speaker', src: 'speakerBeige', c1: { cx: 0.5, cy: 0.48, zoom: 1 }, c2: { cx: 0.5, cy: 0.35, zoom: 0.45 }, alt1: 'Small beige cylindrical Bluetooth speaker with a honeycomb grille on a white background', alt2: 'Close-up of the speaker honeycomb grille from the top' },
  { n: 8, name: 'Volt Max Power Bank', slug: 'volt-max-power-bank', src: 'powerbankWhite', c1: { cx: 0.4, cy: 0.44, zoom: 0.7 }, c2: { cx: 0.42, cy: 0.62, zoom: 0.45 }, alt1: 'Large white power bank with a black three-way charging cable lying on grey concrete', alt2: 'Close-up of the three charging connectors of the cable' },
  { n: 9, name: 'Classic Steel Analog Watch', slug: 'classic-steel-analog-watch', src: 'watchSteel', c1: { cx: 0.5, cy: 0.52, zoom: 0.62 }, c2: { cx: 0.5, cy: 0.5, zoom: 0.4 }, alt1: 'Steel analog wrist watch with a white dial, black bezel and metal bracelet on a white surface', alt2: 'Close-up of the white watch dial with Roman numerals and sub-dials' },
  { n: 11, name: 'Chrono Sport Wrist Watch', slug: 'chrono-sport-wrist-watch', src: 'watchChrono', c1: { cx: 0.5, cy: 0.5, zoom: 1 }, c2: { cx: 0.5, cy: 0.42, zoom: 0.4 }, alt1: 'Steel chronograph wrist watch with a blue dial and rose-gold bezel on a white background', alt2: 'Close-up of the blue chronograph dial with three white sub-dials' },
]

const pid = (n: number) => `A-P${String(n).padStart(2, '0')}`

const productAssets: Asset[] = products.flatMap((p) => [
  { id: `${pid(p.n)}-1`, kind: 'product' as const, out: `${p.slug}-1.webp`, src: p.src, crop: p.c1, mode: p.mode1, alt: p.alt1, mismatch: p.mismatch },
  { id: `${pid(p.n)}-2`, kind: 'product' as const, out: `${p.slug}-2.webp`, src: p.src, crop: p.c2, alt: p.alt2, mismatch: p.mismatch },
])

const categories: Array<{ n: number; slug: string; src: string; crop: Crop; alt: string }> = [
  { n: 1, slug: 'headphones', src: 'headphonesCream', crop: { cx: 0.5, cy: 0.55, zoom: 0.9 }, alt: 'Headphones floating against a soft beige background' },
  { n: 2, slug: 'speakers', src: 'speakerBlack', crop: { cx: 0.5, cy: 0.63, zoom: 0.95 }, alt: 'Portable Bluetooth speaker on a bright window ledge' },
  { n: 3, slug: 'power-banks', src: 'powerbankSlim', crop: { cx: 0.4, cy: 0.5, zoom: 1 }, alt: 'Slim power bank with a braided charging cable on white' },
  { n: 4, slug: 'watches', src: 'watchMinimal', crop: { cx: 0.5, cy: 0.5, zoom: 1 }, alt: 'Minimal wrist watch with a leather strap held in a hand' },
  { n: 5, slug: 'bags', src: 'duffleSand', crop: { cx: 0.38, cy: 0.6, zoom: 1 }, alt: 'Soft duffle bag on a wooden floor beside a white chair' },
  { n: 6, slug: 'sunglasses', src: 'sunglassesRound', crop: { cx: 0.52, cy: 0.53, zoom: 1 }, alt: 'Round sunglasses on a white marble surface' },
  { n: 7, slug: 'lamps', src: 'lampCream', crop: { cx: 0.45, cy: 0.55, zoom: 1 }, alt: 'Cream desk lamp on a wooden desk' },
  { n: 8, slug: 'kitchen', src: 'panBlack', crop: { cx: 0.5, cy: 0.5, zoom: 1 }, alt: 'Nonstick frying pan on a white background' },
  { n: 9, slug: 'skincare', src: 'tubesPeach', crop: { cx: 0.5, cy: 0.45, zoom: 1 }, alt: 'White skincare tubes on a peach block' },
  { n: 10, slug: 'fragrances', src: 'perfumeAmber', crop: { cx: 0.45, cy: 0.5, zoom: 1 }, alt: 'Perfume bottle in warm golden light' },
]

const categoryAssets: Asset[] = categories.map((c) => ({
  id: `A-C${String(c.n).padStart(2, '0')}`,
  kind: 'category' as const,
  out: `category-${c.slug}.webp`,
  src: c.src,
  crop: c.crop,
  alt: c.alt,
}))

const extraAssets: Asset[] = [
  { id: 'A-O01', kind: 'og', out: 'demo-og-default.jpg', src: 'headphonesCream', crop: { cx: 0.5, cy: 0.5, zoom: 1 }, alt: 'Mirza storefront share image: headphones on a soft beige background', note: 'NOT USED by the storefront (M107): each page shares its own photo through shareImages() in lib/seo.ts, which needs no committed file or schema field. Kept as an unused extra.' },
  { id: 'A-R01', kind: 'promo', out: 'demo-promo-1.webp', src: 'headphonesCream', crop: { cx: 0.48, cy: 0.55, zoom: 0.6 }, alt: 'Cream and grey headphones' },
  { id: 'A-R02', kind: 'promo', out: 'demo-promo-2.webp', src: 'lampCream', crop: { cx: 0.45, cy: 0.57, zoom: 0.7 }, alt: 'Cream desk lamp' },
]

export const ASSETS: Asset[] = [...productAssets, ...categoryAssets, ...extraAssets]

/**
 * Products with no acceptable photo (they keep generated artwork). Empty since 2026-11-02, when the
 * owner accepted visible brand names in demo photos and the last four products were sourced.
 * Add { n, slug, reason } here if a product ever loses its photo again.
 */
export const UNSOURCED_PRODUCTS: ReadonlyArray<{ n: number; slug: string; reason: string }> = []

/** Output budgets (docs/VISUAL_ASSETS_PLAN.md section 7). The optimizer is off, so one file serves every placement. */
export const BUDGETS = {
  product: { width: 1000, height: 1000, format: 'webp', targetBytes: 120_000, hardBytes: 150_000 },
  category: { width: 800, height: 600, format: 'webp', targetBytes: 70_000, hardBytes: 90_000 },
  promo: { width: 400, height: 400, format: 'webp', targetBytes: 40_000, hardBytes: 50_000 },
  og: { width: 1200, height: 630, format: 'jpeg', targetBytes: 200_000, hardBytes: 250_000 },
} as const

/** Lowest quality the pipeline will use. A file that still misses its budget at this floor fails instead of degrading further. */
export const QUALITY_FLOOR = 60
export const QUALITY_START = 82

/** Alt text for a processed filename, or undefined when the file is not a pipeline asset. */
export function altForFilename(filename: string): string | undefined {
  return ASSETS.find((a) => a.out === filename)?.alt
}
