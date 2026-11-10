'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from 'lucide-react'
import type { HeroSlide } from '@/lib/hero-slides'

// M101: the home banner the owner chose (the "C" mockup): up to three real slides (lib/hero-slides.ts) in a
// row that is swiped on a phone, with dots, arrows from `md` and a pause button, grouped bottom-left so they
// never sit on the product photos. It moves on by itself
// every 6 s, but never while the pointer or keyboard focus is on it, while paused, while the tab is hidden,
// or for anyone who asked their device to reduce motion (WCAG 2.2.2: a pause control is always there).
// Every slide is in the HTML; the first slide's heading is the page's <h1>. Product images only (alt
// text from the media), no product names, so nothing here duplicates a product name hidden off-screen.
// Premium banner: a soft violet wash fading into white, with a hairline. Each tone shifts the wash a little
// so consecutive slides are distinguishable without leaving the neutral palette.
const TONES: Record<HeroSlide['tone'], string> = {
  green: 'bg-linear-to-br from-accent-soft via-accent-soft/60 to-surface',
  blue: 'bg-linear-to-bl from-accent-soft via-accent-soft/50 to-surface',
  grey: 'bg-linear-to-br from-surface-muted via-surface-muted/70 to-surface',
}
const BADGES: Record<HeroSlide['badgeTone'], string> = { sale: 'text-sale', ink: 'text-primary-dark' }
const DOTS: Record<HeroSlide['badgeTone'], string> = { sale: 'bg-sale-strong', ink: 'bg-primary' }
const INTERVAL_MS = 6000

export default function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const track = useRef<HTMLUListElement>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [holding, setHolding] = useState(false)

  const go = useCallback((next: number) => {
    const el = track.current
    if (!el) return
    const count = el.children.length
    const target = ((next % count) + count) % count
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: target * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' })
  }, [])

  useEffect(() => {
    const el = track.current
    if (!el) return
    const onScroll = () => setIndex(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (paused || holding || slides.length < 2) return
    const timer = setInterval(() => {
      if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      go(index + 1)
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [paused, holding, index, go, slides.length])

  if (slides.length === 0) return null

  return (
    <div
      className="relative overflow-hidden rounded-hero border border-line"
      role="region"
      aria-roledescription="carousel"
      aria-label="Highlights"
      onMouseEnter={() => setHolding(true)}
      onMouseLeave={() => setHolding(false)}
      onFocus={() => setHolding(true)}
      onBlur={() => setHolding(false)}
      onTouchStart={() => setHolding(true)}
    >
      <ul ref={track} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
        {slides.map((slide, i) => {
          const Heading = i === 0 ? 'h1' : 'h2'
          return (
            <li
              key={slide.id}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
              className={`grid w-full shrink-0 snap-start items-center gap-5 px-5 pb-14 pt-5 sm:gap-8 sm:px-12 sm:pb-20 sm:pt-12 lg:min-h-[460px] lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:px-16 lg:pb-16 lg:pt-14 ${TONES[slide.tone]}`}
            >
              <div className="min-w-0">
                <span className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-eyebrow ${BADGES[slide.badgeTone]}`}>
                  <span aria-hidden="true" className={`size-1.5 rounded-full ${DOTS[slide.badgeTone]}`} />
                  {slide.badge}
                </span>
                <Heading className="mt-2.5 max-w-[560px] text-3xl font-semibold tracking-tight text-ink sm:mt-4 sm:text-5xl sm:tracking-tighter">{slide.title}</Heading>
                <p className="mt-2 max-w-[460px] text-base text-ink-2 sm:mt-4 sm:text-lg">{slide.text}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 sm:mt-8">
                  <Link href={slide.cta.href} tabIndex={i === index ? 0 : -1} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-white shadow-float-sm transition hover:bg-primary-dark sm:min-h-12 sm:px-7">
                    {slide.cta.label}
                    <ArrowRightIcon size={18} aria-hidden="true" />
                  </Link>
                  {slide.cta.href !== '/shop' && (
                    <Link href="/shop" tabIndex={i === index ? 0 : -1} className="hidden min-h-11 items-center text-base font-semibold text-ink underline-offset-4 hover:underline sm:inline-flex">
                      Shop everything
                    </Link>
                  )}
                </div>
              </div>
              {/* Phone: two squares capped at 112px so the slide stays short. From `lg`: a large product
                  photo with a smaller one overlapping its lower-left corner. */}
              <div className="relative flex h-28 items-end gap-3 sm:h-44 lg:block lg:h-auto lg:pb-6 lg:pl-10">
                {slide.images.slice(0, 2).map((image, n) => (
                  <span
                    key={`${image.url}-${n}`}
                    className={`block aspect-square h-full shrink-0 overflow-hidden rounded-tile bg-surface shadow-float-sm lg:h-auto lg:rounded-panel ${n === 0 ? 'lg:ml-auto lg:w-[78%] lg:shadow-float' : 'lg:absolute lg:bottom-0 lg:left-0 lg:w-[40%] lg:ring-8 lg:ring-surface'}`}
                  >
                    <Image
                      src={image.url}
                      alt={image.alt}
                      width={560}
                      height={560}
                      sizes={n === 0 ? '(min-width: 1280px) 400px, (min-width: 1024px) 32vw, 176px' : '(min-width: 1280px) 210px, (min-width: 1024px) 16vw, 176px'}
                      priority={i === 0}
                      fetchPriority={i === 0 && n === 0 ? 'high' : undefined}
                      className="size-full object-cover"
                    />
                  </span>
                ))}
              </div>
            </li>
          )
        })}
      </ul>

      {slides.length > 1 && (
        <>
          <div className="absolute bottom-3 left-4 flex items-center gap-1 sm:bottom-5 sm:left-11 lg:bottom-7 lg:left-[3.75rem]">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show slide ${i + 1} of ${slides.length}`}
                aria-current={i === index ? 'true' : undefined}
                className="flex size-6 items-center justify-center"
              >
                <span className={`block h-2 rounded-full transition-all ${i === index ? 'w-7 bg-ink' : 'w-2 bg-ink/50'}`} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Play slides' : 'Pause slides'}
              className="ml-2 flex size-8 items-center justify-center rounded-full text-ink-2 hover:bg-surface/70"
            >
              {paused ? <PlayIcon size={15} aria-hidden="true" /> : <PauseIcon size={15} aria-hidden="true" />}
            </button>
            <span className="ml-3 hidden gap-2 md:flex">
              <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" className="flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-chip transition hover:bg-surface-muted">
                <ChevronLeftIcon size={20} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => go(index + 1)} aria-label="Next slide" className="flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-chip transition hover:bg-surface-muted">
                <ChevronRightIcon size={20} aria-hidden="true" />
              </button>
            </span>
          </div>
        </>
      )}
    </div>
  )
}
