import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'
import config from '../payload.config'

// M13: seed a handful of dev records — parent/child categories with products —
// so later milestones (M22+) have real data to build against. Reuses existing
// placeholder images from assets/ (still present; removed later at M28) rather
// than fabricating new ones.

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

async function readAsset(name: string) {
  const filePath = path.resolve(dirname, '../assets', name)
  const data = fs.readFileSync(filePath)
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

  const electronics = await payload.create({
    collection: 'categories',
    data: { title: 'Electronics', description: 'Gadgets and smart devices.', displayOrder: 1 },
  })

  const speakers = await payload.create({
    collection: 'categories',
    data: { title: 'Speakers', parent: electronics.id, displayOrder: 1 },
  })

  const headphonesCategory = await payload.create({
    collection: 'categories',
    data: { title: 'Headphones', parent: electronics.id, displayOrder: 2 },
  })

  const fashion = await payload.create({
    collection: 'categories',
    data: { title: 'Fashion', description: 'Watches and accessories.', displayOrder: 2 },
  })

  const watches = await payload.create({
    collection: 'categories',
    data: { title: 'Watches', parent: fashion.id, displayOrder: 1 },
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
