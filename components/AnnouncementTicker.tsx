'use client'
import { useState } from 'react'

// M110: the announcement bar's moving line. One message crosses the bar from left to right (globals.css,
// `ticker-right`, 12 s); when it ends the next one starts, and after the last it starts again (also with a
// single message: `step` only counts up, so the animation restarts). The first message is in the
// server-rendered HTML, so crawlers and no-JS visitors still see it.
// Pausing (WCAG 2.2.2) is driven from state, not CSS, so it can always be undone:
//   - a mouse resting on the bar, or keyboard focus on it (:focus-visible), pauses it ("auto" mode);
//   - a tap, click or Enter/Space toggles: if it is paused it plays ("playing", until the pointer leaves or
//     focus goes), otherwise it pauses ("paused", until toggled again).
// With "reduce motion" the CSS removes the animation, so no animationend fires and the first message stays.
type Mode = 'auto' | 'paused' | 'playing'

export default function AnnouncementTicker({ messages }: { messages: string[] }) {
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<Mode>('auto')
  const [holding, setHolding] = useState(false)
  if (messages.length === 0) return null
  const message = messages[step % messages.length]
  const paused = mode === 'paused' || (mode === 'auto' && holding)

  const toggle = () => setMode(paused ? 'playing' : 'paused')
  const release = () => setMode((m) => (m === 'playing' ? 'auto' : m))

  return (
    <div
      className="ticker min-w-0 flex-1 overflow-hidden rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
      data-paused={paused}
      tabIndex={0}
      role="button"
      aria-pressed={paused}
      aria-label="Announcements. Press to pause or resume."
      onClick={toggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          toggle()
        }
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setHolding(true)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') {
          setHolding(false)
          release()
        }
      }}
      onFocus={(event) => {
        if (event.currentTarget.matches(':focus-visible')) setHolding(true)
      }}
      onBlur={() => {
        setHolding(false)
        release()
      }}
    >
      <p
        key={step}
        className="ticker-message inline-block whitespace-nowrap"
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setStep((s) => s + 1)
        }}
      >
        {message}
      </p>
    </div>
  )
}
