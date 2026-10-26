import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { getPayload } from 'payload'
import type { Payload } from 'payload'
import { validatePhone } from '../lib/validation/pk'
import { renderArt } from './demo-data/art'
import { CATEGORIES, PRODUCTS } from './demo-data/catalogue'
import type { CategorySeed, ProductSeed } from './demo-data/catalogue'

// M90: idempotent, local-only demo data for showing the storefront and /admin to a client:
// 15 categories (4 parents), 24 products with 2 generated images each, store Settings and,
// with --with-orders, 8 sample orders. It is NOT scripts/seed.ts (the minimal M13 dev seed) and
// changes no schema, access rule or production behaviour.
//
// Run it inside the app container so uploads land in the app-media volume:
//   docker compose exec app npm run seed:demo
//   docker compose exec app npm run seed:demo -- --with-orders
// Optional real photos: put <product-slug>-<1|2>.<jpg|jpeg|png|webp> directly in demo-assets/
// (or the folder named by DEMO_ASSETS_DIR). See demo-assets/README.md, which also lists the
// product slugs and the exact /admin steps to remove the demo rows by hand (there is no delete
// routine on purpose).
//
// Safety: refuses to run when NODE_ENV=production, a production-only variable is set, or
// DATABASE_URI uses the gocart_app role or a host other than postgres/localhost/127.0.0.1/::1,
// and does that BEFORE the Payload config is imported, so it never opens a production database
// (an unparsable DATABASE_URI is not refused; Payload fails to connect on its own). It only
// finds-or-creates (categories by slug, products by exact name, media by filename then alt,
// orders by idempotencyKey), never updates or deletes a row it did not create, never touches
// users, and prints only counts and names (never the connection string).

const PRODUCTION_ONLY_VARS = ['TUNNEL_TOKEN', 'APP_DB_PASSWORD']
const LOCAL_DB_HOSTS = ['postgres', 'localhost', '127.0.0.1', '::1']

function refuseInProduction() {
  const reasons: string[] = []
  if (process.env.NODE_ENV === 'production') reasons.push('NODE_ENV=production')
  for (const name of PRODUCTION_ONLY_VARS) {
    if (process.env[name]) reasons.push(`${name} is set`)
  }
  // The database must look like the local dev one: host postgres/localhost/loopback and not the
  // restricted production role. The URI is parsed, never printed. An unparsable URI passes the
  // guard on purpose: Payload then fails to connect by itself and nothing is written.
  const uri = process.env.DATABASE_URI
  if (uri) {
    try {
      const url = new URL(uri)
      const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
      if (decodeURIComponent(url.username) === 'gocart_app') reasons.push('DATABASE_URI uses the gocart_app role')
      if (!LOCAL_DB_HOSTS.includes(host)) reasons.push('DATABASE_URI host is not postgres, localhost, 127.0.0.1 or ::1')
    } catch {
      // see above
    }
  }
  if (reasons.length > 0) {
    console.error(`seed-demo: refusing to run, this looks like a production environment (${reasons.join('; ')}). Demo data is for local development only.`)
    process.exit(1)
  }
}

const ASSET_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const MAX_EDGE = 1600
// Only a panorama-like image is cropped square; anything under this ratio keeps its aspect.
const EXTREME_RATIO = 2
// Untrusted-ish local files: cap decoded pixels and fail on any decode error.
const SHARP_INPUT = { limitInputPixels: 50_000_000, failOn: 'error' } as const

function assetsDir(): string {
  return path.resolve(process.env.DEMO_ASSETS_DIR || path.join(process.cwd(), 'demo-assets'))
}

/** A file directly inside the assets folder (never _inbox or other subfolders), or null. */
function findOverride(dir: string, slug: string, n: 1 | 2): string | null {
  for (const ext of ASSET_EXTENSIONS) {
    const candidate = path.join(dir, `${slug}-${n}.${ext}`)
    try {
      if (fs.statSync(candidate).isFile()) return candidate
    } catch {
      // missing file or folder is the normal case
    }
  }
  return null
}

/** Downscale to <=1600px (never enlarge), square-crop only extreme aspect ratios, WebP q80. Original is untouched. */
async function processOverride(file: string): Promise<Buffer> {
  const meta = await sharp(file, SHARP_INPUT).metadata()
  // EXIF orientations 5-8 swap the displayed width and height.
  const swapped = (meta.orientation ?? 1) >= 5
  const width = (swapped ? meta.height : meta.width) ?? 0
  const height = (swapped ? meta.width : meta.height) ?? 0
  if (!width || !height) throw new Error('unreadable image dimensions')

  const pipeline = sharp(file, SHARP_INPUT).rotate()
  if (Math.max(width, height) / Math.min(width, height) > EXTREME_RATIO) {
    const side = Math.min(width, height, MAX_EDGE)
    pipeline.resize({ width: side, height: side, fit: 'cover' })
  } else {
    pipeline.resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
  }
  return pipeline.webp({ quality: 80 }).toBuffer()
}

async function generated(motif: ProductSeed['motif'], hue: number, variant: 1 | 2): Promise<Buffer> {
  return sharp(Buffer.from(renderArt(motif, hue, variant)))
    .resize(1200, 1200)
    .webp({ quality: 80 })
    .toBuffer()
}

type Counts = { created: number; existing: number }
const counts: Record<string, Counts> = {
  categories: { created: 0, existing: 0 },
  products: { created: 0, existing: 0 },
  media: { created: 0, existing: 0 },
  orders: { created: 0, existing: 0 },
}
let overridesUsed = 0
let overrideFailures = 0

/** Finds media by filename, then by alt, before creating, so reruns add nothing. */
async function ensureMedia(payload: Payload, filename: string, alt: string, build: () => Promise<Buffer>): Promise<number> {
  let found = await payload.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (found.docs.length === 0) {
    found = await payload.find({
      collection: 'media',
      where: { alt: { equals: alt } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  }
  if (found.docs[0]) {
    counts.media.existing += 1
    return Number(found.docs[0].id)
  }
  const data = await build()
  const created = await payload.create({
    collection: 'media',
    data: { alt },
    file: { data, mimetype: 'image/webp', name: filename, size: data.length },
    overrideAccess: true,
  })
  counts.media.created += 1
  return Number(created.id)
}

async function ensureCategories(payload: Payload): Promise<Map<string, number>> {
  const ids = new Map<string, number>()
  // CATEGORIES lists every parent before its children, so a parent id is always known first.
  for (const cat of CATEGORIES) {
    const existing = await payload.find({
      collection: 'categories',
      where: { slug: { equals: cat.slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      // Reused as-is: a row that is already there is never modified.
      ids.set(cat.slug, Number(existing.docs[0].id))
      counts.categories.existing += 1
      continue
    }
    const image = await categoryImage(payload, cat)
    const parentId = cat.parent ? ids.get(cat.parent) : undefined
    const created = await payload.create({
      collection: 'categories',
      data: {
        title: cat.title,
        slug: cat.slug,
        description: cat.description,
        displayOrder: cat.displayOrder,
        image,
        ...(parentId !== undefined ? { parent: parentId } : {}),
      },
      overrideAccess: true,
    })
    ids.set(cat.slug, Number(created.id))
    counts.categories.created += 1
  }
  return ids
}

function categoryImage(payload: Payload, cat: CategorySeed): Promise<number> {
  return ensureMedia(payload, `category-${cat.slug}.webp`, `${cat.title} category artwork`, () =>
    generated(cat.motif, cat.hue, 1),
  )
}

async function productImage(payload: Payload, product: ProductSeed, n: 1 | 2, dir: string): Promise<number> {
  return ensureMedia(payload, `${product.slug}-${n}.webp`, `${product.name}, view ${n}`, async () => {
    const override = findOverride(dir, product.slug, n)
    if (override) {
      try {
        const data = await processOverride(override)
        overridesUsed += 1
        return data
      } catch {
        // A bad photo falls back to the generated artwork rather than aborting the seed.
        overrideFailures += 1
        console.warn(`override failed for ${path.basename(override)}`)
      }
    }
    return generated(product.motif, product.hue, n)
  })
}

async function ensureProducts(payload: Payload, categoryIds: Map<string, number>, dir: string) {
  for (const product of PRODUCTS) {
    const existing = await payload.find({
      collection: 'products',
      where: { name: { equals: product.name } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      counts.products.existing += 1
      continue
    }
    const category = categoryIds.get(product.category)
    if (category === undefined) throw new Error(`category "${product.category}" was not resolved`)
    // Product is checked first so a skipped product never leaves orphan images behind.
    const images = [await productImage(payload, product, 1, dir), await productImage(payload, product, 2, dir)]
    await payload.create({
      collection: 'products',
      data: {
        name: product.name,
        description: product.description,
        mrp: product.mrp,
        price: product.price,
        images,
        category,
        inStock: product.inStock,
        isFeatured: product.isFeatured,
        ...(product.label ? { label: product.label } : {}),
      },
      overrideAccess: true,
    })
    counts.products.created += 1
  }
}

// Settings is a global, so there is nothing to find-or-create: it is filled only while it still
// looks untouched (default name, default shipping rule, no contact details) so a person's edits
// are never overwritten. Values are clearly fake placeholders.
const DEMO_SETTINGS = {
  storeName: 'GoCart Demo Store',
  contactPhone: '0300-0000000',
  contactEmail: 'demo@example.com',
  contactAddress: 'Demo Store, Sample Street, Placeholder City (fake address)',
}

async function ensureSettings(payload: Payload): Promise<{ flatRate: number; threshold: number }> {
  const current = await payload.findGlobal({ slug: 'settings', overrideAccess: true })
  const flatRate = typeof current.shippingFlatRate === 'number' ? current.shippingFlatRate : 200
  const threshold = typeof current.freeShippingThreshold === 'number' ? current.freeShippingThreshold : 3000
  const untouched =
    current.storeName === 'GoCart' &&
    flatRate === 200 &&
    threshold === 3000 &&
    !current.contactPhone &&
    !current.contactEmail &&
    !current.contactAddress
  if (!untouched) {
    const filledByDemo =
      current.storeName === DEMO_SETTINGS.storeName &&
      current.contactPhone === DEMO_SETTINGS.contactPhone &&
      current.contactEmail === DEMO_SETTINGS.contactEmail &&
      current.contactAddress === DEMO_SETTINGS.contactAddress
    console.log(filledByDemo ? 'Settings: already filled (demo values).' : 'Settings: left as is (already edited).')
    return { flatRate, threshold }
  }
  await payload.updateGlobal({
    slug: 'settings',
    data: {
      ...DEMO_SETTINGS,
      shippingFlatRate: 200,
      freeShippingThreshold: 3000,
    },
    overrideAccess: true,
  })
  console.log('Settings: filled with demo placeholder values.')
  return { flatRate: 200, threshold: 3000 }
}

type OrderStatus = 'PLACED' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED'
type SampleOrder = {
  name: string
  city: string
  area?: string
  status: OrderStatus
  isPaid: boolean
  items: { slug: string; quantity: number }[]
}

// Phones are 03000000001..03000000008 by position, an obviously fake sequence.
const SAMPLE_ORDERS: SampleOrder[] = [
  { name: 'Demo Customer Alpha', city: 'Karachi', area: 'Sample Town', status: 'PLACED', isPaid: false, items: [{ slug: 'aero-wave-wireless-headphones', quantity: 1 }] },
  { name: 'Demo Customer Bravo', city: 'Lahore', status: 'CONFIRMED', isPaid: false, items: [{ slug: 'aloe-hydrating-gel-cream', quantity: 2 }] },
  { name: 'Demo Customer Charlie', city: 'Islamabad', area: 'Test Sector', status: 'PROCESSING', isPaid: false, items: [{ slug: 'volt-compact-power-bank', quantity: 1 }, { slug: 'gentle-foaming-face-wash', quantity: 1 }] },
  { name: 'Demo Customer Delta', city: 'Rawalpindi', status: 'SHIPPED', isPaid: false, items: [{ slug: 'classic-steel-analog-watch', quantity: 1 }] },
  { name: 'Demo Customer Echo', city: 'Faisalabad', status: 'DELIVERED', isPaid: true, items: [{ slug: 'metro-canvas-backpack', quantity: 1 }] },
  { name: 'Demo Customer Foxtrot', city: 'Multan', area: 'Example Colony', status: 'DELIVERED', isPaid: true, items: [{ slug: 'capsule-portable-bluetooth-speaker', quantity: 1 }, { slug: 'glass-storage-jar-set', quantity: 1 }] },
  { name: 'Demo Customer Golf', city: 'Peshawar', status: 'CANCELLED', isPaid: false, items: [{ slug: 'pilot-frame-sunglasses', quantity: 1 }] },
  { name: 'Demo Customer Hotel', city: 'Quetta', status: 'RETURNED', isPaid: false, items: [{ slug: 'arc-table-lamp', quantity: 1 }] },
]

async function ensureOrders(payload: Payload, shipping: { flatRate: number; threshold: number }) {
  for (const [index, sample] of SAMPLE_ORDERS.entries()) {
    const n = index + 1
    const key = `demo-seed-order-${n}`
    const phone = `0300000000${n}`

    const phoneError = validatePhone(phone)
    console.log(`Order ${n}: phone ${phone} ${phoneError === null ? 'accepted' : 'REJECTED'} by validatePhone`)
    if (phoneError !== null) continue

    const existing = await payload.find({
      collection: 'orders',
      where: { idempotencyKey: { equals: key } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      counts.orders.existing += 1
      continue
    }

    // Prices come from the live product rows, as checkout does (ADR-026), then are snapshotted.
    const items: { product: number; quantity: number; unitPrice: number }[] = []
    for (const line of sample.items) {
      const seed = PRODUCTS.find((p) => p.slug === line.slug)
      const found = seed
        ? await payload.find({
            collection: 'products',
            where: { name: { equals: seed.name } },
            limit: 1,
            depth: 0,
            overrideAccess: true,
          })
        : null
      const product = found?.docs[0]
      if (!product) {
        console.warn(`Order ${n}: product "${line.slug}" not found, order skipped`)
        break
      }
      items.push({ product: Number(product.id), quantity: line.quantity, unitPrice: Number(product.price) })
    }
    if (items.length !== sample.items.length) continue

    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
    const shippingCost = subtotal >= shipping.threshold ? 0 : shipping.flatRate
    await payload.create({
      collection: 'orders',
      data: {
        idempotencyKey: key,
        name: sample.name,
        phone,
        address: 'Demo House 1, Fake Street, Sample Town (not a real address)',
        city: sample.city,
        ...(sample.area ? { area: sample.area } : {}),
        items,
        orderTotal: subtotal + shippingCost,
        shippingCost,
        paymentMethod: 'COD',
        isPaid: sample.isPaid,
        status: sample.status,
      },
      overrideAccess: true,
    })
    counts.orders.created += 1
  }
}

async function seedDemo() {
  refuseInProduction()
  const withOrders = process.argv.includes('--with-orders')

  // Imported only after the guard: loading the config is what makes a database reachable.
  const { default: config } = await import('../payload.config')
  const payload = await getPayload({ config })

  console.log('Seeding demo data...')
  const dir = assetsDir()
  const categoryIds = await ensureCategories(payload)
  await ensureProducts(payload, categoryIds, dir)
  const shipping = await ensureSettings(payload)
  if (withOrders) await ensureOrders(payload, shipping)
  else console.log('Orders: skipped (pass --with-orders to create sample orders).')

  for (const [label, c] of Object.entries(counts)) {
    if (label === 'orders' && !withOrders) continue
    console.log(`${label}: ${c.created} created, ${c.existing} already present`)
  }
  console.log(`demo-assets photos used: ${overridesUsed}${overrideFailures ? ` (${overrideFailures} unreadable, generated artwork used)` : ''}`)
  console.log('Demo seed complete.')
  process.exit(0)
}

seedDemo().catch((err) => {
  console.error(`seed-demo failed: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
