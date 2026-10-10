'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import { TagIcon, TruckIcon, BanknoteIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Counter from "./Counter";
import { useDispatch, useSelector } from "react-redux";
import { formatPKR } from "@/lib/currency";
import { deliveryNote } from "@/lib/delivery";

// M25: adapted for real Payload data.
// - `images` are Media relationships, resolved to `.url` the same way
//   ProductCard.jsx does (M23), not treated as string paths.
// - The star-rating block is gone: products carry no rating, and Reviews are
//   out of scope for v1 (ADR-016) — same fix M46 already scopes for this
//   file, pulled forward because it read `product.rating`, which real
//   products don't have, and would have thrown before rendering.
// M55a: `shipping` is read from the Settings global by the product page (server) and passed in,
// so the delivery line can never disagree with what checkout charges (see lib/delivery.ts).
const ProductDetails = ({ product, shipping }) => {

    const productId = product.id;

    const cart = useSelector(state => state.cart.cartItems);
    const dispatch = useDispatch();

    const router = useRouter()

    const images = product.images.map((image) => typeof image === 'string' ? image : image?.url).filter(Boolean)
    const [mainImage, setMainImage] = useState(images[0]);

    // Fail closed, matching the server's stock check in createOrder: only an
    // explicit inStock === true is purchasable (false or null -> Out of Stock).
    const outOfStock = product.inStock !== true;

    const addToCartHandler = () => {
        if (outOfStock) return;
        dispatch(addToCart({ productId }))
    }

    return (
        <div className="flex max-lg:flex-col gap-12">
            <div className="flex max-sm:flex-col-reverse gap-3">
                <div className="flex sm:flex-col gap-3">
                    {images.map((image, index) => (
                        <button type="button" key={index} onClick={() => setMainImage(images[index])} aria-label={`Show image ${index + 1} of ${images.length}`} aria-pressed={mainImage === image} className="bg-slate-100 flex items-center justify-center size-26 rounded-lg group cursor-pointer">
                            <Image src={image} className="group-hover:scale-103 group-active:scale-95 transition" alt="" width={45} height={45} />
                        </button>
                    ))}
                </div>
                <div className="flex justify-center items-center h-100 sm:size-113 bg-slate-100 rounded-lg ">
                    {/* M45: the main product image is the largest contentful paint, so it is not lazy-loaded. */}
                    {mainImage && <Image src={mainImage} alt={product.name} width={250} height={250} priority fetchPriority="high" />}
                </div>
            </div>
            <div className="flex-1 min-w-0">
                {/* M44: an unbroken name (a SKU-style "ABC-123456789-XYZ") wraps instead of scrolling the page. */}
                <h1 className="text-3xl font-semibold text-slate-800 [overflow-wrap:anywhere]">{product.name}</h1>
                <div className="flex items-start my-6 gap-3 text-2xl font-semibold text-slate-800">
                    <p>{formatPKR(product.price)}</p>
                    <p className="text-xl text-slate-500 line-through">{formatPKR(product.mrp)}</p>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                    <TagIcon size={14} />
                    <p>Save {((product.mrp - product.price) / product.mrp * 100).toFixed(0)}% right now</p>
                </div>
                <div className="flex items-end gap-5 mt-10">
                    {
                        !outOfStock && cart[productId] && (
                            <div className="flex flex-col gap-3">
                                <p className="text-lg text-slate-800 font-semibold">Quantity</p>
                                <Counter productId={productId} />
                            </div>
                        )
                    }
                    {
                        outOfStock ? (
                            <button disabled aria-disabled="true" className="bg-slate-300 text-slate-500 px-10 py-3 text-sm font-medium rounded cursor-not-allowed">
                                Out of Stock
                            </button>
                        ) : (
                            <button onClick={() => !cart[productId] ? addToCartHandler() : router.push('/cart')} className="bg-slate-800 text-white px-10 py-3 text-sm font-medium rounded hover:bg-slate-900 active:scale-95 transition">
                                {!cart[productId] ? 'Add to Cart' : 'View Cart'}
                            </button>
                        )
                    }
                </div>
                <hr className="border-gray-300 my-5" />
                <div className="flex flex-col gap-4 text-slate-500">
                    <p className="flex gap-3"> <TruckIcon className="text-slate-500" /> {deliveryNote(shipping)} </p>
                    <p className="flex gap-3"> <BanknoteIcon className="text-slate-500" /> Cash on Delivery — pay when your order arrives </p>
                </div>

            </div>
        </div>
    )
}

export default ProductDetails