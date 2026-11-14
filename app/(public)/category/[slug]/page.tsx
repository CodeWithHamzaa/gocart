import Image from 'next/image'
import Link from 'next/link'
import { PackageOpenIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProductCard from '@/components/ProductCard'
import Breadcrumb from '@/components/ui/Breadcrumb'
import CategoryControls from '@/components/ui/CategoryControls'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import { mediaUrl } from '@/lib/media'
import { filtersToQuery, isRefined, parseCategoryFilters } from '@/lib/category-filters'
import { CategoryIcon } from '@/lib/category-style'
import { getCategoryBySlug, getProductsByCategory } from '@/lib/payload/categories'
import type { Product } from '@/lib/payload/products'
import { getSettings } from '@/lib/payload/settings'
import { pageMetadata, shareImages } from '@/lib/seo'

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
  searchParams: Promise<{ max?: string; min?: string; off?: string; page?: string; sort?: string }>
}

function parsePage(raw: string | undefined): number {
  const page = Number(raw)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const pageParam = sp.page
  const filters = parseCategoryFilters(sp)

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
  // M92: a sorted or filtered view is a variant of the plain listing, not a page of its own: it is
  // not indexed and its canonical is the plain listing, so search engines never see the combinations.
  const refined = isRefined(filters)
  const canonicalPath = !refined && page > 1 ? `/category/${slug}?page=${page}` : `/category/${slug}`

  // M107: the category's own photo, else the first product's photo on this page.
  const firstProduct = result.docs[0] as { images?: unknown[] } | undefined
  return pageMetadata({
    storeName,
    title,
    description,
    path: canonicalPath,
    noindex: refined,
    images: shareImages(category.image, firstProduct?.images?.[0]),
  })
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const sp = await searchParams
  const page = parsePage(sp.page)
  const filters = parseCategoryFilters(sp)
  const refined = isRefined(filters)

  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const result = await getProductsByCategory(slug, { filters, page, limit: PAGE_SIZE })
  if (!result) notFound()

  const { totalDocs, totalPages } = result
  const products = result.docs as Product[]

  // A page beyond the last real page is out of range (never a valid empty
  // state — page 1 is the only page allowed to be legitimately empty).
  if (page > 1 && page > totalPages) notFound()

  const basePath = `/category/${slug}`
  const pageHref = (targetPage: number) => {
    const query = filtersToQuery(filters, targetPage)
    return query ? `${basePath}?${query}` : basePath
  }

  const bannerImage = mediaUrl(category.image, 'category')
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Categories', href: '/categories' },
    { label: category.title },
  ]
  // M101: pill pagination in the home page's style (lavender pills, the current page in violet).
  const pageLink = 'inline-flex items-center justify-center min-h-11 px-5 rounded-full border border-line-2 bg-surface text-ink font-semibold hover:bg-accent-soft hover:text-primary-dark transition'
  const pageOff = 'inline-flex items-center justify-center min-h-11 px-5 rounded-full border border-line bg-surface text-muted'

  // M63: the redesign. A tinted heading panel (title and description; M102 removed the sub-category
  // pills, ADR-048), the product count, a full-width grid and link-based pagination (a
  // "load more" button would need client fetching, and every page must stay its own crawlable URL).
  // M92 adds a sort and a price / discount filter (CategoryControls). The design's size, colour and
  // delivery filters have no data behind them, so they stay Future Phase (CATEGORY_REQUIREMENTS.md).
  return (
    <div className="mx-4 sm:mx-6">
      {!refined && page > 1 && <link rel="prev" href={pageHref(page - 1)} />}
      {!refined && page < totalPages && <link rel="next" href={pageHref(page + 1)} />}

      <div className="max-w-7xl mx-auto min-h-[70vh] pb-12">
        <div className="mt-2 sm:mt-4">
          <Breadcrumb items={crumbs} />
        </div>

        {/* Milestone 119: the shared page header (plain title, one-line description, count) replaces the
            tinted banner. The category's own photo stays as a small round inset from `sm`, as on the
            home page's category circles (M107: the icon stands in when there is no photo). */}
        <PageHeader
          banner
          id="category-title"
          title={category.title}
          description={category.description}
          meta={
            <>
              <strong className="text-ink">{totalDocs}</strong> product{totalDocs === 1 ? '' : 's'}
              {refined && (totalDocs === 1 ? ' matches' : ' match')}
            </>
          }
          aside={
            <span aria-hidden="true" className="hidden size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted text-ink-3 sm:flex lg:absolute lg:right-14 lg:top-1/2 lg:size-40 lg:-translate-y-1/2 lg:bg-surface lg:shadow-float-sm">
              {bannerImage ? (
                <Image src={bannerImage} alt="" width={320} height={320} sizes="(min-width: 1024px) 160px, 96px" className="size-full object-cover" />
              ) : (
                <CategoryIcon category={category} size={44} strokeWidth={1.3} className="lg:size-[72px]" />
              )}
            </span>
          }
        />

        {(products.length > 0 || refined) && (
          <div className="mt-5 lg:mt-6">
            <CategoryControls basePath={basePath} filters={filters} />
          </div>
        )}

        {products.length > 0 ? (
          <>
            {/* From `lg` the count sits here, under the filters, as it did before the banner came back. */}
            <p className="mt-6 hidden text-sm text-muted lg:block">
              Showing <strong className="text-ink">{totalDocs}</strong> product{totalDocs === 1 ? '' : 's'}
            </p>
            <h2 className="sr-only">Products</h2>
            <div className="mt-6 mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:mt-4 lg:grid-cols-4 lg:gap-6">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 4} showCategory={false} />
              ))}
            </div>
          </>
        ) : refined ? (
          <div className="mt-8">
            <EmptyState
              icon={<PackageOpenIcon size={28} />}
              title="No products match these filters"
              text="Try a wider price range or a lower discount."
              action={{ href: basePath, label: 'Clear all filters' }}
            />
          </div>
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
                  className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 font-semibold ${n === page ? 'bg-primary text-white' : 'border border-line-2 bg-surface text-ink hover:bg-accent-soft'}`}
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

        {totalPages > 1 && (
          <p className="text-center text-xs text-muted">
            Page {page} of {totalPages} — {totalDocs} product{totalDocs === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </div>
  )
}
