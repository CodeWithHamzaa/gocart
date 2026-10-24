import Link from "next/link"
import ProductCard from "@/components/ProductCard"
import { MoveLeftIcon } from "lucide-react"
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

    const { docs: products } = await getProducts({ search })

    return (
        <div className="min-h-[70vh] mx-4 sm:mx-6">
            <div className=" max-w-7xl mx-auto">
                <h1 className="text-[28px] sm:text-4xl font-extrabold tracking-[-0.02em] text-muted mt-2 mb-5 sm:mt-4 sm:mb-6 flex items-center gap-2">
                    {search ? (
                        <Link href="/shop" className="flex items-center gap-2 min-h-11">
                            <MoveLeftIcon size={20} /> All <span className="text-ink">Products</span>
                        </Link>
                    ) : (
                        <>All <span className="text-ink">Products</span></>
                    )}
                </h1>
                {/* M45a: a real grid instead of a wrapping row of fixed-width cards. M66: the redesign's auto-fill grid. */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-4 mb-12">
                    {products.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} />)}
                </div>
            </div>
        </div>
    )
}
