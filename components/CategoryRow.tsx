import { Fragment } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRightIcon, ShapesIcon } from 'lucide-react'
import { CategoryIcon, tintFor } from '@/lib/category-style'
import type { Category, CategoryWithChildren } from '@/lib/payload/categories'
import CategoryTile from '@/components/ui/CategoryTile'

// M61: the icon and tint mapping lives in lib/category-style.tsx.
// M62: two parts. `CategoryRow` is the phone's row of round chips (hidden from `md`, where the header's
// category row and the tiles below cover it). `CategoryGrid` is "Shop by category": pastel tiles whose
// subtitle is the category's real child links, so every parent and child link stays in the home page's
// initial HTML (M40, e2e/seo.spec.ts). A phone shows the first four tiles, wider screens all of them.
// M45a: replaces the CSS marquee (CategoriesMarquee, M40) with the round, tinted category tiles of
// a modern storefront. Still a server component with plain <a> links in the initial HTML (M27a).
// Every category, parents then their children (as the marquee had), so all category links stay in
// the home page's initial HTML for crawlers (M40, e2e/seo.spec.ts). A category's own image is used when an admin uploaded one; otherwise an icon is
// picked from its name, with a neutral fallback. The row scrolls sideways inside its own box on a
// phone, so the page itself never does.

export default function CategoryRow({ categories = [] }: { categories?: Category[] }) {
  if (categories.length === 0) return null

  return (
    <nav aria-label="Shop by category" className="mx-4 mt-6 md:hidden">
      <ul className="no-scrollbar -mr-4 flex gap-3.5 overflow-x-auto pr-4">
        {categories.map((category, index) => {
          const tint = tintFor(index)
          const image = category.image
          const imageUrl = typeof image === 'object' && image ? image.url : null
          return (
            <li key={category.id} className="shrink-0">
              <Link href={`/category/${category.slug}`} className="flex min-h-11 w-[62px] flex-col items-center gap-1.5 text-center text-xs font-medium text-ink">
                <span className={`flex size-[58px] items-center justify-center overflow-hidden rounded-full ${tint.tile} ${tint.ink}`}>
                  {imageUrl ? (
                    <Image src={imageUrl} alt="" width={58} height={58} sizes="58px" className="size-full object-cover" />
                  ) : (
                    <CategoryIcon category={category} size={26} strokeWidth={1.7} aria-hidden="true" />
                  )}
                </span>
                <span className="w-full truncate">{category.title}</span>
              </Link>
            </li>
          )
        })}
        <li className="shrink-0">
          <Link href="/categories" className="flex min-h-11 w-[62px] flex-col items-center gap-1.5 text-center text-xs font-medium text-ink">
            <span className="flex size-[58px] items-center justify-center rounded-full bg-white text-ink ring-1 ring-line">
              <ShapesIcon size={24} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <span>All</span>
          </Link>
        </li>
      </ul>
    </nav>
  )
}

export function CategoryGrid({ categories = [] }: { categories?: CategoryWithChildren[] }) {
  if (categories.length === 0) return null

  return (
    <section aria-labelledby="shop-by-category" className="mx-4 mt-12 sm:mx-6 sm:mt-14">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="shop-by-category" className="text-xl font-extrabold tracking-[-0.02em] text-ink sm:text-[28px]">Shop by category</h2>
          <Link href="/categories" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark">
            Explore all <ArrowRightIcon size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 md:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] md:gap-4">
          {categories.map((category, index) => (
            <CategoryTile key={category.id} category={category} index={index} variant="tile" className={index >= 4 ? 'max-md:hidden' : ''}>
              {category.children.length > 0 && (
                <p>
                  {category.children.map((child, i) => (
                    <Fragment key={child.id}>
                      {i > 0 && ', '}
                      <Link href={`/category/${child.slug}`} className="inline-block py-1 hover:text-primary hover:underline">{child.title}</Link>
                    </Fragment>
                  ))}
                </p>
              )}
            </CategoryTile>
          ))}
        </div>
      </div>
    </section>
  )
}
