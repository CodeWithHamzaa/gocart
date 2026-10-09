import { createSlice } from '@reduxjs/toolkit'

// M33: starts empty. The old US-shaped dummy address was selectable at checkout and
// would fail server-side validation; guests add a real one via AddressModal (M31).
const addressSlice = createSlice({
    name: 'address',
    initialState: {
        list: [],
    },
    reducers: {
        addAddress: (state, action) => {
            state.list.push(action.payload)
        },
    }
})

export const { addAddress } = addressSlice.actions

export default addressSlice.reducer