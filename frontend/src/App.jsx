import { Route, Routes } from 'react-router-dom'

import Layout from './components/layout/Layout'
import AboutPage from './pages/AboutPage'
import CertificatesPage from './pages/CertificatesPage'
import CertificateViewPage from './pages/CertificateViewPage'
import CheckoutPage from './pages/CheckoutPage'
import ClubPage from './pages/ClubPage'
import ComingSoonPage from './pages/ComingSoonPage'
import EventDetailsPage from './pages/EventDetailsPage'
import EventsPage from './pages/EventsPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import MyTicketsPage from './pages/MyTicketsPage'
import NotFoundPage from './pages/NotFoundPage'
import RegisterPage from './pages/RegisterPage'
import TicketPage from './pages/TicketPage'
import WaitlistPage from './pages/WaitlistPage'
import StyleGuidePage from './pages/StyleGuidePage'

/** Pages still to build, with the Phase 3 step that builds them. */
const upcoming = [
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
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:id" element={<EventDetailsPage />} />
        <Route path="clubs/:slug" element={<ClubPage />} />
        <Route path="checkout/:eventId" element={<CheckoutPage />} />
        <Route path="my-tickets" element={<MyTicketsPage />} />
        <Route path="tickets/:id" element={<TicketPage />} />
        <Route path="waitlist" element={<WaitlistPage />} />
        <Route path="certificates" element={<CertificatesPage />} />
        <Route path="certificates/:id" element={<CertificateViewPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route
          path="forgot-password"
          element={<ComingSoonPage title="Forgot password" step="5 (backend in Phase 5)" description="We will email you a reset link." />}
        />
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
