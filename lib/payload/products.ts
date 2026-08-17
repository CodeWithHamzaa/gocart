import { getPayload } from 'payload'
import config from '@payload-config'
import type { Category, Media } from './categories'

// M22: server-side data-fetching utility for Products. Uses Payload's Local API
// (in-process, no HTTP hop) — for Server Components, Route Handlers, and Server
// Actions only. Never import this from a 'use client' component; a client
// component that still needs product data should call Payload's REST/GraphQL
// API directly (already mounted and public-read per M13), not this file.
//
// Types below are hand-written, not generated — same reasoning as categories.ts.

export type Product = {
  id: number | string
  name: string
  description: string
  mrp: number
  price: number
  images: (Media | null | number | string)[]
  category: Category | null | number | string
  inStock: boolean
  isFeatured?: boolean | null
}

export type GetProductsOptions = {
  /** 0 = no pagination, return every match. Default 0. */
  limit?: number
  page?: number
  /**
   * Payload sort string(s), e.g. '-createdAt' for newest first. No default —
   * "best selling" has no defined ranking in the current schema (no sales
   * count or review data exists; Reviews are out of scope per ADR-016), so
   * this utility does not bake in a specific business meaning for it. M23,
   * which wires BestSelling.jsx, must choose and pass an explicit sort.
   */
  sort?: string | string[]
}

export type ProductsResult = {
  docs: Product[]
  page: number
  totalDocs: number
  totalPages: number
}

async function getClient() {
  return getPayload({ config })
}

/**
 * Products, optionally sorted/paginated. Powers the home page sections
 * (M23) and the shop listing (M24) — callers choose sort/limit for their
 * own purpose (e.g. sort: '-createdAt', limit: 4 for "latest").
 */
export async function getProducts(options: GetProductsOptions = {}): Promise<ProductsResult> {
  const { limit = 0, page = 1, sort } = options
  const payload = await getClient()

  const result = await payload.find({
    collection: 'products',
    limit,
    page,
    sort,
    depth: 1,
    overrideAccess: false,
  })

  return {
    docs: result.docs as Product[],
    page: result.page ?? page,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
  }
}

/**
 * Admin-curated products for the home page's "Best Selling" section (M23).
 *
 * Deliberately a curated flag rather than a computed ranking: there is no
 * sales-count field and nothing aggregates Orders, and Reviews — the dummy
 * data's original ranking basis — are out of scope for v1 (ADR-016). See
 * ADR-022 for why this is curated instead of derived.
 */
export async function getFeaturedProducts(
  options: Omit<GetProductsOptions, 'page'> = {},
): Promise<ProductsResult> {
  const { limit = 0, sort = '-createdAt' } = options
  const payload = await getClient()

  const result = await payload.find({
    collection: 'products',
    where: { isFeatured: { equals: true } },
    limit,
    sort,
    depth: 1,
    overrideAccess: false,
  })

  return {
    docs: result.docs as Product[],
    page: result.page ?? 1,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
  }
}

/**
 * A single product by id, for the product detail page (M25). Returns null
 * for an unknown id so the route can call notFound() instead of rendering
 * a blank page.
 */
export async function getProductById(id: number | string): Promise<null | Product> {
  const payload = await getClient()

  const product = await payload.findByID({
    collection: 'products',
    id,
    depth: 1,
    overrideAccess: false,
    disableErrors: true,
  })

  return (product as Product | undefined) ?? null
}
