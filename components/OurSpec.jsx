import React from 'react'
import { BanknoteIcon, PackageSearchIcon, ShoppingBagIcon, TruckIcon } from 'lucide-react'
import { deliveryNote } from '@/lib/delivery'
import TrustRow from './ui/TrustRow'

// M44: these cards used to promise "free delivery on every order, no conditions",
// "7 days easy return" and "24/7 customer support". None of that is true or exists: delivery
// is a flat rate with a free threshold (ADR-018), there is no return policy, and there is no
// support channel. They now describe what the store actually does; the delivery line comes
// from the Settings global like every other delivery statement.
// M62: the redesign's value-prop row (design: "Why shop with us"). Four statements, all true for
// this store: delivery (Settings), cash on delivery (ADR-004), guest checkout (ADR-005) and the
// guest order lookup (ADR-024). The design's returns and card/wallet lines are not shown: neither
// exists here.
const OurSpecs = ({ shipping = null }) => {

    const items = [
        { title: 'Delivery across Pakistan', text: deliveryNote(shipping), icon: <TruckIcon size={24} strokeWidth={1.8} />, tint: 'bg-primary-soft text-primary' },
        { title: 'Cash on delivery', text: 'Pay in cash when your order arrives', icon: <BanknoteIcon size={24} strokeWidth={1.8} />, tint: 'bg-tint-mint text-tint-mint-ink' },
        { title: 'Guest checkout', text: 'No account needed to order', icon: <ShoppingBagIcon size={24} strokeWidth={1.8} />, tint: 'bg-tint-pink text-tint-pink-ink' },
        { title: 'Track your order', text: 'With your order number and phone', icon: <PackageSearchIcon size={24} strokeWidth={1.8} />, tint: 'bg-tint-yellow text-tint-yellow-icon' },
    ]

    return (
        <section aria-label='Why shop with us' className='mx-4 sm:mx-6 mt-12 sm:mt-14'>
            <div className='max-w-7xl mx-auto'>
                <TrustRow items={items} />
            </div>
        </section>
    )
}

export default OurSpecs
