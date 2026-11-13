import Link from "next/link"
import ProductCard from "@/components/ProductCard"
import { SearchXIcon } from "lucide-react"
import Breadcrumb from "@/components/ui/Breadcrumb"
import EmptyState from "@/components/ui/EmptyState"
import LoadMoreLink from "@/components/ui/LoadMoreLink"
import PageHeader from "@/components/ui/PageHeader"
import SortControl from "@/components/ui/SortControl"
import { parseCategoryFilters } from "@/lib/category-filters"
import { getCategoriesCached } from "@/lib/payload/categories"
import { getProducts, getProductsSorted } from "@/lib/payload/products"
import { getSettings } from "@/lib/payload/settings"
import { pageMetadata, shareImages } from "@/lib/seo"

// M24: server component reading real Payload data (ADR-007 — SEO-first is a
// non-negotiable default for storefront UI, not a later pass). The name
// filter is a real Payload query (M29, ADR-025 — case-insensitive substring
// match on `name` only), not an in-memory filter over the full listing.
// M41: /shop is the canonical listing. A search result is not a page worth indexing (the
// query space is unbounded) so it is noindex and canonicalises to /shop; the title does not
// echo the query.
export async function generateMetadata({ searchParams }) {
    const { search, sort } = await searchParams
    const { storeName } = await getSettings()
    // Milestone 119: a sorted view is a variant of the plain listing, like a search, so it is not indexed either.
    const refined = Boolean(search) || parseCategoryFilters({ sort }).sort !== 'rec'
    // M107: the share image is the newest product's photo. A search is noindex, so it gets none.
    const newest = refined ? undefined : (await getProducts({ sort: '-createdAt', limit: 1 })).docs[0]
    return pageMetadata({
        storeName,
        title: search ? 'Search results' : 'Shop all products',
        description: 'Browse every product, with Cash on Delivery across Pakistan.',
        path: '/shop',
        noindex: refined,
        images: shareImages(newest?.images?.[0]),
    })
}

// 12 per step (three rows of four). "Load more" is a real link to ?page=N+1, and page N renders the first
// N x 12 products, so it works without JavaScript, a crawler can follow it, and a reload or a shared
// link shows the same list. The link keeps the scroll position, so new cards appear under the old ones.
// The page number only ever widens the list; the canonical stays /shop (see generateMetadata).
const PAGE_SIZE = 12

function parsePage(raw) {
    const page = Number(raw)
    return Number.isInteger(page) && page >= 1 ? Math.min(page, 100) : 1
}

export default async function Shop({ searchParams }) {

    const { search, sort: sortParam, page: pageParam } = await searchParams
    const query = search?.trim()
    const page = parsePage(pageParam)
    // Milestone 119: the category page's four orders, read from ?sort=. Anything unknown is "Recommended".
    const { sort } = parseCategoryFilters({ sort: sortParam })

    const { docs: products, totalDocs } = await getProductsSorted(sort, { search, limit: PAGE_SIZE * page })
    // Only an empty search needs the category list (to offer a way on), so the plain page never reads it.
    const categories = products.length === 0 && query ? await getCategoriesCached().catch(() => []) : []
    const hasMore = products.length < totalDocs
    const nextHref = `/shop?${new URLSearchParams({ ...(query ? { search: query } : {}), ...(sort !== 'rec' ? { sort } : {}), page: String(page + 1) })}`

    // M98: the same frame as a category page (breadcrumb, a plain heading, a product count), and a
    // search with no match says so and offers the way back instead of showing an empty page.
    const crumbs = query
        ? [{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }, { label: 'Search results' }]
        : [{ label: 'Home', href: '/' }, { label: 'Shop' }]

    return (
        <div className="min-h-[70vh] mx-4 sm:mx-6">
            <div className="max-w-7xl mx-auto pb-12">
                <div className="mt-2 sm:mt-4">
                    <Breadcrumb items={crumbs} />
                </div>
                <PageHeader
                    title={query ? <>Results for &ldquo;{query}&rdquo;</> : 'All products'}
                    meta={products.length > 0 ? (
                        <>
                            {query
                                ? <><strong className="text-ink">{totalDocs}</strong> result{totalDocs === 1 ? '' : 's'}</>
                                : <>Showing <strong className="text-ink">{products.length}</strong> of <strong className="text-ink">{totalDocs}</strong> product{totalDocs === 1 ? '' : 's'}</>}
                            {query && <> &middot; <Link href="/shop" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline hover:underline-offset-4">Clear search</Link></>}
                        </>
                    ) : undefined}
                />
                {products.length > 0 ? (
                    <>
                        <div className="mt-5">
                            <SortControl action="/shop" sort={sort} keep={query ? { search: query } : {}} />
                        </div>
                        {/* M45a: a real grid instead of a wrapping row of fixed-width cards. M66: the redesign's auto-fill grid. M111: 2 / 3 / 4 columns. */}
                        <h2 className="sr-only">Products</h2>
                        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-6">
                            {products.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} />)}
                        </div>
                        {hasMore && (
                            <div className="mt-10 flex flex-col items-center gap-3">
                                <p className="text-sm text-muted">You&rsquo;ve seen {products.length} of {totalDocs}</p>
                                <div aria-hidden="true" className="h-1 w-48 overflow-hidden rounded-full bg-line">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((products.length / totalDocs) * 100)}%` }} />
                                </div>
                                <LoadMoreLink href={nextHref} />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="mt-8">
                        <EmptyState
                            icon={<SearchXIcon size={28} />}
                            title={query ? 'No products match your search' : 'No products yet'}
                            text={query ? 'Check the spelling or try a shorter word.' : 'Check back soon.'}
                            action={query ? { href: '/shop', label: 'See all products' } : undefined}
                        />
                        {categories.length > 0 && (
                            <nav aria-label="Browse by category" className="mx-auto mt-8 max-w-2xl text-center">
                                <h2 className="text-sm font-semibold text-ink">Or browse a category</h2>
                                <ul className="mt-3 flex flex-wrap justify-center gap-2">
                                    {categories.map((category) => (
                                        <li key={category.id}>
                                            <Link href={`/category/${category.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-line-2 bg-surface px-4 text-sm font-semibold text-ink hover:border-line-3 hover:bg-surface-muted">
                                                {category.title}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
