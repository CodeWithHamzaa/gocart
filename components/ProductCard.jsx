import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { formatPKR } from '@/lib/currency'
import { tileFor } from '@/lib/category-style'
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

    // M101: the Mirza card. The photo fills one warm-neutral square (object-cover), with no frame inside
    // a frame and no card chrome around it, so a grid reads as one set. At most one status label on the
    // photo (never "Featured"), the price in ink with the MRP and the discount as text on the same
    // line (so prices line up across a row without a spacer), and quiet white heart and quick-add
    // buttons. Still ONE link to the product, stretched over the card; the buttons sit above it.
    return (
        <article className='group relative flex h-full min-w-0 flex-col gap-2.5 rounded-tile'>
            <div className={`relative aspect-square overflow-hidden rounded-tile ${tileFor(product.id)}`}>
                {imageUrl && (
                    <Image width={600} height={600} className={`size-full object-cover transition duration-500 group-hover:scale-[1.03] ${outOfStock ? 'opacity-60 grayscale' : ''}`} sizes='(min-width: 1280px) 240px, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 46vw' priority={priority} fetchPriority={priority ? 'high' : undefined} src={imageUrl} alt={(typeof firstImage === 'object' && firstImage?.alt) || ''} />
                )}
                <WishlistButton productId={product.id} name={product.name} className='absolute right-1 top-1 z-10' />
                {status && <Badge tone={status.tone} className='absolute left-2.5 top-2.5'>{status.text}</Badge>}
                <QuickAddButton productId={product.id} name={product.name} disabled={outOfStock} className='absolute bottom-2 right-2 z-10' />
            </div>
            {/* M44: a long unbroken name wraps instead of pushing the card wider than its column, so a
                product called "Headphones" must not scroll the page. Prices wrap under each other
                rather than overflow at 320px. */}
            <Link href={`/product/${product.id}`} className='flex flex-1 flex-col gap-1 px-0.5 outline-none after:absolute after:inset-0 after:rounded-tile focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-primary'>
                {categoryTitle && <span className='truncate text-[11px] font-medium uppercase tracking-[0.08em] text-muted'>{categoryTitle}</span>}
                <span className='line-clamp-2 min-h-[2.7em] text-sm font-medium leading-snug text-ink [overflow-wrap:anywhere] group-hover:underline group-hover:decoration-line-3 group-hover:underline-offset-4 sm:text-[15px]'>{product.name}</span>
                <span className='mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5'>
                    <span className='whitespace-nowrap text-[15px] font-bold text-ink sm:text-base'>{formatPKR(product.price)}</span>
                    {discount > 0 && <s className='whitespace-nowrap text-xs text-strike'><span className='sr-only'>Was </span>{formatPKR(product.mrp)}</s>}
                    {discount > 0 && <span className='whitespace-nowrap text-xs font-semibold text-pink'>{discount}% off</span>}
                </span>
            </Link>
        </article>
    )
}

export default ProductCard
