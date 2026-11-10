import Link from 'next/link'
import type { ReactNode } from 'react'

// M61: the "nothing here" panel (empty category, empty cart, no categories). The action is a real
// link; a state with no useful next step passes none.
// M101: lavender panel with no ring, a semibold heading and a pill button (owner-approved home style).
// M101: `headingLevel` 1 for a page whose only heading this is (the 404 page had no <h1>).
export default function EmptyState({ icon, title, text, action, headingLevel = 2 }: { icon: ReactNode; title: string; text?: string; action?: { href: string; label: string }; headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-panel bg-surface-muted px-6 py-14 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-white text-primary" aria-hidden="true">{icon}</span>
      <Heading className="text-xl font-semibold tracking-tight text-ink">{title}</Heading>
      {text && <p className="text-sm text-muted">{text}</p>}
      {action && (
        <Link href={action.href} className="mt-2 inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primary-dark">
          {action.label}
        </Link>
      )}
    </div>
  )
}
