/**
 * SAMPLE DATA for the student pages that get their backend in Phase 7 (waitlist, certificates).
 * Bookings and tickets are real since Phase 6; the student's name and email come from their login (Phase 5).
 */

/**
 * Events the student ATTENDED (scanned at the gate), each with a certificate.
 * Phase 7 makes these real (check-in at the gate + PDF certificates).
 */
export const sampleAttended = [
  {
    id: 'T-0950', code: 'EVH-0950-X1PA', title: 'Python Bootcamp', clubName: 'Coding Club', clubSlug: 'coding-club',
    venue: 'CSE Block Lab 2', startTime: '2026-09-05T09:30:00', tags: ['coding', 'workshop'], quantity: 1,
    status: 'ATTENDED', certificateId: 'CERT-2026-0042',
  },
  {
    id: 'T-0912', code: 'EVH-0912-B5TZ', title: 'Orientation Day 2026', clubName: 'Career Cell', clubSlug: 'career-cell',
    venue: 'Main Auditorium', startTime: '2026-08-05T10:00:00', tags: ['career'], quantity: 1,
    status: 'ATTENDED', certificateId: 'CERT-2026-0007',
  },
]

/** position = place in the queue (1 = next to get a seat) */
export const sampleWaitlist = [
  {
    eventId: 6, title: 'Dance Night', clubName: 'Cultural Club', clubSlug: 'cultural-club', venue: 'Open Air Theatre',
    startTime: '2026-10-15T18:00:00', tags: ['dance', 'competition'], position: 3, joinedAt: '2026-09-25T20:10:00',
  },
]
