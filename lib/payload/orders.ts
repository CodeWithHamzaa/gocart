import { getPayload } from 'payload'
import config from '@payload-config'

// M33: the only public path that creates an Order (ADR-026). Server-only (Payload
// Local API) — call from Server Actions / Route Handlers, never a 'use client'
// component. Prices, shipping, totals, status and payment fields are all derived
// here from Products and Settings (ADR-018, ADR-004, ADR-019); the caller supplies
// only cart lines and the guest details (ADR-021). Validation runs before any write
// and a single failure rejects the whole order. Writes use overrideAccess: true
// because Orders.access.create is admin-only; that is safe only because everything
// is validated first. Returns just the order number and totals, never the stored doc.
//
// Types are hand-written, not generated — same reasoning as products.ts.

export const MAX_QUANTITY_PER_LINE = 20
export const MAX_LINES = 30

const MAX_NAME = 100
const MAX_ADDRESS = 300
const MAX_CITY = 100
const MAX_AREA = 100
const PHONE_PATTERN = /^0[0-9]{10}$/
const ID_PATTERN = /^\d+$/
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/
// Products.id is a Postgres integer; anything above this cannot exist.
const MAX_PRODUCT_ID = 2147483647

export type CreateOrderInput = {
  items: { productId: string | number; quantity: number }[]
  customer: {
    name: string
    phone: string
    address: string
    city: string
    area?: string
  }
}

export type CreateOrderErrorCode =
  | 'EMPTY_CART'
  | 'INVALID_ITEM'
  | 'INVALID_QUANTITY'
  | 'UNKNOWN_PRODUCT'
  | 'INVALID_CUSTOMER'
  | 'SERVER_ERROR'

export type CreateOrderResult =
  | { ok: true; orderNumber: string; subtotal: number; shippingCost: number; orderTotal: number }
  | {
      ok: false
      code: CreateOrderErrorCode
      message: string
      field?: string
      productIds?: string[]
    }

type Failure = Extract<CreateOrderResult, { ok: false }>

function fail(
  code: CreateOrderErrorCode,
  message: string,
  extra: { field?: string; productIds?: string[] } = {},
): Failure {
  return { ok: false, code, message, ...extra }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cleanText(value: unknown, max: number, required: boolean): string | null {
  if (typeof value !== 'string') return required ? null : ''
  const trimmed = value.trim()
  // Single-line fields: no control characters (covers NUL and newlines).
  if (CONTROL_CHARS.test(trimmed)) return null
  if (required && trimmed.length === 0) return null
  if (trimmed.length > max) return null
  return trimmed
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  // Server-action input is untrusted regardless of its TypeScript type.
  const raw: unknown = input
  const rawItems = isRecord(raw) ? raw.items : undefined
  const rawCustomer = isRecord(raw) ? raw.customer : undefined

  // --- Cart lines ---
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return fail('EMPTY_CART', 'Your cart is empty.')
  }
  if (rawItems.length > MAX_LINES) {
    return fail('INVALID_ITEM', `An order can contain at most ${MAX_LINES} different products.`)
  }

  const merged = new Map<string, number>()
  for (const line of rawItems) {
    if (!isRecord(line)) return fail('INVALID_ITEM', 'One of the cart items is invalid.')
    const { productId, quantity } = line
    if (typeof productId !== 'string' && typeof productId !== 'number') {
      return fail('INVALID_ITEM', 'One of the cart items is invalid.')
    }
    const id = String(productId).trim()
    if (!ID_PATTERN.test(id)) {
      return fail('INVALID_ITEM', 'One of the cart items is invalid.', { productIds: [id.slice(0, 40)] })
    }
    if (
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY_PER_LINE
    ) {
      return fail(
        'INVALID_QUANTITY',
        `Quantity must be a whole number between 1 and ${MAX_QUANTITY_PER_LINE}.`,
        { productIds: [id] },
      )
    }
    // Strip leading zeros on the string; Number() would mangle huge ids ('1e+21').
    const normalizedId = id.replace(/^0+(?=\d)/, '')
    merged.set(normalizedId, (merged.get(normalizedId) ?? 0) + quantity)
  }
  for (const [id, quantity] of merged) {
    if (quantity > MAX_QUANTITY_PER_LINE) {
      return fail(
        'INVALID_QUANTITY',
        `Quantity must be a whole number between 1 and ${MAX_QUANTITY_PER_LINE}.`,
        { productIds: [id] },
      )
    }
  }

  // Ids beyond the integer column range cannot exist; reject before any DB query.
  const outOfRange = [...merged.keys()].filter(
    (id) => id.length > 10 || Number(id) > MAX_PRODUCT_ID,
  )
  if (outOfRange.length > 0) {
    return fail('UNKNOWN_PRODUCT', 'Some items in your cart are no longer available.', {
      productIds: outOfRange,
    })
  }

  // --- Customer ---
  if (!isRecord(rawCustomer)) {
    return fail('INVALID_CUSTOMER', 'Delivery details are missing.')
  }
  const name = cleanText(rawCustomer.name, MAX_NAME, true)
  if (name === null) return fail('INVALID_CUSTOMER', 'Please enter a valid name.', { field: 'name' })
  const address = cleanText(rawCustomer.address, MAX_ADDRESS, true)
  if (address === null) return fail('INVALID_CUSTOMER', 'Please enter a valid address.', { field: 'address' })
  const city = cleanText(rawCustomer.city, MAX_CITY, true)
  if (city === null) return fail('INVALID_CUSTOMER', 'Please enter a valid city.', { field: 'city' })
  const area = cleanText(rawCustomer.area, MAX_AREA, false)
  if (area === null) return fail('INVALID_CUSTOMER', 'Please enter a valid area.', { field: 'area' })
  const phone = typeof rawCustomer.phone === 'string' ? rawCustomer.phone.trim() : ''
  if (!PHONE_PATTERN.test(phone)) {
    return fail('INVALID_CUSTOMER', 'Phone must be 11 digits starting with 0, e.g. 03001234567.', {
      field: 'phone',
    })
  }

  // --- Server-side reads and the write ---
  // Deliberately no logging of customer fields anywhere in this function.
  try {
    const payload = await getPayload({ config })

    const ids = [...merged.keys()]
    const found = await payload.find({
      collection: 'products',
      where: { id: { in: ids.map(Number) } },
      limit: ids.length,
      depth: 0,
      pagination: false,
      overrideAccess: false,
    })

    const priceById = new Map<string, number>()
    for (const doc of found.docs as { id: number | string; price: number }[]) {
      priceById.set(String(doc.id), doc.price)
    }
    const missing = ids.filter((id) => !priceById.has(id))
    if (missing.length > 0) {
      return fail('UNKNOWN_PRODUCT', 'Some items in your cart are no longer available.', {
        productIds: missing,
      })
    }

    // M33a: stock check goes here (after products are fetched, before any write).

    const settings = (await payload.findGlobal({ slug: 'settings', depth: 0 })) as {
      shippingFlatRate: number
      freeShippingThreshold: number
    }

    const isValidMoney = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0
    if (
      !isValidMoney(settings?.shippingFlatRate) ||
      !isValidMoney(settings?.freeShippingThreshold) ||
      ![...priceById.values()].every(isValidMoney)
    ) {
      return fail('SERVER_ERROR', 'We could not place your order. Please try again.')
    }

    const lines = ids.map((id) => ({
      product: Number(id),
      quantity: merged.get(id) as number,
      unitPrice: priceById.get(id) as number,
    }))
    const round2 = (x: number) => Math.round(x * 100) / 100
    const subtotal = round2(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0))
    const shippingCost = round2(
      subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFlatRate,
    )
    const orderTotal = round2(subtotal + shippingCost)

    const created = await payload.create({
      collection: 'orders',
      overrideAccess: true,
      depth: 0,
      data: {
        name,
        phone,
        address,
        city,
        area,
        items: lines,
        orderTotal,
        shippingCost,
        paymentMethod: 'COD',
        status: 'PLACED',
        isPaid: false,
      },
    })

    const orderNumber = (created as { orderNumber?: string }).orderNumber
    if (!orderNumber) {
      return fail('SERVER_ERROR', 'We could not place your order. Please try again.')
    }

    return { ok: true, orderNumber, subtotal, shippingCost, orderTotal }
  } catch (error) {
    // Log only the error class and code: Postgres/Payload messages can embed row
    // data (guest name/phone/address), so never log message, stack, or input.
    const err = error as { name?: unknown; code?: unknown } | null
    console.error('[createOrder] failed', {
      name: typeof err?.name === 'string' ? err.name : 'UnknownError',
      code: typeof err?.code === 'string' ? err.code : undefined,
    })
    return fail('SERVER_ERROR', 'We could not place your order. Please try again.')
  }
}
