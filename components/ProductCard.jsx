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

    return (
        <article className='group relative flex h-full min-w-0 flex-col gap-1.5 rounded-card bg-white p-2.5 shadow-card ring-1 ring-line transition duration-300 hover:-translate-y-0.5 hover:shadow-float-sm sm:p-3'>
            <div className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-tile ${tileFor(product.id)}`}>
                {imageUrl && (
                    <Image width={500} height={500} className={`h-3/4 w-3/4 object-contain mix-blend-multiply transition duration-500 group-hover:scale-105 ${outOfStock ? 'opacity-55 grayscale' : ''}`} sizes='(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw' priority={priority} fetchPriority={priority ? 'high' : undefined} src={imageUrl} alt={(typeof firstImage === 'object' && firstImage?.alt) || ''} />
                )}
                <WishlistButton productId={product.id} name={product.name} className='absolute right-1 top-1 z-10' />
                {status && <Badge tone={status.tone} className='absolute left-2 top-2'>{status.text}</Badge>}
                <QuickAddButton productId={product.id} name={product.name} disabled={outOfStock} className='absolute bottom-1.5 right-1.5 z-10' />
            </div>
            {/* M44: a long unbroken name wraps instead of pushing the card wider than its column, so a
                product called "Headphones" must not scroll the page. Prices wrap under each other
                rather than overflow at 320px. */}
            <Link href={`/product/${product.id}`} className='flex flex-1 flex-col gap-1 px-0.5 pt-1.5 pb-0.5 outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary'>
                {categoryTitle && <span className='truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-muted'>{categoryTitle}</span>}
                <span className='line-clamp-2 min-h-[2.7em] text-[13px] font-semibold leading-snug text-ink [overflow-wrap:anywhere] sm:text-[15px]'>{product.name}</span>
                {/* M98: the price sits right under the name and the "% OFF" row keeps its height when
                    there is no discount, so prices line up across a row of cards. */}
                <span className='mt-1 flex flex-wrap items-baseline gap-x-1.5'>
                    <span className='whitespace-nowrap text-[15px] font-extrabold text-primary sm:text-[17px]'>{formatPKR(product.price)}</span>
                    {discount > 0 && <s className='whitespace-nowrap text-[11px] text-strike sm:text-xs'><span className='sr-only'>Was </span>{formatPKR(product.mrp)}</s>}
                </span>
                {discount > 0 ? <Badge tone='off' className='self-start'>{discount}% OFF</Badge> : <span aria-hidden='true' className='h-[19px]' />}
            </Link>
        </article>
    )
}

export default ProductCard
