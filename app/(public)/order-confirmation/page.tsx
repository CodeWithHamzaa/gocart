import type { Metadata } from 'next'
import { OrderConfirmation } from './OrderConfirmation'

// M35: guest order confirmation (ADR-027). A per-visitor transactional screen, so
// noindex. All content is read client-side from sessionStorage; nothing is fetched.
export const metadata: Metadata = {
  title: 'Order confirmed',
  robots: { index: false, follow: false },
}

export default function OrderConfirmationPage() {
  return <OrderConfirmation />
}
