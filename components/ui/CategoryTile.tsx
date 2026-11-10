import Image from 'next/image'
import Link from 'next/link'
import { CategoryIcon } from '@/lib/category-style'

// M61: the categories page's large category circle (M101 moved the home page's tile variant to a
// home-page component, since removed by M102; `variant` stays 'circle' so callers read the same). A server
// component; child links sit beside the main link rather than inside it (a link cannot contain a link). A category's own image is used when an admin uploaded one;
// otherwise a tinted icon stands in.
// M101 (owner-approved home style): the circle became the home page's category tile. A lavender card
// with the name as a semibold heading-sized link stretched over the card and the image on a white tile.
// M102 (ADR-048): no child links (categories are flat), so the tile is just the name and the image at
// the bottom, the same at every width; the grid (two columns on a phone) does the rest.
type TileCategory = { slug: string; title: string; image?: { url?: string | null } | number | string | null }

export default function CategoryTile({ category, className = '' }: { category: TileCategory; index?: number; variant: 'circle'; className?: string }) {
  const image = typeof category.image === 'object' && category.image ? category.image.url : null
  const href = `/category/${category.slug}`

  return (
    <div className={`group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface px-4 pt-4 transition-colors hover:border-line-3 focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-primary sm:px-6 sm:pt-6 ${className}`}>
      <Link href={href} className="text-base font-semibold leading-tight text-ink outline-none after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4 sm:text-xl sm:tracking-tight">
        {category.title}
      </Link>
      <span aria-hidden="true" className="mt-auto block pt-4 sm:pt-5">
        <span className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-t-tile bg-surface-muted text-ink-3">
          {image ? (
            <Image src={image} alt="" width={480} height={360} sizes="(min-width: 1280px) 220px, (min-width: 1024px) 20vw, (min-width: 640px) 45vw, 45vw" className="size-full object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
          ) : (
            <CategoryIcon category={category} size={44} strokeWidth={1.4} />
          )}
        </span>
      </span>
    </div>
  )
}
