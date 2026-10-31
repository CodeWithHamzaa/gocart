import Image from 'next/image'
import Link from 'next/link'
import { BanknoteIcon, LayoutGridIcon, TruckIcon, UserRoundIcon } from 'lucide-react'
import type { Category, CategoryWithChildren } from '@/lib/payload/categories'
import { CategoryIcon } from '@/lib/category-style'
import { formatPKR } from '@/lib/currency'
import type { DeliverySettings } from '@/lib/delivery'

// M101: what sits right under the home banner (the owner took these from the "B" mockup): round category
// shortcuts with their images, then the three promises as one strip. The delivery wording comes from
// Settings, like every other delivery statement (lib/delivery.ts); nothing is shown that is not true.
const MAX_CHIPS = 6
const imageOf = (category: Category) => (category.image && typeof category.image === 'object' ? (category.image.url ?? null) : null)

function deliveryPromise({ flatRate, freeShippingThreshold }: DeliverySettings) {
  if (typeof flatRate !== 'number') return { title: 'Delivery across Pakistan', text: 'Charges are shown at checkout' }
  if (flatRate === 0) return { title: 'Free delivery', text: 'Across Pakistan' }
  if (typeof freeShippingThreshold === 'number' && freeShippingThreshold > 0) {
    return { title: `Free delivery from ${formatPKR(freeShippingThreshold)}`, text: `${formatPKR(flatRate)} below that, across Pakistan` }
  }
  return { title: 'Delivery across Pakistan', text: `${formatPKR(flatRate)} per order` }
}

export default function HeroShortcuts({ categories = [], shipping = {} }: { categories?: CategoryWithChildren[]; shipping?: DeliverySettings }) {
  // Every top-level category first, then their children taken in turn, so no department is crowded out.
  const children: Category[] = []
  for (let i = 0; children.length < MAX_CHIPS && categories.some((c) => c.children[i]); i++) {
    for (const c of categories) if (c.children[i]) children.push(c.children[i])
  }
  const chips = [...categories, ...children].slice(0, MAX_CHIPS)
  const delivery = deliveryPromise(shipping)
  const promises = [
    { icon: BanknoteIcon, title: 'Cash on delivery', text: 'Pay when it arrives' },
    { icon: TruckIcon, ...delivery },
    { icon: UserRoundIcon, title: 'No account needed', text: 'Order with your phone number' },
  ]

  return (
    <div className="mt-6 sm:mt-8">
      {chips.length > 0 && (
        <nav aria-label="Popular categories">
          <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:justify-center lg:overflow-visible lg:px-0">
            {chips.map((category) => {
              const image = imageOf(category)
              return (
                <li key={category.id} className="shrink-0">
                  <Link href={`/category/${category.slug}`} className="flex min-h-14 items-center gap-2.5 rounded-full bg-lavender py-1.5 pl-1.5 pr-5 text-[15px] font-medium text-ink transition hover:bg-lavender-2">
                    <span className="flex size-11 items-center justify-center overflow-hidden rounded-full bg-white text-ink-3">
                      {image ? <Image src={image} alt="" width={88} height={88} sizes="44px" className="size-full object-cover" /> : <CategoryIcon category={category} size={20} strokeWidth={1.6} aria-hidden="true" />}
                    </span>
                    {category.title}
                  </Link>
                </li>
              )
            })}
            <li className="shrink-0">
              <Link href="/categories" className="flex min-h-14 items-center gap-2.5 rounded-full bg-primary-soft py-1.5 pl-1.5 pr-5 text-[15px] font-semibold text-primary-dark transition hover:bg-lavender-2">
                <span className="flex size-11 items-center justify-center rounded-full bg-white"><LayoutGridIcon size={20} strokeWidth={1.7} aria-hidden="true" /></span>
                View all
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
