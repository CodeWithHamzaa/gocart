import { createSlice } from '@reduxjs/toolkit'

const cartSlice = createSlice({
    name: 'cart',
    initialState: {
        total: 0,
        cartItems: {},
    },
    reducers: {
        addToCart: (state, action) => {
            const { productId } = action.payload
            if (state.cartItems[productId]) {
                state.cartItems[productId]++
            } else {
                state.cartItems[productId] = 1
            }
            state.total += 1
        },
        removeFromCart: (state, action) => {
            const { productId } = action.payload
            if (state.cartItems[productId]) {
                state.cartItems[productId]--
                if (state.cartItems[productId] === 0) {
                    delete state.cartItems[productId]
                }
            }
            state.total -= 1
        },
        deleteItemFromCart: (state, action) => {
            const { productId } = action.payload
            state.total -= state.cartItems[productId] ? state.cartItems[productId] : 0
            delete state.cartItems[productId]
        },
        clearCart: (state) => {
            state.cartItems = {}
            state.total = 0
        },
        // M30: replaces cartItems wholesale (from localStorage, on mount) and
        // recomputes total from it rather than trusting a persisted total,
        // so a stored total can never drift from the items it should match.
        hydrateCart: (state, action) => {
            const cartItems = action.payload?.cartItems ?? {}
            state.cartItems = cartItems
            state.total = Object.values(cartItems).reduce((sum, qty) => sum + qty, 0)
        },
    }
})

export const { addToCart, removeFromCart, clearCart, deleteItemFromCart, hydrateCart } = cartSlice.actions

export default cartSlice.reducer
