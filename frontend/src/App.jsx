import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import AdminLayout from './components/admin/AdminLayout'
import RequireAuth from './components/auth/RequireAuth'
import Layout from './components/layout/Layout'
import OrganizerLayout from './components/organizer/OrganizerLayout'
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
import PaymentResultPage from './pages/PaymentResultPage'
import RegisterPage from './pages/RegisterPage'
import TestPaymentPage from './pages/TestPaymentPage'
import TicketPage from './pages/TicketPage'
import VerifyCertificatePage from './pages/VerifyCertificatePage'
import WaitlistPage from './pages/WaitlistPage'
import { canScan, isAdmin, isOrganizer } from './store/authSlice'

// Loaded only when someone opens them (React.lazy = code splitting): a student browsing events never
// downloads the charts (Recharts), the camera scanner or the organizer/admin screens.
// <Suspense> in Layout / OrganizerLayout / AdminLayout shows a spinner while a page's file loads.
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'))
const AdminOverviewPage = lazy(() => import('./pages/admin/AdminOverviewPage'))
const ApprovalQueuePage = lazy(() => import('./pages/admin/ApprovalQueuePage'))
const EventFeedbackPage = lazy(() => import('./pages/organizer/EventFeedbackPage'))
const EventFormPage = lazy(() => import('./pages/organizer/EventFormPage'))
const OrganizerAnalyticsPage = lazy(() => import('./pages/organizer/OrganizerAnalyticsPage'))
const OrganizerDashboardPage = lazy(() => import('./pages/organizer/OrganizerDashboardPage'))
const VolunteersPage = lazy(() => import('./pages/organizer/VolunteersPage'))
const ScannerPage = lazy(() => import('./pages/ScannerPage'))
const StyleGuidePage = lazy(() => import('./pages/StyleGuidePage'))

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
          <Route path="checkout/:bookingId" element={<CheckoutPage />} />
          <Route path="test-payment/:sessionId" element={<TestPaymentPage />} />
          <Route path="payment/success" element={<PaymentResultPage result="success" />} />
          <Route path="payment/cancelled" element={<PaymentResultPage result="cancelled" />} />
          <Route path="my-tickets" element={<MyTicketsPage />} />
          <Route path="tickets/:id" element={<TicketPage />} />
          <Route path="waitlist" element={<WaitlistPage />} />
          <Route path="certificates" element={<CertificatesPage />} />
          <Route path="certificates/:number" element={<CertificateViewPage />} />
        </Route>
        {/* organizers of a club */}
        <Route element={<RequireAuth allow={isOrganizer} what="the organizer area" />}>
          <Route path="organizer" element={<OrganizerLayout />}>
            <Route index element={<OrganizerDashboardPage />} />
            <Route path="events/new" element={<EventFormPage />} />
            <Route path="events/:id/edit" element={<EventFormPage />} />
            <Route path="events/:id/feedback" element={<EventFeedbackPage />} />
            <Route path="volunteers" element={<VolunteersPage />} />
            <Route path="analytics" element={<OrganizerAnalyticsPage />} />
          </Route>
        </Route>
        {/* admins */}
        <Route element={<RequireAuth allow={isAdmin} what="the admin area" />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="approvals" element={<ApprovalQueuePage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
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
          element={<ComingSoonPage title="Forgot password" description="Password reset by email is not built yet. Please ask the Student Affairs Office to reset it." />}
        />
        <Route path="about" element={<AboutPage />} />
        {/* public: anyone can check a certificate number */}
        <Route path="verify" element={<VerifyCertificatePage />} />
        <Route path="verify/:number" element={<VerifyCertificatePage />} />
        <Route path="style-guide" element={<StyleGuidePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
