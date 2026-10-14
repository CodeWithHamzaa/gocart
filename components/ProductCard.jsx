import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { formatPKR } from '@/lib/currency'

// M23: adapted for real Payload data.
// - The star-rating block is gone: Products carry no rating, and Reviews are
//   out of scope for v1 (ADR-016). It previously read `product.rating`, which
//   exists only on the dummy dataset.
// - `images` are Media relationships, so the card resolves `.url` rather than
//   treating the entry as a string path.
// M45: `priority` is set by the listing pages for the first row of cards (likely the largest
// contentful paint), which makes the browser fetch those images first instead of lazily.
// M45a: the rounded "floating" card. The image sits in its own tinted well inside a white card,
// and the badges are real data only: the discount is computed from mrp/price and shown only when
// there is one, and an out-of-stock product says so. No wishlist heart (there is no wishlist) and
// no rating (ADR-016). The card fills its grid cell, so the listing decides the column count.
const ProductCard = ({ product, priority = false }) => {

    const firstImage = product.images?.[0]
    const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url
    const discount = product.mrp > product.price ? Math.round((product.mrp - product.price) / product.mrp * 100) : 0
    const outOfStock = product.inStock !== true

    return (
        <Link href={`/product/${product.id}`} className='group flex h-full min-w-0 flex-col rounded-3xl bg-white p-2 shadow-soft ring-1 ring-line/70 transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-2.5'>
            <div className='relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-well'>
                {imageUrl && (
                    <Image width={500} height={500} className='h-3/4 w-3/4 object-contain transition duration-500 group-hover:scale-108' sizes='(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw' priority={priority} fetchPriority={priority ? 'high' : undefined} src={imageUrl} alt={firstImage?.alt || product.name} />
                )}
                {discount > 0 && (
                    <span className='absolute left-2 top-2 rounded-full bg-sale-600 px-2 py-1 text-[11px] font-semibold leading-none text-white'>{discount}% OFF</span>
                )}
                {outOfStock && (
                    <span className='absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium leading-none text-ink-soft ring-1 ring-line'>Out of stock</span>
                )}
            </div>
            {/* M44: a long unbroken name wraps instead of pushing the card wider than its column —
                a product called "Headphones" must not scroll the page. Prices wrap under each other
                rather than overflow at 320px. */}
            <div className='flex flex-1 flex-col gap-1.5 px-1.5 pb-1.5 pt-3'>
                <p className='line-clamp-2 text-sm font-medium text-ink [overflow-wrap:anywhere]'>{product.name}</p>
                <p className='mt-auto flex flex-wrap items-baseline gap-x-2'>
                    <span className='whitespace-nowrap text-sm font-bold text-ink sm:text-base'>{formatPKR(product.price)}</span>
                    {discount > 0 && <span className='whitespace-nowrap text-xs text-muted line-through'><span className='sr-only'>Was </span>{formatPKR(product.mrp)}</span>}
                </p>
            </div>
        </Link>
    )
}

export default ProductCard
