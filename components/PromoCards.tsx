import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'
import type { PromoCard, PromoTone } from '@/lib/payload/promo-cards'

// M71 (ADR-039): the home page's promo cards, from admin data only. Server component; renders
// nothing when there are no active cards. Each card is one link.
const TONES: Record<PromoTone, { card: string; text: string }> = {
  pink: { card: 'bg-tint-pink', text: 'text-tint-pink-link' },
  blue: { card: 'bg-tint-blue', text: 'text-tint-blue-link' },
  lavender: { card: 'bg-tint-lavender', text: 'text-tint-lavender-link' },
  mint: { card: 'bg-tint-mint', text: 'text-tint-mint-link' },
}

export default function PromoCards({ cards = [] }: { cards?: PromoCard[] }) {
  if (cards.length === 0) return null
  return (
    <section aria-label="Promotions" className="mx-4 sm:mx-6 mt-12 sm:mt-14">
      <div className="max-w-7xl mx-auto grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const tone = TONES[card.tone] ?? TONES.lavender
          const image = typeof card.image === 'object' && card.image ? card.image : null
          const imageUrl = image?.url ?? null
          return (
            <Link
              key={card.id}
              href={card.link}
              className={`relative flex min-h-[180px] sm:min-h-[220px] flex-col justify-center gap-2 overflow-hidden rounded-3xl p-6 sm:p-8 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${imageUrl ? 'sm:pr-48' : ''} ${tone.card}`}
            >
              {imageUrl && (
                <div aria-hidden="true" className="absolute right-6 top-1/2 hidden size-32 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-white sm:flex sm:size-40">
                  <Image src={imageUrl} alt="" width={160} height={160} className="size-full object-contain" sizes="160px" />
                </div>
              )}
              {card.eyebrow && <span className={`relative text-[13px] font-bold ${tone.text}`}>{card.eyebrow}</span>}
              <span className={`relative ${imageUrl ? 'max-w-[280px] break-words' : 'max-w-[28rem]'} text-[26px] sm:text-3xl font-extrabold leading-tight tracking-tight`}>{card.title}</span>
              <span className={`relative inline-flex min-h-11 items-center gap-1 text-sm font-bold ${tone.text}`}>
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
