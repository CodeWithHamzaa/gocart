import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { CategoryIcon, tintFor } from '@/lib/category-style'

// M61: the categories page's large category circle (M101 moved the home page's tile variant to
// components/HomeCategories.tsx; `variant` stays 'circle' so callers read the same). A server
// component; child links sit beside the main link rather than inside it (a link cannot contain a link). A category's own image is used when an admin uploaded one;
// otherwise a tinted icon stands in.
type TileCategory = { slug: string; title: string; image?: { url?: string | null } | number | string | null }

export default function CategoryTile({ category, index, className = '', children }: { category: TileCategory; index: number; variant: 'circle'; className?: string; children?: ReactNode }) {
  const tint = tintFor(index)
  const image = typeof category.image === 'object' && category.image ? category.image.url : null
  const href = `/category/${category.slug}`

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
