import Link from 'next/link'
import { getSettings } from '@/lib/payload/settings'
import { getStorefrontContent } from '@/lib/payload/storefront-content'
import { announcementList } from '@/lib/storefront-content'
import { deliveryNote } from '@/lib/delivery'
import AnnouncementTicker from './AnnouncementTicker'

// M61: the thin lavender bar above the header. M110 (ADR-050): the messages are edited in /admin
// (Storefront content), and they slide in one at a time from the left again (M93's behaviour; M101 had
// made the bar static because a long line was cut mid-word on a phone, which a one-at-a-time message
// that crosses the bar whole avoids). The delivery sentence is still built from the Settings global
// (lib/delivery.ts), the same rule checkout charges by (ADR-018); the store is COD-only (ADR-004).
// "Track order" goes to the guest order lookup (ADR-024); an admin can hide it. On the narrowest phones
// the link is hidden; the tab bar has Orders.
export default async function AnnouncementBar() {
  const [settings, content] = await Promise.all([getSettings(), getStorefrontContent()])
  const delivery = deliveryNote({ flatRate: settings.shippingFlatRate, freeShippingThreshold: settings.freeShippingThreshold })
  const messages = announcementList(content, delivery)

  return (
    <div className="bg-accent-soft text-xs font-medium text-ink-2 sm:text-sm">
      <div className="mx-auto flex min-h-9 max-w-[83rem] items-center gap-x-6 px-4 py-2 sm:px-6">
        <AnnouncementTicker messages={messages} />
        {content.showTrackOrderLink && (
          <Link href="/orders" className="hidden min-h-6 shrink-0 items-center underline-offset-4 hover:underline sm:inline-flex">Track order</Link>
        )}
      </div>
    </div>
  )
}
