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
// M33a: stock is enforced here too — every line's Products.inStock is checked from the
// same fetch that supplies prices, failing closed, and any unavailable line rejects
// the whole order.
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
  | 'OUT_OF_STOCK'
  | 'INVALID_CUSTOMER'
  | 'SERVER_ERROR'

export type CreateOrderResult =
  | {
      ok: true
      orderNumber: string
      subtotal: number
      shippingCost: number
      orderTotal: number
      // M35 (ADR-027): server-priced lines in cart order, for the confirmation screen.
      items: { name: string; quantity: number; unitPrice: number }[]
    }
  | {
      ok: false
      code: CreateOrderErrorCode
      message: string
      field?: string
      productIds?: string[]
      unavailable?: { id: string; name: string }[]
    }

type Failure = Extract<CreateOrderResult, { ok: false }>

function fail(
  code: CreateOrderErrorCode,
  message: string,
  extra: {
    field?: string
    productIds?: string[]
    unavailable?: { id: string; name: string }[]
  } = {},
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
    const stockById = new Map<string, { inStock: unknown; name: string }>()
    for (const doc of found.docs as {
      id: number | string
      price: number
      inStock?: unknown
      name?: unknown
    }[]) {
      priceById.set(String(doc.id), doc.price)
      stockById.set(String(doc.id), {
        inStock: doc.inStock,
        name: typeof doc.name === 'string' ? doc.name : '',
      })
    }
    const missing = ids.filter((id) => !priceById.has(id))
    if (missing.length > 0) {
      return fail('UNKNOWN_PRODUCT', 'Some items in your cart are no longer available.', {
        productIds: missing,
      })
    }

    // M33a: stock check, from the products fetched above (never client values).
    // Fail closed: only an explicit inStock === true is purchasable.
    const unavailable = ids
      .filter((id) => stockById.get(id)?.inStock !== true)
      .map((id) => ({ id, name: stockById.get(id)?.name ?? '' }))
    if (unavailable.length > 0) {
      return fail('OUT_OF_STOCK', 'Some items in your cart are out of stock.', {
        productIds: unavailable.map((u) => u.id),
        unavailable,
      })
    }

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

    const resultItems = lines.map((line) => ({
      name: stockById.get(String(line.product))?.name ?? '',
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    }))

    return { ok: true, orderNumber, subtotal, shippingCost, orderTotal, items: resultItems }
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

// M36: guest order lookup by (orderNumber, phone) — ADR-024. Server-only; reachable
// from the client only through the lookupOrderAction server action, which rate-limits
// first. Two-factor on purpose: the order number alone never reveals anything, and a
// wrong phone is indistinguishable from an unknown number (no existence oracle).
// Uses the `phone` field (ADR-024's text says guestPhone; the collection field is
// `phone`). Never lists or enumerates; returns only the fields named below.

const ORDER_NUMBER_PATTERN = /^GC-[0-9A-Z]+-[0-9A-F]{8}$/

export type LookupOrderErrorCode = 'INVALID_INPUT' | 'NOT_FOUND' | 'SERVER_ERROR'

export type LookupOrderView = {
  orderNumber: string
  status: string
  createdAt: string
  paymentMethod: string
  isPaid: boolean
  items: { name: string; quantity: number; unitPrice: number }[]
  subtotal: number
  shippingCost: number
  orderTotal: number
  delivery: { name: string; phone: string; address: string; city: string; area?: string }
}

export type LookupOrderResult =
  | { ok: true; order: LookupOrderView }
  | { ok: false; code: LookupOrderErrorCode; message: string }

const INVALID_INPUT_MESSAGE =
  'Enter your order number (like GC-XXXXXXXX-XXXXXXXX) and the 11-digit phone number you ordered with.'

/** Normalised order number if it is well-formed, else null. Pure; no DB access. */
export function normalizeOrderNumber(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  return ORDER_NUMBER_PATTERN.test(normalized) ? normalized : null
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return PHONE_PATTERN.test(trimmed) ? trimmed : null
}

export async function lookupOrder(input: {
  orderNumber: unknown
  phone: unknown
}): Promise<LookupOrderResult> {
  const raw: unknown = input
  const orderNumber = normalizeOrderNumber(isRecord(raw) ? raw.orderNumber : undefined)
  const phone = normalizePhone(isRecord(raw) ? raw.phone : undefined)
  if (!orderNumber || !phone) {
    return { ok: false, code: 'INVALID_INPUT', message: INVALID_INPUT_MESSAGE }
  }

  try {
    const payload = await getPayload({ config })
    const found = await payload.find({
      collection: 'orders',
      where: { and: [{ orderNumber: { equals: orderNumber } }, { phone: { equals: phone } }] },
      limit: 1,
      depth: 1,
      pagination: false,
      overrideAccess: true,
    })

    const doc = found.docs[0] as unknown as Record<string, unknown> | undefined
    if (!doc) {
      return {
        ok: false,
        code: 'NOT_FOUND',
        message:
          'We could not find an order with those details. Check the order number and the phone number you used when ordering.',
      }
    }

    const rawItems = Array.isArray(doc.items) ? (doc.items as Record<string, unknown>[]) : []
    const items = rawItems.map((line) => {
      const product = line.product
      const name =
        isRecord(product) && typeof product.name === 'string' && product.name ? product.name : 'Product'
      return {
        name,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
      }
    })
    const round2 = (x: number) => Math.round(x * 100) / 100
    const subtotal = round2(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0))
    const area = typeof doc.area === 'string' && doc.area ? doc.area : undefined

    return {
      ok: true,
      order: {
        orderNumber: String(doc.orderNumber),
        status: String(doc.status),
        createdAt: String(doc.createdAt),
        paymentMethod: String(doc.paymentMethod),
        isPaid: doc.isPaid === true,
        items,
        subtotal,
        shippingCost: Number(doc.shippingCost),
        orderTotal: Number(doc.orderTotal),
        delivery: {
          name: String(doc.name),
          phone: String(doc.phone),
          address: String(doc.address),
          city: String(doc.city),
          ...(area ? { area } : {}),
        },
      },
    }
  } catch (error) {
    // Fixed message + error class/code only; never input, message, or stack.
    const err = error as { name?: unknown; code?: unknown } | null
    console.error('[lookupOrder] failed', {
      name: typeof err?.name === 'string' ? err.name : 'UnknownError',
      code: typeof err?.code === 'string' ? err.code : undefined,
    })
    return {
      ok: false,
      code: 'SERVER_ERROR',
      message: 'We could not look up your order right now. Please try again.',
    }
  }
}
