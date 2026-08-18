// M26: the multi-vendor "Product by {store}" attribution block is removed —
// products aren't vendor-owned, and its link pointed at /shop/[username],
// already deleted by M15. Nothing references product.store here anymore.
// No remaining state (M25 removed the Reviews tab), so this drops 'use
// client' and renders as a server component, same direction as M23's
// Redux-shedding cleanup.
const ProductDescription = ({ product }) => {

    return (
        <div className="my-18 text-sm text-slate-600">

            {/* Description */}
            <div className="flex border-b border-slate-200 mb-6 max-w-2xl">
                <p className="border-b-[1.5px] font-semibold px-3 py-2 font-medium">Description</p>
            </div>
            <p className="max-w-xl">{product.description}</p>
        </div>
    )
}

export default ProductDescription
