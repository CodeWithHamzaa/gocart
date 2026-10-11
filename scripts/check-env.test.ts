// M52: table-driven test for scripts/check-env.ts (ADR-033). No test framework in this project:
// run with `npm run test:env` (tsx + node:assert). Also asserts that no output leaks a value.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { validateEnv } from './check-env'
import { normalizeIp, selectClientIp, selectVerifyIp } from '../lib/client-ip'

const good = {
  PAYLOAD_SECRET: 'q7Hs2Lk9Zp4Vx8Nc1Tb6Wd3Fy5Gm0Rj-AeUi',
  POSTGRES_PASSWORD: 'Kd82-hQ.x9_Lm4~Zt7Pw',
  // M52b/ADR-036: the app's own database role, a different secret from the superuser's.
  APP_DB_PASSWORD: 'Rt57_Wn.c3-Vb8~Jq2Xe',
  DATABASE_URI: 'postgresql://gocart:Kd82-hQ.x9_Lm4~Zt7Pw@postgres:5432/gocart',
  NEXT_PUBLIC_SITE_URL: 'https://shop.example.com',
  // M52b: real-looking (not Cloudflare's test keys); the real format is undocumented.
  TURNSTILE_SECRET_KEY: '0x4AAAAAAAq9Zk3pQw8LmT5vXr2NbY7cHd4J',
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAAh7Gm2Lk9Zp4V',
}

type Env = Record<string, string | undefined>
const withEnv = (patch: Env): Env => ({ ...good, ...patch })

assert.deepEqual(validateEnv(good), [], 'conforming set is accepted')

// [name, env patch, variable that must be named in the failure]
const bad: Array<[string, Env, string]> = [
  ['secret missing', { PAYLOAD_SECRET: undefined }, 'PAYLOAD_SECRET'],
  ['secret empty', { PAYLOAD_SECRET: '' }, 'PAYLOAD_SECRET'],
  ['secret too short', { PAYLOAD_SECRET: 'aB3$x9Kp2Lq7Zr4' }, 'PAYLOAD_SECRET'],
  ['secret whitespace', { PAYLOAD_SECRET: 'q7Hs2Lk9Zp4Vx8Nc1Tb6 Wd3Fy5Gm0Rj-AeUi' }, 'PAYLOAD_SECRET'],
  ['secret low variety', { PAYLOAD_SECRET: 'abababababababababababababababababab' }, 'PAYLOAD_SECRET'],
  ['secret dev-only', { PAYLOAD_SECRET: 'q7Hs2Lk9Zp4Vx8Nc1Tb6Wd3Fy5Gm0Rj-DEV-ONLY' }, 'PAYLOAD_SECRET'],
  ['secret placeholder', { PAYLOAD_SECRET: 'q7Hs2Lk9Zp4Vx8Nc1Tb6Wd3Fy5Placeholder' }, 'PAYLOAD_SECRET'],
  ['secret changeme', { PAYLOAD_SECRET: 'q7Hs2Lk9Zp4Vx8Nc1Tb6Wd3Fy5ChangeMe' }, 'PAYLOAD_SECRET'],
  ['secret example', { PAYLOAD_SECRET: 'q7Hs2Lk9Zp4Vx8Nc1Tb6Wd3Fy5Example' }, 'PAYLOAD_SECRET'],
  ['secret ci-only', { PAYLOAD_SECRET: 'q7Hs2Lk9Zp4Vx8Nc1Tb6Wd3Fy5-ci-only' }, 'PAYLOAD_SECRET'],
  ['password missing', { POSTGRES_PASSWORD: undefined }, 'POSTGRES_PASSWORD'],
  ['password too short', { POSTGRES_PASSWORD: 'Kd82-hQ.x9_Lm4~' }, 'POSTGRES_PASSWORD'],
  ['password bad charset @', { POSTGRES_PASSWORD: 'Kd82-hQ.x9_Lm4~Zt@Pw' }, 'POSTGRES_PASSWORD'],
  ['password bad charset /', { POSTGRES_PASSWORD: 'Kd82-hQ.x9_Lm4~Zt/Pw' }, 'POSTGRES_PASSWORD'],
  ['uri missing', { DATABASE_URI: undefined }, 'DATABASE_URI'],
  ['uri wrong scheme', { DATABASE_URI: 'mysql://gocart:Kd82-hQ.x9_Lm4~Zt7Pw@postgres:5432/gocart' }, 'DATABASE_URI'],
  ['uri unparseable', { DATABASE_URI: 'postgres://' }, 'DATABASE_URI'],
  ['uri no user', { DATABASE_URI: 'postgresql://:Kd82-hQ.x9_Lm4~Zt7Pw@postgres:5432/gocart' }, 'DATABASE_URI'],
  ['uri no password', { DATABASE_URI: 'postgresql://gocart@postgres:5432/gocart' }, 'DATABASE_URI'],
  ['uri no database', { DATABASE_URI: 'postgresql://gocart:Kd82-hQ.x9_Lm4~Zt7Pw@postgres:5432' }, 'DATABASE_URI'],
  ['uri password mismatch', { DATABASE_URI: 'postgresql://gocart:Other-Pass.word_1234@postgres:5432/gocart' }, 'DATABASE_URI'],
  ['url missing', { NEXT_PUBLIC_SITE_URL: undefined }, 'NEXT_PUBLIC_SITE_URL'],
  ['url http', { NEXT_PUBLIC_SITE_URL: 'http://shop.example.com' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url path', { NEXT_PUBLIC_SITE_URL: 'https://shop.example.com/store' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url query', { NEXT_PUBLIC_SITE_URL: 'https://shop.example.com/?a=1' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url hash', { NEXT_PUBLIC_SITE_URL: 'https://shop.example.com/#x' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url credentials', { NEXT_PUBLIC_SITE_URL: 'https://u:p@shop.example.com' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url localhost', { NEXT_PUBLIC_SITE_URL: 'https://localhost' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url 127.*', { NEXT_PUBLIC_SITE_URL: 'https://127.0.0.1' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url ::1', { NEXT_PUBLIC_SITE_URL: 'https://[::1]' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url 0.0.0.0', { NEXT_PUBLIC_SITE_URL: 'https://0.0.0.0' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url 10/8', { NEXT_PUBLIC_SITE_URL: 'https://10.1.2.3' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url 172.16/12', { NEXT_PUBLIC_SITE_URL: 'https://172.20.0.5' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url 192.168/16', { NEXT_PUBLIC_SITE_URL: 'https://192.168.1.10' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url link-local', { NEXT_PUBLIC_SITE_URL: 'https://169.254.1.1' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url ipv6 unique-local', { NEXT_PUBLIC_SITE_URL: 'https://[fd00::1]' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url ipv4-mapped', { NEXT_PUBLIC_SITE_URL: 'https://[::ffff:127.0.0.1]' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url localhost.', { NEXT_PUBLIC_SITE_URL: 'https://localhost.' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url .local', { NEXT_PUBLIC_SITE_URL: 'https://shop.local' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url .internal', { NEXT_PUBLIC_SITE_URL: 'https://shop.internal' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url .lan', { NEXT_PUBLIC_SITE_URL: 'https://shop.lan' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url .home.arpa', { NEXT_PUBLIC_SITE_URL: 'https://shop.home.arpa' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url single label', { NEXT_PUBLIC_SITE_URL: 'https://shop' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url CGNAT', { NEXT_PUBLIC_SITE_URL: 'https://100.64.0.1' }, 'NEXT_PUBLIC_SITE_URL'],
  ['url CGNAT top', { NEXT_PUBLIC_SITE_URL: 'https://100.127.255.254' }, 'NEXT_PUBLIC_SITE_URL'],
  ['secret DEPLOYMENT sample', { PAYLOAD_SECRET: 'REPLACE-ME-output-of-openssl-rand-hex-32' }, 'PAYLOAD_SECRET'],
  ['password DEPLOYMENT sample', { POSTGRES_PASSWORD: 'REPLACE-ME-output-of-openssl-rand-hex-24' }, 'POSTGRES_PASSWORD'],
  ['password word', { POSTGRES_PASSWORD: 'MyPassword-Kd82hQx9Lm4' }, 'POSTGRES_PASSWORD'],
  ['password change-me', { POSTGRES_PASSWORD: 'Kd82-hQ.Change-Me.x9Lm4' }, 'POSTGRES_PASSWORD'],
  ['password low variety', { POSTGRES_PASSWORD: 'abababababababababab' }, 'POSTGRES_PASSWORD'],
  ['secret replace', { PAYLOAD_SECRET: 'q7Hs2Lk9Zp4Vx8Nc1Tb6Wd3Fy5Replace' }, 'PAYLOAD_SECRET'],
  ['secret change-me', { PAYLOAD_SECRET: 'q7Hs2Lk9Zp4Vx8Nc1Tb6Wd3Fy5Change-Me' }, 'PAYLOAD_SECRET'],
  ['secret password', { PAYLOAD_SECRET: 'q7Hs2Lk9Zp4Vx8Nc1Tb6Wd3Fy5Password' }, 'PAYLOAD_SECRET'],
  ['url unparseable', { NEXT_PUBLIC_SITE_URL: 'not a url' }, 'NEXT_PUBLIC_SITE_URL'],
  // M52b: Turnstile keys (ADR-035 decision 7).
  ['turnstile secret missing', { TURNSTILE_SECRET_KEY: undefined }, 'TURNSTILE_SECRET_KEY'],
  ['turnstile secret empty', { TURNSTILE_SECRET_KEY: '' }, 'TURNSTILE_SECRET_KEY'],
  ['turnstile secret test pass', { TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' }, 'TURNSTILE_SECRET_KEY'],
  ['turnstile secret test fail', { TURNSTILE_SECRET_KEY: '2x0000000000000000000000000000000AA' }, 'TURNSTILE_SECRET_KEY'],
  ['turnstile secret test spent', { TURNSTILE_SECRET_KEY: '3x0000000000000000000000000000000AA' }, 'TURNSTILE_SECRET_KEY'],
  ['turnstile secret whitespace', { TURNSTILE_SECRET_KEY: '0x4AAAAAAAq9Zk3pQw8 LmT5vXr2NbY7cHd4J' }, 'TURNSTILE_SECRET_KEY'],
  ['turnstile secret trailing newline', { TURNSTILE_SECRET_KEY: '0x4AAAAAAAq9Zk3pQw8LmT5vXr2NbY7cHd4J\n' }, 'TURNSTILE_SECRET_KEY'],
  ['turnstile secret too short', { TURNSTILE_SECRET_KEY: '0x4AAAAAAAq9Zk3pQw8' }, 'TURNSTILE_SECRET_KEY'],
  ['turnstile secret too long', { TURNSTILE_SECRET_KEY: `0x4${'Ab9'.repeat(70)}` }, 'TURNSTILE_SECRET_KEY'],
  ['turnstile secret placeholder', { TURNSTILE_SECRET_KEY: 'REPLACE-ME-turnstile-secret-key' }, 'TURNSTILE_SECRET_KEY'],
  ['turnstile secret changeme', { TURNSTILE_SECRET_KEY: 'changeme-0x4AAAAAAAq9Zk3pQw8' }, 'TURNSTILE_SECRET_KEY'],
  ['turnstile site key missing', { NEXT_PUBLIC_TURNSTILE_SITE_KEY: undefined }, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'],
  ['turnstile site key test visible', { NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' }, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'],
  ['turnstile site key test blocks', { NEXT_PUBLIC_TURNSTILE_SITE_KEY: '2x00000000000000000000AB' }, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'],
  ['turnstile site key test invisible', { NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000BB' }, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'],
  ['turnstile site key test interactive', { NEXT_PUBLIC_TURNSTILE_SITE_KEY: '3x00000000000000000000FF' }, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'],
  ['turnstile site key whitespace', { NEXT_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAA h7Gm2Lk9Zp4V' }, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'],
  ['turnstile site key too short', { NEXT_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAA' }, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'],
  ['turnstile site key placeholder', { NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'your-site-key-placeholder' }, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'],
  ['turnstile keys identical', { NEXT_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAAq9Zk3pQw8LmT5vXr2NbY7cHd4J' }, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'],
  ['turnstile allow flag 1', { TURNSTILE_ALLOW_TEST_KEYS: '1' }, 'TURNSTILE_ALLOW_TEST_KEYS'],
  ['turnstile allow flag 0', { TURNSTILE_ALLOW_TEST_KEYS: '0' }, 'TURNSTILE_ALLOW_TEST_KEYS'],
  // ADR-036: separate database roles and the first-admin lock.
  ['app db password missing', { APP_DB_PASSWORD: undefined }, 'APP_DB_PASSWORD'],
  ['app db password empty', { APP_DB_PASSWORD: '' }, 'APP_DB_PASSWORD'],
  ['app db password too short', { APP_DB_PASSWORD: 'Rt57_Wn.c3-Vb8~' }, 'APP_DB_PASSWORD'],
  ['app db password bad charset', { APP_DB_PASSWORD: "Rt57_Wn.c3-Vb8~Jq'Xe" }, 'APP_DB_PASSWORD'],
  ['app db password placeholder', { APP_DB_PASSWORD: 'Rt57_Wn.c3-Vb8~example' }, 'APP_DB_PASSWORD'],
  ['app db password low variety', { APP_DB_PASSWORD: 'abababababababababab' }, 'APP_DB_PASSWORD'],
  ['app db password equals superuser', { APP_DB_PASSWORD: 'Kd82-hQ.x9_Lm4~Zt7Pw' }, 'APP_DB_PASSWORD'],
  ['first-register flag 1', { PAYLOAD_ALLOW_FIRST_REGISTER: '1' }, 'PAYLOAD_ALLOW_FIRST_REGISTER'],
  ['first-register flag 0', { PAYLOAD_ALLOW_FIRST_REGISTER: '0' }, 'PAYLOAD_ALLOW_FIRST_REGISTER'],
  ['bootstrap email without password', { ADMIN_BOOTSTRAP_EMAIL: 'owner@mystore.pk' }, 'ADMIN_BOOTSTRAP_PASSWORD'],
  ['bootstrap password without email', { ADMIN_BOOTSTRAP_PASSWORD: 'Vx93-pLq.m7_Ez4~Hs2Kd' }, 'ADMIN_BOOTSTRAP_EMAIL'],
  ['bootstrap bad email', { ADMIN_BOOTSTRAP_EMAIL: 'not-an-email', ADMIN_BOOTSTRAP_PASSWORD: 'Vx93-pLq.m7_Ez4~Hs2Kd' }, 'ADMIN_BOOTSTRAP_EMAIL'],
  ['bootstrap short password', { ADMIN_BOOTSTRAP_EMAIL: 'owner@mystore.pk', ADMIN_BOOTSTRAP_PASSWORD: 'Vx93-pLq.m7_E' }, 'ADMIN_BOOTSTRAP_PASSWORD'],
  ['bootstrap whitespace password', { ADMIN_BOOTSTRAP_EMAIL: 'owner@mystore.pk', ADMIN_BOOTSTRAP_PASSWORD: 'Vx93-pLq.m7_ Ez4~Hs2Kd' }, 'ADMIN_BOOTSTRAP_PASSWORD'],
  ['bootstrap placeholder password', { ADMIN_BOOTSTRAP_EMAIL: 'owner@mystore.pk', ADMIN_BOOTSTRAP_PASSWORD: 'ChangeMe-Vx93-pLq.m7' }, 'ADMIN_BOOTSTRAP_PASSWORD'],
  ['bootstrap low variety password', { ADMIN_BOOTSTRAP_EMAIL: 'owner@mystore.pk', ADMIN_BOOTSTRAP_PASSWORD: 'abababababababab' }, 'ADMIN_BOOTSTRAP_PASSWORD'],
]

for (const [name, patch, variable] of bad) {
  const env = withEnv(patch)
  const failures = validateEnv(env)
  assert.ok(failures.some((f) => f.startsWith(`${variable}:`)), `${name}: expected a failure naming ${variable}`)
  // Never echo values: no failure line may contain any non-trivial env value in the set.
  for (const f of failures) {
    for (const v of Object.values(env)) {
      if (v && v.length >= 8) assert.ok(!f.includes(v), `${name}: failure leaked a value`)
    }
  }
}

// Boundaries that must pass.
assert.deepEqual(validateEnv(withEnv({ PAYLOAD_ALLOW_FIRST_REGISTER: '' })), [], 'empty first-register flag accepted')
assert.deepEqual(
  validateEnv(withEnv({ ADMIN_BOOTSTRAP_EMAIL: 'owner@mystore.pk', ADMIN_BOOTSTRAP_PASSWORD: 'Vx93-pLq.m7_Ez4~Hs2Kd' })),
  [],
  'valid bootstrap credentials accepted',
)
assert.deepEqual(validateEnv(withEnv({ TURNSTILE_ALLOW_TEST_KEYS: '' })), [], 'empty allow flag accepted')
assert.deepEqual(validateEnv(withEnv({ TURNSTILE_SECRET_KEY: 'Ab9XqLm4Tz7Pw2Kd8Hs3' })), [], '20-char secret accepted')
assert.deepEqual(validateEnv(withEnv({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAh' })), [], '10-char site key accepted')
assert.deepEqual(validateEnv(withEnv({ PAYLOAD_SECRET: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ012345' })), [], '32 chars accepted')
assert.deepEqual(validateEnv(withEnv({ NEXT_PUBLIC_SITE_URL: 'https://shop.example.com/' })), [], 'trailing slash accepted')
assert.deepEqual(validateEnv(withEnv({ NEXT_PUBLIC_SITE_URL: 'https://172.32.0.1' })), [], '172.32 is public')
// Percent-encoded password in the URI that decodes to POSTGRES_PASSWORD is accepted.
assert.deepEqual(
  validateEnv(withEnv({ DATABASE_URI: 'postgresql://gocart:Kd82%2DhQ.x9_Lm4~Zt7Pw@postgres:5432/gocart' })),
  [],
  'encoded password that decodes to POSTGRES_PASSWORD is accepted',
)
// postgres:// scheme accepted.
assert.deepEqual(validateEnv(withEnv({ DATABASE_URI: good.DATABASE_URI.replace('postgresql', 'postgres') })), [], 'postgres:// accepted')

// CI's throwaway values (ci.yml migrations job) and real openssl output must pass.
assert.deepEqual(
  validateEnv({
    PAYLOAD_SECRET: 'Zk3pQw8LmT5vXr2NbY7cHd4JfG9sAe6U',
    POSTGRES_PASSWORD: 'ci-throwaway-pw-0123456789',
    APP_DB_PASSWORD: 'ci-throwaway-app-9876543210',
    DATABASE_URI: 'postgresql://gocart:ci-throwaway-pw-0123456789@localhost:5432/gocart_migrations',
    NEXT_PUBLIC_SITE_URL: 'https://shop.example.com',
    TURNSTILE_SECRET_KEY: good.TURNSTILE_SECRET_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: good.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  }),
  [],
  'CI throwaway set passes',
)
for (const url of ['https://shop.example.com', 'https://www.mystore.pk', 'https://8.8.8.8', 'https://100.63.0.1', 'https://100.128.0.1']) {
  assert.deepEqual(validateEnv(withEnv({ NEXT_PUBLIC_SITE_URL: url })), [], `${url} accepted`)
}

// getClientIp selection: production trusts only a valid cf-connecting-ip, keyed per IPv6 /64.
const hdr = (o: Record<string, string>) => (n: string) => o[n] ?? null
const prod = (cf: string, xff?: string) =>
  selectClientIp(hdr({ 'cf-connecting-ip': cf, ...(xff ? { 'x-forwarded-for': xff } : {}) }), true)
assert.equal(prod(' 203.0.113.9 '), '203.0.113.9')
assert.equal(prod('203.0.113.9', '6.6.6.6'), '203.0.113.9', 'xff ignored')
assert.equal(selectClientIp(hdr({ 'x-forwarded-for': '1.2.3.4' }), true), 'unknown', 'xff alone ignored')
assert.equal(selectClientIp(hdr({}), true), 'unknown')
for (const bad of ['garbage', '1.2.3', '2001:db8::1%eth0', '1:2:3:4:5:6:7:8:9', '2001::db8::1', '999.1.1.1', '']) {
  assert.equal(prod(bad, '1.2.3.4'), 'unknown', `invalid "${bad}" -> unknown`)
}
assert.equal(prod('2001:db8:1:2::1'), '2001:db8:1:2::/64')
assert.equal(prod('2001:db8:1:2:ffff:ffff:ffff:ffff'), prod('2001:db8:1:2::1'), 'same /64 -> same key')
assert.notEqual(prod('2001:db8:1:3::1'), prod('2001:db8:1:2::1'), 'different /64 -> different key')
assert.equal(prod('2001:0DB8:0001:0002:0000:0000:0000:0001'), prod('2001:db8:1:2::1'), 'expanded/upper == compressed')
assert.equal(prod('::ffff:203.0.113.9'), '203.0.113.9', 'mapped dotted')
assert.equal(prod('::ffff:cb00:7109'), '203.0.113.9', 'mapped hex')
assert.equal(prod('::1'), '0:0:0:0::/64')
assert.equal(normalizeIp('::'), '0:0:0:0::/64')
// Development behaviour unchanged.
assert.equal(selectClientIp(hdr({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }), false), '1.2.3.4')
assert.equal(selectClientIp(hdr({ 'cf-connecting-ip': 'garbage' }), false), 'garbage')
assert.equal(selectClientIp(hdr({ 'cf-connecting-ip': '2001:db8::1' }), false), '2001:db8::1')
assert.equal(selectClientIp(hdr({}), false), 'unknown')

// M52b: remoteip for siteverify is the raw, valid cf-connecting-ip, in production only.
assert.equal(selectVerifyIp(hdr({ 'cf-connecting-ip': ' 203.0.113.9 ' }), true), '203.0.113.9')
assert.equal(selectVerifyIp(hdr({ 'cf-connecting-ip': '2001:db8:1:2::1' }), true), '2001:db8:1:2::1', 'raw IPv6, not the /64 key')
assert.equal(selectVerifyIp(hdr({ 'cf-connecting-ip': '::ffff:203.0.113.9' }), true), '::ffff:203.0.113.9', 'raw mapped form')
for (const bad of ['garbage', '2001:db8::1%eth0', '999.1.1.1', '']) {
  assert.equal(selectVerifyIp(hdr({ 'cf-connecting-ip': bad, 'x-forwarded-for': '1.2.3.4' }), true), null, `invalid "${bad}" -> null`)
}
assert.equal(selectVerifyIp(hdr({ 'x-forwarded-for': '1.2.3.4' }), true), null, 'xff never used')
assert.equal(selectVerifyIp(hdr({ 'cf-connecting-ip': '203.0.113.9' }), false), null, 'never outside production')

// CLI behaviour: exit codes, skip outside production, no values on stdout/stderr.
const run = (env: Env) =>
  spawnSync('npx', ['tsx', 'scripts/check-env.ts'], {
    env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', ...env } as unknown as NodeJS.ProcessEnv,
    encoding: 'utf8',
  })

const ok = run({ ...good, NODE_ENV: 'production' })
assert.equal(ok.status, 0, 'good env exits 0')
assert.match(ok.stdout, /OK/)

const skipped = run({ NODE_ENV: 'development' })
assert.equal(skipped.status, 0, 'non-production is skipped with exit 0')
assert.match(skipped.stdout, /skipped, not production/)

const badEnv = { ...good, PAYLOAD_SECRET: 'changeme-changeme-changeme-changeme-xyz', NODE_ENV: 'production' }
const failed = run(badEnv)
assert.equal(failed.status, 1, 'bad env exits 1')
const output = failed.stdout + failed.stderr
assert.match(output, /PAYLOAD_SECRET/)
for (const v of [badEnv.PAYLOAD_SECRET, good.POSTGRES_PASSWORD, good.DATABASE_URI, good.TURNSTILE_SECRET_KEY, good.NEXT_PUBLIC_TURNSTILE_SITE_KEY]) {
  assert.ok(!output.includes(v), 'CLI output never contains a secret value')
}

// A test secret in production fails, and the output names the variable without its value.
const testKeyEnv = { ...good, TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA', NODE_ENV: 'production' }
const testKeyRun = run(testKeyEnv)
assert.equal(testKeyRun.status, 1, 'test secret exits 1')
assert.match(testKeyRun.stdout + testKeyRun.stderr, /TURNSTILE_SECRET_KEY/)
assert.ok(!(testKeyRun.stdout + testKeyRun.stderr).includes(testKeyEnv.TURNSTILE_SECRET_KEY), 'test key not echoed')

// Missing everything in production is a failure, not a pass.
assert.equal(run({ NODE_ENV: 'production' }).status, 1, 'empty production env exits 1')

console.log(`check-env tests passed (${bad.length} violating cases + boundaries + CLI)`)
