import Link from "next/link";
import ProductDescription from "@/components/ProductDescription";
import ProductDetails from "@/components/ProductDetails";
import { getProductById } from "@/lib/payload/products";
import { notFound } from "next/navigation";

// M25: server component reading a real per-product fetch (ADR-007 — SEO-first
// is a non-negotiable default, matching the M23/M24 precedent). force-dynamic
// for the same reason as M23's home page: admin edits to price/stock must
// show without a redeploy, and the production build (M49) cannot assume a
// reachable database.
export const dynamic = 'force-dynamic'

export default async function Product({ params }) {

    const { productId } = await params
    const product = await getProductById(productId)

    if (!product) {
        notFound()
    }

    const category = typeof product.category === 'object' && product.category
        ? product.category
        : null

    return (
        <div className="mx-6">
            <div className="max-w-7xl mx-auto">

                {/* Breadcrums — M27a: the category segment is now a real link to
                    /category/[slug], replacing the unlinked plain text. */}
                <div className="  text-gray-600 text-sm mt-8 mb-5">
                    <Link href="/">Home</Link> / <Link href="/shop">Products</Link>
                    {category && <> / <Link href={`/category/${category.slug}`}>{category.title}</Link></>}
                </div>

                {/* Product Details */}
                <ProductDetails product={product} />

                {/* Description & Reviews */}
                <ProductDescription product={product} />
            </div>
        </div>
    );
}
