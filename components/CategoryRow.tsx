import { Fragment } from 'react'
import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'
import type { CategoryWithChildren } from '@/lib/payload/categories'
import CategoryTile from '@/components/ui/CategoryTile'

// M62: `CategoryGrid` is "Shop by category": one tile per top-level category whose subtitle is the
// category's real child links, so every parent and child link stays in the home page's initial HTML
// (M40, e2e/seo.spec.ts). A phone shows the first four tiles (two columns), wider screens all of them.
// M101: M62's phone-only row of round category chips (`CategoryRow`) is gone: it sat directly above
// this grid with the same links. The tiles now show the category's own image (CategoryTile).
export function CategoryGrid({ categories = [] }: { categories?: CategoryWithChildren[] }) {
  if (categories.length === 0) return null

  return (
    <section aria-labelledby="shop-by-category" className="mx-4 mt-12 sm:mx-6 sm:mt-14">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="shop-by-category" className="text-[22px] font-bold tracking-[-0.02em] text-ink sm:text-[28px]">Shop by category</h2>
          <Link href="/categories" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ink underline decoration-line-3 underline-offset-4 hover:decoration-ink">
            Explore all <ArrowRightIcon size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 md:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] md:gap-5">
          {categories.map((category, index) => (
            <CategoryTile key={category.id} category={category} index={index} variant="tile" className={index >= 4 ? 'max-md:hidden' : ''}>
              {category.children.length > 0 && (
                <p>
                  {category.children.map((child, i) => (
                    <Fragment key={child.id}>
                      {i > 0 && ', '}
                      <Link href={`/category/${child.slug}`} className="inline-block py-1 hover:text-ink hover:underline">{child.title}</Link>
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
