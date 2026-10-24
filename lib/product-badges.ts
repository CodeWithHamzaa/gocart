// M69: the one rule for the badges on a product, used by the card and the product page so they can
// never disagree. Pure and client-safe (no Payload import). Every badge comes from a real field:
//   - the discount chip from mrp and price (never invented);
//   - the status pill, at most ONE, by precedence: Out of stock > admin label > Featured.
// "Featured" is the admin's `isFeatured` flag (ADR-022), a curated list: it is never called
// "Best seller" or "Popular". `label` is the optional admin label that M70 (schema) may add; until a
// product carries one it is simply absent here.
export type BadgeTone = 'off' | 'neutral' | 'primary' | 'success' | 'limited' | 'sale'

export type StatusBadge = { text: string; tone: BadgeTone }

type BadgeInput = {
  inStock?: boolean | null
  isFeatured?: boolean | null
  label?: 'new' | 'limited' | 'sale' | null
  mrp?: number | null
  price?: number | null
}

const LABELS: Record<NonNullable<BadgeInput['label']>, StatusBadge> = {
  new: { text: 'New', tone: 'primary' },
  limited: { text: 'Limited edition', tone: 'limited' },
  sale: { text: 'Sale', tone: 'sale' },
}

/** Whole-number percent off, or 0 when there is no real discount (mrp must exceed price, and round to 1% or more). */
export function discountPercent(mrp?: number | null, price?: number | null): number {
  if (typeof mrp !== 'number' || typeof price !== 'number' || !(mrp > price) || mrp <= 0) return 0
  const percent = Math.round(((mrp - price) / mrp) * 100)
  return percent >= 1 ? percent : 0
}

/** The single status pill for a product, or null. Fail closed: only an explicit `inStock === true` is in stock. */
export function statusBadge(product: BadgeInput): StatusBadge | null {
  if (product.inStock !== true) return { text: 'Out of stock', tone: 'neutral' }
  if (product.label && LABELS[product.label]) return LABELS[product.label]
  if (product.isFeatured === true) return { text: 'Featured', tone: 'primary' }
  return null
}
