// M52: production environment validation, the first step of `npm run deploy:migrate` (ADR-033
// decision 7). An invalid production environment stops the stack before the database is
// touched. Prints the NAMES of failing variables and the rule broken, never a value. Node
// built-ins only. TUNNEL_TOKEN is deliberately not read: compose enforces it and passes it only
// to cloudflared. The strict rules live here, not in payload.config.ts, because that file is
// also loaded by `next build`, the seed script and the CI Playwright job (weak throwaway values).
// M52b (ADR-035 decision 7): the two Turnstile keys — required, plausible, never Cloudflare's
// public test keys (a test secret accepts the public dummy token: a bypass) — and
// TURNSTILE_ALLOW_TEST_KEYS must be unset. The real key format is not documented, so no prefix rule.
// M52b/ADR-036: also the app's database role password (APP_DB_PASSWORD, a different secret from
// the superuser's), the first-admin bootstrap credentials, and the refusal of
// PAYLOAD_ALLOW_FIRST_REGISTER (it re-opens the first-admin window; development and CI only).
import { pathToFileURL } from 'node:url'
import { isTurnstileTestKey } from '../lib/turnstile'

/** The restricted Postgres role the running app connects as (scripts/db-roles.ts creates it). */
export const APP_DB_USER = 'gocart_app'
export const APP_DB_PASSWORD_PATTERN = /^[A-Za-z0-9._~-]+$/

type Env = Record<string, string | undefined>

// One shared deny list for both secrets (case-insensitive substring match).
const SECRET_PLACEHOLDERS = ['dev-only', 'placeholder', 'changeme', 'change-me', 'replace', 'example', 'ci-only', 'password']

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (/\.(local|internal|lan)$/.test(host) || host.endsWith('.home.arpa')) return true
  if (host === '::1' || host === '::' || host === '0.0.0.0') return true
  if (host.startsWith('::ffff:')) return true // IPv4-mapped IPv6
  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10)
  if (host.includes(':')) return /^(f[cd]|fe[89ab])/.test(host)
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (!m) return !host.includes('.') // single-label host (intranet name)
  const a = Number(m[1])
  const b = Number(m[2])
  return (
    a === 0 ||
    a === 10 ||
    (a === 100 && b >= 64 && b <= 127) ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  )
}

function checkSecret(value: string | undefined, failures: string[]) {
  if (!value) return void failures.push('PAYLOAD_SECRET: required (missing or empty)')
  if (value.length < 32) failures.push('PAYLOAD_SECRET: must be at least 32 characters')
  if (/\s/.test(value)) failures.push('PAYLOAD_SECRET: must not contain whitespace')
  if (new Set(value).size < 12) failures.push('PAYLOAD_SECRET: must contain at least 12 distinct characters')
  denyPlaceholders('PAYLOAD_SECRET', value, failures)
}

function denyPlaceholders(name: string, value: string, failures: string[]) {
  const lower = value.toLowerCase()
  if (SECRET_PLACEHOLDERS.some((p) => lower.includes(p))) {
    failures.push(`${name}: must not contain a placeholder word (${SECRET_PLACEHOLDERS.join(', ')})`)
  }
}

function checkPassword(name: string, value: string | undefined, failures: string[]) {
  if (!value) return void failures.push(`${name}: required (missing or empty)`)
  if (value.length < 16) failures.push(`${name}: must be at least 16 characters`)
  if (new Set(value).size < 10) failures.push(`${name}: must contain at least 10 distinct characters`)
  denyPlaceholders(name, value, failures)
  if (!APP_DB_PASSWORD_PATTERN.test(value)) {
    failures.push(`${name}: only A-Z a-z 0-9 - . _ ~ are allowed (it is interpolated unencoded into a connection string)`)
  }
}

/** Both set or both unset; when set, an email-shaped address and a strong password. Pure; never returns a value. */
export function validateBootstrapCredentials(
  email: string | undefined,
  password: string | undefined,
  required: boolean,
): string[] {
  const failures: string[] = []
  if (!email && !password) {
    if (required) failures.push('ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD: required to create the first admin (missing or empty)')
    return failures
  }
  if (!email) failures.push('ADMIN_BOOTSTRAP_EMAIL: required when ADMIN_BOOTSTRAP_PASSWORD is set')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) failures.push('ADMIN_BOOTSTRAP_EMAIL: must be a valid email address')
  if (!password) failures.push('ADMIN_BOOTSTRAP_PASSWORD: required when ADMIN_BOOTSTRAP_EMAIL is set')
  else {
    if (password.length < 14) failures.push('ADMIN_BOOTSTRAP_PASSWORD: must be at least 14 characters')
    if (/\s/.test(password)) failures.push('ADMIN_BOOTSTRAP_PASSWORD: must not contain whitespace')
    if (new Set(password).size < 10) failures.push('ADMIN_BOOTSTRAP_PASSWORD: must contain at least 10 distinct characters')
    denyPlaceholders('ADMIN_BOOTSTRAP_PASSWORD', password, failures)
  }
  return failures
}

function checkDatabaseUri(value: string | undefined, password: string | undefined, failures: string[]) {
  if (!value) return void failures.push('DATABASE_URI: required (missing or empty)')
  if (!/^postgres(ql)?:\/\//.test(value)) {
    return void failures.push('DATABASE_URI: scheme must be postgres:// or postgresql://')
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return void failures.push('DATABASE_URI: does not parse as a URL')
  }
  if (!url.hostname) failures.push('DATABASE_URI: host is empty')
  if (!url.username) failures.push('DATABASE_URI: user is empty')
  if (!url.password) failures.push('DATABASE_URI: password is empty')
  if (url.pathname.replace(/^\//, '') === '') failures.push('DATABASE_URI: database name is empty')
  if (password && url.password) {
    let decoded: string | null = null
    try {
      decoded = decodeURIComponent(url.password)
    } catch {
      failures.push('DATABASE_URI: password is not valid percent-encoding')
    }
    if (decoded !== null && decoded !== password) {
      failures.push('DATABASE_URI: password does not match POSTGRES_PASSWORD')
    }
  }
}

function checkSiteUrl(value: string | undefined, failures: string[]) {
  if (!value) return void failures.push('NEXT_PUBLIC_SITE_URL: required (missing or empty)')
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return void failures.push('NEXT_PUBLIC_SITE_URL: does not parse as a URL')
  }
  if (url.protocol !== 'https:') failures.push('NEXT_PUBLIC_SITE_URL: must use https:')
  if (url.username || url.password) failures.push('NEXT_PUBLIC_SITE_URL: must not contain credentials')
  if (url.pathname !== '/' || url.search || url.hash || /[?#]/.test(value)) {
    failures.push('NEXT_PUBLIC_SITE_URL: must be an origin only (no path, query or fragment)')
  }
  if (isPrivateOrLocalHost(url.hostname)) {
    failures.push('NEXT_PUBLIC_SITE_URL: host must be public (not localhost, loopback, 0.0.0.0 or a private/link-local range)')
  }
}

function checkTurnstileKey(name: string, value: string | undefined, min: number, max: number, failures: string[]) {
  if (!value) return void failures.push(`${name}: required (missing or empty)`)
  if (/\s/.test(value)) failures.push(`${name}: must not contain whitespace`)
  if (value.length < min || value.length > max) failures.push(`${name}: must be ${min}-${max} characters`)
  if (isTurnstileTestKey(value)) failures.push(`${name}: must not be a Cloudflare Turnstile test key`)
  denyPlaceholders(name, value, failures)
}

function checkTurnstile(env: Env, failures: string[]) {
  checkTurnstileKey('TURNSTILE_SECRET_KEY', env.TURNSTILE_SECRET_KEY, 20, 200, failures)
  checkTurnstileKey('NEXT_PUBLIC_TURNSTILE_SITE_KEY', env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, 10, 100, failures)
  if (env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SECRET_KEY === env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    failures.push('NEXT_PUBLIC_TURNSTILE_SITE_KEY: must differ from TURNSTILE_SECRET_KEY')
  }
  if (env.TURNSTILE_ALLOW_TEST_KEYS) {
    failures.push('TURNSTILE_ALLOW_TEST_KEYS: must be unset or empty in production (development and CI only)')
  }
}

/** Pure: returns one human-readable failure per broken rule; never includes a value. */
export function validateEnv(env: Env): string[] {
  const failures: string[] = []
  checkSecret(env.PAYLOAD_SECRET, failures)
  checkPassword('POSTGRES_PASSWORD', env.POSTGRES_PASSWORD, failures)
  checkPassword('APP_DB_PASSWORD', env.APP_DB_PASSWORD, failures)
  if (env.APP_DB_PASSWORD && env.APP_DB_PASSWORD === env.POSTGRES_PASSWORD) {
    failures.push('APP_DB_PASSWORD: must differ from POSTGRES_PASSWORD (separate roles, separate secrets)')
  }
  checkDatabaseUri(env.DATABASE_URI, env.POSTGRES_PASSWORD, failures)
  checkSiteUrl(env.NEXT_PUBLIC_SITE_URL, failures)
  checkTurnstile(env, failures)
  failures.push(...validateBootstrapCredentials(env.ADMIN_BOOTSTRAP_EMAIL, env.ADMIN_BOOTSTRAP_PASSWORD, false))
  if (env.PAYLOAD_ALLOW_FIRST_REGISTER) {
    failures.push('PAYLOAD_ALLOW_FIRST_REGISTER: must be unset or empty in production (it lets any visitor create the first admin; development and CI only)')
  }
  return failures
}

function main(): number {
  if (process.env.NODE_ENV !== 'production') {
    console.log('check-env: skipped, not production (NODE_ENV is not "production")')
    return 0
  }
  const failures = validateEnv(process.env)
  if (failures.length > 0) {
    console.error('check-env: production environment is invalid:')
    for (const f of failures) console.error(`  - ${f}`)
    return 1
  }
  console.log('check-env: OK')
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main())
}
