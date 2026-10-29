import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import Countdown from '@/components/ui/Countdown'
import type { Product } from '@/lib/payload/products'

// M91 (ADR-041): the design's "Deals of the day", from real data only. The products are the ones the
// admin gave a future `dealEndsAt` that are also really discounted (lib/payload/products.ts
// getDealProducts), soonest-ending first; the countdown runs to the earliest end. Hidden when there
// are none, like the promo cards (M71). The cards show the real MRP, price and "% OFF" chip.
export default function DealsOfTheDay({ products = [] }: { products?: Product[] }) {
  if (products.length === 0) return null
  const endsAt = products[0].dealEndsAt
  if (!endsAt) return null

  return (
    <section aria-labelledby="deals-heading" className="mx-4 mt-12 sm:mx-6 sm:mt-14">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <h2 id="deals-heading" className="text-xl font-extrabold tracking-[-0.02em] text-ink sm:text-[28px]">Deals of the day</h2>
            <Countdown endsAt={endsAt} />
          </div>
          <Link href="/shop" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark">
            View all <ArrowRightIcon size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}
