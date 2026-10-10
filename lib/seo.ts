import type { Metadata } from 'next'
import { getSiteUrl } from './site-url'

// M41–M43: the one place per-page metadata and structured data are built, so every
// storefront route follows the same canonical / Open Graph conventions. Pure functions;
// the site origin comes only from NEXT_PUBLIC_SITE_URL (lib/site-url.ts), never a literal.

export const DEFAULT_DESCRIPTION =
  'Shop gadgets and accessories online with Cash on Delivery across Pakistan.'

/** Absolute URL for a site path, or the input unchanged if it is already absolute. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${getSiteUrl()}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

/**
 * Plain-text snippet for <meta name="description"> / OG: tags and runs of whitespace
 * collapsed, cut at a word boundary with an ellipsis when longer than `max`.
 */
export function plainDescription(text: unknown, max = 155): string {
  const flat = (typeof text === 'string' ? text : '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:-]+$/, '')}…`
}

type PageMetaInput = {
  storeName: string
  /** Page title without the site name (the layout template appends it). */
  title: string
  description: string
  /** Canonical path, e.g. "/shop" or "/category/speakers?page=2". */
  path: string
  /** Absolute or site-relative image URLs; the first is the share image. */
  images?: string[]
  noindex?: boolean
}

/**
 * Metadata with the site-wide conventions applied: a canonical, and Open Graph / Twitter
 * fields that always carry siteName, type and locale. Next.js replaces a parent's
 * `openGraph` object wholesale when a page sets its own, so every page must restate them —
 * this helper is how they are never forgotten.
 */
export function pageMetadata(input: PageMetaInput): Metadata {
  const { storeName, title, description, path, images = [], noindex } = input
  const fullTitle = `${title} | ${storeName}`
  return {
    title,
    description,
    alternates: { canonical: path },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'website',
      siteName: storeName,
      locale: 'en_PK',
      title: fullTitle,
      description,
      url: path,
      ...(images.length > 0 ? { images } : {}),
    },
    twitter: {
      card: images.length > 0 ? 'summary_large_image' : 'summary',
      title: fullTitle,
      description,
      ...(images.length > 0 ? { images } : {}),
    },
  }
}

type ProductForLd = {
  id: number | string
  name: string
  description: string
  price: number
  inStock: boolean
  images: unknown[]
}

/**
 * schema.org Product with an Offer, from real product data only. Deliberately omitted
 * because the store has no such data (and inventing it would be a false claim): ratings
 * and reviews (ADR-016), brand, GTIN, item condition, return policy and shipping details
 * (delivery is a flat rate with a free threshold, ADR-018, which one simple
 * OfferShippingDetails cannot state truthfully).
 */
export function productJsonLd(product: ProductForLd): Record<string, unknown> {
  const url = absoluteUrl(`/product/${product.id}`)
  const images = product.images
    .map((image) => (typeof image === 'object' && image ? (image as { url?: string }).url : undefined))
    .filter((u): u is string => typeof u === 'string' && u.length > 0)
    .map(absoluteUrl)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: plainDescription(product.description, 5000),
    sku: String(product.id),
    url,
    ...(images.length > 0 ? { image: images } : {}),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'PKR',
      price: product.price,
      availability:
        product.inStock === true ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  }
}

/**
 * JSON for a <script type="application/ld+json"> body. Product names and descriptions are
 * admin-entered text; escaping `<` (and the two line separators) means no value can close
 * the script element or break out of it.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
