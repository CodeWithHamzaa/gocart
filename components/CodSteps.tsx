import { deliveryNote, type DeliverySettings } from '@/lib/delivery'

// M101: how cash on delivery works, as the three steps it really is (the owner chose the "V3" mockup).
// It replaces the home page's trust row (M62 OurSpecs): ordering without an account, delivery and its
// real charge (Settings, lib/delivery.ts), paying the courier in cash, and tracking an order.
export default function CodSteps({ shipping = null }: { shipping?: DeliverySettings | null }) {
  const steps = [
    { title: 'Place your order', text: 'No account needed: just your name, phone number and address.' },
    { title: 'We deliver', text: `Anywhere in Pakistan. ${deliveryNote(shipping)}.` },
    { title: 'Pay in cash', text: 'Pay the courier when your parcel arrives. Track it any time with your order number and phone.' },
  ]
  return (
    <section aria-labelledby="cod-steps" className="mx-4 mt-16 sm:mx-6 sm:mt-24">
      <div className="mx-auto max-w-7xl rounded-hero bg-lavender px-6 py-8 sm:px-11 sm:py-11">
        <h2 id="cod-steps" className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-4xl">Order now, pay when it arrives</h2>
        <ol className="mt-6 grid gap-7 sm:mt-8 sm:grid-cols-3 sm:gap-8">
          {steps.map((step, index) => (
            <li key={step.title} className="text-[15px] leading-relaxed text-ink-2">
              <span aria-hidden="true" className="block text-[44px] font-semibold leading-none tracking-[-0.04em] text-primary">{index + 1}</span>
              <strong className="mt-3 block text-lg font-semibold text-ink">{step.title}</strong>
              {step.text}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
