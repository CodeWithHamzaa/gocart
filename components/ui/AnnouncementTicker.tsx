'use client'

// Milestone 122: the announcement strip as a ticker (the owner asked for it on 2026-11-13, replacing the static
// strip chosen on 2026-11-10). One message is on screen at a time: it enters from the left edge, travels to
// the right and leaves completely; only then does the next message (or the same one, if there is only one)
// enter from the left. So a message is never visible twice. The movement is the `announcement-ticker`
// keyframes in app/globals.css; each finished pass advances to the next message. Motion rules: it pauses
// while the pointer is over the strip, the button stops and restarts it (WCAG 2.2.2, moving content), and
// with "reduce motion" set nothing moves and the current message sits centred. Screen readers get the full
// list once, as a hidden list; the moving copy is hidden from them.
import { BadgeCheckIcon, PauseIcon, PlayIcon, TruckIcon } from 'lucide-react'
import { useState } from 'react'

export type TickerMessage = { text: string; kind: 'delivery' | 'promise' }

export default function AnnouncementTicker({ messages }: { messages: TickerMessage[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  if (messages.length === 0) return null
  const message = messages[index % messages.length]
  const Icon = message.kind === 'delivery' ? TruckIcon : BadgeCheckIcon

  return (
    <div className="group/ticker relative flex h-10 items-center overflow-hidden">
      <ul className="sr-only">
        {messages.map((item, i) => (
          <li key={i}>{item.text}</li>
        ))}
      </ul>
      <p
        aria-hidden="true"
        onAnimationIteration={() => setIndex((value) => (value + 1) % messages.length)}
        className="announcement-ticker absolute left-0 flex items-center gap-2 whitespace-nowrap group-hover/ticker:[animation-play-state:paused] motion-reduce:static motion-reduce:mx-auto motion-reduce:max-w-full motion-reduce:px-4"
        style={paused ? { animationPlayState: 'paused' } : undefined}
      >
        <Icon size={16} strokeWidth={1.9} aria-hidden="true" className="shrink-0 text-primary" />
        <span className="motion-reduce:truncate">{message.text}</span>
      </p>
      <div className="absolute inset-y-0 right-0 flex items-center bg-linear-to-l from-surface-muted from-70% to-transparent pl-8 pr-2 motion-reduce:hidden sm:pr-4">
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-label={paused ? 'Play announcements' : 'Pause announcements'}
          className="flex size-7 items-center justify-center rounded-full text-muted transition hover:bg-line hover:text-ink"
        >
          {paused ? <PlayIcon size={13} strokeWidth={2.4} aria-hidden="true" /> : <PauseIcon size={13} strokeWidth={2.4} aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
