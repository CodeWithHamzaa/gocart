'use server'

import { getClientIp, getVerifyIp } from '@/lib/client-ip'
import { admitPlaceOrder, normalizeIdempotencyKey } from '@/lib/order-guard'
import type { GuardFailure } from '@/lib/order-guard'
import { createOrder, findOrderByIdempotencyKey } from '@/lib/payload/orders'
import type { CreateOrderInput, CreateOrderResult } from '@/lib/payload/orders'
import { normalizePhone, validatePhone } from '@/lib/validation/pk'

// M33: server action behind the cart's Place Order button (ADR-026). Lives outside
// lib/payload/ because that directory is server-code-only and must not export
// 'use server' functions to the client. Delegates all validation and pricing to createOrder.
// M52b (ADR-035, ADR-036): admission goes through lib/order-guard.ts - a Turnstile token is
// REQUIRED (no token, a bad token or an unreachable Cloudflare all refuse the order), per-IP
// attempt and order ceilings, and per (phone, IP) limits that count successful orders only.
// ADR-036: the client sends an idempotency key per checkout attempt; a retry with the same
// key returns the order already created instead of creating another.

export type PlaceOrderInput = CreateOrderInput & { turnstileToken?: string | null; idempotencyKey?: string | null }

export type PlaceOrderResult = CreateOrderResult | GuardFailure

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  // Server-action input is untrusted regardless of its TypeScript type.
  const raw: unknown = input
  const record = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : null
  const customer = record?.customer
  const phone = normalizePhone(
    typeof customer === 'object' && customer !== null ? (customer as { phone?: unknown }).phone : undefined,
  )

  // A malformed phone (or a non-object input) cannot become an order: createOrder rejects it
  // before its first database access (a documented invariant in lib/payload/orders.ts). It
  // touches no limiter, spends no Turnstile token and makes no network call.
  if (!record || validatePhone(phone)) return createOrder(input)

  const idempotencyKey = normalizeIdempotencyKey(record.idempotencyKey)
  const admission = await admitPlaceOrder<CreateOrderResult>({
    ip: await getClientIp(),
    phone,
    token: record.turnstileToken,
    idempotencyKey,
    remoteIp: await getVerifyIp(),
    findExisting: findOrderByIdempotencyKey,
  })
  if (!admission.ok) return admission
  if (admission.kind === 'replay') return admission.result

  // The token and the key are for admission only; createOrder sees just the order fields.
  const orderInput = { items: record.items, customer: record.customer } as CreateOrderInput
  let created = false
  try {
    const result = await createOrder(orderInput, { idempotencyKey })
    created = result.ok
    return result
  } finally {
    // Only successful orders count towards the limits.
    if (!created) admission.release()
  }
}
