import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { CategoryIcon } from '@/lib/category-style'

// M61: the categories page's large category circle (M101 moved the home page's tile variant to
// components/HomeCategories.tsx; `variant` stays 'circle' so callers read the same). A server
// component; child links sit beside the main link rather than inside it (a link cannot contain a link). A category's own image is used when an admin uploaded one;
// otherwise a tinted icon stands in.
// M101 (owner-approved home style): the circle became the home page's category tile. A lavender card
// with the name as a semibold heading-sized link stretched over the card, the child links (passed as
// `children`, raised above the stretch), and the image on a white tile. On a phone the card is a row
// (text left, a square image right) so four categories fit without a long scroll; from `sm` it is the
// home page's tall tile with the image at the bottom.
type TileCategory = { slug: string; title: string; image?: { url?: string | null } | number | string | null }

export default function CategoryTile({ category, className = '', children }: { category: TileCategory; index?: number; variant: 'circle'; className?: string; children?: ReactNode }) {
  const image = typeof category.image === 'object' && category.image ? category.image.url : null
  const href = `/category/${category.slug}`

  return (
    <div className={`group relative flex h-full gap-4 overflow-hidden rounded-card bg-lavender p-5 focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-primary sm:min-h-[360px] sm:flex-col sm:px-6 sm:pb-0 sm:pt-6 ${className}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-none">
        <Link href={href} className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink outline-none after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4">
          {category.title}
        </Link>
        {children && <div className="relative z-10">{children}</div>}
      </div>
      <span aria-hidden="true" className="flex size-24 shrink-0 items-center justify-center self-start overflow-hidden rounded-tile bg-white text-ink-3 sm:mt-auto sm:aspect-[4/3] sm:size-auto sm:w-full sm:self-stretch sm:rounded-b-none">
        {image ? (
          <Image src={image} alt="" width={480} height={360} sizes="(min-width: 1024px) 260px, (min-width: 640px) 45vw, 96px" className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <CategoryIcon category={category} size={44} strokeWidth={1.4} />
        )}
      </span>
    </div>
  )
}
