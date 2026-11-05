import Image from 'next/image'
import Link from 'next/link'
import { BanknoteIcon, LayoutGridIcon, TruckIcon, UserRoundIcon } from 'lucide-react'
import type { Category } from '@/lib/payload/categories'
import { CategoryIcon } from '@/lib/category-style'
import { formatPKR } from '@/lib/currency'
import type { DeliverySettings } from '@/lib/delivery'

// M101: what sits right under the home banner (the owner took these from the "B" mockup): round category
// shortcuts with their images, then the three promises as one strip. The delivery wording comes from
// Settings, like every other delivery statement (lib/delivery.ts); nothing is shown that is not true.
// From `lg` the pills wrap in rows, so only the first few show there (today's desktop row); below `lg`
// the row scrolls sideways and holds every category.
const DESKTOP_CHIPS = 6
const imageOf = (category: Category) => (category.image && typeof category.image === 'object' ? (category.image.url ?? null) : null)

// Phone: a 68px column (56px circle, name below), so 4 fit across at 320-375px and 5 from 390px. From `md`: the pill (44px circle, name beside it).
const CHIP =
  'flex w-[68px] flex-col items-center gap-1.5 rounded-tile text-center text-xs font-medium text-ink md:min-h-14 md:w-auto md:flex-row md:gap-2.5 md:rounded-full md:bg-lavender md:py-1.5 md:pl-1.5 md:pr-5 md:text-left md:text-[15px] md:transition md:hover:bg-lavender-2'
// M111: the circle keeps one size per breakpoint (aspect-square + shrink-0, so a long name can never
// squash it) and its image is centre-cropped; on a phone the name is centred under it.
const CIRCLE = 'flex aspect-square size-14 shrink-0 items-center justify-center overflow-hidden rounded-full md:size-11'
const LABEL = 'line-clamp-2 w-full text-center leading-tight [overflow-wrap:break-word] md:line-clamp-none md:w-auto md:text-left md:leading-normal'

function deliveryPromise({ flatRate, freeShippingThreshold }: DeliverySettings) {
  if (typeof flatRate !== 'number') return { title: 'Delivery across Pakistan', text: 'Charges are shown at checkout' }
  if (flatRate === 0) return { title: 'Free delivery', text: 'Across Pakistan' }
  if (typeof freeShippingThreshold === 'number' && freeShippingThreshold > 0) {
    return { title: `Free delivery from ${formatPKR(freeShippingThreshold)}`, text: `${formatPKR(flatRate)} below that, across Pakistan` }
  }
  return { title: 'Delivery across Pakistan', text: `${formatPKR(flatRate)} per order` }
}

export default function HeroShortcuts({ categories = [], shipping = {} }: { categories?: Category[]; shipping?: DeliverySettings }) {
  // M102 (ADR-048): categories are flat, so the shortcuts are simply the categories in the admin's order.
  const chips = categories
  const delivery = deliveryPromise(shipping)
  const promises = [
    { icon: BanknoteIcon, title: 'Cash on delivery', text: 'Pay when it arrives' },
    { icon: TruckIcon, ...delivery },
    { icon: UserRoundIcon, title: 'No account needed', text: 'Order with your phone number' },
  ]

  return (
    <div className="mt-6 sm:mt-8">
      {/* M102: on a phone each shortcut is a circle (image) with its name under it, sized so 4-5 fit across
          and the rest are a swipe away; from `md` they are today's pills. One set of links at every width. */}
      {chips.length > 0 && (
        <nav aria-label="Popular categories">
          <ul className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:gap-3 lg:mx-0 lg:flex-wrap lg:justify-center lg:overflow-visible lg:px-0">
            {chips.map((category, index) => {
              const image = imageOf(category)
              return (
                <li key={category.id} className={`shrink-0 ${index >= DESKTOP_CHIPS ? 'lg:hidden' : ''}`}>
                  <Link href={`/category/${category.slug}`} className={CHIP}>
                    <span className={`${CIRCLE} bg-lavender text-ink-3 md:bg-white`}>
                      {image ? <Image src={image} alt="" width={128} height={128} sizes="(min-width: 768px) 44px, 56px" className="size-full object-cover object-center" /> : <CategoryIcon category={category} size={24} strokeWidth={1.6} aria-hidden="true" />}
                    </span>
                    <span className={LABEL}>{category.title}</span>
                  </Link>
                </li>
              )
            })}
            <li className="shrink-0">
              <Link href="/categories" className={`${CHIP} md:bg-primary-soft md:font-semibold md:text-primary-dark`}>
                <span className={`${CIRCLE} bg-primary-soft text-primary-dark md:bg-white`}><LayoutGridIcon size={22} strokeWidth={1.7} aria-hidden="true" /></span>
                <span className={`${LABEL} font-semibold text-primary-dark`}>View all</span>
              </Link>
            </li>
          </ul>
        </nav>
      )}

      <ul className="mt-6 grid gap-3 rounded-panel bg-lavender p-4 sm:mt-8 sm:grid-cols-3 sm:gap-4 sm:px-7 sm:py-5">
        {promises.map((item) => (
          <li key={item.title} className="flex items-center gap-3 text-sm text-ink-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-primary">
              <item.icon size={20} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span>
              <strong className="block text-[15px] font-semibold text-ink">{item.title}</strong>
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
