import fs from 'node:fs'
import path from 'node:path'
import { parseCsv, sha256 } from './demo-images-core'
import { SOURCES } from './demo-data/photos'

// M108: recovers the archived demo originals (git-ignored demo-assets/_archive/originals/) on a machine
// that does not have them, so `npm run process:demo-images` can rebuild demo-assets/_processed/.
//
//   npm run fetch:demo-originals
//
// For each photo in scripts/demo-data/photos.ts it downloads the images.unsplash.com rendition and
// keeps it ONLY if its SHA-256 equals the original_sha256 that docs/assets/MANIFEST.csv recorded when
// the photo was licence-checked (M104). So the bytes are the ones that were reviewed, never a new
// crop or re-encode. A file already present with the right checksum is not downloaded again. A photo
// whose download matches no recorded checksum is reported and the run fails; nothing is overwritten.
// Development-time only: it never touches a database, Blob or the manifest.
//
// The renditions were found on 2026-11-03 to be served byte-identically by these query strings (the
// "w=5000 max, q=90" of the M104 notes); they are tried in order, at most three requests per photo.
const VARIANTS = ['w=5000&q=90&fit=max', 'w=5000&q=90&fit=max&fm=jpg', 'w=5000&q=90&fit=max&fm=pjpg']

const root = process.cwd()
const ORIGINALS = path.join(root, 'demo-assets', '_archive', 'originals')
const MANIFEST = path.join(root, 'docs', 'assets', 'MANIFEST.csv')

function recordedChecksums(): Map<string, string> {
  const [header, ...rows] = parseCsv(fs.readFileSync(MANIFEST, 'utf8')).filter((r) => r.length > 1)
  const nameCol = header.indexOf('original_filename')
  const shaCol = header.indexOf('original_sha256')
  if (nameCol < 0 || shaCol < 0) throw new Error('manifest header lacks original_filename or original_sha256')
  const out = new Map<string, string>()
  for (const row of rows) if (row[nameCol] && row[shaCol]) out.set(row[nameCol], row[shaCol])
  return out
}

async function main(): Promise<number> {
  const recorded = recordedChecksums()
  fs.mkdirSync(ORIGINALS, { recursive: true })
  let kept = 0
  let downloaded = 0
  const failures: string[] = []

  for (const source of Object.values(SOURCES)) {
    const file = `unsplash-${source.id}.jpg`
    const want = recorded.get(file)
    if (!want) {
      failures.push(`${file}: no original_sha256 in the manifest`)
      continue
    }
    const target = path.join(ORIGINALS, file)
    if (fs.existsSync(target) && sha256(fs.readFileSync(target)) === want) {
      kept += 1
      continue
    }
    let matched = false
    for (const query of VARIANTS) {
      const response = await fetch(`https://images.unsplash.com/${source.cdn}?${query}`)
      if (!response.ok) continue
      const data = Buffer.from(await response.arrayBuffer())
      if (sha256(data) !== want) continue
      // Written only after the checksum matched; a temporary name keeps a half-written file out.
      fs.writeFileSync(`${target}.part`, data)
      fs.renameSync(`${target}.part`, target)
      matched = true
      downloaded += 1
      break
    }
    if (!matched) failures.push(`${file}: no rendition matched the recorded checksum (the CDN may have changed; source the photo again per M104)`)
  }

  console.log(`fetch-demo-originals: ${kept} already present, ${downloaded} downloaded and verified, ${failures.length} failed`)
  for (const f of failures) console.error(`  - ${f}`)
  return failures.length === 0 ? 0 : 1
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(`fetch-demo-originals: FAILED - ${(error as Error).message?.split('\n')[0] ?? 'unknown error'}`)
    process.exit(1)
  })
