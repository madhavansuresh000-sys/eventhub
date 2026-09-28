import { createSlice } from '@reduxjs/toolkit'

import { organizerClub, sampleClubEvents, sampleVolunteers } from '../data/sampleOrganizer'

/**
 * The organizer's club, its events (every status) and volunteers (sample data until Phase 4).
 * Reducers only store results. The RULES (copied from the backend's EventService) live in the
 * thunks below: they check first and throw an Error, so the page can show the message.
 */
const organizerSlice = createSlice({
  name: 'organizer',
  initialState: { club: organizerClub, events: sampleClubEvents, volunteers: sampleVolunteers },
  reducers: {
    eventSaved: (state, action) => {
      const i = state.events.findIndex((e) => e.id === action.payload.id)
      if (i >= 0) state.events[i] = action.payload
      else state.events.push(action.payload)
    },
    volunteerAdded: (state, action) => {
      const id = Math.max(0, ...state.volunteers.map((v) => v.id)) + 1
      state.volunteers.push({ ...action.payload, id, eventId: Number(action.payload.eventId) })
    },
    volunteerRemoved: (state, action) => {
      state.volunteers = state.volunteers.filter((v) => v.id !== action.payload)
    },
  },
})

export const { eventSaved, volunteerAdded, volunteerRemoved } = organizerSlice.actions
export default organizerSlice.reducer

export const selectClub = (state) => state.organizer.club
export const selectClubEvents = (state) => state.organizer.events
export const selectVolunteers = (state) => state.organizer.volunteers
export const selectClubEvent = (state, id) => state.organizer.events.find((e) => e.id === Number(id))

// ---- thunks: dispatch(saveEvent(form)) runs this function with dispatch + getState ----

/** Create (no id) or update. Returns the saved event. Mirrors EventService.create / update. */
export const saveEvent = (form, { submit = false } = {}) => (dispatch, getState) => {
  const events = selectClubEvents(getState())
  const existing = form.id ? selectClubEvent(getState(), form.id) : null
  if (existing?.status === 'PENDING_APPROVAL') {
    throw new Error('This event is waiting for approval and cannot be edited.')
  }
  const booked = existing ? existing.totalSeats - existing.availableSeats : 0
  if (form.totalSeats < booked) {
    throw new Error(`Total seats cannot be less than the ${booked} seats already booked.`)
  }
  const event = {
    ...existing,
    ...form,
    id: existing?.id ?? Math.max(...events.map((e) => e.id)) + 1,
    availableSeats: form.totalSeats - booked,
    status: submit ? 'PENDING_APPROVAL' : existing?.status ?? 'DRAFT',
    reviewNote: submit ? null : existing?.reviewNote ?? null,
  }
  dispatch(eventSaved(event))
  return event
}

/** DRAFT -> PENDING_APPROVAL. Mirrors EventService.submit. */
export const submitEvent = (id) => (dispatch, getState) => {
  const event = selectClubEvent(getState(), id)
  if (event.status !== 'DRAFT') throw new Error(`Only drafts can be submitted (this one is ${event.status}).`)
  dispatch(eventSaved({ ...event, status: 'PENDING_APPROVAL', reviewNote: null }))
}
