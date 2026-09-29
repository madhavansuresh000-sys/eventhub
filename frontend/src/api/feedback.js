import api from './client'

/**
 * Feedback (Phase 7): 1-5 stars + optional comment, only for events you attended, after they end.
 */

/** [{ bookingId, eventId, eventTitle, eventStart, rating (null = not rated yet), comment }] */
export const fetchMyFeedback = () => api.get('/feedback/mine').then((r) => r.data)

/** Give or change my rating (PUT: sending it twice gives the same result) */
export const giveFeedback = (bookingId, rating, comment) =>
  api.put(`/bookings/${bookingId}/feedback`, { rating, comment }).then((r) => r.data)

/** Organizers: { count, average, stars: [1★ count ... 5★ count], attended, comments: [{ rating, comment, createdAt }] } */
export const fetchEventFeedback = (eventId) => api.get(`/organizer/events/${eventId}/feedback`).then((r) => r.data)
