'use client'
import { addToCart, removeFromCart } from "@/lib/features/cart/cartSlice";
import { useDispatch, useSelector } from "react-redux";
import QuantityStepper from "./ui/QuantityStepper";

// M61: behaviour unchanged (same actions, same cart state); the control itself is the shared
// QuantityStepper.
const Counter = ({ productId }) => {

    const { cartItems } = useSelector(state => state.cart);

    const dispatch = useDispatch();

    return (
        <QuantityStepper
            value={cartItems[productId]}
            onIncrease={() => dispatch(addToCart({ productId }))}
            onDecrease={() => dispatch(removeFromCart({ productId }))}
        />
    )
}

export default Counter
