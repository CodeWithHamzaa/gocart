import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { getTopLevelCategories } from '@/lib/payload/categories'

// M27b: a browsable index of the whole catalog structure — every top-level
// category with its children — the single entry point into category
// browsing. Per docs/CATEGORY_REQUIREMENTS.md and ADR-007. `.tsx`, per M2a.

// Same static-by-default reasoning as M27a: the catalog structure changes
// infrequently, and this route has no per-slug notFound() path, so it
// doesn't hit the loading.tsx/Suspense status-code conflict documented
// there — a loading.tsx skeleton is safe here.
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Browse every product category at gocart.',
}

export default async function CategoriesPage() {
  const categories = await getTopLevelCategories()

  return (
    <div className="mx-6">
      <div className="max-w-7xl mx-auto min-h-[70vh]">
        <div className="text-gray-600 text-sm mt-8 mb-5">
          <Link href="/">Home</Link> / Categories
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 mb-8">Categories</h1>

        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {categories.map((category) => {
              const image = category.image
              const imageUrl = typeof image === 'object' && image ? image.url : null

              return (
                <div key={category.id} className="bg-slate-50 rounded-2xl p-6 flex flex-col gap-3">
                  <Link href={`/category/${category.slug}`} className="flex flex-col gap-3 group">
                    {imageUrl && (
                      <div className="bg-white h-32 rounded-lg flex items-center justify-center overflow-hidden">
                        <Image
                          src={imageUrl}
                          alt={typeof image === 'object' && image?.alt ? image.alt : category.title}
                          width={200}
                          height={200}
                          className="max-h-28 w-auto group-hover:scale-105 transition duration-300"
                        />
                      </div>
                    )}
                    <h2 className="text-lg font-semibold text-slate-800 group-hover:text-green-600 transition">
                      {category.title}
                    </h2>
                    {category.description && (
                      <p className="text-sm text-slate-500 line-clamp-2">{category.description}</p>
                    )}
                  </Link>

                  {category.children.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {category.children.map((child) => (
                        <Link
                          key={child.id}
                          href={`/category/${child.slug}`}
                          className="px-3 py-1 bg-white rounded-full text-xs text-slate-600 hover:bg-slate-600 hover:text-white transition-all"
                        >
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-24 text-slate-500">
            <p>No categories yet.</p>
            <Link href="/shop" className="text-green-600 text-sm">View all products</Link>
          </div>
        )}
      </div>
    </div>
  )
}
