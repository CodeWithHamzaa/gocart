import Link from 'next/link'
import { PackageOpenIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProductCard from '@/components/ProductCard'
import Breadcrumb from '@/components/ui/Breadcrumb'
import EmptyState from '@/components/ui/EmptyState'
import { CategoryIcon, tintFor } from '@/lib/category-style'
import { getCategoryBySlug, getProductsByCategory } from '@/lib/payload/categories'
import type { Product } from '@/lib/payload/products'
import { getSettings } from '@/lib/payload/settings'
import { pageMetadata } from '@/lib/seo'

// M27a: server-rendered category detail + product listing route, per
// docs/CATEGORY_REQUIREMENTS.md and ADR-007. `.tsx`, not `.jsx`, per M2a's
// rule that new files are TypeScript.

// Rendered per request (M49). This route was designed static-by-default with `revalidate = 3600`
// (M27a), but it reads `searchParams` for `?page=N`, which a statically cached page cannot do:
// every category that existed at BUILD time worked, but a category created afterwards was
// rendered on demand and crashed in production with DYNAMIC_SERVER_USAGE (a 500) — found by
// running the production image, not by the dev server. The page is dynamic by nature, so it says
// so. Two consequences: no `generateStaticParams` (nothing to pre-render, and the image build no
// longer needs a database), and one cheap catalog query per request. Pagination, canonicals and
// 404s are unchanged. If this ever needs caching, split page 1 from `?page=N` or add on-demand
// revalidation (ADR-030/031).
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

function parsePage(raw: string | undefined): number {
  const page = Number(raw)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { page: pageParam } = await searchParams

  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const page = parsePage(pageParam)
  const result = await getProductsByCategory(slug, { page, limit: PAGE_SIZE })
  if (!result || (page > 1 && page > result.totalPages)) notFound()

  const { storeName } = await getSettings()
  const baseTitle = category.seo?.metaTitle || category.title
  // M41: a paginated page is its own indexable page (self-canonical), so it gets its own
  // title rather than repeating page 1's.
  const title = page > 1 ? `${baseTitle} - Page ${page}` : baseTitle
  const description =
    category.seo?.metaDescription || category.description || `Shop ${category.title} at ${storeName}.`
  const canonicalPath = page > 1 ? `/category/${slug}?page=${page}` : `/category/${slug}`

  return pageMetadata({ storeName, title, description, path: canonicalPath })
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

  const tint = tintFor(Number(category.id) || 0)
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Categories', href: '/categories' },
    ...(parent ? [{ label: parent.title, href: `/category/${parent.slug}` }] : []),
    { label: category.title },
  ]
  const pageLink = 'inline-flex items-center justify-center min-h-11 px-4 rounded-control bg-white ring-1 ring-line-2 text-ink-2 font-semibold hover:bg-primary-soft hover:text-primary-dark transition'
  const pageOff = 'inline-flex items-center justify-center min-h-11 px-4 rounded-control bg-line text-muted'

  // M63: the redesign. A tinted heading panel (title, description, and on a parent page its
  // subcategories as pills), the product count, a full-width grid and link-based pagination (a
  // "load more" button would need client fetching, and every page must stay its own crawlable URL).
  // No filter sidebar or sort control: they are Future Phase in docs/CATEGORY_REQUIREMENTS.md.
  return (
    <div className="mx-4 sm:mx-6">
      {page > 1 && <link rel="prev" href={pageHref(page - 1)} />}
      {page < totalPages && <link rel="next" href={pageHref(page + 1)} />}

      <div className="max-w-7xl mx-auto min-h-[70vh] pb-12">
        <div className="mt-2 sm:mt-4">
          <Breadcrumb items={crumbs} />
        </div>

        <section aria-labelledby="category-title" className={`relative mt-3 overflow-hidden rounded-panel px-5 py-7 sm:px-10 sm:py-9 ${tint.tile}`}>
          <CategoryIcon category={category} aria-hidden="true" size={140} strokeWidth={1} className={`pointer-events-none absolute -right-4 top-1/2 hidden -translate-y-1/2 opacity-60 sm:block ${tint.ink}`} />
          <div className="relative flex max-w-2xl flex-col gap-3">
            <h1 id="category-title" className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[44px]">{category.title}</h1>
            {category.description && <p className="text-[15px] text-ink-3">{category.description}</p>}

            {/* Child-category navigation: parent pages only */}
            {isParent && category.children.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-2">
                {category.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/category/${child.slug}`}
                    className="inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-semibold text-ink-2 transition hover:text-primary"
                  >
                    {child.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {products.length > 0 ? (
          <>
            <p className="mt-6 text-sm text-muted">
              Showing <strong className="text-ink">{totalDocs}</strong> product{totalDocs === 1 ? '' : 's'}
            </p>
            <div className="mt-4 mb-8 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-4">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 4} />
              ))}
            </div>
          </>
        ) : (
          <div className="mt-8">
            <EmptyState
              icon={<PackageOpenIcon size={28} />}
              title="No products in this category yet"
              text="Browse the other categories, or look through every product."
              action={{ href: '/categories', label: 'Browse categories' }}
            />
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="my-8 flex flex-wrap items-center justify-center gap-3 text-sm">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className={pageLink}>Previous</Link>
            ) : (
              <span aria-disabled="true" className={pageOff}>Previous</span>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={pageHref(n)}
                  aria-current={n === page ? 'page' : undefined}
                  className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-3 font-semibold ${n === page ? 'bg-primary text-white' : 'bg-white text-ink-2 ring-1 ring-line-2 hover:bg-primary-soft'}`}
                >
                  {n}
                </Link>
              ))}
            </div>
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className={pageLink}>Next</Link>
            ) : (
              <span aria-disabled="true" className={pageOff}>Next</span>
            )}
          </div>
        )}

        <p className="text-center text-xs text-muted">
          Page {page} of {Math.max(totalPages, 1)} — {totalDocs} product{totalDocs === 1 ? '' : 's'}
        </p>
      </div>
    </div>
  )
}
