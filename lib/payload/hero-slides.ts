import { getPayload } from 'payload'
import config from '@payload-config'
import { adminSlidesToHero, type AdminSlideDoc, type HeroSlide } from '../hero-slides'

// M110 (ADR-050): the admin-managed home banner slides, already mapped to the shape HeroSlider renders.
// Local API, server components only. Returns [] on any failure or when no slide is active, in which
// case the home page uses its automatic slides (lib/hero-slides.ts).
export async function getAdminHeroSlides(): Promise<HeroSlide[]> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'heroSlides',
      where: { active: { equals: true } },
      sort: ['order', 'createdAt'],
      limit: 6,
      depth: 1,
      overrideAccess: false,
    })
    return adminSlidesToHero(result.docs as unknown as AdminSlideDoc[])
  } catch (error) {
    console.error('[hero-slides] read failed:', error instanceof Error ? error.message : 'unknown error')
    return []
  }
}
