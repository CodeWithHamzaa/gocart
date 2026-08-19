import Link from 'next/link'

// M27a: real HTTP 404 for an unknown category slug (or a page number
// beyond the last real page) — never a silent empty grid.
export default function CategoryNotFound() {
  return (
    <div className="mx-6">
      <div className="max-w-7xl mx-auto min-h-[70vh] flex flex-col items-center justify-center text-center gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">Category not found</h1>
        <p className="text-slate-500 max-w-md">
          We couldn&apos;t find the category you&apos;re looking for. It may have moved or no longer exists.
        </p>
        <div className="flex gap-4 text-sm">
          <Link href="/categories" className="text-green-600">Browse categories</Link>
          <Link href="/shop" className="text-green-600">View all products</Link>
        </div>
      </div>
    </div>
  )
}
