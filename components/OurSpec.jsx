import React from 'react'
import Title from './Title'
import { BanknoteIcon, PackageSearchIcon, SendIcon } from 'lucide-react'
import { deliveryNote } from '@/lib/delivery'

// M44: these three cards used to promise "free delivery on every order, no conditions",
// "7 days easy return" and "24/7 customer support". None of that is true or exists: delivery
// is a flat rate with a free threshold (ADR-018), there is no return policy, and there is no
// support channel. They now describe what the store actually does; the delivery line comes
// from the Settings global like every other delivery statement.
const OurSpecs = ({ shipping = null }) => {

    const specs = [
        { title: "Delivery across Pakistan", description: deliveryNote(shipping), icon: SendIcon, accent: '#05DF72' },
        { title: "Cash on Delivery", description: "Order as a guest and pay in cash when your order arrives. No online payment needed.", icon: BanknoteIcon, accent: '#FF8904' },
        { title: "Track your order", description: "Check your order's status any time with your order number and the phone number you used.", icon: PackageSearchIcon, accent: '#A684FF' },
    ]

    return (
        <div className='px-6 my-20 max-w-6xl mx-auto'>
            <Title visibleButton={false} title='How ordering works' description="Order as a guest, pay on delivery, and check your order any time." />

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 gap-y-10 mt-26'>
                {
                    specs.map((spec, index) => {
                        return (
                            <div className='relative h-44 px-8 flex flex-col items-center justify-center w-full text-center border rounded-lg group' style={{ backgroundColor: spec.accent + 10, borderColor: spec.accent + 30 }} key={index}>
                                <h3 className='text-slate-800 font-medium'>{spec.title}</h3>
                                <p className='text-sm text-slate-600 mt-3'>{spec.description}</p>
                                <div className='absolute -top-5 text-white size-10 flex items-center justify-center rounded-md group-hover:scale-105 transition' style={{ backgroundColor: spec.accent }} aria-hidden='true'>
                                    <spec.icon size={20} />
                                </div>
                            </div>
                        )
                    })
                }
            </div>

        </div>
    )
}

export default OurSpecs
