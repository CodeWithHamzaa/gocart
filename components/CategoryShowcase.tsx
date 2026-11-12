import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'
import type { Category } from '@/lib/payload/categories'
import { CategoryIcon } from '@/lib/category-style'
import { buttonClasses } from '@/components/ui/Button'
import ScrollRail from '@/components/ui/ScrollRail'

// M118: "Shop by category", the home page's category discovery, after the owner's two reference styles
// (2026-11-12): an intro (heading, one line, "Explore all") beside a row of every category. The owner then
// chose one style per screen size:
//   below `lg` (phones and tablets)  round photos with the name under them: compact, 4-5 in view
//   from `lg` (desktop)               photo cards: the 4:3 image with a round arrow, icon, name, "Shop now"
// Both lists are in the server HTML; the one not shown is `display: none`, so it is out of the
// accessibility tree and a screen reader or keyboard meets each category once. Adapted to the Mirza
// identity (ADR-052): Plus Jakarta Sans only (no serif), violet for actions, warm wells and hairlines,
// no shadows on cards. Every category in the admin's order (ADR-048), links in the server HTML (M40,
// e2e/seo.spec.ts). Rows are swiped on touch and scrolled with ScrollRail's buttons from `md`.
// A category without an image shows its icon.
const imageOf = (category: Category) => (category.image && typeof category.image === 'object' ? (category.image.url ?? null) : null)

// The row bleeds to the screen edge below `lg` so the next circle peeks in; from `lg` it sits in its column.
const ROW =
  'no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 py-1 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0 [&>li]:shrink-0 [&>li]:snap-start'

function CategoryCard({ category }: { category: Category }) {
  const image = imageOf(category)
  return (
    <Link href={`/category/${category.slug}`} className="group flex h-full flex-col rounded-card border border-line bg-surface p-2 transition-colors hover:border-line-3">
      <span className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-tile bg-surface-muted text-ink-3">
        {image ? (
          <Image
            src={image}
            alt=""
            width={480}
            height={360}
            sizes="(min-width: 1280px) 200px, 17vw"
            className="size-full object-cover transition duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <CategoryIcon category={category} size={32} strokeWidth={1.5} aria-hidden="true" />
        )}
        <span aria-hidden="true" className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full bg-surface text-ink shadow-chip transition-colors group-hover:bg-primary group-hover:text-on-primary">
          <ArrowRightIcon size={16} />
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-2 px-1.5 pt-3">
        <CategoryIcon category={category} size={18} strokeWidth={1.7} aria-hidden="true" className="shrink-0 text-ink-3" />
        <span className="truncate text-sm font-semibold text-ink sm:text-base">{category.title}</span>
      </span>
      <span className="inline-flex items-center gap-1 px-1.5 pb-1.5 pt-1 text-xs font-semibold text-primary sm:text-sm">
        Shop now <ArrowRightIcon size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </span>
    </Link>
  )
}

function CategoryCircle({ category }: { category: Category }) {
  const image = imageOf(category)
  return (
    <Link href={`/category/${category.slug}`} className="group flex flex-col items-center gap-2 rounded-tile text-center">
      <span className="block w-full rounded-full bg-surface p-1 ring-1 ring-line transition group-hover:ring-2 group-hover:ring-primary">
        <span className="flex aspect-square items-center justify-center overflow-hidden rounded-full bg-surface-muted text-ink-3">
          {image ? (
            <Image src={image} alt="" width={200} height={200} sizes="(min-width: 640px) 96px, 76px" className="size-full object-cover" />
          ) : (
            <CategoryIcon category={category} size={26} strokeWidth={1.5} aria-hidden="true" />
          )}
        </span>
      </span>
      <span className="line-clamp-2 text-xs font-medium leading-tight text-ink transition-colors group-hover:text-primary-dark sm:text-sm">{category.title}</span>
    </Link>
  )
}

export default function CategoryShowcase({ categories = [] }: { categories?: Category[] }) {
  if (categories.length === 0) return null
  return (
    <section aria-labelledby="categories-heading" className="mx-4 mt-12 sm:mx-6 lg:mt-16">
      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-center lg:gap-10">
        {/* Intro: a heading, one honest line and "Explore all". Below `lg` it is a header row above the
            categories; from `lg` a column with a hairline on its right, as in the reference. */}
        <div className="flex items-end justify-between gap-4 lg:block lg:border-r lg:border-line lg:py-6 lg:pr-10">
          <div className="min-w-0">
            <h2 id="categories-heading" className="text-2xl font-semibold tracking-tight text-ink sm:text-4xl sm:tracking-tighter">
              Shop by category
            </h2>
            <p className="mt-1 hidden text-sm text-muted sm:block sm:text-base lg:mt-3">Discover everyday favourites across every category.</p>
          </div>
          {/* The pill is desktop-only; a wrapper hides it, because the button's own inline-flex would
              override a `hidden` class on the link itself. */}
          <span className="hidden lg:mt-6 lg:block">
            <Link href="/categories" className={buttonClasses({ size: 'md' })}>
              Explore all <ArrowRightIcon size={16} aria-hidden="true" />
            </Link>
          </span>
          <Link
            href="/categories"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline hover:underline-offset-4 sm:text-base lg:hidden"
          >
            View all categories <ArrowRightIcon size={16} aria-hidden="true" />
          </Link>
        </div>

        {/* Phones and tablets: the circles. */}
        <div className="mt-4 min-w-0 lg:hidden">
          <ScrollRail label="categories">
            <ul className={`${ROW} gap-3 sm:gap-5`}>
              {categories.map((category) => (
                <li key={category.id} className="w-[76px] sm:w-24">
                  <CategoryCircle category={category} />
                </li>
              ))}
            </ul>
          </ScrollRail>
        </div>

        {/* Desktop: the cards, five in the row. */}
        <div className="hidden min-w-0 lg:block">
          <ScrollRail label="categories">
            <ul className={`${ROW} gap-4`}>
              {categories.map((category) => (
                <li key={category.id} className="w-[calc((100%-4rem)/5)]">
                  <CategoryCard category={category} />
                </li>
              ))}
            </ul>
          </ScrollRail>
        </div>
      </div>
    </section>
  )
}
