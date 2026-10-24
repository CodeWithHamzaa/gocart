'use client'
import Counter from "@/components/Counter";
import OrderSummary from "@/components/OrderSummary";
import Breadcrumb from "@/components/ui/Breadcrumb";
import EmptyState from "@/components/ui/EmptyState";
import { deleteItemFromCart } from "@/lib/features/cart/cartSlice";
import { ArrowLeftIcon, ShoppingCartIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { formatPKR } from '@/lib/currency'
import { tileFor } from '@/lib/category-style'

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

    const handleDeleteItemFromCart = (productId) => {
        dispatch(deleteItemFromCart({ productId }))
    }

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

    // M65: the redesigned layout (design: Cart / CartMobile). Items are cards, not a table; the
    // summary panel carries the checkout steps (OrderSummary). Checkout stays on /cart (owner decision).
    const itemCount = cartArray.reduce((sum, item) => sum + item.quantity, 0)

    return cartArray.length > 0 ? (
        <div className="mx-4 min-h-screen sm:mx-6">

            <div className="mx-auto max-w-[1120px] pb-10">
                <div className="mt-2 sm:mt-4">
                    <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'My Cart' }]} />
                </div>
                <h1 className="mb-5 mt-2 text-[28px] font-extrabold tracking-[-0.02em] text-ink sm:text-4xl">My Cart <span className="text-base font-semibold text-muted">({itemCount} {itemCount === 1 ? 'item' : 'items'})</span></h1>

                <div className="flex flex-wrap items-start gap-6">

                    <section aria-label="Items in your cart" className="flex min-w-0 flex-[999_1_480px] flex-col gap-3.5">
                        {
                            cartArray.map((item) => {
                                const firstImage = item.images?.[0]
                                const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url
                                const categoryTitle = typeof item.category === 'object' && item.category ? item.category.title : item.category

                                return (
                                    <article key={item.id} className="flex items-center gap-3 rounded-[22px] bg-white p-3 shadow-card ring-1 ring-line sm:gap-5 sm:p-4">
                                        <div className={`flex size-24 shrink-0 items-center justify-center rounded-tile sm:size-32 ${tileFor(item.id)}`}>
                                            {imageUrl && <Image src={imageUrl} className="h-3/4 w-3/4 object-contain mix-blend-multiply" alt="" width={96} height={96} sizes="96px" />}
                                        </div>
                                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <Link href={`/product/${item.id}`} className="text-[15px] font-bold leading-snug text-ink [overflow-wrap:anywhere] hover:text-primary sm:text-[17px]">{item.name}</Link>
                                                    {categoryTitle && <p className="text-[13px] text-muted">{categoryTitle}</p>}
                                                </div>
                                                {/* M44 made removal reachable on a phone; M65 keeps one 44px button at every width. */}
                                                <button type="button" aria-label={`Remove ${item.name}`} onClick={() => handleDeleteItemFromCart(item.id)} className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-strike transition hover:bg-pink-soft hover:text-pink-dark active:scale-95">
                                                    <Trash2Icon size={18} aria-hidden="true" />
                                                </button>
                                            </div>
                                            <p className="text-lg font-extrabold text-primary">{formatPKR(item.price)}</p>
                                            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                                <Counter productId={item.id} />
                                                <p className="text-sm text-muted">Item total <strong className="whitespace-nowrap text-ink">{formatPKR(item.price * item.quantity)}</strong></p>
                                            </div>
                                        </div>
                                    </article>
                                )
                            })
                        }
                        <Link href="/shop" className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-primary hover:text-primary-dark">
                            <ArrowLeftIcon size={18} aria-hidden="true" /> Continue shopping
                        </Link>
                    </section>

                    <OrderSummary totalPrice={totalPrice} items={cartArray} />
                </div>
            </div>
        </div>
    ) : (
        <div className="mx-4 flex min-h-[70vh] items-center justify-center sm:mx-6">
            <h1 className="sr-only">My Cart</h1>
            <EmptyState
                icon={<ShoppingCartIcon size={36} strokeWidth={1.4} />}
                title="Your cart is empty"
                text="Browse categories and add something you love."
                action={{ href: '/categories', label: 'Browse categories' }}
            />
        </div>
    )
}
