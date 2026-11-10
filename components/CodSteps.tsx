import { BanknoteIcon, TruckIcon, UserRoundIcon } from 'lucide-react'
import { deliveryNote, type DeliverySettings } from '@/lib/delivery'

// M101: how cash on delivery works, as the three steps it really is: ordering without an account, delivery
// and its real charge (Settings, lib/delivery.ts), paying the courier in cash, and tracking an order.
// It is also the home page's only trust strip: the three promises that used to sit under the banner said the
// same things, so they were merged here. A white panel with a hairline; each step has its icon and number.
export default function CodSteps({ shipping = null }: { shipping?: DeliverySettings | null }) {
  const steps = [
    { icon: UserRoundIcon, title: 'Place your order', text: 'No account needed: just your name, phone number and address.' },
    { icon: TruckIcon, title: 'We deliver', text: `Anywhere in Pakistan. ${deliveryNote(shipping)}.` },
    { icon: BanknoteIcon, title: 'Pay cash on delivery', text: 'Pay the courier when your parcel arrives. Track it any time with your order number and phone.' },
  ]
  return (
    <section aria-labelledby="cod-steps" className="mx-4 mt-16 sm:mx-6 lg:mt-24">
      <div className="mx-auto max-w-7xl rounded-panel border border-line bg-surface px-5 py-8 sm:px-10 sm:py-11">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-primary-dark">Cash on delivery</p>
        <h2 id="cod-steps" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-4xl sm:tracking-tighter">Order now, pay when it arrives</h2>
        <ol className="mt-6 grid gap-6 sm:mt-8 sm:grid-cols-3 sm:gap-8">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4 text-sm text-ink-2 sm:flex-col sm:gap-0 sm:text-base">
              <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">
                <step.icon size={20} strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <strong className="block text-base font-semibold text-ink sm:mt-4 sm:text-lg">
                  <span className="text-muted">{index + 1}. </span>
                  {step.title}
                </strong>
                <span className="mt-1 block">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
