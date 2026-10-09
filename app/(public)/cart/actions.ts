'use server'

import { headers } from 'next/headers'
import { createOrder } from '@/lib/payload/orders'
import type { CreateOrderInput, CreateOrderResult } from '@/lib/payload/orders'
import { rateLimit } from '@/lib/rate-limit'

// M33: server action behind the cart's Place Order button (ADR-026). Lives outside
// lib/payload/ because that directory is server-code-only and must not export
// 'use server' functions to the client. Rate-limits by client IP, then delegates
// all validation and pricing to createOrder.

const ORDER_LIMIT = 5
const ORDER_WINDOW_MS = 15 * 60 * 1000

export type PlaceOrderResult =
  | CreateOrderResult
  | { ok: false; code: 'RATE_LIMITED'; message: string }

async function getClientIp(): Promise<string> {
  const h = await headers()
  const cf = h.get('cf-connecting-ip')?.trim()
  if (cf) return cf
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwarded) return forwarded
  return 'unknown'
}

export async function placeOrder(input: CreateOrderInput): Promise<PlaceOrderResult> {
  const ip = await getClientIp()
  const { allowed, retryAfterSec } = rateLimit(`place-order:${ip}`, {
    limit: ORDER_LIMIT,
    windowMs: ORDER_WINDOW_MS,
  })
  if (!allowed) {
    const minutes = Math.max(1, Math.ceil(retryAfterSec / 60))
    return {
      ok: false,
      code: 'RATE_LIMITED',
      message: `Too many orders from your connection. Please try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    }
  }

  return createOrder(input)
}
