import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { formatPKR } from '@/lib/currency'
import Badge from './ui/Badge'
import { discountPercent, statusBadge } from '@/lib/product-badges'
import QuickAddButton from './ui/QuickAddButton'
import WishlistButton from './ui/WishlistButton'

// M91: a wishlist heart (browser-only, ADR-041) sits top-right of the image tile, a sibling of the link.
// M23: adapted for real Payload data.
// - The star-rating block is gone: Products carry no rating, and Reviews are
//   out of scope for v1 (ADR-016). It previously read `product.rating`, which
//   exists only on the dummy dataset.
// - `images` are Media relationships, so the card resolves `.url` rather than
//   treating the entry as a string path.
// M45: `priority` is set by the listing pages for the first row of cards (likely the largest
// contentful paint), which makes the browser fetch those images first instead of lazily.
// M61: the redesign's card. A pastel tile holds the real image, then the category (when the
// product has one), the name, the violet price with the MRP struck through, and a "% OFF" chip.
// The badges are real data only: the discount is computed from mrp/price and shown only when there
// is one, and an out-of-stock product says so. No wishlist heart (there is no wishlist) and no
// rating (ADR-016). The card is ONE link, to the product, wrapping the category, name and price
// (e2e finds a product by that link); it is stretched over the whole card with a pseudo-element, so
// the image area is clickable too. The quick-add button is a sibling of that link (a button inside a
// link is invalid HTML) and sits above the stretch. The card fills its grid cell, so the listing
// decides the column count.
const ProductCard = ({ product, priority = false }) => {

    const firstImage = product.images?.[0]
    const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url
    // M69: both badges come from lib/product-badges.ts (one rule for the card and the product page).
    const discount = discountPercent(product.mrp, product.price)
    const status = statusBadge(product)
    const outOfStock = product.inStock !== true
    const categoryTitle = typeof product.category === 'object' && product.category ? product.category.title : null

    // M101 (owner-approved home style): the listing card now matches the home page's RailCard, sized for
    // a grid cell: a lavender card with the category, the name as a semibold line, the price with the
    // struck MRP and a pink "N% off" pill, and the photo on a white tile at the bottom (pushed down with
    // mt-auto, so photos line up across a row). Heart top-right of the card, quick-add on the photo.
    // The name is never clamped or hidden (e2e finds it by text at every width).
    return (
        <article className='group relative flex h-full min-w-0 flex-col rounded-card bg-lavender p-3 sm:p-4'>
            <WishlistButton productId={product.id} name={product.name} className='absolute right-0.5 top-0.5 z-10 sm:right-1.5 sm:top-1.5' />
            {/* ONE link wraps the category, the name and the price (e2e reads the price from the card's link),
                stretched over the card. M44: a long unbroken name wraps instead of widening the column. */}
            <Link href={`/product/${product.id}`} className='flex flex-col outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary'>
                {categoryTitle && <span className='truncate pr-8 text-xs text-muted sm:text-[13px]'>{categoryTitle}</span>}
                <span className={`${categoryTitle ? 'mt-0.5 pr-6' : 'pr-8'} text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink [overflow-wrap:anywhere] group-hover:underline group-hover:underline-offset-4 sm:text-[17px] sm:tracking-[-0.02em]`}>{product.name}</span>
                <span className='mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1'>
                    <span className='whitespace-nowrap text-[15px] font-semibold text-ink'>{formatPKR(product.price)}</span>
                    {discount > 0 && (
                        <>
                            <s className='whitespace-nowrap text-xs text-strike sm:text-[13px]'><span className='sr-only'>Was </span>{formatPKR(product.mrp)}</s>
                            <Badge tone='off' className='self-center'>{discount}% off</Badge>
                        </>
                    )}
                </span>
            </Link>
            <div className='relative mt-auto pt-3 sm:pt-4'>
                <span className='block aspect-square overflow-hidden rounded-tile bg-white'>
                    {imageUrl && (
                        <Image width={600} height={600} className={`size-full object-cover transition duration-500 group-hover:scale-[1.03] ${outOfStock ? 'opacity-60 grayscale' : ''}`} sizes='(min-width: 1280px) 220px, (min-width: 1024px) 20vw, (min-width: 640px) 28vw, 42vw' priority={priority} fetchPriority={priority ? 'high' : undefined} src={imageUrl} alt={(typeof firstImage === 'object' && firstImage?.alt) || ''} />
                    )}
                </span>
                {status && <Badge tone={status.tone} className='absolute left-2 top-5 sm:left-2.5 sm:top-6.5'>{status.text}</Badge>}
                <QuickAddButton productId={product.id} name={product.name} disabled={outOfStock} className='absolute bottom-2 right-2 z-10' />
            </div>
        </article>
    )
}

export default ProductCard
