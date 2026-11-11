// M105/M106: the demo-image pipeline rules and the integrity of the photo spec and manifest.
// No database, no network, no real photos needed (synthetic images are built in memory):
// `npm run test:demo-images`.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { assertNoUpscale, cropBox, edgeColour, encodeToBudget, parseCsv, renderAsset, serializeCsv, validateOutput } from './demo-images-core'
import { ASSETS, BUDGETS, SOURCES, UNSOURCED_PRODUCTS, altForFilename } from './demo-data/photos'
import { PRODUCTS, CATEGORIES } from './demo-data/catalogue'

async function main() {
  // cropBox: centred, clamped to the image, right aspect, never wider or taller than the image.
  assert.deepEqual(cropBox(4000, 2000, 1, { cx: 0.5, cy: 0.5, zoom: 1 }), { left: 1000, top: 0, width: 2000, height: 2000 })
  assert.deepEqual(cropBox(4000, 2000, 1, { cx: 0, cy: 0, zoom: 0.5 }), { left: 0, top: 0, width: 1000, height: 1000 }, 'clamped to the top-left corner')
  assert.deepEqual(cropBox(4000, 2000, 1, { cx: 1, cy: 1, zoom: 0.5 }), { left: 3000, top: 1000, width: 1000, height: 1000 }, 'clamped to the bottom-right corner')
  // Regression: a square 3558px source at 4:3 and zoom 1 once produced a box 1px wider than the image.
  const edge = cropBox(3558, 3558, 4 / 3, { cx: 0.5, cy: 0.5, zoom: 1 })
  assert.ok(edge.left >= 0 && edge.top >= 0 && edge.left + edge.width <= 3558 && edge.top + edge.height <= 3558, 'box stays inside the image')
  assert.throws(() => cropBox(100, 100, 1, { cx: 0.5, cy: 0.5, zoom: 0 }), /zoom/)
  assert.throws(() => cropBox(100, 100, 1, { cx: 0.5, cy: 0.5, zoom: 1.5 }), /zoom/)

  // Never enlarge a source.
  assert.doesNotThrow(() => assertNoUpscale({ left: 0, top: 0, width: 1000, height: 1000 }, BUDGETS.product, 'ok'))
  assert.throws(() => assertNoUpscale({ left: 0, top: 0, width: 999, height: 1200 }, BUDGETS.product, 'small'), /refusing to upscale/)

  // encodeToBudget: highest quality that fits; the floor result is accepted only within the hard cap.
  const tried: number[] = []
  const fits = await encodeToBudget(async (q) => {
    tried.push(q)
    return Buffer.alloc(q >= 78 ? 130_000 : 100_000)
  }, BUDGETS.product)
  assert.equal(fits.quality, 74, 'steps down 82, 78, 74 until under 120 KB')
  assert.equal(fits.overTarget, false)
  const capped = await encodeToBudget(async () => Buffer.alloc(140_000), BUDGETS.product)
  assert.equal(capped.overTarget, true, 'over target but within the hard cap is accepted and flagged')
  assert.equal(capped.quality, 60, 'tried down to the floor')
  await assert.rejects(encodeToBudget(async () => Buffer.alloc(160_000), BUDGETS.product), /hard cap/)

  // A realistic synthetic photo, carrying EXIF and an ICC profile, comes out clean and exactly sized.
  const photo = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: '#d8c9b5' } })
    .composite([{ input: Buffer.from('<svg width="2400" height="1800"><circle cx="1200" cy="900" r="500" fill="#222"/></svg>') }])
    .jpeg({ quality: 90 })
    .withMetadata({ exif: { IFD0: { Copyright: 'someone', Artist: 'someone' } } })
    .toBuffer()
  const input = await sharp(photo).metadata()
  assert.ok(input.exif, 'the test input really carries EXIF')
  const product = await renderAsset(photo, 'product', { cx: 0.5, cy: 0.5, zoom: 1 }, 'crop', 'synthetic')
  const productCheck = await validateOutput(product.data, 'aero-wave-wireless-headphones-1.webp', 'product', 'A descriptive alt text')
  assert.deepEqual(productCheck.problems, [])
  assert.equal(productCheck.width, 1000)
  assert.equal(productCheck.height, 1000)
  assert.ok(productCheck.bytes <= BUDGETS.product.hardBytes)
  const out = await sharp(product.data).metadata()
  assert.equal(out.format, 'webp')
  assert.ok(!out.exif && !out.icc && !out.xmp && !out.iptc, 'no metadata survives')

  // Category (4:3) and Open Graph (JPEG) outputs.
  const category = await renderAsset(photo, 'category', { cx: 0.5, cy: 0.5, zoom: 1 }, 'crop', 'synthetic')
  assert.equal((await validateOutput(category.data, 'category-lamps.webp', 'category', 'Lamps on a table')).ok, true)
  const og = await renderAsset(photo, 'og', { cx: 0.5, cy: 0.5, zoom: 1 }, 'crop', 'synthetic')
  assert.equal((await validateOutput(og.data, 'demo-og-default.jpg', 'og', 'Share image for the store')).ok, true)
  assert.equal((await sharp(og.data).metadata()).format, 'jpeg')

  // contain pads a tall source instead of cropping it.
  const tall = await sharp({ create: { width: 800, height: 1600, channels: 3, background: '#e9dfd2' } }).jpeg().toBuffer()
  const contained = await renderAsset(tall, 'product', { cx: 0.5, cy: 0.5, zoom: 1 }, 'contain', 'tall')
  assert.equal((await validateOutput(contained.data, 'everyday-faux-leather-tote-1.webp', 'product', 'A tall bag on a door')).ok, true)

  // edgeColour measures the corners, not the whole image: a white backdrop with a big red subject reads as white.
  const redOnWhite = await sharp({ create: { width: 1000, height: 1000, channels: 3, background: '#ffffff' } })
    .composite([{ input: await sharp({ create: { width: 800, height: 800, channels: 3, background: '#cc0000' } }).png().toBuffer(), left: 100, top: 100 }])
    .png()
    .toBuffer()
  const corner = await edgeColour(redOnWhite, 1000, 1000)
  assert.ok(corner.r > 245 && corner.g > 245 && corner.b > 245, `corner colour is the backdrop, got ${JSON.stringify(corner)}`)

  // contain with pad 'copy' continues the photo's own edge pixels, so a gradient backdrop shows no seam.
  const gradient = Buffer.alloc(800 * 1600 * 3)
  for (let y = 0; y < 1600; y++) for (let x = 0; x < 800; x++) gradient.fill(Math.round(240 - y * 0.1), (y * 800 + x) * 3, (y * 800 + x) * 3 + 3)
  const gradientPhoto = await sharp(gradient, { raw: { width: 800, height: 1600, channels: 3 } }).png().toBuffer()
  const copied = await renderAsset(gradientPhoto, 'product', { cx: 0.5, cy: 0.5, zoom: 1 }, 'contain', 'gradient', 'copy')
  const copiedRaw = await sharp(copied.data).raw().toBuffer({ resolveWithObject: true })
  assert.equal(copiedRaw.info.width, 1000)
  assert.equal(copiedRaw.info.height, 1000)
  const red = (x: number, y: number) => copiedRaw.data[(y * 1000 + x) * copiedRaw.info.channels]
  assert.ok(red(5, 100) - red(5, 900) > 50, 'the gradient continues into the padded side (a flat fill would be equal)')
  assert.ok(Math.abs(red(5, 500) - red(400, 500)) < 8, 'the padded side meets the photo without a seam')

  // Bad inputs are rejected, not degraded.
  const small = await sharp({ create: { width: 900, height: 900, channels: 3, background: '#888' } }).jpeg().toBuffer()
  await assert.rejects(renderAsset(small, 'product', { cx: 0.5, cy: 0.5, zoom: 1 }, 'crop', 'small'), /refusing to upscale/)
  const noise = Buffer.alloc(1400 * 1400 * 3)
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) >>> 24
  const noisy = await sharp(noise, { raw: { width: 1400, height: 1400, channels: 3 } }).png().toBuffer()
  await assert.rejects(renderAsset(noisy, 'product', { cx: 0.5, cy: 0.5, zoom: 1 }, 'crop', 'noise'), /hard cap/)
  await assert.rejects(renderAsset(Buffer.from('not an image'), 'product', { cx: 0.5, cy: 0.5, zoom: 1 }, 'crop', 'junk'))

  // validateOutput catches wrong format, wrong size, leftover metadata, bad names and missing alt.
  const png = await sharp({ create: { width: 1000, height: 1000, channels: 3, background: '#fff' } }).png().toBuffer()
  assert.match((await validateOutput(png, 'aero-wave-wireless-headphones-1.webp', 'product', 'Some alt text')).problems.join(), /format png/)
  const wrongSize = await sharp({ create: { width: 640, height: 640, channels: 3, background: '#fff' } }).webp().toBuffer()
  assert.match((await validateOutput(wrongSize, 'aero-wave-wireless-headphones-1.webp', 'product', 'Some alt text')).problems.join(), /size 640x640/)
  const withMeta = await sharp({ create: { width: 1000, height: 1000, channels: 3, background: '#fff' } })
    .webp()
    .withMetadata({ exif: { IFD0: { Copyright: 'someone' } } })
    .toBuffer()
  assert.match((await validateOutput(withMeta, 'aero-wave-wireless-headphones-1.webp', 'product', 'Some alt text')).problems.join(), /metadata/)
  assert.match((await validateOutput(product.data, 'Aero Wave.webp', 'product', 'Some alt text')).problems.join(), /naming convention/)
  assert.match((await validateOutput(product.data, 'aero-wave-wireless-headphones-3.webp', 'product', 'Some alt text')).problems.join(), /naming convention/)
  assert.match((await validateOutput(product.data, 'aero-wave-wireless-headphones-1.webp', 'product', '')).problems.join(), /alt/)
  assert.equal((await validateOutput(Buffer.from('junk'), 'x-1.webp', 'product', 'alt text here')).ok, false)

  // CSV: commas, quotes and newlines inside quoted fields survive a round trip.
  const rows = [['a', 'b,c', 'say "hi"', 'two\nlines', '']]
  assert.deepEqual(parseCsv(serializeCsv(rows)), rows)

  // Spec integrity: unique ids and files, every source exists, every asset has alt text and a valid crop.
  assert.equal(new Set(ASSETS.map((a) => a.id)).size, ASSETS.length, 'asset ids are unique')
  assert.equal(new Set(ASSETS.map((a) => a.out)).size, ASSETS.length, 'output files are unique')
  for (const a of ASSETS) {
    assert.ok(SOURCES[a.src], `${a.id} points at an unknown source ${a.src}`)
    assert.ok(a.alt.trim().length >= 8, `${a.id} needs alt text`)
    assert.equal(altForFilename(a.out), a.alt)
    assert.ok(a.crop.zoom > 0 && a.crop.zoom <= 1 && a.crop.cx >= 0 && a.crop.cx <= 1 && a.crop.cy >= 0 && a.crop.cy <= 1, `${a.id} crop out of range`)
  }
  // The seed falls back to finding media by alt text, so alt text must be unique per file.
  assert.equal(new Set(ASSETS.map((a) => a.alt)).size, ASSETS.length, 'alt texts are unique')
  for (const s of Object.values(SOURCES)) {
    assert.ok(s.pageUrl.startsWith('https://unsplash.com/photos/') && s.pageUrl.endsWith(s.id), `${s.id} page URL`)
    assert.ok(s.authorUrl.startsWith('https://unsplash.com/@') && s.author.length > 0, `${s.id} author`)
  }

  // Every demo product is either photographed (2 images) or listed as unsourced; every category has a photo.
  const unsourced = new Set<string>(UNSOURCED_PRODUCTS.map((u) => u.slug))
  for (const p of PRODUCTS) {
    const files = ASSETS.filter((a) => a.kind === 'product' && a.out.startsWith(`${p.slug}-`)).map((a) => a.out)
    if (unsourced.has(p.slug)) assert.equal(files.length, 0, `${p.slug} is listed unsourced but has assets`)
    else assert.deepEqual(files.sort(), [`${p.slug}-1.webp`, `${p.slug}-2.webp`], `${p.slug} needs exactly two photos`)
  }
  for (const c of CATEGORIES) assert.ok(ASSETS.some((a) => a.out === `category-${c.slug}.webp`), `${c.slug} needs a category photo`)

  // Manifest: one row per slot; every processed row carries full provenance and a licence check.
  const manifest = parseCsv(fs.readFileSync(path.join(process.cwd(), 'docs', 'assets', 'MANIFEST.csv'), 'utf8')).filter((r) => r.length > 1)
  const [header, ...body] = manifest
  const rowsById = new Map(body.map((cells) => [cells[header.indexOf('asset_id')], Object.fromEntries(header.map((h, i) => [h, cells[i]]))]))
  assert.equal(rowsById.size, 61, 'the manifest keeps all 61 planned slots')
  for (const a of ASSETS) {
    const row = rowsById.get(a.id)
    assert.ok(row, `manifest row ${a.id}`)
    if (row.status === 'needed') continue // not processed yet on this checkout
    for (const field of ['source_url', 'author', 'licence', 'licence_url', 'licence_checked_on', 'original_sha256', 'processed_sha256', 'alt_text']) {
      assert.ok(row[field], `${a.id}: manifest field ${field} is empty`)
    }
    assert.match(row.original_sha256, /^[0-9a-f]{64}$/)
    assert.match(row.processed_sha256, /^[0-9a-f]{64}$/)
    assert.equal(row.processed_filename, a.out)
  }

  // Every source in the spec is used by an asset (an unused one has no manifest row and breaks fetch:demo-originals).
  for (const key of Object.keys(SOURCES)) assert.ok(ASSETS.some((a) => a.src === key), `source ${key} is unused`)
  // Gallery image 2 may come from another photograph (src2); the two images then differ in source.
  const other = ASSETS.filter((a) => a.kind === 'product' && a.id.endsWith('-2') && a.src !== ASSETS.find((b) => b.id === a.id.replace(/-2$/, '-1'))?.src)
  assert.ok(other.length >= 1, 'at least one product uses a different photograph for gallery image 2')

  console.log('demo-images: all checks passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
