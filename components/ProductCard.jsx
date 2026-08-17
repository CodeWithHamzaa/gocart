'use client'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

// M23: adapted for real Payload data.
// - The star-rating block is gone: Products carry no rating, and Reviews are
//   out of scope for v1 (ADR-016). It previously read `product.rating`, which
//   exists only on the dummy dataset.
// - `images` are Media relationships, so the card resolves `.url` rather than
//   treating the entry as a string path.
const ProductCard = ({ product }) => {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'

    const firstImage = product.images?.[0]
    const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url

    return (
        <Link href={`/product/${product.id}`} className=' group max-xl:mx-auto'>
            <div className='bg-[#F5F5F5] h-40  sm:w-60 sm:h-68 rounded-lg flex items-center justify-center'>
                {imageUrl && (
                    <Image width={500} height={500} className='max-h-30 sm:max-h-40 w-auto group-hover:scale-115 transition duration-300' src={imageUrl} alt={firstImage?.alt || product.name} />
                )}
            </div>
            <div className='flex justify-between gap-3 text-sm text-slate-800 pt-2 max-w-60'>
                <p>{product.name}</p>
                <p>{currency}{product.price}</p>
            </div>
        </Link>
    )
}

export default ProductCard
