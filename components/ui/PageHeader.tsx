import type { ReactNode } from 'react'

// Milestone 119: the one heading block for a listing page (shop, search results, a category). A plain
// h1, an optional one-line description, an optional meta line (a product count) and an optional
// `aside` (a category's round photo) on the right from `sm`. A hairline closes it, so the page reads
// as a header, a toolbar and a grid instead of a tinted banner. The breadcrumb stays the page's own.
// `banner` (the category page): from `lg` (desktop) the header is the earlier lavender panel again, with
// a large title and the photo in a white circle, at the owner's request after review; the count is then
// said by the page under the filters, as before, so the meta line is hidden there.
export default function PageHeader({
  id,
  title,
  description,
  meta,
  aside,
  banner = false,
}: {
  id?: string
  title: ReactNode
  description?: string | null
  meta?: ReactNode
  aside?: ReactNode
  banner?: boolean
}) {
  return (
    <header className={`mt-3 flex items-center justify-between gap-6 border-b border-line pb-5 sm:pb-6 ${banner ? 'lg:relative lg:overflow-hidden lg:rounded-panel lg:border lg:bg-linear-to-br lg:from-accent-soft lg:via-accent-soft/50 lg:to-surface lg:px-10 lg:py-10' : ''}`}>
      <div className="min-w-0 max-w-2xl">
        <h1 id={id} className={`text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl sm:tracking-tighter [overflow-wrap:anywhere] ${banner ? 'lg:text-5xl' : ''}`}>
          {title}
        </h1>
        {description && <p className="mt-2 text-base text-ink-3">{description}</p>}
        {meta && <p className={`mt-3 text-sm text-muted ${banner ? 'lg:hidden' : ''}`}>{meta}</p>}
      </div>
      {aside}
    </header>
  )
}
