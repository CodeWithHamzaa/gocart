import Image from 'next/image'
import Link from 'next/link'
import Title from '@/components/Title'
import type { Category } from '@/lib/payload/categories'
import { CategoryIcon } from '@/lib/category-style'

// M118: "Shop by category", the home page's category discovery (replaces M101's small shortcut row under
// the banner). Every category, in the admin's order (ADR-048: flat), as a photo tile: the category's own
// 4:3 image on a warm well, then its name and description. Phone: a sideways rail (about 2.3 tiles in
// view, so the next one shows); from `md`: a grid of five. Every category link is in the server HTML (M40,
// e2e/seo.spec.ts). A category without an image shows its icon instead (lib/category-style.tsx).
const imageOf = (category: Category) => (category.image && typeof category.image === 'object' ? (category.image.url ?? null) : null)

export default function CategoryShowcase({ categories = [] }: { categories?: Category[] }) {
  if (categories.length === 0) return null
  return (
    <section aria-labelledby="categories-heading" className="mx-4 mt-14 sm:mx-6 lg:mt-20">
      <div className="mx-auto max-w-7xl">
        <Title id="categories-heading" title="Shop by category" href="/categories" linkLabel="All categories" />
        <ul className="no-scrollbar -mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0 lg:mt-7 lg:gap-6">
          {categories.map((category) => {
            const image = imageOf(category)
            return (
              <li key={category.id} className="w-[40vw] max-w-[200px] shrink-0 snap-start md:w-auto md:max-w-none">
                <Link href={`/category/${category.slug}`} className="group block rounded-tile">
                  <span className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-tile bg-surface-muted text-ink-3">
                    {image ? (
                      <Image
                        src={image}
                        alt=""
                        width={480}
                        height={360}
                        sizes="(min-width: 1280px) 240px, (min-width: 768px) 19vw, 40vw"
                        className="size-full object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                    ) : (
                      <CategoryIcon category={category} size={32} strokeWidth={1.5} aria-hidden="true" />
                    )}
                  </span>
                  <span className="mt-2.5 block text-sm font-semibold text-ink group-hover:underline group-hover:underline-offset-4 sm:text-base">{category.title}</span>
                  {category.description && <span className="mt-0.5 hidden text-sm text-muted sm:line-clamp-1">{category.description}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
