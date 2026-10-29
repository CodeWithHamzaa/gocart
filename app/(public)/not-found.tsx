import Link from 'next/link'
import { CompassIcon } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'

// M98: the store's own 404, inside the header and footer, for unknown URLs (the [...missing]
// catch-all) and for any page in this tree that calls notFound() without its own not-found file.
export const metadata = { title: 'Page not found', robots: { index: false } }

export default function NotFound() {
  return (
    <div className="mx-4 sm:mx-6">
      <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center gap-4 py-10">
        <EmptyState
          icon={<CompassIcon size={28} />}
          title="Page not found"
          text="This page doesn't exist or has moved. Try searching, or start from the shop."
          action={{ href: '/shop', label: 'Browse all products' }}
        />
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">Back to home</Link>
      </div>
    </div>
  )
}
