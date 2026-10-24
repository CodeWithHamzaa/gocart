import { getPayload } from 'payload'
import config from '@payload-config'
import type { Media } from './categories'

// M71 (ADR-039): active home-page promo cards. Local API, server components only; a client
// component must not import this file. Types are hand-written like the other readers.

export type PromoTone = 'pink' | 'blue' | 'lavender' | 'mint'

export type PromoCard = {
  id: number | string
  title: string
  eyebrow?: null | string
  ctaText: string
  link: string
  tone: PromoTone
  image?: Media | null | number | string
  order?: null | number
  active?: boolean | null
}

/** Active cards in admin order. Returns [] on any failure so the home page still renders. */
export async function getPromoCards(): Promise<PromoCard[]> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'promoCards',
      where: { active: { equals: true } },
      sort: ['order', 'createdAt'],
      limit: 4,
      depth: 1,
      overrideAccess: false,
    })
    return result.docs as unknown as PromoCard[]
  } catch (error) {
    console.error('[promo-cards] read failed:', (error as Error).message)
    return []
  }
}
