// M124 (ADR-054): the storefront shows the generated size made for its placement (collections/Media.ts
// `imageSizes`), so the framing an admin chose with the crop or focal point tool is what shoppers see.
// A file with no such size (uploaded before M124, or smaller than the size) falls back to the original.

export type MediaSizeName = 'product' | 'category' | 'hero'

type SizedMedia = {
  url?: null | string
  sizes?: null | Partial<Record<MediaSizeName, null | { url?: null | string }>>
}

/** The URL of `media` for `size`, else the original URL, else null. Safe for ids, strings and null. */
export function mediaUrl(media: unknown, size: MediaSizeName): string | null {
  if (!media || typeof media !== 'object') return null
  const { url, sizes } = media as SizedMedia
  const sized = sizes?.[size]?.url
  if (typeof sized === 'string' && sized.length > 0) return sized
  return typeof url === 'string' && url.length > 0 ? url : null
}
