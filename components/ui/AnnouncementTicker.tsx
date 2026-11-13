'use client'

// Milestone 122: the announcement strip as a slow, seamless ticker (the owner asked for it on 2026-11-13,
// replacing the static strip chosen on 2026-11-10). The different messages travel together from right to
// left with space between them. One lap is never shorter than the strip itself: each copy of the list is at
// least as wide as the strip (`min-w-[100vw]`; the strip spans the page), and the track holds two copies and slides by exactly one (the
// `announcement-ticker` keyframes in app/globals.css). So the same message is never on screen twice: as much
// of it as has left on the left edge enters again on the right, with no jump. The pace follows what shop
// themes recommend for a calm, readable band (a slow lap, pause on hover): it pauses while the pointer is
// over it or the pause button has focus, the button stops and restarts it (WCAG 2.2.2, moving content), and
// with "reduce motion" set nothing moves and the messages sit side by side (the first one only on a phone).
// Screen readers get the list once; the second copy is hidden from them.
import { BadgeCheckIcon, PauseIcon, PlayIcon, TruckIcon } from 'lucide-react'
import { useState } from 'react'

export type TickerMessage = { text: string; kind: 'delivery' | 'promise' }

export default function AnnouncementTicker({ messages }: { messages: TickerMessage[] }) {
  const [paused, setPaused] = useState(false)
  if (messages.length === 0) return null

  const group = (copy: boolean) => (
    <ul aria-hidden={copy || undefined} className={`flex min-w-[100vw] shrink-0 items-center justify-around ${copy ? 'motion-reduce:hidden' : 'motion-reduce:justify-center'}`}>
      {messages.map((message, i) => {
        const Icon = message.kind === 'delivery' ? TruckIcon : BadgeCheckIcon
        return (
          <li key={i} className={`flex shrink-0 items-center gap-2 px-8 sm:px-12 ${i > 0 ? 'max-sm:motion-reduce:hidden' : ''}`}>
            <Icon size={16} strokeWidth={1.9} aria-hidden="true" className="shrink-0 text-primary" />
            <span className="whitespace-nowrap">{message.text}</span>
          </li>
        )
      })}
    </ul>
  )

  return (
    <div className="group/ticker relative flex h-10 items-center overflow-hidden">
      <div
        className="announcement-ticker flex items-center group-hover/ticker:[animation-play-state:paused] group-focus-within/ticker:[animation-play-state:paused]"
        style={paused ? { animationPlayState: 'paused' } : undefined}
      >
        {group(false)}
        {group(true)}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-linear-to-r from-surface-muted to-transparent motion-reduce:hidden" />
      <div className="absolute inset-y-0 right-0 flex items-center bg-linear-to-l from-surface-muted from-60% to-transparent pl-10 pr-2 motion-reduce:hidden sm:pr-4">
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
