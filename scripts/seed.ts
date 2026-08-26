import sharp from 'sharp'
import { getPayload } from 'payload'
import config from '../payload.config'

// M13: seed a handful of dev records — parent/child categories with products —
// so later milestones (M22+) have real data to build against.
//
// This originally read placeholder images from assets/, but M28 (8c20d4f) deleted
// that directory along with the dummy dataset, which left the seed failing with
// ENOENT before it created anything. Products.images is required, so the images
// cannot simply be dropped — each record now gets a generated placeholder instead,
// so the seed no longer depends on a directory that does not exist.

// One shade per placeholder so the four seeded products stay distinguishable in /admin.
const placeholderColours = [
  { r: 203, g: 213, b: 225 },
  { r: 148, g: 163, b: 184 },
  { r: 100, g: 116, b: 139 },
  { r: 71, g: 85, b: 105 },
]

async function readAsset(name: string) {
  // Asset names are product_img1.png … product_img4.png; fall back to the first
  // shade if a caller ever passes a name without a number.
  const position = Number(name.match(/\d+/)?.[0] ?? 1)
  const background = placeholderColours[(position - 1) % placeholderColours.length]

  const data = await sharp({
    create: { width: 512, height: 512, channels: 3, background },
  })
    .png()
    .toBuffer()

  return {
    data,
    mimetype: 'image/png',
    name,
    size: data.length,
  }
}

async function seed() {
  const payload = await getPayload({ config })

  payload.logger.info('Seeding dev data...')

  const [imgLamp, imgSpeaker, imgWatch, imgHeadphones] = await Promise.all([
    payload.create({
      collection: 'media',
      data: { alt: 'Modern table lamp' },
      file: await readAsset('product_img1.png'),
    }),
    payload.create({
      collection: 'media',
      data: { alt: 'Smart speaker' },
      file: await readAsset('product_img2.png'),
    }),
    payload.create({
      collection: 'media',
      data: { alt: 'Smart watch' },
      file: await readAsset('product_img3.png'),
    }),
    payload.create({
      collection: 'media',
      data: { alt: 'Wireless headphones' },
      file: await readAsset('product_img4.png'),
    }),
  ])

  // slug is required on Categories and is normally filled in by the collection's
  // beforeValidate hook, which TypeScript cannot see — so the seed sets it
  // explicitly. Values are identical to what slugify() derives from each title.
  const electronics = await payload.create({
    collection: 'categories',
    data: {
      title: 'Electronics',
      slug: 'electronics',
      description: 'Gadgets and smart devices.',
      displayOrder: 1,
    },
  })

  const speakers = await payload.create({
    collection: 'categories',
    data: { title: 'Speakers', slug: 'speakers', parent: electronics.id, displayOrder: 1 },
  })

  const headphonesCategory = await payload.create({
    collection: 'categories',
    data: { title: 'Headphones', slug: 'headphones', parent: electronics.id, displayOrder: 2 },
  })

  const fashion = await payload.create({
    collection: 'categories',
    data: {
      title: 'Fashion',
      slug: 'fashion',
      description: 'Watches and accessories.',
      displayOrder: 2,
    },
  })

  const watches = await payload.create({
    collection: 'categories',
    data: { title: 'Watches', slug: 'watches', parent: fashion.id, displayOrder: 1 },
  })

  await Promise.all([
    // Directly under a parent category (valid — appears on the parent's page).
    payload.create({
      collection: 'products',
      data: {
        name: 'Modern Table Lamp',
        description: 'Modern table lamp with a sleek design.',
        mrp: 4000,
        price: 2900,
        images: [imgLamp.id],
        category: electronics.id,
        inStock: true,
      },
    }),
    payload.create({
      collection: 'products',
      data: {
        name: 'Smart Speaker Gray',
        description: 'Smart speaker with a sleek design.',
        mrp: 5000,
        price: 2900,
        images: [imgSpeaker.id],
        category: speakers.id,
        inStock: true,
        // M23: seeds the home page's "Best Selling" section, which is
        // admin-curated rather than computed (ADR-022).
        isFeatured: true,
      },
    }),
    payload.create({
      collection: 'products',
      data: {
        name: 'Wireless Headphones',
        description: 'Wireless headphones with a sleek design.',
        mrp: 7000,
        price: 2900,
        images: [imgHeadphones.id],
        category: headphonesCategory.id,
        inStock: true,
        isFeatured: true,
      },
    }),
    payload.create({
      collection: 'products',
      data: {
        name: 'Smart Watch White',
        description: 'Smart watch with a sleek design.',
        mrp: 6000,
        price: 2900,
        images: [imgWatch.id],
        category: watches.id,
        inStock: false,
      },
    }),
  ])

  payload.logger.info('Seed complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
