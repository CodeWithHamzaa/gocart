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

  return (
    <div className={`group relative flex min-h-[152px] flex-col gap-1 overflow-hidden rounded-card p-4 transition sm:min-h-[168px] sm:p-5 ${className}  duration-300 hover:-translate-y-0.5 hover:shadow-float-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${tint.tile}`}>
      <span className={`mb-2.5 flex size-10 items-center justify-center rounded-control bg-white ${tint.ink}`} aria-hidden="true">
        <CategoryIcon category={category} size={22} strokeWidth={1.8} />
      </span>
      <Link href={href} className="text-base font-bold text-ink outline-none after:absolute after:inset-0">{category.title}</Link>
      {/* M98: the child links keep clear of the large corner icon from `sm`, where it shows. */}
      {children && <div className="relative z-10 text-[13px] text-muted sm:pr-[5.5rem]">{children}</div>}
      <span aria-hidden="true" className={`mt-1.5 text-[13px] font-bold ${tint.link}`}>Shop now &rarr;</span>
      <CategoryIcon category={category} aria-hidden="true" size={96} strokeWidth={1} className={`pointer-events-none absolute -bottom-1.5 -right-1.5 hidden opacity-90 sm:block ${tint.ink}`} />
    </div>
  )
}
