import { formatPKR } from './currency'

// One sentence about delivery charges, derived from the Settings global (ADR-018: a flat rate,
// free at or above a threshold). Shared by the product page and the home page so neither can
// disagree with what checkout charges. Null values are never guessed.
export type DeliverySettings = {
  flatRate?: number | null
  freeShippingThreshold?: number | null
}

export function deliveryNote(shipping?: DeliverySettings | null): string {
  const flat = shipping?.flatRate
  const threshold = shipping?.freeShippingThreshold
  if (typeof flat !== 'number') return 'Delivery charges are shown at checkout'
  if (flat === 0) return 'Free delivery across Pakistan'
  if (typeof threshold === 'number' && threshold > 0) {
    return `Delivery ${formatPKR(flat)} \u00b7 free on orders of ${formatPKR(threshold)} or more`
  }
  return `Delivery ${formatPKR(flat)} across Pakistan`
}
