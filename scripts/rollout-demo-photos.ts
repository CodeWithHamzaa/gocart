import fs from 'node:fs'
import path from 'node:path'
import { parseCsv, serializeCsv, validateOutput } from './demo-images-core'
import { ASSETS } from './demo-data/photos'
import { fileURLToPath } from 'node:url'
import { applyPayloadSafety, checkTarget, recordInManifest, rolloutTargets } from './rollout-demo-photos-core'
import type { Loaded } from './rollout-demo-photos-run'

// M108 (ADR-049): puts the processed demo photos (demo-assets/_processed/, from
// `npm run process:demo-images`) on the approved TEST environment: Neon Free + Vercel Blob
// (ADR-046). Never production. Run it from a machine that has the processed photos and the test
// credentials; nothing here deploys anything.
//
//   npx tsx --env-file=<file outside the repo> scripts/rollout-demo-photos.ts --env test            (dry run)
//   npx tsx --env-file=<file outside the repo> scripts/rollout-demo-photos.ts --env test --apply
//   ... add --create-missing to also create demo categories/products that the test database lacks
//
// The env file needs DATABASE_URI (Neon, the restricted gocart_app role is enough), PAYLOAD_SECRET,
// BLOB_READ_WRITE_TOKEN and DEMO_ROLLOUT_DB_HOST (the exact Neon host you mean to change). That file holds
// secrets: keep it OUTSIDE the repository, never commit, paste or print it.
//
// Safety, in the order it happens:
//  1. checkTarget() refuses anything but that one named Neon host (sslmode set, no query parameter that
//     could redirect the connection) with the Blob token set, and any production marker or Payload
//     drop/force-push switch. This runs BEFORE the Payload config is imported, so a refused run never
//     opens a database, and applyPayloadSafety() then stops Payload pushing a dev schema on connect.
//     Dry run is the default; --apply is required to write.
//  2. Every processed file is validated again (format, exact size, byte budget, no metadata, alt
//     text) and the run stops if any is missing or invalid: no half rollout.
//  3. Media is found by filename AND byte size before uploading (rerunning adds nothing; older art
//     with the same filename is not mistaken for the photo). Rows are only ever created or
//     relinked: products by exact name (images), categories by slug (image). Nothing is deleted;
//     media that is no longer referenced is left for M109's reference-checked cleanup.
//  4. Prints counts and names only, never the connection string or the token.
// Outputs on --apply: media ids and media_env=test in docs/assets/MANIFEST.csv, and a rollback log
// (one JSON line per uploaded media id, written as it happens) in demo-assets/_processed/ (git-ignored).

const args = new Set(process.argv.slice(2))
const envArg = process.argv.slice(2).includes('--env') ? process.argv[process.argv.indexOf('--env') + 1] : undefined
const APPLY = args.has('--apply')
const CREATE_MISSING = args.has('--create-missing')

const processedDir = () => path.join(path.resolve(process.env.DEMO_ASSETS_DIR || path.join(process.cwd(), 'demo-assets')), '_processed')
// Resolved from this file, not the working directory, so a run from another folder cannot miss the repo.
const manifestPath = () => path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'assets', 'MANIFEST.csv')

async function loadAll(dir: string): Promise<{ files: Map<string, Loaded>; problems: string[] }> {
  const { products, categories } = rolloutTargets()
  const wanted = [...products.flatMap((p) => p.filenames), ...categories.map((c) => c.filename)]
  const files = new Map<string, Loaded>()
  const problems: string[] = []
  for (const filename of wanted) {
    const asset = ASSETS.find((a) => a.out === filename)
    if (!asset) {
      problems.push(`${filename}: no asset definition`)
      continue
    }
    let data: Buffer
    try {
      data = fs.readFileSync(path.join(dir, filename))
    } catch {
      problems.push(`${filename}: missing in ${path.basename(dir)}/ (run npm run process:demo-images)`)
      continue
    }
    const check = await validateOutput(data, filename, asset.kind, asset.alt)
    if (!check.ok) problems.push(`${filename}: ${check.problems.join('; ')}`)
    else files.set(filename, { filename, data, alt: asset.alt, assetId: asset.id })
  }
  return { files, problems }
}

async function main(): Promise<number> {
  const target = checkTarget(process.env, envArg)
  if (!target.ok) {
    console.error('rollout-demo-photos: refusing to run:')
    for (const p of target.problems) console.error(`  - ${p}`)
    return 1
  }

  const dir = processedDir()
  const { files, problems } = await loadAll(dir)
  if (problems.length > 0) {
    console.error('rollout-demo-photos: the processed photos are not ready:')
    for (const p of problems) console.error(`  - ${p}`)
    return 1
  }

  console.log(`rollout-demo-photos: target host ${target.host} (test), mode ${APPLY ? 'APPLY' : 'dry run'}${CREATE_MISSING ? ', create-missing' : ''}`)

  // The Payload Postgres adapter would push the dev schema to the test database on connect (even in a
  // dry run). Switch that off before Payload is imported; migrations are a separate step (ADR-032).
  applyPayloadSafety(process.env)

  // Imported only after the guard: loading the config is what makes a database reachable.
  const { getPayload } = await import('payload')
  const { default: config } = await import('../payload.config')
  const { runRollout } = await import('./rollout-demo-photos-run')
  const payload = await getPayload({ config })

  // The rollback log is appended to as each file is uploaded, so a failure half way still leaves the
  // list of what exists (reruns are idempotent and reuse those files).
  const logPath = path.join(dir, `rollout-test-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`)
  const logCreated = (mediaId: number, filename: string) => fs.appendFileSync(logPath, JSON.stringify({ mediaId, filename, host: target.host }) + '\n')

  const counts = await runRollout(payload, files, { apply: APPLY, createMissing: CREATE_MISSING, onCreated: logCreated })
  const { mediaIdByFile } = counts

  console.log(
    `media: ${counts.mediaExisting} already on the test site, ${counts.mediaToUpload} ${APPLY ? 'uploaded' : 'to upload'}; ` +
      `rows: ${counts.linked} ${APPLY ? 'relinked' : 'to relink'}, ${counts.alreadyLinked} already correct, ${counts.created} ${APPLY ? 'created' : 'to create'}`,
  )
  if (counts.missingTargets.length > 0) {
    console.log(`not on the test site (skipped, and their photos were not uploaded; use --create-missing to create them): ${counts.missingTargets.join('; ')}`)
  }

  if (!APPLY) {
    console.log('Dry run: no row, file or schema was written. Re-run with --apply to roll out.')
    return 0
  }

  const byAsset = new Map<string, number>()
  for (const [filename, id] of mediaIdByFile) byAsset.set((files.get(filename) as Loaded).assetId, id)
  const text = fs.readFileSync(manifestPath(), 'utf8')
  const { rows, updated } = recordInManifest(parseCsv(text), byAsset)
  fs.writeFileSync(manifestPath(), serializeCsv(rows))
  console.log(`Manifest: ${updated} row(s) recorded with media_env=test.${counts.createdMedia.length > 0 ? ` Rollback log (uploaded media ids): ${path.basename(logPath)}` : ' Nothing was uploaded, so there is no rollback log.'}`)
  return 0
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(`rollout-demo-photos: FAILED - ${(error as Error).message?.split('\n')[0] ?? 'unknown error'}`)
    process.exit(1)
  })
