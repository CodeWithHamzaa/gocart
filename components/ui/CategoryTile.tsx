import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { CategoryIcon, tintFor } from '@/lib/category-style'

// M61: the two category tiles. `tile` is the home page's pastel card and `circle` the categories
// page's large circle. Both are server components, and both put child links beside the main link
// rather than inside it (a link cannot contain a link): the main link is stretched over the tile
// and the child links sit above it. A category's own image is used when an admin uploaded one;
// otherwise a tinted icon stands in.
type TileCategory = { slug: string; title: string; image?: { url?: string | null } | number | string | null }

export default function CategoryTile({ category, index, variant, className = '', children }: { category: TileCategory; index: number; variant: 'tile' | 'circle'; className?: string; children?: ReactNode }) {
  const tint = tintFor(index)
  const image = typeof category.image === 'object' && category.image ? category.image.url : null
  const href = `/category/${category.slug}`

  if (variant === 'circle') {
    return (
      <div className={`flex flex-col items-center gap-3 text-center ${className}`}>
        <Link href={href} className="group flex flex-col items-center gap-3">
          <span className={`flex size-28 items-center justify-center overflow-hidden rounded-full transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-float-sm sm:size-32 ${tint.tile} ${tint.ink}`}>
            {image ? <Image src={image} alt="" width={128} height={128} sizes="128px" className="size-full object-cover" /> : <CategoryIcon category={category} size={44} strokeWidth={1.6} aria-hidden="true" />}
          </span>
          <span className="text-base font-bold text-ink">{category.title}</span>
        </Link>
        {children}
      </div>
    )
  }

  // M101: the home page tile leads with the category's own image (4:3, cover) in a well of the
  // category's pastel tint, then the name, the child links and a "Shop now". M62's card with a large
  // corner icon is gone; the icon is only the fallback when a category has no image.
  return (
    <div className={`group relative flex flex-col gap-1 rounded-tile focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-primary ${className}`}>
      <span className={`mb-2 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-tile ${tint.tile} ${tint.ink}`} aria-hidden="true">
        {image ? (
          <Image src={image} alt="" width={480} height={360} sizes="(min-width: 1280px) 300px, (min-width: 768px) 24vw, 46vw" className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <CategoryIcon category={category} size={40} strokeWidth={1.4} />
        )}
      </span>
      <Link href={href} className="text-base font-semibold text-ink outline-none after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4">{category.title}</Link>
      {children && <div className="relative z-10 text-[13px] leading-snug text-muted">{children}</div>}
      <span aria-hidden="true" className="mt-0.5 text-[13px] font-semibold text-primary">Shop now &rarr;</span>
    </div>
  )
}
