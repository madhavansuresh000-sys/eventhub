import { createSlice } from '@reduxjs/toolkit'

import { currentStudent, sampleTickets, sampleWaitlist } from '../data/sampleStudent'

/**
 * The student's tickets and waitlist places (sample data until Phase 4 / 6).
 * Same reducer idea as before: (current state, action) -> new state.
 * Redux Toolkit lets us "change" state directly; it makes the safe copy for us (Immer).
 */

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const studentSlice = createSlice({
  name: 'student',
  initialState: { profile: currentStudent, tickets: sampleTickets, waitlist: sampleWaitlist },
  reducers: {
    ticketsBooked: {
      reducer: (state, action) => {
        state.tickets.unshift(action.payload)
      },
      /** dispatch(ticketsBooked(event, quantity)) returns the action; action.payload.id is the new ticket id */
      prepare: (event, quantity) => {
        const number = String(Date.now()).slice(-5)
        return {
          payload: {
            ...event,
            id: `T-${number}`,
            code: `EVH-${number}-${randomCode()}`,
            quantity,
            status: 'CONFIRMED',
            bookedAt: new Date().toISOString(),
          },
        }
      },
    },
    ticketCancelled: (state, action) => {
      const ticket = state.tickets.find((t) => t.id === action.payload)
      if (ticket) ticket.status = 'CANCELLED'
    },
    waitlistJoined: (state, action) => {
      if (!state.waitlist.some((w) => w.eventId === action.payload.eventId)) state.waitlist.push(action.payload)
    },
    waitlistLeft: (state, action) => {
      state.waitlist = state.waitlist.filter((w) => w.eventId !== action.payload)
    },
  },
})

export const { ticketsBooked, ticketCancelled, waitlistJoined, waitlistLeft } = studentSlice.actions
export default studentSlice.reducer

export const selectStudent = (state) => state.student.profile
export const selectTickets = (state) => state.student.tickets
export const selectWaitlist = (state) => state.student.waitlist
