import { configureStore } from '@reduxjs/toolkit'
import cartReducer from './features/cart/cartSlice'
import wishlistReducer from './features/wishlist/wishlistSlice'
import addressReducer from './features/address/addressSlice'

export const makeStore = () => {
    return configureStore({
        reducer: {
            cart: cartReducer,
            address: addressReducer,
            wishlist: wishlistReducer,
        },
    })
}