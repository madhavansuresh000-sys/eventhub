import { createContext, useContext, useMemo, useReducer } from 'react'

import { organizerClub, sampleClubEvents, sampleVolunteers } from '../data/sampleOrganizer'

/**
 * Shared organizer data: the club's events (every status) and its volunteers.
 * The rules copy the backend's EventService, so the screens behave like the real thing.
 * Step 10 moves this into Redux Toolkit.
 */

const OrganizerDataContext = createContext(null)

const initialState = { club: organizerClub, events: sampleClubEvents, volunteers: sampleVolunteers }

function reducer(state, action) {
  switch (action.type) {
    case 'eventSaved': {
      const exists = state.events.some((e) => e.id === action.event.id)
      return {
        ...state,
        events: exists
          ? state.events.map((e) => (e.id === action.event.id ? action.event : e))
          : [...state.events, action.event],
      }
    }
    case 'volunteerAdded':
      return { ...state, volunteers: [...state.volunteers, action.volunteer] }
    case 'volunteerRemoved':
      return { ...state, volunteers: state.volunteers.filter((v) => v.id !== action.id) }
    default:
      throw new Error(`Unknown action ${action.type}`)
  }
}

export function OrganizerDataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const value = useMemo(() => {
    const findEvent = (id) => state.events.find((e) => e.id === Number(id))

    return {
      ...state,
      findEvent,

      /** Create (no id) or update. Returns the saved event. Mirrors EventService.create / update. */
      saveEvent: (form, { submit = false } = {}) => {
        const existing = form.id ? findEvent(form.id) : null
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
          id: existing?.id ?? Math.max(...state.events.map((e) => e.id)) + 1,
          availableSeats: form.totalSeats - booked,
          status: submit ? 'PENDING_APPROVAL' : existing?.status ?? 'DRAFT',
          reviewNote: submit ? null : existing?.reviewNote ?? null,
        }
        dispatch({ type: 'eventSaved', event })
        return event
      },

      /** DRAFT -> PENDING_APPROVAL. Mirrors EventService.submit. */
      submitEvent: (id) => {
        const event = findEvent(id)
        if (event.status !== 'DRAFT') throw new Error(`Only drafts can be submitted (this one is ${event.status}).`)
        dispatch({ type: 'eventSaved', event: { ...event, status: 'PENDING_APPROVAL', reviewNote: null } })
      },

      /** Admin: PENDING_APPROVAL -> PUBLISHED, note cleared. Mirrors EventService.approve. */
      approveEvent: (id) => {
        const event = findEvent(id)
        if (event.status !== 'PENDING_APPROVAL') throw new Error(`Only events waiting for approval can be approved (this one is ${event.status}).`)
        dispatch({ type: 'eventSaved', event: { ...event, status: 'PUBLISHED', reviewNote: null } })
      },

      /** Admin: PENDING_APPROVAL -> DRAFT with a reason. Mirrors EventService.reject. */
      rejectEvent: (id, reason) => {
        const event = findEvent(id)
        if (!reason?.trim()) throw new Error('A reason is required to send an event back.')
        if (event.status !== 'PENDING_APPROVAL') throw new Error(`Only events waiting for approval can be sent back (this one is ${event.status}).`)
        dispatch({ type: 'eventSaved', event: { ...event, status: 'DRAFT', reviewNote: reason.trim() } })
      },

      addVolunteer: (volunteer) => {
        const id = Math.max(0, ...state.volunteers.map((v) => v.id)) + 1
        dispatch({ type: 'volunteerAdded', volunteer: { ...volunteer, id, eventId: Number(volunteer.eventId) } })
      },
      removeVolunteer: (id) => dispatch({ type: 'volunteerRemoved', id }),
    }
  }, [state])

  return <OrganizerDataContext.Provider value={value}>{children}</OrganizerDataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrganizerData() {
  const value = useContext(OrganizerDataContext)
  if (!value) throw new Error('useOrganizerData must be used inside <OrganizerDataProvider>')
  return value
}
