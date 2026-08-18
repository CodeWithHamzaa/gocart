import { createSlice } from '@reduxjs/toolkit'

// M28: inlined from assets/assets.js. Still a dummy default address —
// M31 replaces this with real guest-checkout address capture.
const addressDummyData = {
    id: "addr_1",
    userId: "user_1",
    name: "John Doe",
    email: "johndoe@example.com",
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "USA",
    phone: "1234567890",
    createdAt: 'Sat Jul 19 2025 14:51:25 GMT+0530 (India Standard Time)',
}

const addressSlice = createSlice({
    name: 'address',
    initialState: {
        list: [addressDummyData],
    },
    reducers: {
        addAddress: (state, action) => {
            state.list.push(action.payload)
        },
    }
})

export const { addAddress } = addressSlice.actions

export default addressSlice.reducer