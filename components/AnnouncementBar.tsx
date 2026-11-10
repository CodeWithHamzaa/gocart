import Link from 'next/link'
import { BadgeCheckIcon, PackageSearchIcon, TruckIcon } from 'lucide-react'
import { getSettings } from '@/lib/payload/settings'
import { getStorefrontContent } from '@/lib/payload/storefront-content'
import { announcementList } from '@/lib/storefront-content'
import { formatPKR } from '@/lib/currency'
import type { DeliverySettings } from '@/lib/delivery'

// M61: the slim strip above the header. A static trust strip (the owner chose it on 2026-11-10 over the
// moving one-line ticker): the store's promises side by side, each with a small icon, nothing moving.
// M110 (ADR-050): the admin's messages come first (/admin, Storefront content), then the delivery promise,
// shortened for the strip and built from the Settings global (the same values checkout charges by,
// ADR-018), then "Track your order" (the guest lookup, ADR-024; an admin can hide it). Space decides how
// many show: one on a phone, two from `sm`, all (up to four) from `lg`; Track order from `md` (on phones
// the tab bar has Orders).
function deliveryShort({ flatRate, freeShippingThreshold }: DeliverySettings): string {
  if (typeof flatRate !== 'number') return 'Delivery across Pakistan'
  if (flatRate === 0) return 'Free delivery across Pakistan'
  if (typeof freeShippingThreshold === 'number' && freeShippingThreshold > 0) return `Free delivery over ${formatPKR(freeShippingThreshold)}`
  return `Delivery ${formatPKR(flatRate)} across Pakistan`
}

const VISIBLE = ['flex', 'hidden sm:flex', 'hidden lg:flex', 'hidden lg:flex']

export default async function AnnouncementBar() {
  const [settings, content] = await Promise.all([getSettings(), getStorefrontContent()])
  const delivery = deliveryShort({ flatRate: settings.shippingFlatRate, freeShippingThreshold: settings.freeShippingThreshold })
  const messages = announcementList(content, delivery).slice(0, VISIBLE.length)
  if (messages.length === 0 && !content.showTrackOrderLink) return null

  return (
    <aside aria-label="Store promises" className="border-b border-line bg-surface-muted text-xs font-medium text-ink-2 sm:text-sm">
      <div className="mx-auto flex min-h-10 max-w-[83rem] items-center justify-center gap-x-8 px-4 py-2 sm:px-6">
        <ul className="flex min-w-0 items-center justify-center gap-x-8">
          {messages.map((message, i) => {
            const Icon = message === delivery ? TruckIcon : BadgeCheckIcon
            return (
              <li key={`${i}-${message}`} className={`${VISIBLE[i]} min-w-0 items-center gap-2`}>
                <Icon size={16} strokeWidth={1.9} aria-hidden="true" className="shrink-0 text-primary" />
                <span className="truncate">{message}</span>
              </li>
            )
          })}
        </ul>
        {content.showTrackOrderLink && (
          <Link href="/orders" className="hidden min-h-6 shrink-0 items-center gap-2 font-semibold text-primary-dark underline-offset-4 hover:underline md:inline-flex">
            <PackageSearchIcon size={16} strokeWidth={1.9} aria-hidden="true" />
            Track your order
          </Link>
        )}
      </div>
    </aside>
  )
}
