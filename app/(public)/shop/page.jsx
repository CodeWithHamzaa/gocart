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
        <div className="min-h-[70vh] mx-6">
            <div className=" max-w-7xl mx-auto">
                <h1 className="text-2xl text-slate-500 my-6 flex items-center gap-2">
                    {search ? (
                        <Link href="/shop" className="flex items-center gap-2">
                            <MoveLeftIcon size={20} /> All <span className="text-slate-700 font-medium">Products</span>
                        </Link>
                    ) : (
                        <>All <span className="text-slate-700 font-medium">Products</span></>
                    )}
                </h1>
                <div className="grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto mb-32">
                    {products.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} />)}
                </div>
            </div>
        </div>
    )
}
