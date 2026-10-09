// M35: client-safe helpers that carry the placeOrder response to /order-confirmation
// through sessionStorage (ADR-027). No server imports. Stored data is untrusted:
// readLastOrder shape-validates everything and returns null on any mismatch.

export const STORAGE_KEY = 'gocart:last-order'

const ORDER_NUMBER_PATTERN = /^GC-[0-9A-Z]+-[0-9A-F]{8}$/
const MAX_AGE_MS = 24 * 60 * 60 * 1000
const MAX_FUTURE_MS = 60 * 1000

export type LastOrderItem = { name: string; quantity: number; unitPrice: number }

export type LastOrderDelivery = {
  name: string
  phone: string
  address: string
  city: string
  area?: string
}

export type LastOrder = {
  orderNumber: string
  items: LastOrderItem[]
  subtotal: number
  shippingCost: number
  orderTotal: number
  delivery: LastOrderDelivery
  placedAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function money(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max
}

export function writeLastOrder(entry: LastOrder): boolean {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry))
    return true
  } catch {
    return false
  }
}

export function readLastOrder(): LastOrder | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data: unknown = JSON.parse(raw)
    if (!isRecord(data)) return null

    if (typeof data.orderNumber !== 'string' || !ORDER_NUMBER_PATTERN.test(data.orderNumber)) {
      return null
    }

    if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 30) return null
    const items: LastOrderItem[] = []
    for (const item of data.items) {
      if (!isRecord(item)) return null
      if (!text(item.name, 200)) return null
      if (
        typeof item.quantity !== 'number' ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 20
      ) {
        return null
      }
      if (!money(item.unitPrice)) return null
      items.push({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice })
    }

    if (!money(data.subtotal) || !money(data.shippingCost) || !money(data.orderTotal)) return null

    const d = data.delivery
    if (!isRecord(d)) return null
    if (!text(d.name, 100) || !text(d.phone, 20) || !text(d.address, 300) || !text(d.city, 100)) {
      return null
    }
    if (d.area !== undefined && !text(d.area, 100)) return null

    if (typeof data.placedAt !== 'string') return null
    const placed = Date.parse(data.placedAt)
    if (Number.isNaN(placed)) return null
    const age = Date.now() - placed
    if (age < -MAX_FUTURE_MS || age > MAX_AGE_MS) return null

    return {
      orderNumber: data.orderNumber,
      items,
      subtotal: data.subtotal,
      shippingCost: data.shippingCost,
      orderTotal: data.orderTotal,
      delivery: {
        name: d.name,
        phone: d.phone,
        address: d.address,
        city: d.city,
        ...(typeof d.area === 'string' ? { area: d.area } : {}),
      },
      placedAt: data.placedAt,
    }
  } catch {
    return null
  }
}
