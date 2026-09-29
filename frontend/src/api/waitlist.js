import api from './client'

/**
 * The smart waitlist (Phase 7).
 *
 *   WAITING ──a seat frees up──▶ OFFERED ──accept (30 min)──▶ BOOKED (a normal booking)
 *      └──leave──▶ LEFT            └──no answer──▶ EXPIRED (the seats go to the next student)
 */

/** { eventId, quantity } -> entry { id, status: 'WAITING', position, ... } */
export const joinWaitlist = (eventId, quantity) => api.post('/waitlist', { eventId, quantity }).then((r) => r.data)

export const fetchMyWaitlist = () => api.get('/waitlist/mine').then((r) => r.data)

export const leaveWaitlist = (id) => api.post(`/waitlist/${id}/leave`).then((r) => r.data)

/** Take the kept seats -> a booking (paid event: HELD, go to /checkout/:id; free event: CONFIRMED) */
export const acceptOffer = (id) => api.post(`/waitlist/${id}/accept`).then((r) => r.data)
