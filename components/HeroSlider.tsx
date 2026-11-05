'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from 'lucide-react'
import type { HeroSlide } from '@/lib/hero-slides'

// M101: the home banner the owner chose (the "C" mockup): up to three real slides (lib/hero-slides.ts) in a
// row that is swiped on a phone, with dots, arrows from `md`, and a pause button. It moves on by itself
// every 6 s, but never while the pointer or keyboard focus is on it, while paused, while the tab is hidden,
// or for anyone who asked their device to reduce motion (WCAG 2.2.2: a pause control is always there).
// Every slide is in the HTML; the first slide's heading is the page's <h1>. Product images only (alt
// text from the media), no product names, so nothing here duplicates a product name hidden off-screen.
const TONES: Record<HeroSlide['tone'], string> = { green: 'bg-primary-soft', blue: 'bg-slide-blue', grey: 'bg-lavender' }
const BADGES: Record<HeroSlide['badgeTone'], string> = { sale: 'bg-pink text-white', ink: 'bg-ink text-white' }
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
      className="relative overflow-hidden rounded-hero"
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
              className={`grid w-full shrink-0 snap-start items-center gap-6 px-6 pb-20 pt-7 sm:px-12 sm:pt-12 lg:min-h-[440px] lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-16 lg:pb-16 ${TONES[slide.tone]}`}
            >
              <div>
                <span className={`inline-block rounded-full px-3 py-1.5 text-[13px] font-semibold ${BADGES[slide.badgeTone]}`}>{slide.badge}</span>
                <Heading className="mt-4 max-w-[560px] text-[32px] font-semibold leading-[1.06] tracking-[-0.04em] text-ink sm:text-5xl lg:text-[56px]">{slide.title}</Heading>
                <p className="mt-3 max-w-[460px] text-base leading-relaxed text-ink-2 sm:mt-4 sm:text-lg">{slide.text}</p>
                <Link href={slide.cta.href} tabIndex={i === index ? 0 : -1} className="mt-6 inline-flex min-h-12 items-center rounded-full bg-primary px-6 text-[15px] font-semibold text-white transition hover:bg-primary-dark">
                  {slide.cta.label}
                </Link>
              </div>
              <div className="grid grid-cols-[1.2fr_1fr] items-end gap-3 sm:gap-4">
                {slide.images.slice(0, 2).map((image, n) => (
                  <span key={`${image.url}-${n}`} className={`block aspect-square overflow-hidden rounded-[20px] bg-white shadow-float-sm ${n === 1 ? 'w-[86%]' : ''}`}>
                    <Image
                      src={image.url}
                      alt={image.alt}
                      width={560}
                      height={560}
                      sizes="(min-width: 1280px) 300px, (min-width: 1024px) 24vw, 46vw"
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
          <div className="absolute bottom-5 left-6 flex items-center gap-1 sm:left-12 lg:bottom-7 lg:left-16">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show slide ${i + 1} of ${slides.length}`}
                aria-current={i === index ? 'true' : undefined}
                className="flex size-6 items-center justify-center"
              >
                <span className={`block h-2 rounded-full transition-all ${i === index ? 'w-7 bg-ink' : 'w-2 bg-ink/25'}`} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Play slides' : 'Pause slides'}
              className="ml-2 flex size-8 items-center justify-center rounded-full text-ink-2 hover:bg-white/70"
            >
              {paused ? <PlayIcon size={15} aria-hidden="true" /> : <PauseIcon size={15} aria-hidden="true" />}
            </button>
          </div>
          <div className="absolute bottom-4 right-6 hidden gap-2.5 md:flex lg:bottom-6 lg:right-8">
            <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" className="flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-chip transition hover:bg-lavender">
              <ChevronLeftIcon size={20} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Next slide" className="flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-chip transition hover:bg-lavender">
              <ChevronRightIcon size={20} aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
