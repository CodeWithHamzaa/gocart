import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatPKR } from '@/lib/currency'

// M40: a server component (no hooks or handlers), so the hero is in the initial HTML; the headline is the
// home page's one <h1>.
// M45a/M55: the products are real in-stock products (featured first, then the latest) linking to their
// pages, and "Prices from" is the store's real lowest price, hidden (not faked) when unknown.
// M101 (ADR-047): the "V1" banner the owner chose: a centred statement and two CTAs on the white page,
// then one wide light-grey stage holding three products, the middle one largest. On a phone the stage is
// a swipeable row. Products are never hidden at any width: a product name that is in the HTML but hidden
// would be the first match for anyone (or any test, e2e/golden-path.spec.ts) looking for it.
const Hero = ({ startingPrice = null, showcase = [] }) => {
    const items = showcase.slice(0, 3)

    return (
        <section className='mx-4 sm:mx-6'>
            <div className='mx-auto max-w-7xl pt-12 text-center sm:pt-16 lg:pt-20'>
                <h1 className='mx-auto max-w-[920px] text-[40px] font-semibold leading-[1.04] tracking-[-0.045em] text-ink sm:text-6xl lg:text-[80px] lg:leading-[1.02]'>
                    Everyday essentials, thoughtfully chosen.
                </h1>
                <p className='mx-auto mt-4 max-w-[560px] text-[17px] leading-relaxed text-ink-2 sm:mt-5 sm:text-xl'>
                    Electronics, fashion, home and beauty. Delivered to your door, paid in cash when it arrives.
                </p>
                <div className='mt-7 flex flex-wrap justify-center gap-3'>
                    {/* M44: real links (the first was once a <button> with no handler). */}
                    <Link href='/shop' className='inline-flex min-h-12 items-center rounded-full bg-primary px-6 text-[15px] font-semibold text-white transition hover:bg-primary-dark'>
                        Shop all products
                    </Link>
                    <Link href='/categories' className='inline-flex min-h-12 items-center rounded-full px-6 text-[15px] font-semibold text-ink ring-[1.5px] ring-ink ring-inset transition hover:bg-ink hover:text-white'>
                        Browse categories
                    </Link>
                </div>
                {startingPrice !== null && (
                    <p className='mt-4 text-sm text-muted'>Prices from {formatPKR(startingPrice)}</p>
                )}
            </div>

            {items.length > 0 && (
                <ul className='no-scrollbar -mx-4 mt-10 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 sm:mx-auto sm:mt-12 sm:grid sm:max-w-7xl sm:grid-cols-[1fr_1.3fr_1fr] sm:items-end sm:gap-6 sm:overflow-visible sm:rounded-hero sm:bg-lavender sm:px-10 sm:pb-9 sm:pt-10'>
                    {items.map((product, index) => (
                        <li key={product.id} className='w-[72%] shrink-0 snap-center rounded-card bg-lavender p-4 sm:w-auto sm:rounded-none sm:bg-transparent sm:p-0'>
                            <Link href={`/product/${product.id}`} className='group block text-center'>
                                <span className='block aspect-square overflow-hidden rounded-tile bg-white'>
                                    <Image
                                        src={product.imageUrl}
                                        alt=''
                                        width={720}
                                        height={720}
                                        sizes='(min-width: 1280px) 440px, (min-width: 640px) 38vw, 72vw'
                                        priority={index < 2}
                                        fetchPriority={index === 1 ? 'high' : undefined}
                                        className='size-full object-cover transition duration-500 group-hover:scale-[1.03]'
                                    />
                                </span>
                                <span className='mt-3 block text-[15px] font-semibold text-ink group-hover:underline group-hover:underline-offset-4'>{product.name}</span>
                                <span className='block text-sm text-muted'>{formatPKR(product.price)}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

export default Hero
