import type { ReactNode } from 'react'

// Milestone 119: the one heading block for a listing page (shop, search results, a category). A plain
// h1, an optional one-line description, an optional meta line (a product count) and an optional
// `aside` (a category's round photo) on the right from `sm`. A hairline closes it, so the page reads
// as a header, a toolbar and a grid instead of a tinted banner. The breadcrumb stays the page's own.
export default function PageHeader({
  id,
  title,
  description,
  meta,
  aside,
}: {
  id?: string
  title: ReactNode
  description?: string | null
  meta?: ReactNode
  aside?: ReactNode
}) {
  return (
    <header className="mt-3 flex items-center justify-between gap-6 border-b border-line pb-5 sm:pb-6">
      <div className="min-w-0 max-w-2xl">
        <h1 id={id} className="text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl sm:tracking-tighter [overflow-wrap:anywhere]">
          {title}
        </h1>
        {description && <p className="mt-2 text-base text-ink-3">{description}</p>}
        {meta && <p className="mt-3 text-sm text-muted">{meta}</p>}
      </div>
      {aside}
    </header>
  )
}
