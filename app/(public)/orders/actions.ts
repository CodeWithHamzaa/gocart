'use server'

import { getClientIp } from '@/lib/client-ip'
import { lookupOrder, normalizeOrderNumber } from '@/lib/payload/orders'
import type { LookupOrderResult } from '@/lib/payload/orders'
import { rateLimit } from '@/lib/rate-limit'

// M36: server action behind the guest order lookup form (ADR-024). Rate-limits BEFORE
// any database query, then delegates to lookupOrder.
//
// Two limits: per IP, and per order number. The per-order cap blunts phone guessing
// against a known order number (an attacker rotating IPs would otherwise get unlimited
// tries). The accepted trade-off: someone who knows an order number can burn its
// attempts for an hour; the admin and the confirmation page remain available.

const IP_LIMIT = 10
const IP_WINDOW_MS = 15 * 60 * 1000
const ORDER_LIMIT = 10
const ORDER_WINDOW_MS = 60 * 60 * 1000

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
  const byOrder = rateLimit(`lookup-order:${orderNumber}`, {
    limit: ORDER_LIMIT,
    windowMs: ORDER_WINDOW_MS,
  })
  if (!byOrder.allowed) return RATE_LIMITED

  return lookupOrder(input)
}
