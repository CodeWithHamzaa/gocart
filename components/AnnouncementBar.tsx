import AnnouncementTicker from '@/components/ui/AnnouncementTicker'
import type { TickerMessage } from '@/components/ui/AnnouncementTicker'
import { getSettings } from '@/lib/payload/settings'
import { getStorefrontContent } from '@/lib/payload/storefront-content'
import { announcementList } from '@/lib/storefront-content'
import { formatPKR } from '@/lib/currency'
import type { DeliverySettings } from '@/lib/delivery'

// M61: the slim strip above the header. Milestone 122: it is a slow, seamless right-to-left ticker again
// (components/ui/AnnouncementTicker.tsx), at the owner's request, and "Track your order" left it for the
// header (components/Navbar.jsx), where it is a labelled button.
// M110 (ADR-050): the admin's messages come first (/admin, Storefront content), then the delivery promise,
// shortened for the strip and built from the Settings global (the same values checkout charges by, ADR-018).
function deliveryShort({ flatRate, freeShippingThreshold }: DeliverySettings): string {
  if (typeof flatRate !== 'number') return 'Delivery across Pakistan'
  if (flatRate === 0) return 'Free delivery across Pakistan'
  if (typeof freeShippingThreshold === 'number' && freeShippingThreshold > 0) return `Free delivery over ${formatPKR(freeShippingThreshold)}`
  return `Delivery ${formatPKR(flatRate)} across Pakistan`
}

const MAX_MESSAGES = 4

export default async function AnnouncementBar() {
  const [settings, content] = await Promise.all([getSettings(), getStorefrontContent()])
  const delivery = deliveryShort({ flatRate: settings.shippingFlatRate, freeShippingThreshold: settings.freeShippingThreshold })
  const messages: TickerMessage[] = announcementList(content, delivery)
    .slice(0, MAX_MESSAGES)
    .map((text) => ({ text, kind: text === delivery ? 'delivery' : 'promise' }))
  if (messages.length === 0) return null

  return (
    <aside aria-label="Store promises" className="border-b border-line bg-surface-muted text-xs font-medium text-ink-2 sm:text-sm">
      <AnnouncementTicker messages={messages} />
    </aside>
  )
}
