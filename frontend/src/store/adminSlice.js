import { createSelector, createSlice } from '@reduxjs/toolkit'

import { allClubs, codingClubSubmitter, otherClubEvents } from '../data/sampleAdmin'
import { eventSaved, selectClub, selectClubEvents } from './organizerSlice'

/**
 * Admin view of ALL clubs. The Coding Club's events live in the organizer slice (so approving here
 * changes the organizer dashboard too); the other four clubs' events live here.
 */
const adminSlice = createSlice({
  name: 'admin',
  initialState: { otherEvents: otherClubEvents, decisions: [] },
  reducers: {
    otherEventSaved: (state, action) => {
      const i = state.otherEvents.findIndex((e) => e.id === action.payload.id)
      state.otherEvents[i] = action.payload
    },
    decisionRecorded: {
      reducer: (state, action) => {
        state.decisions.unshift(action.payload)
        state.decisions.splice(10) // keep the newest 10
      },
      prepare: (decision) => ({ payload: { ...decision, at: new Date().toISOString() } }),
    },
  },
})

const { otherEventSaved, decisionRecorded } = adminSlice.actions
export default adminSlice.reducer

// ---- selectors: createSelector remembers the answer until its inputs change ----

const selectOtherEvents = (state) => state.admin.otherEvents
export const selectDecisions = (state) => state.admin.decisions

/** Every club's events, each with its club object attached. */
export const selectAllEvents = createSelector([selectClubEvents, selectClub, selectOtherEvents], (clubEvents, club, others) => {
  const clubById = Object.fromEntries(allClubs.map((c) => [c.id, c]))
  const mine = clubEvents.map((e) => ({ ...e, clubId: club.id, submittedBy: e.submittedBy ?? codingClubSubmitter }))
  return [...mine, ...others].map((e) => ({ ...e, club: clubById[e.clubId] }))
})

/** Waiting for approval, the event that starts soonest first (it is the most urgent). */
export const selectApprovalQueue = createSelector([selectAllEvents], (events) =>
  events.filter((e) => e.status === 'PENDING_APPROVAL').sort((a, b) => a.startTime.localeCompare(b.startTime)),
)

/** One row per club: published events, waiting, tickets sold and money collected. */
export const selectClubStats = createSelector([selectAllEvents], (events) =>
  allClubs.map((club) => {
    const own = events.filter((e) => e.clubId === club.id)
    const published = own.filter((e) => e.status === 'PUBLISHED')
    return {
      club,
      published: published.length,
      pending: own.filter((e) => e.status === 'PENDING_APPROVAL').length,
      sold: published.reduce((n, e) => n + e.totalSeats - e.availableSeats, 0),
      revenue: published.reduce((n, e) => n + (e.totalSeats - e.availableSeats) * e.price, 0),
    }
  }),
)

// ---- thunks: the same checks as EventService.approve / reject ----

function reviewEvent(event, approve, reason) {
  return (dispatch, getState) => {
    if (!approve && !reason?.trim()) throw new Error('A reason is required to send an event back.')
    const current = selectAllEvents(getState()).find((e) => e.id === event.id)
    if (current?.status !== 'PENDING_APPROVAL') {
      throw new Error(`Only events waiting for approval can be reviewed (this one is ${current?.status}).`)
    }
    const { club, clubId, submittedBy, ...stored } = current // drop the fields the selector added
    const reviewed = approve
      ? { ...stored, status: 'PUBLISHED', reviewNote: null }
      : { ...stored, status: 'DRAFT', reviewNote: reason.trim() }

    if (clubId === selectClub(getState()).id) dispatch(eventSaved(reviewed))
    else dispatch(otherEventSaved({ ...reviewed, clubId, submittedBy }))

    dispatch(decisionRecorded({ eventId: event.id, title: event.title, club, approved: approve, reason: approve ? null : reason.trim() }))
  }
}

/** PENDING_APPROVAL -> PUBLISHED */
export const approveEvent = (event) => reviewEvent(event, true)
/** PENDING_APPROVAL -> DRAFT with a note for the organizer */
export const rejectEvent = (event, reason) => reviewEvent(event, false, reason)
