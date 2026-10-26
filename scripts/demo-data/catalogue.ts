// M90: demo catalogue for scripts/seed-demo.ts. Invented, brand-neutral product names and plain,
// factual copy: no ratings or reviews (ADR-016), and no warranty, certification, shipping or
// "best seller" claims. Prices are PKR (whole rupees). Two category levels only (ADR-013).
// `slugify(name)` is the demo "product slug": products have no slug field (URLs use the id),
// so it is used only to name image files (<slug>-1.webp, <slug>-2.webp) and demo-assets overrides.
import type { Motif } from './art'

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export type CategorySeed = {
  title: string
  slug: string
  description: string
  displayOrder: number
  /** Slug of the parent category; absent for a top-level category. */
  parent?: string
  motif: Motif
  hue: number
}

// Slugs electronics, speakers, headphones, fashion and watches match scripts/seed.ts so a
// database that already ran the basic seed is reused rather than duplicated.
export const CATEGORIES: CategorySeed[] = [
  { title: 'Electronics', slug: 'electronics', description: 'Audio, wearables and everyday gadgets.', displayOrder: 1, motif: 'collection', hue: 215 },
  { title: 'Headphones', slug: 'headphones', description: 'Wireless and over-ear headphones.', displayOrder: 1, parent: 'electronics', motif: 'headphones', hue: 225 },
  { title: 'Speakers', slug: 'speakers', description: 'Portable Bluetooth speakers.', displayOrder: 2, parent: 'electronics', motif: 'speaker', hue: 255 },
  { title: 'Smart Watches', slug: 'smart-watches', description: 'Fitness and everyday smart watches.', displayOrder: 3, parent: 'electronics', motif: 'smartwatch', hue: 190 },
  { title: 'Power Banks', slug: 'power-banks', description: 'Portable chargers for phones and small devices.', displayOrder: 4, parent: 'electronics', motif: 'powerbank', hue: 160 },
  { title: 'Fashion', slug: 'fashion', description: 'Watches, bags and accessories.', displayOrder: 2, motif: 'collection', hue: 340 },
  { title: 'Watches', slug: 'watches', description: 'Analog wrist watches for every day.', displayOrder: 1, parent: 'fashion', motif: 'watch', hue: 20 },
  { title: 'Bags', slug: 'bags', description: 'Backpacks, totes and travel bags.', displayOrder: 2, parent: 'fashion', motif: 'bag', hue: 35 },
  { title: 'Sunglasses', slug: 'sunglasses', description: 'Sunglasses in classic frame shapes.', displayOrder: 3, parent: 'fashion', motif: 'sunglasses', hue: 290 },
  { title: 'Home & Living', slug: 'home-living', description: 'Lighting and kitchen essentials for the home.', displayOrder: 3, motif: 'collection', hue: 95 },
  { title: 'Lamps', slug: 'lamps', description: 'Table and desk lamps.', displayOrder: 1, parent: 'home-living', motif: 'lamp', hue: 50 },
  { title: 'Kitchen', slug: 'kitchen', description: 'Cookware and storage for the kitchen.', displayOrder: 2, parent: 'home-living', motif: 'kitchen', hue: 120 },
  { title: 'Beauty & Care', slug: 'beauty-care', description: 'Skincare and fragrance.', displayOrder: 4, motif: 'collection', hue: 320 },
  { title: 'Skincare', slug: 'skincare', description: 'Everyday face and skin care.', displayOrder: 1, parent: 'beauty-care', motif: 'skincare', hue: 150 },
  { title: 'Fragrances', slug: 'fragrances', description: 'Perfumes and body sprays.', displayOrder: 2, parent: 'beauty-care', motif: 'fragrance', hue: 270 },
]

export type ProductLabel = 'new' | 'limited' | 'sale'

type RawProduct = {
  name: string
  /** Slug of the (child) category. */
  category: string
  description: string
  price: number
  mrp: number
  inStock?: boolean
  isFeatured?: boolean
  label?: ProductLabel
}

const RAW_PRODUCTS: RawProduct[] = [
  // Headphones
  { name: 'Aero Wave Wireless Headphones', category: 'headphones', price: 4499, mrp: 6999, isFeatured: true, label: 'new', description: 'Wireless over-ear headphones with soft ear cushions and an adjustable headband. A simple wireless pair in a dark finish with a coloured inner ring.' },
  { name: 'Studio Lite Over-Ear Headphones', category: 'headphones', price: 2899, mrp: 3999, description: 'Lightweight over-ear headphones with a padded headband. A simple, comfortable pair for everyday listening at home or on the move.' },
  // Speakers
  { name: 'Capsule Portable Bluetooth Speaker', category: 'speakers', price: 3299, mrp: 4499, label: 'sale', description: 'A compact Bluetooth speaker that fits in a bag. Connect it to your phone wirelessly to play music in a room or outdoors.' },
  { name: 'Cylinder Mini Speaker', category: 'speakers', price: 1899, mrp: 1899, description: 'A small cylinder-shaped speaker for desks and shelves. Easy to pair with a phone or tablet.' },
  // Smart Watches
  { name: 'Pulse Active Smart Watch', category: 'smart-watches', price: 5999, mrp: 8499, isFeatured: true, description: 'A smart watch with a bright rectangular screen and a silicone strap. Shows the time and phone notifications once paired.' },
  { name: 'Orbit Slim Smart Watch', category: 'smart-watches', price: 4299, mrp: 5499, description: 'A slim smart watch with a round face and a comfortable strap. Pairs with your phone for notifications and simple activity tracking.' },
  // Power Banks
  { name: 'Volt Compact Power Bank', category: 'power-banks', price: 2199, mrp: 2999, description: 'A pocket-friendly power bank for topping up a phone on the go. Charges over a USB cable and has a small indicator for the charge level.' },
  { name: 'Volt Max Power Bank', category: 'power-banks', price: 3799, mrp: 3799, label: 'new', description: 'A larger power bank for longer days away from a socket. Charges phones and small devices over USB, with an indicator for the charge level.' },
  // Watches
  { name: 'Classic Steel Analog Watch', category: 'watches', price: 6499, mrp: 8999, isFeatured: true, description: 'An analog wrist watch with a steel-coloured case and a clean white dial. A simple, classic style that suits office or casual wear.' },
  { name: 'Minimal Leather Strap Watch', category: 'watches', price: 3999, mrp: 5499, label: 'sale', description: 'A minimal round watch on a leather-look strap. Plain dial, easy to read, and light enough for everyday wear.' },
  { name: 'Chrono Sport Wrist Watch', category: 'watches', price: 4799, mrp: 4799, description: 'A sporty analog wrist watch with a bold dial and a sturdy strap. Made for daily use.' },
  // Bags
  { name: 'Metro Canvas Backpack', category: 'bags', price: 2999, mrp: 3999, isFeatured: true, description: 'A canvas backpack with a main compartment and a front flap. A practical everyday bag for college, work or short trips.' },
  { name: 'Everyday Faux Leather Tote', category: 'bags', price: 3499, mrp: 4999, label: 'new', description: 'A roomy tote in faux leather with two handles and a front flap. A simple shape for daily errands and work days.' },
  { name: 'Weekender Duffle Bag', category: 'bags', price: 4299, mrp: 5999, description: 'A soft-sided duffle bag in a rounded shape for weekend trips. A casual bag with two carry handles.' },
  // Sunglasses
  { name: 'Pilot Frame Sunglasses', category: 'sunglasses', price: 1799, mrp: 2499, label: 'sale', description: 'Sunglasses with a slim metal-look frame and tinted lenses in a classic teardrop shape. Light on the face for all-day wear.' },
  { name: 'Round Frame Sunglasses', category: 'sunglasses', price: 1499, mrp: 1999, inStock: false, description: 'Round sunglasses with dark tinted lenses and thin arms. A retro shape that suits most faces.' },
  // Lamps
  { name: 'Arc Table Lamp', category: 'lamps', price: 3299, mrp: 4299, isFeatured: true, description: 'A table lamp with a curved stem and a fabric-style shade. Gives a warm light for a living room corner or bedside.' },
  { name: 'Dome Desk Lamp', category: 'lamps', price: 2299, mrp: 2899, description: 'A compact desk lamp with a dome shade and a stable round base. Sized for a study table or office desk.' },
  // Kitchen
  { name: 'Nonstick Frying Pan', category: 'kitchen', price: 1999, mrp: 2799, description: 'A round frying pan with a dark finish and a long handle. Suitable for everyday cooking such as eggs, parathas and stir-fries.' },
  { name: 'Glass Storage Jar Set', category: 'kitchen', price: 1299, mrp: 1799, description: 'A set of glass jars with lids for pulses, spices and snacks. The clear glass makes it easy to see what is inside.' },
  // Skincare
  { name: 'Aloe Hydrating Gel Cream', category: 'skincare', price: 899, mrp: 1199, isFeatured: true, description: 'A light gel-cream moisturiser with aloe for daily use on the face. Comes in a simple tube-style pack.' },
  { name: 'Gentle Foaming Face Wash', category: 'skincare', price: 649, mrp: 849, description: 'A gentle foaming face wash for morning and evening. Rinse off with water after massaging onto damp skin.' },
  // Fragrances
  { name: 'Amber Oud Eau de Parfum', category: 'fragrances', price: 3499, mrp: 4999, label: 'limited', description: 'An eau de parfum with warm amber and oud notes in a glass bottle. A richer scent for evenings and occasions.' },
  { name: 'Citrus Mist Body Spray', category: 'fragrances', price: 799, mrp: 799, inStock: false, description: 'A fresh citrus body spray for everyday use. Light scent in a handy spray bottle.' },
]

export type ProductSeed = {
  name: string
  slug: string
  category: string
  description: string
  price: number
  mrp: number
  inStock: boolean
  isFeatured: boolean
  label?: ProductLabel
  motif: Motif
  /** Category hue shifted per product, so siblings are distinguishable. */
  hue: number
}

const seenInCategory: Record<string, number> = {}

export const PRODUCTS: ProductSeed[] = RAW_PRODUCTS.map((p) => {
  const category = CATEGORIES.find((c) => c.slug === p.category)
  if (!category) throw new Error(`demo catalogue: unknown category slug "${p.category}"`)
  const index = seenInCategory[p.category] ?? 0
  seenInCategory[p.category] = index + 1
  return {
    name: p.name,
    slug: slugify(p.name),
    category: p.category,
    description: p.description,
    price: p.price,
    mrp: p.mrp,
    inStock: p.inStock ?? true,
    isFeatured: p.isFeatured ?? false,
    ...(p.label ? { label: p.label } : {}),
    motif: category.motif,
    hue: category.hue + index * 22,
  }
})
