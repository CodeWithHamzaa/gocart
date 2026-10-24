import { ArrowRightIcon, BanknoteIcon, ShoppingBagIcon, TruckIcon } from 'lucide-react'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatPKR } from '@/lib/currency'
import { deliveryNote } from '@/lib/delivery'

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

// Captions show at every width: a product name that is in the HTML but hidden would be the first
// match for anyone (or any test) looking for it.
const TILE_STYLES = [
    'left-1/2 top-1/2 z-20 w-40 -translate-x-1/2 -translate-y-1/2 -rotate-3 sm:-translate-x-[60%] sm:w-52 lg:w-60',
    'right-[2%] bottom-[4%] z-30 hidden w-28 rotate-6 sm:block sm:w-36 lg:w-40',
]

const Hero = ({ shipping = null, startingPrice = null, showcase = [] }) => {

    const chips = [
        { icon: TruckIcon, title: 'Delivery across Pakistan', text: deliveryNote(shipping) },
        { icon: BanknoteIcon, title: 'Cash on delivery', text: 'Pay in cash when it arrives' },
        { icon: ShoppingBagIcon, title: 'Guest checkout', text: 'No account needed to order' },
    ]

    return (
        <section className='mx-4 sm:mx-6'>
            <div className='relative mx-auto mt-4 flex max-w-7xl flex-wrap items-center gap-6 overflow-hidden rounded-[22px] bg-lavender p-5 sm:mt-6 sm:gap-8 sm:rounded-hero sm:p-10 lg:p-14'>
                <div className='relative flex min-w-0 flex-[1_1_320px] flex-col gap-4 sm:gap-5 lg:flex-[1_1_460px]'>
                    <p className='text-[13px] font-bold text-primary sm:text-sm'>Cash on delivery · No account needed</p>
                    <h1 className='max-w-[560px] text-[26px] font-extrabold leading-[1.12] tracking-[-0.03em] text-ink sm:text-5xl sm:leading-[1.05] lg:text-[60px]'>
                        Gadgets you&apos;ll love.
                        <span className='block text-primary'>Prices you&apos;ll trust.</span>
                    </h1>
                    {startingPrice !== null && (
                        <p className='max-w-[440px] text-base text-ink-3 sm:text-[17px]'>
                            Starts from <span className='font-bold text-ink'>{formatPKR(startingPrice)}</span>
                        </p>
                    )}
                    <div className='flex flex-wrap gap-3'>
                        {/* M44: a real link to the shop (was a <button> with no handler). */}
                        <Link href='/shop' className='group inline-flex min-h-12 items-center gap-2.5 rounded-control bg-primary px-6 text-sm font-bold text-white transition hover:bg-primary-dark active:scale-95 sm:px-7'>
                            Shop now
                            <ArrowRightIcon size={18} strokeWidth={2.2} className='transition group-hover:translate-x-0.5' aria-hidden='true' />
                        </Link>
                        <Link href='/categories' className='inline-flex min-h-12 items-center rounded-control border border-line-3 bg-white px-6 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary'>
                            Browse categories
                        </Link>
                    </div>
                    <ul className='mt-1 hidden flex-wrap gap-2.5 sm:flex'>
                        {chips.map((chip) => (
                            <li key={chip.title} className='flex items-center gap-2.5 rounded-control bg-white px-3.5 py-2.5'>
                                <chip.icon size={22} strokeWidth={1.8} className='shrink-0 text-primary' aria-hidden='true' />
                                <span className='flex flex-col leading-tight'>
                                    <span className='text-[13px] font-bold text-ink'>{chip.title}</span>
                                    <span className='text-xs text-muted'>{chip.text}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className='relative h-56 min-w-0 flex-[1_1_300px] sm:h-80 lg:h-[400px] lg:flex-[1_1_380px]'>
                    <div aria-hidden='true' className='absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lavender-2 sm:size-80 lg:size-[420px]' />
                    {showcase.slice(0, 2).map((product, index) => (
                        <Link
                            key={product.id}
                            href={`/product/${product.id}`}
                            className={`absolute block rounded-panel bg-white p-2.5 text-ink shadow-float transition duration-300 hover:z-40 hover:rotate-0 hover:scale-105 sm:p-3 ${TILE_STYLES[index]}`}
                        >
                            <span className='flex aspect-square items-center justify-center rounded-tile bg-lavender-tile'>
                                <Image
                                    src={product.imageUrl}
                                    alt=''
                                    width={400}
                                    height={400}
                                    sizes={index === 0 ? '(min-width: 1024px) 240px, (min-width: 640px) 208px, 160px' : '(min-width: 640px) 160px, 112px'}
                                    priority={index === 0}
                                    fetchPriority={index === 0 ? 'high' : undefined}
                                    className='h-4/5 w-4/5 object-contain mix-blend-multiply'
                                />
                            </span>
                            <span className='mt-2 flex items-center justify-between gap-2 px-0.5 text-[11px] sm:text-xs'>
                                <span className='min-w-0 truncate font-semibold'>{product.name}</span>
                                <span className='shrink-0 font-bold text-primary'>{formatPKR(product.price)}</span>
                            </span>
                        </Link>
                    ))}
                    {startingPrice !== null && showcase.length > 0 && (
                        <div aria-hidden='true' className='absolute bottom-[6%] left-[2%] z-30 flex size-24 flex-col items-center justify-center rounded-full bg-pink-dark p-2 text-center leading-tight text-white shadow-pink sm:size-28'>
                            <span className='text-xs font-semibold'>Starts from</span>
                            <span className='text-base font-extrabold sm:text-lg'>{formatPKR(startingPrice)}</span>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

export default Hero
