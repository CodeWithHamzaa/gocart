import Link from 'next/link'
import { getSettings } from '@/lib/payload/settings'
import { deliveryNote } from '@/lib/delivery'

// M61: the thin lavender bar above the header. Both statements are real: the delivery line is the
// same sentence checkout charges by (lib/delivery.ts, Settings global), and the store is COD-only
// (ADR-004). "Track order" goes to the guest order lookup (ADR-024). Help and the language switch
// from the design are left out: no page exists for either. The delivery line and the link are
// the link is hidden on the narrowest phones; the tab bar has Orders. The line scrolls (M93).
export default async function AnnouncementBar() {
  const settings = await getSettings()
  const delivery = deliveryNote({ flatRate: settings.shippingFlatRate, freeShippingThreshold: settings.freeShippingThreshold })
  const message = `${delivery} \u00b7 Cash on delivery across Pakistan`

  // The message crosses the bar once at a time, left to right, then starts again from the left
  // (globals.css). One copy only, so a screen reader reads it once. It pauses on hover and focus
  // and stands still for anyone who asked their device to reduce motion.
  return (
    <div className="bg-primary-soft text-[13px] font-semibold text-primary-dark">
      <div className="mx-auto flex max-w-[83rem] items-center gap-x-6 px-4 py-2.5 sm:px-6">
        <div className="marquee min-w-0 flex-1 overflow-hidden" tabIndex={0}>
          <p className="marquee-track inline-block whitespace-nowrap">{message}</p>
        </div>
        <Link href="/orders" className="hidden min-h-6 shrink-0 items-center hover:underline sm:inline-flex">Track order</Link>
      </div>
    </div>
  )
}
