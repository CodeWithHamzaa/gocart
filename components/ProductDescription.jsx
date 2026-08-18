'use client'
import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

// M25: adapted for real Payload data.
// - The Reviews tab is gone entirely, not just guarded: it existed only to
//   render `product.rating`, which real products don't have, and Reviews
//   are out of scope for v1 (ADR-016) — same fix M46 already scopes for
//   this file, pulled forward because it would have thrown before
//   rendering. There's nothing left for M46 to strip from this file.
// - The store-attribution block is left in place but guarded: real
//   products have no `store` relationship, so it now renders nothing.
//   Deleting the block outright is M26's job (removing the dead
//   /shop/[username] link left by the M15 vendor-route removal) — not
//   pulled forward here since it isn't a render-blocking fix.
const ProductDescription = ({ product }) => {

    return (
        <div className="my-18 text-sm text-slate-600">

            {/* Description */}
            <div className="flex border-b border-slate-200 mb-6 max-w-2xl">
                <p className="border-b-[1.5px] font-semibold px-3 py-2 font-medium">Description</p>
            </div>
            <p className="max-w-xl">{product.description}</p>

            {/* Store Page */}
            {product.store && (
                <div className="flex gap-3 mt-14">
                    <Image src={product.store.logo} alt="" className="size-11 rounded-full ring ring-slate-400" width={100} height={100} />
                    <div>
                        <p className="font-medium text-slate-600">Product by {product.store.name}</p>
                        <Link href={`/shop/${product.store.username}`} className="flex items-center gap-1.5 text-green-500"> view store <ArrowRight size={14} /></Link>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProductDescription