'use client'
import { useEffect, useState } from 'react'

// The announcement bar's messages. One message stands still and is fully readable; every 5 s it cross-fades
// to the next (opacity only, no movement), and after the last it starts again. Fully automatic, with no
// control, as the owner chose (2026-11-10). It holds while a mouse rests on the bar, while the tab is hidden
// and, for anyone who asked their device to reduce motion, it never rotates: the first message stays.
// Every message is in the server-rendered HTML, stacked in one grid cell so the bar keeps the height of the
// longest one and never jumps; the hidden ones are `invisible` (visibility switches after the fade), so
// assistive technology reads only the message on screen, as plain text.
const INTERVAL_MS = 5000

export default function AnnouncementTicker({ messages }: { messages: string[] }) {
  const [step, setStep] = useState(0)
  const [holding, setHolding] = useState(false)

  useEffect(() => {
    if (messages.length < 2 || holding) return
    const timer = setInterval(() => {
      if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      setStep((s) => s + 1)
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [messages.length, holding])

  if (messages.length === 0) return null
  const current = step % messages.length

  return (
    <div
      className="grid min-w-0 flex-1"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setHolding(true)
      }}
      onPointerLeave={() => setHolding(false)}
    >
      {messages.map((message, i) => (
        <p
          key={`${i}-${message}`}
          className={`col-start-1 row-start-1 text-center transition-[opacity,visibility] duration-500 ease-out motion-reduce:transition-none sm:text-left ${i === current ? 'visible opacity-100' : 'invisible opacity-0'}`}
        >
          {message}
        </p>
      ))}
    </div>
  )
}
