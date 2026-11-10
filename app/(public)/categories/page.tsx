import { ShapesIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { getCategoriesCached } from '@/lib/payload/categories'
import Breadcrumb from '@/components/ui/Breadcrumb'
import CategoryTile from '@/components/ui/CategoryTile'
import EmptyState from '@/components/ui/EmptyState'
import { getSettings } from '@/lib/payload/settings'
import { pageMetadata, shareImages } from '@/lib/seo'

// M27b: a browsable index of the whole catalog structure — every top-level
// category with its children — the single entry point into category
// browsing. Per docs/CATEGORY_REQUIREMENTS.md and ADR-007. `.tsx`, per M2a.

// This route has no per-slug notFound() path, so it doesn't hit the
// loading.tsx/Suspense status-code conflict documented in M27a — a loading.tsx
// skeleton is safe here.
//
// M49: rendered per request, no longer static with `revalidate = 3600` (M27b). A static page is
// prerendered at build time, and the production image is built without a database: it would
// either fail the build or bake an *empty* categories page that stays live for the first hour
// after every deploy, and a data failure must never look like "no categories". One cheap
// query per request is the safe trade; revisit with on-demand revalidation (ADR-030).
export const dynamic = 'force-dynamic'

// M63: redesigned. Each top-level category is a white card holding a large pastel circle (its own
// image when an admin uploaded one, else a tinted icon) with its child categories as pills beneath,
// as docs/CATEGORY_REQUIREMENTS.md asks (the design's circles carry no children; the spec wins).
//
// M101: the home page's category tiles (CategoryTile): lavender cards, no ring or shadow. Two columns on
// a phone, three from `sm`, four from `lg`, five from `xl`. M102 (ADR-048): categories are flat, so no child pills.
//
// M41: built with pageMetadata() so the canonical and Open Graph fields follow the same
// conventions as every other route.
export async function generateMetadata(): Promise<Metadata> {
  const [{ storeName }, categories] = await Promise.all([getSettings(), getCategoriesCached()])
  return pageMetadata({
    storeName,
    title: 'Categories',
    description: `Browse every product category at ${storeName}.`,
    path: '/categories',
    // M107: the first category photo (in display order) is the share image.
    images: shareImages(...categories.map((category) => category.image)),
  })
}

export default async function CategoriesPage() {
  const categories = await getCategoriesCached()

  return (
    <div className="mx-4 sm:mx-6">
      <div className="mx-auto min-h-[70vh] max-w-7xl pb-16">
        <div className="mt-2 sm:mt-4">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Categories' }]} />
        </div>

        <h1 className="mb-6 mt-2 text-3xl font-semibold leading-tight tracking-tighter text-ink sm:mb-8 sm:text-4xl">Categories</h1>

        {categories.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            {categories.map((category) => (
              <li key={category.id}>
                <CategoryTile category={category} variant="circle" />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<ShapesIcon size={28} />} title="No categories yet" text="Check back soon, or browse every product." action={{ href: '/shop', label: 'View all products' }} />
        )}
      </div>
    </div>
  )
}
