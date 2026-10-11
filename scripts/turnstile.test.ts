// M52b: tests for lib/turnstile.ts (the siteverify classifier) and lib/order-guard.ts (the
// placement and lookup admission rules), ADR-035. No test framework in this project: run with
// `npm run test:turnstile` (tsx + node:assert). fetch is injected; no network is used.
import assert from 'node:assert/strict'
import {
  MAX_IN_FLIGHT,
  MAX_RESPONSE_BYTES,
  SITEVERIFY_URL,
  createTurnstileVerifier,
  expectedHostnameFrom,
  isTurnstileTestKey,
  verifyTurnstile,
} from '../lib/turnstile'
import type { TurnstileResult, VerifierDeps, VerifyOptions } from '../lib/turnstile'

import {
  LOOKUP_EXPIRED_MESSAGE,
  LOOKUP_RATE_LIMITED_MESSAGE,
  LOOKUP_UNAVAILABLE_MESSAGE,
  LOOKUP_VERIFICATION_MESSAGE,
  PHONE_LIMIT_MESSAGE,
  PLACE_ORDER_EXPIRED_MESSAGE,
  PLACE_ORDER_UNAVAILABLE_MESSAGE,
  PLACE_ORDER_VERIFICATION_MESSAGE,
  createOrderGuard,
  normalizeIdempotencyKey,
} from '../lib/order-guard'

// AbortSignal.timeout's timer is unref'd: with only a never-settling fake fetch pending, Node
// would exit mid-test. Keep the process alive until the end (a real server always is).
const keepAlive = setInterval(() => {}, 1000)

const REAL_SECRET = '0x4AAAAAAAq9Zk3pQw8LmT5vXr2NbY7cHd4J'
const TEST_SECRET = '1x0000000000000000000000000000000AA'
const HOST = 'shop.example.com'
const TOKEN = 'tok.0123456789abcdef-token-value'
const IP = '203.0.113.77'
const PLACE: VerifyOptions = { action: 'place_order', remoteIp: null }

type Call = { url: string; init: RequestInit }
type LogLine = { level: 'warn' | 'error'; args: unknown[] }

function harness(respond: (call: Call) => Promise<Response> | Response, patch: Partial<VerifierDeps> = {}) {
  const calls: Call[] = []
  const logs: LogLine[] = []
  const fetchStub = (async (url: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(url), init: init ?? {} }
    calls.push(call)
    return respond(call)
  }) as typeof fetch
  const verify = createTurnstileVerifier({
    fetch: fetchStub,
    secret: REAL_SECRET,
    allowTestKeys: false,
    expectedHostname: HOST,
    logger: {
      warn: (...args: unknown[]) => void logs.push({ level: 'warn', args }),
      error: (...args: unknown[]) => void logs.push({ level: 'error', args }),
    },
    ...patch,
  })
  return { verify, calls, logs }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const ok = (extra: Record<string, unknown> = {}) =>
  json({ success: true, 'error-codes': [], challenge_ts: '2026-10-11T00:00:00Z', hostname: HOST, action: 'place_order', ...extra })
const failure = (codes: unknown) => json({ success: false, 'error-codes': codes })

let cases = 0
async function expectOutcome(
  name: string,
  h: ReturnType<typeof harness>,
  token: unknown,
  expected: TurnstileResult,
  { fetches, options = PLACE }: { fetches: number; options?: VerifyOptions },
) {
  const result = await h.verify(token, options)
  assert.deepEqual(result, expected, `${name}: outcome`)
  assert.equal(h.calls.length, fetches, `${name}: fetch calls`)
  // Logs never carry the token, the IP or the secret.
  const logged = JSON.stringify(h.logs)
  for (const secret of [TOKEN, IP, REAL_SECRET, TEST_SECRET]) assert.ok(!logged.includes(secret), `${name}: log leaked a value`)
  cases++
  return result
}

// --- Static helpers ---------------------------------------------------------------------
assert.equal(SITEVERIFY_URL, 'https://challenges.cloudflare.com/turnstile/v0/siteverify')
for (const key of [
  '1x0000000000000000000000000000000AA',
  '2x0000000000000000000000000000000AA',
  '3x0000000000000000000000000000000AA',
  '1x00000000000000000000AA',
  '2x00000000000000000000AB',
  '1x00000000000000000000BB',
  '2x00000000000000000000BB',
  '3x00000000000000000000FF',
]) {
  assert.ok(isTurnstileTestKey(key), `${key} is a test key`)
}
for (const key of [REAL_SECRET, '0x4AAAAAAAh7Gm2Lk9Zp4V', '1x0000000AA', '1x00000000000000000000AA1', 'x0000000000000000000000AA']) {
  assert.ok(!isTurnstileTestKey(key), `${key} is not a test key`)
}
assert.equal(expectedHostnameFrom('https://Shop.Example.com/'), 'shop.example.com')
assert.equal(expectedHostnameFrom('http://localhost:3100'), 'localhost')
assert.equal(expectedHostnameFrom(undefined), null)
assert.equal(expectedHostnameFrom('not a url'), null)

// --- Classification before any network call ---------------------------------------------
for (const [name, token] of [
  ['undefined', undefined],
  ['null', null],
  ['number', 42],
  ['object', { token: TOKEN }],
  ['empty', ''],
  ['whitespace', '   \n'],
] as const) {
  const h = harness(() => ok())
  await expectOutcome(`missing token (${name})`, h, token, { outcome: 'rejected', reason: 'missing-token' }, { fetches: 0 })
  assert.equal(h.logs.length, 0, 'missing-token is not logged')
}
{
  const h = harness(() => ok())
  await expectOutcome('2049-char token', h, 'a'.repeat(2049), { outcome: 'rejected', reason: 'malformed-token' }, { fetches: 0 })
  assert.equal(h.logs[0].level, 'warn')
  await expectOutcome('2048-char token is sent', h, 'a'.repeat(2048), { outcome: 'verified' }, { fetches: 1 })
}
{
  const h = harness(() => ok(), { secret: undefined })
  await expectOutcome('no secret', h, TOKEN, { outcome: 'unavailable', reason: 'not-configured' }, { fetches: 0 })
  assert.deepEqual(h.logs, [{ level: 'error', args: ['[turnstile] unavailable', { action: 'place_order', reason: 'not-configured' }] }])
}
{
  const h = harness(() => ok(), { secret: '' })
  await expectOutcome('empty secret', h, TOKEN, { outcome: 'unavailable', reason: 'not-configured' }, { fetches: 0 })
}
{
  const h = harness(() => ok(), { secret: TEST_SECRET, allowTestKeys: false })
  await expectOutcome('test secret without flag', h, TOKEN, { outcome: 'unavailable', reason: 'test-key-not-allowed' }, { fetches: 0 })
  assert.equal(h.logs[0].level, 'error')
}
{
  const h = harness(() => ok(), { expectedHostname: null })
  await expectOutcome('real secret, no hostname', h, TOKEN, { outcome: 'unavailable', reason: 'not-configured' }, { fetches: 0 })
}

// --- Test keys (allowed) skip action and hostname ----------------------------------------
{
  const h = harness(() => json({ success: true, 'error-codes': [], hostname: 'example.com', action: '' }), {
    secret: TEST_SECRET,
    allowTestKeys: true,
    expectedHostname: null,
  })
  await expectOutcome('test secret, foreign hostname/action', h, TOKEN, { outcome: 'verified' }, { fetches: 1 })
}
{
  const h = harness(() => json({ success: true }), { secret: TEST_SECRET, allowTestKeys: true })
  await expectOutcome('test secret, no hostname/action fields', h, TOKEN, { outcome: 'verified' }, { fetches: 1 })
}
{
  const h = harness(() => failure(['invalid-input-response']), { secret: '2x0000000000000000000000000000000AA', allowTestKeys: true })
  await expectOutcome('always-fail test secret', h, TOKEN, { outcome: 'rejected', reason: 'invalid-token' }, { fetches: 1 })
}

// --- success: true -----------------------------------------------------------------------
await expectOutcome('verified', harness(() => ok()), TOKEN, { outcome: 'verified' }, { fetches: 1 })
await expectOutcome('verified, upper-case hostname', harness(() => ok({ hostname: 'SHOP.Example.COM' })), TOKEN, { outcome: 'verified' }, { fetches: 1 })
await expectOutcome(
  'lookup action verified',
  harness(() => ok({ action: 'order_lookup' })),
  TOKEN,
  { outcome: 'verified' },
  { fetches: 1, options: { action: 'order_lookup', remoteIp: null } },
)
// A solved challenge for the wrong hostname/action is NEVER verified (ADR-036): it is a security
// validation failure (rejected), logged at error level because it is also what a misconfigured
// launch (www vs apex, wrong site URL) looks like.
for (const [name, extra, reason] of [
  ['action mismatch', { action: 'order_lookup' }, 'action-mismatch'],
  ['empty action', { action: '' }, 'action-mismatch'],
  ['hostname mismatch', { hostname: 'evil.example.net' }, 'hostname-mismatch'],
  ['www vs apex', { hostname: `www.${HOST}` }, 'hostname-mismatch'],
] as const) {
  const h = harness(() => ok(extra))
  await expectOutcome(name, h, TOKEN, { outcome: 'rejected', reason }, { fetches: 1 })
  assert.deepEqual(h.logs, [{ level: 'error', args: ['[turnstile] rejected', { action: 'place_order', reason }] }], `${name}: one error line`)
}
await expectOutcome('missing action', harness(() => json({ success: true, hostname: HOST })), TOKEN, { outcome: 'unavailable', reason: 'bad-response' }, { fetches: 1 })
await expectOutcome('missing hostname', harness(() => json({ success: true, action: 'place_order' })), TOKEN, { outcome: 'unavailable', reason: 'bad-response' }, { fetches: 1 })
await expectOutcome('non-string action', harness(() => ok({ action: 7 })), TOKEN, { outcome: 'unavailable', reason: 'bad-response' }, { fetches: 1 })

// --- success: false ----------------------------------------------------------------------
const codeCases: Array<[string, unknown, TurnstileResult, 'warn' | 'error']> = [
  ['invalid-input-response', ['invalid-input-response'], { outcome: 'rejected', reason: 'invalid-token' }, 'warn'],
  ['timeout-or-duplicate', ['timeout-or-duplicate'], { outcome: 'rejected', reason: 'expired-or-duplicate' }, 'warn'],
  ['invalid-input-response mixed', ['internal-error', 'invalid-input-response'], { outcome: 'rejected', reason: 'invalid-token' }, 'warn'],
  ['timeout-or-duplicate mixed', ['bad-request', 'timeout-or-duplicate', 'x-new'], { outcome: 'rejected', reason: 'expired-or-duplicate' }, 'warn'],
  ['invalid-input-response with secret error', ['invalid-input-secret', 'invalid-input-response'], { outcome: 'rejected', reason: 'invalid-token' }, 'warn'],
  ['internal-error', ['internal-error'], { outcome: 'unavailable', reason: 'service-error' }, 'warn'],
  ['bad-request', ['bad-request'], { outcome: 'unavailable', reason: 'service-error' }, 'warn'],
  ['missing-input-response', ['missing-input-response'], { outcome: 'unavailable', reason: 'service-error' }, 'warn'],
  ['invalid-input-secret', ['invalid-input-secret'], { outcome: 'unavailable', reason: 'service-error' }, 'error'],
  ['missing-input-secret', ['missing-input-secret'], { outcome: 'unavailable', reason: 'service-error' }, 'error'],
  ['unknown code', ['some-future-code'], { outcome: 'unavailable', reason: 'service-error' }, 'warn'],
  ['no codes', [], { outcome: 'unavailable', reason: 'service-error' }, 'warn'],
  ['codes not an array', 'invalid-input-response', { outcome: 'unavailable', reason: 'service-error' }, 'warn'],
  ['non-string codes', [42, null], { outcome: 'unavailable', reason: 'service-error' }, 'warn'],
]
for (const [name, codes, expected, level] of codeCases) {
  const h = harness(() => failure(codes))
  await expectOutcome(`error-codes ${name}`, h, TOKEN, expected, { fetches: 1 })
  assert.equal(h.logs.length, 1, `${name}: exactly one log line`)
  assert.equal(h.logs[0].level, level, `${name}: log level`)
  assert.deepEqual(h.logs[0].args, [`[turnstile] ${expected.outcome}`, { action: 'place_order', reason: (expected as { reason: string }).reason }])
}

// --- Transport and response shape --------------------------------------------------------
async function timed<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const start = Date.now()
  const value = await fn()
  return [value, Date.now() - start]
}
for (const status of [500, 502, 429, 403, 404, 201]) {
  await expectOutcome(`HTTP ${status}`, harness(() => json({ success: true, hostname: HOST, action: 'place_order' }, status)), TOKEN, { outcome: 'unavailable', reason: 'http-status' }, { fetches: 1 })
}
{
  // A non-200 body is cancelled (connection freed), never read.
  let cancelled = false
  const body = new ReadableStream({ pull() {}, cancel() { cancelled = true } })
  await expectOutcome('HTTP 503, body cancelled', harness(() => new Response(body, { status: 503 })), TOKEN, { outcome: 'unavailable', reason: 'http-status' }, { fetches: 1 })
  await new Promise((resolve) => setImmediate(resolve))
  assert.ok(cancelled, 'non-200 body cancelled')
}
// A redirect is refused by fetch (redirect: 'error' throws a TypeError) and counts as network.
await expectOutcome(
  'redirect',
  harness(({ init }) => (init.redirect === 'error' ? Promise.reject(new TypeError('unexpected redirect')) : ok())),
  TOKEN,
  { outcome: 'unavailable', reason: 'network' },
  { fetches: 1 },
)
{
  // Body size cap: a padded but valid answer just under the cap verifies; over it degrades,
  // whether the length is declared up front, or only discovered while streaming.
  const answer = (size: number) => {
    const base = JSON.stringify({ success: true, hostname: HOST, action: 'place_order', pad: '' })
    return base.replace('"pad":""', `"pad":"${'x'.repeat(size - base.length)}"`)
  }
  assert.equal(answer(MAX_RESPONSE_BYTES).length, MAX_RESPONSE_BYTES)
  await expectOutcome('body exactly at the cap', harness(() => new Response(answer(MAX_RESPONSE_BYTES), { status: 200 })), TOKEN, { outcome: 'verified' }, { fetches: 1 })
  await expectOutcome('body 1 byte over the cap', harness(() => new Response(answer(MAX_RESPONSE_BYTES + 1), { status: 200 })), TOKEN, { outcome: 'unavailable', reason: 'bad-response' }, { fetches: 1 })
  let pulls = 0
  let cancelled = false
  const declared = new ReadableStream({ pull(c) { pulls++; c.enqueue(new Uint8Array(1024)) }, cancel() { cancelled = true } })
  await expectOutcome(
    'declared content-length over the cap',
    harness(() => new Response(declared, { status: 200, headers: { 'content-length': String(10 * 1024 * 1024) } })),
    TOKEN,
    { outcome: 'unavailable', reason: 'bad-response' },
    { fetches: 1 },
  )
  assert.ok(cancelled, 'declared-oversize body cancelled without reading it')
  assert.ok(pulls <= 1, `declared-oversize body not read (${pulls} chunks pulled)`)
  pulls = 0
  cancelled = false
  const endless = new ReadableStream({ pull(c) { pulls++; c.enqueue(new Uint8Array(4096)) }, cancel() { cancelled = true } })
  const [, ms] = await timed(() => expectOutcome('endless body', harness(() => new Response(endless, { status: 200 })), TOKEN, { outcome: 'unavailable', reason: 'bad-response' }, { fetches: 1 }))
  assert.ok(cancelled, 'endless body cancelled at the cap')
  assert.ok(pulls <= 8, `stopped reading near the cap (${pulls} chunks)`)
  assert.ok(ms < 1000, `endless body gave up fast (${ms} ms)`)
}
await expectOutcome('non-JSON body', harness(() => new Response('<html>oops</html>', { status: 200 })), TOKEN, { outcome: 'unavailable', reason: 'bad-response' }, { fetches: 1 })
await expectOutcome('JSON null', harness(() => json(null)), TOKEN, { outcome: 'unavailable', reason: 'bad-response' }, { fetches: 1 })
await expectOutcome('JSON array', harness(() => json([true])), TOKEN, { outcome: 'unavailable', reason: 'bad-response' }, { fetches: 1 })
await expectOutcome('success as string', harness(() => json({ success: 'true', hostname: HOST, action: 'place_order' })), TOKEN, { outcome: 'unavailable', reason: 'bad-response' }, { fetches: 1 })
await expectOutcome('fetch throws', harness(() => Promise.reject(new TypeError('fetch failed'))), TOKEN, { outcome: 'unavailable', reason: 'network' }, { fetches: 1 })

// Timeouts: an injected short timeout; the fetch honours the abort signal, ignores it, or the
// body never finishes. Each must give up at the timeout, not hang.
{
  const h = harness(
    ({ init }) =>
      new Promise<Response>((_, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal?.reason))
      }),
    { timeoutMs: 60 },
  )
  const [, ms] = await timed(() => expectOutcome('hanging fetch (honours signal)', h, TOKEN, { outcome: 'unavailable', reason: 'timeout' }, { fetches: 1 }))
  assert.ok(ms >= 50 && ms < 1000, `aborted at the timeout (${ms} ms)`)
}
{
  const h = harness(() => new Promise<Response>(() => {}), { timeoutMs: 60 })
  const [, ms] = await timed(() => expectOutcome('hanging fetch (ignores signal)', h, TOKEN, { outcome: 'unavailable', reason: 'timeout' }, { fetches: 1 }))
  assert.ok(ms >= 50 && ms < 1000, `gave up at the timeout (${ms} ms)`)
}
{
  const stalled = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"success":')) } })
  const h = harness(() => new Response(stalled, { status: 200 }), { timeoutMs: 60 })
  const [, ms] = await timed(() => expectOutcome('body never finishes', h, TOKEN, { outcome: 'unavailable', reason: 'timeout' }, { fetches: 1 }))
  assert.ok(ms < 1000, `body read bounded by the timeout (${ms} ms)`)
}

// --- Concurrency cap: overflow is unavailable at once (no queueing), slots free on completion -----
{
  assert.equal(MAX_IN_FLIGHT, 50)
  const inFlight = { count: 0 }
  const hanging: Array<() => void> = []
  const h = harness(
    () => new Promise<Response>((resolve) => hanging.push(() => resolve(ok()))),
    { inFlight, timeoutMs: 10_000 },
  )
  const pending = Array.from({ length: MAX_IN_FLIGHT }, () => h.verify(TOKEN, PLACE))
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(inFlight.count, MAX_IN_FLIGHT, '50 calls in flight')
  const [busy, ms] = await timed(() => h.verify(TOKEN, PLACE))
  assert.deepEqual(busy, { outcome: 'unavailable', reason: 'busy' }, '51st is busy')
  assert.ok(ms < 100, `busy answered at once (${ms} ms)`)
  assert.equal(h.calls.length, MAX_IN_FLIGHT, 'no fetch for the busy call')
  assert.deepEqual(h.logs.at(-1), { level: 'warn', args: ['[turnstile] unavailable', { action: 'place_order', reason: 'busy' }] })
  hanging.splice(0, 1)[0]()
  assert.deepEqual(await pending[0], { outcome: 'verified' })
  assert.equal(inFlight.count, MAX_IN_FLIGHT - 1, 'slot freed on completion')
  const next = h.verify(TOKEN, PLACE)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(h.calls.length, MAX_IN_FLIGHT + 1, 'a freed slot is usable again')
  for (const resolve of hanging.splice(0)) resolve()
  assert.ok((await Promise.all([...pending.slice(1), next])).every((r) => r.outcome === 'verified'))
  assert.equal(inFlight.count, 0, 'all slots released')
  cases++
}
{
  // Slots are also freed on timeout and on errors, so a stalled Cloudflare cannot wedge the cap.
  const inFlight = { count: 0 }
  const h = harness(() => new Promise<Response>(() => {}), { inFlight, timeoutMs: 40, maxInFlight: 2 })
  const r = await Promise.all([h.verify(TOKEN, PLACE), h.verify(TOKEN, PLACE), h.verify(TOKEN, PLACE)])
  assert.deepEqual(r.map((x) => (x as { reason: string }).reason).sort(), ['busy', 'timeout', 'timeout'])
  assert.equal(inFlight.count, 0, 'released after timeouts')
  const e = harness(() => Promise.reject(new TypeError('x')), { inFlight, maxInFlight: 1 })
  await e.verify(TOKEN, PLACE)
  await e.verify(TOKEN, PLACE)
  assert.equal(e.calls.length, 2, 'released after a network error')
  assert.equal(inFlight.count, 0)
  cases++
}

// --- Request contents ----------------------------------------------------------------------
{
  const h = harness(() => ok())
  await h.verify(`  ${TOKEN}  `, PLACE)
  const { url, init } = h.calls[0]
  assert.equal(url, SITEVERIFY_URL, 'default URL is SITEVERIFY_URL')
  assert.equal(init.method, 'POST')
  assert.equal(init.cache, 'no-store')
  assert.equal(init.redirect, 'error', 'redirects are refused')
  assert.ok(init.signal instanceof AbortSignal, 'has an abort signal')
  assert.ok(init.body instanceof URLSearchParams, 'form-encoded body')
  const body = init.body as URLSearchParams
  assert.deepEqual([...body.keys()], ['secret', 'response'], 'remoteip left out when null')
  assert.equal(body.get('secret'), REAL_SECRET)
  assert.equal(body.get('response'), TOKEN)
}
{
  const h = harness(() => ok())
  await h.verify(TOKEN, { action: 'place_order', remoteIp: IP })
  const body = h.calls[0].init.body as URLSearchParams
  assert.deepEqual([...body.keys()], ['secret', 'response', 'remoteip'], 'exactly secret, response, remoteip')
  assert.equal(body.get('remoteip'), IP)
}
{
  const h = harness(() => ok(), { verifyUrl: 'https://verify.test/siteverify' })
  await h.verify(TOKEN, PLACE)
  assert.equal(h.calls[0].url, 'https://verify.test/siteverify', 'verifyUrl is injectable (tests only)')
}

// --- verifyTurnstile reads the environment at call time -----------------------------------
{
  const saved = {
    secret: process.env.TURNSTILE_SECRET_KEY,
    allow: process.env.TURNSTILE_ALLOW_TEST_KEYS,
    site: process.env.NEXT_PUBLIC_SITE_URL,
    fetch: globalThis.fetch,
    error: console.error,
    warn: console.warn,
  }
  const seen: string[] = []
  globalThis.fetch = (async (url: string | URL | Request) => {
    seen.push(String(url))
    return json({ success: true, hostname: 'example.com', action: '' })
  }) as typeof fetch
  console.error = () => {}
  console.warn = () => {}
  try {
    delete process.env.TURNSTILE_SECRET_KEY
    assert.deepEqual(await verifyTurnstile(TOKEN, PLACE), { outcome: 'unavailable', reason: 'not-configured' })
    process.env.TURNSTILE_SECRET_KEY = TEST_SECRET
    delete process.env.TURNSTILE_ALLOW_TEST_KEYS
    assert.deepEqual(await verifyTurnstile(TOKEN, PLACE), { outcome: 'unavailable', reason: 'test-key-not-allowed' })
    process.env.TURNSTILE_ALLOW_TEST_KEYS = 'true' // only '1' enables test keys
    assert.deepEqual(await verifyTurnstile(TOKEN, PLACE), { outcome: 'unavailable', reason: 'test-key-not-allowed' })
    assert.equal(seen.length, 0, 'no network call before configuration passes')
    process.env.TURNSTILE_ALLOW_TEST_KEYS = '1'
    assert.deepEqual(await verifyTurnstile(TOKEN, PLACE), { outcome: 'verified' })
    assert.deepEqual(seen, [SITEVERIFY_URL], 'global fetch, constant URL')
    process.env.TURNSTILE_SECRET_KEY = REAL_SECRET
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'
    assert.deepEqual(await verifyTurnstile(TOKEN, PLACE), { outcome: 'rejected', reason: 'action-mismatch' })
  } finally {
    const restore = (name: string, value: string | undefined) => {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
    restore('TURNSTILE_SECRET_KEY', saved.secret)
    restore('TURNSTILE_ALLOW_TEST_KEYS', saved.allow)
    restore('NEXT_PUBLIC_SITE_URL', saved.site)
    globalThis.fetch = saved.fetch
    console.error = saved.error
    console.warn = saved.warn
  }
}

console.log(`turnstile verifier tests passed (${cases} classification cases + request body + env)`)

// ============================================================================================
// Guard (lib/order-guard.ts), strict policy (ADR-036). The verifier is faked: token 'ok' ->
// verified, 'bad' -> rejected, 'expired' -> rejected (expired-or-duplicate), 'down' -> unavailable,
// 'bug' -> throws. Every guard instance has its own fresh limiters.
// ============================================================================================

type VerifyCall = { token: unknown; options: VerifyOptions }
function fakeGuard(opts: { limits?: Parameters<typeof createOrderGuard>[0]['limits']; requireClientIp?: boolean } = {}) {
  const calls: VerifyCall[] = []
  const warnings: unknown[][] = []
  const errors: unknown[][] = []
  const guard = createOrderGuard({
    logger: { warn: (...a: unknown[]) => void warnings.push(a), error: (...a: unknown[]) => void errors.push(a) },
    verify: async (token, options) => {
      calls.push({ token, options })
      if (token === 'bug') throw new Error('verifier bug')
      if (token === 'ok') return { outcome: 'verified' }
      if (token === 'bad') return { outcome: 'rejected', reason: 'invalid-token' }
      if (token === 'expired') return { outcome: 'rejected', reason: 'expired-or-duplicate' }
      if (token === 'down') return { outcome: 'unavailable', reason: 'network' }
      return { outcome: 'rejected', reason: 'missing-token' }
    },
    limits: opts.limits,
    requireClientIp: opts.requireClientIp ?? false,
  })
  return { ...guard, calls, warnings, errors }
}
let phoneSeq = 0
const nextPhone = () => `0300${String(++phoneSeq).padStart(7, '0')}`
const ORDER_A = 'GC-ABC123-0123ABCD'
const ORDER_B = 'GC-ABC123-89ABCDEF'
const KEY = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'
const IP_A = '198.51.100.10'
const IP_B = '198.51.100.20'

const FAILED = (message: string) => ({ ok: false, code: 'VERIFICATION_FAILED', message })
const UNAVAILABLE = (message: string) => ({ ok: false, code: 'VERIFICATION_UNAVAILABLE', message })
function assertRateLimited(result: { ok: boolean }, pattern: RegExp | string, name: string) {
  assert.equal(result.ok, false, `${name}: refused`)
  const r = result as unknown as { code: string; message: string }
  assert.equal(r.code, 'RATE_LIMITED', `${name}: code`)
  if (typeof pattern === 'string') assert.equal(r.message, pattern, `${name}: message`)
  else assert.match(r.message, pattern, `${name}: message`)
}
const place = (g: ReturnType<typeof fakeGuard>, patch: Record<string, unknown> = {}) =>
  g.admitPlaceOrder({ ip: IP_A, phone: nextPhone(), token: 'ok', remoteIp: null, ...patch })

// --- idempotency key shape -------------------------------------------------------------------
assert.equal(normalizeIdempotencyKey(KEY), KEY)
assert.equal(normalizeIdempotencyKey('a'.repeat(22)), 'a'.repeat(22))
for (const bad of [undefined, null, 42, '', 'short', 'a'.repeat(21), 'a'.repeat(65), `${KEY} `, 'has space in it 0123456789', "quote'quote0123456789012", {}]) {
  assert.equal(normalizeIdempotencyKey(bad), null, `bad key ${JSON.stringify(bad)}`)
}

// --- STRICT: no token, no order ---------------------------------------------------------------
{
  const g = fakeGuard()
  for (const token of [undefined, null, '', '   ', 42, {}]) {
    assert.deepEqual(await place(g, { token }), FAILED(PLACE_ORDER_VERIFICATION_MESSAGE), `tokenless ${JSON.stringify(token)}`)
  }
  assert.equal(g.calls.length, 0, 'a tokenless request makes no siteverify call')
  // ...and costs nothing: 500 of them do not use up the IP's attempts, so a real customer behind
  // the same IP is not affected (L3).
  for (let i = 0; i < 500; i++) await place(g, { token: undefined })
  assert.equal((await place(g)).ok, true, 'a verified order from the same IP still works after 500 tokenless requests')
}
// A bad token / unreachable Cloudflare / verifier bug is refused, never admitted.
{
  const g = fakeGuard()
  assert.deepEqual(await place(g, { token: 'bad' }), FAILED(PLACE_ORDER_VERIFICATION_MESSAGE))
  assert.deepEqual(await place(g, { token: 'expired' }), FAILED(PLACE_ORDER_EXPIRED_MESSAGE))
  assert.deepEqual(await place(g, { token: 'down' }), UNAVAILABLE(PLACE_ORDER_UNAVAILABLE_MESSAGE))
  assert.deepEqual(await place(g, { token: 'bug' }), UNAVAILABLE(PLACE_ORDER_UNAVAILABLE_MESSAGE), 'a throwing verifier is unavailable, not verified')
  assert.deepEqual(g.calls[0].options, { action: 'place_order', remoteIp: null })
  const p = await g.admitPlaceOrder({ ip: IP_B, phone: nextPhone(), token: 'bad', remoteIp: '203.0.113.5' })
  assert.equal(p.ok, false)
  assert.deepEqual(g.calls.at(-1)?.options, { action: 'place_order', remoteIp: '203.0.113.5' }, 'remoteip passed through')
}
// Security-validation failures and availability failures are different outcomes.
{
  const g = fakeGuard()
  const rejected = (await place(g, { token: 'bad' })) as { code: string }
  const unavailable = (await place(g, { token: 'down' })) as { code: string }
  assert.notEqual(rejected.code, unavailable.code)
  assert.equal(rejected.code, 'VERIFICATION_FAILED')
  assert.equal(unavailable.code, 'VERIFICATION_UNAVAILABLE')
}

// --- Rejected/unavailable requests never touch the order limits (L3, M2) -----------------------
{
  const g = fakeGuard({ limits: { placeAttempts: 1000 } })
  const phone = nextPhone()
  for (let i = 0; i < 200; i++) await g.admitPlaceOrder({ ip: IP_A, phone, token: i % 2 ? 'bad' : 'down', remoteIp: null })
  for (let i = 0; i < 3; i++) {
    const r = await g.admitPlaceOrder({ ip: IP_A, phone, token: 'ok', remoteIp: null })
    assert.equal(r.ok, true, `verified order ${i + 1} after 200 failed verifications`)
  }
  assertRateLimited(await g.admitPlaceOrder({ ip: IP_A, phone, token: 'ok', remoteIp: null }), PHONE_LIMIT_MESSAGE, '4th verified order for the phone from this IP')
}
// The attempts gate bounds siteverify calls per IP, whatever the outcome.
{
  const g = fakeGuard({ limits: { placeAttempts: 5 } })
  for (let i = 0; i < 5; i++) assert.equal((await place(g, { token: 'bad' })).ok, false)
  assert.equal(g.calls.length, 5)
  assertRateLimited(await place(g, { token: 'ok' }), /Too many attempts.*about 15 minutes/, '6th attempt')
  assert.equal(g.calls.length, 5, 'no siteverify call past the gate')
  assert.equal((await place(g, { token: 'ok', ip: IP_B })).ok, true, 'another IP is unaffected')
}

// --- Verified orders: per-IP ceiling (CGNAT) and per (phone, IP) limits ---------------------------
{
  const g = fakeGuard()
  for (let i = 0; i < 30; i++) assert.equal((await place(g)).ok, true, `CGNAT order ${i + 1} (distinct phones, one IP)`)
  assertRateLimited(await place(g), /Too many orders from your connection.*about 15 minutes/, '31st order from one IP')
  assert.equal((await place(g, { ip: IP_B })).ok, true, 'another IP is unaffected')
}
{
  // Failed orders are refunded: only SUCCESSFUL orders count.
  const g = fakeGuard()
  const phone = nextPhone()
  for (let i = 0; i < 10; i++) {
    const r = await g.admitPlaceOrder({ ip: IP_A, phone, token: 'ok', remoteIp: null })
    assert.equal(r.ok, true)
    if (r.ok && r.kind === 'new') {
      r.release()
      r.release() // idempotent
    }
  }
  for (let i = 0; i < 3; i++) assert.equal((await g.admitPlaceOrder({ ip: IP_A, phone, token: 'ok', remoteIp: null })).ok, true, `slot ${i + 1} still free`)
  assertRateLimited(await g.admitPlaceOrder({ ip: IP_A, phone, token: 'ok', remoteIp: null }), PHONE_LIMIT_MESSAGE, '4th')
}
{
  // A failed order refunds EVERY slot, including the per-IP ceiling: failed createOrder calls must not
  // eat a CGNAT address's 30-per-15-minutes allowance.
  const g = fakeGuard()
  for (let i = 0; i < 40; i++) {
    const r = await place(g)
    assert.equal(r.ok, true, `order ${i + 1} admitted: the ceiling is not consumed by failed orders`)
    if (r.ok && r.kind === 'new') r.release()
  }
}
{
  // M2: nobody can lock a customer out of their own phone number from another connection.
  const g = fakeGuard()
  const victim = '03001112222'
  for (let i = 0; i < 3; i++) assert.equal((await g.admitPlaceOrder({ ip: IP_A, phone: victim, token: 'ok', remoteIp: null })).ok, true)
  assertRateLimited(await g.admitPlaceOrder({ ip: IP_A, phone: victim, token: 'ok', remoteIp: null }), PHONE_LIMIT_MESSAGE, 'attacker connection is limited')
  const own = await g.admitPlaceOrder({ ip: IP_B, phone: victim, token: 'ok', remoteIp: null })
  assert.equal(own.ok, true, "the victim, from their own connection, is NOT locked out by the attacker's orders")
  assert.match(String(g.warnings.find((w) => w[0] === '[order-guard] phone-limit')?.[0]), /phone-limit/)
}
{
  // Daily limit per (phone, IP); a denied daily reservation refunds the hourly one and every other reservation.
  const g = fakeGuard({ limits: { phoneIpHourly: 100 } })
  const phone = nextPhone()
  for (let i = 0; i < 10; i++) assert.equal((await g.admitPlaceOrder({ ip: IP_A, phone, token: 'ok', remoteIp: null })).ok, true, `daily ${i + 1}`)
  assertRateLimited(await g.admitPlaceOrder({ ip: IP_A, phone, token: 'ok', remoteIp: null }), PHONE_LIMIT_MESSAGE, '11th in a day')
  assert.deepEqual(g.warnings.filter((w) => w[0] === '[order-guard] phone-limit').at(-1), ['[order-guard] phone-limit', { window: 'daily' }])
  // The refused attempt must not have consumed the per-IP ceiling: 30 - 10 = 20 left.
  for (let i = 0; i < 20; i++) assert.equal((await place(g)).ok, true, `ceiling slot ${i + 1} still free`)
  assertRateLimited(await place(g), /Too many orders from your connection/, 'ceiling reached only by real orders')
}
{
  // Volume on one phone across many connections: an alert in the log, never a refusal.
  const g = fakeGuard()
  const phone = nextPhone()
  for (let i = 0; i < 15; i++) {
    const r = await g.admitPlaceOrder({ ip: `198.51.100.${100 + i}`, phone, token: 'ok', remoteIp: null })
    assert.equal(r.ok, true, `order ${i + 1} from a fresh connection is admitted`)
  }
  assert.equal(g.warnings.filter((w) => w[0] === '[order-guard] phone-volume').length, 5, 'one alert per order past 10')
  const logged = JSON.stringify([g.warnings, g.errors])
  assert.ok(!logged.includes('03001'), 'no phone in logs')
}
{
  // Reservation is atomic: concurrent requests cannot oversubscribe a (phone, IP) pair.
  const g = fakeGuard()
  const phone = nextPhone()
  const results = await Promise.all(Array.from({ length: 20 }, () => g.admitPlaceOrder({ ip: IP_A, phone, token: 'ok', remoteIp: null })))
  assert.equal(results.filter((r) => r.ok).length, 3, 'exactly 3 of 20 concurrent orders admitted')
}

// --- Idempotent replay ----------------------------------------------------------------------------
{
  const g = fakeGuard()
  const stored = { ok: true, orderNumber: ORDER_A }
  const phone = nextPhone()
  const finds: Array<[string, string]> = []
  const findExisting = async (key: string, p: string) => {
    finds.push([key, p])
    return key === KEY && p === phone ? stored : null
  }
  // The retry carries NO token (it was spent) and still gets the first order back.
  const replay = await g.admitPlaceOrder({ ip: IP_A, phone, token: undefined, idempotencyKey: KEY, remoteIp: null, findExisting })
  assert.deepEqual(replay, { ok: true, kind: 'replay', result: stored })
  assert.equal(g.calls.length, 0, 'replay makes no siteverify call')
  // It consumes no order allowance: 3 fresh verified orders still fit afterwards.
  for (let i = 0; i < 3; i++) assert.equal((await g.admitPlaceOrder({ ip: IP_A, phone, token: 'ok', remoteIp: null })).ok, true)
  // A different phone, a different key, a malformed key: no replay, and without a token no order.
  assert.deepEqual(await g.admitPlaceOrder({ ip: IP_A, phone: nextPhone(), token: undefined, idempotencyKey: KEY, remoteIp: null, findExisting }), FAILED(PLACE_ORDER_VERIFICATION_MESSAGE))
  assert.deepEqual(await g.admitPlaceOrder({ ip: IP_A, phone, token: undefined, idempotencyKey: 'x'.repeat(30) + ' ', remoteIp: null, findExisting }), FAILED(PLACE_ORDER_VERIFICATION_MESSAGE))
  const before = finds.length
  await g.admitPlaceOrder({ ip: IP_A, phone, token: 'ok', idempotencyKey: 'not a key', remoteIp: null, findExisting })
  assert.equal(finds.length, before, 'a malformed key never reaches the database lookup')
  // A throwing lookup is a miss, not an admission.
  const throwing = await g.admitPlaceOrder({ ip: IP_A, phone, token: undefined, idempotencyKey: KEY, remoteIp: null, findExisting: async () => { throw new Error('db down') } })
  assert.deepEqual(throwing, FAILED(PLACE_ORDER_VERIFICATION_MESSAGE))
}
{
  // The lookup is behind the attempts gate (it is a database query an unauthenticated caller can trigger).
  const g = fakeGuard({ limits: { placeAttempts: 3 } })
  let queries = 0
  const findExisting = async () => (queries++, null)
  for (let i = 0; i < 3; i++) await g.admitPlaceOrder({ ip: IP_A, phone: nextPhone(), token: undefined, idempotencyKey: KEY, remoteIp: null, findExisting })
  assertRateLimited(await g.admitPlaceOrder({ ip: IP_A, phone: nextPhone(), token: undefined, idempotencyKey: KEY, remoteIp: null, findExisting }), /Too many attempts/, 'replay lookups')
  assert.equal(queries, 3)
}
{
  // With a token as well, a miss falls through to the normal verified path.
  const g = fakeGuard()
  const r = await g.admitPlaceOrder({ ip: IP_A, phone: nextPhone(), token: 'ok', idempotencyKey: KEY, remoteIp: null, findExisting: async () => null })
  assert.equal(r.ok && r.kind, 'new')
}

// --- Production: a request with no valid client IP is refused (M4) -----------------------------------
{
  const g = fakeGuard({ requireClientIp: true })
  assert.deepEqual(await place(g, { ip: 'unknown' }), UNAVAILABLE(PLACE_ORDER_UNAVAILABLE_MESSAGE))
  assert.deepEqual(await g.admitLookup({ ip: 'unknown', orderNumber: ORDER_A, token: 'ok', remoteIp: null }), UNAVAILABLE(LOOKUP_UNAVAILABLE_MESSAGE))
  assert.equal(g.calls.length, 0, 'no siteverify call without a client IP')
  assert.equal(g.errors.length, 1, 'one error line a minute, not one per request')
  assert.match(String(g.errors[0][0]), /no valid client IP/)
  assert.equal((await place(g, { ip: IP_A })).ok, true, 'a real address works')
  // Outside production the shared 'unknown' key keeps local runs working.
  assert.equal((await place(fakeGuard({ requireClientIp: false }), { ip: 'unknown' })).ok, true)
}

// --- Lookup ----------------------------------------------------------------------------------------
{
  const g = fakeGuard()
  for (const token of [undefined, '', '  ', null]) {
    assert.deepEqual(await g.admitLookup({ ip: IP_A, orderNumber: ORDER_A, token, remoteIp: null }), FAILED(LOOKUP_VERIFICATION_MESSAGE))
  }
  assert.equal(g.calls.length, 0, 'tokenless lookup: no siteverify call')
  assert.deepEqual(await g.admitLookup({ ip: IP_A, orderNumber: ORDER_A, token: 'bad', remoteIp: null }), FAILED(LOOKUP_VERIFICATION_MESSAGE))
  assert.deepEqual(await g.admitLookup({ ip: IP_A, orderNumber: ORDER_A, token: 'expired', remoteIp: null }), FAILED(LOOKUP_EXPIRED_MESSAGE))
  assert.deepEqual(await g.admitLookup({ ip: IP_A, orderNumber: ORDER_A, token: 'down', remoteIp: null }), UNAVAILABLE(LOOKUP_UNAVAILABLE_MESSAGE))
  assert.deepEqual(await g.admitLookup({ ip: IP_A, orderNumber: ORDER_A, token: 'bug', remoteIp: null }), UNAVAILABLE(LOOKUP_UNAVAILABLE_MESSAGE))
  assert.deepEqual(g.calls[0].options, { action: 'order_lookup', remoteIp: null })
}
{
  // Attempts gate: 60 per hour per IP, counted before verification.
  const g = fakeGuard()
  for (let i = 0; i < 60; i++) {
    const r = await g.admitLookup({ ip: IP_A, orderNumber: ORDER_A, token: 'ok', remoteIp: null })
    assert.equal(r.ok, true, `lookup ${i + 1}`)
    if (r.ok) r.settle(false)
  }
  assertRateLimited(await g.admitLookup({ ip: IP_A, orderNumber: ORDER_A, token: 'ok', remoteIp: null }), LOOKUP_RATE_LIMITED_MESSAGE, '61st lookup')
  assert.equal(g.calls.length, 60)
}
{
  // Rejected lookups never touch the per-order-number cap; only verified NOT_FOUND lookups do.
  const g = fakeGuard()
  for (let i = 0; i < 20; i++) await g.admitLookup({ ip: `198.51.100.${150 + i}`, orderNumber: ORDER_A, token: 'bad', remoteIp: null })
  for (let i = 0; i < 5; i++) {
    const r = await g.admitLookup({ ip: IP_B, orderNumber: ORDER_A, token: 'ok', remoteIp: null })
    assert.equal(r.ok, true, `NOT_FOUND ${i + 1} after rejections`)
    if (r.ok) r.settle(true)
  }
  assertRateLimited(await g.admitLookup({ ip: IP_B, orderNumber: ORDER_A, token: 'ok', remoteIp: null }), LOOKUP_RATE_LIMITED_MESSAGE, 'order-number cap after 5 NOT_FOUND')
  assert.equal((await g.admitLookup({ ip: IP_B, orderNumber: ORDER_B, token: 'ok', remoteIp: null })).ok, true, 'other order numbers unaffected')
}
{
  // The cap is kept only on NOT_FOUND; settle is idempotent.
  const g = fakeGuard()
  for (let i = 0; i < 12; i++) {
    const r = await g.admitLookup({ ip: `198.51.100.${200 + i}`, orderNumber: ORDER_A, token: 'ok', remoteIp: null })
    assert.equal(r.ok, true, `found/invalid lookup ${i + 1} is refunded`)
    if (r.ok) {
      r.settle(false)
      r.settle(false)
    }
  }
  const concurrent = await Promise.all(Array.from({ length: 12 }, (_, i) => g.admitLookup({ ip: `198.51.100.${220 + i}`, orderNumber: ORDER_B, token: 'ok', remoteIp: null })))
  assert.equal(concurrent.filter((r) => r.ok).length, 5, 'concurrent lookups cannot exceed the order-number cap')
}

console.log('order guard tests passed (strict policy: tokenless/rejected/unavailable refused, attempts gate, CGNAT ceiling, per phone+IP limits, no victim lock-out, replay, concurrency, missing client IP, lookup)')
clearInterval(keepAlive)
