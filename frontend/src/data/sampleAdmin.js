/**
 * SAMPLE DATA for the admin pages (Phase 3).
 * The Coding Club's events come from sampleOrganizer.js (shared state), so an event the
 * organizer submits shows up here. The other four clubs live here.
 * Phase 4 loads this from the API (POST /api/events/{id}/approve and /reject already exist).
 */

/** Same 5 clubs as the backend seed (V2__seed_sample_data.sql). */
export const allClubs = [
  { id: 1, name: 'Coding Club', slug: 'coding-club' },
  { id: 2, name: 'Cultural Club', slug: 'cultural-club' },
  { id: 3, name: 'Sports Club', slug: 'sports-club' },
  { id: 4, name: 'Robotics Club', slug: 'robotics-club' },
  { id: 5, name: 'Career Cell', slug: 'career-cell' },
]

/** Events of the other clubs: a few waiting for approval, the rest already published. */
export const otherClubEvents = [
  {
    id: 101, clubId: 2, title: 'Diwali Dance Night', description: 'Group and solo dance performances with a DJ after-party.',
    venue: 'Open Air Theatre', startTime: '2026-10-30T18:00', endTime: '2026-10-30T22:00', totalSeats: 500, availableSeats: 500,
    price: 50, status: 'PENDING_APPROVAL', reviewNote: null, tags: ['dance', 'music'],
    submittedBy: 'Kavya M', submittedAt: '2026-09-27T16:20',
  },
  {
    id: 102, clubId: 4, title: 'Line Follower Robot Race', description: 'Build a robot that follows a black line. Fastest lap wins.',
    venue: 'Mechanical Workshop', startTime: '2026-11-05T10:00', endTime: '2026-11-05T15:00', totalSeats: 60, availableSeats: 60,
    price: 100, status: 'PENDING_APPROVAL', reviewNote: null, tags: ['robotics', 'competition'],
    submittedBy: 'Rahul V', submittedAt: '2026-09-28T09:45',
  },
  {
    id: 103, clubId: 5, title: 'Mock Interview Day', description: 'One-to-one mock interviews with alumni from top companies.',
    venue: 'Placement Cell', startTime: '2026-10-10T09:00', endTime: '2026-10-10T13:00', totalSeats: 40, availableSeats: 40,
    price: 0, status: 'PENDING_APPROVAL', reviewNote: null, tags: ['career'],
    submittedBy: 'Sneha P', submittedAt: '2026-09-28T11:05',
  },
  {
    id: 104, clubId: 2, title: 'Battle of Bands', description: 'College bands compete live on stage.',
    venue: 'Main Auditorium', startTime: '2026-10-18T17:00', endTime: '2026-10-18T21:00', totalSeats: 300, availableSeats: 45,
    price: 80, status: 'PUBLISHED', reviewNote: null, tags: ['music', 'competition'],
  },
  {
    id: 105, clubId: 3, title: 'Inter-Department Cricket', description: 'T10 tournament between all departments.',
    venue: 'College Ground', startTime: '2026-10-14T07:00', endTime: '2026-10-16T18:00', totalSeats: 150, availableSeats: 30,
    price: 0, status: 'PUBLISHED', reviewNote: null, tags: ['sports', 'competition'],
  },
  {
    id: 106, clubId: 3, title: '5K Fun Run', description: 'Morning run around the campus. T-shirt for every finisher.',
    venue: 'Main Gate', startTime: '2026-11-01T06:00', endTime: '2026-11-01T08:00', totalSeats: 250, availableSeats: 110,
    price: 30, status: 'PUBLISHED', reviewNote: null, tags: ['sports'],
  },
  {
    id: 107, clubId: 4, title: 'Drone Building Workshop', description: 'Assemble and fly a small quadcopter.',
    venue: 'ECE Lab 3', startTime: '2026-10-24T10:00', endTime: '2026-10-24T16:00', totalSeats: 30, availableSeats: 0,
    price: 250, status: 'PUBLISHED', reviewNote: null, tags: ['robotics', 'workshop'],
  },
  {
    id: 108, clubId: 5, title: 'Resume Clinic', description: 'Get your resume reviewed by the placement team.',
    venue: 'Seminar Hall A', startTime: '2026-10-06T14:00', endTime: '2026-10-06T17:00', totalSeats: 80, availableSeats: 12,
    price: 0, status: 'PUBLISHED', reviewNote: null, tags: ['career', 'workshop'],
  },
]

/** Who submitted the Coding Club events that are already waiting (sampleOrganizer.js has no such field). */
export const codingClubSubmitter = 'Madhavan'
