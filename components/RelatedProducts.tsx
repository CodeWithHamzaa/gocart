import { Suspense } from 'react'
import RailCard from '@/components/RailCard'
import Title from '@/components/Title'
import { RAIL_ROW } from '@/components/ProductRail'
import ScrollRail from '@/components/ui/ScrollRail'
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

  // M101: the home page's rail (Title, ScrollRail, RailCard), so "You may also like" looks like "New arrivals".
  return (
    <section aria-labelledby="related-products" className="my-12 sm:my-16">
      <Title id="related-products" title="You may also like" href={`/category/${category.slug}`} linkLabel="View all" />
      <div className="mt-6">
        <ScrollRail label="You may also like">
          <ul className={RAIL_ROW}>
            {related.map((product) => (
              <li key={product.id}>
                <RailCard product={product} />
              </li>
            ))}
          </ul>
        </ScrollRail>
      </div>
    </section>
  )
}

function RelatedSkeleton() {
  return (
    <div aria-hidden="true" className="my-12 sm:my-16">
      <div className="h-9 w-56 animate-pulse rounded-full bg-lavender" />
      <div className="no-scrollbar -mx-4 mt-6 flex gap-4 overflow-hidden px-4 sm:-mx-6 sm:gap-5 sm:px-6 xl:mx-0 xl:px-0">
        {Array.from({ length: SHOWN }, (_, i) => (
          <div key={i} className="h-[420px] w-[248px] shrink-0 animate-pulse rounded-card bg-lavender sm:h-[480px] sm:w-[300px]" />
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
