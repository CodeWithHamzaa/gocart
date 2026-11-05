import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { DEFAULT_CONTENT, normaliseContent, type StorefrontContent } from '../storefront-content'

// M110 (ADR-050): server-side reader for the StorefrontContent global. Local API, server components
// only (never import from a 'use client' file). Never throws: a failed read (for example a database
// that has not been migrated yet) returns the previous wording, so no page breaks because of it.
async function readContent(): Promise<StorefrontContent> {
  try {
    const payload = await getPayload({ config })
    const raw = await payload.findGlobal({ slug: 'storefrontContent', depth: 0 })
    return normaliseContent(raw)
  } catch (error) {
    console.error('[storefront-content] read failed:', error instanceof Error ? error.message : 'unknown error')
    return DEFAULT_CONTENT
  }
}

/** Memoised for one server request: the bar, footer and home page share one query. */
export const getStorefrontContent = cache(readContent)
