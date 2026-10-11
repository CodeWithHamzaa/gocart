'use server'

import { getClientIp, getVerifyIp } from '@/lib/client-ip'
import { admitLookup } from '@/lib/order-guard'
import type { GuardFailure } from '@/lib/order-guard'
import { lookupOrder, normalizeOrderNumber } from '@/lib/payload/orders'
import type { LookupOrderResult } from '@/lib/payload/orders'

// M36: server action behind the guest order lookup form (ADR-024). Rate-limits BEFORE
// any database query, then delegates to lookupOrder.
//
// M52b (ADR-035, ADR-036): the limits live in lib/order-guard.ts - a Turnstile token is REQUIRED
// (no token, a bad token or an unreachable Cloudflare all refuse the lookup), a per-IP attempts
// gate, then M36's per-order-number cap, unchanged: 5 FAILED lookups per hour, reserved before
// the query and kept only on NOT_FOUND (it blunts phone guessing against a known order number
// by an attacker rotating IPs). Accepted trade-off (owner-approved, 2026-10-09): someone who
// knows an order number can burn its 5 failed attempts for an hour; the admin and the
// confirmation page remain available.

export type LookupOrderActionResult = LookupOrderResult | GuardFailure

export async function lookupOrderAction(input: {
  orderNumber: unknown
  phone: unknown
  turnstileToken?: unknown
}): Promise<LookupOrderActionResult> {
  const raw: unknown = input
  const record = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : null
  const orderNumber = normalizeOrderNumber(record?.orderNumber)

  // Malformed order numbers never touch the limiter keys or the DB; lookupOrder
  // returns INVALID_INPUT for them.
  if (!record || !orderNumber) return lookupOrder(input)

  const admission = await admitLookup({
    ip: await getClientIp(),
    orderNumber,
    token: record.turnstileToken,
    remoteIp: await getVerifyIp(),
  })
  if (!admission.ok) return admission

  let notFound = false
  try {
    const result = await lookupOrder({ orderNumber: record.orderNumber, phone: record.phone })
    notFound = !result.ok && result.code === 'NOT_FOUND'
    return result
  } finally {
    admission.settle(notFound)
  }
}
