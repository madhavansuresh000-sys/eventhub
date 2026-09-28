import api from './client'

/** Events waiting for approval, soonest first. */
export const fetchPendingEvents = () => api.get('/admin/events/pending').then((r) => r.data)

/** One row per club: { clubId, clubName, clubSlug, published, pending, seatsSold, revenue } */
export const fetchClubStats = () => api.get('/admin/stats/clubs').then((r) => r.data)

/** PENDING_APPROVAL -> PUBLISHED */
export const approveEventRequest = (id) => api.post(`/events/${id}/approve`).then((r) => r.data)

/** PENDING_APPROVAL -> DRAFT, with a reason for the organizer (max 500 characters) */
export const rejectEventRequest = (id, reason) => api.post(`/events/${id}/reject`, { reason }).then((r) => r.data)

/** Audit log, newest first: { content: [{ action, eventTitle, userName, userEmail, details, createdAt }], ... } */
export const fetchAuditLog = ({ page = 0, size = 20 } = {}) =>
  api.get('/admin/audit', { params: { page, size } }).then((r) => r.data)
