import { getPayload } from 'payload'
import config from '@payload-config'

// M55a: server-side reader for the Settings global (M13a), same pattern as
// lib/payload/products.ts and categories.ts — Local API, in-process, for Server
// Components, Route Handlers and Server Actions only. Never import this from a
// 'use client' component. Only fields the storefront may show publicly are returned
// (Settings is public-read anyway, M13a). Hand-written type mirrors globals/Settings.ts.

export type StoreSettings = {
  storeName: string
  contactPhone: string | null
  contactEmail: string | null
  contactAddress: string | null
  shippingFlatRate: number | null
  freeShippingThreshold: number | null
}

const EMPTY: StoreSettings = {
  storeName: 'GoCart',
  contactPhone: null,
  contactEmail: null,
  contactAddress: null,
  shippingFlatRate: null,
  freeShippingThreshold: null,
}

const text = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null
const money = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null

/**
 * Never throws: a failed read degrades to "no contact details / no shipping claim"
 * (callers render nothing for a null) rather than breaking every page that has a
 * footer. A missing value is hidden, never replaced with a made-up one.
 */
export async function getSettings(): Promise<StoreSettings> {
  try {
    const payload = await getPayload({ config })
    const s = (await payload.findGlobal({ slug: 'settings', depth: 0 })) as unknown as Record<string, unknown>
    return {
      storeName: text(s?.storeName) ?? EMPTY.storeName,
      contactPhone: text(s?.contactPhone),
      contactEmail: text(s?.contactEmail),
      contactAddress: text(s?.contactAddress),
      shippingFlatRate: money(s?.shippingFlatRate),
      freeShippingThreshold: money(s?.freeShippingThreshold),
    }
  } catch (error) {
    console.error('getSettings failed', error instanceof Error ? error.message : 'unknown error')
    return EMPTY
  }
}
