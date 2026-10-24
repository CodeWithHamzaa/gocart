import Link from 'next/link'
import { LayoutGridIcon } from 'lucide-react'
import { getTopLevelCategoriesCached } from '@/lib/payload/categories'

// M61: the header's category row (desktop). Real top-level categories, in the admin's order, plus
// "All categories". It is hidden below `lg`, where the bottom tab bar and the home page's circle
// row cover the same ground. A failed read shows just "All categories", like the footer does.
export default async function CategoryNav() {
  const categories = await getTopLevelCategoriesCached().catch(() => [])

  return (
    <nav aria-label="Categories" className="no-scrollbar mx-auto hidden max-w-7xl gap-1 overflow-x-auto px-6 pb-2.5 text-sm font-semibold whitespace-nowrap lg:flex">
      <Link href="/categories" className="flex min-h-11 items-center gap-2 rounded-control bg-primary-soft px-3.5 text-primary-dark transition hover:bg-lavender">
        <LayoutGridIcon size={16} aria-hidden="true" />
        All categories
      </Link>
      {categories.map((category) => (
        <Link key={category.id} href={`/category/${category.slug}`} className="flex min-h-11 items-center rounded-control px-3.5 text-ink-2 transition hover:text-primary">
          {category.title}
        </Link>
      ))}
    </nav>
  )
}
