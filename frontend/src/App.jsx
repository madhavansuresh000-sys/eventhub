import { Route, Routes } from 'react-router-dom'

import AdminLayout from './components/admin/AdminLayout'
import RequireAuth from './components/auth/RequireAuth'
import Layout from './components/layout/Layout'
import OrganizerLayout from './components/organizer/OrganizerLayout'
import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import ApprovalQueuePage from './pages/admin/ApprovalQueuePage'
import EventFormPage from './pages/organizer/EventFormPage'
import OrganizerDashboardPage from './pages/organizer/OrganizerDashboardPage'
import VolunteersPage from './pages/organizer/VolunteersPage'
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
import ScannerPage from './pages/ScannerPage'
import TicketPage from './pages/TicketPage'
import WaitlistPage from './pages/WaitlistPage'
import StyleGuidePage from './pages/StyleGuidePage'
import { canScan, isAdmin, isOrganizer } from './store/authSlice'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:id" element={<EventDetailsPage />} />
        <Route path="clubs/:slug" element={<ClubPage />} />
        {/* any logged-in user (students book tickets) */}
        <Route element={<RequireAuth />}>
          <Route path="checkout/:eventId" element={<CheckoutPage />} />
          <Route path="my-tickets" element={<MyTicketsPage />} />
          <Route path="tickets/:id" element={<TicketPage />} />
          <Route path="waitlist" element={<WaitlistPage />} />
          <Route path="certificates" element={<CertificatesPage />} />
          <Route path="certificates/:id" element={<CertificateViewPage />} />
        </Route>
        {/* organizers of a club */}
        <Route element={<RequireAuth allow={isOrganizer} what="the organizer area" />}>
          <Route path="organizer" element={<OrganizerLayout />}>
            <Route index element={<OrganizerDashboardPage />} />
            <Route path="events/new" element={<EventFormPage />} />
            <Route path="events/:id/edit" element={<EventFormPage />} />
            <Route path="volunteers" element={<VolunteersPage />} />
          </Route>
        </Route>
        {/* admins */}
        <Route element={<RequireAuth allow={isAdmin} what="the admin area" />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="approvals" element={<ApprovalQueuePage />} />
          </Route>
        </Route>
        {/* volunteers and organizers at the gate */}
        <Route element={<RequireAuth allow={canScan} what="the gate scanner" />}>
          <Route path="scanner" element={<ScannerPage />} />
        </Route>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route
          path="forgot-password"
          element={<ComingSoonPage title="Forgot password" step="later (password reset by email)" description="We will email you a reset link." />}
        />
        <Route path="about" element={<AboutPage />} />
        <Route path="style-guide" element={<StyleGuidePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
