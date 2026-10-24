import type { ReactNode } from 'react'
import type { BadgeTone } from '@/lib/product-badges'

// M61: the small pills on cards and the product page. `off` is the "% OFF" chip, `neutral` the
// stock pill, `primary` the "Featured" pill (M69), `limited` and `sale` the optional admin labels (M69,
// shown once M70 adds them) and `success` the in-stock/COD tint. Every
// pairing keeps 4.5:1 for 11px text.
const TONES: Record<BadgeTone, string> = {
  off: 'rounded-md bg-pink-soft px-2 py-1 text-pink-dark',
  neutral: 'rounded-full bg-white px-2.5 py-1.5 text-ink-2 ring-1 ring-line',
  primary: 'rounded-full bg-primary px-2.5 py-1.5 text-white',
  success: 'rounded-full bg-success-soft px-2.5 py-1.5 text-success',
  limited: 'rounded-full bg-pink-dark px-2.5 py-1.5 text-white',
  sale: 'rounded-full bg-sale-blue px-2.5 py-1.5 text-white',
}

export type { BadgeTone }

export default function Badge({ tone, className = '', children }: { tone: BadgeTone; className?: string; children: ReactNode }) {
  return <span className={`inline-flex items-center text-[11px] font-bold leading-none ${TONES[tone]} ${className}`}>{children}</span>
}
