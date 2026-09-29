import api from './client'

/**
 * Dashboard numbers (Phase 7 step 7). The server keeps each answer for 60 s (@Cacheable),
 * so `generatedAt` tells when they were counted.
 * { from, to, days, generatedAt,
 *   totals: { ticketsSold, revenue, checkedIn, expectedAtGate, checkInRate, averageRating, ratings },
 *   perDay: [{ date, tickets, revenue }],
 *   events: [{ eventId, title, startTime, started, totalSeats, ticketsSold, checkedIn, revenue, averageRating, ratings }] }
 */

/** One club - organizers of that club only. */
export const fetchClubAnalytics = (clubId, days) =>
  api.get(`/organizer/clubs/${clubId}/analytics`, { params: { days } }).then((r) => r.data)

/** Admin: all clubs (clubId empty) or one club. */
export const fetchAllAnalytics = (days, clubId) =>
  api.get('/admin/analytics', { params: { days, clubId: clubId || undefined } }).then((r) => r.data)
