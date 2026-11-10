import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'
import type { PromoCard, PromoTone } from '@/lib/payload/promo-cards'

// M71 (ADR-039): the home page's promo cards, from admin data only. Server component; renders
// nothing when there are no active cards. Each card is one link.
// The admin's tone picks one of two treatments in the neutral palette: a soft violet wash or a quiet grey
// well; text is ink and the call to action primary-dark on both (6.4:1 or more).
const TONES: Record<PromoTone, { card: string; text: string }> = {
  pink: { card: 'bg-linear-to-br from-accent-soft to-surface', text: 'text-primary-dark' },
  blue: { card: 'bg-linear-to-br from-surface-muted to-surface', text: 'text-primary-dark' },
  lavender: { card: 'bg-linear-to-br from-accent-soft to-surface', text: 'text-primary-dark' },
  mint: { card: 'bg-linear-to-br from-surface-muted to-surface', text: 'text-primary-dark' },
}

export default function PromoCards({ cards = [] }: { cards?: PromoCard[] }) {
  if (cards.length === 0) return null
  return (
    <section aria-label="Promotions" className="mx-4 mt-16 sm:mx-6 lg:mt-24">
      <div className="max-w-7xl mx-auto grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const tone = TONES[card.tone] ?? TONES.lavender
          const image = typeof card.image === 'object' && card.image ? card.image : null
          const imageUrl = image?.url ?? null
          return (
            <Link
              key={card.id}
              href={card.link}
              className={`relative flex min-h-[180px] sm:min-h-[220px] flex-col justify-center gap-2 overflow-hidden rounded-panel border border-line p-6 sm:p-8 text-ink transition-colors hover:border-line-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${imageUrl ? 'sm:pr-48' : ''} ${tone.card}`}
            >
              {imageUrl && (
                <div aria-hidden="true" className="absolute right-6 top-1/2 hidden size-32 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-surface shadow-float-sm sm:flex sm:size-40">
                  <Image src={imageUrl} alt="" width={160} height={160} className="size-full object-contain" sizes="160px" />
                </div>
              )}
              {card.eyebrow && <span className={`relative text-xs font-semibold uppercase tracking-eyebrow ${tone.text}`}>{card.eyebrow}</span>}
              <span className={`relative ${imageUrl ? 'max-w-[280px] break-words' : 'max-w-[28rem]'} text-2xl font-semibold tracking-tight sm:text-3xl`}>{card.title}</span>
              <span className={`relative inline-flex min-h-11 items-center gap-1 text-sm font-semibold ${tone.text}`}>
                {card.ctaText}
                <ArrowRightIcon size={16} aria-hidden="true" />
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
