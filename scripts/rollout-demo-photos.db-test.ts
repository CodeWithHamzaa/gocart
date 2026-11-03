// M108: runRollout() against a THROWAWAY LOCAL database (manual, not in CI: it needs PostgreSQL with the
// committed migrations applied and the generated-art demo seed run, and it DELETES products and
// categories). Simulates a test site that was seeded before the photos existed.
//
//   export DATABASE_URI=postgresql://<user>:<pw>@localhost:5432/<throwaway db> PAYLOAD_SECRET=<any>
//   npx payload migrate && npm run seed:demo
//   ROLLOUT_DB_TEST_CONFIRM=wipe-local-demo-data npm run test:rollout-demo-photos:db
//
// Refuses unless the host is loopback/localhost and the confirmation variable is set. Uses synthetic
// photos (valid WebP of distinct sizes), never real ones, and never touches Neon.
const DB_URI = process.env.DATABASE_URI ?? ''
const DB_HOST = (() => {
  try {
    return new URL(DB_URI).hostname.replace(/^\[|\]$/g, '')
  } catch {
    return ''
  }
})()
if (!['localhost', '127.0.0.1', '::1'].includes(DB_HOST) || process.env.ROLLOUT_DB_TEST_CONFIRM !== 'wipe-local-demo-data') {
  console.error('rollout-demo-photos.db-test: refusing: needs a localhost DATABASE_URI and ROLLOUT_DB_TEST_CONFIRM=wipe-local-demo-data (see the header).')
  process.exit(1)
}
process.env.PAYLOAD_MIGRATING = 'true'

import assert from 'node:assert/strict'
import sharp from 'sharp'
import { getPayload } from 'payload'
import config from '../payload.config'
import { runRollout } from './rollout-demo-photos-run'
import { rolloutTargets } from './rollout-demo-photos-core'
import { ASSETS } from './demo-data/photos'
import type { Loaded } from './rollout-demo-photos-run'

async function main() {
  const payload = await getPayload({ config })
  const { products, categories } = rolloutTargets()
  const wanted = [...products.flatMap((p) => p.filenames), ...categories.map((c) => c.filename)]

  // Synthetic "photos": valid WebP, each with its own size, so each differs from the generated art.
  const files = new Map<string, Loaded>()
  let i = 0
  for (const filename of wanted) {
    const asset = ASSETS.find((a) => a.out === filename)!
    i += 1
    const data = await sharp({ create: { width: 90 + i, height: 70 + i, channels: 3, background: { r: (i * 7) % 255, g: (i * 13) % 255, b: (i * 29) % 255 } } })
      .webp({ quality: 70 })
      .toBuffer()
    files.set(filename, { filename, data, alt: asset.alt, assetId: asset.id })
  }

  const count = async (collection: 'media' | 'products' | 'categories') => (await payload.count({ collection, overrideAccess: true })).totalDocs
  const before = { media: await count('media'), products: await count('products'), categories: await count('categories') }
  console.log('before (generated-art seed):', before)
  assert.equal(before.products, 24)
  assert.equal(before.categories, 10)

  // 1. Dry run writes nothing.
  const dry = await runRollout(payload, files, { apply: false, createMissing: false })
  console.log('dry run:', { toUpload: dry.mediaToUpload, existing: dry.mediaExisting, linked: dry.linked, already: dry.alreadyLinked, missing: dry.missingTargets.length })
  assert.equal(dry.mediaToUpload, 58, 'art with the same filename is NOT taken for the photo (sizes differ)')
  assert.equal(dry.mediaExisting, 0)
  assert.equal(dry.linked, 34)
  assert.equal(await count('media'), before.media, 'dry run uploaded nothing')

  // 2. Apply uploads and relinks.
  const applied = await runRollout(payload, files, { apply: true, createMissing: false })
  console.log('apply:', { uploaded: applied.createdMedia.length, linked: applied.linked, already: applied.alreadyLinked })
  assert.equal(applied.createdMedia.length, 58)
  assert.equal(applied.linked, 34)
  assert.equal(await count('media'), before.media + 58)
  assert.equal(await count('products'), 24)
  const aero = (await payload.find({ collection: 'products', where: { name: { equals: products[0].name } }, depth: 1, limit: 1, overrideAccess: true })).docs[0]
  const names = (aero.images as Array<{ filename?: string; alt?: string; filesize?: number }>).map((m) => m.filename)
  console.log('first product images:', names)
  assert.ok(names.every((n) => n?.startsWith('aero-wave-wireless-headphones-')))
  assert.equal((aero.images as Array<{ filesize?: number }>)[0].filesize, files.get(products[0].filenames[0])!.data.length, 'the product now points at the photo bytes, not the art')
  const cat = (await payload.find({ collection: 'categories', where: { slug: { equals: 'headphones' } }, depth: 1, limit: 1, overrideAccess: true })).docs[0]
  assert.equal((cat.image as { filesize?: number }).filesize, files.get('category-headphones.webp')!.data.length)

  // 3. Rerun adds nothing.
  const again = await runRollout(payload, files, { apply: true, createMissing: false })
  console.log('rerun:', { uploaded: again.createdMedia.length, existing: again.mediaExisting, linked: again.linked, already: again.alreadyLinked })
  assert.equal(again.createdMedia.length, 0)
  assert.equal(again.mediaExisting, 58)
  assert.equal(again.linked, 0)
  assert.equal(again.alreadyLinked, 34)
  assert.equal(await count('media'), before.media + 58)

  // 4. A product missing from the site is skipped by default and created with --create-missing.
  const victim = (await payload.find({ collection: 'products', where: { name: { equals: products[5].name } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  await payload.delete({ collection: 'products', id: victim.id, overrideAccess: true })
  // Regression (QA F4): a missing target gets no upload. Remove its two photos too, so an upload would show.
  for (const f of products[5].filenames) {
    const m = (await payload.find({ collection: 'media', where: { alt: { equals: files.get(f)!.alt } }, limit: 5, depth: 0, overrideAccess: true })).docs
    for (const d of m) await payload.delete({ collection: 'media', id: d.id, overrideAccess: true })
  }
  const mediaBeforeSkip = await count('media')
  const skipped = await runRollout(payload, files, { apply: true, createMissing: false })
  assert.deepEqual(skipped.missingTargets, [`product ${products[5].name}`])
  assert.equal(skipped.createdMedia.length, 0, 'no orphan upload for a product that is not on the site')
  assert.equal(await count('media'), mediaBeforeSkip)
  assert.equal(await count('products'), 23)
  const created = await runRollout(payload, files, { apply: true, createMissing: true })
  assert.equal(created.created, 1)
  assert.equal(created.createdMedia.length, 2)
  assert.equal(await count('products'), 24)
  const recreated = (await payload.find({ collection: 'products', where: { name: { equals: products[5].name } }, depth: 1, limit: 1, overrideAccess: true })).docs[0]
  assert.equal(recreated.images.length, 2)
  assert.equal(await count('media'), mediaBeforeSkip + 2, 'recreating the product uploaded only its own two photos')

  // 5. An empty site (no products, no categories) with --create-missing: categories first, then products.
  for (const p of (await payload.find({ collection: 'products', limit: 100, depth: 0, overrideAccess: true })).docs) await payload.delete({ collection: 'products', id: p.id, overrideAccess: true })
  for (const c of (await payload.find({ collection: 'categories', limit: 100, depth: 0, overrideAccess: true })).docs) await payload.delete({ collection: 'categories', id: c.id, overrideAccess: true })
  const fresh = await runRollout(payload, files, { apply: true, createMissing: true })
  console.log('empty site + create-missing:', { created: fresh.created, uploaded: fresh.createdMedia.length, existing: fresh.mediaExisting })
  assert.equal(fresh.created, 34)
  assert.equal(await count('products'), 24)
  assert.equal(await count('categories'), 10)
  assert.equal(await count('media'), mediaBeforeSkip + 2, 'the photos were reused, nothing re-uploaded')

  console.log('INTEGRATION OK')
  process.exit(0)
}

main().catch((e) => {
  console.error('INTEGRATION FAILED:', e)
  process.exit(1)
})
