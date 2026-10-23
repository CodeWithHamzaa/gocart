import Link from 'next/link'
import Image from 'next/image'
import { ArrowRightIcon, ShapesIcon } from 'lucide-react'
import { CategoryIcon, tintFor } from '@/lib/category-style'
import type { Category } from '@/lib/payload/categories'

// M61: the icon and tint mapping lives in lib/category-style.ts; M62 restyles this row.
// M45a: replaces the CSS marquee (CategoriesMarquee, M40) with the round, tinted category tiles of
// a modern storefront. Still a server component with plain <a> links in the initial HTML (M27a).
// Every category, parents then their children (as the marquee had), so all category links stay in
// the home page's initial HTML for crawlers (M40, e2e/seo.spec.ts). A category's own image is used when an admin uploaded one; otherwise an icon is
// picked from its name, with a neutral fallback. The row scrolls sideways inside its own box on a
// phone, so the page itself never does.

export default function CategoryRow({ categories = [] }: { categories?: Category[] }) {
  if (categories.length === 0) return null

  return (
    <section className="mx-4 sm:mx-6 mt-12 sm:mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">Shop by Category</h2>
          <Link href="/categories" className="inline-flex items-center gap-1 min-h-11 text-sm font-medium text-primary">
            View all <ArrowRightIcon size={15} aria-hidden="true" />
          </Link>
        </div>

        <ul className="no-scrollbar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:gap-5 sm:overflow-visible sm:px-0">
          {categories.map((category, index) => {
            const image = category.image
            const imageUrl = typeof image === 'object' && image ? image.url : null
            return (
              <li key={category.id} className="snap-start shrink-0">
                <Link href={`/category/${category.slug}`} className="group flex w-20 flex-col items-center gap-2 text-center sm:w-24">
                  <span className={`flex size-16 sm:size-20 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/5 transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lift ${tintFor(index).tile} ${tintFor(index).ink}`}>
                    {imageUrl ? (
                      <Image src={imageUrl} alt="" width={80} height={80} sizes="80px" className="size-full object-cover" />
                    ) : (
                      <CategoryIcon category={category} size={26} strokeWidth={1.6} aria-hidden="true" />
                    )}
                  </span>
                  <span className="w-full truncate text-xs sm:text-sm font-medium text-ink-soft group-hover:text-ink">{category.title}</span>
                </Link>
              </li>
            )
          })}
          <li className="snap-start shrink-0">
            <Link href="/categories" className="group flex w-20 flex-col items-center gap-2 text-center sm:w-24">
              <span className="flex size-16 sm:size-20 items-center justify-center rounded-full bg-white text-ink ring-1 ring-line transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lift">
                <ShapesIcon size={24} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span className="text-xs sm:text-sm font-medium text-ink-soft group-hover:text-ink">All</span>
            </Link>
          </li>
        </ul>
      </div>
    </section>
  )
}
