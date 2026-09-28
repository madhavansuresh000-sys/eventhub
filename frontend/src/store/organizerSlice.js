import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import { fetchClubs } from '../api/events'
import { createEvent, fetchClubEvents, submitEventForApproval, updateEvent } from '../api/organizer'
import { sampleVolunteers } from '../data/sampleVolunteers'
import { describeError } from '../hooks/useAsync'
import { approveEvent, rejectEvent } from './adminSlice'
import { clubsWithRole, logout, sessionExpired } from './authSlice'

// ---- async thunks: each one calls the API and has 3 outcomes: pending -> fulfilled / rejected ----
// rejectWithValue(describeError(e)) keeps the backend's message and field errors for the page.

/**
 * The club + all its events (drafts too). Which club: the one picked in the sidebar,
 * else the first club the logged-in user organizes (from GET /api/auth/me).
 */
export const loadClubEvents = createAsyncThunk('organizer/loadClubEvents', async (_, { getState, rejectWithValue }) => {
  const mine = clubsWithRole(getState().auth.user, 'ORGANIZER')
  const picked = getState().organizer.clubId
  const clubId = mine.some((c) => c.clubId === picked) ? picked : mine[0]?.clubId
  if (!clubId) return rejectWithValue({ message: 'You are not an organizer of any club.' })
  try {
    const [clubs, events] = await Promise.all([fetchClubs(), fetchClubEvents(clubId)])
    return { clubId, club: clubs.find((c) => c.id === clubId) ?? null, events }
  } catch (e) {
    return rejectWithValue(describeError(e))
  }
})

/**
 * Create (no id) or update, then optionally submit for approval. The backend checks every rule
 * (EventRequest + EventService); if one is broken the page gets { message, fieldErrors }.
 */
export const saveEvent = createAsyncThunk('organizer/saveEvent', async ({ id, form, submit }, { getState, rejectWithValue }) => {
  const body = { ...form, clubId: getState().organizer.clubId }
  try {
    const saved = id ? await updateEvent(id, body) : await createEvent(body)
    return submit ? await submitEventForApproval(saved.id) : saved
  } catch (e) {
    return rejectWithValue(describeError(e))
  }
})

/** DRAFT -> PENDING_APPROVAL */
export const submitEvent = createAsyncThunk('organizer/submitEvent', async (id, { rejectWithValue }) => {
  try {
    return await submitEventForApproval(id)
  } catch (e) {
    return rejectWithValue(describeError(e))
  }
})

/** Put the event the server sent back into the list (replace, or add if it is new). */
function upsert(state, event) {
  const i = state.events.findIndex((e) => e.id === event.id)
  if (i >= 0) state.events[i] = event
  else state.events.push(event)
  state.events.sort((a, b) => a.startTime.localeCompare(b.startTime))
}

const initialState = {
  clubId: null, // set from the logged-in user's clubs
  club: null,
  events: [],
  status: 'idle', // idle -> loading -> ready | failed
  error: null,
  volunteers: sampleVolunteers, // sample until volunteer gate duty is stored (Phase 7 check-in)
}

const organizerSlice = createSlice({
  name: 'organizer',
  initialState,
  reducers: {
    /** Someone who organizes 2+ clubs picked another one in the sidebar. */
    clubSelected: (state, action) => {
      state.clubId = action.payload
    },
    volunteerAdded: (state, action) => {
      const id = Math.max(0, ...state.volunteers.map((v) => v.id)) + 1
      state.volunteers.push({ ...action.payload, id, eventId: Number(action.payload.eventId) })
    },
    volunteerRemoved: (state, action) => {
      state.volunteers = state.volunteers.filter((v) => v.id !== action.payload)
    },
  },
  // extraReducers: react to thunks (ours and the admin's)
  extraReducers: (builder) => {
    builder
      .addCase(loadClubEvents.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadClubEvents.fulfilled, (state, action) => {
        state.status = 'ready'
        state.clubId = action.payload.clubId
        state.club = action.payload.club
        state.events = action.payload.events
      })
      .addCase(loadClubEvents.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload?.message ?? action.error.message
      })
      .addCase(saveEvent.fulfilled, (state, action) => upsert(state, action.payload))
      .addCase(submitEvent.fulfilled, (state, action) => upsert(state, action.payload))
      // the admin approved / sent back one of our events: show the new status without reloading
      .addCase(approveEvent.fulfilled, (state, action) => {
        if (state.events.some((e) => e.id === action.payload.id)) upsert(state, action.payload)
      })
      .addCase(rejectEvent.fulfilled, (state, action) => {
        if (state.events.some((e) => e.id === action.payload.id)) upsert(state, action.payload)
      })
      // a different person may log in next on this computer: forget this club's data
      .addCase(logout.fulfilled, () => initialState)
      .addCase(sessionExpired, () => initialState)
  },
})

export const { clubSelected, volunteerAdded, volunteerRemoved } = organizerSlice.actions
export default organizerSlice.reducer

export const selectOrganizer = (state) => state.organizer
export const selectClub = (state) => state.organizer.club
export const selectClubEvents = (state) => state.organizer.events
export const selectVolunteers = (state) => state.organizer.volunteers
