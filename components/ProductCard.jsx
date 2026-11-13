import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import Badge from './ui/Badge'
import Price from './ui/Price'
import { discountPercent, statusBadge } from '@/lib/product-badges'
import QuickAddButton from './ui/QuickAddButton'
import WishlistButton from './ui/WishlistButton'

// The one product card, used by every grid and every rail (the rail card was retired so a shopper
// learns one card). Image first on a neutral well, then category, name and price, with quick add.
// Price pattern everywhere: price, the MRP struck through, then "-27%". The image carries a status
// label only (New, Limited edition, Out of stock); "Sale" is dropped when a percentage already says it.
// ONE link wraps the category, the name and the price (e2e reads the price from the card's link),
// stretched over the card. A long unbroken name wraps instead of widening the column.
// `rail` gives the card a fixed width for a horizontal rail; in a grid it fills its cell.
// `headingLevel` keeps the name one level below the section heading it sits under.
// `showCategory={false}` drops the category line where the page is already one category's listing.
const RAIL_WIDTH = 'w-[46vw] max-w-[260px] shrink-0 sm:w-[240px] lg:w-[260px]'

const ProductCard = ({ product, priority = false, rail = false, headingLevel = 3, showCategory = true }) => {

    const firstImage = product.images?.[0]
    const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url
    const discount = discountPercent(product.mrp, product.price)
    const status = statusBadge(product)
    const label = status && !(status.tone === 'sale' && discount > 0) ? status : null
    const outOfStock = product.inStock !== true
    const categoryTitle = showCategory && typeof product.category === 'object' && product.category ? product.category.title : null
    const Heading = headingLevel === 2 ? 'h2' : 'h3'

    return (
        <article className={`group relative flex h-full min-w-0 flex-col rounded-card border border-line bg-surface p-2.5 transition-colors hover:border-line-3 sm:p-3 ${rail ? RAIL_WIDTH : ''}`}>
            <div className='relative aspect-square overflow-hidden rounded-tile bg-surface-muted'>
                {imageUrl && (
                    <Image width={600} height={600} className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${outOfStock ? 'opacity-60 grayscale' : ''}`} sizes={rail ? '(min-width: 1024px) 260px, (min-width: 640px) 240px, 46vw' : '(min-width: 1280px) 300px, (min-width: 1024px) 23vw, (min-width: 768px) 30vw, 45vw'} priority={priority} fetchPriority={priority ? 'high' : undefined} src={imageUrl} alt={(typeof firstImage === 'object' && firstImage?.alt) || ''} />
                )}
                {label && (
                    <span className='pointer-events-none absolute left-2 top-2 z-10'>
                        <Badge tone={label.tone} shape='tag'>{label.text}</Badge>
                    </span>
                )}
            </div>
            <WishlistButton productId={product.id} name={product.name} className='absolute right-3.5 top-3.5 z-10 sm:right-4 sm:top-4' />
            <Link href={`/product/${product.id}`} className='flex flex-1 flex-col px-0.5 pt-3 outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary'>
                {categoryTitle && <span className='truncate text-xs font-medium text-muted'>{categoryTitle}</span>}
                <Heading title={product.name} className={`${categoryTitle ? 'mt-0.5' : ''} line-clamp-2 text-sm font-semibold text-ink [overflow-wrap:anywhere] group-hover:underline group-hover:underline-offset-4 sm:text-base`}>{product.name}</Heading>
                <span className='mt-auto flex min-h-11 items-end pr-12 pt-2'>
                    <Price price={product.price} mrp={product.mrp} />
                </span>
            </Link>
            <QuickAddButton productId={product.id} name={product.name} disabled={outOfStock} variant='solid' className='absolute bottom-2.5 right-2.5 z-10 sm:bottom-3 sm:right-3' />
        </article>
    )
}

export default ProductCard
