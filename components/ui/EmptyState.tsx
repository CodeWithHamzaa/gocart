import Link from 'next/link'
import type { ReactNode } from 'react'

// M60: the shared empty state (cart, wishlist, search, category). A white panel with a hairline; one
// primary action and, optionally, a quieter second one. `wide` gives a page-level empty state (the cart)
// more presence than an inline one.
export default function EmptyState({ icon, title, text, action, secondaryAction, wide = false, headingLevel = 2 }: { icon: ReactNode; title: string; text?: string; action?: { href: string; label: string }; secondaryAction?: { href: string; label: string }; wide?: boolean; headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <div className={`mx-auto flex w-full flex-col items-center gap-3 rounded-panel border border-line bg-surface px-6 text-center ${wide ? 'max-w-xl py-16 sm:py-20' : 'max-w-md py-14'}`}>
      <span className="flex size-16 items-center justify-center rounded-full bg-accent-soft text-primary" aria-hidden="true">{icon}</span>
      <Heading className="text-2xl font-semibold tracking-tight text-ink">{title}</Heading>
      {text && <p className="max-w-sm text-sm text-muted sm:text-base">{text}</p>}
      {(action || secondaryAction) && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Link href={action.href} className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primary-dark">
              {action.label}
            </Link>
          )}
          {secondaryAction && (
            <Link href={secondaryAction.href} className="inline-flex min-h-11 items-center rounded-full border border-line-2 px-6 text-sm font-semibold text-ink transition hover:bg-surface-muted">
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
