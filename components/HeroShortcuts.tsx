import Image from 'next/image'
import Link from 'next/link'
import { LayoutGridIcon } from 'lucide-react'
import type { Category } from '@/lib/payload/categories'
import { CategoryIcon } from '@/lib/category-style'

// M101: what sits right under the home banner (the owner took these from the "B" mockup): round category
// shortcuts with their images. The three promises that used to follow repeated the COD steps section word
// for word, so they now live there once (components/CodSteps.tsx), lower on the page.
// From `lg` the pills wrap in rows, so only the first few show there (today's desktop row); below `lg`
// the row scrolls sideways and holds every category.
const DESKTOP_CHIPS = 6
const imageOf = (category: Category) => (category.image && typeof category.image === 'object' ? (category.image.url ?? null) : null)

// Phone: an 80px column (circle + name), wide enough for "Headphones" on one line; a longer name breaks
// between words only, never mid-word. From `md`: white pills with a hairline.
const CHIP =
  'flex w-20 flex-col items-center gap-1.5 rounded-tile text-center text-xs font-medium text-ink md:min-h-14 md:w-auto md:flex-row md:gap-2.5 md:rounded-full md:border md:border-line md:bg-surface md:py-1.5 md:pl-1.5 md:pr-5 md:text-left md:text-sm md:font-semibold md:transition md:hover:border-line-3'
// M111: the circle keeps one size per breakpoint (aspect-square + shrink-0, so a long name can never
// squash it) and its image is centre-cropped; on a phone the name is centred under it.
const CIRCLE = 'flex aspect-square size-14 shrink-0 items-center justify-center overflow-hidden rounded-full md:size-11'
const LABEL = 'line-clamp-2 w-full text-center leading-tight break-normal md:line-clamp-none md:w-auto md:text-left md:leading-normal'


export default function HeroShortcuts({ categories = [] }: { categories?: Category[] }) {
  // M102 (ADR-048): categories are flat, so the shortcuts are simply the categories in the admin's order.
  const chips = categories

  return (
    <div className="mt-5 sm:mt-8">
      {/* M102: on a phone each shortcut is a circle (image) with its name under it, sized so 4-5 fit across
          and the rest are a swipe away; from `md` they are today's pills. One set of links at every width. */}
      {chips.length > 0 && (
        <nav aria-label="Popular categories">
          <ul className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:gap-3 lg:mx-0 lg:flex-wrap lg:justify-center lg:overflow-visible lg:px-0">
            {chips.map((category, index) => {
              const image = imageOf(category)
              return (
                <li key={category.id} className={`shrink-0 ${index >= DESKTOP_CHIPS ? 'lg:hidden' : ''}`}>
                  <Link href={`/category/${category.slug}`} className={CHIP}>
                    <span className={`${CIRCLE} bg-surface-muted text-ink-3`}>
                      {image ? <Image src={image} alt="" width={128} height={128} sizes="(min-width: 768px) 44px, 56px" className="size-full object-cover object-center" /> : <CategoryIcon category={category} size={24} strokeWidth={1.6} aria-hidden="true" />}
                    </span>
                    <span className={LABEL}>{category.title}</span>
                  </Link>
                </li>
              )
            })}
            <li className="shrink-0">
              <Link href="/categories" className={`${CHIP} md:border-accent md:bg-accent-soft md:text-primary-dark`}>
                <span className={`${CIRCLE} bg-accent-soft text-primary-dark md:bg-surface`}><LayoutGridIcon size={22} strokeWidth={1.7} aria-hidden="true" /></span>
                <span className={`${LABEL} font-semibold text-primary-dark`}>View all</span>
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </div>
  )
}
