'use client'

// Milestone 122: the announcement strip as a continuous ticker (the owner asked for it on 2026-11-13, replacing
// the static strip chosen on 2026-11-10). The messages travel right to left in an endless loop: the list is
// drawn twice and the track slides by exactly one copy (the `announcement-ticker` keyframes in
// app/globals.css), so the loop has no seam. Motion rules: it pauses while the pointer is over it or the
// pause button has keyboard focus, the button stops and restarts it (WCAG 2.2.2, moving content), and with
// "reduce motion" set it does not move at all and shows the messages side by side (the first one only on a phone). Screen readers get the
// list once; the second copy is hidden from them.
import { BadgeCheckIcon, PauseIcon, PlayIcon, TruckIcon } from 'lucide-react'
import { useState } from 'react'

export type TickerMessage = { text: string; kind: 'delivery' | 'promise' }

// Enough repeats that one copy is wider than a large desktop, whatever the number of messages.
const MIN_ITEMS = 8

export default function AnnouncementTicker({ messages }: { messages: TickerMessage[] }) {
  const [paused, setPaused] = useState(false)
  if (messages.length === 0) return null
  const repeats = Math.ceil(MIN_ITEMS / messages.length)
  const copy = Array.from({ length: repeats }, () => messages).flat()

  const group = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className={`flex shrink-0 items-center ${hidden ? 'motion-reduce:hidden' : 'motion-reduce:w-full motion-reduce:justify-center motion-reduce:overflow-hidden'}`}>
      {copy.map((message, i) => {
        const Icon = message.kind === 'delivery' ? TruckIcon : BadgeCheckIcon
        // Screen readers and reduced-motion visitors need each message once, not every repeat.
        const repeat = i >= messages.length
        return (
          <li key={i} aria-hidden={repeat || undefined} className={`flex shrink-0 items-center gap-2 px-6 sm:px-9 ${repeat ? 'motion-reduce:hidden' : i > 0 ? 'max-sm:motion-reduce:hidden' : ''}`}>
            <Icon size={16} strokeWidth={1.9} aria-hidden="true" className="shrink-0 text-primary" />
            <span className="whitespace-nowrap">{message.text}</span>
          </li>
        )
      })}
    </ul>
  )

  return (
    <div className="group/ticker relative flex min-h-10 items-center overflow-hidden">
      <div
        className="announcement-ticker flex w-max items-center py-2 group-hover/ticker:[animation-play-state:paused] group-focus-within/ticker:[animation-play-state:paused] motion-reduce:w-full"
        style={paused ? { animationPlayState: 'paused' } : undefined}
      >
        {group(false)}
        {group(true)}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-surface-muted to-transparent motion-reduce:hidden" />
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
