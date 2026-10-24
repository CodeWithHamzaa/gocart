import Link from 'next/link'
import { ChevronRightIcon } from 'lucide-react'

// M61: "Home / Categories / Name". The last crumb is the current page (aria-current), not a link.
export type Crumb = { label: string; href?: string }

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-1 text-[13px] text-muted">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {index > 0 && <ChevronRightIcon size={14} aria-hidden="true" className="shrink-0" />}
            {item.href ? (
              <Link href={item.href} className="inline-flex min-h-11 items-center font-medium text-ink-2 hover:text-primary">{item.label}</Link>
            ) : (
              <span aria-current="page" className="truncate font-semibold text-ink">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
