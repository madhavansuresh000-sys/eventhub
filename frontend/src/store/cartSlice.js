import { createSlice } from '@reduxjs/toolkit'

import { logout, sessionExpired } from './authSlice'

/**
 * The "cart" of EventHub: a copy of the student's HELD booking (the real hold lives on the server,
 * Phase 6), so the navbar can show the countdown on every page and lead back to checkout.
 */
const cartSlice = createSlice({
  name: 'cart',
  initialState: { item: null, holdEndsAt: null },
  reducers: {
    seatsHeld: {
      reducer: (state, action) => {
        state.item = action.payload.item
        state.holdEndsAt = action.payload.holdEndsAt
      },
      /**
       * booking = the server's answer. Its secondsLeft was counted by the SERVER, so we add it to this
       * computer's clock: the countdown is right even if the student's clock is a few minutes wrong.
       * ("prepare" runs before the reducer: the place for Date.now(), since reducers must be pure.)
       */
      prepare: (booking) => ({
        payload: {
          item: { bookingId: booking.id, eventId: booking.event.id, title: booking.event.title, quantity: booking.quantity },
          holdEndsAt: Date.now() + booking.secondsLeft * 1000,
        },
      }),
    },
    cartCleared: (state) => {
      state.item = null
      state.holdEndsAt = null
    },
  },
  // the seats were held for this person: drop them when they log out
  extraReducers: (builder) => {
    builder
      .addCase(logout.fulfilled, () => ({ item: null, holdEndsAt: null }))
      .addCase(sessionExpired, () => ({ item: null, holdEndsAt: null }))
  },
})

export const { seatsHeld, cartCleared } = cartSlice.actions
export default cartSlice.reducer

export const selectCart = (state) => state.cart
