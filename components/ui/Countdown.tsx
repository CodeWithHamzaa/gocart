'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// M91 (ADR-041): a real countdown to the earliest `dealEndsAt` on the home page. Nothing is drawn
// until mounted (the server cannot know the viewer's clock, and a guess would mismatch hydration).
// When it reaches zero the page is refreshed so the ended deals drop out of the server render.
const pad = (n: number) => String(n).padStart(2, '0')
// M118: a live clock only in the last 48 hours. A deal ending weeks away read "Ends in 1158 : 32 : 18",
// which is false urgency; until then it simply says the date it ends ("Ends 30 Dec"). The chips are
// neutral (ink on the neutral well): the sale colour is for the discount itself (ADR-052).
const LIVE_SECONDS = 48 * 3600
const dateLabel = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export default function Countdown({ endsAt }: { endsAt: string }) {
  const router = useRouter()
  const end = new Date(endsAt).getTime()
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining === 0) router.refresh()
      return remaining
    }
    if (tick() === 0) return
    const timer = setInterval(() => { if (tick() === 0) clearInterval(timer) }, 1000)
    return () => clearInterval(timer)
  }, [end, router])

  if (left === null) return null

  if (left > LIVE_SECONDS) {
    return <p className="text-sm font-medium text-muted">Ends {dateLabel(end)}</p>
  }

  const parts = [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60]
  return (
    <div role="timer" aria-label={`Ends in ${parts[0]} hours ${parts[1]} minutes ${parts[2]} seconds`} className="flex items-center gap-1.5">
      <span className="mr-1 text-sm font-medium text-muted">Ends in</span>
      {parts.map((n, i) => (
        <span key={i} className="flex items-center gap-1.5" aria-hidden="true">
          {i > 0 && <span className="font-bold text-muted">:</span>}
          <span className="min-w-[38px] rounded-tile bg-surface-muted px-1 py-1.5 text-center text-base font-bold tabular-nums text-ink">{pad(n)}</span>
        </span>
      ))}
    </div>
  )
}
