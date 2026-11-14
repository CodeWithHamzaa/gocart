// M124 (ADR-054): the Media collection's generated sizes, the automatic framing and an admin crop, against a
// THROWAWAY LOCAL database (manual, not in CI: it needs PostgreSQL with the committed migrations applied).
//
//   createdb gocart_throwaway   # then, with DATABASE_URI pointing at it:
//   export DATABASE_URI=postgresql://<user>:<pw>@localhost:5432/gocart_throwaway PAYLOAD_SECRET=<any>
//   npx payload migrate && npm run test:media-sizes:db
//
// Refuses unless the database host is loopback, its name ends in _throwaway, no Blob token is set and
// NODE_ENV is not production. Uses a synthetic image, uploads it through the Local API (files go to the
// ./media volume) and deletes everything it created.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { getPayload } from 'payload'
import config from '../payload.config'

const problems: string[] = []
if (process.env.NODE_ENV?.trim().toLowerCase() === 'production') problems.push('NODE_ENV=production')
if (process.env.BLOB_READ_WRITE_TOKEN) problems.push('BLOB_READ_WRITE_TOKEN is set (this test would upload real Blob files)')
try {
  const url = new URL(process.env.DATABASE_URI ?? '')
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase().replace(/^\[|\]$/g, ''))) problems.push('DATABASE_URI host is not loopback')
  if (!/_throwaway$/.test(url.pathname.replace(/^\//, ''))) problems.push('the database name must end in _throwaway')
} catch {
  problems.push('DATABASE_URI is not set or not a URL')
}
if (problems.length > 0) {
  console.error('media-sizes.db-test: refusing to run:')
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}

const W = 2400
const H = 1600
/** A grey landscape with one vivid patch near the right edge: the only region "attention" can prefer. */
async function sample(): Promise<Buffer> {
  const patch = await sharp({ create: { width: 360, height: 360, channels: 3, background: { r: 230, g: 30, b: 60 } } }).png().toBuffer()
  return sharp({ create: { width: W, height: H, channels: 3, background: { r: 128, g: 128, b: 128 } } })
    .composite([{ input: patch, left: 1900, top: 620 }])
    .jpeg({ quality: 92 })
    .toBuffer()
}

/** Share of pixels that are clearly red (the patch) in an image buffer. */
async function redShare(buffer: Buffer): Promise<number> {
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true })
  let red = 0
  for (let i = 0; i < data.length; i += info.channels) if (data[i] > 180 && data[i + 1] < 90) red += 1
  return red / (info.width * info.height)
}

async function main() {
  const payload = await getPayload({ config })
  const created: (number | string)[] = []
  const staticDir = path.resolve(process.cwd(), 'media')
  try {
    const original = await sample()

    // 1. An untouched upload: every size exists, has the placement's exact dimensions, and is WebP.
    const doc = await payload.create({
      collection: 'media',
      data: { alt: 'M124 test photo' },
      file: { data: original, mimetype: 'image/jpeg', name: 'm124-test.jpg', size: original.length },
    })
    created.push(doc.id)
    const sizes = (doc as unknown as { sizes: Record<string, { url?: string; width?: number; height?: number; mimeType?: string; filename?: string }> }).sizes
    const expected: Record<string, [number, number]> = { product: [1000, 1000], category: [800, 600], hero: [1600, 1000] }
    for (const [name, [w, h]] of Object.entries(expected)) {
      assert.equal(sizes[name]?.width, w, `${name} width`)
      assert.equal(sizes[name]?.height, h, `${name} height`)
      assert.equal(sizes[name]?.mimeType, 'image/webp', `${name} is WebP`)
      assert.ok(sizes[name]?.url, `${name} has a url`)
    }
    console.log('ok: product, category and hero sizes exist with the exact dimensions, as WebP')

    // 2. Automatic framing: the product square keeps more of the vivid patch than a plain centre crop would.
    const product = await fs.readFile(path.join(staticDir, sizes.product.filename!))
    const centre = await sharp(original).resize({ width: 1000, height: 1000, fit: 'cover', position: 'centre' }).jpeg().toBuffer()
    const auto = await redShare(product)
    const base = await redShare(centre)
    assert.ok(auto > base, `attention framing should keep more of the subject than a centre crop (auto ${auto.toFixed(4)}, centre ${base.toFixed(4)})`)
    console.log(`ok: automatic framing keeps the subject (red share ${auto.toFixed(4)} vs ${base.toFixed(4)} for a centre crop)`)

    // 3. An admin crop (percent box around the patch) replaces the stored original and the sizes follow it.
    const cropped = await payload.create({
      collection: 'media',
      data: { alt: 'M124 test crop' },
      file: { data: original, mimetype: 'image/jpeg', name: 'm124-crop.jpg', size: original.length },
      req: { query: { uploadEdits: { crop: { x: 70, y: 30, width: 30, height: 45, unit: '%' }, widthInPixels: 720, heightInPixels: 720 } } } as never,
    })
    created.push(cropped.id)
    assert.equal(cropped.width, 720, 'crop width')
    assert.equal(cropped.height, 720, 'crop height')
    const croppedSizes = (cropped as unknown as { sizes: typeof sizes }).sizes
    // 720x720 is smaller than the 1000x1000 product size and no size may be enlarged, so Payload omits it.
    assert.ok(!croppedSizes.product?.url, 'a crop smaller than the size gets no variant (storefront falls back to the original)')
    console.log('ok: an admin crop replaces the stored original (720x720) and an image smaller than a size gets no variant for it')
    console.log('media-sizes.db-test: all checks passed')
  } finally {
    for (const id of created) await payload.delete({ collection: 'media', id }).catch(() => undefined)
  }
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
