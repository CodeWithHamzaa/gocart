import Link from 'next/link'
import type { ReactNode } from 'react'

// M61: the "nothing here" panel (empty category, empty cart, no categories). The action is a real
// link; a state with no useful next step passes none.
export default function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: { href: string; label: string } }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-panel bg-white px-6 py-14 text-center ring-1 ring-line">
      <span className="flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary" aria-hidden="true">{icon}</span>
      <h2 className="text-xl font-extrabold tracking-tight text-ink">{title}</h2>
      {text && <p className="text-sm text-muted">{text}</p>}
      {action && (
        <Link href={action.href} className="mt-2 inline-flex min-h-11 items-center rounded-control bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary-dark">
          {action.label}
        </Link>
      )}
    </div>
  )
}
