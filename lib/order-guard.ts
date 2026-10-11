// M52b: admission control for guest order placement and order lookup (ADR-035 decisions 1,
// 4, 5 and 6; amends ADR-026 decision 6 and ADR-024's rate-limit clause). Server-only.
// The server actions stay thin: they read the IP and the token, call this guard, then call
// createOrder/lookupOrder. Customers behind one carrier-grade-NAT IP are told apart by a
// Turnstile check plus a per-phone limit, so the per-IP limit becomes a flood ceiling; the old
// strict per-IP limits apply only to `degraded` requests (no token, or Turnstile unreachable).
// The per-phone limit applies to VERIFIED orders only (EM decision D1): otherwise anyone
// without a solved challenge could exhaust a real customer's phone slots.
// No next/* imports, so the unit tests (scripts/turnstile.test.ts) can drive it with an
// injected verifier. All state is in-process (ADR-015 single instance).

import { createBucketLimiter, rateLimit } from './rate-limit'
import { verifyTurnstile } from './turnstile'
import type { TurnstileResult, Verifier } from './turnstile'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

// Changing these is a code change, not configuration (ADR-035 decision 5).
export const PLACE_ORDER_FLOOD_LIMIT = 30
export const PLACE_ORDER_FLOOD_WINDOW_MS = 15 * MINUTE
export const PLACE_ORDER_DEGRADED_LIMIT = 5
export const PLACE_ORDER_DEGRADED_WINDOW_MS = 15 * MINUTE
export const PHONE_HOURLY_LIMIT = 3
export const PHONE_HOURLY_WINDOW_MS = HOUR
export const PHONE_DAILY_LIMIT = 10
export const PHONE_DAILY_WINDOW_MS = 24 * HOUR
export const LOOKUP_FLOOD_LIMIT = 60
export const LOOKUP_FLOOD_WINDOW_MS = HOUR
export const LOOKUP_DEGRADED_LIMIT = 20
export const LOOKUP_DEGRADED_WINDOW_MS = HOUR
export const LOOKUP_ORDER_NUMBER_LIMIT = 5
export const LOOKUP_ORDER_NUMBER_WINDOW_MS = HOUR

// Overridable only by tests (createOrderGuard's `limits`); production uses the defaults.
export type GuardLimits = {
  placeFlood: number
  placeFloodWindowMs: number
  placeDegraded: number
  placeDegradedWindowMs: number
  phoneHourly: number
  phoneHourlyWindowMs: number
  phoneDaily: number
  phoneDailyWindowMs: number
  lookupFlood: number
  lookupFloodWindowMs: number
  lookupDegraded: number
  lookupDegradedWindowMs: number
  lookupOrderNumber: number
  lookupOrderNumberWindowMs: number
}

const DEFAULT_LIMITS: GuardLimits = {
  placeFlood: PLACE_ORDER_FLOOD_LIMIT,
  placeFloodWindowMs: PLACE_ORDER_FLOOD_WINDOW_MS,
  placeDegraded: PLACE_ORDER_DEGRADED_LIMIT,
  placeDegradedWindowMs: PLACE_ORDER_DEGRADED_WINDOW_MS,
  phoneHourly: PHONE_HOURLY_LIMIT,
  phoneHourlyWindowMs: PHONE_HOURLY_WINDOW_MS,
  phoneDaily: PHONE_DAILY_LIMIT,
  phoneDailyWindowMs: PHONE_DAILY_WINDOW_MS,
  lookupFlood: LOOKUP_FLOOD_LIMIT,
  lookupFloodWindowMs: LOOKUP_FLOOD_WINDOW_MS,
  lookupDegraded: LOOKUP_DEGRADED_LIMIT,
  lookupDegradedWindowMs: LOOKUP_DEGRADED_WINDOW_MS,
  lookupOrderNumber: LOOKUP_ORDER_NUMBER_LIMIT,
  lookupOrderNumberWindowMs: LOOKUP_ORDER_NUMBER_WINDOW_MS,
}

export type GuardFailure = {
  ok: false
  code: 'RATE_LIMITED' | 'VERIFICATION_FAILED'
  message: string
}

// Messages never echo submitted values (ADR-035 decision 6).
export const PLACE_ORDER_VERIFICATION_MESSAGE =
  "The security check didn't complete. Please wait for it to finish, then press Place Order again."
export const LOOKUP_VERIFICATION_MESSAGE =
  "The security check didn't complete. Please wait for it to finish, then press Check order again."
// Points at the contact details in the footer (from Settings) rather than fetching them here.
export const PHONE_LIMIT_MESSAGE =
  'Too many orders have been placed with this phone number recently. Please try again later, or contact us to place your order.'
export const LOOKUP_RATE_LIMITED_MESSAGE = 'Too many attempts. Please wait a while and try again.'

const minutesText = (retryAfterSec: number) => {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60))
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}

// The verifier never throws by design; if it ever does, treat it as uncertain (degraded).
async function safeVerify(verify: Verifier, ...args: Parameters<Verifier>): Promise<TurnstileResult> {
  try {
    return await verify(...args)
  } catch {
    return { outcome: 'degraded', reason: 'network' }
  }
}

const rateLimited = (message: string): GuardFailure => ({ ok: false, code: 'RATE_LIMITED', message })
const verificationFailed = (message: string): GuardFailure => ({ ok: false, code: 'VERIFICATION_FAILED', message })

export type PlaceOrderAdmission = { ok: true; release: () => void } | GuardFailure
export type LookupAdmission = { ok: true; settle: (notFound: boolean) => void } | GuardFailure

export type PlaceOrderRequest = {
  ip: string // rate-limit key from getClientIp()
  phone: string // normalised and already validated (03XXXXXXXXX)
  token: unknown // turnstileToken from the client, untrusted
  remoteIp: string | null // getVerifyIp(): raw cf-connecting-ip in production, else null
}

export type LookupRequest = {
  ip: string
  orderNumber: string // normalised and already validated
  token: unknown
  remoteIp: string | null
}

/** Fresh limiters per instance (tests are isolated by instance, and by IP for the shared rateLimit map). */
type GuardLogger = Pick<Console, 'warn'>

export function createOrderGuard({
  verify,
  limits,
  logger = console,
}: {
  verify: Verifier
  limits?: Partial<GuardLimits>
  logger?: GuardLogger
}) {
  const l = { ...DEFAULT_LIMITS, ...limits }
  // One line per refusal, with which window tripped; never the phone, IP or name.
  const phoneLimited = (window: 'hourly' | 'daily') => {
    logger.warn('[order-guard] phone-limit', { window })
    return rateLimited(PHONE_LIMIT_MESSAGE)
  }
  const phoneHourly = createBucketLimiter({ limit: l.phoneHourly, windowMs: l.phoneHourlyWindowMs })
  const phoneDaily = createBucketLimiter({ limit: l.phoneDaily, windowMs: l.phoneDailyWindowMs })
  const orderNumbers = createBucketLimiter({ limit: l.lookupOrderNumber, windowMs: l.lookupOrderNumberWindowMs })

  async function admitPlaceOrder({ ip, phone, token, remoteIp }: PlaceOrderRequest): Promise<PlaceOrderAdmission> {
    // Flood ceiling: counts every request that reaches it, whatever the Turnstile outcome, so
    // siteverify calls and database work per IP stay bounded.
    const flood = rateLimit(`place-order:${ip}`, { limit: l.placeFlood, windowMs: l.placeFloodWindowMs })
    if (!flood.allowed) {
      return rateLimited(`Too many orders from your connection. Please try again in about ${minutesText(flood.retryAfterSec)}.`)
    }

    const check = await safeVerify(verify, token, { action: 'place_order', remoteIp })
    // A rejected token never falls through to the degraded path and never touches a phone bucket.
    if (check.outcome === 'rejected') return verificationFailed(PLACE_ORDER_VERIFICATION_MESSAGE)
    if (check.outcome === 'degraded') {
      // Today's strict limit, on its own key so tokenless requests cannot spend the budget of
      // verified customers on the same IP.
      const degraded = rateLimit(`place-order-degraded:${ip}`, {
        limit: l.placeDegraded,
        windowMs: l.placeDegradedWindowMs,
      })
      if (!degraded.allowed) {
        return rateLimited(
          `We couldn't complete the security check, and too many orders have come from your connection. Please reload the page and try again, or wait about ${minutesText(degraded.retryAfterSec)}.`,
        )
      }
      // Bounded by the degraded budget alone; reserves no phone slot (D1).
      return { ok: true, release() {} }
    }

    // Verified only. Reserved now, refunded by release() unless the order is created, so only
    // successful orders count.
    if (!phoneHourly.reserve(phone).allowed) return phoneLimited('hourly')
    if (!phoneDaily.reserve(phone).allowed) {
      phoneHourly.release(phone)
      return phoneLimited('daily')
    }
    let released = false
    return {
      ok: true,
      release() {
        if (released) return
        released = true
        phoneHourly.release(phone)
        phoneDaily.release(phone)
      },
    }
  }

  async function admitLookup({ ip, orderNumber, token, remoteIp }: LookupRequest): Promise<LookupAdmission> {
    const flood = rateLimit(`lookup-ip:${ip}`, { limit: l.lookupFlood, windowMs: l.lookupFloodWindowMs })
    if (!flood.allowed) return rateLimited(LOOKUP_RATE_LIMITED_MESSAGE)

    const check = await safeVerify(verify, token, { action: 'order_lookup', remoteIp })
    if (check.outcome === 'rejected') return verificationFailed(LOOKUP_VERIFICATION_MESSAGE)
    if (check.outcome === 'degraded') {
      const degraded = rateLimit(`lookup-degraded:${ip}`, {
        limit: l.lookupDegraded,
        windowMs: l.lookupDegradedWindowMs,
      })
      if (!degraded.allowed) return rateLimited(LOOKUP_RATE_LIMITED_MESSAGE)
    }

    // M36's per-order-number cap, unchanged: 5 FAILED lookups per hour. Reserved before the
    // query (parallel requests cannot exceed it), kept only on NOT_FOUND. A fixed-size bucket
    // limiter, so a flood of other keys can never evict and reset a victim's counter.
    if (!orderNumbers.reserve(orderNumber).allowed) return rateLimited(LOOKUP_RATE_LIMITED_MESSAGE)
    let settled = false
    return {
      ok: true,
      settle(notFound) {
        if (settled) return
        settled = true
        if (!notFound) orderNumbers.release(orderNumber)
      },
    }
  }

  return { admitPlaceOrder, admitLookup }
}

const defaultGuard = createOrderGuard({ verify: verifyTurnstile })

export const admitPlaceOrder = defaultGuard.admitPlaceOrder
export const admitLookup = defaultGuard.admitLookup
