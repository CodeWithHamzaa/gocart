import Link from "next/link"
import ProductCard from "@/components/ProductCard"
import { MoveLeftIcon } from "lucide-react"
import { getProducts } from "@/lib/payload/products"

// M24: server component reading real Payload data (ADR-007 — SEO-first is a
// non-negotiable default for storefront UI, not a later pass). The name
// filter stays a simple in-memory .includes() over the fetched list, exactly
// as it worked against the dummy Redux data — M29 is the milestone that
// replaces this with a real Payload query.
export default async function Shop({ searchParams }) {

    const { search } = await searchParams

    const { docs: products } = await getProducts()

    const filteredProducts = search
        ? products.filter(product =>
            product.name.toLowerCase().includes(search.toLowerCase())
        )
        : products;

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
                    {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
                </div>
            </div>
        </div>
    )
}
