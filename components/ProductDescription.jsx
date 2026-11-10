
// M26: the multi-vendor "Product by {store}" attribution block is removed —
// products aren't vendor-owned, and its link pointed at /shop/[username],
// already deleted by M15. Nothing references product.store here anymore.
// No remaining state (M25 removed the Reviews tab), so this drops 'use
// client' and renders as a server component, same direction as M23's
// Redux-shedding cleanup.
// M101: no card around the sections (a top rule instead), 15px body text for reading.
// M64: two native <details> sections (Description, open; Delivery & payment) on every width: no
// script, keyboard-accessible, and the text stays in the HTML. The description is the real one,
// with its line breaks; the delivery section repeats only what Settings and ADR-004 say. The
// design's size-guide, returns and reviews tabs are not built (no data, no policy, ADR-016).
const Section = ({ title, open = false, children }) => (
    <details open={open} className="group border-b border-line last:border-b-0">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-base font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {title}
            <span aria-hidden="true" className="text-xl leading-none text-ink-3 transition group-open:rotate-45">+</span>
        </summary>
        <div className="pb-5 text-base leading-relaxed text-ink-2 [overflow-wrap:anywhere]">{children}</div>
    </details>
)

// The page places this in the right column, under the buttons and the three delivery promises, so the
// "Delivery & payment" section that repeated those promises word for word was dropped; the one fact it
// added (tracking) joins the description section's foot. Nothing renders without a description.
const ProductDescription = ({ product }) => {

    if (!product.description) return null

    return (
        <section className="mt-8 border-t border-line">
            <Section title="Description" open>
                <p className="whitespace-pre-line">{product.description}</p>
                <p className="mt-4 text-sm text-muted">Track your order any time with your order number and phone number.</p>
            </Section>
        </section>
    )
}

export default ProductDescription
