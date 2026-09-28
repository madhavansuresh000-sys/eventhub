import api from './client'

/**
 * Organizer calls. Reading uses /api/organizer/** (every status); saving uses the Phase 2 event URLs.
 * The login cookie and CSRF header go with every call automatically (see api/auth.js).
 */

/** Drafts, waiting and published events of one club, soonest first. */
export const fetchClubEvents = (clubId) => api.get(`/organizer/clubs/${clubId}/events`).then((r) => r.data)

/** One event in any status (to fill the edit form). */
export const fetchManagedEvent = (id) => api.get(`/organizer/events/${id}`).then((r) => r.data)

/** body = EventRequest: { clubId, title, description, venue, startTime, endTime, totalSeats, price, tags } */
export const createEvent = (body) => api.post('/events', body).then((r) => r.data)

export const updateEvent = (id, body) => api.put(`/events/${id}`, body).then((r) => r.data)

/** DRAFT -> PENDING_APPROVAL */
export const submitEventForApproval = (id) => api.post(`/events/${id}/submit`).then((r) => r.data)
