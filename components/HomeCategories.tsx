import { Fragment } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Category, CategoryWithChildren } from '@/lib/payload/categories'
import { CategoryIcon } from '@/lib/category-style'
import Title from './Title'

// M101: "Shop by category" on the home page, from `md` only: one large tile per top-level category (the
// "V1" mockup) with its name, its real child links and its image. On a phone the owner removed it: the
// hero's category shortcuts (HeroShortcuts) already sit near the top there. Every parent and child link is
// still in the initial HTML (M40, e2e/seo.spec.ts), so crawlers see them at any width.
const imageOf = (category: Category) => (category.image && typeof category.image === 'object' ? (category.image.url ?? null) : null)

export default function HomeCategories({ categories = [] }: { categories?: CategoryWithChildren[] }) {
  if (categories.length === 0) return null

  return (
    <section aria-labelledby="home-categories" className="mx-6 mt-24 hidden md:block">
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

      </div>
    </section>
  )
}
