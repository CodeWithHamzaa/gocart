'use client'
import { addToCart, removeFromCart } from "@/lib/features/cart/cartSlice";
import { useDispatch, useSelector } from "react-redux";
import QuantityStepper from "./ui/QuantityStepper";

// M61: behaviour unchanged (same actions, same cart state); the control itself is the shared
// QuantityStepper. Milestone 120: `removeAtOne` is passed through (false on the cart page).
const Counter = ({ productId, name = '', removeAtOne = true }) => {

    const { cartItems } = useSelector(state => state.cart);

    const dispatch = useDispatch();

    return (
        <QuantityStepper
            value={cartItems[productId]}
            name={name}
            removeAtOne={removeAtOne}
            onIncrease={() => dispatch(addToCart({ productId }))}
            onDecrease={() => dispatch(removeFromCart({ productId }))}
        />
    )
}

export default Counter
