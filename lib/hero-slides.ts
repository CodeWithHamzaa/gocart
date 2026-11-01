import { discountPercent } from './product-badges'
import { formatPKR } from './currency'
import type { Product } from './payload/products'
import type { CategoryWithChildren } from './payload/categories'

// M101: the home banner's slides, built only from real data (pure, no Payload import). A slide whose data
// is missing is left out, never filled with a made-up claim:
// - deals: the two in-stock products with the biggest real discount (price against MRP) among the ones the
//   home page already loaded; the badge's "up to" is the larger of those two;
// - new arrivals: the two newest in-stock products;
// - delivery: the Settings free-delivery threshold and the store's lowest price.
export type HeroSlide = {
  id: 'deals' | 'new' | 'delivery'
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
  topLevel: CategoryWithChildren[]
  shipping: { flatRate: number | null; freeShippingThreshold: number | null }
  startingPrice: number | null
}

const imageOf = (product: Product) => {
  const first = product.images?.[0]
  if (typeof first === 'string') return { url: first, alt: '' }
  return first && typeof first === 'object' && first.url ? { url: first.url, alt: first.alt ?? '' } : null
}
const categoryOf = (product: Product) => (product.category && typeof product.category === 'object' ? product.category : null)
const usable = (product: Product) => product.inStock === true && imageOf(product) !== null
const lower = (title: string) => title.toLowerCase()
const joinNames = (names: string[]) => {
  const unique = [...new Set(names)]
  return unique.length > 1 ? `${unique.slice(0, -1).join(', ')} and ${unique[unique.length - 1]}` : unique[0]
}

export function buildHeroSlides({ latest, featured, topLevel, shipping, startingPrice }: Input): HeroSlide[] {
  const slides: HeroSlide[] = []
  const seen = new Map<Product['id'], Product>()
  for (const product of [...featured, ...latest]) if (!seen.has(product.id)) seen.set(product.id, product)
  const pool = [...seen.values()].filter(usable)

  const topLevelOf = (product: Product) => {
    const category = categoryOf(product)
    if (!category) return null
    const parentId = category.parent && typeof category.parent === 'object' ? category.parent.id : category.parent
    return topLevel.find((c) => String(c.id) === String(parentId ?? category.id)) ?? null
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
      text: 'Real discounts on prices you can check against the original. Pay in cash when it arrives.',
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
      text: 'Just added to the store. Order without an account and pay when it arrives.',
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
      text: `Pay in cash when your order arrives.${pricesFrom}`,
      cta: { href: '/shop', label: 'Start shopping' },
      images: picks.map((p) => imageOf(p)!),
    })
  }
  return slides
}
