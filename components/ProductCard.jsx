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

    // M111 (owner request): image-first hierarchy, in the Mirza palette. Top to bottom: a square photo
    // tile (badges float top-left, the heart top-right), the category as a small uppercase label, the name
    // clamped to two lines (the full name stays in the DOM and in the link's text, so e2e still finds it),
    // then the price row pushed to the bottom with mt-auto so rows of cards line up. The card is still ONE
    // link (category, name and price; e2e reads the price from it), stretched over the card; the heart and
    // the round quick-add button are siblings above it. The quick-add sits at the right of the price row,
    // absolutely placed because a button cannot live inside the link; the row reserves its width.
    return (
        <article className='group relative flex h-full min-w-0 flex-col rounded-card bg-lavender p-3 lg:p-4'>
            <div className='relative aspect-square overflow-hidden rounded-lg bg-white'>
                {imageUrl && (
                    <Image width={600} height={600} className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] ${outOfStock ? 'opacity-60 grayscale' : ''}`} sizes='(min-width: 1280px) 300px, (min-width: 1024px) 23vw, (min-width: 768px) 30vw, 45vw' priority={priority} fetchPriority={priority ? 'high' : undefined} src={imageUrl} alt={(typeof firstImage === 'object' && firstImage?.alt) || ''} />
                )}
                {(status || discount > 0) && (
                    <span className='pointer-events-none absolute left-2 right-11 top-2 z-10 flex flex-col items-start gap-1'>
                        {status && <Badge tone={status.tone} shape='tag'>{status.text}</Badge>}
                        {discount > 0 && <Badge tone='off' shape='tag'>{discount}% off</Badge>}
                    </span>
                )}
            </div>
            <WishlistButton productId={product.id} name={product.name} className='absolute right-3.5 top-3.5 z-10 lg:right-4.5 lg:top-4.5' />
            {/* M44: a long unbroken name wraps instead of widening the column. */}
            <Link href={`/product/${product.id}`} className='flex flex-1 flex-col pt-3 outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary'>
                {categoryTitle && <span className='truncate text-[11px] font-medium uppercase tracking-wider text-muted'>{categoryTitle}</span>}
                <span title={product.name} className={`${categoryTitle ? 'mt-1' : ''} line-clamp-2 text-sm font-semibold leading-snug text-ink [overflow-wrap:anywhere] group-hover:underline group-hover:underline-offset-4 sm:text-[15px]`}>{product.name}</span>
                <span className='mt-auto pt-3'>
                    <span className='flex min-h-11 flex-col justify-center pr-12'>
                        <span className='whitespace-nowrap text-xs font-semibold text-ink min-[360px]:text-sm sm:text-[15px]'>{formatPKR(product.price)}</span>
                        {discount > 0 && (
                            <s className='whitespace-nowrap text-[11px] text-strike sm:text-xs'><span className='sr-only'>Was </span>{formatPKR(product.mrp)}</s>
                        )}
                    </span>
                </span>
            </Link>
            <QuickAddButton productId={product.id} name={product.name} disabled={outOfStock} variant='solid' className='absolute bottom-3 right-3 z-10 lg:bottom-4 lg:right-4' />
        </article>
    )
}

export default ProductCard
