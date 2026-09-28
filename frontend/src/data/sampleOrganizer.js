/**
 * SAMPLE DATA for the organizer pages (Phase 3).
 * Madhavan is an ORGANIZER of the Coding Club. Phase 4 loads this from the API
 * (POST/PUT /api/events and /submit already exist from Phase 2).
 */

export const organizerClub = {
  id: 1,
  name: 'Coding Club',
  slug: 'coding-club',
  description: 'Hackathons, coding contests and developer workshops.',
}

/** status: DRAFT -> PENDING_APPROVAL -> PUBLISHED (or back to DRAFT with a reviewNote) */
export const sampleClubEvents = [
  {
    id: 1, title: 'Tech Fest 2026', description: 'Two-day festival of talks, demos and project expos.', venue: 'Main Auditorium',
    startTime: '2026-10-12T10:00', endTime: '2026-10-13T17:00', totalSeats: 200, availableSeats: 40, price: 100,
    status: 'PUBLISHED', reviewNote: null, tags: ['coding', 'tech'],
  },
  {
    id: 2, title: '24-Hour Hackathon', description: 'Build a product in 24 hours with your team of four.', venue: 'CSE Block Lab 1',
    startTime: '2026-10-20T09:00', endTime: '2026-10-21T09:00', totalSeats: 120, availableSeats: 10, price: 150,
    status: 'PUBLISHED', reviewNote: null, tags: ['coding', 'competition', 'tech'],
  },
  {
    id: 3, title: 'Intro to Git and GitHub', description: 'Hands-on workshop: commits, branches and pull requests.', venue: 'CSE Block Lab 2',
    startTime: '2026-10-08T14:00', endTime: '2026-10-08T17:00', totalSeats: 60, availableSeats: 22, price: 0,
    status: 'PUBLISHED', reviewNote: null, tags: ['coding', 'tech', 'workshop'],
  },
  {
    id: 5, title: 'Spring Boot Bootcamp', description: 'Build a REST API with Spring Boot and MySQL in one day.', venue: 'Seminar Hall A',
    startTime: '2026-11-15T09:30', endTime: '2026-11-15T16:30', totalSeats: 80, availableSeats: 80, price: 200,
    status: 'DRAFT', reviewNote: null, tags: ['coding', 'tech', 'workshop'],
  },
  {
    id: 21, title: 'AI for Beginners', description: 'What machine learning is, with small demos.', venue: 'Seminar Hall B',
    startTime: '2026-11-22T14:00', endTime: '2026-11-22T17:00', totalSeats: 100, availableSeats: 100, price: 0,
    status: 'DRAFT', reviewNote: "Please add the speaker's name and the room map before we publish.", tags: ['tech', 'workshop'],
  },
  {
    id: 22, title: 'Code Review Night', description: 'Bring your project and get feedback from seniors.', venue: 'CSE Block Lab 1',
    startTime: '2026-11-28T18:00', endTime: '2026-11-28T21:00', totalSeats: 40, availableSeats: 40, price: 0,
    status: 'PENDING_APPROVAL', reviewNote: null, tags: ['coding'],
  },
]

export const sampleVolunteers = [
  { id: 1, name: 'Priya Raman', email: 'priya@college.edu', department: 'ECE', eventId: 1 },
  { id: 2, name: 'Arjun Kumar', email: 'arjun@college.edu', department: 'Mechanical', eventId: 1 },
  { id: 3, name: 'Divya S', email: 'divya@college.edu', department: 'IT', eventId: 2 },
]
