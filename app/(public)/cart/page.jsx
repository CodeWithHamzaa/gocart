'use client'
import Counter from "@/components/Counter";
import OrderSummary from "@/components/OrderSummary";
import PageTitle from "@/components/PageTitle";
import { deleteItemFromCart } from "@/lib/features/cart/cartSlice";
import { Trash2Icon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

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

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'Rs. ';

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

    return cartArray.length > 0 ? (
        <div className="min-h-screen mx-6 text-slate-800">

            <div className="max-w-7xl mx-auto ">
                {/* Title */}
                <PageTitle heading="My Cart" text="items in your cart" linkText="Add more" />

                <div className="flex items-start justify-between gap-5 max-lg:flex-col">

                    <table className="w-full max-w-4xl text-slate-600 table-auto">
                        <thead>
                            <tr className="max-sm:text-sm">
                                <th className="text-left">Product</th>
                                <th>Quantity</th>
                                <th>Total Price</th>
                                <th className="max-md:hidden">Remove</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                cartArray.map((item, index) => {
                                    const firstImage = item.images?.[0]
                                    const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url
                                    const categoryTitle = typeof item.category === 'object' && item.category ? item.category.title : item.category

                                    return (
                                    <tr key={index} className="space-x-2">
                                        <td className="flex gap-3 my-4">
                                            <div className="flex gap-3 items-center justify-center bg-slate-100 size-18 rounded-md">
                                                {imageUrl && <Image src={imageUrl} className="h-14 w-auto" alt="" width={45} height={45} />}
                                            </div>
                                            <div>
                                                <p className="max-sm:text-sm">{item.name}</p>
                                                <p className="text-xs text-slate-500">{categoryTitle}</p>
                                                <p>{currency}{item.price}</p>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <Counter productId={item.id} />
                                        </td>
                                        <td className="text-center">{currency}{(item.price * item.quantity).toLocaleString()}</td>
                                        <td className="text-center max-md:hidden">
                                            <button onClick={() => handleDeleteItemFromCart(item.id)} className=" text-red-500 hover:bg-red-50 p-2.5 rounded-full active:scale-95 transition-all">
                                                <Trash2Icon size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                    )
                                })
                            }
                        </tbody>
                    </table>
                    <OrderSummary totalPrice={totalPrice} items={cartArray} />
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
            <h1 className="text-2xl sm:text-4xl font-semibold">Your cart is empty</h1>
        </div>
    )
}