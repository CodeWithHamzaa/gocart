import Link from 'next/link'
import { getSettings } from '@/lib/payload/settings'
import { deliveryNote } from '@/lib/delivery'

// M61: the thin lavender bar above the header. Both statements are real: the delivery line is the
// same sentence checkout charges by (lib/delivery.ts, Settings global), and the store is COD-only
// (ADR-004). "Track order" goes to the guest order lookup (ADR-024). Help and the language switch
// from the design are left out: no page exists for either. The delivery line and the link are
// the link is hidden on the narrowest phones; the tab bar has Orders.
export default async function AnnouncementBar() {
  const settings = await getSettings()
  const delivery = deliveryNote({ flatRate: settings.shippingFlatRate, freeShippingThreshold: settings.freeShippingThreshold })

  // M101: static, not a marquee (M93). On a phone the moving line was almost always cut mid-word, and
  // the same words were also in the hero. A phone shows the short promise only; from `sm` the delivery
  // rule follows it, and the "Track order" link sits on the right. A soft violet strip (lavender-wash palette).
  return (
    <div className="bg-primary-soft text-xs font-medium text-sky-ink sm:text-[13px]">
      <div className="mx-auto flex min-h-9 max-w-[83rem] items-center justify-center gap-x-6 px-4 py-2 sm:justify-between sm:px-6">
        <p className="text-center">
          Cash on delivery across Pakistan
          <span className="hidden sm:inline"> &middot; {delivery}</span>
        </p>
        <Link href="/orders" className="hidden min-h-6 shrink-0 items-center underline-offset-4 hover:underline sm:inline-flex">Track order</Link>
      </div>
    </div>
  )
}
