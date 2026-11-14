import { discountPercent } from './product-badges'
import { formatPKR } from './currency'
import { mediaUrl } from './media'
import type { Product } from './payload/products'
import type { Category } from './payload/categories'

// M101: the home banner's slides, built only from real data (pure, no Payload import). A slide whose data
// is missing is left out, never filled with a made-up claim:
// - deals: the two in-stock products with the biggest real discount (price against MRP) among the ones the
//   home page already loaded; the badge's "up to" is the larger of those two;
// - new arrivals: the two newest in-stock products;
// - delivery: the Settings free-delivery threshold and the store's lowest price.
export type HeroSlide = {
  id: string // 'deals' | 'new' | 'delivery' for the automatic slides; 'admin-<id>' for slides from /admin (M110)
  badge: string
  badgeTone: 'sale' | 'ink'
  tone: 'green' | 'blue' | 'grey'
  title: string
  text: string
  cta: { href: string; label: string }
  images: { url: string; alt: string }[]
}

type Input = {
  latest: Product[]
  featured: Product[]
  categories: Category[]
  shipping: { flatRate: number | null; freeShippingThreshold: number | null }
  startingPrice: number | null
}

const imageOf = (product: Product) => {
  const first = product.images?.[0]
  if (typeof first === 'string') return { url: first, alt: '' }
  const url = mediaUrl(first, 'product')
  return url && first && typeof first === 'object' ? { url, alt: first.alt ?? '' } : null
}
const categoryOf = (product: Product) => (product.category && typeof product.category === 'object' ? product.category : null)
const usable = (product: Product) => product.inStock === true && imageOf(product) !== null
const lower = (title: string) => title.toLowerCase()
const joinNames = (names: string[]) => {
  const unique = [...new Set(names)]
  return unique.length > 1 ? `${unique.slice(0, -1).join(', ')} and ${unique[unique.length - 1]}` : unique[0]
}

export function buildHeroSlides({ latest, featured, categories, shipping, startingPrice }: Input): HeroSlide[] {
  const slides: HeroSlide[] = []
  const seen = new Map<Product['id'], Product>()
  for (const product of [...featured, ...latest]) if (!seen.has(product.id)) seen.set(product.id, product)
  const pool = [...seen.values()].filter(usable)

  // M102 (ADR-048): categories are flat, so a product's department is its own category.
  const topLevelOf = (product: Product) => {
    const category = categoryOf(product)
    if (!category) return null
    return categories.find((c) => String(c.id) === String(category.id)) ?? null
  }

  const deals = pool
    .map((product) => ({ product, off: discountPercent(product.mrp, product.price) }))
    .filter((d) => d.off > 0)
    .sort((a, b) => b.off - a.off)
    .slice(0, 2)
  if (deals.length > 0) {
    const names = deals.map((d) => categoryOf(d.product)?.title).filter((t): t is string => Boolean(t)).map(lower)
    const first = deals[0].product
    const tops = deals.map((d) => topLevelOf(d.product))
    const sameTop = tops[0] && tops.every((t) => t && t.id === tops[0]!.id)
    const target = sameTop ? tops[0]!.slug : categoryOf(first)?.slug
    slides.push({
      id: 'deals',
      badge: `Save up to ${deals[0].off}%`,
      badgeTone: 'sale',
      tone: 'green',
      title: names.length > 0 ? `Deals on ${joinNames(names)}` : 'Deals worth a look',
      text: `Up to ${deals[0].off}% off. Pay cash on delivery.`,
      cta: { href: target ? `/category/${target}?sort=disc` : '/shop', label: 'Shop deals' },
      images: deals.map((d) => imageOf(d.product)!),
    })
  }

  const newest = latest.filter(usable).slice(0, 2)
  if (newest.length > 0) {
    const names = newest.map((p) => categoryOf(p)?.title).filter((t): t is string => Boolean(t)).map(lower)
    slides.push({
      id: 'new',
      badge: 'New in',
      badgeTone: 'ink',
      tone: 'blue',
      title: names.length > 0 ? `New arrivals in ${joinNames(names)}` : 'New arrivals',
      text: 'Just added. No account needed, and you pay cash on delivery.',
      cta: { href: '/shop', label: "See what's new" },
      images: newest.map((p) => imageOf(p)!),
    })
  }

  const { flatRate, freeShippingThreshold } = shipping
  const used = new Set(slides.flatMap((s) => s.images.map((i) => i.url)))
  const picks = pool.filter((p) => !used.has(imageOf(p)!.url)).slice(0, 2)
  const pricesFrom = startingPrice !== null ? ` Prices from ${formatPKR(startingPrice)}.` : ''
  if (typeof flatRate === 'number' && picks.length > 0) {
    const free = flatRate === 0 || (typeof freeShippingThreshold === 'number' && freeShippingThreshold > 0)
    slides.push({
      id: 'delivery',
      badge: free ? 'Free delivery' : 'Delivery across Pakistan',
      badgeTone: 'ink',
      tone: 'grey',
      title:
        flatRate === 0
          ? 'Free delivery across Pakistan'
          : free
            ? `Free delivery on orders of ${formatPKR(freeShippingThreshold as number)} or more`
            : `Delivery across Pakistan for ${formatPKR(flatRate)}`,
      text: `Pay cash on delivery.${pricesFrom}`,
      cta: { href: '/shop', label: 'Start shopping' },
      images: picks.map((p) => imageOf(p)!),
    })
  }
  return slides
}

// M110 (ADR-050): a slide an admin created in /admin (collection heroSlides), as Payload returns it at depth 1.
export type AdminSlideDoc = {
  id: number | string
  title?: unknown
  text?: unknown
  badge?: unknown
  badgeTone?: unknown
  tone?: unknown
  ctaText?: unknown
  link?: unknown
  images?: unknown
}

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
// Same rule as the admin field (collections/PromoCards.ts validatePromoLink), checked again at read time:
// one leading "/", no "//", no "/\", no ":" and no whitespace or control characters.
const safePath = (value: string) =>
  value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') && !value.includes(':') && !/[\s\u0000-\u001f\u007f]/.test(value)

/** Maps admin slides to HeroSlide. A slide missing a required word or with an unsafe link is skipped, never patched up. */
export function adminSlidesToHero(docs: AdminSlideDoc[]): HeroSlide[] {
  const slides: HeroSlide[] = []
  for (const doc of docs) {
    const title = str(doc.title)
    const text = str(doc.text)
    const badge = str(doc.badge)
    const label = str(doc.ctaText)
    const href = str(doc.link)
    if (!title || !text || !badge || !label || !safePath(href)) continue
    const images = (Array.isArray(doc.images) ? doc.images : [])
      .map((item) => {
        const url = mediaUrl(item, 'hero')
        return url ? { url, alt: str((item as { alt?: unknown }).alt) } : null
      })
      .filter((item): item is { url: string; alt: string } => item !== null)
      .slice(0, 2)
    slides.push({
      id: `admin-${doc.id}`,
      badge,
      badgeTone: doc.badgeTone === 'sale' ? 'sale' : 'ink',
      tone: doc.tone === 'blue' || doc.tone === 'grey' ? doc.tone : 'green',
      title,
      text,
      cta: { href, label },
      images,
    })
  }
  return slides
}
