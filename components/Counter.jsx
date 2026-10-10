'use client'
import { addToCart, removeFromCart } from "@/lib/features/cart/cartSlice";
import { useDispatch, useSelector } from "react-redux";

const Counter = ({ productId }) => {

    const { cartItems } = useSelector(state => state.cart);

    const dispatch = useDispatch();

    const addToCartHandler = () => {
        dispatch(addToCart({ productId }))
    }

    const removeFromCartHandler = () => {
        dispatch(removeFromCart({ productId }))
    }

    return (
        <div className="inline-flex items-center rounded border border-slate-200 max-sm:text-sm text-slate-600">
            <button type="button" aria-label="Decrease quantity" onClick={removeFromCartHandler} className="size-11 select-none">-</button>
            <p className="min-w-6 text-center" aria-live="polite">{cartItems[productId]}</p>
            <button type="button" aria-label="Increase quantity" onClick={addToCartHandler} className="size-11 select-none">+</button>
        </div>
    )
}

export default Counter