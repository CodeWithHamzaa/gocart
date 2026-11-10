'use client'
import Link, { useLinkStatus } from 'next/link'
import { LoaderCircleIcon } from 'lucide-react'

// "Load more" for a listing: a real link to the next ?page=N (so it works without JavaScript and crawlers
// can follow it) that keeps the scroll position, so the new cards appear under the ones already shown.
// While the next batch is loading the button says so.
function Label() {
  const { pending } = useLinkStatus()
  return pending ? (
    <span className="inline-flex items-center gap-2" role="status">
      <LoaderCircleIcon size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
      Loading more products
    </span>
  ) : (
    <span>Load more products</span>
  )
}

export default function LoadMoreLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      className="mt-2 inline-flex min-h-12 items-center rounded-full border border-line-input bg-surface px-8 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary-dark"
    >
      <Label />
    </Link>
  )
}
