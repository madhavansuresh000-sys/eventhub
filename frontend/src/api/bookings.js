import api from './client'

/**
 * Bookings and payments (Phase 6). Login cookie + CSRF header go along automatically.
 *
 *   HELD ──pay──▶ CONFIRMED ──cancel──▶ CANCELLED
 *     └── 10 minutes without paying ──▶ EXPIRED (seats go back)
 */

/** Hold seats: { eventId, quantity } -> booking (HELD with secondsLeft, or CONFIRMED for a free event) */
export const holdSeats = (eventId, quantity) => api.post('/bookings', { eventId, quantity }).then((r) => r.data)

export const fetchMyBookings = () => api.get('/bookings/mine').then((r) => r.data)

export const fetchBooking = (id) => api.get(`/bookings/${id}`).then((r) => r.data)

/** -> { provider: 'STRIPE' | 'FAKE', sessionId, redirectUrl } : send the student to redirectUrl */
export const payBooking = (id) => api.post(`/bookings/${id}/pay`).then((r) => r.data)

/** The ticket's QR picture, drawn by the server (ZXing). Used as <img src>: the login cookie goes along. */
export const qrImageUrl = (id) => `/api/bookings/${id}/qr.png`

export const cancelBooking = (id) => api.post(`/bookings/${id}/cancel`).then((r) => r.data)

/** Back from Stripe: the server asks Stripe "paid?" and confirms (in case the webhook is late). */
export const verifyPayment = (sessionId) => api.post(`/payments/${sessionId}/verify`).then((r) => r.data)

/** Dev test payment page (only when the backend has no Stripe keys). */
export const fetchTestPayment = (sessionId) => api.get(`/payments/fake/${sessionId}`).then((r) => r.data)
export const completeTestPayment = (sessionId) => api.post(`/payments/fake/${sessionId}/complete`).then((r) => r.data)

/**
 * API booking -> the "ticket" shape the pages use (same field names as the Phase 3 sample tickets):
 * { id, code, status, quantity, amount, price, eventId, title, clubName, clubSlug, venue, startTime, tags, ... }
 */
export function toTicket(b) {
  return {
    id: b.id,
    code: b.ticketCode,
    status: b.checkedInAt ? 'ATTENDED' : b.status, // scanned at the gate (Phase 7)
    checkedInAt: b.checkedInAt,
    quantity: b.quantity,
    amount: Number(b.amount),
    price: Number(b.event.price),
    secondsLeft: b.secondsLeft,
    canCancel: b.canCancel,
    bookedAt: b.createdAt,
    eventId: b.event.id,
    title: b.event.title,
    clubName: b.event.clubName,
    clubSlug: b.event.clubSlug,
    venue: b.event.venue,
    startTime: b.event.startTime,
    endTime: b.event.endTime,
    tags: b.event.tags,
  }
}
