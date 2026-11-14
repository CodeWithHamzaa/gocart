'use client'
import Counter from "@/components/Counter";
import OrderSummary from "@/components/OrderSummary";
import Breadcrumb from "@/components/ui/Breadcrumb";
import EmptyState from "@/components/ui/EmptyState";
import { deleteItemFromCart, restoreItem } from "@/lib/features/cart/cartSlice";
import { ArrowLeftIcon, ShoppingCartIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { formatPKR } from '@/lib/currency'
import { mediaUrl } from '@/lib/media'

// M28: previously resolved cart line items against `state.product.list`,
// a Redux slice populated only from the dummy dataset (`productSlice.js`,
// deleted this milestone). That was already broken for every product a
// customer could actually reach — /shop, /product, and category pages have
// linked real Payload product IDs since M23–M25, which never matched the
// dummy list's `prod_N` IDs, so the cart silently dropped every real item.
// Fixed by fetching real products via Payload's public REST API (a client
// component can't use the Local API — same sanctioned pattern
// CategoriesMarquee.jsx uses, M27) instead of carrying real-data fetching
// forward as a second, unrelated milestone.
export default function Cart() {

    const { cartItems } = useSelector(state => state.cart);
    const [products, setProducts] = useState([]);

    const dispatch = useDispatch();

    const [cartArray, setCartArray] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);

    const createCartArray = () => {
        setTotalPrice(0);
        const cartArray = [];
        for (const [key, value] of Object.entries(cartItems)) {
            const product = products.find(product => String(product.id) === key);
            if (product) {
                cartArray.push({
                    ...product,
                    quantity: value,
                });
                setTotalPrice(prev => prev + product.price * value);
            }
        }
        setCartArray(cartArray);
    }

    // M92: the removed line is remembered so "Undo" can put it back (design: Cart, "Restore items").
    const [removed, setRemoved] = useState(null);

    const handleDeleteItemFromCart = (productId) => {
        const item = cartArray.find((line) => line.id === productId)
        if (item) setRemoved({ productId, name: item.name, quantity: item.quantity })
        dispatch(deleteItemFromCart({ productId }))
    }

    const handleUndo = () => {
        if (!removed) return
        dispatch(restoreItem({ productId: removed.productId, quantity: removed.quantity }))
        setRemoved(null)
    }

    const undoNotice = removed && (
        <p role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-full bg-accent-soft py-1 pl-5 pr-2 text-sm text-ink">
            <span className="min-w-0 [overflow-wrap:anywhere]">Removed {removed.name}.</span>
            <button type="button" onClick={handleUndo} className="inline-flex min-h-11 items-center rounded-full px-4 font-semibold text-primary-dark hover:bg-surface">Undo</button>
        </p>
    )

    useEffect(() => {
        const controller = new AbortController();

        fetch('/api/products?limit=0&depth=1', { signal: controller.signal })
            .then((res) => res.json())
            .then((data) => setProducts(data.docs || []))
            .catch((error) => {
                if (error.name !== 'AbortError') console.error(error)
            });

        return () => controller.abort();
    }, []);

    useEffect(() => {
        if (products.length > 0) {
            createCartArray();
        }
    }, [cartItems, products]);

    // M101 (owner-approved home style): each line is a lavender card with the photo on a white tile, the
    // category above a semibold name (as on RailCard), the price in ink, and a pill quantity stepper.
    // M65: the redesigned layout (design: Cart / CartMobile). Items are cards, not a table; the
    // summary panel carries the checkout steps (OrderSummary). Checkout stays on /cart (owner decision).
    const itemCount = cartArray.reduce((sum, item) => sum + item.quantity, 0)

    return cartArray.length > 0 ? (
        <div className="mx-4 min-h-screen sm:mx-6">

            <div className="mx-auto max-w-7xl pb-10">
                <div className="mt-2 sm:mt-4">
                    <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Your cart' }]} />
                </div>
                <h1 className="mb-5 mt-2 text-3xl font-semibold leading-tight tracking-tighter text-ink sm:text-4xl">Your cart <span className="text-base font-medium tracking-normal text-muted">({itemCount} {itemCount === 1 ? 'item' : 'items'})</span></h1>

                {undoNotice && <div className="mb-4">{undoNotice}</div>}

                <div className="flex flex-wrap items-start gap-6">

                    <section aria-label="Items in your cart" className="flex min-w-0 flex-[999_1_480px] flex-col gap-3.5">
                        {
                            cartArray.map((item) => {
                                const firstImage = item.images?.[0]
                                const imageUrl = typeof firstImage === 'string' ? firstImage : mediaUrl(firstImage, 'product')
                                const categoryTitle = typeof item.category === 'object' && item.category ? item.category.title : item.category

                                return (
                                    <article key={item.id} className="flex items-center gap-3 rounded-card border border-line bg-surface p-3 sm:gap-5 sm:p-4">
                                        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-tile bg-surface-muted sm:size-32">
                                            {imageUrl && <Image src={imageUrl} className="size-full object-cover" alt="" width={256} height={256} sizes="(min-width: 640px) 128px, 96px" />}
                                        </div>
                                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    {categoryTitle && <p className="text-sm text-muted">{categoryTitle}</p>}
                                                    <Link href={`/product/${item.id}`} className="-my-0.5 inline-block py-0.5 text-base font-semibold leading-snug tracking-tight text-ink [overflow-wrap:anywhere] hover:underline hover:underline-offset-4 sm:text-lg sm:tracking-tight">{item.name}</Link>
                                                </div>
                                                {/* M44 made removal reachable on a phone; M65 keeps one 44px button at every width. */}
                                                <button type="button" aria-label={`Remove ${item.name}`} onClick={() => handleDeleteItemFromCart(item.id)} className="-mr-1.5 -mt-1.5 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-3 transition hover:bg-surface-muted hover:text-sale active:scale-95">
                                                    <Trash2Icon size={18} aria-hidden="true" />
                                                </button>
                                            </div>
                                            <p className="text-base font-semibold text-ink sm:text-lg">{formatPKR(item.price)}</p>
                                            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                                <Counter productId={item.id} name={item.name} removeAtOne={false} />
                                                <p className="text-sm text-muted">Item total <strong className="whitespace-nowrap text-ink">{formatPKR(item.price * item.quantity)}</strong></p>
                                            </div>
                                        </div>
                                    </article>
                                )
                            })
                        }
                        <Link href="/shop" className="inline-flex min-h-11 items-center gap-2 self-start rounded-full px-1 text-sm font-semibold text-primary hover:underline hover:underline-offset-4">
                            <ArrowLeftIcon size={18} aria-hidden="true" /> Continue shopping
                        </Link>
                    </section>

                    <OrderSummary totalPrice={totalPrice} items={cartArray} />
                </div>
            </div>
        </div>
    ) : (
        <div className="mx-4 flex min-h-[60vh] flex-col items-center gap-4 pt-8 sm:mx-6 sm:pt-16">
            <h1 className="sr-only">Your cart</h1>
            {undoNotice && <div className="w-full max-w-md">{undoNotice}</div>}
            <EmptyState
                icon={<ShoppingCartIcon size={36} strokeWidth={1.4} />}
                title="Your cart is empty"
                text="Add something you love. You pay cash when it arrives, and no account is needed."
                action={{ href: '/shop', label: 'Shop all products' }}
                secondaryAction={{ href: '/categories', label: 'Browse categories' }}
                wide
            />
        </div>
    )
}
