import Link from 'next/link'
import { getSettings } from '@/lib/payload/settings'
import { deliveryNote } from '@/lib/delivery'

// M61: the thin lavender bar above the header. Both statements are real: the delivery line is the
// same sentence checkout charges by (lib/delivery.ts, Settings global), and the store is COD-only
// (ADR-004). "Track order" goes to the guest order lookup (ADR-024). Help and the language switch
// from the design are left out: no page exists for either. The delivery line and the link are
// hidden on the narrowest phones so the bar never wraps to two lines; the tab bar has Orders.
export default async function AnnouncementBar() {
  const settings = await getSettings()
  const delivery = deliveryNote({ flatRate: settings.shippingFlatRate, freeShippingThreshold: settings.freeShippingThreshold })

  return (
    <div className="bg-primary-soft text-[13px] font-semibold text-primary-dark">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-x-6 px-4 py-2.5 sm:justify-between sm:px-6">
        <p>
          <span className="hidden sm:inline">{delivery} &middot; </span>
          Cash on delivery across Pakistan
        </p>
        <Link href="/orders" className="hidden min-h-6 items-center hover:underline sm:inline-flex">Track order</Link>
      </div>
    </div>
  )
}
