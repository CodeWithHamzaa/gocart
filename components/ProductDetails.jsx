'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import { TruckIcon, BanknoteIcon, ShoppingBagIcon } from "lucide-react";
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
// M45a: premium product layout — the image in an arched well with an "n / total" counter, pill
// badges, and one action bar that is pinned to the bottom of the screen on phones and tablets
// (thumb reach) and sits inline from `lg`. It is a single set of buttons in the DOM, so there is
// exactly one "Add to Cart". "Buy Now" adds the product and goes straight to the cart, where the
// guest COD checkout is. No size/colour selectors: products have no variants (yet).
const ProductDetails = ({ product, shipping }) => {

    const productId = product.id;

    const cart = useSelector(state => state.cart.cartItems);
    const dispatch = useDispatch();

    const router = useRouter()

    const images = product.images.map((image) => typeof image === 'string' ? image : image?.url).filter(Boolean)
    const [mainImage, setMainImage] = useState(images[0]);
    const imageIndex = Math.max(images.indexOf(mainImage), 0);

    const category = typeof product.category === 'object' && product.category ? product.category : null;
    const discount = product.mrp > product.price ? Math.round((product.mrp - product.price) / product.mrp * 100) : 0;

    // Fail closed, matching the server's stock check in createOrder: only an
    // explicit inStock === true is purchasable (false or null -> Out of Stock).
    const outOfStock = product.inStock !== true;
    const inCart = Boolean(cart[productId]);

    const addToCartHandler = () => {
        if (outOfStock) return;
        dispatch(addToCart({ productId }))
    }

    const buyNowHandler = () => {
        if (outOfStock) return;
        if (!inCart) dispatch(addToCart({ productId }))
        router.push('/cart')
    }

    return (
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-14">
            <div className="min-w-0">
                <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-4xl bg-well sm:aspect-[5/4] lg:aspect-square">
                    {/* The arch behind the product. */}
                    <div aria-hidden="true" className="absolute inset-x-[14%] top-[9%] bottom-0 rounded-t-full bg-white/75" />
                    {/* M45: the main product image is the largest contentful paint, so it is not lazy-loaded. */}
                    {mainImage && <Image src={mainImage} alt={product.name} width={600} height={600} sizes="(min-width: 1024px) 560px, 90vw" priority fetchPriority="high" className="relative h-[68%] w-[68%] object-contain" />}
                    {images.length > 1 && (
                        <span aria-hidden="true" className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-ink/75 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                            {imageIndex + 1} / {images.length}
                        </span>
                    )}
                </div>
                {images.length > 1 && (
                    <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto p-1">
                        {images.map((image, index) => (
                            <button type="button" key={index} onClick={() => setMainImage(images[index])} aria-label={`Show image ${index + 1} of ${images.length}`} aria-pressed={mainImage === image} className={`flex size-16 shrink-0 items-center justify-center rounded-2xl bg-well ring-2 transition sm:size-20 ${mainImage === image ? 'ring-ink' : 'ring-transparent hover:ring-line'}`}>
                                <Image src={image} className="h-3/4 w-3/4 object-contain" alt="" width={64} height={64} sizes="64px" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="min-w-0 lg:pt-4">
                {category && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{category.title}</p>}
                {/* M44: an unbroken name (a SKU-style "ABC-123456789-XYZ") wraps instead of scrolling the page. */}
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl lg:text-4xl [overflow-wrap:anywhere]">{product.name}</h1>

                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <p className="text-2xl font-bold text-ink sm:text-3xl">{formatPKR(product.price)}</p>
                    {discount > 0 && (
                        <>
                            <p className="text-base text-muted line-through"><span className="sr-only">Was </span>{formatPKR(product.mrp)}</p>
                            <p className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">Save {discount}%</p>
                        </>
                    )}
                </div>

                <p className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${outOfStock ? 'bg-rose-50 text-rose-700' : 'bg-brand-50 text-brand-700'}`}>
                    <span aria-hidden="true" className={`size-1.5 rounded-full ${outOfStock ? 'bg-rose-600' : 'bg-brand-600'}`} />
                    {outOfStock ? 'Out of stock' : 'In stock'}
                </p>

                {/* The action bar: fixed to the bottom below `lg`, inline from `lg`. */}
                <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgb(14_17_22/0.15)] backdrop-blur lg:static lg:z-auto lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
                    <div className="mx-auto flex max-w-xl items-center gap-3 lg:max-w-none">
                        {outOfStock ? (
                            <button disabled aria-disabled="true" className="min-h-12 flex-1 rounded-full bg-slate-200 px-6 text-sm font-semibold text-slate-500 cursor-not-allowed">
                                Out of Stock
                            </button>
                        ) : inCart ? (
                            <>
                                <Counter productId={productId} />
                                <button onClick={() => router.push('/cart')} className="min-h-12 flex-1 rounded-full bg-ink px-6 text-sm font-semibold text-white transition hover:bg-ink-soft active:scale-[0.98]">
                                    View Cart
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={addToCartHandler} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border-2 border-ink bg-white px-4 text-sm font-semibold text-ink transition hover:bg-canvas active:scale-[0.98]">
                                    <ShoppingBagIcon size={17} aria-hidden="true" />
                                    Add to Cart
                                </button>
                                <button onClick={buyNowHandler} className="min-h-12 flex-1 rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink-soft active:scale-[0.98]">
                                    Buy Now
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="mt-6 grid gap-3 text-sm lg:mt-8">
                    <p className="flex items-center gap-3 rounded-2xl bg-white p-3 text-ink-soft ring-1 ring-line/70">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><TruckIcon size={17} aria-hidden="true" /></span>
                        {deliveryNote(shipping)}
                    </p>
                    <p className="flex items-center gap-3 rounded-2xl bg-white p-3 text-ink-soft ring-1 ring-line/70">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700"><BanknoteIcon size={17} aria-hidden="true" /></span>
                        Cash on Delivery — pay when your order arrives
                    </p>
                </div>
            </div>
        </div>
    )
}

export default ProductDetails
