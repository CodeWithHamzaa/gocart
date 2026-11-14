import { cache } from 'react'
import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import { applyInMemory, needsInMemory, type CategoryFilters } from '@/lib/category-filters'

// M22: server-side data-fetching utility for Categories. Uses Payload's Local API
// (in-process, no HTTP hop) — for Server Components, Route Handlers, and Server
// Actions only. Never import this from a 'use client' component; a client
// component that still needs category data should call Payload's REST/GraphQL
// API directly (already mounted and public-read per M13), not this file.
//
// Types below are hand-written, not generated. `payload generate:types` could not
// be run in the authoring sandbox — the same Node/tsx ESM-interop class of issue
// documented for `generate:importmap` (M3) and `scripts/seed.ts` (M13). These
// mirror collections/Categories.ts and collections/Media.ts exactly; swap for
// payload-types.ts once it can be generated in a normal environment.

export type Media = {
  id: number | string
  url?: null | string
  alt?: null | string
  /** M124: generated sizes (collections/Media.ts `imageSizes`); absent on media uploaded before M124. */
  sizes?: null | Partial<Record<'product' | 'category' | 'hero', null | { url?: null | string }>>
}

export type Category = {
  id: number | string
  title: string
  slug: string
  description?: null | string
  image?: Media | null | number | string
  seo?: {
    metaDescription?: null | string
    metaTitle?: null | string
  }
  displayOrder?: null | number
}

export type ProductsByCategoryResult = {
  docs: unknown[]
  page: number
  totalDocs: number
  totalPages: number
}

const CATEGORY_ORDER = ['displayOrder', 'title']

async function getClient() {
  return getPayload({ config })
}

/**
 * Every category, ordered by displayOrder then title. Backs /categories (M27b), the header's
 * category row, the footer, the home page and the sitemap.
 * M102 (ADR-048): categories are flat (no parent, no children), so this is one query.
 */
export async function getCategories(): Promise<Category[]> {
  const payload = await getClient()

  const { docs } = await payload.find({
    collection: 'categories',
    sort: CATEGORY_ORDER,
    limit: 0,
    // depth 1 so a category's image is a Media object (the home page's shortcuts and /categories show it).
    depth: 1,
    overrideAccess: false,
  })

  return docs as Category[]
}

/**
 * M61: the same read, memoised for one server request. The header's category row, the footer and
 * the page body all need the categories, so they share a single fetch instead of three.
 */
export const getCategoriesCached = cache(getCategories)

/**
 * A single category by slug, for the page body and breadcrumbs. Returns null for an unknown slug so
 * the route can call notFound().
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const payload = await getClient()

  const { docs } = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
    overrideAccess: false,
  })

  return (docs[0] as Category | undefined) ?? null
}

/**
 * Paginated products for a category: the products filed under it. The single implementation of
 * "which products are in this category", shared by the category routes and the sitemap so they
 * cannot disagree. M102 (ADR-048): no parent roll-up any more, since categories are flat.
 * Returns null for an unknown slug.
 */
export async function getProductsByCategory(
  slug: string,
  {
    filters = { sort: 'rec' },
    limit = 24,
    page = 1,
  }: { filters?: CategoryFilters; limit?: number; page?: number } = {},
): Promise<null | ProductsByCategoryResult> {
  const payload = await getClient()

  const { docs: matches } = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
  })

  const category = matches[0]
  if (!category) return null

  // M92: price range and price sort are database queries. The discount filter and sort compare
  // price with MRP, which Payload cannot express, so those fetch the matching rows and are
  // filtered, sorted and paged here. The plain listing (no filters) is the same query as before.
  const where: Where = {
    and: [
      { category: { equals: category.id } },
      ...(filters.minPrice !== undefined ? [{ price: { greater_than_equal: filters.minPrice } }] : []),
      ...(filters.maxPrice !== undefined ? [{ price: { less_than_equal: filters.maxPrice } }] : []),
    ],
  }
  const dbSort = filters.sort === 'low' ? 'price' : filters.sort === 'high' ? '-price' : undefined

  if (needsInMemory(filters)) {
    const all = await payload.find({
      collection: 'products',
      where,
      sort: dbSort,
      limit: 0,
      depth: 1,
      overrideAccess: false,
    })
    const rows = applyInMemory(all.docs as Array<(typeof all.docs)[number] & { mrp?: null | number; price: number }>, filters)
    const totalPages = Math.max(Math.ceil(rows.length / limit), 1)
    return {
      docs: rows.slice((page - 1) * limit, page * limit),
      page,
      totalDocs: rows.length,
      totalPages,
    }
  }

  const result = await payload.find({
    collection: 'products',
    where,
    sort: dbSort,
    page,
    limit,
    depth: 1,
    overrideAccess: false,
  })

  return {
    docs: result.docs,
    page: result.page ?? page,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
  }
}
