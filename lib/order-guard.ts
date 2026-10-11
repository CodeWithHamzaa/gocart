// M52b (ADR-035) as amended by ADR-036: admission control for guest order placement and order
// lookup. Server-only. The server actions stay thin: they read the IP and the token, call this
// guard, then call createOrder/lookupOrder.
//
// STRICT POLICY (ADR-036, owner direction 2026-10-11): a Turnstile token is REQUIRED. A request
// without one, with a bad one, or while Cloudflare cannot be asked, is refused - there is no
// "degraded" path that lets an unverified order through. The only request that may proceed
// without a fresh token is the replay of an order that already exists (idempotency, below).
//
// Order of checks, cheapest first; each refusal happens before anything more expensive runs:
//   1. no token and no idempotency key -> refused at once, touching no limiter, no network, no DB
//      (a tokenless request WITH a well-formed key does go on: it takes an attempts slot and one
//      indexed DB lookup, because it may be the retry of an order that already exists);
//   2. production request with no valid client IP -> refused (misconfiguration, error-logged);
//   3. attempts gates per IP and per IPv6 /48, plus a per-client cap on in-flight verifications - every request that gets this far, whatever happens next, so
//      siteverify calls and DB lookups per IP stay bounded;
//   4. idempotent replay: the same key + the same phone returns the order already created,
//      without a token (a token is single-use and was spent on the first request) and without
//      consuming any order limit - a lost response must never become a second order;
//   5. Turnstile: rejected (security validation) / unavailable (provider or configuration)
//      -> refused with different codes and messages;
//   6. verified-order limits: per-IP ceiling, per (phone, IP) hourly and daily. They count
//      SUCCESSFUL orders only (a slot is reserved and refunded on failure).
// Victim lock-out (M2): the phone limits are keyed by phone AND client IP, so someone ordering
// with a victim's number from their own connection spends their own allowance, never the
// victim's. A store-wide per-phone count is a log-only alert, never a refusal.
// No next/* imports, so the unit tests (scripts/turnstile.test.ts) can drive it with an
// injected verifier. All state is in-process (ADR-015 single instance).

import { createBucketLimiter } from './rate-limit'
import { verifyTurnstile } from './turnstile'
import type { RejectedReason, TurnstileResult, UnavailableReason, Verifier } from './turnstile'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

// Changing these is a code change, not configuration (ADR-035 decision 5, ADR-036).
// Generous on purpose: only requests that carry a token or an idempotency key count, a real customer needs
// a handful, and a neighbour on the same CGNAT address must not be able to lock the others out cheaply.
export const PLACE_ATTEMPT_LIMIT = 150
export const PLACE_ATTEMPT_WINDOW_MS = 15 * MINUTE
export const PLACE_ORDER_IP_LIMIT = 30
export const PLACE_ORDER_IP_WINDOW_MS = 15 * MINUTE
export const PHONE_IP_HOURLY_LIMIT = 3
export const PHONE_IP_HOURLY_WINDOW_MS = HOUR
export const PHONE_IP_DAILY_LIMIT = 10
export const PHONE_IP_DAILY_WINDOW_MS = 24 * HOUR
export const PHONE_WATCH_LIMIT = 10 // alert only: never refuses
export const PHONE_WATCH_WINDOW_MS = 24 * HOUR
export const LOOKUP_ATTEMPT_LIMIT = 150
export const LOOKUP_ATTEMPT_WINDOW_MS = HOUR
// ADR-036 (security review H-1): a junk token costs an attacker nothing but holds one of the 50
// siteverify slots for a Cloudflare round trip, so the slots are also limited PER CLIENT: at most
// PER_IP_CONCURRENT verifications in flight for one address key, and PER_NET_CONCURRENT for one
// IPv6 /48 (an attacker routinely owns a whole /48 = 65,536 /64 keys) or IPv4 address; and the
// attempts of a whole /48 are capped as one client.
export const PER_IP_CONCURRENT = 4
export const PER_NET_CONCURRENT = 12
export const NET_ATTEMPT_LIMIT = 1000
export const LOOKUP_ORDER_NUMBER_LIMIT = 5
export const LOOKUP_ORDER_NUMBER_WINDOW_MS = HOUR

// Overridable only by tests (createOrderGuard's `limits`); production uses the defaults.
export type GuardLimits = {
  placeAttempts: number
  placeAttemptsWindowMs: number
  placeOrdersPerIp: number
  placeOrdersPerIpWindowMs: number
  phoneIpHourly: number
  phoneIpHourlyWindowMs: number
  phoneIpDaily: number
  phoneIpDailyWindowMs: number
  phoneWatch: number
  phoneWatchWindowMs: number
  lookupAttempts: number
  lookupAttemptsWindowMs: number
  netAttempts: number
  perIpConcurrent: number
  perNetConcurrent: number
  lookupOrderNumber: number
  lookupOrderNumberWindowMs: number
}

const DEFAULT_LIMITS: GuardLimits = {
  placeAttempts: PLACE_ATTEMPT_LIMIT,
  placeAttemptsWindowMs: PLACE_ATTEMPT_WINDOW_MS,
  placeOrdersPerIp: PLACE_ORDER_IP_LIMIT,
  placeOrdersPerIpWindowMs: PLACE_ORDER_IP_WINDOW_MS,
  phoneIpHourly: PHONE_IP_HOURLY_LIMIT,
  phoneIpHourlyWindowMs: PHONE_IP_HOURLY_WINDOW_MS,
  phoneIpDaily: PHONE_IP_DAILY_LIMIT,
  phoneIpDailyWindowMs: PHONE_IP_DAILY_WINDOW_MS,
  phoneWatch: PHONE_WATCH_LIMIT,
  phoneWatchWindowMs: PHONE_WATCH_WINDOW_MS,
  lookupAttempts: LOOKUP_ATTEMPT_LIMIT,
  lookupAttemptsWindowMs: LOOKUP_ATTEMPT_WINDOW_MS,
  netAttempts: NET_ATTEMPT_LIMIT,
  perIpConcurrent: PER_IP_CONCURRENT,
  perNetConcurrent: PER_NET_CONCURRENT,
  lookupOrderNumber: LOOKUP_ORDER_NUMBER_LIMIT,
  lookupOrderNumberWindowMs: LOOKUP_ORDER_NUMBER_WINDOW_MS,
}

export type GuardFailure = {
  ok: false
  code: 'RATE_LIMITED' | 'VERIFICATION_FAILED' | 'VERIFICATION_UNAVAILABLE'
  message: string
}

// Messages never echo submitted values (ADR-035 decision 6).
export const PLACE_ORDER_VERIFICATION_MESSAGE =
  "The security check didn't complete. Please wait for it to finish, then press Place Order again."
export const LOOKUP_VERIFICATION_MESSAGE =
  "The security check didn't complete. Please wait for it to finish, then press Check order again."
export const PLACE_ORDER_EXPIRED_MESSAGE =
  'The security check has expired. It renews by itself - please wait a moment, then press Place Order again.'
export const LOOKUP_EXPIRED_MESSAGE =
  'The security check has expired. It renews by itself - please wait a moment, then press Check order again.'
// The store's contact details are in the footer (from Settings); not fetched here.
export const PLACE_ORDER_UNAVAILABLE_MESSAGE =
  "We can't run our security check right now, so we can't take your order online. Please try again in a few minutes, or contact us to place your order."
export const LOOKUP_UNAVAILABLE_MESSAGE =
  "We can't run our security check right now. Please try again in a few minutes, or contact us about your order."
export const PHONE_LIMIT_MESSAGE =
  'Too many orders have been placed with this phone number from your connection recently. Please try again later, or contact us to place your order.'
export const LOOKUP_RATE_LIMITED_MESSAGE = 'Too many attempts. Please wait a while and try again.'

const minutesText = (retryAfterSec: number) => {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60))
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}

// The verifier never throws by design; if it ever does, treat it as unavailable.
async function safeVerify(verify: Verifier, ...args: Parameters<Verifier>): Promise<TurnstileResult> {
  try {
    return await verify(...args)
  } catch {
    return { outcome: 'unavailable', reason: 'network' }
  }
}

const rateLimited = (message: string): GuardFailure => ({ ok: false, code: 'RATE_LIMITED', message })
const verificationFailed = (message: string): GuardFailure => ({ ok: false, code: 'VERIFICATION_FAILED', message })
const verificationUnavailable = (message: string): GuardFailure => ({
  ok: false,
  code: 'VERIFICATION_UNAVAILABLE',
  message,
})

const hasToken = (token: unknown): boolean => typeof token === 'string' && token.trim() !== ''

/** The idempotency key shape the client generates (a UUID or any 22-64 URL-safe characters). */
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{22,64}$/
export function normalizeIdempotencyKey(value: unknown): string | null {
  return typeof value === 'string' && IDEMPOTENCY_KEY_PATTERN.test(value) ? value : null
}

/** What a replay finds: the order already created for this key and phone, or nothing. */
export type ReplayFinder = (key: string, phone: string) => Promise<unknown | null>

export type PlaceOrderAdmission<R = unknown> =
  | { ok: true; kind: 'new'; release: () => void }
  | { ok: true; kind: 'replay'; result: R }
  | GuardFailure
export type LookupAdmission = { ok: true; settle: (notFound: boolean) => void } | GuardFailure

export type PlaceOrderRequest<R = unknown> = {
  ip: string // rate-limit key from getClientIp()
  phone: string // normalised and already validated (03XXXXXXXXX)
  token: unknown // turnstileToken from the client, untrusted
  idempotencyKey?: unknown // untrusted; only a well-formed key is used
  remoteIp: string | null // getVerifyIp(): raw cf-connecting-ip in production, else null
  findExisting?: (key: string, phone: string) => Promise<R | null>
}

export type LookupRequest = {
  ip: string
  orderNumber: string // normalised and already validated
  token: unknown
  remoteIp: string | null
}

type GuardLogger = Pick<Console, 'warn' | 'error'>

export function createOrderGuard({
  verify,
  limits,
  logger = console,
  requireClientIp = process.env.NODE_ENV === 'production',
}: {
  verify: Verifier
  limits?: Partial<GuardLimits>
  logger?: GuardLogger
  /** Production: a request with no valid client IP is refused instead of sharing an 'unknown' bucket. */
  requireClientIp?: boolean
}) {
  const l = { ...DEFAULT_LIMITS, ...limits }
  // Fixed-size, non-evicting bucket limiters throughout (rate-limit.ts): a flood of distinct
  // keys can never push a victim's counter out and reset it, it can only collide into MORE
  // restriction. One line per refusal, never the phone, IP or name.
  const placeAttempts = createBucketLimiter({ limit: l.placeAttempts, windowMs: l.placeAttemptsWindowMs })
  const placeOrdersPerIp = createBucketLimiter({ limit: l.placeOrdersPerIp, windowMs: l.placeOrdersPerIpWindowMs })
  const phoneIpHourly = createBucketLimiter({ limit: l.phoneIpHourly, windowMs: l.phoneIpHourlyWindowMs })
  const phoneIpDaily = createBucketLimiter({ limit: l.phoneIpDaily, windowMs: l.phoneIpDailyWindowMs })
  const phoneWatch = createBucketLimiter({ limit: l.phoneWatch, windowMs: l.phoneWatchWindowMs })
  const lookupAttempts = createBucketLimiter({ limit: l.lookupAttempts, windowMs: l.lookupAttemptsWindowMs })
  const orderNumbers = createBucketLimiter({ limit: l.lookupOrderNumber, windowMs: l.lookupOrderNumberWindowMs })

  const netAttempts = createBucketLimiter({ limit: l.netAttempts, windowMs: l.placeAttemptsWindowMs })
  const lookupNetAttempts = createBucketLimiter({ limit: l.netAttempts, windowMs: l.lookupAttemptsWindowMs })

  // IPv6 clients are keyed by /64 (lib/client-ip.ts); the network an attacker controls is the /48.
  const netOf = (ip: string): string => {
    const m = ip.match(/^([0-9a-f]+):([0-9a-f]+):([0-9a-f]+):[0-9a-f]+::\/64$/)
    return m ? `${m[1]}:${m[2]}:${m[3]}::/48` : ip
  }
  // In-flight verifications per client key; entries exist only while a verification is running.
  const inFlight = new Map<string, number>()
  const enter = (keys: Array<[string, number]>): (() => void) | null => {
    for (const [k, max] of keys) if ((inFlight.get(k) ?? 0) >= max) return null
    for (const [k] of keys) inFlight.set(k, (inFlight.get(k) ?? 0) + 1)
    return () => {
      for (const [k] of keys) {
        const n = (inFlight.get(k) ?? 1) - 1
        if (n <= 0) inFlight.delete(k)
        else inFlight.set(k, n)
      }
    }
  }
  const TRY_AGAIN = 'Please wait a moment and try again.'
  const verifyFor = async (ip: string, token: unknown, options: Parameters<Verifier>[1]) => {
    const net = netOf(ip)
    const leave = enter(net === ip ? [[ip, l.perIpConcurrent]] : [[ip, l.perIpConcurrent], [net, l.perNetConcurrent]])
    if (!leave) return null
    try {
      return await safeVerify(verify, token, options)
    } finally {
      leave()
    }
  }

  // At most one error line a minute for the missing-IP misconfiguration (it would repeat per request).
  let lastNoIpLog = 0
  const noClientIp = (ip: string): boolean => {
    if (!requireClientIp || ip !== 'unknown') return false
    const now = Date.now()
    if (now - lastNoIpLog >= MINUTE) {
      lastNoIpLog = now
      logger.error('[order-guard] no valid client IP (cf-connecting-ip missing or malformed); requests are refused')
    }
    return true
  }

  const phoneLimited = (window: 'hourly' | 'daily') => {
    logger.warn('[order-guard] phone-limit', { window })
    return rateLimited(PHONE_LIMIT_MESSAGE)
  }

  function refusal(check: Exclude<TurnstileResult, { outcome: 'verified' }>, place: boolean): GuardFailure {
    if (check.outcome === 'unavailable') {
      return verificationUnavailable(place ? PLACE_ORDER_UNAVAILABLE_MESSAGE : LOOKUP_UNAVAILABLE_MESSAGE)
    }
    const expired = check.reason === 'expired-or-duplicate'
    if (place) return verificationFailed(expired ? PLACE_ORDER_EXPIRED_MESSAGE : PLACE_ORDER_VERIFICATION_MESSAGE)
    return verificationFailed(expired ? LOOKUP_EXPIRED_MESSAGE : LOOKUP_VERIFICATION_MESSAGE)
  }

  async function admitPlaceOrder<R = unknown>({
    ip,
    phone,
    token,
    idempotencyKey,
    remoteIp,
    findExisting,
  }: PlaceOrderRequest<R>): Promise<PlaceOrderAdmission<R>> {
    const key = normalizeIdempotencyKey(idempotencyKey)
    // 1. Nothing to verify and nothing to replay: refuse for free.
    if (!hasToken(token) && !key) return verificationFailed(PLACE_ORDER_VERIFICATION_MESSAGE)

    // 2. Production traffic always arrives through Cloudflare, so a missing address is a fault.
    if (noClientIp(ip)) {
      return verificationUnavailable(PLACE_ORDER_UNAVAILABLE_MESSAGE)
    }

    // 3. Attempts gate: counts everything that reaches the expensive steps.
    const attempt = placeAttempts.reserve(ip)
    if (!attempt.allowed) {
      return rateLimited(`Too many attempts from your connection. Please try again in about ${minutesText(attempt.retryAfterSec)}.`)
    }

    const netGate = netAttempts.reserve(netOf(ip))
    if (!netGate.allowed) return rateLimited(`Too many attempts from your network. Please try again in about ${minutesText(netGate.retryAfterSec)}.`)

    // 4. Idempotent replay (a lost response, a double tap): no token, no order limits.
    if (key && findExisting) {
      let existing: R | null = null
      try {
        existing = await findExisting(key, phone)
      } catch {
        existing = null
      }
      if (existing) return { ok: true, kind: 'replay', result: existing }
    }
    if (!hasToken(token)) return verificationFailed(PLACE_ORDER_VERIFICATION_MESSAGE)

    // 5. Turnstile. A token that is not verified never reaches a phone bucket or createOrder.
    const check = await verifyFor(ip, token, { action: 'place_order', remoteIp })
    if (!check) return rateLimited(TRY_AGAIN)
    if (check.outcome !== 'verified') return refusal(check, true)

    // 6. Verified orders only. Reserved now, refunded by release() unless the order is created,
    // so only successful orders count.
    const reserved: Array<{ limiter: ReturnType<typeof createBucketLimiter>; key: string }> = []
    const reserve = (limiter: ReturnType<typeof createBucketLimiter>, k: string) => {
      const r = limiter.reserve(k)
      if (r.allowed) reserved.push({ limiter, key: k })
      return r
    }
    const undo = () => {
      for (const { limiter, key: k } of reserved.splice(0)) limiter.release(k)
    }

    const perIp = reserve(placeOrdersPerIp, ip)
    if (!perIp.allowed) {
      return rateLimited(`Too many orders from your connection. Please try again in about ${minutesText(perIp.retryAfterSec)}.`)
    }
    const pairKey = `${phone}|${ip}`
    if (!reserve(phoneIpHourly, pairKey).allowed) {
      undo()
      return phoneLimited('hourly')
    }
    if (!reserve(phoneIpDaily, pairKey).allowed) {
      undo()
      return phoneLimited('daily')
    }
    // Store-wide volume on one phone number: an alert for the admin, never a refusal, so nobody
    // can lock a customer out by ordering with their number (M2).
    if (!reserve(phoneWatch, phone).allowed) logger.warn('[order-guard] phone-volume', { window: 'daily' })

    let released = false
    return {
      ok: true,
      kind: 'new',
      release() {
        if (released) return
        released = true
        undo()
      },
    }
  }

  async function admitLookup({ ip, orderNumber, token, remoteIp }: LookupRequest): Promise<LookupAdmission> {
    if (!hasToken(token)) return verificationFailed(LOOKUP_VERIFICATION_MESSAGE)
    if (noClientIp(ip)) {
      return verificationUnavailable(LOOKUP_UNAVAILABLE_MESSAGE)
    }

    const attempt = lookupAttempts.reserve(ip)
    if (!attempt.allowed) return rateLimited(LOOKUP_RATE_LIMITED_MESSAGE)
    if (!lookupNetAttempts.reserve(netOf(ip)).allowed) return rateLimited(LOOKUP_RATE_LIMITED_MESSAGE)

    const check = await verifyFor(ip, token, { action: 'order_lookup', remoteIp })
    if (!check) return rateLimited(TRY_AGAIN)
    if (check.outcome !== 'verified') return refusal(check, false)

    // M36's per-order-number cap, unchanged: 5 FAILED lookups per hour. Reserved before the
    // query (parallel requests cannot exceed it), kept only on NOT_FOUND. It blunts phone
    // guessing against a known order number by an attacker rotating IPs. Accepted trade-off
    // (owner-approved, 2026-10-09): someone who knows an order number can burn its 5 failed
    // attempts for an hour; the admin and the confirmation page remain available. Only a
    // VERIFIED request can reach it.
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

export type { RejectedReason, UnavailableReason }
