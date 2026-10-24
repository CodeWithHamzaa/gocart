'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import { TruckIcon, BanknoteIcon, ShoppingCartIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Counter from "./Counter";
import Badge from "./ui/Badge";
import MobileActionBar from "./ui/MobileActionBar";
import { useDispatch, useSelector } from "react-redux";
import { formatPKR } from "@/lib/currency";
import { deliveryNote } from "@/lib/delivery";
import { tileFor } from "@/lib/category-style";
import { discountPercent, statusBadge } from "@/lib/product-badges";

// M25: adapted for real Payload data.
// - `images` are Media relationships, resolved to `.url` the same way
//   ProductCard.jsx does (M23), not treated as string paths.
// - The star-rating block is gone: products carry no rating, and Reviews are
//   out of scope for v1 (ADR-016) — same fix M46 already scopes for this
//   file, pulled forward because it read `product.rating`, which real
//   products don't have, and would have thrown before rendering.
// M55a: `shipping` is read from the Settings global by the product page (server) and passed in,
// so the delivery line can never disagree with what checkout charges (see lib/delivery.ts).
// M45a/M64: one action group, in the DOM once: fixed to the bottom of the screen below `lg` (thumb
// reach) and inline in the column from `lg`, so there is exactly one "Add to Cart". "Buy Now" adds the
// product and goes straight to the cart, where the guest COD checkout is. No size/colour selectors,
// SKU or brand: products have no variants (yet). The design's "Inclusive of all taxes" is not shown:
// nothing in the store states tax treatment.
// M64: the redesign's layout. A pastel tile holds the real image (a thumbnail rail beside it from
// `lg`, a strip below it on a phone), then category, name, a price card, stock, actions and info rows.
const ProductDetails = ({ product, shipping }) => {

    const productId = product.id;

    const cart = useSelector(state => state.cart.cartItems);
    const dispatch = useDispatch();

    const router = useRouter()

    const images = product.images.map((image) => typeof image === 'string' ? image : image?.url).filter(Boolean)
    const [mainImage, setMainImage] = useState(images[0]);
    const imageIndex = Math.max(images.indexOf(mainImage), 0);

    const category = typeof product.category === 'object' && product.category ? product.category : null;
    // M69: the same badge rule as the product card (lib/product-badges.ts).
    const discount = discountPercent(product.mrp, product.price);
    const status = statusBadge(product);

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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row-reverse lg:gap-4">
                {/* Full-bleed on a phone (the page's side margin is cancelled), a rounded tile from `sm`. */}
                <div className={`relative -mx-4 flex aspect-square min-w-0 flex-1 items-center justify-center overflow-hidden sm:mx-0 sm:aspect-[5/4] sm:rounded-panel lg:aspect-[4/5] ${tileFor(productId)}`}>
                    {/* M45: the main product image is the largest contentful paint, so it is not lazy-loaded. */}
                    {mainImage && <Image src={mainImage} alt={product.name} width={600} height={600} sizes="(min-width: 1024px) 560px, 100vw" priority fetchPriority="high" className="relative h-[78%] w-[78%] object-contain mix-blend-multiply" />}
                    {status && <Badge tone={status.tone} className="absolute left-3 top-3">{status.text}</Badge>}
                    {images.length > 1 && (
                        <span aria-hidden="true" className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
                            {images.map((image, index) => (
                                <span key={index} className={`h-1.5 rounded-full ${index === imageIndex ? 'w-[18px] bg-primary' : 'w-1.5 bg-line-3'}`} />
                            ))}
                        </span>
                    )}
                </div>
                {images.length > 1 && (
                    <div className="no-scrollbar flex gap-3 overflow-x-auto p-1 lg:flex-col lg:overflow-visible">
                        {images.map((image, index) => (
                            <button type="button" key={index} onClick={() => setMainImage(images[index])} aria-label={`Show image ${index + 1} of ${images.length}`} aria-pressed={mainImage === image} className={`flex size-16 shrink-0 items-center justify-center rounded-tile ring-2 transition sm:size-[72px] ${tileFor(productId)} ${mainImage === image ? 'ring-primary' : 'ring-transparent hover:ring-line-3'}`}>
                                <Image src={image} className="h-3/4 w-3/4 object-contain mix-blend-multiply" alt="" width={64} height={64} sizes="64px" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="min-w-0 lg:pt-2">
                {category && <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{category.title}</p>}
                {/* M44: an unbroken name (a SKU-style "ABC-123456789-XYZ") wraps instead of scrolling the page. */}
                <h1 className="mt-1.5 text-2xl font-extrabold leading-tight tracking-[-0.02em] text-ink sm:text-3xl lg:text-[34px] [overflow-wrap:anywhere]">{product.name}</h1>

                <div className="mt-4 rounded-card bg-white p-4 ring-1 ring-line sm:p-5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <p className="text-[28px] font-extrabold leading-none text-primary sm:text-[32px]">{formatPKR(product.price)}</p>
                        {discount > 0 && (
                            <>
                                <p className="text-base text-strike line-through"><span className="sr-only">Was </span>{formatPKR(product.mrp)}</p>
                                <Badge tone="off">{discount}% OFF</Badge>
                            </>
                        )}
                    </div>
                    <p className="mt-3 text-[13px] text-muted">{deliveryNote(shipping)}</p>
                </div>

                <div className="mt-3">
                    <Badge tone={outOfStock ? 'neutral' : 'success'} className={outOfStock ? 'ring-1 ring-line-2' : ''}>{outOfStock ? 'Out of stock' : 'In stock'}</Badge>
                </div>

                {/* The action group: fixed to the bottom below `lg`, inline in the column from `lg`. */}
                <MobileActionBar label="Add to cart" inline>
                    <div className="mx-auto flex max-w-xl items-center gap-3 lg:max-w-none">
                        {outOfStock ? (
                            <button disabled aria-disabled="true" className="min-h-12 flex-1 cursor-not-allowed rounded-control bg-line px-6 text-sm font-bold text-disabled">
                                Out of Stock
                            </button>
                        ) : inCart ? (
                            <>
                                <Counter productId={productId} />
                                <button onClick={() => router.push('/cart')} className="min-h-12 flex-1 rounded-control bg-primary px-6 text-sm font-bold text-white transition hover:bg-primary-dark active:scale-[0.98]">
                                    View Cart
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={addToCartHandler} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary-dark active:scale-[0.98]">
                                    <ShoppingCartIcon size={18} aria-hidden="true" />
                                    Add to Cart
                                </button>
                                <button onClick={buyNowHandler} className="min-h-12 flex-1 rounded-control border border-line-3 bg-white px-4 text-sm font-bold text-primary-dark transition hover:border-primary active:scale-[0.98]">
                                    Buy Now
                                </button>
                            </>
                        )}
                    </div>
                </MobileActionBar>

                <div className="mt-6 grid gap-3 text-sm lg:mt-8">
                    <p className="flex items-center gap-3 rounded-card bg-white p-3 text-ink-2 ring-1 ring-line">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><TruckIcon size={18} aria-hidden="true" /></span>
                        {deliveryNote(shipping)}
                    </p>
                    <p className="flex items-center gap-3 rounded-card bg-white p-3 text-ink-2 ring-1 ring-line">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tint-mint text-tint-mint-ink"><BanknoteIcon size={18} aria-hidden="true" /></span>
                        Cash on Delivery — pay when your order arrives
                    </p>
                </div>
            </div>
        </div>
    )
}

export default ProductDetails
