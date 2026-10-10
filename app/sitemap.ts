import type { MetadataRoute } from 'next'
import { getTopLevelCategories } from '@/lib/payload/categories'
import { getProducts } from '@/lib/payload/products'
import { getSiteUrl } from '@/lib/site-url'

// M42: generated from the live catalog so it cannot drift from what the routes serve:
// home, /shop, /categories, every category (parent and child) and every product. Paginated
// category pages are not listed — they are reachable from page 1.
//
// Rendered per request (not at build time), like the home page: the production image build
// cannot assume a reachable database, and a new product should appear without a redeploy.
export const dynamic = 'force-dynamic'

// The sitemap protocol allows 50,000 URLs per file. The catalog is nowhere near that; if it
// ever is, this needs generateSitemaps() — the cap makes that a loud, visible limit instead
// of an invalid file.
const MAX_URLS = 50_000

type Dated = { updatedAt?: string | null }
const modified = (doc: Dated) => (doc.updatedAt ? new Date(doc.updatedAt) : undefined)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl()
  const [{ docs: products }, topLevel] = await Promise.all([
    getProducts({ limit: 0, sort: '-updatedAt' }),
    getTopLevelCategories(),
  ])

  const categories = topLevel.flatMap((parent) => [parent, ...parent.children])

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/` },
    { url: `${base}/shop` },
    { url: `${base}/categories` },
    ...categories.map((category) => ({
      url: `${base}/category/${category.slug}`,
      lastModified: modified(category as Dated),
    })),
    ...products.map((product) => ({
      url: `${base}/product/${product.id}`,
      lastModified: modified(product as unknown as Dated),
    })),
  ]

  return entries.slice(0, MAX_URLS)
}
