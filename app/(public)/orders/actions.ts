'use server'

import { getClientIp } from '@/lib/client-ip'
import { lookupOrder, normalizeOrderNumber } from '@/lib/payload/orders'
import type { LookupOrderResult } from '@/lib/payload/orders'
import { createBucketLimiter, rateLimit } from '@/lib/rate-limit'

// M36: server action behind the guest order lookup form (ADR-024). Rate-limits BEFORE
// any database query, then delegates to lookupOrder.
//
// Two limits: per IP (counts every request), and per order number. The per-order cap
// blunts phone guessing against a known order number (an attacker rotating IPs would
// otherwise get unlimited tries). It counts FAILED lookups only (5 per hour): a slot
// is reserved before the DB query, so parallel requests cannot exceed 5 guesses, and
// refunded for every outcome except NOT_FOUND (successful lookups are free; a malformed
// phone or a server error is not a guess). It uses a fixed-size bucket limiter rather
// than rateLimit so a flood of other keys can never evict and reset a victim's counter.
// Accepted trade-off (owner-approved, 2026-10-09): someone who knows an order number can
// burn its 5 failed attempts for an hour; the admin and the confirmation page remain
// available.

const IP_LIMIT = 20
const IP_WINDOW_MS = 60 * 60 * 1000
const orderLimiter = createBucketLimiter({ limit: 5, windowMs: 60 * 60 * 1000 })

export type LookupOrderActionResult =
  | LookupOrderResult
  | { ok: false; code: 'RATE_LIMITED'; message: string }

const RATE_LIMITED = {
  ok: false,
  code: 'RATE_LIMITED',
  message: 'Too many attempts. Please wait a while and try again.',
} as const

export async function lookupOrderAction(input: {
  orderNumber: unknown
  phone: unknown
}): Promise<LookupOrderActionResult> {
  const raw: unknown = input
  const rawOrderNumber =
    typeof raw === 'object' && raw !== null ? (raw as { orderNumber?: unknown }).orderNumber : undefined
  const orderNumber = normalizeOrderNumber(rawOrderNumber)

  // Malformed order numbers never touch the limiter keys or the DB; lookupOrder
  // returns INVALID_INPUT for them.
  if (!orderNumber) return lookupOrder(input)

  const ip = await getClientIp()
  const byIp = rateLimit(`lookup-ip:${ip}`, { limit: IP_LIMIT, windowMs: IP_WINDOW_MS })
  if (!byIp.allowed) return RATE_LIMITED
  if (!orderLimiter.reserve(orderNumber).allowed) return RATE_LIMITED

  let keep = false
  try {
    const result = await lookupOrder(input)
    keep = !result.ok && result.code === 'NOT_FOUND'
    return result
  } finally {
    if (!keep) orderLimiter.release(orderNumber)
  }
}
