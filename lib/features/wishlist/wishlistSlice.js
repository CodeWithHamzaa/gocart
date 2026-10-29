import { createSlice } from '@reduxjs/toolkit'

// M91 (ADR-041): a browser-only wishlist. There are no customer accounts (admin-only auth), so
// like the cart (ADR-023) it lives in localStorage and never syncs across devices. Product ids are
// stored as strings so a number and its string form can never both be saved.
const wishlistSlice = createSlice({
    name: 'wishlist',
    initialState: { ids: [] },
    reducers: {
        toggleWishlist: (state, action) => {
            const id = String(action.payload.productId)
            state.ids = state.ids.includes(id) ? state.ids.filter((x) => x !== id) : [...state.ids, id]
        },
        // Replaces ids wholesale from localStorage on mount; anything that is not a string is dropped.
        hydrateWishlist: (state, action) => {
            const ids = Array.isArray(action.payload?.ids) ? action.payload.ids : []
            state.ids = [...new Set(ids.filter((x) => typeof x === 'string' && x.length > 0))]
        },
    },
})

export const { toggleWishlist, hydrateWishlist } = wishlistSlice.actions

export default wishlistSlice.reducer
