import { createSlice } from '@reduxjs/toolkit'

export const HOLD_MINUTES = 10

/**
 * The "cart" of EventHub: the seats a student is about to book, and until when they are held.
 * Kept in the store (not in the Checkout page), so the timer keeps running if the student
 * looks at another page and comes back. Phase 6 makes the hold real on the server.
 */
const cartSlice = createSlice({
  name: 'cart',
  initialState: { item: null, holdEndsAt: null },
  reducers: {
    seatsHeld: {
      /** item: the event fields a ticket needs + quantity */
      reducer: (state, action) => {
        state.item = action.payload.item
        state.holdEndsAt = action.payload.holdEndsAt
      },
      // "prepare" runs before the reducer: the place for Date.now(), since reducers must be pure
      prepare: (item) => ({ payload: { item, holdEndsAt: Date.now() + HOLD_MINUTES * 60 * 1000 } }),
    },
    cartCleared: (state) => {
      state.item = null
      state.holdEndsAt = null
    },
  },
})

export const { seatsHeld, cartCleared } = cartSlice.actions
export default cartSlice.reducer

export const selectCart = (state) => state.cart
