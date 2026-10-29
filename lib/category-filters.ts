// M92: sort and filter for a category listing, read from the URL (`?sort=&min=&max=&off=`). Pure
// functions: the page parses the query, the Payload helper applies it. Anything unrecognised is
// ignored, never an error, so a hand-edited URL still shows the plain category.

export const SORTS = ['rec', 'low', 'high', 'disc'] as const
export type CategorySort = (typeof SORTS)[number]

export const SORT_LABELS: Record<CategorySort, string> = {
  rec: 'Recommended',
  low: 'Price: low to high',
  high: 'Price: high to low',
  disc: 'Biggest discount',
}

export const DISCOUNT_STEPS = [10, 25, 40] as const

export type CategoryFilters = {
  sort: CategorySort
  minPrice?: number
  maxPrice?: number
  /** Minimum real discount in percent (price against MRP). */
  minDiscount?: number
}

type RawParams = { sort?: string; min?: string; max?: string; off?: string }

const MAX_PRICE = 10_000_000

function wholeNumber(value: string | undefined): number | undefined {
  if (!value || !/^\d{1,8}$/.test(value)) return undefined
  const n = Number(value)
  return n <= MAX_PRICE ? n : undefined
}

export function parseCategoryFilters(raw: RawParams): CategoryFilters {
  const sort = (SORTS as readonly string[]).includes(raw.sort ?? '') ? (raw.sort as CategorySort) : 'rec'
  let minPrice = wholeNumber(raw.min)
  let maxPrice = wholeNumber(raw.max)
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    ;[minPrice, maxPrice] = [maxPrice, minPrice]
  }
  const off = Number(raw.off)
  const minDiscount = (DISCOUNT_STEPS as readonly number[]).includes(off) ? off : undefined
  return { sort, minPrice, maxPrice, minDiscount }
}

export function hasActiveFilters(f: CategoryFilters): boolean {
  return f.minPrice !== undefined || f.maxPrice !== undefined || f.minDiscount !== undefined
}

/** True when the URL carries any sort or filter, i.e. it is a variant of the plain category page. */
export function isRefined(f: CategoryFilters): boolean {
  return f.sort !== 'rec' || hasActiveFilters(f)
}

/** Query string (no leading "?") for the active sort and filters, plus an optional page. */
export function filtersToQuery(f: CategoryFilters, page = 1): string {
  const q = new URLSearchParams()
  if (f.sort !== 'rec') q.set('sort', f.sort)
  if (f.minPrice !== undefined) q.set('min', String(f.minPrice))
  if (f.maxPrice !== undefined) q.set('max', String(f.maxPrice))
  if (f.minDiscount !== undefined) q.set('off', String(f.minDiscount))
  if (page > 1) q.set('page', String(page))
  return q.toString()
}

type Priced = { mrp?: null | number; price: number }

/** Whole-percent discount from the MRP; 0 when there is no real discount. */
export function discountPercent(p: Priced): number {
  if (typeof p.mrp !== 'number' || p.mrp <= p.price || p.mrp <= 0) return 0
  return Math.round((1 - p.price / p.mrp) * 100)
}

/** The discount filter and sort need a value Payload cannot query, so they run on fetched rows. */
export function needsInMemory(f: CategoryFilters): boolean {
  return f.minDiscount !== undefined || f.sort === 'disc'
}

export function applyInMemory<T extends Priced>(docs: T[], f: CategoryFilters): T[] {
  let out = docs
  if (f.minDiscount !== undefined) out = out.filter((p) => discountPercent(p) >= f.minDiscount!)
  if (f.sort === 'disc') {
    out = [...out].sort((a, b) => discountPercent(b) - discountPercent(a) || a.price - b.price)
  }
  return out
}
