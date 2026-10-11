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
  LOOKUP_RATE_LIMITED_MESSAGE,
  LOOKUP_VERIFICATION_MESSAGE,
  PHONE_LIMIT_MESSAGE,
  PLACE_ORDER_VERIFICATION_MESSAGE,
  createOrderGuard,
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
  await expectOutcome(`missing token (${name})`, h, token, { outcome: 'degraded', reason: 'missing-token' }, { fetches: 0 })
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
  await expectOutcome('no secret', h, TOKEN, { outcome: 'degraded', reason: 'not-configured' }, { fetches: 0 })
  assert.deepEqual(h.logs, [{ level: 'error', args: ['[turnstile] degraded', { action: 'place_order', reason: 'not-configured' }] }])
}
{
  const h = harness(() => ok(), { secret: '' })
  await expectOutcome('empty secret', h, TOKEN, { outcome: 'degraded', reason: 'not-configured' }, { fetches: 0 })
}
{
  const h = harness(() => ok(), { secret: TEST_SECRET, allowTestKeys: false })
  await expectOutcome('test secret without flag', h, TOKEN, { outcome: 'degraded', reason: 'test-key-not-allowed' }, { fetches: 0 })
  assert.equal(h.logs[0].level, 'error')
}
{
  const h = harness(() => ok(), { expectedHostname: null })
  await expectOutcome('real secret, no hostname', h, TOKEN, { outcome: 'degraded', reason: 'not-configured' }, { fetches: 0 })
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
// A solved challenge for the wrong hostname/action is a configuration signal (www vs apex,
// Cloudflare semantics): degraded and logged as an error, never a checkout outage.
for (const [name, extra, reason] of [
  ['action mismatch', { action: 'order_lookup' }, 'action-mismatch'],
  ['empty action', { action: '' }, 'action-mismatch'],
  ['hostname mismatch', { hostname: 'evil.example.net' }, 'hostname-mismatch'],
  ['www vs apex', { hostname: `www.${HOST}` }, 'hostname-mismatch'],
] as const) {
  const h = harness(() => ok(extra))
  await expectOutcome(name, h, TOKEN, { outcome: 'degraded', reason }, { fetches: 1 })
  assert.deepEqual(h.logs, [{ level: 'error', args: ['[turnstile] degraded', { action: 'place_order', reason }] }], `${name}: one error line`)
}
await expectOutcome('missing action', harness(() => json({ success: true, hostname: HOST })), TOKEN, { outcome: 'degraded', reason: 'bad-response' }, { fetches: 1 })
await expectOutcome('missing hostname', harness(() => json({ success: true, action: 'place_order' })), TOKEN, { outcome: 'degraded', reason: 'bad-response' }, { fetches: 1 })
await expectOutcome('non-string action', harness(() => ok({ action: 7 })), TOKEN, { outcome: 'degraded', reason: 'bad-response' }, { fetches: 1 })

// --- success: false ----------------------------------------------------------------------
const codeCases: Array<[string, unknown, TurnstileResult, 'warn' | 'error']> = [
  ['invalid-input-response', ['invalid-input-response'], { outcome: 'rejected', reason: 'invalid-token' }, 'warn'],
  ['timeout-or-duplicate', ['timeout-or-duplicate'], { outcome: 'rejected', reason: 'expired-or-duplicate' }, 'warn'],
  ['invalid-input-response mixed', ['internal-error', 'invalid-input-response'], { outcome: 'rejected', reason: 'invalid-token' }, 'warn'],
  ['timeout-or-duplicate mixed', ['bad-request', 'timeout-or-duplicate', 'x-new'], { outcome: 'rejected', reason: 'expired-or-duplicate' }, 'warn'],
  ['invalid-input-response with secret error', ['invalid-input-secret', 'invalid-input-response'], { outcome: 'rejected', reason: 'invalid-token' }, 'warn'],
  ['internal-error', ['internal-error'], { outcome: 'degraded', reason: 'service-error' }, 'warn'],
  ['bad-request', ['bad-request'], { outcome: 'degraded', reason: 'service-error' }, 'warn'],
  ['missing-input-response', ['missing-input-response'], { outcome: 'degraded', reason: 'service-error' }, 'warn'],
  ['invalid-input-secret', ['invalid-input-secret'], { outcome: 'degraded', reason: 'service-error' }, 'error'],
  ['missing-input-secret', ['missing-input-secret'], { outcome: 'degraded', reason: 'service-error' }, 'error'],
  ['unknown code', ['some-future-code'], { outcome: 'degraded', reason: 'service-error' }, 'warn'],
  ['no codes', [], { outcome: 'degraded', reason: 'service-error' }, 'warn'],
  ['codes not an array', 'invalid-input-response', { outcome: 'degraded', reason: 'service-error' }, 'warn'],
  ['non-string codes', [42, null], { outcome: 'degraded', reason: 'service-error' }, 'warn'],
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
  await expectOutcome(`HTTP ${status}`, harness(() => json({ success: true, hostname: HOST, action: 'place_order' }, status)), TOKEN, { outcome: 'degraded', reason: 'http-status' }, { fetches: 1 })
}
{
  // A non-200 body is cancelled (connection freed), never read.
  let cancelled = false
  const body = new ReadableStream({ pull() {}, cancel() { cancelled = true } })
  await expectOutcome('HTTP 503, body cancelled', harness(() => new Response(body, { status: 503 })), TOKEN, { outcome: 'degraded', reason: 'http-status' }, { fetches: 1 })
  await new Promise((resolve) => setImmediate(resolve))
  assert.ok(cancelled, 'non-200 body cancelled')
}
// A redirect is refused by fetch (redirect: 'error' throws a TypeError) and counts as network.
await expectOutcome(
  'redirect',
  harness(({ init }) => (init.redirect === 'error' ? Promise.reject(new TypeError('unexpected redirect')) : ok())),
  TOKEN,
  { outcome: 'degraded', reason: 'network' },
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
  await expectOutcome('body 1 byte over the cap', harness(() => new Response(answer(MAX_RESPONSE_BYTES + 1), { status: 200 })), TOKEN, { outcome: 'degraded', reason: 'bad-response' }, { fetches: 1 })
  let pulls = 0
  let cancelled = false
  const declared = new ReadableStream({ pull(c) { pulls++; c.enqueue(new Uint8Array(1024)) }, cancel() { cancelled = true } })
  await expectOutcome(
    'declared content-length over the cap',
    harness(() => new Response(declared, { status: 200, headers: { 'content-length': String(10 * 1024 * 1024) } })),
    TOKEN,
    { outcome: 'degraded', reason: 'bad-response' },
    { fetches: 1 },
  )
  assert.ok(cancelled, 'declared-oversize body cancelled without reading it')
  assert.ok(pulls <= 1, `declared-oversize body not read (${pulls} chunks pulled)`)
  pulls = 0
  cancelled = false
  const endless = new ReadableStream({ pull(c) { pulls++; c.enqueue(new Uint8Array(4096)) }, cancel() { cancelled = true } })
  const [, ms] = await timed(() => expectOutcome('endless body', harness(() => new Response(endless, { status: 200 })), TOKEN, { outcome: 'degraded', reason: 'bad-response' }, { fetches: 1 }))
  assert.ok(cancelled, 'endless body cancelled at the cap')
  assert.ok(pulls <= 8, `stopped reading near the cap (${pulls} chunks)`)
  assert.ok(ms < 1000, `endless body gave up fast (${ms} ms)`)
}
await expectOutcome('non-JSON body', harness(() => new Response('<html>oops</html>', { status: 200 })), TOKEN, { outcome: 'degraded', reason: 'bad-response' }, { fetches: 1 })
await expectOutcome('JSON null', harness(() => json(null)), TOKEN, { outcome: 'degraded', reason: 'bad-response' }, { fetches: 1 })
await expectOutcome('JSON array', harness(() => json([true])), TOKEN, { outcome: 'degraded', reason: 'bad-response' }, { fetches: 1 })
await expectOutcome('success as string', harness(() => json({ success: 'true', hostname: HOST, action: 'place_order' })), TOKEN, { outcome: 'degraded', reason: 'bad-response' }, { fetches: 1 })
await expectOutcome('fetch throws', harness(() => Promise.reject(new TypeError('fetch failed'))), TOKEN, { outcome: 'degraded', reason: 'network' }, { fetches: 1 })

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
  const [, ms] = await timed(() => expectOutcome('hanging fetch (honours signal)', h, TOKEN, { outcome: 'degraded', reason: 'timeout' }, { fetches: 1 }))
  assert.ok(ms >= 50 && ms < 1000, `aborted at the timeout (${ms} ms)`)
}
{
  const h = harness(() => new Promise<Response>(() => {}), { timeoutMs: 60 })
  const [, ms] = await timed(() => expectOutcome('hanging fetch (ignores signal)', h, TOKEN, { outcome: 'degraded', reason: 'timeout' }, { fetches: 1 }))
  assert.ok(ms >= 50 && ms < 1000, `gave up at the timeout (${ms} ms)`)
}
{
  const stalled = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"success":')) } })
  const h = harness(() => new Response(stalled, { status: 200 }), { timeoutMs: 60 })
  const [, ms] = await timed(() => expectOutcome('body never finishes', h, TOKEN, { outcome: 'degraded', reason: 'timeout' }, { fetches: 1 }))
  assert.ok(ms < 1000, `body read bounded by the timeout (${ms} ms)`)
}

// --- Concurrency cap: overflow degrades at once (no queueing), slots free on completion -----
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
  assert.deepEqual(busy, { outcome: 'degraded', reason: 'busy' }, '51st is busy')
  assert.ok(ms < 100, `busy answered at once (${ms} ms)`)
  assert.equal(h.calls.length, MAX_IN_FLIGHT, 'no fetch for the busy call')
  assert.deepEqual(h.logs.at(-1), { level: 'warn', args: ['[turnstile] degraded', { action: 'place_order', reason: 'busy' }] })
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
    assert.deepEqual(await verifyTurnstile(TOKEN, PLACE), { outcome: 'degraded', reason: 'not-configured' })
    process.env.TURNSTILE_SECRET_KEY = TEST_SECRET
    delete process.env.TURNSTILE_ALLOW_TEST_KEYS
    assert.deepEqual(await verifyTurnstile(TOKEN, PLACE), { outcome: 'degraded', reason: 'test-key-not-allowed' })
    process.env.TURNSTILE_ALLOW_TEST_KEYS = 'true' // only '1' enables test keys
    assert.deepEqual(await verifyTurnstile(TOKEN, PLACE), { outcome: 'degraded', reason: 'test-key-not-allowed' })
    assert.equal(seen.length, 0, 'no network call before configuration passes')
    process.env.TURNSTILE_ALLOW_TEST_KEYS = '1'
    assert.deepEqual(await verifyTurnstile(TOKEN, PLACE), { outcome: 'verified' })
    assert.deepEqual(seen, [SITEVERIFY_URL], 'global fetch, constant URL')
    process.env.TURNSTILE_SECRET_KEY = REAL_SECRET
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'
    assert.deepEqual(await verifyTurnstile(TOKEN, PLACE), { outcome: 'degraded', reason: 'action-mismatch' })
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
// Guard (lib/order-guard.ts). The verifier is faked: token 'ok' -> verified, 'bad' -> rejected,
// anything else -> degraded. rateLimit's state is process-global, so every scenario uses its
// own IP; bucket limiters are per guard instance.
// ============================================================================================
type VerifyCall = { token: unknown; options: VerifyOptions }
function fakeGuard(limits?: Parameters<typeof createOrderGuard>[0]['limits'], throwOn?: string) {
  const calls: VerifyCall[] = []
  const warnings: unknown[][] = []
  const guard = createOrderGuard({
    logger: { warn: (...args: unknown[]) => void warnings.push(args) },
    verify: async (token, options) => {
      calls.push({ token, options })
      if (throwOn !== undefined && token === throwOn) throw new Error('verifier bug')
      if (token === 'ok') return { outcome: 'verified' }
      if (token === 'bad') return { outcome: 'rejected', reason: 'invalid-token' }
      return { outcome: 'degraded', reason: 'missing-token' }
    },
    limits,
  })
  return { ...guard, calls, warnings }
}
let ipSeq = 0
const nextIp = () => `198.51.100.${++ipSeq}`
let phoneSeq = 0
const nextPhone = () => `0300${String(++phoneSeq).padStart(7, '0')}`
const ORDER_A = 'GC-ABC123-0123ABCD'
const ORDER_B = 'GC-ABC123-89ABCDEF'

function assertRateLimited(result: { ok: boolean }, pattern: RegExp | string, name: string) {
  assert.equal(result.ok, false, `${name}: refused`)
  const r = result as unknown as { code: string; message: string }
  assert.equal(r.code, 'RATE_LIMITED', `${name}: code`)
  if (typeof pattern === 'string') assert.equal(r.message, pattern, `${name}: message`)
  else assert.match(r.message, pattern, `${name}: message`)
}

// Rejected: VERIFICATION_FAILED, no degraded budget used, no phone slot reserved.
{
  const g = fakeGuard()
  const ip = nextIp()
  const phone = nextPhone()
  for (let i = 0; i < 5; i++) {
    const r = await g.admitPlaceOrder({ ip, phone, token: 'bad', remoteIp: '203.0.113.5' })
    assert.deepEqual(r, { ok: false, code: 'VERIFICATION_FAILED', message: PLACE_ORDER_VERIFICATION_MESSAGE })
  }
  assert.deepEqual(g.calls[0].options, { action: 'place_order', remoteIp: '203.0.113.5' }, 'action and remoteip passed through')
  for (let i = 0; i < 5; i++) {
    const r = await g.admitPlaceOrder({ ip, phone: nextPhone(), token: undefined, remoteIp: null })
    assert.equal(r.ok, true, `tokenless request ${i + 1} after rejections is admitted`)
  }
  assertRateLimited(await g.admitPlaceOrder({ ip, phone: nextPhone(), token: undefined, remoteIp: null }), /couldn't complete the security check.*about 15 minutes/, '6th degraded')
  // The phone used by the rejected requests still has its full 3 slots.
  for (let i = 0; i < 3; i++) assert.equal((await g.admitPlaceOrder({ ip, phone, token: 'ok', remoteIp: null })).ok, true, `phone slot ${i + 1}`)
}

// Degraded: 5 then RATE_LIMITED, while verified requests from the same IP continue.
{
  const g = fakeGuard()
  const ip = nextIp()
  for (let i = 0; i < 5; i++) assert.equal((await g.admitPlaceOrder({ ip, phone: nextPhone(), token: '', remoteIp: null })).ok, true)
  assertRateLimited(await g.admitPlaceOrder({ ip, phone: nextPhone(), token: '', remoteIp: null }), /couldn't complete the security check/, '6th degraded')
  for (let i = 0; i < 10; i++) {
    assert.equal((await g.admitPlaceOrder({ ip, phone: nextPhone(), token: 'ok', remoteIp: null })).ok, true, `verified ${i + 1} unaffected`)
  }
}

// CGNAT: 30 verified orders with distinct phones from one IP, the 31st is refused before verify.
{
  const g = fakeGuard()
  const ip = nextIp()
  for (let i = 0; i < 30; i++) {
    assert.equal((await g.admitPlaceOrder({ ip, phone: nextPhone(), token: 'ok', remoteIp: null })).ok, true, `CGNAT customer ${i + 1}`)
  }
  assertRateLimited(await g.admitPlaceOrder({ ip, phone: nextPhone(), token: 'ok', remoteIp: null }), /^Too many orders from your connection\. Please try again in about 15 minutes\.$/, '31st')
  assert.equal(g.calls.length, 30, 'the flood ceiling is checked before siteverify')
  // Another IP is unaffected.
  assert.equal((await g.admitPlaceOrder({ ip: nextIp(), phone: nextPhone(), token: 'ok', remoteIp: null })).ok, true)
}

// The flood ceiling counts rejected (and degraded) requests too.
{
  const g = fakeGuard()
  const ip = nextIp()
  for (let i = 0; i < 30; i++) await g.admitPlaceOrder({ ip, phone: nextPhone(), token: 'bad', remoteIp: null })
  assertRateLimited(await g.admitPlaceOrder({ ip, phone: nextPhone(), token: 'ok', remoteIp: null }), /from your connection/, 'after 30 rejected')
}

// Per phone: 3 per hour; released reservations do not count; release is idempotent.
{
  const g = fakeGuard()
  const ip = nextIp()
  const phone = nextPhone()
  for (let i = 0; i < 3; i++) assert.equal((await g.admitPlaceOrder({ ip, phone, token: 'ok', remoteIp: null })).ok, true)
  assertRateLimited(await g.admitPlaceOrder({ ip, phone, token: 'ok', remoteIp: null }), PHONE_LIMIT_MESSAGE, '4th on one phone')
  assertRateLimited(await g.admitPlaceOrder({ ip: nextIp(), phone, token: 'ok', remoteIp: null }), PHONE_LIMIT_MESSAGE, 'phone limit follows the phone across IPs')
  // One WARN line per refusal, carrying neither the phone nor the IP.
  assert.deepEqual(g.warnings, [
    ['[order-guard] phone-limit', { window: 'hourly' }],
    ['[order-guard] phone-limit', { window: 'hourly' }],
  ])
  assert.match(PHONE_LIMIT_MESSAGE, /or contact us to place your order\.$/)

  // One successful order is kept first, so an over-refund would have a real slot to free.
  const other = nextPhone()
  assert.equal((await g.admitPlaceOrder({ ip, phone: other, token: 'ok', remoteIp: null })).ok, true, 'kept order')
  for (let i = 0; i < 6; i++) {
    const r = await g.admitPlaceOrder({ ip, phone: other, token: 'ok', remoteIp: null })
    assert.equal(r.ok, true, `failed order ${i + 1} (released) does not count`)
    if (r.ok) {
      r.release()
      r.release() // idempotent: must not refund a second slot
    }
  }
  const kept = []
  for (let i = 0; i < 2; i++) kept.push(await g.admitPlaceOrder({ ip, phone: other, token: 'ok', remoteIp: null }))
  assert.ok(kept.every((r) => r.ok), '2 more successful orders (3 in total) allowed after released failures')
  assertRateLimited(await g.admitPlaceOrder({ ip, phone: other, token: 'ok', remoteIp: null }), PHONE_LIMIT_MESSAGE, 'idempotent release did not over-refund')
}

// D1: degraded orders never touch the phone buckets. Many degraded orders on one phone from
// different IPs all pass (each IP's degraded budget is the bound), and that phone still has
// all its verified slots, so an attacker without a solved challenge cannot block a customer.
{
  const g = fakeGuard()
  const phone = nextPhone()
  for (let i = 0; i < 12; i++) {
    const r = await g.admitPlaceOrder({ ip: nextIp(), phone, token: undefined, remoteIp: null })
    assert.equal(r.ok, true, `degraded order ${i + 1} on one phone is not phone-limited`)
    if (r.ok) r.release() // a no-op on the degraded path
  }
  const ip = nextIp()
  for (let i = 0; i < 3; i++) assert.equal((await g.admitPlaceOrder({ ip, phone, token: 'ok', remoteIp: null })).ok, true, `verified ${i + 1} after degraded flood`)
  assertRateLimited(await g.admitPlaceOrder({ ip, phone, token: 'ok', remoteIp: null }), PHONE_LIMIT_MESSAGE, 'verified still phone-limited')
  // Degraded continues to pass on an exhausted phone (bounded only by the per-IP budget).
  assert.equal((await g.admitPlaceOrder({ ip: nextIp(), phone, token: '', remoteIp: null })).ok, true, 'degraded on an exhausted phone')
  assert.equal(g.warnings.length, 1)
}

// Per phone, daily (small injected limits).
{
  const g = fakeGuard({ phoneHourly: 100, phoneDaily: 4 })
  const ip = nextIp()
  const phone = nextPhone()
  assert.equal((await g.admitPlaceOrder({ ip, phone, token: 'ok', remoteIp: null })).ok, true, 'kept order')
  const failed = await g.admitPlaceOrder({ ip, phone, token: 'ok', remoteIp: null })
  assert.ok(failed.ok)
  failed.release()
  failed.release() // must not free the kept order's daily slot
  for (let i = 0; i < 3; i++) assert.equal((await g.admitPlaceOrder({ ip, phone, token: 'ok', remoteIp: null })).ok, true)
  assertRateLimited(await g.admitPlaceOrder({ ip, phone, token: 'ok', remoteIp: null }), PHONE_LIMIT_MESSAGE, 'daily limit')
  assert.deepEqual(g.warnings, [['[order-guard] phone-limit', { window: 'daily' }]])
}

// A denied daily reservation releases the hourly one: the daily window is made tiny so it
// expires, then the hourly bucket must still have room.
{
  const g = fakeGuard({ phoneHourly: 2, phoneDaily: 1, phoneDailyWindowMs: 80 })
  const ip = nextIp()
  const phone = nextPhone()
  assert.equal((await g.admitPlaceOrder({ ip, phone, token: 'ok', remoteIp: null })).ok, true, 'first order')
  for (let i = 0; i < 3; i++) assertRateLimited(await g.admitPlaceOrder({ ip, phone, token: 'ok', remoteIp: null }), PHONE_LIMIT_MESSAGE, `daily denial ${i + 1}`)
  await new Promise((resolve) => setTimeout(resolve, 120))
  assert.equal((await g.admitPlaceOrder({ ip, phone, token: 'ok', remoteIp: null })).ok, true, 'hourly slot was refunded on each daily denial')
  assertRateLimited(await g.admitPlaceOrder({ ip, phone, token: 'ok', remoteIp: null }), PHONE_LIMIT_MESSAGE, 'hourly limit now reached')
}

// A verifier that throws is treated as degraded (uncertain), never as verified.
{
  const g = fakeGuard(undefined, 'boom')
  const ip = nextIp()
  for (let i = 0; i < 5; i++) assert.equal((await g.admitPlaceOrder({ ip, phone: nextPhone(), token: 'boom', remoteIp: null })).ok, true)
  assertRateLimited(await g.admitPlaceOrder({ ip, phone: nextPhone(), token: 'boom', remoteIp: null }), /security check/, 'throwing verifier uses the degraded budget')
}

// --- Lookup -----------------------------------------------------------------------------------
{
  // Flood ceiling 60/hour, counted before verify.
  const g = fakeGuard()
  const ip = nextIp()
  for (let i = 0; i < 60; i++) {
    const r = await g.admitLookup({ ip, orderNumber: ORDER_A, token: 'ok', remoteIp: null })
    assert.equal(r.ok, true, `lookup ${i + 1}`)
    if (r.ok) r.settle(false)
  }
  assertRateLimited(await g.admitLookup({ ip, orderNumber: ORDER_A, token: 'ok', remoteIp: null }), LOOKUP_RATE_LIMITED_MESSAGE, '61st lookup')
  assert.equal(g.calls.length, 60)
  assert.deepEqual(g.calls[0].options, { action: 'order_lookup', remoteIp: null })
}
{
  // Rejected: VERIFICATION_FAILED, no degraded budget, no order-number slot.
  const g = fakeGuard()
  const ip = nextIp()
  for (let i = 0; i < 10; i++) {
    assert.deepEqual(await g.admitLookup({ ip, orderNumber: ORDER_A, token: 'bad', remoteIp: null }), {
      ok: false,
      code: 'VERIFICATION_FAILED',
      message: LOOKUP_VERIFICATION_MESSAGE,
    })
  }
  for (let i = 0; i < 5; i++) {
    const r = await g.admitLookup({ ip, orderNumber: ORDER_A, token: undefined, remoteIp: null })
    assert.equal(r.ok, true, `NOT_FOUND ${i + 1} after rejections`)
    if (r.ok) r.settle(true)
  }
  assertRateLimited(await g.admitLookup({ ip, orderNumber: ORDER_A, token: 'ok', remoteIp: null }), LOOKUP_RATE_LIMITED_MESSAGE, 'order-number cap after 5 NOT_FOUND')
}
{
  // Degraded 20/hour on its own key; verified lookups from the same IP continue.
  const g = fakeGuard()
  const ip = nextIp()
  for (let i = 0; i < 20; i++) {
    const r = await g.admitLookup({ ip, orderNumber: ORDER_B, token: '', remoteIp: null })
    assert.equal(r.ok, true, `degraded lookup ${i + 1}`)
    if (r.ok) r.settle(false)
  }
  assertRateLimited(await g.admitLookup({ ip, orderNumber: ORDER_B, token: '', remoteIp: null }), LOOKUP_RATE_LIMITED_MESSAGE, '21st degraded lookup')
  for (let i = 0; i < 10; i++) {
    const r = await g.admitLookup({ ip, orderNumber: ORDER_B, token: 'ok', remoteIp: null })
    assert.equal(r.ok, true, `verified lookup ${i + 1} unaffected`)
    if (r.ok) r.settle(false)
  }
}
{
  // Order-number cap: kept only on NOT_FOUND; settle is idempotent; other numbers unaffected.
  const g = fakeGuard()
  for (let i = 0; i < 4; i++) {
    const r = await g.admitLookup({ ip: nextIp(), orderNumber: ORDER_A, token: 'ok', remoteIp: null })
    assert.equal(r.ok, true)
    if (r.ok) r.settle(true)
  }
  for (let i = 0; i < 10; i++) {
    const r = await g.admitLookup({ ip: nextIp(), orderNumber: ORDER_A, token: 'ok', remoteIp: null })
    assert.equal(r.ok, true, `found/invalid lookup ${i + 1} is refunded`)
    if (r.ok) {
      r.settle(false)
      r.settle(false)
    }
  }
  const fifth = await g.admitLookup({ ip: nextIp(), orderNumber: ORDER_A, token: 'ok', remoteIp: null })
  assert.equal(fifth.ok, true, '5th failed guess allowed')
  if (fifth.ok) fifth.settle(true)
  assertRateLimited(await g.admitLookup({ ip: nextIp(), orderNumber: ORDER_A, token: 'ok', remoteIp: null }), LOOKUP_RATE_LIMITED_MESSAGE, '6th guess from a fresh IP')
  assert.equal((await g.admitLookup({ ip: nextIp(), orderNumber: ORDER_B, token: 'ok', remoteIp: null })).ok, true, 'other order numbers unaffected')
}

console.log('order guard tests passed (placement: rejected, degraded, CGNAT, flood, phone hourly/daily/release, degraded not phone-limited; lookup: flood, rejected, degraded, order-number cap)')
clearInterval(keepAlive)
