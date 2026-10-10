import Link from "next/link";
import ProductDescription from "@/components/ProductDescription";
import ProductDetails from "@/components/ProductDetails";
import { cache } from "react";
import { getProductById } from "@/lib/payload/products";
import { getSettings } from "@/lib/payload/settings";
import { notFound } from "next/navigation";
import { absoluteUrl, pageMetadata, plainDescription, productJsonLd, serializeJsonLd } from "@/lib/seo";

// M25: server component reading a real per-product fetch (ADR-007 — SEO-first
// is a non-negotiable default, matching the M23/M24 precedent). force-dynamic
// for the same reason as M23's home page: admin edits to price/stock must
// show without a redeploy, and the production build (M49) cannot assume a
// reachable database.
export const dynamic = 'force-dynamic'

// M41/M43: the page and its metadata both need the product; cache() makes that one query
// per request instead of two.
const loadProduct = cache(getProductById)

export async function generateMetadata({ params }) {
    const { productId } = await params
    const [product, { storeName }] = await Promise.all([loadProduct(productId), getSettings()])
    if (!product) return { title: 'Product not found', robots: { index: false, follow: false } }

    const images = (product.images || [])
        .map((image) => (typeof image === 'object' && image ? image.url : null))
        .filter(Boolean)
        .map(absoluteUrl)

    return pageMetadata({
        storeName,
        title: product.name,
        description: plainDescription(product.description) || `Buy ${product.name} with Cash on Delivery.`,
        path: `/product/${product.id}`,
        images: images.slice(0, 1),
    })
}

export default async function Product({ params }) {

    const { productId } = await params
    const [product, settings] = await Promise.all([loadProduct(productId), getSettings()])

    if (!product) {
        notFound()
    }

    const category = typeof product.category === 'object' && product.category
        ? product.category
        : null

    return (
        <div className="mx-6">
            {/* M43: schema.org Product + Offer from real data; serializeJsonLd escapes "<". */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd(product)) }}
            />
            <div className="max-w-7xl mx-auto">

                {/* Breadcrums — M27a: the category segment is now a real link to
                    /category/[slug], replacing the unlinked plain text. */}
                <div className="  text-gray-600 text-sm mt-8 mb-5">
                    <Link href="/">Home</Link> / <Link href="/shop">Products</Link>
                    {category && <> / <Link href={`/category/${category.slug}`}>{category.title}</Link></>}
                </div>

                {/* Product Details */}
                <ProductDetails
                    product={product}
                    shipping={{ flatRate: settings.shippingFlatRate, freeShippingThreshold: settings.freeShippingThreshold }}
                />

                {/* Description & Reviews */}
                <ProductDescription product={product} />
            </div>
        </div>
    );
}
