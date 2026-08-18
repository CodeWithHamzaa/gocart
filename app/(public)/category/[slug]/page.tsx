import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProductCard from '@/components/ProductCard'
import {
  getCategoryBySlug,
  getTopLevelCategories,
  getProductsByCategory,
} from '@/lib/payload/categories'
import type { Product } from '@/lib/payload/products'

// M27a: server-rendered category detail + product listing route, per
// docs/CATEGORY_REQUIREMENTS.md and ADR-007. `.tsx`, not `.jsx`, per M2a's
// rule that new files are TypeScript.

// Static-by-default, revalidated rather than rendered per request — the
// requirements doc's explicit choice for this route, unlike M23's home page
// (which needs per-request freshness for admin isFeatured curation). Category
// edits are infrequent and slugs are stable, so an hour-old page is an
// acceptable staleness window; revisit alongside M45's caching pass.
export const revalidate = 3600

const PAGE_SIZE = 24

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

function parsePage(raw: string | undefined): number {
  const page = Number(raw)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

// Every published category slug (parent and child) — there is no
// publish/draft field on Categories, so this is simply every category.
export async function generateStaticParams() {
  const topLevel = await getTopLevelCategories()
  const slugs = topLevel.flatMap((category) => [
    category.slug,
    ...category.children.map((child) => child.slug),
  ])
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { page: pageParam } = await searchParams

  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const page = parsePage(pageParam)
  const result = await getProductsByCategory(slug, { page, limit: PAGE_SIZE })
  if (!result || (page > 1 && page > result.totalPages)) notFound()

  const title = category.seo?.metaTitle || category.title
  const description =
    category.seo?.metaDescription || category.description || `Shop ${category.title} at gocart.`
  const canonicalPath = page > 1 ? `/category/${slug}?page=${page}` : `/category/${slug}`

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
  }
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = parsePage(pageParam)

  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const result = await getProductsByCategory(slug, { page, limit: PAGE_SIZE })
  if (!result) notFound()

  const { totalDocs, totalPages } = result
  const products = result.docs as Product[]

  // A page beyond the last real page is out of range (never a valid empty
  // state — page 1 is the only page allowed to be legitimately empty).
  if (page > 1 && page > totalPages) notFound()

  const isParent = !category.parent
  const parent =
    typeof category.parent === 'object' && category.parent ? category.parent : null

  const basePath = `/category/${slug}`
  const pageHref = (targetPage: number) =>
    targetPage > 1 ? `${basePath}?page=${targetPage}` : basePath

  return (
    <div className="mx-6">
      {page > 1 && <link rel="prev" href={pageHref(page - 1)} />}
      {page < totalPages && <link rel="next" href={pageHref(page + 1)} />}

      <div className="max-w-7xl mx-auto min-h-[70vh]">
        {/* Breadcrumb */}
        <div className="text-gray-600 text-sm mt-8 mb-5">
          <Link href="/">Home</Link> / <Link href="/categories">Categories</Link>
          {parent ? (
            <>
              {' '}/ <Link href={`/category/${parent.slug}`}>{parent.title}</Link> / {category.title}
            </>
          ) : (
            <> / {category.title}</>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800">{category.title}</h1>
        {category.description && (
          <p className="text-slate-500 text-sm mt-2 max-w-2xl">{category.description}</p>
        )}

        {/* Child-category navigation — parent pages only */}
        {isParent && category.children.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-6">
            {category.children.map((child) => (
              <Link
                key={child.id}
                href={`/category/${child.slug}`}
                className="px-4 py-2 bg-slate-100 rounded-lg text-slate-600 text-sm hover:bg-slate-600 hover:text-white transition-all"
              >
                {child.title}
              </Link>
            ))}
          </div>
        )}

        {/* Product grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 xl:gap-8 my-10">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-24 text-slate-500">
            <p>No products in this category yet.</p>
            <div className="flex gap-4 text-sm">
              <Link href="/categories" className="text-green-600">Browse categories</Link>
              <Link href="/shop" className="text-green-600">View all products</Link>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 my-10 text-sm text-slate-600">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200">Previous</Link>
            ) : (
              <span className="px-3 py-1.5 rounded bg-slate-50 text-slate-300">Previous</span>
            )}
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={pageHref(n)}
                  aria-current={n === page ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded ${n === page ? 'bg-slate-800 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
                >
                  {n}
                </Link>
              ))}
            </div>
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200">Next</Link>
            ) : (
              <span className="px-3 py-1.5 rounded bg-slate-50 text-slate-300">Next</span>
            )}
          </div>
        )}

        <p className="text-xs text-slate-400 text-center mb-10">
          Page {page} of {Math.max(totalPages, 1)} — {totalDocs} product{totalDocs === 1 ? '' : 's'}
        </p>
      </div>
    </div>
  )
}
