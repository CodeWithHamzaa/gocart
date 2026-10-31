import { Fragment } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LayoutGridIcon } from 'lucide-react'
import type { Category, CategoryWithChildren } from '@/lib/payload/categories'
import { CategoryIcon } from '@/lib/category-style'
import Title from './Title'

// M101: "Shop by category" on the home page, in two forms the owner chose:
// - from `md`: one large light-grey tile per top-level category (the "V1" mockup): its name, its real
//   child links, and its image at the bottom;
// - on a phone: a row of round category images that is swiped sideways (the "V3" mockup), every parent
//   followed by its children, ending in "View all". The section heading has "View all" too.
// Both forms put every parent and child link in the initial HTML (M40, e2e/seo.spec.ts). Only category
// names are repeated between the two forms, never product names.
const imageOf = (category: Category) => (category.image && typeof category.image === 'object' ? (category.image.url ?? null) : null)

export default function HomeCategories({ categories = [] }: { categories?: CategoryWithChildren[] }) {
  if (categories.length === 0) return null
  const flat: Category[] = categories.flatMap((category) => [category, ...category.children])

  return (
    <section aria-labelledby="home-categories" className="mx-4 mt-16 sm:mx-6 sm:mt-24">
      <div className="mx-auto max-w-7xl">
        <Title id="home-categories" title="Shop by category" href="/categories" linkLabel="View all" />

        <ul className="mt-6 hidden grid-cols-4 gap-5 md:grid">
          {categories.map((category) => {
            const image = imageOf(category)
            return (
              <li key={category.id} className="group relative flex min-h-[340px] flex-col overflow-hidden rounded-card bg-lavender px-6 pt-6 focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-primary">
                <Link href={`/category/${category.slug}`} className="text-[22px] font-semibold tracking-[-0.02em] text-ink outline-none after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4">
                  {category.title}
                </Link>
                {category.children.length > 0 && (
                  <p className="relative z-10 mt-1 text-[13px] leading-snug text-muted">
                    {category.children.map((child, i) => (
                      <Fragment key={child.id}>
                        {i > 0 && ', '}
                        <Link href={`/category/${child.slug}`} className="inline-block py-1 hover:text-ink hover:underline">{child.title}</Link>
                      </Fragment>
                    ))}
                  </p>
                )}
                <span className="mt-auto block pt-6" aria-hidden="true">
                  <span className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-t-tile bg-white text-ink-3">
                    {image ? (
                      <Image src={image} alt="" width={480} height={360} sizes="(min-width: 1280px) 260px, 22vw" className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <CategoryIcon category={category} size={44} strokeWidth={1.4} />
                    )}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>

        <ul className="no-scrollbar -mx-4 mt-5 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:hidden">
          {flat.map((category) => {
            const image = imageOf(category)
            return (
              <li key={category.id} className="shrink-0 snap-start">
                <Link href={`/category/${category.slug}`} className="flex w-[84px] flex-col items-center gap-2 text-center text-[13px] font-medium leading-tight text-ink">
                  <span className="flex size-[84px] items-center justify-center overflow-hidden rounded-full bg-lavender text-ink-3">
                    {image ? (
                      <Image src={image} alt="" width={168} height={168} sizes="84px" className="size-full object-cover" />
                    ) : (
                      <CategoryIcon category={category} size={30} strokeWidth={1.5} aria-hidden="true" />
                    )}
                  </span>
                  {category.title}
                </Link>
              </li>
            )
          })}
          <li className="shrink-0 snap-start">
            <Link href="/categories" className="flex w-[84px] flex-col items-center gap-2 text-center text-[13px] font-semibold leading-tight text-primary">
              <span className="flex size-[84px] items-center justify-center rounded-full bg-primary-soft">
                <LayoutGridIcon size={26} strokeWidth={1.6} aria-hidden="true" />
              </span>
              View all
            </Link>
          </li>
        </ul>
      </div>
    </section>
  )
}
