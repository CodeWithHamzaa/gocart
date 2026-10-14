// M26: the multi-vendor "Product by {store}" attribution block is removed —
// products aren't vendor-owned, and its link pointed at /shop/[username],
// already deleted by M15. Nothing references product.store here anymore.
// No remaining state (M25 removed the Reviews tab), so this drops 'use
// client' and renders as a server component, same direction as M23's
// Redux-shedding cleanup.
// M45a: a soft card on the storefront tokens; the text keeps its line breaks.
const ProductDescription = ({ product }) => {

    if (!product.description) return null

    return (
        <section className="my-10 sm:my-14 max-w-3xl rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line/70 sm:p-8">
            <h2 className="text-lg font-bold tracking-tight text-ink">Description</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft [overflow-wrap:anywhere]">{product.description}</p>
        </section>
    )
}

export default ProductDescription
