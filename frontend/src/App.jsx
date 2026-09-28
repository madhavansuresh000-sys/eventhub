import { Route, Routes } from 'react-router-dom'

import Layout from './components/layout/Layout'
import AboutPage from './pages/AboutPage'
import ComingSoonPage from './pages/ComingSoonPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import StyleGuidePage from './pages/StyleGuidePage'

/** Pages still to build, with the Phase 3 step that builds them. */
const upcoming = [
  { path: '/events', title: 'All events', step: 4, description: 'Filter sidebar, search and pages.' },
  { path: '/events/:id', title: 'Event details', step: 4, description: 'Poster, details and the Book Now box.' },
  { path: '/clubs/:slug', title: 'Club page', step: 4, description: "A club's story and its events." },
  { path: '/login', title: 'Login', step: 5, description: 'Email and password with form checks.' },
  { path: '/register', title: 'Register', step: 5, description: 'Create a student account.' },
  { path: '/checkout/:eventId', title: 'Checkout', step: 6, description: 'Your seat is held for 10 minutes.' },
  { path: '/my-tickets', title: 'My tickets', step: 6, description: 'Confirmed, waitlisted and attended events.' },
  { path: '/tickets/:id', title: 'Ticket', step: 6, description: 'Your QR code for the gate.' },
  { path: '/waitlist', title: 'My waitlist', step: 6, description: 'Where you are in the queue.' },
  { path: '/certificates', title: 'Certificates', step: 6, description: 'Download certificates for events you attended.' },
  { path: '/organizer', title: 'My club', step: 7, description: 'Organizer dashboard.' },
  { path: '/organizer/events/new', title: 'Create event', step: 7, description: 'The event form.' },
  { path: '/organizer/events/:id/edit', title: 'Edit event', step: 7, description: 'Change an event.' },
  { path: '/organizer/volunteers', title: 'Volunteers', step: 7, description: 'Who helps at the gate.' },
  { path: '/scanner', title: 'Gate scanner', step: 8, description: 'Scan QR tickets: green = in, red = stop.' },
  { path: '/admin', title: 'Admin overview', step: 9, description: 'Numbers across all clubs.' },
  { path: '/admin/approvals', title: 'Approval queue', step: 9, description: 'Approve or send back events.' },
]

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="style-guide" element={<StyleGuidePage />} />
        {upcoming.map((p) => (
          <Route key={p.path} path={p.path} element={<ComingSoonPage {...p} />} />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
