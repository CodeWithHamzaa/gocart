import type { ReactNode } from 'react'
import type { BadgeTone } from '@/lib/product-badges'

// M61: the small pills on cards and the product page. `off` is the "% OFF" chip, `neutral` the
// stock pill, `primary` the "Featured" pill (M69), `limited` and `sale` the optional admin labels (M69,
// shown once M70 adds them) and `success` the in-stock/COD tint. Every
// pairing keeps 4.5:1 for 11px text.
// M101: rounded labels in the Mirza palette: "New" in the brand colour, "Sale" and the discount in the
// sale colour, "Limited edition" in amber with dark text, "Out of stock" quiet. Colours are tokens.
// M111: colour and shape are split so the listing card can float the same tones as square-cornered
// tags on its photo (`shape="tag"`); every other caller keeps the M101 pill.
const COLORS: Record<BadgeTone, string> = {
  off: 'bg-sale-soft text-sale',
  neutral: 'bg-surface text-ink-2 ring-1 ring-line-2',
  primary: 'bg-primary text-white',
  success: 'bg-success-soft text-success',
  limited: 'bg-amber text-ink',
  sale: 'bg-sale-strong text-white',
}

const PILL: Record<BadgeTone, string> = {
  off: 'rounded-full px-2 py-1 text-xs font-semibold',
  neutral: 'rounded-full px-2.5 py-1.5 text-xs font-semibold',
  primary: 'rounded-full px-2.5 py-1.5 text-xs font-semibold',
  success: 'rounded-full px-2.5 py-1.5 text-xs font-semibold',
  limited: 'rounded-full px-2.5 py-1.5 text-xs font-semibold',
  sale: 'rounded-full px-2.5 py-1.5 text-xs font-semibold',
}

const TAG = 'rounded-full px-2.5 py-1 text-xs font-semibold leading-tight'

export type { BadgeTone }

export default function Badge({ tone, shape = 'pill', className = '', children }: { tone: BadgeTone; shape?: 'pill' | 'tag'; className?: string; children: ReactNode }) {
  const form = shape === 'tag' ? TAG : `leading-none ${PILL[tone]}`
  return <span className={`inline-flex items-center ${COLORS[tone]} ${form} ${className}`}>{children}</span>
}
