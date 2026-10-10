import { ArrowRightIcon, ChevronRightIcon } from 'lucide-react'
import React from 'react'
import Link from 'next/link'
import CategoriesMarquee from './CategoriesMarquee'
import { formatPKR } from '@/lib/currency'

// M40: a server component (no hooks or handlers), so the hero and the category links are in the
// initial HTML.
// M28: the hero/product placeholder images (assets/hero_*.png) were part of
// the deleted dummy dataset and are removed with it — real marketing/product
// photography is a separate, not-yet-supplied asset. The `<Image>` elements
// they filled are replaced with plain gradient placeholders that keep the
// same layout dimensions (no CLS), not left as broken image references.

// M55/M55a: the banner threshold and the "Starts from" price are real values passed in by
// the home page (Settings global / cheapest product); each block is hidden, not faked,
// when its value is unavailable.
const Hero = ({ freeShippingThreshold = null, startingPrice = null, categories = [] }) => {

    return (
        <div className='mx-6'>
            <div className='flex max-xl:flex-col gap-8 max-w-7xl mx-auto my-10'>
                <div className='relative flex-1 flex flex-col bg-green-200 rounded-3xl xl:min-h-100 group'>
                    <div className='p-5 sm:p-16'>
                        <div className='inline-flex items-center gap-3 bg-green-300 text-green-900 pr-4 p-1 rounded-full text-xs sm:text-sm'>
                            <span className='bg-green-800 px-3 py-1 max-sm:ml-1 rounded-full text-white text-xs'>DELIVERY</span>
                            {freeShippingThreshold > 0 ? `Free delivery on orders of ${formatPKR(freeShippingThreshold)} or more` : 'Cash on Delivery across Pakistan'}
                            <ChevronRightIcon className='group-hover:ml-2 transition-all' size={16} aria-hidden='true' />
                        </div>
                        <h2 className='text-3xl sm:text-5xl leading-[1.2] my-3 font-medium bg-gradient-to-r from-slate-600 to-[#A0FF74] bg-clip-text text-transparent max-w-xs  sm:max-w-md'>
                            Gadgets you'll love. Prices you'll trust.
                        </h2>
                        {startingPrice !== null && (
                            <div className='text-slate-800 text-sm font-medium mt-4 sm:mt-8'>
                                <p>Starts from</p>
                                <p className='text-3xl'>{formatPKR(startingPrice)}</p>
                            </div>
                        )}
                        {/* M44: was a <button> with no handler (dead UI); now a real link to the shop. */}
                        <Link href='/shop' className='inline-flex items-center justify-center min-h-11 bg-slate-800 text-white text-sm py-2.5 px-7 sm:py-5 sm:px-12 mt-4 sm:mt-10 rounded-md hover:bg-slate-900 hover:scale-103 active:scale-95 transition'>SHOP NOW</Link>
                    </div>
                    <div className='sm:absolute bottom-0 right-0 md:right-10 w-full sm:max-w-sm h-40 sm:h-64 rounded-3xl bg-gradient-to-br from-green-300/60 to-green-500/40' />
                </div>
                <div className='flex flex-col md:flex-row xl:flex-col gap-5 w-full xl:max-w-sm text-sm text-slate-600'>
                    {/* M44: both tiles are real links now (they were dead "View more" buttons), and the
                        "20% discounts" tile is gone: the store has no discount or coupon system, so that
                        was a false offer. */}
                    <Link href='/shop' className='flex-1 flex items-center justify-between w-full bg-orange-200 rounded-3xl p-6 px-8 group'>
                        <div>
                            <p className='text-3xl font-medium bg-gradient-to-r from-slate-800 to-[#FFAD51] bg-clip-text text-transparent max-w-40'>Best products</p>
                            <p className='flex items-center gap-1 mt-4 min-h-11'>Shop all products <ArrowRightIcon className='group-hover:ml-2 transition-all' size={18} aria-hidden='true' /> </p>
                        </div>
                        <div className='w-35 h-24 rounded-2xl bg-gradient-to-br from-orange-300/70 to-orange-400/50' />
                    </Link>
                    <Link href='/categories' className='flex-1 flex items-center justify-between w-full bg-blue-200 rounded-3xl p-6 px-8 group'>
                        <div>
                            <p className='text-3xl font-medium bg-gradient-to-r from-slate-800 to-[#78B2FF] bg-clip-text text-transparent max-w-40'>Pay on delivery</p>
                            <p className='flex items-center gap-1 mt-4 min-h-11'>Browse categories <ArrowRightIcon className='group-hover:ml-2 transition-all' size={18} aria-hidden='true' /> </p>
                        </div>
                        <div className='w-35 h-24 rounded-2xl bg-gradient-to-br from-blue-300/70 to-blue-400/50' />
                    </Link>
                </div>
            </div>
            <CategoriesMarquee categories={categories} />
        </div>

    )
}

export default Hero