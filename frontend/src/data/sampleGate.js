/**
 * SAMPLE DATA for the gate scanner (Phase 3). Phase 7 checks tickets on the server
 * (POST /api/checkins) so two volunteers can never let the same ticket in twice.
 */

export const currentVolunteer = { name: 'Priya Raman', eventIds: [1, 2, 7] }

/** Events this volunteer does gate duty for */
export const gateEvents = [
  { id: 1, title: 'Tech Fest 2026', venue: 'Main Auditorium', startTime: '2026-10-12T10:00:00', totalSeats: 200 },
  { id: 2, title: '24-Hour Hackathon', venue: 'CSE Block Lab 1', startTime: '2026-10-20T09:00:00', totalSeats: 120 },
  { id: 7, title: 'Battle of Bands', venue: 'Open Air Theatre', startTime: '2026-10-25T17:00:00', totalSeats: 400 },
]

/** Tickets the gate knows about. status: CONFIRMED, ATTENDED (already scanned), CANCELLED */
export const gateTickets = [
  { code: 'EVH-1001-7Q4K', eventId: 1, holder: 'Madhavan Suresh', quantity: 2, status: 'CONFIRMED' },
  { code: 'EVH-1003-P2LM', eventId: 1, holder: 'Priya Raman', quantity: 1, status: 'CONFIRMED' },
  { code: 'EVH-1004-ZZ9Q', eventId: 1, holder: 'Arjun Kumar', quantity: 1, status: 'ATTENDED', checkedInAt: '2026-10-12T09:58:00' },
  { code: 'EVH-1005-C4NC', eventId: 1, holder: 'Karthik R', quantity: 1, status: 'CANCELLED' },
  { code: 'EVH-1002-M8R2', eventId: 7, holder: 'Madhavan Suresh', quantity: 1, status: 'CONFIRMED' },
  { code: 'EVH-2001-HK7P', eventId: 2, holder: 'Divya S', quantity: 1, status: 'CONFIRMED' },
]

/** Buttons on the scanner page to try every result without a phone. */
export const tryCodes = [
  { label: 'Valid ticket', code: 'EVH-1001-7Q4K' },
  { label: 'Already used', code: 'EVH-1004-ZZ9Q' },
  { label: 'Cancelled', code: 'EVH-1005-C4NC' },
  { label: 'Other event', code: 'EVH-1002-M8R2' },
  { label: 'Fake code', code: 'ABC-123' },
]
