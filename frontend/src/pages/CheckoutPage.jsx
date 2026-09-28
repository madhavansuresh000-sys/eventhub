import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { cancelBooking, fetchBooking, payBooking } from '../api/bookings'
import { Notice } from '../components/auth/AuthCard'
import EventPoster from '../components/events/EventPoster'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Loader'
import useAsync, { describeError } from '../hooks/useAsync'
import useCountdown, { formatClock } from '../hooks/useCountdown'
import { cartCleared, seatsHeld } from '../store/cartSlice'
import { notify } from '../store/notificationsSlice'
import { selectStudent } from '../store/studentSlice'
import { formatPrice, formatShortDate } from '../utils/format'

function HoldTimer({ secondsLeft }) {
  const urgent = secondsLeft <= 60
  return (
    <div
      role="timer"
      aria-live={urgent ? 'assertive' : 'off'}
      className={
        'flex items-center justify-between rounded-xl border px-4 py-3 ' +
        (urgent
          ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
          : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200')
      }
    >
      <span className="text-sm font-medium">
        {urgent ? 'Hurry! Your seats are released soon' : 'Your seats are held for you'}
      </span>
      <span className="font-mono text-2xl font-bold tabular-nums">{formatClock(secondsLeft)}</span>
    </div>
  )
}

/** A HELD booking: countdown (from the server), student details, order summary, Pay. */
function Checkout({ booking }) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const student = useSelector(selectStudent)
  // the server says how many seconds are left; count down from there on this computer
  const [endsAt] = useState(() => Date.now() + booking.secondsLeft * 1000)
  const secondsLeft = useCountdown(endsAt)
  const [busy, setBusy] = useState(null) // 'pay' | 'release' | null
  const [error, setError] = useState(null)
  const { event } = booking

  useEffect(() => {
    dispatch(seatsHeld(booking)) // navbar countdown on other pages
  }, [booking, dispatch])

  /** POST /api/bookings/{id}/pay -> the server opens a checkout; we go to that page (Stripe, or the dev test page). */
  const pay = async () => {
    setBusy('pay')
    setError(null)
    try {
      const { redirectUrl } = await payBooking(booking.id)
      window.location.assign(redirectUrl) // leaves our app (Stripe) - the store is rebuilt when we come back
    } catch (e) {
      setError(describeError(e).message)
      setBusy(null)
    }
  }

  const release = async () => {
    setBusy('release')
    try {
      await cancelBooking(booking.id)
      dispatch(cartCleared())
      dispatch(notify('Your seats were released.'))
      navigate(`/events/${event.id}`)
    } catch (e) {
      setError(describeError(e).message)
      setBusy(null)
    }
  }

  if (secondsLeft === 0 && !busy) {
    return (
      <EmptyState
        title="Your seat hold expired"
        message={`We held ${booking.quantity} seat${booking.quantity > 1 ? 's' : ''} for 10 minutes. They are now free for other students.`}
        action={<Button to={`/events/${event.id}`}>Book again</Button>}
      />
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <HoldTimer secondsLeft={secondsLeft} />

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your details</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Name</dt><dd className="font-medium text-slate-900 dark:text-white">{student.name}</dd></div>
            <div><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-900 dark:text-white">{student.email}</dd></div>
            {student.course && <div><dt className="text-slate-500">Course</dt><dd className="font-medium text-slate-900 dark:text-white">{student.course}</dd></div>}
          </dl>
          <p className="mt-3 text-xs text-slate-500">Your tickets are sent to this email.</p>
        </Card>

        <Notice>
          You pay on a secure payment page (Stripe test mode in development: no real money).
          Card, UPI and other methods are chosen there. Your card details never reach EventHub.
        </Notice>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      </div>

      <aside>
        <Card className="overflow-hidden lg:sticky lg:top-24">
          <EventPoster clubSlug={event.clubSlug} tags={event.tags} className="h-28" emojiSize="text-4xl" />
          <div className="space-y-4 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">{event.clubName}</p>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{event.title}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{formatShortDate(event.startTime)} · {event.venue}</p>
            </div>
            <div className="space-y-2 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">{booking.quantity} × {formatPrice(event.price)}</span>
                <span className="text-slate-900 dark:text-white">{formatPrice(booking.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Booking fee</span>
                <span className="text-slate-900 dark:text-white">Free</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold dark:border-slate-800">
                <span className="text-slate-900 dark:text-white">Total</span>
                <span className="text-slate-900 dark:text-white">{formatPrice(booking.amount)}</span>
              </div>
            </div>
            <Button size="lg" className="w-full" onClick={pay} disabled={Boolean(busy)}>
              {busy === 'pay' ? 'Opening the payment page…' : `Pay ${formatPrice(booking.amount)}`}
            </Button>
            <button type="button" onClick={release} disabled={Boolean(busy)}
              className="block w-full py-1 text-center text-sm text-slate-500 hover:underline disabled:opacity-50">
              {busy === 'release' ? 'Releasing…' : 'Release my seats'}
            </button>
          </div>
        </Card>
      </aside>
    </div>
  )
}

/** /checkout/:bookingId - loads the booking from the server and shows the right screen for its status. */
export default function CheckoutPage() {
  const { bookingId } = useParams()
  const dispatch = useDispatch()
  const { data: booking, loading, error } = useAsync(() => fetchBooking(bookingId), [bookingId])

  // not held any more (paid, expired, cancelled): the navbar countdown must go
  useEffect(() => {
    if (booking && booking.status !== 'HELD') dispatch(cartCleared())
  }, [booking, dispatch])

  if (loading) return <Skeleton className="h-96 w-full" />
  if (error) {
    return <EmptyState title="Booking not found" message={describeError(error).message}
      action={<Button to="/my-tickets" variant="secondary">My tickets</Button>} />
  }
  if (booking.status === 'CONFIRMED') return <Navigate to={`/tickets/${booking.id}`} replace />
  if (booking.status !== 'HELD') {
    return <EmptyState
      title={booking.status === 'EXPIRED' ? 'Your seat hold expired' : 'This booking was cancelled'}
      message="The seats are free again for other students."
      action={<Button to={`/events/${booking.event.id}`}>Book again</Button>} />
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-slate-900 dark:text-white">Checkout</h1>
      <Checkout booking={booking} />
      <p className="mt-6 text-xs text-slate-500">
        <Link to="/my-tickets" className="underline">My tickets</Link> shows this booking as "waiting for payment" until you pay.
      </p>
    </div>
  )
}
