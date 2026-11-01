import Link from 'next/link'
import { LayoutGridIcon } from 'lucide-react'
import { getCategoriesCached } from '@/lib/payload/categories'

// M61: the header's category row (desktop). Real categories (flat since M102), in the admin's order, plus
// "All categories". It is hidden below `lg`, where the bottom tab bar and the home page's circle
// row cover the same ground. M101: pills (the active-looking "All categories" in soft violet). A failed read shows just "All categories", like the footer does.
export default async function CategoryNav() {
  const categories = await getCategoriesCached().catch(() => [])

  return (
    <nav aria-label="Categories" className="no-scrollbar mx-auto hidden max-w-[83rem] gap-1 overflow-x-auto px-6 pb-2.5 text-sm font-semibold whitespace-nowrap lg:flex">
      <Link href="/categories" className="flex min-h-11 items-center gap-2 rounded-full bg-primary-soft px-4 text-primary-dark transition hover:bg-lavender">
        <LayoutGridIcon size={16} aria-hidden="true" />
        All categories
      </Link>
      {categories.map((category) => (
        <Link key={category.id} href={`/category/${category.slug}`} className="flex min-h-11 items-center rounded-full px-4 text-ink-2 transition hover:bg-lavender hover:text-ink">
          {category.title}
        </Link>
      ))}
    </nav>
  )
}
