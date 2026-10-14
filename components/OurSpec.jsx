import React from 'react'
import Title from './Title'
import { BanknoteIcon, PackageSearchIcon, SendIcon } from 'lucide-react'
import { deliveryNote } from '@/lib/delivery'

// M44: these three cards used to promise "free delivery on every order, no conditions",
// "7 days easy return" and "24/7 customer support". None of that is true or exists: delivery
// is a flat rate with a free threshold (ADR-018), there is no return policy, and there is no
// support channel. They now describe what the store actually does; the delivery line comes
// from the Settings global like every other delivery statement.
// M45a: restyled as soft, tinted cards on the storefront's design tokens; same copy.
const OurSpecs = ({ shipping = null }) => {

    const specs = [
        { title: "Delivery across Pakistan", description: deliveryNote(shipping), icon: SendIcon, tint: 'bg-brand-50 text-brand-700' },
        { title: "Cash on Delivery", description: "Order as a guest and pay in cash when your order arrives. No online payment needed.", icon: BanknoteIcon, tint: 'bg-amber-50 text-amber-700' },
        { title: "Track your order", description: "Check your order's status any time with your order number and the phone number you used.", icon: PackageSearchIcon, tint: 'bg-violet-50 text-violet-700' },
    ]

    return (
        <section className='mx-4 sm:mx-6 my-16 sm:my-24'>
            <div className='max-w-7xl mx-auto'>
                <Title centered visibleButton={false} title='How ordering works' description="Order as a guest, pay on delivery, and check your order any time." />

                <div className='mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 sm:gap-5'>
                    {specs.map((spec) => (
                        <div key={spec.title} className='flex flex-col items-start gap-4 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line/70 sm:p-7'>
                            <span className={`flex size-12 items-center justify-center rounded-2xl ${spec.tint}`} aria-hidden='true'>
                                <spec.icon size={22} />
                            </span>
                            <div>
                                <h3 className='font-semibold text-ink'>{spec.title}</h3>
                                <p className='mt-1.5 text-sm text-muted'>{spec.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default OurSpecs
