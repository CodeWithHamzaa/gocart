'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

// M101: a horizontally scrolling row (product rails, Featured). The row itself is the first <ul> inside
// `children`, so a server-rendered list (or FeaturedTabs' list) can be wrapped without changing it. On a
// phone the row is swiped; from `md` two round buttons scroll it by most of a screen, and each is
// disabled at its end. Every item stays in the HTML and is never hidden (e2e/golden-path.spec.ts finds a
// product by its first visible name).
export default function ScrollRail({ label, children }: { label: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  const row = useCallback(() => box.current?.querySelector('ul') ?? null, [])

  const update = useCallback(() => {
    const el = row()
    if (!el) return
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }, [row])

  useEffect(() => {
    const el = row()
    if (!el) return
    // First measurement after layout, not synchronously inside the effect.
    const frame = requestAnimationFrame(update)
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [row, update])

  const scroll = (direction: 1 | -1) => {
    const el = row()
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: reduce ? 'auto' : 'smooth' })
  }

  const button =
    'absolute top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-float-sm ring-1 ring-line transition hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-0 md:flex'

  return (
    <div ref={box} className="relative">
      {children}
      <button type="button" onClick={() => scroll(-1)} disabled={edges.start} aria-label={`Scroll ${label} back`} className={`${button} -left-3`}>
        <ChevronLeftIcon size={20} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => scroll(1)} disabled={edges.end} aria-label={`Scroll ${label} forward`} className={`${button} -right-3`}>
        <ChevronRightIcon size={20} aria-hidden="true" />
      </button>
    </div>
  )
}
