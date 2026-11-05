import type { Product } from '@/lib/payload/products'
import RailCard from './RailCard'
import Title from './Title'
import ScrollRail from './ui/ScrollRail'

// M101: a home page section of large product cards in a swipeable row ("New arrivals"). Renders nothing
// without products. The row bleeds to the screen edge on a phone so the next card peeks in.
export const RAIL_ROW =
  'no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:gap-5 sm:px-6 xl:mx-0 xl:scroll-px-0 xl:px-0 [&>li]:shrink-0 [&>li]:snap-start'

export default function ProductRail({ title, description, href, linkLabel, products }: { title: string; description?: string; href: string; linkLabel?: string; products: Product[] }) {
  if (products.length === 0) return null
  return (
    <section className="mx-4 mt-16 sm:mx-6 sm:mt-24">
      <div className="mx-auto max-w-7xl">
        <Title title={title} description={description} href={href} linkLabel={linkLabel} />
        <div className="mt-6">
          <ScrollRail label={title}>
            <ul className={RAIL_ROW}>
              {products.map((product) => (
                <li key={product.id}>
                  <RailCard product={product} />
                </li>
              ))}
            </ul>
          </ScrollRail>
        </div>
      </div>
    </section>
  )
}
