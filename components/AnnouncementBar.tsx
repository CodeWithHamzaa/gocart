import Link from 'next/link'
import { getSettings } from '@/lib/payload/settings'
import { getStorefrontContent } from '@/lib/payload/storefront-content'
import { announcementList } from '@/lib/storefront-content'
import { deliveryNote } from '@/lib/delivery'
import AnnouncementTicker from './AnnouncementTicker'

// M61: the thin bar above the header: ink with white text (16.9:1), its own landmark. M110 (ADR-050): the
// messages are edited in /admin (Storefront content) and cross-fade one at a time, standing still while
// shown (components/AnnouncementTicker.tsx). The delivery sentence is still built from the Settings global
// (lib/delivery.ts), the same rule checkout charges by (ADR-018); the store is COD-only (ADR-004).
// "Track order" goes to the guest order lookup (ADR-024); an admin can hide it. On phones the link is
// hidden; the tab bar has Orders.
export default async function AnnouncementBar() {
  const [settings, content] = await Promise.all([getSettings(), getStorefrontContent()])
  const delivery = deliveryNote({ flatRate: settings.shippingFlatRate, freeShippingThreshold: settings.freeShippingThreshold })
  const messages = announcementList(content, delivery)

  return (
    <aside aria-label="Announcements" className="bg-ink text-xs font-medium text-white sm:text-sm">
      <div className="mx-auto flex min-h-9 max-w-[83rem] items-center gap-x-6 px-4 py-2 sm:px-6">
        <AnnouncementTicker messages={messages} />
        {content.showTrackOrderLink && (
          <Link href="/orders" className="hidden min-h-6 shrink-0 items-center font-semibold underline underline-offset-4 hover:text-accent sm:inline-flex">Track order</Link>
        )}
      </div>
    </aside>
  )
}
