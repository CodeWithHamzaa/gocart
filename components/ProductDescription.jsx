import { deliveryNote } from '@/lib/delivery'

// M26: the multi-vendor "Product by {store}" attribution block is removed —
// products aren't vendor-owned, and its link pointed at /shop/[username],
// already deleted by M15. Nothing references product.store here anymore.
// No remaining state (M25 removed the Reviews tab), so this drops 'use
// client' and renders as a server component, same direction as M23's
// Redux-shedding cleanup.
// M64: two native <details> sections (Description, open; Delivery & payment) on every width: no
// script, keyboard-accessible, and the text stays in the HTML. The description is the real one,
// with its line breaks; the delivery section repeats only what Settings and ADR-004 say. The
// design's size-guide, returns and reviews tabs are not built (no data, no policy, ADR-016).
const Section = ({ title, open = false, children }) => (
    <details open={open} className="group border-b border-line last:border-b-0">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-base font-bold text-ink [&::-webkit-details-marker]:hidden">
            {title}
            <span aria-hidden="true" className="text-xl leading-none text-primary transition group-open:rotate-45">+</span>
        </summary>
        <div className="pb-4 text-sm leading-relaxed text-ink-2 [overflow-wrap:anywhere]">{children}</div>
    </details>
)

const ProductDescription = ({ product, shipping = null }) => {

    return (
        <section className="my-8 max-w-3xl rounded-panel bg-white px-5 shadow-card ring-1 ring-line sm:my-12 sm:px-8">
            {product.description && (
                <Section title="Description" open>
                    <p className="whitespace-pre-line">{product.description}</p>
                </Section>
            )}
            <Section title="Delivery & payment" open={!product.description}>
                <ul className="list-disc space-y-1.5 pl-5">
                    <li>{deliveryNote(shipping)}.</li>
                    <li>Cash on delivery: pay when your order arrives. No account is needed to order.</li>
                    <li>Track your order any time with your order number and phone number.</li>
                </ul>
            </Section>
        </section>
    )
}

export default ProductDescription
