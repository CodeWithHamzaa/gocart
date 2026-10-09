import type { Metadata } from 'next'
import { OrderLookup } from './OrderLookup'

// M36: guest order lookup by order number + phone (ADR-024). Replaces the dummy-data
// orders page. Per-visitor transactional screen, so noindex.
export const metadata: Metadata = {
  title: 'Check your order',
  robots: { index: false, follow: false },
}

export default function OrdersPage() {
  return <OrderLookup />
}
