import { ArrowRightIcon, BanknoteIcon, PackageSearchIcon, ShoppingBagIcon, SparklesIcon, TruckIcon } from 'lucide-react'
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

// Positions for up to three tiles: the first is the large centre piece (the LCP image) and sits on
// top, so its caption is never covered. Captions show at every width: a product name that is in
// the HTML but hidden would be the first match for anyone (or any test) looking for it.
const TILE_STYLES = [
    'left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 w-40 sm:w-56 lg:w-64 -rotate-3',
    'left-[6%] top-[12%] z-10 w-28 sm:w-40 lg:w-44 -rotate-12 opacity-95',
    'right-[6%] bottom-[8%] z-20 w-28 sm:w-40 lg:w-44 rotate-6',
]

const Hero = ({ shipping = null, startingPrice = null, showcase = [] }) => {

    const trust = [
        { icon: TruckIcon, title: 'Delivery across Pakistan', text: deliveryNote(shipping) },
        { icon: BanknoteIcon, title: 'Cash on Delivery', text: 'Pay in cash when it arrives' },
        { icon: ShoppingBagIcon, title: 'Guest checkout', text: 'No account needed to order' },
        { icon: PackageSearchIcon, title: 'Track your order', text: 'With your order number and phone', href: '/orders' },
    ]

    return (
        <section className='mx-4 sm:mx-6'>
            <div className='relative max-w-7xl mx-auto mt-4 sm:mt-8 overflow-hidden rounded-4xl bg-ink text-white'>
                {/* Soft jade glows behind the composition. */}
                <div aria-hidden='true' className='pointer-events-none absolute -right-24 -top-32 size-[28rem] rounded-full bg-brand-500/30 blur-3xl' />
                <div aria-hidden='true' className='pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-brand-700/30 blur-3xl' />

                <div className='relative grid items-center gap-6 p-6 pb-2 sm:p-12 lg:grid-cols-2 lg:gap-10 lg:p-16'>
                    <div>
                        <p className='inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85 ring-1 ring-white/15'>
                            <SparklesIcon size={14} className='text-brand-400' aria-hidden='true' />
                            Cash on Delivery · No account needed
                        </p>
                        <h1 className='mt-5 text-4xl font-bold uppercase leading-[1.02] tracking-tight sm:text-6xl xl:text-[4.25rem]'>
                            Gadgets you&apos;ll love.
                            <span className='block text-brand-200'>Prices you&apos;ll trust.</span>
                        </h1>
                        {startingPrice !== null && (
                            <p className='mt-5 text-sm text-white/70 sm:text-base'>
                                Starts from <span className='text-lg font-semibold text-white sm:text-xl'>{formatPKR(startingPrice)}</span>
                            </p>
                        )}
                        <div className='mt-6 flex flex-wrap items-center gap-3 sm:mt-8'>
                            {/* M44: a real link to the shop (was a <button> with no handler). */}
                            <Link href='/shop' className='group inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-ink shadow-lift transition hover:bg-brand-50 active:scale-95'>
                                Shop Now
                                <ArrowRightIcon size={16} className='transition group-hover:translate-x-0.5' aria-hidden='true' />
                            </Link>
                            <Link href='/categories' className='inline-flex min-h-12 items-center rounded-full px-5 text-sm font-medium text-white ring-1 ring-white/25 transition hover:bg-white/10'>
                                Browse categories
                            </Link>
                        </div>
                    </div>

                    <div className='relative h-60 sm:h-80 lg:h-[26rem]'>
                        {showcase.length > 0 ? showcase.slice(0, 3).map((product, index) => (
                            <Link
                                key={product.id}
                                href={`/product/${product.id}`}
                                className={`absolute block rounded-3xl bg-white p-3 text-ink shadow-float transition duration-300 hover:z-40 hover:rotate-0 hover:scale-105 ${TILE_STYLES[index]}`}
                            >
                                <span className='flex aspect-square items-center justify-center rounded-2xl bg-well'>
                                    <Image
                                        src={product.imageUrl}
                                        alt={product.name}
                                        width={400}
                                        height={400}
                                        sizes={index === 0 ? '(min-width: 1024px) 256px, (min-width: 640px) 224px, 160px' : '(min-width: 640px) 176px, 112px'}
                                        priority={index === 0}
                                        fetchPriority={index === 0 ? 'high' : undefined}
                                        className='h-4/5 w-4/5 object-contain'
                                    />
                                </span>
                                <span className='mt-2 flex items-center justify-between gap-2 px-1 text-[11px] sm:text-xs'>
                                    <span className='min-w-0 truncate font-medium'>{product.name}</span>
                                    <span className='shrink-0 font-semibold text-brand-700'>{formatPKR(product.price)}</span>
                                </span>
                            </Link>
                        )) : (
                            <div aria-hidden='true'>
                                <div className='absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded-4xl bg-gradient-to-br from-white/25 to-white/5 ring-1 ring-white/20 sm:size-64' />
                                <div className='absolute right-[10%] bottom-[10%] size-24 rotate-12 rounded-3xl bg-brand-400/40 sm:size-32' />
                                <div className='absolute left-[10%] top-[10%] size-20 -rotate-12 rounded-3xl bg-white/10 sm:size-28' />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Trust strip: only what the store really does. */}
            <ul className='max-w-7xl mx-auto mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4'>
                {trust.map((item) => {
                    const body = (
                        <>
                            <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700'>
                                <item.icon size={18} aria-hidden='true' />
                            </span>
                            <span className='min-w-0'>
                                <span className='block text-sm font-semibold text-ink'>{item.title}</span>
                                <span className='hidden text-xs text-muted sm:block'>{item.text}</span>
                            </span>
                        </>
                    )
                    return (
                        <li key={item.title}>
                            {item.href ? (
                                <Link href={item.href} className='flex h-full min-h-16 items-center gap-3 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-line/60 transition hover:ring-brand-200'>{body}</Link>
                            ) : (
                                <div className='flex h-full min-h-16 items-center gap-3 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-line/60'>{body}</div>
                            )}
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}

export default Hero
