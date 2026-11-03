// M108: the pure rules of the test-site photo rollout (no database, no network, no Payload import),
// so they can be tested by `npm run test:rollout-demo-photos`. The Payload I/O lives in
// scripts/rollout-demo-photos.ts, which imports the Payload config only AFTER checkTarget() passes.
import { PRODUCTS, CATEGORIES, slugify } from './demo-data/catalogue'
import { ASSETS } from './demo-data/photos'

// ---- Target guard ----------------------------------------------------------------------------
// seed-demo.ts refuses every non-local database and stays that way (M108 spec: seed guards are not
// loosened). This tool is the opposite: it refuses everything EXCEPT one explicitly named Neon test
// database, so a wrong environment file can never reach production or a local volume by accident.

const PRODUCTION_ONLY_VARS = ['TUNNEL_TOKEN', 'APP_DB_PASSWORD']
/** The only connection-string parameters Neon's own strings use; anything else is refused. */
const ALLOWED_URI_PARAMS = ['sslmode', 'channel_binding', 'options']
/** @payloadcms/db-postgres and drizzle act on these when they connect: drop the database, or force a schema push. */
export const FORBIDDEN_PAYLOAD_VARS = ['PAYLOAD_DROP_DATABASE', 'PAYLOAD_FORCE_DRIZZLE_PUSH']

/**
 * Payload's Postgres adapter pushes the development schema when it connects (drizzle-kit, may ALTER or
 * DROP tables and writes a `dev` row into payload_migrations) unless NODE_ENV is production or
 * PAYLOAD_MIGRATING is 'true'. The rollout only reads and writes rows; it must never reshape the test
 * database, in a dry run least of all. The entry calls this before importing Payload. Migrations are
 * a separate, explicit step (ADR-032).
 */
export function applyPayloadSafety(env: Record<string, string | undefined>): void {
  env.PAYLOAD_MIGRATING = 'true'
}

/**
 * Shape rules shared by every guard that reads a connection string. WHATWG `URL` (used to read the host)
 * and `pg` (used to connect) disagree on some odd inputs, so the odd inputs are refused outright:
 * surrounding or inner whitespace and control characters (a leading space makes `pg` parse a different
 * host), a repeated query key (`URL.get` reads the first, `pg` the last), a host with anything but
 * letters, digits, dots and hyphens (`pg` percent-decodes), and any query parameter outside `allowed`.
 */
export function uriShapeProblems(uri: string, allowed: readonly string[]): string[] {
  const problems: string[] = []
  if (uri !== uri.trim() || /[\s\u0000-\u001f\u007f]/.test(uri)) problems.push('DATABASE_URI contains whitespace or control characters')
  try {
    const url = new URL(uri)
    // `pg` treats a `socket:` URI as a unix-socket directory taken from the path and ignores the hostname.
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') problems.push('DATABASE_URI must start with postgres:// or postgresql://')
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (!/^[a-z0-9.-]+$/.test(host)) problems.push('DATABASE_URI host has characters other than letters, digits, dots and hyphens')
    const keys = [...url.searchParams.keys()]
    if (new Set(keys).size !== keys.length) problems.push('DATABASE_URI repeats a query parameter')
    const unknown = [...new Set(keys.filter((k) => !allowed.includes(k)))]
    if (unknown.length > 0) problems.push(`DATABASE_URI has query parameter(s) that can redirect the connection or are not expected: ${unknown.join(', ')}`)
  } catch {
    problems.push('DATABASE_URI cannot be parsed')
  }
  return problems
}

/**
 * Guard for scripts/rollout-demo-photos.db-test.ts, which DELETES products, categories and media: only a
 * loopback database whose name ends in `_throwaway`, no production marker, not the restricted app role,
 * and NO Blob token (with one set, Payload would upload and delete real files on the test Blob store).
 */
export function checkLocalThrowaway(env: Record<string, string | undefined>): { ok: boolean; problems: string[] } {
  const problems: string[] = []
  if (env.ROLLOUT_DB_TEST_CONFIRM !== 'wipe-local-demo-data') problems.push('ROLLOUT_DB_TEST_CONFIRM=wipe-local-demo-data is not set')
  if (env.NODE_ENV?.trim().toLowerCase() === 'production') problems.push('NODE_ENV=production')
  for (const name of [...PRODUCTION_ONLY_VARS, ...FORBIDDEN_PAYLOAD_VARS]) if (env[name]) problems.push(`${name} is set`)
  if (env.BLOB_READ_WRITE_TOKEN) problems.push('BLOB_READ_WRITE_TOKEN is set (this test would upload and delete real Blob files); unset it')
  const uri = env.DATABASE_URI
  if (!uri) {
    problems.push('DATABASE_URI is not set')
  } else {
    problems.push(...uriShapeProblems(uri, []))
    try {
      const url = new URL(uri)
      const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
      if (!['localhost', '127.0.0.1', '::1'].includes(host)) problems.push('DATABASE_URI host is not localhost, 127.0.0.1 or ::1')
      if (decodeURIComponent(url.username) === 'gocart_app') problems.push('DATABASE_URI uses the restricted gocart_app role')
      if (!/_throwaway$/.test(url.pathname.replace(/^\//, ''))) problems.push('the database name must end in _throwaway')
    } catch {
      // already reported by uriShapeProblems
    }
  }
  return { ok: problems.length === 0, problems }
}

export type TargetCheck = { ok: boolean; problems: string[]; host: string | null }

/**
 * The environment must be: NODE_ENV not production, no production-stack variables, `--env test`,
 * a DATABASE_URI on a *.neon.tech host that exactly equals DEMO_ROLLOUT_DB_HOST (the operator names
 * the intended database; a host that was only "a Neon host" is not enough), and a
 * BLOB_READ_WRITE_TOKEN (without it the app would write the files to a local volume while the rows
 * point at Neon). The URI and the token are never printed or returned; only the host name is.
 */
export function checkTarget(env: Record<string, string | undefined>, envArg: string | undefined): TargetCheck {
  const problems: string[] = []
  if (envArg !== 'test') problems.push('pass --env test (the only supported target)')
  if (env.NODE_ENV?.trim().toLowerCase() === 'production') problems.push('NODE_ENV=production')
  for (const name of PRODUCTION_ONLY_VARS) {
    if (env[name]) problems.push(`${name} is set (production stack variable)`)
  }

  // Payload switches that would change the database on connect (see applyPayloadSafety).
  for (const name of FORBIDDEN_PAYLOAD_VARS) {
    if (env[name]) problems.push(`${name} is set (it can reshape or drop the database on connect)`)
  }

  let host: string | null = null
  const uri = env.DATABASE_URI
  if (!uri) {
    problems.push('DATABASE_URI is not set')
  } else {
    try {
      const url = new URL(uri)
      host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
      if (!host.endsWith('.neon.tech')) problems.push('DATABASE_URI host is not a *.neon.tech host')
      // `pg` lets a query parameter override the URL: `?host=localhost` connects to localhost whatever the
      // URL hostname says. So the hostname alone proves nothing; see uriShapeProblems.
      problems.push(...uriShapeProblems(uri, ALLOWED_URI_PARAMS))
      const ssl = url.searchParams.get('sslmode')
      if (ssl !== 'require' && ssl !== 'verify-full' && ssl !== 'verify-ca') problems.push('DATABASE_URI needs sslmode=require (or verify-full)')
    } catch {
      problems.push('DATABASE_URI cannot be parsed')
    }
  }

  const pinned = env.DEMO_ROLLOUT_DB_HOST?.trim().toLowerCase()
  if (!pinned) problems.push('DEMO_ROLLOUT_DB_HOST is not set (name the exact test database host)')
  else if (host && host !== pinned) problems.push('DATABASE_URI host does not equal DEMO_ROLLOUT_DB_HOST')

  if (!env.BLOB_READ_WRITE_TOKEN) problems.push('BLOB_READ_WRITE_TOKEN is not set (media would not reach Vercel Blob)')

  return { ok: problems.length === 0, problems, host }
}

// ---- What gets linked ------------------------------------------------------------------------

export type ProductTarget = { name: string; slug: string; filenames: [string, string] }
export type CategoryTarget = { slug: string; title: string; filename: string }

/** Every demo product with its two photo filenames, every category with its one (from the shared spec). */
export function rolloutTargets(): { products: ProductTarget[]; categories: CategoryTarget[] } {
  const outs = new Set(ASSETS.map((a) => a.out))
  const products = PRODUCTS.map((p) => {
    const slug = slugify(p.name)
    return { name: p.name, slug, filenames: [`${slug}-1.webp`, `${slug}-2.webp`] as [string, string] }
  })
  const categories = CATEGORIES.map((c) => ({ slug: c.slug, title: c.title, filename: `category-${c.slug}.webp` }))
  for (const f of [...products.flatMap((p) => p.filenames), ...categories.map((c) => c.filename)]) {
    if (!outs.has(f)) throw new Error(`no photo asset is defined for ${f}`)
  }
  return { products, categories }
}

// ---- Matching an existing media row ---------------------------------------------------------

/** The wanted filename without its extension and without a trailing `-<number>` (the slot or a Payload rename). */
export function mediaStem(wanted: string): string {
  return wanted.slice(0, wanted.lastIndexOf('.')).replace(/-\d+$/, '')
}

/**
 * Payload does not append a suffix when an upload's filename is taken: it INCREMENTS the trailing
 * number (`a-1.webp` -> `a-3.webp` when `a-1` and `a-2` exist; `a.webp` -> `a-1.webp`). Observed in
 * the M108 integration run, so a stored name cannot be compared with the wanted one directly. A row
 * is "the same file" only when its name is the same stem plus an optional number and extension AND
 * its byte size is the processed file's AND its alt text is the spec's. Size and alt matter: a
 * database that once ran the generated-art seed holds media with the same filenames, different
 * bytes and a different alt, and that must not be mistaken for the photo. The two photos of one
 * product differ in alt, so slot 1 and slot 2 are never confused.
 */
export function isSameMedia(
  row: { filename?: string | null; filesize?: number | null; alt?: string | null },
  wanted: string,
  bytes: number,
  alt: string,
): boolean {
  if (!row.filename || row.filesize !== bytes || row.alt !== alt) return false
  const ext = wanted.slice(wanted.lastIndexOf('.'))
  const escaped = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped(mediaStem(wanted))}(-\\d+)*${escaped(ext)}$`).test(row.filename)
}

/** True when the product's image list is exactly these two ids in this order. */
export function sameIds(current: ReadonlyArray<unknown>, wanted: ReadonlyArray<number>): boolean {
  const ids = current.map((v) => Number(typeof v === 'object' && v !== null ? (v as { id: unknown }).id : v))
  return ids.length === wanted.length && ids.every((id, i) => id === wanted[i])
}

// ---- Manifest -----------------------------------------------------------------------------

/** Fills media_id and media_env=test for the given asset ids; every other cell and row is untouched. */
export function recordInManifest(rows: string[][], mediaIdByAsset: ReadonlyMap<string, number>): { rows: string[][]; updated: number } {
  const header = rows[0]
  const idCol = header.indexOf('asset_id')
  const mediaCol = header.indexOf('media_id')
  const envCol = header.indexOf('media_env')
  if (idCol < 0 || mediaCol < 0 || envCol < 0) throw new Error('manifest header lacks asset_id, media_id or media_env')
  let updated = 0
  const next = rows.map((row, i) => {
    if (i === 0) return row
    const id = mediaIdByAsset.get(row[idCol])
    if (id === undefined) return row
    const copy = [...row]
    copy[mediaCol] = String(id)
    copy[envCol] = 'test'
    updated += 1
    return copy
  })
  return { rows: next, updated }
}
