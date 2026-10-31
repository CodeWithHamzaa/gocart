import type { ReactNode } from 'react'
import type { BadgeTone } from '@/lib/product-badges'

// M61: the small pills on cards and the product page. `off` is the "% OFF" chip, `neutral` the
// stock pill, `primary` the "Featured" pill (M69), `limited` and `sale` the optional admin labels (M69,
// shown once M70 adds them) and `success` the in-stock/COD tint. Every
// pairing keeps 4.5:1 for 11px text.
const TONES: Record<BadgeTone, string> = {
  // M101: square-cornered labels in the Mirza palette (was rounded pills in violet, pink and blue).
  off: 'rounded-[4px] bg-pink-soft px-1.5 py-1 text-pink-dark',
  neutral: 'rounded-[4px] bg-white px-2 py-1.5 text-ink-2 ring-1 ring-line-2',
  primary: 'rounded-[4px] bg-ink px-2 py-1.5 text-white',
  success: 'rounded-[4px] bg-success-soft px-2 py-1.5 text-success',
  limited: 'rounded-[4px] bg-pink-dark px-2 py-1.5 text-white',
  sale: 'rounded-[4px] bg-pink px-2 py-1.5 text-white',
}

export type { BadgeTone }

export default function Badge({ tone, className = '', children }: { tone: BadgeTone; className?: string; children: ReactNode }) {
  return <span className={`inline-flex items-center text-[11px] font-semibold leading-none tracking-[0.01em] ${TONES[tone]} ${className}`}>{children}</span>
}
