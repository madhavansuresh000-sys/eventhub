import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'

import { fetchMyWaitlist } from '../api/waitlist'
import { describeError } from '../hooks/useAsync'
import { logout, sessionExpired } from './authSlice'

/**
 * The student's waitlist places, from the API since Phase 7 (api/waitlist.js).
 * Kept in Redux (not only in the page) because My tickets also shows "seat offer waiting".
 * Bookings and tickets are loaded by their pages (api/bookings.js).
 */

export const loadWaitlist = createAsyncThunk('student/loadWaitlist', async (_, { rejectWithValue }) => {
  try {
    return await fetchMyWaitlist()
  } catch (e) {
    return rejectWithValue(describeError(e))
  }
})

const initialState = { waitlist: [], loading: false, error: null }

const studentSlice = createSlice({
  name: 'student',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadWaitlist.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadWaitlist.fulfilled, (state, action) => {
        state.loading = false
        state.waitlist = action.payload
      })
      .addCase(loadWaitlist.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload?.message ?? 'Could not load your waitlist.'
      })
      .addCase(logout.fulfilled, () => initialState)
      .addCase(sessionExpired, () => initialState)
  },
})

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

export const selectWaitlistState = (state) => state.student

/** Places still in a queue: WAITING or OFFERED (the others are history). */
export const selectOpenWaitlist = createSelector([(state) => state.student.waitlist],
  (waitlist) => waitlist.filter((w) => w.status === 'WAITING' || w.status === 'OFFERED'))
