import api from './client'

/**
 * The gate scanner (Phase 7). Only volunteers and organizers of the event's club.
 * A scan answers { result: 'VALID' | 'ALREADY_USED' | 'INVALID', message, code, holder, quantity, stats }.
 */
export const fetchGateEvents = () => api.get('/gate/events').then((r) => r.data)

export const checkInTicket = (eventId, code) => api.post(`/gate/events/${eventId}/check-in`, { code }).then((r) => r.data)

/** The live counter: { bookedPeople, checkedInPeople } */
export const fetchGateStats = (eventId) => api.get(`/gate/events/${eventId}/stats`).then((r) => r.data)
