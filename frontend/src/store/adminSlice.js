import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import { approveEventRequest, fetchAuditLog, fetchClubStats, fetchPendingEvents, rejectEventRequest } from '../api/admin'
import { describeError } from '../hooks/useAsync'
import { logout, sessionExpired } from './authSlice'

/**
 * Admin data from the backend: the approval queue, one stats row per club,
 * and the audit log (who created / edited / submitted / approved / rejected what).
 */

export const loadApprovalQueue = createAsyncThunk('admin/loadQueue', async (_, { rejectWithValue }) => {
  try {
    return await fetchPendingEvents()
  } catch (e) {
    return rejectWithValue(describeError(e))
  }
})

export const loadAuditLog = createAsyncThunk('admin/loadAudit', async (_, { rejectWithValue }) => {
  try {
    return (await fetchAuditLog({ size: 10 })).content
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

function removeFromQueue(state, event) {
  state.queue = state.queue.filter((e) => e.id !== event.id)
}

const initialState = { queue: [], queueLoad: load, stats: [], statsLoad: load, audit: [], auditLoad: load }

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    tracked(builder, loadApprovalQueue, 'queueLoad', (state, events) => {
      state.queue = events
    })
    tracked(builder, loadClubStats, 'statsLoad', (state, rows) => {
      state.stats = rows
    })
    tracked(builder, loadAuditLog, 'auditLoad', (state, entries) => {
      state.audit = entries
    })
    builder
      .addCase(approveEvent.fulfilled, (state, action) => removeFromQueue(state, action.payload))
      .addCase(rejectEvent.fulfilled, (state, action) => removeFromQueue(state, action.payload))
      .addCase(logout.fulfilled, () => initialState)
      .addCase(sessionExpired, () => initialState)
  },
})

export default adminSlice.reducer

export const selectApprovalQueue = (state) => state.admin.queue
export const selectQueueLoad = (state) => state.admin.queueLoad
export const selectClubStats = (state) => state.admin.stats
export const selectStatsLoad = (state) => state.admin.statsLoad
export const selectAuditLog = (state) => state.admin.audit
