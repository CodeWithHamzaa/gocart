import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'
import type { Category } from '@/lib/payload/categories'
import { CategoryIcon } from '@/lib/category-style'
import ScrollRail from '@/components/ui/ScrollRail'

// M118: "Shop by category", the home page's category discovery, after the owner's reference ("Style 3,
// circular categories", 2026-11-12/13): round category photos with the name under them, at every screen
// size. Below `lg` a header row (heading, "View all categories") sits above a swipeable row; from `lg`
// an intro column (heading, one line, the link, a hairline on its right) sits beside the row, as in the
// reference. The circles grow with the screen:
//   phone 76px / gap 12 / 12px name   sm 96 / 20 / 14   lg 112 / 24 / 14   xl 124 / 28 / 15
// No white ring (owner review: compared with and without; without reads cleaner and shows more photo);
// hover adds a violet ring. Adapted to the Mirza identity (ADR-052): Plus Jakarta Sans only (no serif),
// violet for actions, neutral wells. Every category in the admin's order (ADR-048), one link each, all in
// the server HTML (M40, e2e/seo.spec.ts). Swiped on touch, scrolled with ScrollRail's round buttons from
// `md`. A category without an image shows its icon. (Photo cards for desktop were built, compared and
// then dropped at the owner's request in favour of one style everywhere.)
const imageOf = (category: Category) => (category.image && typeof category.image === 'object' ? (category.image.url ?? null) : null)

// The row bleeds to the screen edge below `lg` so the next circle peeks in; from `lg` it sits in its
// column. py-1.5 leaves room for the hover ring.
const ROW =
  'no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 py-1.5 sm:-mx-6 sm:scroll-px-6 sm:gap-5 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:gap-6 lg:px-1 xl:gap-7 [&>li]:shrink-0 [&>li]:snap-start'

function CategoryCircle({ category }: { category: Category }) {
  const image = imageOf(category)
  return (
    <Link href={`/category/${category.slug}`} className="group flex flex-col items-center gap-2 rounded-tile text-center lg:gap-3">
      <span className="block w-full rounded-full transition group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-page">
        <span className="flex aspect-square items-center justify-center overflow-hidden rounded-full bg-surface-muted text-ink-3">
          {image ? (
            <Image
              src={image}
              alt=""
              width={248}
              height={248}
              sizes="(min-width: 1280px) 124px, (min-width: 1024px) 112px, (min-width: 640px) 96px, 76px"
              className="size-full object-cover transition duration-500 group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          ) : (
            <CategoryIcon category={category} size={28} strokeWidth={1.5} aria-hidden="true" />
          )}
        </span>
      </span>
      <span className="line-clamp-2 text-xs font-medium leading-tight text-ink transition-colors group-hover:text-primary-dark sm:text-sm xl:text-[0.9375rem]">
        {category.title}
      </span>
    </Link>
  )
}

export default function CategoryShowcase({ categories = [] }: { categories?: Category[] }) {
  if (categories.length === 0) return null
  return (
    <section aria-labelledby="categories-heading" className="mx-4 mt-12 sm:mx-6 lg:mt-16">
      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-center lg:gap-10">
        {/* Intro: a heading, one honest line and "View all categories". Below `lg` a header row above the
            circles; from `lg` a column with a hairline on its right, as in the reference. */}
        <div className="flex items-end justify-between gap-4 lg:block lg:border-r lg:border-line lg:py-4 lg:pr-10">
          <div className="min-w-0">
            <h2 id="categories-heading" className="text-2xl font-semibold tracking-tight text-ink sm:text-4xl sm:tracking-tighter">
              Shop by category
            </h2>
            <p className="mt-1 hidden text-sm text-muted sm:block sm:text-base lg:mt-3">Discover everyday favourites across every category.</p>
          </div>
          <Link
            href="/categories"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline hover:underline-offset-4 sm:text-base lg:mt-3"
          >
            View all categories <ArrowRightIcon size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-4 min-w-0 lg:mt-0">
          <ScrollRail label="categories">
            <ul className={ROW}>
              {categories.map((category) => (
                <li key={category.id} className="w-[76px] sm:w-24 lg:w-28 xl:w-[124px]">
                  <CategoryCircle category={category} />
                </li>
              ))}
            </ul>
          </ScrollRail>
        </div>
      </div>
    </section>
  )
}
