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
const ProductCard = ({ product, priority = false }) => {

    const firstImage = product.images?.[0]
    const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url

    return (
        <Link href={`/product/${product.id}`} className=' group max-xl:mx-auto'>
            <div className='bg-[#F5F5F5] h-40  sm:w-60 sm:h-68 rounded-lg flex items-center justify-center'>
                {imageUrl && (
                    <Image width={500} height={500} className='max-h-30 sm:max-h-40 w-auto group-hover:scale-115 transition duration-300' priority={priority} fetchPriority={priority ? 'high' : undefined} src={imageUrl} alt={firstImage?.alt || product.name} />
                )}
            </div>
            {/* M44: name and price stack on a phone (a two-column grid leaves a card ~124px wide at
                320px, too narrow for a long name beside a price that must not wrap) and sit side
                by side from `sm`. A long unbroken name wraps instead of pushing the card wider
                than its column — a product called "Headphones" must not scroll the page. */}
            <div className='flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-3 text-sm text-slate-800 pt-2 max-w-60'>
                <p className='min-w-0 [overflow-wrap:anywhere]'>{product.name}</p>
                <p className='whitespace-nowrap'>{formatPKR(product.price)}</p>
            </div>
        </Link>
    )
}

export default ProductCard
