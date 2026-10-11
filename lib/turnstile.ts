// M52b: server-side Cloudflare Turnstile verification (ADR-035, amended by ADR-036 for the
// strict policy). Classifies every request as exactly one of:
//   verified     - Cloudflare confirmed a fresh token for this site and this action;
//   rejected     - a SECURITY-VALIDATION failure: the token is missing, malformed, invalid,
//                  expired/spent, or was issued for another action or hostname;
//   unavailable  - an AVAILABILITY or CONFIGURATION failure: Cloudflare could not be reached or
//                  answered nonsense, our concurrency cap is full, or the secret/hostname is not
//                  usable. Nothing is known about the token.
// Both non-verified outcomes REFUSE the request (fail closed): there is no degraded path that lets
// an unverified order through. They stay separate because they mean different things to an
// operator (an attack or a bug in the client vs an outage or a misconfiguration), are logged at
// different levels and show the customer different messages.
// Pure: no next/* imports, so tsx scripts (check-env, the unit tests) can import it. Never logs
// or sends the token, the IP or any customer field.

/** Constant on purpose (ADR-035 decision 3): an env-configurable URL could be pointed at a server that always answers success. */
export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

const DEFAULT_TIMEOUT_MS = 3000
const MAX_TOKEN_LENGTH = 2048
// A real siteverify answer is a few hundred bytes; anything past this is not Cloudflare.
export const MAX_RESPONSE_BYTES = 16 * 1024
// Process-wide cap on concurrent siteverify calls (ADR-035 decision 3). Overflow degrades at
// once instead of queueing, so a flood cannot pile up sockets or memory behind a slow Cloudflare.
export const MAX_IN_FLIGHT = 50

export type TurnstileAction = 'place_order' | 'order_lookup'

export type RejectedReason =
  | 'missing-token'
  | 'malformed-token'
  | 'invalid-token'
  | 'expired-or-duplicate'
  // A solved challenge for another action or hostname: a client bug, a www/apex mismatch or a
  // site key used where it should not be. Never verified; logged at error level because it is
  // also what a misconfigured launch looks like.
  | 'action-mismatch'
  | 'hostname-mismatch'

export type UnavailableReason =
  | 'not-configured'
  | 'test-key-not-allowed'
  | 'network'
  | 'timeout'
  | 'http-status'
  | 'bad-response'
  | 'service-error'
  | 'busy'

export type TurnstileResult =
  | { outcome: 'verified' }
  | { outcome: 'rejected'; reason: RejectedReason }
  | { outcome: 'unavailable'; reason: UnavailableReason }

export type VerifyOptions = { action: TurnstileAction; remoteIp: string | null }

export type Verifier = (token: unknown, options: VerifyOptions) => Promise<TurnstileResult>

type Logger = Pick<Console, 'warn' | 'error'>

export type InFlightCounter = { count: number }
const sharedInFlight: InFlightCounter = { count: 0 }

export type VerifierDeps = {
  fetch: typeof fetch
  secret: string | undefined
  allowTestKeys: boolean
  expectedHostname: string | null
  timeoutMs?: number
  verifyUrl?: string
  logger?: Logger
  maxInFlight?: number // tests only; production uses MAX_IN_FLIGHT
  inFlight?: InFlightCounter // tests only; production shares one process-wide counter
}

/** Cloudflare's published dummy site/secret keys (e.g. 1x0000…0AA). Shared with scripts/check-env.ts. */
export function isTurnstileTestKey(key: string): boolean {
  return /^[0-9]x0{10,}[A-Za-z]{2}$/.test(key)
}

const SECRET_ERROR_CODES = ['invalid-input-secret', 'missing-input-secret']
// Reasons that point at a misconfiguration (or a client bug), not at an attacker or an outage.
const CONFIG_REASONS: ReadonlyArray<string> = ['not-configured', 'test-key-not-allowed', 'action-mismatch', 'hostname-mismatch']

class TooLarge extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Rejects when the signal aborts, even if the wrapped promise ignores the signal, so a hung
// connection or body read can never outlive the timeout.
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason)
    const onAbort = () => reject(signal.reason)
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      },
    )
  })
}

// Reads at most `max` bytes of body (cancelling the stream past that), so a huge or endless
// response cannot be buffered whole. Throws TooLarge over the cap.
async function readCappedText(res: Response, max: number): Promise<string> {
  const declared = Number(res.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > max) {
    await res.body?.cancel().catch(() => {})
    throw new TooLarge()
  }
  if (!res.body) return ''
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > max) {
      await reader.cancel().catch(() => {})
      throw new TooLarge()
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

export function createTurnstileVerifier(deps: VerifierDeps): Verifier {
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const verifyUrl = deps.verifyUrl ?? SITEVERIFY_URL
  const logger = deps.logger ?? console
  const maxInFlight = deps.maxInFlight ?? MAX_IN_FLIGHT
  const inFlight = deps.inFlight ?? sharedInFlight

  return async (token, { action, remoteIp }) => {
    const secretRejected = { value: false }
    const result = await classify(token, action, remoteIp, secretRejected)
    // One line per non-verified outcome, except missing-token (bots would make it noisy).
    // Only the action and the reason: never the token, IP or Cloudflare's raw response.
    // Configuration problems (including Cloudflare refusing our secret) are errors.
    if (result.outcome !== 'verified' && result.reason !== 'missing-token') {
      const isConfig = CONFIG_REASONS.includes(result.reason) || secretRejected.value
      const line = `[turnstile] ${result.outcome}`
      if (isConfig) logger.error(line, { action, reason: result.reason })
      else logger.warn(line, { action, reason: result.reason })
    }
    return result
  }

  async function classify(
    token: unknown,
    action: TurnstileAction,
    remoteIp: string | null,
    secretRejected: { value: boolean },
  ): Promise<TurnstileResult> {
    if (typeof token !== 'string' || token.trim() === '') return { outcome: 'rejected', reason: 'missing-token' }
    if (token.length > MAX_TOKEN_LENGTH) return { outcome: 'rejected', reason: 'malformed-token' }

    const secret = deps.secret
    if (!secret) return { outcome: 'unavailable', reason: 'not-configured' }
    const testKey = isTurnstileTestKey(secret)
    if (testKey && !deps.allowTestKeys) return { outcome: 'unavailable', reason: 'test-key-not-allowed' }
    if (!testKey && !deps.expectedHostname) return { outcome: 'unavailable', reason: 'not-configured' }

    if (inFlight.count >= maxInFlight) return { outcome: 'unavailable', reason: 'busy' }

    // Exactly secret, response and (when known) remoteip. No retries, so no idempotency_key.
    const body = new URLSearchParams({ secret, response: token.trim() })
    if (remoteIp) body.set('remoteip', remoteIp)

    const signal = AbortSignal.timeout(timeoutMs)
    let data: unknown
    inFlight.count++
    try {
      // redirect: 'error': siteverify never redirects, so a redirect is treated as a network failure.
      const res = await abortable(
        deps.fetch(verifyUrl, { method: 'POST', body, cache: 'no-store', redirect: 'error', signal }),
        signal,
      )
      if (res.status !== 200) {
        // Free the connection; nothing in the body is worth reading.
        void res.body?.cancel().catch(() => {})
        return { outcome: 'unavailable', reason: 'http-status' }
      }
      let text: string
      try {
        text = await abortable(readCappedText(res, MAX_RESPONSE_BYTES), signal)
      } catch (error) {
        if (signal.aborted) throw error
        return { outcome: 'unavailable', reason: 'bad-response' }
      }
      try {
        data = JSON.parse(text)
      } catch {
        return { outcome: 'unavailable', reason: 'bad-response' }
      }
    } catch {
      return { outcome: 'unavailable', reason: signal.aborted ? 'timeout' : 'network' }
    } finally {
      inFlight.count--
    }

    if (!isRecord(data) || typeof data.success !== 'boolean') return { outcome: 'unavailable', reason: 'bad-response' }

    if (data.success) {
      // Test secrets answer with Cloudflare's own placeholder action/hostname, not ours.
      if (testKey) return { outcome: 'verified' }
      if (typeof data.action !== 'string' || typeof data.hostname !== 'string') {
        return { outcome: 'unavailable', reason: 'bad-response' }
      }
      if (data.action !== action) return { outcome: 'rejected', reason: 'action-mismatch' }
      if (data.hostname.toLowerCase() !== deps.expectedHostname) return { outcome: 'rejected', reason: 'hostname-mismatch' }
      return { outcome: 'verified' }
    }

    const codes = Array.isArray(data['error-codes'])
      ? (data['error-codes'] as unknown[]).filter((c): c is string => typeof c === 'string')
      : []
    if (codes.includes('invalid-input-response')) return { outcome: 'rejected', reason: 'invalid-token' }
    if (codes.includes('timeout-or-duplicate')) return { outcome: 'rejected', reason: 'expired-or-duplicate' }
    secretRejected.value = codes.some((c) => SECRET_ERROR_CODES.includes(c))
    return { outcome: 'unavailable', reason: 'service-error' }
  }
}

/** Hostname the token must have been issued for, from NEXT_PUBLIC_SITE_URL; null if it is not a valid URL. */
export function expectedHostnameFrom(siteUrl: string | undefined): string | null {
  if (!siteUrl) return null
  try {
    const host = new URL(siteUrl).hostname.toLowerCase()
    return host || null
  } catch {
    return null
  }
}

/** Production entry point: reads the environment at call time, uses the global fetch. */
export function verifyTurnstile(token: unknown, options: VerifyOptions): Promise<TurnstileResult> {
  return createTurnstileVerifier({
    fetch: globalThis.fetch,
    secret: process.env.TURNSTILE_SECRET_KEY,
    allowTestKeys: process.env.TURNSTILE_ALLOW_TEST_KEYS === '1',
    expectedHostname: expectedHostnameFrom(process.env.NEXT_PUBLIC_SITE_URL),
  })(token, options)
}
