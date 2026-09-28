import { createSelector, createSlice } from '@reduxjs/toolkit'

import { sampleWaitlist } from '../data/sampleStudent'

/**
 * The student's waitlist places (sample data until Phase 7). Bookings and tickets come from the
 * API since Phase 6 (api/bookings.js). Redux Toolkit lets us "change" state directly (Immer copies it).
 */

const studentSlice = createSlice({
  name: 'student',
  initialState: { waitlist: sampleWaitlist },
  reducers: {
    waitlistJoined: (state, action) => {
      if (!state.waitlist.some((w) => w.eventId === action.payload.eventId)) state.waitlist.push(action.payload)
    },
    waitlistLeft: (state, action) => {
      state.waitlist = state.waitlist.filter((w) => w.eventId !== action.payload)
    },
  },
})

export const { waitlistJoined, waitlistLeft } = studentSlice.actions
export default studentSlice.reducer

/**
 * The logged-in user as the student pages show them (from the auth slice, Phase 5).
 * createSelector: the same object comes back until the user changes, so pages do not re-render for nothing.
 */
export const selectStudent = createSelector([(state) => state.auth.user], (user) => user && {
  name: user.fullName,
  email: user.email,
  // "CSE, Year 3" - either part may be missing (e.g. the admin account)
  course: [user.department, user.yearOfStudy && `Year ${user.yearOfStudy}`].filter(Boolean).join(', ') || null,
})
export const selectWaitlist = (state) => state.student.waitlist
