// M105: the rules of the local demo-image pipeline as pure, testable functions (sharp only, no new
// dependency). The command-line tool is scripts/process-demo-images.ts; the spec is
// scripts/demo-data/photos.ts. Development-time only: nothing here is imported by the application.
import crypto from 'node:crypto'
import sharp from 'sharp'
import type { Metadata, Sharp } from 'sharp'
import { BUDGETS, QUALITY_FLOOR, QUALITY_START } from './demo-data/photos'
import type { Crop, Kind } from './demo-data/photos'

export type Box = { left: number; top: number; width: number; height: number }
export type Budget = (typeof BUDGETS)[Kind]

// Untrusted-ish input: cap decoded pixels and fail on any decode error (same posture as seed-demo.ts).
export const SHARP_INPUT = { limitInputPixels: 80_000_000, failOn: 'error' } as const

export const sha256 = (data: Buffer | Uint8Array): string => crypto.createHash('sha256').update(data).digest('hex')

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/** Crop box of the output aspect ratio, centred on (cx, cy) as fractions of the image, kept inside it. */
export function cropBox(width: number, height: number, aspect: number, crop: Crop): Box {
  if (!(width > 0 && height > 0 && aspect > 0)) throw new Error('invalid image size or aspect')
  if (!(crop.zoom > 0 && crop.zoom <= 1)) throw new Error(`zoom must be in (0, 1], got ${crop.zoom}`)
  const largestHeight = Math.min(height, width / aspect)
  const boxHeight = Math.min(height, Math.round(largestHeight * crop.zoom))
  // Rounding can push the width 1px past the image (e.g. a square source at 4:3, zoom 1).
  const boxWidth = Math.min(width, Math.round(boxHeight * aspect))
  const left = clamp(Math.round(crop.cx * width - boxWidth / 2), 0, width - boxWidth)
  const top = clamp(Math.round(crop.cy * height - boxHeight / 2), 0, height - boxHeight)
  return { left, top, width: boxWidth, height: boxHeight }
}

/** Never enlarge a source: the cropped region must be at least as large as the output. */
export function assertNoUpscale(box: Box, budget: Budget, label: string): void {
  if (box.width < budget.width || box.height < budget.height) {
    throw new Error(`${label}: source region ${box.width}x${box.height} is smaller than ${budget.width}x${budget.height}; refusing to upscale`)
  }
}

export type Encoded = { data: Buffer; quality: number; overTarget: boolean }

/**
 * Encodes at the highest quality (stepping down from QUALITY_START) that fits the target size. If
 * even QUALITY_FLOOR misses the target, the floor result is accepted only within the hard cap;
 * beyond it the file fails rather than being degraded further.
 */
export async function encodeToBudget(make: (quality: number) => Promise<Buffer>, budget: Budget): Promise<Encoded> {
  let last: Encoded | null = null
  const steps: number[] = []
  for (let quality = QUALITY_START; quality > QUALITY_FLOOR; quality -= 4) steps.push(quality)
  steps.push(QUALITY_FLOOR) // the floor itself is always the last attempt
  for (const q of steps) {
    const data = await make(q)
    last = { data, quality: q, overTarget: data.length > budget.targetBytes }
    if (data.length <= budget.targetBytes) return last
  }
  if (!last || last.data.length > budget.hardBytes) {
    throw new Error(`still ${last?.data.length ?? 0} bytes at quality ${QUALITY_FLOOR}, above the hard cap of ${budget.hardBytes}`)
  }
  return last
}

const ALLOWED_NAME = /^(?:[a-z0-9]+(?:-[a-z0-9]+)*-[12]\.webp|category-[a-z0-9]+(?:-[a-z0-9]+)*\.webp|demo-[a-z0-9]+(?:-[a-z0-9]+)*\.(?:webp|jpg))$/

export type ValidationResult = { ok: boolean; problems: string[]; width: number; height: number; bytes: number; format: string }

/** Re-reads an output file and checks it against its budget: format, exact size, bytes, no metadata, no animation, sRGB, name. */
export async function validateOutput(data: Buffer, filename: string, kind: Kind, alt: string | undefined): Promise<ValidationResult> {
  const budget = BUDGETS[kind]
  const problems: string[] = []
  let meta: Metadata
  try {
    meta = await sharp(data, SHARP_INPUT).metadata()
  } catch (error) {
    return { ok: false, problems: [`unreadable: ${(error as Error).message}`], width: 0, height: 0, bytes: data.length, format: 'unknown' }
  }
  const format = meta.format ?? 'unknown'
  if (format !== budget.format) problems.push(`format ${format}, expected ${budget.format}`)
  if (meta.width !== budget.width || meta.height !== budget.height) problems.push(`size ${meta.width}x${meta.height}, expected ${budget.width}x${budget.height}`)
  if (data.length > budget.hardBytes) problems.push(`${data.length} bytes exceeds the hard cap ${budget.hardBytes}`)
  if (meta.exif || meta.xmp || meta.iptc || meta.icc || meta.tifftagPhotoshop) problems.push('carries metadata (EXIF/XMP/IPTC/ICC)')
  if ((meta.pages ?? 1) > 1) problems.push('animated or multi-page')
  if (meta.space && meta.space !== 'srgb') problems.push(`colour space ${meta.space}, expected srgb`)
  if (!ALLOWED_NAME.test(filename)) problems.push(`filename "${filename}" does not match the demo naming convention`)
  if (!alt || alt.trim().length < 8) problems.push('missing or too short alt text')
  return { ok: problems.length === 0, problems, width: meta.width ?? 0, height: meta.height ?? 0, bytes: data.length, format }
}

/** Mean colour of the four corners, for padding a `contain` image with its own backdrop. */
export async function edgeColour(data: Buffer, width: number, height: number): Promise<{ r: number; g: number; b: number }> {
  const size = Math.max(4, Math.round(Math.min(width, height) * 0.01))
  const corners: Box[] = [
    { left: 0, top: 0, width: size, height: size },
    { left: width - size, top: 0, width: size, height: size },
    { left: 0, top: height - size, width: size, height: size },
    { left: width - size, top: height - size, width: size, height: size },
  ]
  let r = 0
  let g = 0
  let b = 0
  for (const corner of corners) {
    const stats = await sharp(data, SHARP_INPUT).extract(corner).stats()
    r += stats.channels[0].mean
    g += stats.channels[1].mean
    b += stats.channels[2].mean
  }
  return { r: Math.round(r / 4), g: Math.round(g / 4), b: Math.round(b / 4) }
}

/** Renders one asset from the (already oriented-readable) original bytes. */
export async function renderAsset(
  original: Buffer,
  kind: Kind,
  crop: Crop,
  mode: 'crop' | 'contain',
  label: string,
): Promise<Encoded & { width: number; height: number }> {
  const budget = BUDGETS[kind]
  const meta = await sharp(original, SHARP_INPUT).metadata()
  const swapped = (meta.orientation ?? 1) >= 5
  const width = (swapped ? meta.height : meta.width) ?? 0
  const height = (swapped ? meta.width : meta.height) ?? 0
  if (!width || !height) throw new Error(`${label}: unreadable image dimensions`)

  const aspect = budget.width / budget.height
  let build: () => Sharp
  if (mode === 'contain') {
    if (Math.max(width, height) < Math.max(budget.width, budget.height)) throw new Error(`${label}: source too small for ${budget.width}x${budget.height}`)
    const colour = await edgeColour(original, width, height)
    build = () =>
      sharp(original, SHARP_INPUT)
        .rotate()
        .resize({ width: budget.width, height: budget.height, fit: 'contain', background: { ...colour, alpha: 1 }, withoutEnlargement: false })
  } else {
    const box = cropBox(width, height, aspect, crop)
    assertNoUpscale(box, budget, label)
    build = () => sharp(original, SHARP_INPUT).rotate().extract(box).resize(budget.width, budget.height, { fit: 'cover' })
  }

  // sharp writes no EXIF/ICC unless asked (withMetadata is never called); converting to sRGB keeps colour right.
  const encoded =
    budget.format === 'jpeg'
      ? await encodeToBudget((quality) => build().toColourspace('srgb').jpeg({ quality, mozjpeg: true, progressive: true }).toBuffer(), budget)
      : await encodeToBudget((quality) => build().toColourspace('srgb').webp({ quality, effort: 6, smartSubsample: true }).toBuffer(), budget)
  return { ...encoded, width: budget.width, height: budget.height }
}

// ---- Minimal RFC 4180 CSV (the manifest has quoted fields with commas; no dependency needed) ----

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

export function serializeCsv(rows: string[][]): string {
  const cell = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
  return rows.map((r) => r.map(cell).join(',')).join('\n') + '\n'
}
