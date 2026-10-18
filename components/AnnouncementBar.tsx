import { BanknoteIcon, TruckIcon } from 'lucide-react'
import { getSettings } from '@/lib/payload/settings'
import { deliveryNote } from '@/lib/delivery'

// M45a: the thin bar above the header. Both statements are real: the delivery line is the same
// sentence checkout charges by (lib/delivery.ts, Settings global), and the store is COD-only.
// The delivery line is hidden on the narrowest phones so the bar never wraps to two lines.
export default async function AnnouncementBar() {
  const settings = await getSettings()
  const delivery = deliveryNote({ flatRate: settings.shippingFlatRate, freeShippingThreshold: settings.freeShippingThreshold })

  return (
    <div className="bg-ink text-white/85 text-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-x-6 px-4 py-2">
        <p className="hidden items-center gap-2 sm:flex">
          <TruckIcon size={14} aria-hidden="true" className="text-brand-400" />
          {delivery}
        </p>
        <p className="flex items-center gap-2">
          <BanknoteIcon size={14} aria-hidden="true" className="text-brand-400" />
          Cash on Delivery across Pakistan
        </p>
      </div>
    </div>
  )
}
