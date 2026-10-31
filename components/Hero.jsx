import { ArrowRightIcon } from 'lucide-react'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatPKR } from '@/lib/currency'

// M40: a server component (no hooks or handlers), so the hero is in the initial HTML.
// M28: the old hero photography was part of the deleted dummy dataset.
// M45a: the "floating product" hero. The floating tiles are real products (featured first, then
// latest, passed in by the home page) linking to their pages, so the hero never shows stock
// photography of things the store does not sell. With no product images it falls back to a
// purely decorative composition. The headline is the home page's one <h1> (it had none).
// M55/M55a: "Starts from" and the delivery line are real values; each is hidden, not faked, when
// its value is unavailable.
// M62: the redesign's lavender hero. The design's "11.11 Mega Sale", "up to 60% off", "free
// shipping over Rs. 3,000", "secure payment" and "easy returns" are sample copy and are not used;
// the pink circle shows the store's real lowest price instead (and is not drawn without one), and
// the three chips are the statements that are true here. The circle uses `pink-dark` rather than
// `pink` so its small white text keeps 4.5:1.

// M101 (ADR-047): the Mirza editorial hero, replacing M62's lavender card, tilted tiles, pink price
// sticker and trust chips (the chips repeated the announcement bar and the trust row). A warm sand
// panel: a short positioning statement for a multi-category store, the real lowest price, two CTAs,
// and a calm 2 x 2 grid of real in-stock products (still never stock photos of things the store does
// not sell). Every tile is visible at every width: a compact 4:3 2 x 2 grid on a phone, one row of four
// on a tablet. Captions and tiles are never hidden: a product name that is in the HTML but hidden
// would be the first match for anyone (or any test, e2e/golden-path.spec.ts) looking for it.
const Hero = ({ startingPrice = null, showcase = [] }) => {
    const tiles = showcase.slice(0, 4)

    return (
        <section className='mx-4 sm:mx-6'>
            <div className='mx-auto mt-4 grid max-w-7xl items-center gap-7 overflow-hidden rounded-hero bg-lavender px-5 py-7 sm:mt-6 sm:px-10 sm:py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:px-14 lg:py-14'>
                <div className='flex min-w-0 flex-col gap-4 sm:gap-5'>
                    <p className='text-xs font-semibold uppercase tracking-[0.14em] text-primary'>Cash on delivery across Pakistan</p>
                    <h1 className='max-w-[580px] text-[30px] font-bold leading-[1.08] tracking-[-0.03em] text-ink sm:text-5xl lg:text-[56px]'>
                        Everyday essentials, thoughtfully chosen.
                    </h1>
                    <p className='max-w-[460px] text-[15px] leading-relaxed text-ink-3 sm:text-lg'>
                        Electronics, fashion, home and beauty, delivered to your door. Pay in cash when your order arrives.
                    </p>
                    <div className='mt-1 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center'>
                        {/* M44: a real link to the shop (was a <button> with no handler). */}
                        <Link href='/shop' className='group inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-control bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary-dark active:scale-[0.98] sm:px-7'>
                            Shop now
                            <ArrowRightIcon size={18} strokeWidth={2} className='transition group-hover:translate-x-0.5' aria-hidden='true' />
                        </Link>
                        <Link href='/categories' className='inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-control border border-line-3 bg-white/60 px-3 text-sm sm:px-6 font-semibold text-ink transition hover:border-ink hover:bg-white'>
                            Browse categories
                        </Link>
                    </div>
                    {startingPrice !== null && (
                        <p className='text-sm text-muted'>
                            Prices from <span className='font-semibold text-ink'>{formatPKR(startingPrice)}</span>
                        </p>
                    )}
                </div>

                {tiles.length > 0 && (
                    <ul className='grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:max-w-[500px] lg:grid-cols-2 lg:justify-self-end'>
                        {tiles.map((product, index) => (
                            <li key={product.id}>
                                <Link href={`/product/${product.id}`} className='group block'>
                                    <span className='block aspect-[4/3] overflow-hidden rounded-tile bg-tile-lavender sm:aspect-square'>
                                        <Image
                                            src={product.imageUrl}
                                            alt=''
                                            width={480}
                                            height={480}
                                            sizes='(min-width: 1280px) 250px, (min-width: 1024px) 21vw, (min-width: 640px) 22vw, 44vw'
                                            priority={index < 2}
                                            fetchPriority={index === 0 ? 'high' : undefined}
                                            className='size-full object-cover transition duration-500 group-hover:scale-[1.03]'
                                        />
                                    </span>
                                    <span className='mt-2 flex items-baseline justify-between gap-2 text-xs sm:text-[13px]'>
                                        <span className='min-w-0 truncate font-medium text-ink group-hover:underline group-hover:underline-offset-4'>{product.name}</span>
                                        <span className='shrink-0 font-semibold text-ink'>{formatPKR(product.price)}</span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    )
}

export default Hero
