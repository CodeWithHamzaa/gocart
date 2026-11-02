// M90: demo catalogue for scripts/seed-demo.ts. Invented, brand-neutral product names and plain,
// factual copy: no ratings or reviews (ADR-016), and no warranty, certification, shipping or
// "best seller" claims. Prices are PKR (whole rupees). One flat level of categories (M102, ADR-048; was two levels, ADR-013).
// `slugify(name)` is the demo "product slug": products have no slug field (URLs use the id),
// so it is used only to name image files (<slug>-1.webp, <slug>-2.webp) and demo-assets overrides.
// M106 (D3): where a licensed stock photo is only a close match, the temporary demo description was
// adjusted to what the photo shows (the product name is the seed's identity key and stays); see
// docs/assets/MANIFEST.csv notes ("CLOSE MATCH ONLY") for each case.
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
  motif: Motif
  hue: number
}

// Slugs speakers, headphones and watches match scripts/seed.ts so a database that already ran the
// basic seed is reused rather than duplicated. M102: flat; the former departments (Electronics,
// Fashion, Home & Living, Beauty & Care) are gone and their sub-categories are the categories.
export const CATEGORIES: CategorySeed[] = [
  { title: 'Headphones', slug: 'headphones', description: 'Wireless and over-ear headphones.', displayOrder: 1, motif: 'headphones', hue: 225 },
  { title: 'Speakers', slug: 'speakers', description: 'Portable Bluetooth speakers.', displayOrder: 2, motif: 'speaker', hue: 255 },
  { title: 'Power Banks', slug: 'power-banks', description: 'Portable chargers for phones and small devices.', displayOrder: 3, motif: 'powerbank', hue: 160 },
  { title: 'Watches', slug: 'watches', description: 'Analog and smart watches for every day.', displayOrder: 4, motif: 'watch', hue: 20 },
  { title: 'Bags', slug: 'bags', description: 'Backpacks, totes and travel bags.', displayOrder: 5, motif: 'bag', hue: 35 },
  { title: 'Sunglasses', slug: 'sunglasses', description: 'Sunglasses in classic frame shapes.', displayOrder: 6, motif: 'sunglasses', hue: 290 },
  { title: 'Lamps', slug: 'lamps', description: 'Table and desk lamps.', displayOrder: 7, motif: 'lamp', hue: 50 },
  { title: 'Kitchen', slug: 'kitchen', description: 'Cookware and storage for the kitchen.', displayOrder: 8, motif: 'kitchen', hue: 120 },
  { title: 'Skincare', slug: 'skincare', description: 'Everyday face and skin care.', displayOrder: 9, motif: 'skincare', hue: 150 },
  { title: 'Fragrances', slug: 'fragrances', description: 'Perfumes and body sprays.', displayOrder: 10, motif: 'fragrance', hue: 270 },
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
  { name: 'Aero Wave Wireless Headphones', category: 'headphones', price: 4499, mrp: 6999, isFeatured: true, label: 'new', description: 'Wireless headphones with soft ear cushions and an adjustable, padded headband. A simple wireless pair in a black finish.' },
  { name: 'Studio Lite Over-Ear Headphones', category: 'headphones', price: 2899, mrp: 3999, description: 'Lightweight headphones with a padded headband in a cream and grey finish. A simple, comfortable pair for everyday listening at home or on the move.' },
  // Speakers
  { name: 'Capsule Portable Bluetooth Speaker', category: 'speakers', price: 3299, mrp: 4499, label: 'sale', description: 'A compact Bluetooth speaker that fits in a bag. Connect it to your phone wirelessly to play music in a room or outdoors.' },
  { name: 'Cylinder Mini Speaker', category: 'speakers', price: 1899, mrp: 1899, description: 'A small cylinder-shaped speaker for desks and shelves. Easy to pair with a phone or tablet.' },
  // Smart watches (filed under Watches since M102)
  { name: 'Pulse Active Smart Watch', category: 'watches', price: 5999, mrp: 8499, isFeatured: true, description: 'A smart watch with a bright rectangular screen and a silicone strap. Shows the time and phone notifications once paired.' },
  { name: 'Orbit Slim Smart Watch', category: 'watches', price: 4299, mrp: 5499, description: 'A smart watch with a round face and a comfortable strap. Pairs with your phone for notifications and simple activity tracking.' },
  // Power Banks
  { name: 'Volt Compact Power Bank', category: 'power-banks', price: 2199, mrp: 2999, description: 'A slim, pocket-friendly power bank with a silver finish for topping up a phone on the go. Charges devices over a USB cable.' },
  { name: 'Volt Max Power Bank', category: 'power-banks', price: 3799, mrp: 3799, label: 'new', description: 'A larger power bank for longer days away from a socket. Charges phones and small devices over USB, with an indicator for the charge level.' },
  // Watches
  { name: 'Classic Steel Analog Watch', category: 'watches', price: 6499, mrp: 8999, isFeatured: true, description: 'An analog wrist watch with a steel-coloured case and a clean white dial. A simple, classic style that suits office or casual wear.' },
  { name: 'Minimal Leather Strap Watch', category: 'watches', price: 3999, mrp: 5499, label: 'sale', description: 'A minimal round watch on a leather-look strap. Plain dial, easy to read, and light enough for everyday wear.' },
  { name: 'Chrono Sport Wrist Watch', category: 'watches', price: 4799, mrp: 4799, description: 'A sporty analog wrist watch with a bold dial and a sturdy strap. Made for daily use.' },
  // Bags
  { name: 'Metro Canvas Backpack', category: 'bags', price: 2999, mrp: 3999, isFeatured: true, description: 'A canvas backpack with leather straps and buckles and a roomy main compartment. A practical everyday bag for college, work or short trips.' },
  { name: 'Everyday Faux Leather Tote', category: 'bags', price: 3499, mrp: 4999, label: 'new', description: 'A roomy tote in a tan leather-look finish with two handles. A simple shape for daily errands and work days.' },
  { name: 'Weekender Duffle Bag', category: 'bags', price: 4299, mrp: 5999, description: 'A soft-sided duffle bag in a rounded shape for weekend trips. A casual bag with two carry handles.' },
  // Sunglasses
  { name: 'Pilot Frame Sunglasses', category: 'sunglasses', price: 1799, mrp: 2499, label: 'sale', description: 'Pilot-style sunglasses with a slim gold-tone metal-look frame and brown gradient lenses. Light on the face for all-day wear.' },
  { name: 'Round Frame Sunglasses', category: 'sunglasses', price: 1499, mrp: 1999, inStock: false, description: 'Round sunglasses with dark tinted lenses and thin arms. A retro shape that suits most faces.' },
  // Lamps
  { name: 'Arc Table Lamp', category: 'lamps', price: 3299, mrp: 4299, isFeatured: true, description: 'A table lamp with a curved stem and a metal shade in a copper finish. Gives a warm light for a living room corner or bedside.' },
  { name: 'Dome Desk Lamp', category: 'lamps', price: 2299, mrp: 2899, description: 'A compact desk lamp with a cream shade, a flexible neck and a stable base. Sized for a study table or office desk.' },
  // Kitchen
  { name: 'Nonstick Frying Pan', category: 'kitchen', price: 1999, mrp: 2799, description: 'A round frying pan with a dark nonstick finish and a long wooden-look handle. Suitable for everyday cooking such as eggs, parathas and stir-fries.' },
  { name: 'Glass Storage Jar Set', category: 'kitchen', price: 1299, mrp: 1799, description: 'Glass storage jars with metal lids for pulses, spices and snacks. The clear glass makes it easy to see what is inside.' },
  // Skincare
  { name: 'Aloe Hydrating Gel Cream', category: 'skincare', price: 899, mrp: 1199, isFeatured: true, description: 'A light gel-cream moisturiser with aloe for daily use on the face. Comes in a simple tube-style pack.' },
  { name: 'Gentle Foaming Face Wash', category: 'skincare', price: 649, mrp: 849, description: 'A gentle foaming face wash for morning and evening. Rinse off with water after massaging onto damp skin.' },
  // Fragrances
  { name: 'Amber Oud Eau de Parfum', category: 'fragrances', price: 3499, mrp: 4999, label: 'limited', description: 'An eau de parfum with warm amber and oud notes in a glass bottle. A richer scent for evenings and occasions.' },
  { name: 'Citrus Mist Body Spray', category: 'fragrances', price: 799, mrp: 799, inStock: false, description: 'A fresh citrus-scented body spray for everyday use. Light scent in a glass bottle with a black cap.' },
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
