'use client'
import { addToCart, removeFromCart } from "@/lib/features/cart/cartSlice";
import { useDispatch, useSelector } from "react-redux";

// M45a: pill-shaped stepper on the storefront tokens; behaviour unchanged.
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
        <div className="inline-flex shrink-0 items-center rounded-full border border-line bg-white max-sm:text-sm text-ink">
            <button type="button" aria-label="Decrease quantity" onClick={removeFromCartHandler} className="size-11 select-none rounded-full text-lg transition hover:bg-canvas">-</button>
            <p className="min-w-6 text-center font-semibold" aria-live="polite">{cartItems[productId]}</p>
            <button type="button" aria-label="Increase quantity" onClick={addToCartHandler} className="size-11 select-none rounded-full text-lg transition hover:bg-canvas">+</button>
        </div>
    )
}

export default Counter
