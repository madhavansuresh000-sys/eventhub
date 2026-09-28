import { createContext, useContext, useMemo, useReducer } from 'react'

import { allClubs, codingClubSubmitter, otherClubEvents } from '../data/sampleAdmin'
import { useOrganizerData } from './OrganizerDataContext'

/**
 * Admin view of ALL clubs. The Coding Club's events come from OrganizerDataContext
 * (so approving here changes the organizer dashboard too); the other clubs' events are kept here.
 * The approve / send-back rules copy the backend's EventService. Step 10 moves this into Redux Toolkit.
 */

const AdminDataContext = createContext(null)

const initialState = { otherEvents: otherClubEvents, decisions: [] }

function reducer(state, action) {
  switch (action.type) {
    case 'otherEventSaved':
      return { ...state, otherEvents: state.otherEvents.map((e) => (e.id === action.event.id ? action.event : e)) }
    case 'decided':
      // newest first; keep the list short
      return { ...state, decisions: [action.decision, ...state.decisions].slice(0, 10) }
    default:
      throw new Error(`Unknown action ${action.type}`)
  }
}

/** The same checks as EventService.approve / reject, for the other clubs' events. */
function reviewed(event, approve, reason) {
  if (!approve && !reason?.trim()) throw new Error('A reason is required to send an event back.')
  if (event.status !== 'PENDING_APPROVAL') {
    throw new Error(`Only events waiting for approval can be reviewed (this one is ${event.status}).`)
  }
  return approve
    ? { ...event, status: 'PUBLISHED', reviewNote: null }
    : { ...event, status: 'DRAFT', reviewNote: reason.trim() }
}

export function AdminDataProvider({ children }) {
  const organizer = useOrganizerData()
  const [state, dispatch] = useReducer(reducer, initialState)

  const value = useMemo(() => {
    const codingClubEvents = organizer.events.map((e) => ({
      ...e,
      clubId: organizer.club.id,
      submittedBy: e.submittedBy ?? codingClubSubmitter,
    }))
    const clubById = Object.fromEntries(allClubs.map((c) => [c.id, c]))
    const events = [...codingClubEvents, ...state.otherEvents].map((e) => ({ ...e, club: clubById[e.clubId] }))
    const isCodingClub = (event) => event.clubId === organizer.club.id

    /** Waiting for approval, the event that starts soonest first (it is the most urgent). */
    const queue = events
      .filter((e) => e.status === 'PENDING_APPROVAL')
      .sort((a, b) => a.startTime.localeCompare(b.startTime))

    /** One row per club: published events, waiting, tickets sold and money collected. */
    const clubStats = allClubs.map((club) => {
      const own = events.filter((e) => e.clubId === club.id)
      const published = own.filter((e) => e.status === 'PUBLISHED')
      return {
        club,
        published: published.length,
        pending: own.filter((e) => e.status === 'PENDING_APPROVAL').length,
        sold: published.reduce((n, e) => n + e.totalSeats - e.availableSeats, 0),
        revenue: published.reduce((n, e) => n + (e.totalSeats - e.availableSeats) * e.price, 0),
      }
    })

    const decide = (event, approve, reason) => {
      if (isCodingClub(event)) {
        if (approve) organizer.approveEvent(event.id)
        else organizer.rejectEvent(event.id, reason)
      } else {
        dispatch({ type: 'otherEventSaved', event: reviewed(state.otherEvents.find((e) => e.id === event.id), approve, reason) })
      }
      dispatch({
        type: 'decided',
        decision: { eventId: event.id, title: event.title, club: event.club, approved: approve, reason: reason?.trim() ?? null, at: new Date().toISOString() },
      })
    }

    return {
      clubs: allClubs,
      events,
      queue,
      clubStats,
      decisions: state.decisions,
      findEvent: (id) => events.find((e) => e.id === Number(id)),
      approveEvent: (event) => decide(event, true),
      rejectEvent: (event, reason) => decide(event, false, reason),
    }
  }, [organizer, state])

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminData() {
  const value = useContext(AdminDataContext)
  if (!value) throw new Error('useAdminData must be used inside <AdminDataProvider>')
  return value
}
