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
}

export type Category = {
  id: number | string
  title: string
  slug: string
  parent?: Category | null | number | string
  description?: null | string
  image?: Media | null | number | string
  seo?: {
    metaDescription?: null | string
    metaTitle?: null | string
  }
  displayOrder?: null | number
}

export type CategoryWithChildren = Category & { children: Category[] }

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
 * Top-level categories (no parent), each with its children resolved,
 * ordered by displayOrder then title. Backs /categories (M27b).
 */
export async function getTopLevelCategories(): Promise<CategoryWithChildren[]> {
  const payload = await getClient()

  const { docs: topLevel } = await payload.find({
    collection: 'categories',
    where: { parent: { exists: false } },
    sort: CATEGORY_ORDER,
    limit: 0,
    depth: 1,
    overrideAccess: false,
  })

  const withChildren = await Promise.all(
    topLevel.map(async (category) => {
      const { docs: children } = await payload.find({
        collection: 'categories',
        where: { parent: { equals: category.id } },
        sort: CATEGORY_ORDER,
        limit: 0,
        depth: 0,
        overrideAccess: false,
      })
      return { ...category, children } as CategoryWithChildren
    }),
  )

  return withChildren
}

/**
 * M61: the same read, memoised for one server request. The header's category row, the footer and
 * the page body all need the top-level categories, so they share a single fetch instead of three.
 * Read-only; the query above is unchanged.
 */
export const getTopLevelCategoriesCached = cache(getTopLevelCategories)

/**
 * A single category by slug, with its parent and children resolved, for the
 * page body and breadcrumbs. Returns null for an unknown slug so the route
 * can call notFound().
 */
export async function getCategoryBySlug(slug: string): Promise<CategoryWithChildren | null> {
  const payload = await getClient()

  const { docs } = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
    overrideAccess: false,
  })

  const category = docs[0]
  if (!category) return null

  const { docs: children } = await payload.find({
    collection: 'categories',
    where: { parent: { equals: category.id } },
    sort: CATEGORY_ORDER,
    limit: 0,
    depth: 0,
    overrideAccess: false,
  })

  return { ...category, children } as CategoryWithChildren
}

/**
 * Paginated products for a category. When the category is a parent (no
 * `parent` of its own), rolls up products filed under every child too — the
 * single implementation of "which products are in this category" per
 * ADR-013, shared by the category routes and the sitemap so they cannot
 * disagree. Returns null for an unknown slug.
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

  let categoryIds: (number | string)[] = [category.id]

  if (!category.parent) {
    const { docs: children } = await payload.find({
      collection: 'categories',
      where: { parent: { equals: category.id } },
      limit: 0,
      depth: 0,
      overrideAccess: false,
    })
    categoryIds = [category.id, ...children.map((child) => child.id)]
  }

  // M92: price range and price sort are database queries. The discount filter and sort compare
  // price with MRP, which Payload cannot express, so those fetch the matching rows and are
  // filtered, sorted and paged here. The plain listing (no filters) is the same query as before.
  const where: Where = {
    and: [
      { category: { in: categoryIds } },
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
    const rows = applyInMemory(all.docs, filters)
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
