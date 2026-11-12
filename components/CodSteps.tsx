import Link from 'next/link'
import { ArrowRightIcon, BanknoteIcon, PackageSearchIcon, TruckIcon, UserRoundIcon } from 'lucide-react'
import { deliveryNote, type DeliverySettings } from '@/lib/delivery'

// M101: how cash on delivery works. M118 (ADR-052): "Why shop with <store>", the home page's one
// aubergine band. Only what is true today (owner, 2026-11-12: no returns policy and no delivery-time
// promise): cash on delivery, the real delivery charge from Settings (lib/delivery.ts), no account, and
// tracking by order number and phone. White text on aubergine (13.7:1, 75% 8.4:1); `surface-inverse`
// turns the focus ring white (violet on aubergine is 2.27:1).
export default function CodSteps({ shipping = null, storeName = 'Mirza' }: { shipping?: DeliverySettings | null; storeName?: string }) {
  const facts = [
    { icon: BanknoteIcon, title: 'Cash on delivery', text: 'Pay the courier in cash when your parcel arrives. No card needed.' },
    { icon: TruckIcon, title: 'Delivery across Pakistan', text: `${deliveryNote(shipping)}.` },
    { icon: UserRoundIcon, title: 'No account needed', text: 'Order with just your name, phone number and address.' },
    { icon: PackageSearchIcon, title: 'Track your order', text: 'Check your order any time with your order number and phone number.' },
  ]
  return (
    <section aria-labelledby="why-heading" className="surface-inverse mt-16 bg-inverse text-on-inverse lg:mt-24">
      <div className="mx-4 sm:mx-6">
        <div className="mx-auto max-w-7xl py-12 sm:py-16 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-on-inverse/75">Cash on delivery</p>
          <h2 id="why-heading" className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl sm:tracking-tighter lg:text-5xl">
            Why shop with {storeName}
          </h2>
          <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4 lg:gap-10">
            {facts.map((fact) => (
              <li key={fact.title} className="flex gap-4 sm:flex-col sm:gap-0">
                <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-on-inverse/10">
                  <fact.icon size={20} strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <strong className="block text-base font-semibold sm:mt-4 sm:text-lg">{fact.title}</strong>
                  <span className="mt-1 block text-sm text-on-inverse/75 sm:text-base">{fact.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/orders" className="mt-10 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline sm:text-base">
            Track an order <ArrowRightIcon size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
