import Link from "next/link"
import ProductCard from "@/components/ProductCard"
import { SearchXIcon } from "lucide-react"
import Breadcrumb from "@/components/ui/Breadcrumb"
import EmptyState from "@/components/ui/EmptyState"
import { getProducts } from "@/lib/payload/products"
import { getSettings } from "@/lib/payload/settings"
import { pageMetadata } from "@/lib/seo"

// M24: server component reading real Payload data (ADR-007 — SEO-first is a
// non-negotiable default for storefront UI, not a later pass). The name
// filter is a real Payload query (M29, ADR-025 — case-insensitive substring
// match on `name` only), not an in-memory filter over the full listing.
// M41: /shop is the canonical listing. A search result is not a page worth indexing (the
// query space is unbounded) so it is noindex and canonicalises to /shop; the title does not
// echo the query.
export async function generateMetadata({ searchParams }) {
    const { search } = await searchParams
    const { storeName } = await getSettings()
    return pageMetadata({
        storeName,
        title: search ? 'Search results' : 'Shop all products',
        description: 'Browse every product, with Cash on Delivery across Pakistan.',
        path: '/shop',
        noindex: Boolean(search),
    })
}

export default async function Shop({ searchParams }) {

    const { search } = await searchParams
    const query = search?.trim()

    const { docs: products } = await getProducts({ search })

    // M98: the same frame as a category page (breadcrumb, a plain heading, a product count), and a
    // search with no match says so and offers the way back instead of showing an empty page.
    const crumbs = query
        ? [{ label: 'Home', href: '/' }, { label: 'Products', href: '/shop' }, { label: 'Search results' }]
        : [{ label: 'Home', href: '/' }, { label: 'Products' }]

    return (
        <div className="min-h-[70vh] mx-4 sm:mx-6">
            <div className="max-w-7xl mx-auto pb-12">
                <div className="mt-2 sm:mt-4">
                    <Breadcrumb items={crumbs} />
                </div>
                <h1 className="mt-2 text-[28px] font-extrabold tracking-[-0.02em] text-ink sm:text-4xl [overflow-wrap:anywhere]">
                    {query ? <>Results for &ldquo;{query}&rdquo;</> : 'All products'}
                </h1>
                {products.length > 0 ? (
                    <>
                        <p className="mt-2 text-sm text-muted">
                            Showing <strong className="text-ink">{products.length}</strong> product{products.length === 1 ? '' : 's'}
                            {query && <> &middot; <Link href="/shop" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">Clear search</Link></>}
                        </p>
                        {/* M45a: a real grid instead of a wrapping row of fixed-width cards. M66: the redesign's auto-fill grid. */}
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-4">
                            {products.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} />)}
                        </div>
                    </>
                ) : (
                    <div className="mt-8">
                        <EmptyState
                            icon={<SearchXIcon size={28} />}
                            title={query ? 'No products match your search' : 'No products yet'}
                            text={query ? 'Check the spelling or try a shorter word.' : 'Check back soon.'}
                            action={query ? { href: '/shop', label: 'See all products' } : undefined}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
