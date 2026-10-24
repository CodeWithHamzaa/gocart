import Link from 'next/link'
import { Suspense } from 'react'
import ProductCard from '@/components/ProductCard'
import { getProductsByCategory } from '@/lib/payload/categories'
import type { Product } from '@/lib/payload/products'

// M67: "You may also like" under a product: up to four in-stock products from the same category,
// never the product being viewed. Server component; the data comes from the existing
// getProductsByCategory (not modified: the category routes and the sitemap use it), filtered here.
// The section renders nothing (no heading) when there is nothing to show, when the product has no
// category, or when the read fails: the product page must never break because of this section.
// The order is whatever that helper returns (Payload's default for the collection).
type RelatedCategory = { slug: string; title: string }

const SHOWN = 4
const FETCHED = 8

async function RelatedList({ category, currentId }: { category: RelatedCategory; currentId: number | string }) {
  let related: Product[] = []
  try {
    const result = await getProductsByCategory(category.slug, { limit: FETCHED })
    related = ((result?.docs ?? []) as Product[])
      .filter((product) => String(product.id) !== String(currentId) && product.inStock === true)
      .slice(0, SHOWN)
  } catch (error) {
    // The slug only: nothing about the visitor or the product's price/stock.
    console.error('RelatedProducts failed for category', category.slug, error instanceof Error ? error.message : 'unknown error')
    return null
  }

  if (related.length === 0) return null

  return (
    <section aria-labelledby="related-products" className="my-10 sm:my-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="related-products" className="text-xl font-extrabold tracking-[-0.02em] text-ink sm:text-[28px]">You may also like</h2>
        <Link href={`/category/${category.slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:text-primary-dark">
          View all in {category.title} &rarr;
        </Link>
      </div>
      {/* A phone scrolls sideways inside this box (the page itself never does); wider screens get a grid. */}
      <ul className="no-scrollbar -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-4 sm:overflow-visible sm:px-0">
        {related.map((product) => (
          <li key={product.id} className="w-[148px] shrink-0 sm:w-auto">
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function RelatedSkeleton() {
  return (
    <div aria-hidden="true" className="my-10 sm:my-12">
      <div className="h-7 w-48 animate-pulse rounded bg-line" />
      <div className="no-scrollbar -mx-4 mt-4 flex gap-3 overflow-hidden px-4 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-4 sm:px-0">
        {Array.from({ length: SHOWN }, (_, i) => (
          <div key={i} className="aspect-[3/4] w-[148px] shrink-0 animate-pulse rounded-card bg-line sm:w-auto" />
        ))}
      </div>
    </div>
  )
}

// The page has already passed notFound() by the time this renders, so the Suspense boundary cannot
// turn a 404 into a 200 (the M27a gotcha is about a route-level loading.tsx).
export default function RelatedProducts({ category, currentId }: { category: RelatedCategory | null; currentId: number | string }) {
  if (!category) return null
  return (
    <Suspense fallback={<RelatedSkeleton />}>
      <RelatedList category={category} currentId={currentId} />
    </Suspense>
  )
}
