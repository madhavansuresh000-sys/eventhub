import { createContext, useContext, useMemo, useReducer } from 'react'

import { currentStudent, sampleTickets, sampleWaitlist } from '../data/sampleStudent'

/**
 * Shared student data (tickets + waitlist) for every page.
 * A reducer is a function: (current state, action) -> new state.
 * Step 10 moves this into Redux Toolkit, which uses the same reducer idea.
 */

const StudentDataContext = createContext(null)

const initialState = { student: currentStudent, tickets: sampleTickets, waitlist: sampleWaitlist }

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function reducer(state, action) {
  switch (action.type) {
    case 'ticketBooked':
      return { ...state, tickets: [action.ticket, ...state.tickets] }
    case 'ticketCancelled':
      return {
        ...state,
        tickets: state.tickets.map((t) => (t.id === action.id ? { ...t, status: 'CANCELLED' } : t)),
      }
    case 'waitlistJoined':
      if (state.waitlist.some((w) => w.eventId === action.entry.eventId)) return state
      return { ...state, waitlist: [...state.waitlist, action.entry] }
    case 'waitlistLeft':
      return { ...state, waitlist: state.waitlist.filter((w) => w.eventId !== action.eventId) }
    default:
      throw new Error(`Unknown action ${action.type}`)
  }
}

export function StudentDataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const actions = useMemo(
    () => ({
      /** event = the fields a ticket needs (title, venue, startTime ...). Returns the new ticket id. */
      bookTickets: (event, quantity) => {
        const number = String(Date.now()).slice(-5)
        const ticket = {
          ...event,
          id: `T-${number}`,
          code: `EVH-${number}-${randomCode()}`,
          quantity,
          status: 'CONFIRMED',
          bookedAt: new Date().toISOString(),
        }
        dispatch({ type: 'ticketBooked', ticket })
        return ticket.id
      },
      cancelTicket: (id) => dispatch({ type: 'ticketCancelled', id }),
      joinWaitlist: (entry) => dispatch({ type: 'waitlistJoined', entry }),
      leaveWaitlist: (eventId) => dispatch({ type: 'waitlistLeft', eventId }),
    }),
    [],
  )

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions])
  return <StudentDataContext.Provider value={value}>{children}</StudentDataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStudentData() {
  const value = useContext(StudentDataContext)
  if (!value) throw new Error('useStudentData must be used inside <StudentDataProvider>')
  return value
}
