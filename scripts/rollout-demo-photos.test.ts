// M108: the rules of the test-site photo rollout. No database, no network, no credentials:
// `npm run test:rollout-demo-photos`.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { parseCsv } from './demo-images-core'
import { ASSETS } from './demo-data/photos'
import { applyPayloadSafety, checkTarget, isSameMedia, mediaStem, recordInManifest, rolloutTargets, sameIds } from './rollout-demo-photos-core'

const GOOD = {
  DATABASE_URI: 'postgres://gocart_app:secret-password@ep-test-123-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  DEMO_ROLLOUT_DB_HOST: 'ep-test-123-pooler.us-east-1.aws.neon.tech',
  BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_dummy',
}

// ---- checkTarget: only the one named Neon test database passes ----
{
  const ok = checkTarget(GOOD, 'test')
  assert.equal(ok.ok, true, ok.problems.join('; '))
  assert.equal(ok.host, 'ep-test-123-pooler.us-east-1.aws.neon.tech')

  const refuse = (env: Record<string, string | undefined>, arg: string | undefined, why: RegExp) => {
    const r = checkTarget(env, arg)
    assert.equal(r.ok, false)
    assert.ok(r.problems.some((p) => why.test(p)), `expected a problem matching ${why}, got: ${r.problems.join('; ')}`)
  }
  refuse(GOOD, undefined, /--env test/)
  refuse(GOOD, 'production', /--env test/)
  refuse({ ...GOOD, NODE_ENV: 'production' }, 'test', /NODE_ENV=production/)
  refuse({ ...GOOD, TUNNEL_TOKEN: 'x' }, 'test', /TUNNEL_TOKEN/)
  refuse({ ...GOOD, APP_DB_PASSWORD: 'x' }, 'test', /APP_DB_PASSWORD/)
  refuse({ ...GOOD, DATABASE_URI: undefined }, 'test', /DATABASE_URI is not set/)
  refuse({ ...GOOD, DATABASE_URI: 'not a url' }, 'test', /cannot be parsed/)
  // The seed's own targets are NOT valid here: local and docker hosts, and any non-Neon host.
  refuse({ ...GOOD, DATABASE_URI: 'postgres://u:p@localhost:5432/db', DEMO_ROLLOUT_DB_HOST: 'localhost' }, 'test', /neon\.tech/)
  refuse({ ...GOOD, DATABASE_URI: 'postgres://u:p@postgres:5432/db', DEMO_ROLLOUT_DB_HOST: 'postgres' }, 'test', /neon\.tech/)
  refuse({ ...GOOD, DATABASE_URI: 'postgres://u:p@db.example.com/db', DEMO_ROLLOUT_DB_HOST: 'db.example.com' }, 'test', /neon\.tech/)
  // A look-alike host does not pass the suffix check.
  refuse({ ...GOOD, DATABASE_URI: 'postgres://u:p@neon.tech.evil.com/db', DEMO_ROLLOUT_DB_HOST: 'neon.tech.evil.com' }, 'test', /neon\.tech/)
  // The operator must name the host, and it must be the same host.
  refuse({ ...GOOD, DEMO_ROLLOUT_DB_HOST: undefined }, 'test', /DEMO_ROLLOUT_DB_HOST is not set/)
  refuse({ ...GOOD, DEMO_ROLLOUT_DB_HOST: 'ep-other-999.us-east-1.aws.neon.tech' }, 'test', /does not equal/)
  // Without the Blob token the files would land on a local volume while the rows point at Neon.
  refuse({ ...GOOD, BLOB_READ_WRITE_TOKEN: undefined }, 'test', /BLOB_READ_WRITE_TOKEN/)
  // Host comparison ignores case.
  assert.equal(checkTarget({ ...GOOD, DEMO_ROLLOUT_DB_HOST: GOOD.DEMO_ROLLOUT_DB_HOST.toUpperCase() }, 'test').ok, true)
  // `pg` lets a query parameter override the URL host, so the hostname alone proves nothing (found by review).
  const withQuery = (q: string) => ({ ...GOOD, DATABASE_URI: `postgres://u:p@ep-test-123-pooler.us-east-1.aws.neon.tech/db?${q}` })
  refuse(withQuery('sslmode=require&host=localhost'), 'test', /query parameter/)
  refuse(withQuery('sslmode=require&host=%2Fvar%2Frun%2Fpostgresql'), 'test', /query parameter/)
  refuse(withQuery('sslmode=require&port=5432'), 'test', /query parameter/)
  refuse(withQuery('sslmode=require&hostaddr=127.0.0.1'), 'test', /query parameter/)
  refuse(withQuery('sslmode=require&dbname=other'), 'test', /query parameter/)
  refuse(withQuery('sslmode=require&user=owner'), 'test', /query parameter/)
  assert.equal(checkTarget(withQuery('sslmode=verify-full'), 'test').ok, true)
  // TLS is required.
  refuse(withQuery('connect_timeout=5'), 'test', /sslmode/)
  refuse({ ...GOOD, DATABASE_URI: 'postgres://u:p@ep-test-123-pooler.us-east-1.aws.neon.tech/db' }, 'test', /sslmode/)
  refuse(withQuery('sslmode=disable'), 'test', /sslmode/)
  // Userinfo and separator tricks end up on a non-Neon host.
  refuse({ ...GOOD, DATABASE_URI: 'postgres://x@ep-test-123-pooler.us-east-1.aws.neon.tech@evil.com/db?sslmode=require', DEMO_ROLLOUT_DB_HOST: 'evil.com' }, 'test', /neon\.tech/)
  // Production markers are matched case-insensitively and ignoring spaces.
  refuse({ ...GOOD, NODE_ENV: 'Production' }, 'test', /NODE_ENV=production/)
  refuse({ ...GOOD, NODE_ENV: ' production ' }, 'test', /NODE_ENV=production/)
  // Payload switches that drop the database or force a schema push on connect.
  refuse({ ...GOOD, PAYLOAD_DROP_DATABASE: 'true' }, 'test', /PAYLOAD_DROP_DATABASE/)
  refuse({ ...GOOD, PAYLOAD_FORCE_DRIZZLE_PUSH: 'true' }, 'test', /PAYLOAD_FORCE_DRIZZLE_PUSH/)
  // Payload must not push a dev schema to the test database on connect.
  const pushEnv: Record<string, string | undefined> = {}
  applyPayloadSafety(pushEnv)
  assert.equal(pushEnv.PAYLOAD_MIGRATING, 'true')
  // The result never carries the URI or the token.
  const serialized = JSON.stringify(checkTarget({ ...GOOD, BLOB_READ_WRITE_TOKEN: undefined }, 'test'))
  assert.ok(!serialized.includes('secret-password') && !serialized.includes('gocart_app'), 'no credentials in the result')
}

// ---- rolloutTargets: every demo product has two photos, every category one, all defined in the spec ----
{
  const { products, categories } = rolloutTargets()
  assert.equal(products.length, 24)
  assert.equal(categories.length, 10)
  const outs = new Set(ASSETS.map((a) => a.out))
  for (const p of products) for (const f of p.filenames) assert.ok(outs.has(f), `${f} is defined`)
  for (const c of categories) assert.ok(outs.has(c.filename), `${c.filename} is defined`)
  assert.equal(new Set(products.map((p) => p.name)).size, products.length, 'product names are unique (the identity key)')
}

// ---- isSameMedia: name stem, byte size and alt must all match (Payload increments a trailing number on a name clash) ----
{
  const W = 'volt-compact-power-bank-1.webp'
  const row = (filename: string | null, filesize?: number, alt = 'Slim silver power bank') => ({ filename, filesize, alt })
  const same = (r: ReturnType<typeof row>) => isSameMedia(r, W, 5000, 'Slim silver power bank')
  assert.equal(same(row(W, 5000)), true)
  assert.equal(same(row('volt-compact-power-bank-3.webp', 5000)), true, 'Payload turned -1 into -3 (observed)')
  assert.equal(same(row('volt-compact-power-bank-1-1.webp', 5000)), true)
  assert.equal(same(row('volt-compact-power-bank.webp', 5000)), true)
  assert.equal(same(row(W, 4000)), false, 'generated art with the same name has other bytes')
  assert.equal(same(row(W, 5000, 'Volt Compact Power Bank, view 1')), false, 'generated art has another alt')
  assert.equal(same(row('xvolt-compact-power-bank-1.webp', 5000)), false, 'prefix does not match')
  assert.equal(same(row('volt-compact-power-bank-1.png', 5000)), false, 'extension')
  assert.equal(same(row('volt-compact-power-bank-max-1.webp', 5000)), false, 'another product with the same prefix')
  assert.equal(same(row(null, 5000)), false)
  assert.equal(same(row(W, undefined)), false, 'unknown size never matches')
  // Two photos of one product are told apart by alt even when a rename gave them neighbouring numbers.
  assert.equal(isSameMedia(row('volt-compact-power-bank-2.webp', 5000, 'Close-up of the cable'), W, 5000, 'Slim silver power bank'), false)
  // Categories have no slot number.
  assert.equal(isSameMedia(row('category-power-banks-2.webp', 700, 'Power banks'), 'category-power-banks.webp', 700, 'Power banks'), true)
  assert.equal(mediaStem('aero-wave-wireless-headphones-1.webp'), 'aero-wave-wireless-headphones')
  assert.equal(mediaStem('category-power-banks.webp'), 'category-power-banks')
  // Regex characters in a filename are literal.
  assert.equal(isSameMedia(row('axb.webp', 1, 'x'), 'a.b.webp', 1, 'x'), false)
}

// ---- sameIds: populated and unpopulated relations, order matters ----
{
  assert.equal(sameIds([1, 2], [1, 2]), true)
  assert.equal(sameIds([{ id: 1 }, { id: 2 }], [1, 2]), true)
  assert.equal(sameIds([2, 1], [1, 2]), false)
  assert.equal(sameIds([1], [1, 2]), false)
  assert.equal(sameIds([1, 2, 3], [1, 2]), false)
}

// ---- recordInManifest touches only media_id and media_env of the named assets ----
{
  const header = ['asset_id', 'target_record', 'media_id', 'media_env', 'status']
  const rows = [header, ['A-P01-1', 'Headphones, "black"', '', '', 'approved'], ['A-P01-2', 'x', '', '', 'approved'], ['A-O01', 'y', '', '', 'approved']]
  const { rows: out, updated } = recordInManifest(rows, new Map([['A-P01-1', 41], ['A-P01-2', 42]]))
  assert.equal(updated, 2)
  assert.deepEqual(out[1], ['A-P01-1', 'Headphones, "black"', '41', 'test', 'approved'])
  assert.deepEqual(out[2], ['A-P01-2', 'x', '42', 'test', 'approved'])
  assert.deepEqual(out[3], rows[3], 'an asset that was not rolled out is untouched')
  assert.deepEqual(rows[1], ['A-P01-1', 'Headphones, "black"', '', '', 'approved'], 'input is not mutated')
  assert.throws(() => recordInManifest([['asset_id', 'media_id']], new Map()), /lacks/)
}

// ---- the real manifest has the columns, and every rolled-out asset has a row ----
{
  const rows = parseCsv(fs.readFileSync(path.join(process.cwd(), 'docs', 'assets', 'MANIFEST.csv'), 'utf8'))
  const header = rows[0]
  for (const col of ['asset_id', 'media_id', 'media_env']) assert.ok(header.includes(col), `manifest has ${col}`)
  const ids = new Set(rows.slice(1).map((r) => r[header.indexOf('asset_id')]))
  const { products, categories } = rolloutTargets()
  for (const f of [...products.flatMap((p) => p.filenames), ...categories.map((c) => c.filename)]) {
    const asset = ASSETS.find((a) => a.out === f)
    assert.ok(asset && ids.has(asset.id), `manifest row for ${f}`)
  }
}

// ---- the script itself refuses a wrong environment BEFORE importing Payload or touching anything ----
{
  const run = (extraEnv: Record<string, string>, extraArgs: string[]) =>
    spawnSync(process.execPath, ['--import', 'tsx', 'scripts/rollout-demo-photos.ts', ...extraArgs], {
      cwd: process.cwd(),
      env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', ...extraEnv } as unknown as NodeJS.ProcessEnv,
      encoding: 'utf8',
      timeout: 60_000,
    })

  // No environment at all.
  const bare = run({}, [])
  assert.equal(bare.status, 1)
  assert.match(bare.stderr, /refusing to run/)

  // A local database, even with --env test and --apply.
  const local = run({ DATABASE_URI: 'postgres://u:topsecretvalue@localhost:5432/db', DEMO_ROLLOUT_DB_HOST: 'localhost', BLOB_READ_WRITE_TOKEN: 'tokenvalue123' }, ['--env', 'test', '--apply'])
  assert.equal(local.status, 1)
  assert.match(local.stderr, /neon\.tech/)
  for (const secret of ['topsecretvalue', 'tokenvalue123']) {
    assert.ok(!local.stdout.includes(secret) && !local.stderr.includes(secret), 'no secret is printed')
  }

  // The right environment but no processed photos: stops before opening a database.
  const empty = fs.mkdtempSync(path.join(process.env.TMPDIR ?? '/tmp', 'rollout-'))
  const noPhotos = run({ ...GOOD, DEMO_ASSETS_DIR: empty }, ['--env', 'test'])
  assert.equal(noPhotos.status, 1)
  assert.match(noPhotos.stderr, /processed photos are not ready/)
  assert.ok(!noPhotos.stdout.includes('secret-password') && !noPhotos.stderr.includes('secret-password'))
  fs.rmSync(empty, { recursive: true, force: true })
}

console.log('rollout-demo-photos: all checks passed')
