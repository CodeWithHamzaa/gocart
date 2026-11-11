import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import type { OverlayOptions } from 'sharp'
import { parseCsv, renderAsset, serializeCsv, sha256, validateOutput } from './demo-images-core'
import { ASSETS, BUDGETS, LICENCE, SOURCES, UNSOURCED_PRODUCTS } from './demo-data/photos'

// M105: local, development-time image pipeline for the demo photography. Reads the originals from the
// git-ignored demo-assets/_archive/originals/, writes storefront files to demo-assets/_processed/
// and records provenance, checksums, sizes and status in docs/assets/MANIFEST.csv.
//
//   npm run process:demo-images            process every asset in scripts/demo-data/photos.ts
//   npm run process:demo-images -- --check validate existing outputs and originals only; writes nothing
//
// It never modifies an original, never uploads anything and never touches a database. Output is
// verified (format, exact size, byte budget, no metadata, sRGB, filename, alt text) before the
// manifest is written; any failure exits non-zero and leaves the manifest unchanged.

const root = process.cwd()
const ORIGINALS = path.join(root, 'demo-assets', '_archive', 'originals')
const OUT = path.join(root, 'demo-assets', '_processed')
const MANIFEST = path.join(root, 'docs', 'assets', 'MANIFEST.csv')
const CHECK_ONLY = process.argv.includes('--check')
const APPROVER = 'owner-delegated (autonomous M104-M106 authorisation, 2026-11-01)'

const originalName = (id: string) => `unsplash-${id}.jpg`
const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`

type Row = Record<string, string>

function readManifest(): { header: string[]; rows: Row[] } {
  const parsed = parseCsv(fs.readFileSync(MANIFEST, 'utf8')).filter((r) => r.length > 1)
  const [header, ...body] = parsed
  return { header, rows: body.map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']))) }
}

async function main() {
  const failures: string[] = []
  const { header, rows } = readManifest()
  const byId = new Map(rows.map((r) => [r.asset_id, r]))

  // 1. Originals: present, readable, checksummed; a checksum that differs from the manifest means the archive changed.
  const originalInfo = new Map<string, { file: string; data: Buffer; sha: string; bytes: number }>()
  for (const key of new Set(ASSETS.map((a) => a.src))) {
    const source = SOURCES[key]
    const file = originalName(source.id)
    const full = path.join(ORIGINALS, file)
    if (!fs.existsSync(full)) {
      failures.push(`${file}: original is missing from demo-assets/_archive/originals/`)
      continue
    }
    const data = fs.readFileSync(full)
    const sha = sha256(data)
    const recorded = rows.find((r) => r.original_filename === file && r.original_sha256)?.original_sha256
    if (recorded && recorded !== sha) failures.push(`${file}: checksum differs from the manifest (original was modified or replaced)`)
    originalInfo.set(key, { file, data, sha, bytes: data.length })
  }

  // 2. Process (or, with --check, just read) every asset.
  const results: Array<{ id: string; out: string; kind: string; bytes: number; quality?: number; width: number; height: number; sha: string; srcBytes: number; overTarget: boolean }> = []
  if (!CHECK_ONLY) fs.mkdirSync(OUT, { recursive: true })
  for (const asset of ASSETS) {
    const info = originalInfo.get(asset.src)
    if (!info) continue
    try {
      let data: Buffer
      let quality: number | undefined
      let overTarget = false
      if (CHECK_ONLY) {
        data = fs.readFileSync(path.join(OUT, asset.out))
      } else {
        const rendered = await renderAsset(info.data, asset.kind, asset.crop, asset.mode ?? 'crop', asset.out, asset.pad)
        data = rendered.data
        quality = rendered.quality
        overTarget = rendered.overTarget
      }
      const check = await validateOutput(data, asset.out, asset.kind, asset.alt)
      if (!check.ok) {
        failures.push(`${asset.out}: ${check.problems.join('; ')}`)
        continue
      }
      const sha = sha256(data)
      if (CHECK_ONLY) {
        const recorded = byId.get(asset.id)
        if (recorded?.processed_sha256 && recorded.processed_sha256 !== sha) failures.push(`${asset.out}: checksum differs from the manifest`)
        overTarget = data.length > BUDGETS[asset.kind].targetBytes
      } else {
        fs.writeFileSync(path.join(OUT, asset.out), data)
      }
      results.push({ id: asset.id, out: asset.out, kind: asset.kind, bytes: data.length, quality, width: check.width, height: check.height, sha, srcBytes: info.bytes, overTarget })
    } catch (error) {
      failures.push(`${asset.out}: ${(error as Error).message}`)
    }
  }

  // 3. Report.
  console.log(`\n${CHECK_ONLY ? 'Check' : 'Processed'} ${results.length} of ${ASSETS.length} assets`)
  for (const r of results) {
    const flag = r.overTarget ? '  (over target, within hard cap)' : ''
    console.log(`${r.out.padEnd(52)} ${`${r.width}x${r.height}`.padEnd(10)} ${kb(r.bytes).padStart(9)}${r.quality ? `  q${r.quality}` : ''}  from ${kb(r.srcBytes)}${flag}`)
  }
  if (failures.length > 0) {
    console.error(`\n${failures.length} failure(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    console.error('\nManifest left unchanged.')
    process.exit(1)
  }
  if (CHECK_ONLY) {
    console.log('\nAll outputs and originals match the manifest and the budgets.')
    return
  }

  // 4. Manifest: only after every file passed.
  const stamp = (id: string, patch: Row) => {
    const row = byId.get(id)
    if (!row) throw new Error(`manifest has no row for ${id}`)
    Object.assign(row, patch)
  }
  for (const asset of ASSETS) {
    const r = results.find((x) => x.id === asset.id)!
    const info = originalInfo.get(asset.src)!
    const source = SOURCES[asset.src]
    const crop = asset.mode === 'contain' ? 'whole photo padded with its own backdrop colour' : `crop centre ${asset.crop.cx}/${asset.crop.cy}, zoom ${asset.crop.zoom}`
    const notes = [
      source.note,
      `Framing: ${crop}.`,
      `Downloaded from images.unsplash.com/${source.cdn} as a JPEG rendition (w=5000 max, q=90), not the untouched upload. Author, date and licence line were read from the photo page through the WebFetch tool (the page itself shows scripts a browser check).`,
      asset.mismatch ? `CLOSE MATCH ONLY (D3): ${asset.mismatch}.` : '',
      asset.note ?? '',
      asset.kind === 'product' && asset.id.endsWith('-2')
        ? asset.src === ASSETS.find((a) => a.id === asset.id.replace(/-2$/, '-1'))?.src
          ? 'Gallery image 2 is a detail crop of the same photograph.'
          : 'Gallery image 2 is a different photograph of the same item (same shoot as image 1).'
        : '',
    ]
      .filter(Boolean)
      .join(' ')
    stamp(asset.id, {
      source_site: 'Unsplash',
      source_url: source.pageUrl,
      author: source.author,
      author_url: source.authorUrl,
      licence: LICENCE.name,
      licence_url: LICENCE.url,
      licence_checked_on: source.checked ?? LICENCE.checkedOn,
      attribution_required: 'no',
      attribution_text: `Photo by ${source.author} on Unsplash`,
      retrieved_on: source.checked ?? LICENCE.retrievedOn,
      original_filename: info.file,
      original_sha256: info.sha,
      archive_path: `demo-assets/_archive/originals/${info.file}`,
      processed_filename: asset.out,
      processed_sha256: r.sha,
      width: String(r.width),
      height: String(r.height),
      bytes: String(r.bytes),
      format: BUDGETS[asset.kind].format === 'jpeg' ? 'jpeg' : 'webp',
      alt_text: asset.alt,
      status: 'validated',
      approved_by: APPROVER,
      approved_on: source.checked ?? LICENCE.checkedOn,
      notes,
    })
  }
  for (const u of UNSOURCED_PRODUCTS) {
    for (const n of [1, 2]) {
      const id = `A-P${String(u.n).padStart(2, '0')}-${n}`
      const row = byId.get(id)
      if (!row) throw new Error(`manifest has no row for ${id}`)
      row.status = 'needed'
      row.notes = `NO ACCEPTABLE PHOTO FOUND (M104, 2026-11-01): ${u.reason} The demo seed keeps its generated artwork for this product until a photo is supplied (demo-assets/_inbox/).`
    }
  }
  fs.writeFileSync(MANIFEST, serializeCsv([header, ...rows.map((r) => header.map((h) => r[h] ?? ''))]))

  // 5. Contact sheets for human review (git-ignored, inside demo-assets/_processed/).
  const cell = 220
  const cols = 6
  const per = 24
  for (let page = 0; page * per < results.length; page++) {
    const slice = results.slice(page * per, (page + 1) * per)
    const composites: OverlayOptions[] = []
    for (let i = 0; i < slice.length; i++) {
      const left = (i % cols) * cell
      const top = Math.floor(i / cols) * (cell + 18)
      const tile = await sharp(path.join(OUT, slice[i].out)).resize(cell, cell, { fit: 'contain', background: '#ffffff' }).jpeg({ quality: 80 }).toBuffer()
      composites.push({ input: tile, left, top: top + 18 })
      const label = Buffer.from(`<svg width="${cell}" height="18"><rect width="100%" height="100%" fill="#222"/><text x="3" y="13" font-size="11" fill="#fff" font-family="sans-serif">${slice[i].out.slice(0, 34)}</text></svg>`)
      composites.push({ input: label, left, top })
    }
    const rowsCount = Math.ceil(slice.length / cols)
    await sharp({ create: { width: cell * cols, height: rowsCount * (cell + 18), channels: 3, background: '#888' } })
      .composite(composites)
      .jpeg({ quality: 82 })
      .toFile(path.join(OUT, `_contact-sheet-${page + 1}.jpg`))
  }
  console.log(`\nManifest updated: ${results.length} rows set to validated, ${UNSOURCED_PRODUCTS.length * 2} product rows left as needed.`)
  console.log('Contact sheets: demo-assets/_processed/_contact-sheet-*.jpg (git-ignored)')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
