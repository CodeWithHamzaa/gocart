import type { Payload } from 'payload'
import { CATEGORIES, PRODUCTS } from './demo-data/catalogue'
import { isSameMedia, mediaStem, rolloutTargets, sameIds } from './rollout-demo-photos-core'

// M108: the Payload side of the test-site photo rollout. It has NO target guard of its own: the only
// entry point is scripts/rollout-demo-photos.ts, which runs checkTarget() first and imports this
// file only afterwards. scripts/rollout-demo-photos.db-test.ts calls it against a throwaway local database.

export type Loaded = { filename: string; data: Buffer; alt: string; assetId: string }

export type RolloutResult = {
  mediaExisting: number
  mediaToUpload: number
  linked: number
  alreadyLinked: number
  created: number
  missingTargets: string[]
  /** filename -> media id, for every file that is on the site after the run (apply) or already was (dry run). */
  mediaIdByFile: Map<string, number>
  /** Ids of media rows this run uploaded (the rollback list). */
  createdMedia: number[]
}

export async function runRollout(
  payload: Payload,
  files: ReadonlyMap<string, Loaded>,
  opts: { apply: boolean; createMissing: boolean; onCreated?: (mediaId: number, filename: string) => void },
): Promise<RolloutResult> {
  const result: RolloutResult = {
    mediaExisting: 0,
    mediaToUpload: 0,
    linked: 0,
    alreadyLinked: 0,
    created: 0,
    missingTargets: [],
    mediaIdByFile: new Map(),
    createdMedia: [],
  }
  const { apply, createMissing } = opts
  const file = (filename: string): Loaded => {
    const f = files.get(filename)
    if (!f) throw new Error(`${filename} was not loaded`)
    return f
  }

  /** Finds the media row for this exact file (name and byte size), or uploads it (apply) and returns its id; null in a dry run. */
  async function ensureMedia(f: Loaded): Promise<number | null> {
    const cached = result.mediaIdByFile.get(f.filename)
    if (cached !== undefined) return cached
    const found = await payload.find({
      collection: 'media',
      where: { filename: { like: mediaStem(f.filename) } },
      limit: 200,
      depth: 0,
      overrideAccess: true,
    })
    const hit = found.docs.find((d) => isSameMedia({ filename: d.filename, filesize: d.filesize, alt: d.alt }, f.filename, f.data.length, f.alt))
    if (hit) {
      result.mediaExisting += 1
      result.mediaIdByFile.set(f.filename, Number(hit.id))
      return Number(hit.id)
    }
    result.mediaToUpload += 1
    if (!apply) return null
    const created = await payload.create({
      collection: 'media',
      data: { alt: f.alt },
      file: { data: f.data, mimetype: 'image/webp', name: f.filename, size: f.data.length },
      overrideAccess: true,
    })
    const id = Number(created.id)
    result.mediaIdByFile.set(f.filename, id)
    result.createdMedia.push(id)
    opts.onCreated?.(id, f.filename)
    return id
  }

  const { products, categories } = rolloutTargets()

  for (const cat of categories) {
    const found = await payload.find({ collection: 'categories', where: { slug: { equals: cat.slug } }, limit: 1, depth: 0, overrideAccess: true })
    const doc = found.docs[0]
    // A target that is missing and will not be created gets no upload: the photo would be an orphan.
    if (!doc && !createMissing) {
      result.missingTargets.push(`category ${cat.slug}`)
      continue
    }
    const mediaId = await ensureMedia(file(cat.filename))
    if (!doc) {
      if (apply && mediaId !== null) {
        const seed = CATEGORIES.find((c) => c.slug === cat.slug)
        if (!seed) throw new Error(`category ${cat.slug} is not in the demo catalogue`)
        await payload.create({
          collection: 'categories',
          data: { title: seed.title, slug: seed.slug, description: seed.description, displayOrder: seed.displayOrder, image: mediaId },
          overrideAccess: true,
        })
      }
      result.created += 1
      continue
    }
    const current = typeof doc.image === 'object' && doc.image !== null ? Number(doc.image.id) : Number(doc.image)
    if (mediaId !== null && current === mediaId) {
      result.alreadyLinked += 1
      continue
    }
    if (apply && mediaId !== null) await payload.update({ collection: 'categories', id: doc.id, data: { image: mediaId }, overrideAccess: true })
    result.linked += 1
  }

  // Needed only to create a missing product; read after the categories above were created.
  const categoryIdBySlug = new Map<string, number>()
  if (createMissing) {
    const all = await payload.find({ collection: 'categories', limit: 100, depth: 0, overrideAccess: true })
    for (const d of all.docs) categoryIdBySlug.set(d.slug, Number(d.id))
  }

  for (const prod of products) {
    const found = await payload.find({ collection: 'products', where: { name: { equals: prod.name } }, limit: 1, depth: 0, overrideAccess: true })
    const doc = found.docs[0]
    if (!doc && !createMissing) {
      result.missingTargets.push(`product ${prod.name}`)
      continue
    }
    const ids: Array<number | null> = []
    for (const filename of prod.filenames) ids.push(await ensureMedia(file(filename)))
    const ready = ids.every((i) => i !== null)
    if (!doc) {
      const seed = PRODUCTS.find((p) => p.name === prod.name)
      if (!seed) throw new Error(`product ${prod.name} is not in the demo catalogue`)
      if (apply && ready) {
        const category = categoryIdBySlug.get(seed.category)
        if (category === undefined) throw new Error(`category "${seed.category}" does not exist`)
        await payload.create({
          collection: 'products',
          data: {
            name: seed.name,
            description: seed.description,
            mrp: seed.mrp,
            price: seed.price,
            images: ids as number[],
            category,
            inStock: seed.inStock,
            isFeatured: seed.isFeatured,
            ...(seed.label ? { label: seed.label } : {}),
          },
          overrideAccess: true,
        })
      }
      result.created += 1
      continue
    }
    if (ready && sameIds((doc.images ?? []) as unknown[], ids as number[])) {
      result.alreadyLinked += 1
      continue
    }
    if (apply && ready) await payload.update({ collection: 'products', id: doc.id, data: { images: ids as number[] }, overrideAccess: true })
    result.linked += 1
  }

  return result
}
