import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import { approveEventRequest, fetchClubStats, fetchPendingEvents, rejectEventRequest } from '../api/admin'
import { describeError } from '../hooks/useAsync'

/**
 * Admin data from the backend: the approval queue and one stats row per club.
 * "decisions" is only this browser session's history (an audit log table could come later).
 */

export const loadApprovalQueue = createAsyncThunk('admin/loadQueue', async (_, { rejectWithValue }) => {
  try {
    return await fetchPendingEvents()
  } catch (e) {
    return rejectWithValue(describeError(e))
  }
})

export const loadClubStats = createAsyncThunk('admin/loadStats', async (_, { rejectWithValue }) => {
  try {
    return await fetchClubStats()
  } catch (e) {
    return rejectWithValue(describeError(e))
  }
})

/** PENDING_APPROVAL -> PUBLISHED. The server answers with the updated event. */
export const approveEvent = createAsyncThunk('admin/approve', async (event, { rejectWithValue }) => {
  try {
    return await approveEventRequest(event.id)
  } catch (e) {
    return rejectWithValue(describeError(e))
  }
})

/** PENDING_APPROVAL -> DRAFT with a note for the organizer. */
export const rejectEvent = createAsyncThunk('admin/reject', async ({ event, reason }, { rejectWithValue }) => {
  try {
    return await rejectEventRequest(event.id, reason.trim())
  } catch (e) {
    return rejectWithValue(describeError(e))
  }
})

const load = { status: 'idle', error: null } // idle -> loading -> ready | failed

function tracked(builder, thunk, key, onData) {
  builder
    .addCase(thunk.pending, (state) => {
      state[key] = { status: 'loading', error: null }
    })
    .addCase(thunk.fulfilled, (state, action) => {
      state[key] = { status: 'ready', error: null }
      onData(state, action.payload)
    })
    .addCase(thunk.rejected, (state, action) => {
      state[key] = { status: 'failed', error: action.payload?.message ?? action.error.message }
    })
}

function decided(state, event, approved, reason) {
  state.queue = state.queue.filter((e) => e.id !== event.id)
  state.decisions.unshift({ eventId: event.id, title: event.title, club: event.club, approved, reason, at: new Date().toISOString() })
  state.decisions.splice(10) // keep the newest 10
}

const adminSlice = createSlice({
  name: 'admin',
  initialState: { queue: [], queueLoad: load, stats: [], statsLoad: load, decisions: [] },
  reducers: {},
  extraReducers: (builder) => {
    tracked(builder, loadApprovalQueue, 'queueLoad', (state, events) => {
      state.queue = events
    })
    tracked(builder, loadClubStats, 'statsLoad', (state, rows) => {
      state.stats = rows
    })
    builder
      .addCase(approveEvent.fulfilled, (state, action) => decided(state, action.payload, true, null))
      .addCase(rejectEvent.fulfilled, (state, action) => decided(state, action.payload, false, action.payload.reviewNote))
  },
})

export default adminSlice.reducer

export const selectApprovalQueue = (state) => state.admin.queue
export const selectQueueLoad = (state) => state.admin.queueLoad
export const selectClubStats = (state) => state.admin.stats
export const selectStatsLoad = (state) => state.admin.statsLoad
export const selectDecisions = (state) => state.admin.decisions
