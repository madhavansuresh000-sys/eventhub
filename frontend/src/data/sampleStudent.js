/**
 * SAMPLE DATA for the student pages (Phase 3).
 * Bookings, waitlists and certificates get a real backend in Phase 6 and 7;
 * until then these pages run on this data. The student's name and email come from their login (Phase 5).
 */

/** status: CONFIRMED (upcoming), ATTENDED (scanned at the gate), CANCELLED */
export const sampleTickets = [
  {
    id: 'T-1001', code: 'EVH-1001-7Q4K', eventId: 1, title: 'Tech Fest 2026', clubName: 'Coding Club', clubSlug: 'coding-club',
    venue: 'Main Auditorium', startTime: '2026-10-12T10:00:00', tags: ['coding', 'tech'], quantity: 2, price: 100,
    status: 'CONFIRMED', bookedAt: '2026-09-20T18:42:00',
  },
  {
    id: 'T-1002', code: 'EVH-1002-M8R2', eventId: 7, title: 'Battle of Bands', clubName: 'Cultural Club', clubSlug: 'cultural-club',
    venue: 'Open Air Theatre', startTime: '2026-10-25T17:00:00', tags: ['competition', 'music'], quantity: 1, price: 150,
    status: 'CONFIRMED', bookedAt: '2026-09-24T09:15:00',
  },
  {
    id: 'T-0950', code: 'EVH-0950-X1PA', eventId: null, title: 'Python Bootcamp', clubName: 'Coding Club', clubSlug: 'coding-club',
    venue: 'CSE Block Lab 2', startTime: '2026-09-05T09:30:00', tags: ['coding', 'workshop'], quantity: 1, price: 0,
    status: 'ATTENDED', bookedAt: '2026-08-28T11:00:00', certificateId: 'CERT-2026-0042',
  },
  {
    id: 'T-0912', code: 'EVH-0912-B5TZ', eventId: null, title: 'Orientation Day 2026', clubName: 'Career Cell', clubSlug: 'career-cell',
    venue: 'Main Auditorium', startTime: '2026-08-05T10:00:00', tags: ['career'], quantity: 1, price: 0,
    status: 'ATTENDED', bookedAt: '2026-07-30T16:20:00', certificateId: 'CERT-2026-0007',
  },
  {
    id: 'T-0978', code: 'EVH-0978-H3NW', eventId: null, title: 'Freshers Cricket Match', clubName: 'Sports Club', clubSlug: 'sports-club',
    venue: 'College Ground', startTime: '2026-09-12T08:00:00', tags: ['sports'], quantity: 1, price: 50,
    status: 'CANCELLED', bookedAt: '2026-09-01T12:05:00',
  },
]

/** position = place in the queue (1 = next to get a seat) */
export const sampleWaitlist = [
  {
    eventId: 6, title: 'Dance Night', clubName: 'Cultural Club', clubSlug: 'cultural-club', venue: 'Open Air Theatre',
    startTime: '2026-10-15T18:00:00', tags: ['dance', 'competition'], position: 3, joinedAt: '2026-09-25T20:10:00',
  },
]
